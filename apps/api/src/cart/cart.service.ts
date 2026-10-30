import { createHash, randomUUID, randomBytes } from 'node:crypto';
import {
  cartCreateInput,
  agentCreateInput,
  cartReplaceInput,
  cartOperateInput,
  cartItemsInput,
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
  purchasePrepareInput,
  purchasePayInput,
  purchaseCancelInput,
  type PurchaseStatus,
  type PurchaseMaterials,
} from '@store/contracts';
import type {
  PrismaClient,
  Prisma,
  Cart,
  PurchaseReview,
} from '../infrastructure/database/generated/prisma/client.js';
import { Catalog } from '../catalog/catalog.js';
import { AppError } from '../shared/app-error.js';
import {
  CartCredentials,
  cartExpiresAt,
  cartAccessExpired,
} from './credentials.js';
import { priceCart } from './pricing.js';

export type PurchaseContext = { channel: 'apps' | 'webmcp'; scope: string };
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
  async createWebMcp(input: unknown) {
    const parsed = cartCreateInput.safeParse(input);
    if (!parsed.success || parsed.data.items.length === 0)
      throw new AppError('VALIDATION_ERROR', 400);
    return this.createInternal(parsed.data, 'AGENT', 'webmcp');
  }
  private async createInternal(
    data: { cartToken: string; createRequestId: string; items: CartItem[] },
    origin: 'HUMAN' | 'AGENT',
    entrance: 'mcp' | 'webmcp' = 'mcp',
  ) {
    const { cartToken, createRequestId } = data;
    const items = [...data.items].sort((a, b) =>
      a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
    );
    const scope =
      origin === 'AGENT' && entrance === 'mcp'
        ? this.credentials.principalScope('store-mcp-v1')
        : this.credentials.scope(
            entrance === 'webmcp' ? `webmcp:${cartToken}` : cartToken,
          );
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
          INSERT INTO "Cart" (id, origin, "agentCreated", items, version, "createdAt", "createScope", "createRequestId", "createPayloadHash", "encryptedCartToken")
          VALUES (${id}::uuid, ${origin}, ${origin === 'AGENT'}, ${JSON.stringify(items)}::jsonb, 1, clock_timestamp(), ${scope}, ${createRequestId}::uuid, ${hash}, ${encrypted})
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
    return this.db.cart.count({ where: { agentCreated: true } });
  }
  async get(id: string, token: string): Promise<CartView> {
    if (!cartIdInput.safeParse(id).success)
      throw new AppError('FORBIDDEN', 403);
    const row = await this.db.cart.findUnique({ where: { id } });
    this.authorize(row, token, await this.now(this.db));
    return this.view(this.db, row);
  }
  async replace(id: string, token: string, input: unknown): Promise<CartView> {
    return this.replaceInternal(id, token, input, false);
  }
  async replaceWebMcp(
    id: string,
    token: string,
    input: unknown,
  ): Promise<CartView> {
    return this.replaceInternal(id, token, input, true);
  }
  private async replaceInternal(
    id: string,
    token: string,
    input: unknown,
    agent: boolean,
  ): Promise<CartView> {
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
        await this.contents(
          tx,
          items,
          agent ? 'AGENT' : (row.origin as 'HUMAN' | 'AGENT'),
        ),
      );
      this.authorize(row, token, await this.now(tx));
      const updated = await tx.cart.update({
        where: { id, version: parsed.data.expectedCartVersion },
        data: {
          items,
          ...(agent ? { origin: 'AGENT' } : {}),
          version: { increment: 1 },
        },
      });
      return this.view(tx, updated);
    });
  }
  async operate(
    id: string,
    token: string,
    input: unknown,
    agent = false,
  ): Promise<CartView> {
    if (!cartIdInput.safeParse(id).success)
      throw new AppError('FORBIDDEN', 403);
    const parsed = cartOperateInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${id}::uuid FOR UPDATE`;
      const row = await tx.cart.findUnique({ where: { id } });
      this.authorize(row, token, await this.now(tx));
      if (await tx.order.findUnique({ where: { cartId: id } }))
        throw new AppError('CART_COMPLETED', 409);
      if (row.version !== parsed.data.expectedCartVersion)
        throw new AppError('CART_VERSION_CONFLICT', 409, {
          currentCartVersion: row.version,
        });
      const operation = parsed.data.operation;
      const items = (row.items as unknown as CartItem[]).map((item) => ({
        ...item,
      }));
      const index = items.findIndex(
        (item) => item.productId === operation.productId,
      );
      if (operation.type !== 'add_item' && index < 0)
        throw new AppError('CART_ITEM_NOT_FOUND', 409);
      if (operation.type === 'remove_item') items.splice(index, 1);
      else if (operation.type === 'add_item' && index >= 0)
        items[index].quantity += operation.quantity;
      else if (operation.type === 'set_quantity')
        items[index].quantity = operation.quantity;
      else
        items.push({
          productId: operation.productId,
          quantity: operation.quantity,
        });
      if (!cartItemsInput.safeParse(items).success)
        throw new AppError('VALIDATION_ERROR', 400);
      const origin = agent ? 'AGENT' : (row.origin as 'HUMAN' | 'AGENT');
      const contents = await this.contents(tx, items, origin);
      const targetIssues = contents.issues.filter(
        (issue) => issue.productId === operation.productId,
      );
      if (operation.type !== 'remove_item' && targetIssues.length)
        throw new AppError('CART_ITEMS_INVALID', 409, { issues: targetIssues });
      this.authorize(row, token, await this.now(tx));
      const updated = await tx.cart.update({
        where: { id, version: parsed.data.expectedCartVersion },
        data: {
          items,
          ...(agent ? { origin: 'AGENT' } : {}),
          version: { increment: 1 },
        },
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
        return this.commitPurchase(
          tx,
          row,
          token,
          proof.purchaseHash,
          proof.expiresAt,
        );
      },
      { timeout: 10000 },
    );
  }

  private orderReadSession(orderId: string) {
    return Buffer.from(
      this.credentials.scope(`order-read-v1:${orderId}`),
      'hex',
    ).toString('base64url');
  }
  async orderLink(id: string, token: string) {
    return this.db.$transaction(
      async (tx) => {
        const row = await this.locked(tx, id, token),
          order = await this.saved(tx, id);
        if (!order) throw new AppError('ORDER_NOT_FOUND', 404);
        const expiresAt = cartExpiresAt(row.createdAt, row.handoffIssuedAt);
        const proof = this.credentials.confirmation.sign(
          {
            cartId: id,
            cartVersion: order.snapshot.cartVersion,
            purchaseHash: order.purchaseHash,
            checkoutEpoch: '0',
            issuedAt: Date.parse(order.createdAt),
            expiresAt: expiresAt.getTime(),
          },
          this.orderReadSession(order.orderId),
        );
        const url = new URL(
          `/order-details/${order.orderId}`,
          process.env.WEB_ORIGIN!,
        );
        url.hash = `order-read=${proof}`;
        return { url: url.href, expiresAt: expiresAt.toISOString() };
      },
      { timeout: 10000 },
    );
  }
  async readOrderCapability(orderId: string, token: string) {
    if (!cartIdInput.safeParse(orderId).success || typeof token !== 'string')
      throw new AppError('FORBIDDEN', 403);
    const proof = this.credentials.confirmation.verify(
      token,
      this.orderReadSession(orderId),
      (await this.now(this.db)).getTime(),
    );
    const row = await this.db.order.findUnique({ where: { id: orderId } });
    if (
      !row ||
      row.cartId !== proof.cartId ||
      row.purchaseHash !== proof.purchaseHash
    )
      throw new AppError('FORBIDDEN', 403);
    return {
      order: (await this.saved(this.db, row.cartId))!,
      expiresAt: new Date(proof.expiresAt).toISOString(),
    };
  }
  private prepareScope(context: PurchaseContext) {
    if (!context.scope) throw new AppError('FORBIDDEN', 403);
    return this.credentials.scope(
      JSON.stringify(['purchase-prepare-v1', context.channel, context.scope]),
    );
  }
  private materialSession(review: PurchaseReview, purpose: 'pay' | 'cancel') {
    return Buffer.from(
      this.credentials.scope(
        JSON.stringify([
          'purchase-ui-v1',
          review.channel,
          review.id,
          review.actorScope,
          purpose,
        ]),
      ),
      'hex',
    ).toString('base64url');
  }
  private async ownedReview(
    tx: Connection,
    id: string,
    reviewId: string,
    context: PurchaseContext,
  ) {
    if (!cartIdInput.safeParse(reviewId).success)
      throw new AppError('FORBIDDEN', 403);
    const review = await tx.purchaseReview.findUnique({
      where: { id: reviewId },
    });
    if (
      !review ||
      review.cartId !== id ||
      review.channel !== context.channel ||
      review.prepareScope !== this.prepareScope(context)
    )
      throw new AppError('FORBIDDEN', 403);
    return review;
  }
  private async purchaseView(
    tx: Connection,
    row: Cart,
    review: PurchaseReview,
  ): Promise<PurchaseStatus> {
    const order = await this.saved(tx, row.id);
    let state: PurchaseStatus['state'] = 'pending';
    if (order) state = 'completed';
    else if (review.cancelled) state = 'cancelled';
    else if ((await this.now(tx)).getTime() >= review.expiresAt.getTime())
      state = 'expired';
    else if (
      review.checkoutEpoch !== row.checkoutEpoch ||
      review.cartVersion !== row.version
    )
      state = 'stale';
    else {
      const view = await this.view(tx, row);
      if (!view.canCheckout) state = 'blocked';
      else if (
        this.fingerprint(await this.summary(tx, row, view)) !==
        review.purchaseHash
      )
        state = 'stale';
    }
    return {
      reviewId: review.id,
      cartId: row.id,
      channel: review.channel as PurchaseContext['channel'],
      state,
      summary: review.summary as unknown as PurchaseSummary,
      expiresAt: review.expiresAt.toISOString(),
      order,
    };
  }
  async preparePurchase(
    id: string,
    token: string,
    context: PurchaseContext,
    input: unknown,
  ): Promise<PurchaseStatus> {
    const parsed = purchasePrepareInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    const prepareScope = this.prepareScope(context),
      { prepareRequestId, expectedCartVersion } = parsed.data;
    const requestHash = createHash('sha256')
      .update(JSON.stringify([id, expectedCartVersion]))
      .digest('hex');
    return this.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${prepareScope + ':' + prepareRequestId}, 0))`;
        const row = await this.locked(tx, id, token);
        const existing = await tx.purchaseReview.findUnique({
          where: {
            prepareScope_prepareRequestId: { prepareScope, prepareRequestId },
          },
        });
        if (existing) {
          if (existing.requestHash !== requestHash)
            throw new AppError('CREATE_REQUEST_CONFLICT', 409);
          return this.purchaseView(tx, row, existing);
        }
        const order = await this.saved(tx, id);
        if (order)
          return {
            reviewId: null,
            cartId: id,
            channel: context.channel,
            state: 'completed',
            summary: order.snapshot,
            expiresAt: cartExpiresAt(
              row.createdAt,
              row.handoffIssuedAt,
            ).toISOString(),
            order,
          };
        if (row.version !== expectedCartVersion)
          throw new AppError('CART_VERSION_CONFLICT', 409, {
            currentCartVersion: row.version,
          });
        const view = await this.view(tx, row),
          summary = await this.summary(tx, row, view);
        const now = await this.now(tx);
        this.authorize(row, token, now);
        const updated = await tx.cart.update({
          where: { id },
          data: { checkoutEpoch: { increment: 1 } },
        });
        const review = await tx.purchaseReview.create({
          data: {
            id: randomUUID(),
            cartId: id,
            prepareScope,
            prepareRequestId,
            requestHash,
            channel: context.channel,
            actorScope:
              context.channel === 'apps'
                ? randomBytes(32).toString('base64url')
                : prepareScope,
            cartVersion: row.version,
            purchaseHash: this.fingerprint(summary),
            checkoutEpoch: updated.checkoutEpoch,
            summary: summary as unknown as Prisma.InputJsonValue,
            createdAt: now,
            expiresAt: new Date(view.expiresAt),
          },
        });
        return this.purchaseView(tx, updated, review);
      },
      { timeout: 10000 },
    );
  }
  async purchaseStatus(
    id: string,
    token: string,
    context: PurchaseContext,
    reviewId: string,
  ): Promise<PurchaseStatus> {
    return this.db.$transaction(
      async (tx) => {
        const row = await this.locked(tx, id, token);
        return this.purchaseView(
          tx,
          row,
          await this.ownedReview(tx, id, reviewId, context),
        );
      },
      { timeout: 10000 },
    );
  }
  async purchaseMaterials(
    id: string,
    token: string,
    context: PurchaseContext,
    reviewId: string,
  ): Promise<PurchaseMaterials> {
    return this.db.$transaction(
      async (tx) => {
        const row = await this.locked(tx, id, token),
          review = await this.ownedReview(tx, id, reviewId, context);
        const status = await this.purchaseView(tx, row, review);
        if (status.state !== 'pending')
          throw new AppError(
            status.state === 'expired'
              ? 'CONFIRMATION_EXPIRED'
              : 'CONFIRMATION_STALE',
            409,
          );
        const payload = {
          cartId: id,
          cartVersion: review.cartVersion,
          purchaseHash: review.purchaseHash,
          checkoutEpoch: review.checkoutEpoch.toString(),
          issuedAt: review.createdAt.getTime(),
          expiresAt: review.expiresAt.getTime(),
        };
        return {
          payToken: this.credentials.confirmation.sign(
            payload,
            this.materialSession(review, 'pay'),
          ),
          cancelToken: this.credentials.confirmation.sign(
            payload,
            this.materialSession(review, 'cancel'),
          ),
        };
      },
      { timeout: 10000 },
    );
  }
  private verifyMaterial(
    value: string,
    review: PurchaseReview,
    purpose: 'pay' | 'cancel',
    now: Date,
  ) {
    const proof = this.credentials.confirmation.verify(
      value,
      this.materialSession(review, purpose),
      now.getTime(),
    );
    if (
      proof.cartId !== review.cartId ||
      proof.cartVersion !== review.cartVersion ||
      proof.purchaseHash !== review.purchaseHash ||
      proof.checkoutEpoch !== review.checkoutEpoch.toString() ||
      proof.expiresAt !== review.expiresAt.getTime()
    )
      throw new AppError('CONFIRMATION_INVALID', 403);
  }
  async payPurchase(
    id: string,
    token: string,
    context: PurchaseContext,
    reviewId: string,
    input: unknown,
  ): Promise<OrderResult> {
    const parsed = purchasePayInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    return this.db.$transaction(
      async (tx) => {
        const row = await this.locked(tx, id, token),
          review = await this.ownedReview(tx, id, reviewId, context);
        const order = await this.saved(tx, id);
        this.verifyMaterial(
          parsed.data.payToken,
          review,
          'pay',
          order ? review.createdAt : await this.now(tx),
        );
        if (order) return order;
        if (review.cancelled || review.checkoutEpoch !== row.checkoutEpoch)
          throw new AppError('CONFIRMATION_STALE', 409);
        if (review.cartVersion !== row.version)
          throw new AppError('PURCHASE_CHANGED', 409);
        return this.commitPurchase(
          tx,
          row,
          token,
          review.purchaseHash,
          review.expiresAt.getTime(),
        );
      },
      { timeout: 10000 },
    );
  }
  async cancelPurchase(
    id: string,
    token: string,
    context: PurchaseContext,
    reviewId: string,
    input: unknown,
  ): Promise<PurchaseStatus> {
    const parsed = purchaseCancelInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    return this.db.$transaction(
      async (tx) => {
        let row = await this.locked(tx, id, token),
          review = await this.ownedReview(tx, id, reviewId, context);
        const order = await this.saved(tx, id);
        this.verifyMaterial(
          parsed.data.cancelToken,
          review,
          'cancel',
          order ? review.createdAt : await this.now(tx),
        );
        if (
          !order &&
          !review.cancelled &&
          review.checkoutEpoch === row.checkoutEpoch
        ) {
          review = await tx.purchaseReview.update({
            where: { id: review.id },
            data: { cancelled: true },
          });
          row = await tx.cart.update({
            where: { id },
            data: { checkoutEpoch: { increment: 1 } },
          });
        }
        return this.purchaseView(tx, row, review);
      },
      { timeout: 10000 },
    );
  }
  private async commitPurchase(
    tx: Prisma.TransactionClient,
    row: Cart,
    token: string,
    expectedHash: string,
    expiresAt: number,
  ): Promise<OrderResult> {
    const id = row.id;
    const items = row.items as unknown as CartItem[];
    for (const item of [...items].sort((a, b) =>
      a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
    )) {
      await tx.$queryRaw`SELECT "productId" FROM "Inventory" WHERE "productId"=${item.productId} FOR UPDATE`;
    }
    const view = await this.view(tx, row),
      summary = await this.summary(tx, row, view),
      purchaseHash = this.fingerprint(summary);
    if (purchaseHash !== expectedHash)
      throw new AppError('PURCHASE_CHANGED', 409);
    const now = await this.now(tx);
    this.authorize(row, token, now);
    if (now.getTime() >= expiresAt)
      throw new AppError('CONFIRMATION_EXPIRED', 409);
    for (const item of items) {
      const changed = await tx.inventory.updateMany({
        where: {
          productId: item.productId,
          quantity: { gte: item.quantity },
        },
        data: { quantity: { decrement: item.quantity } },
      });
      if (changed.count !== 1) throw new AppError('CART_ITEMS_INVALID', 409);
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
  }
}
