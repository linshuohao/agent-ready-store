import { createHash, randomUUID, randomBytes } from 'node:crypto';
import {
  cartCreateInput,
  agentCreateInput,
  cartReplaceInput,
  cartTokenInput,
  cartIdInput,
  type CartItem,
  type CartIssue,
  type CartView,
  type PriceLine,
  type PurchaseSummary,
  type OrderResult,
  type CheckoutReview,
  orderOutput,
  orderSubmitInput,
} from '@store/contracts';
import type {
  PrismaClient,
  Prisma,
  Cart,
} from '../infrastructure/database/generated/prisma/client.js';
import { Catalog } from '../catalog/catalog.js';
import { AppError } from '../shared/app-error.js';
import {
  CartCredentials,
  cartExpiresAt,
  cartAccessExpired,
} from './credentials.js';
import { priceCart } from './pricing.js';

type Connection = Prisma.TransactionClient | PrismaClient;
export class CartService {
  constructor(
    private readonly catalog: Catalog,
    private readonly db: PrismaClient,
    private readonly credentials: CartCredentials,
  ) {}
  private async now(db: Connection) {
    const [row] = await db.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AS now`;
    return row.now;
  }
  private authorize(
    row: Cart | null,
    token: string,
    now: Date,
  ): asserts row is Cart {
    if (
      !row ||
      !cartTokenInput.safeParse(token).success ||
      !this.credentials.matches(row.id, row.encryptedCartToken, token)
    )
      throw new AppError('FORBIDDEN', 403);
    if (cartAccessExpired(row.createdAt, now, row.handoffIssuedAt))
      throw new AppError('CREDENTIAL_EXPIRED', 410);
  }
  private async contents(
    db: Connection,
    items: CartItem[],
    origin: 'HUMAN' | 'AGENT',
  ) {
    const stock = new Map(
      (
        await db.inventory.findMany({
          where: { productId: { in: items.map((item) => item.productId) } },
        })
      ).map((row) => [row.productId, row.quantity]),
    );
    const issues: CartIssue[] = [];
    const lines: PriceLine[] = [];
    let quoteAvailable = true;
    const views: CartView['items'] = items.map((item) => {
      try {
        const product = this.catalog.get(item.productId, stock);
        lines.push({ ...item, name: product.name, unitPrice: product.price });
        if (!product.availability.canPurchase) {
          quoteAvailable = false;
          issues.push(
            ...product.availability.reasons.map((code) => ({
              productId: item.productId,
              code,
            })),
          );
        } else if (item.quantity > product.availability.currentQuantity!) {
          issues.push({
            productId: item.productId,
            code: 'INSUFFICIENT_STOCK',
          });
        }
        return {
          ...item,
          name: product.name,
          unitPrice: product.price,
          availability: product.availability,
        };
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== 'NOT_FOUND')
          throw error;
        issues.push({ productId: item.productId, code: 'PRODUCT_NOT_FOUND' });
        quoteAvailable = false;
        return { ...item, name: null, unitPrice: null, availability: null };
      }
    });
    const pricing = quoteAvailable
      ? priceCart(lines, origin)
      : { quote: null, quoteHash: null };
    return {
      items: views,
      issues,
      ...pricing,
      canCheckout: issues.length === 0 && pricing.quote !== null,
    };
  }
  private async view(db: Connection, row: Cart): Promise<CartView> {
    const order = await db.order.findUnique({
      where: { cartId: row.id },
      select: { id: true },
    });
    // Persisted items were validated on writes; database errors are not masked by fallbacks.
    const items = row.items as unknown as CartItem[];
    return {
      orderId: order?.id ?? null,
      cartId: row.id,
      origin: row.origin as 'HUMAN' | 'AGENT',
      cartVersion: row.version,
      expiresAt: cartExpiresAt(
        row.createdAt,
        row.handoffIssuedAt,
      ).toISOString(),
      ...(await this.contents(db, items, row.origin as 'HUMAN' | 'AGENT')),
      ...(order ? { canCheckout: false } : {}),
    };
  }
  private validateContents(view: Awaited<ReturnType<CartService['contents']>>) {
    if (view.issues.length)
      throw new AppError('CART_ITEMS_INVALID', 409, { issues: view.issues });
  }
  async create(input: unknown): Promise<{ cart: CartView; replayed: boolean }> {
    const parsed = cartCreateInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    return this.createInternal(parsed.data, 'HUMAN');
  }
  async createAgent(input: unknown) {
    const parsed = agentCreateInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    const result = await this.createInternal(
      { ...parsed.data, cartToken: randomBytes(32).toString('base64url') },
      'AGENT',
    );
    return { cart: result.cart, cartAccessToken: result.token };
  }
  private async createInternal(
    data: { cartToken: string; createRequestId: string; items: CartItem[] },
    origin: 'HUMAN' | 'AGENT',
  ) {
    const { cartToken, createRequestId } = data;
    const items = [...data.items].sort((a, b) =>
      a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
    );
    const scope =
      origin === 'AGENT'
        ? this.credentials.principalScope('store-mcp-v1')
        : this.credentials.scope(cartToken);
    const hash = createHash('sha256')
      .update(JSON.stringify(items))
      .digest('hex');
    return this.db.$transaction(async (tx) => {
      let row = await tx.cart.findUnique({
        where: {
          createScope_createRequestId: { createScope: scope, createRequestId },
        },
      });
      let replayed = true;
      if (!row) {
        const id = randomUUID();
        const encrypted = this.credentials.encrypt(id, cartToken);
        const inserted = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO "Cart" (id, origin, items, version, "createdAt", "createScope", "createRequestId", "createPayloadHash", "encryptedCartToken")
          VALUES (${id}::uuid, ${origin}, ${JSON.stringify(items)}::jsonb, 1, clock_timestamp(), ${scope}, ${createRequestId}::uuid, ${hash}, ${encrypted})
          ON CONFLICT ("createScope", "createRequestId") DO NOTHING RETURNING id`;
        replayed = inserted.length === 0;
        row = await tx.cart.findUniqueOrThrow({
          where: {
            createScope_createRequestId: {
              createScope: scope,
              createRequestId,
            },
          },
        });
        if (!replayed) {
          this.validateContents(await this.contents(tx, items, origin));
          row = await tx.cart.update({
            where: { id: row.id },
            data: { createdAt: await this.now(tx) },
          });
        }
      }
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${row.id}::uuid FOR UPDATE`;
      row = await tx.cart.findUniqueOrThrow({ where: { id: row.id } });
      const effectiveToken =
        origin === 'AGENT'
          ? this.credentials.recover(row.id, row.encryptedCartToken)
          : cartToken;
      this.authorize(row, effectiveToken, await this.now(tx));
      if (row.createPayloadHash !== hash)
        throw new AppError('CREATE_REQUEST_CONFLICT', 409);
      return {
        cart: await this.view(tx, row),
        replayed,
        token: effectiveToken,
      };
    });
  }
  async agentGet(id: string, token: string) {
    return this.db.$transaction(
      async (tx) => {
        const row = await this.locked(tx, id, token);
        return {
          cart: await this.view(tx, row),
          order: await this.saved(tx, id),
        };
      },
      { timeout: 10000 },
    );
  }
  async handoff(id: string, token: string) {
    return this.db.$transaction(
      async (tx) => {
        let row = await this.locked(tx, id, token);
        if (await this.saved(tx, id)) throw new AppError('CART_COMPLETED', 409);
        if (!row.handoffIssuedAt) {
          const issued = await this.now(tx);
          this.authorize(row, token, issued);
          row = await tx.cart.update({
            where: { id },
            data: { handoffIssuedAt: issued },
          });
        }
        return {
          cart: await this.view(tx, row),
          issuedAt: row.handoffIssuedAt!.toISOString(),
          expiresAt: cartExpiresAt(
            row.createdAt,
            row.handoffIssuedAt,
          ).toISOString(),
        };
      },
      { timeout: 10000 },
    );
  }
  async exchange(id: string, token: string) {
    return this.db.$transaction(
      async (tx) => {
        const row = await this.locked(tx, id, token);
        if (!row.handoffIssuedAt) throw new AppError('FORBIDDEN', 403);
        return this.view(tx, row);
      },
      { timeout: 10000 },
    );
  }
  async agentCreationCount() {
    return this.db.cart.count({ where: { origin: 'AGENT' } });
  }
  async get(id: string, token: string): Promise<CartView> {
    if (!cartIdInput.safeParse(id).success)
      throw new AppError('FORBIDDEN', 403);
    const row = await this.db.cart.findUnique({ where: { id } });
    this.authorize(row, token, await this.now(this.db));
    return this.view(this.db, row);
  }
  async replace(id: string, token: string, input: unknown): Promise<CartView> {
    if (!cartIdInput.safeParse(id).success)
      throw new AppError('FORBIDDEN', 403);
    const parsed = cartReplaceInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${id}::uuid FOR UPDATE`;
      const row = await tx.cart.findUnique({ where: { id } });
      this.authorize(row, token, await this.now(tx));
      if (await tx.order.findUnique({ where: { cartId: id } }))
        throw new AppError('CART_COMPLETED', 409);
      if (row.version !== parsed.data.expectedCartVersion)
        throw new AppError('CART_VERSION_CONFLICT', 409, {
          currentCartVersion: row.version,
        });
      const items = parsed.data.items;
      this.validateContents(
        await this.contents(tx, items, row.origin as 'HUMAN' | 'AGENT'),
      );
      this.authorize(row, token, await this.now(tx));
      const updated = await tx.cart.update({
        where: { id, version: parsed.data.expectedCartVersion },
        data: { items, version: { increment: 1 } },
      });
      return this.view(tx, updated);
    });
  }
  private async locked(
    tx: Prisma.TransactionClient,
    id: string,
    token: string,
  ) {
    if (!cartIdInput.safeParse(id).success)
      throw new AppError('FORBIDDEN', 403);
    await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
    await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${id}::uuid FOR UPDATE`;
    const row = await tx.cart.findUnique({ where: { id } });
    this.authorize(row, token, await this.now(tx));
    return row;
  }
  private async saved(db: Connection, id: string): Promise<OrderResult | null> {
    const order = await db.order.findUnique({ where: { cartId: id } });
    return order
      ? orderOutput.parse({
          orderId: order.id,
          cartId: order.cartId,
          createdAt: order.createdAt.toISOString(),
          purchaseHash: order.purchaseHash,
          catalogRevision: order.catalogRevision,
          snapshot: order.snapshot,
        })
      : null;
  }
  private async summary(
    tx: Connection,
    row: Cart,
    view: CartView,
  ): Promise<PurchaseSummary> {
    if (!view.quote || !view.canCheckout)
      throw new AppError('CART_ITEMS_INVALID', 409, { issues: view.issues });
    const stock = new Map(
      (
        await tx.inventory.findMany({
          where: { productId: { in: view.items.map((i) => i.productId) } },
        })
      ).map((i) => [i.productId, i.quantity]),
    );
    return {
      cartId: row.id,
      cartVersion: row.version,
      origin: view.origin,
      pricingRuleVersion: 'pricing-v1',
      quote: view.quote,
      items: view.quote.items.map((item) => {
        const p = this.catalog.get(item.productId, stock);
        return {
          ...item,
          brand: p.brand,
          specs: Object.fromEntries(
            Object.entries(p.specs).sort(([a], [b]) =>
              a < b ? -1 : a > b ? 1 : 0,
            ),
          ),
        };
      }),
    };
  }
  private fingerprint(summary: PurchaseSummary) {
    return createHash('sha256').update(JSON.stringify(summary)).digest('hex');
  }
  async review(
    id: string,
    token: string,
    session: string,
  ): Promise<CheckoutReview> {
    return this.db.$transaction(
      async (tx) => {
        const row = await this.locked(tx, id, token),
          order = await this.saved(tx, id);
        if (order) return { state: 'success', order };
        const updated = await tx.cart.update({
          where: { id },
          data: { checkoutEpoch: { increment: 1 } },
        });
        const view = await this.view(tx, updated);
        if (!view.canCheckout) return { state: 'blocked', cart: view };
        const summary = await this.summary(tx, updated, view),
          purchaseHash = this.fingerprint(summary);
        const now = await this.now(tx);
        this.authorize(updated, token, now);
        const confirmationExpiresAt = view.expiresAt;
        return {
          state: 'ready',
          summary,
          purchaseHash,
          confirmationExpiresAt,
          confirmation: this.credentials.confirmation.sign(
            {
              cartId: id,
              cartVersion: row.version,
              purchaseHash,
              checkoutEpoch: updated.checkoutEpoch.toString(),
              issuedAt: now.getTime(),
              expiresAt: Date.parse(confirmationExpiresAt),
            },
            session,
          ),
        };
      },
      { timeout: 10000 },
    );
  }
  async order(id: string, token: string): Promise<OrderResult> {
    if (!cartIdInput.safeParse(id).success)
      throw new AppError('FORBIDDEN', 403);
    const row = await this.db.cart.findUnique({ where: { id } });
    this.authorize(row, token, await this.now(this.db));
    const order = await this.saved(this.db, id);
    if (!order) throw new AppError('ORDER_NOT_FOUND', 404);
    return order;
  }
  async submit(
    id: string,
    token: string,
    session: string,
    input: unknown,
  ): Promise<OrderResult> {
    const parsed = orderSubmitInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    return this.db.$transaction(
      async (tx) => {
        const row = await this.locked(tx, id, token),
          order = await this.saved(tx, id);
        if (order) return order;
        const proof = this.credentials.confirmation.verify(
          parsed.data.confirmation,
          session,
          (await this.now(tx)).getTime(),
        );
        if (proof.cartId !== id)
          throw new AppError('CONFIRMATION_INVALID', 403);
        if (proof.checkoutEpoch !== row.checkoutEpoch.toString())
          throw new AppError('CONFIRMATION_STALE', 409);
        if (proof.cartVersion !== row.version)
          throw new AppError('PURCHASE_CHANGED', 409);
        const items = row.items as unknown as CartItem[];
        for (const item of [...items].sort((a, b) =>
          a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
        )) {
          await tx.$queryRaw`SELECT "productId" FROM "Inventory" WHERE "productId"=${item.productId} FOR UPDATE`;
        }
        const view = await this.view(tx, row),
          summary = await this.summary(tx, row, view),
          purchaseHash = this.fingerprint(summary);
        if (purchaseHash !== proof.purchaseHash)
          throw new AppError('PURCHASE_CHANGED', 409);
        const now = await this.now(tx);
        this.authorize(row, token, now);
        this.credentials.confirmation.verify(
          parsed.data.confirmation,
          session,
          now.getTime(),
        );
        for (const item of items) {
          const changed = await tx.inventory.updateMany({
            where: {
              productId: item.productId,
              quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
          });
          if (changed.count !== 1)
            throw new AppError('CART_ITEMS_INVALID', 409);
        }
        await tx.order.create({
          data: {
            id: randomUUID(),
            cartId: id,
            createdAt: now,
            cartVersion: row.version,
            purchaseHash,
            catalogRevision: this.catalog.revision,
            pricingRuleVersion: 'pricing-v1',
            origin: row.origin,
            snapshot: summary as unknown as Prisma.InputJsonValue,
          },
        });
        return (await this.saved(tx, id))!;
      },
      { timeout: 10000 },
    );
  }
}
