import { createHash, randomUUID } from 'node:crypto';
import {
  cartCreateInput,
  cartReplaceInput,
  cartTokenInput,
  cartIdInput,
  type CartItem,
  type CartIssue,
  type CartView,
  type PriceLine,
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
  cartLifetime,
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
    if (cartAccessExpired(row.createdAt, now))
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
    // Persisted items were validated on writes; database errors are not masked by fallbacks.
    const items = row.items as unknown as CartItem[];
    return {
      cartId: row.id,
      origin: row.origin as 'HUMAN' | 'AGENT',
      cartVersion: row.version,
      expiresAt: new Date(row.createdAt.getTime() + cartLifetime).toISOString(),
      ...(await this.contents(db, items, row.origin as 'HUMAN' | 'AGENT')),
    };
  }
  private validateContents(view: Awaited<ReturnType<CartService['contents']>>) {
    if (view.issues.length)
      throw new AppError('CART_ITEMS_INVALID', 409, { issues: view.issues });
  }
  async create(input: unknown): Promise<{ cart: CartView; replayed: boolean }> {
    const parsed = cartCreateInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    const { cartToken, createRequestId } = parsed.data;
    const items = [...parsed.data.items].sort((a, b) =>
      a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
    );
    const scope = this.credentials.scope(cartToken);
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
          VALUES (${id}::uuid, 'HUMAN', ${JSON.stringify(items)}::jsonb, 1, clock_timestamp(), ${scope}, ${createRequestId}::uuid, ${hash}, ${encrypted})
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
          this.validateContents(await this.contents(tx, items, 'HUMAN'));
          row = await tx.cart.update({
            where: { id: row.id },
            data: { createdAt: await this.now(tx) },
          });
        }
      }
      this.authorize(row, cartToken, await this.now(tx));
      if (row.createPayloadHash !== hash)
        throw new AppError('CREATE_REQUEST_CONFLICT', 409);
      return { cart: await this.view(tx, row), replayed };
    });
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
}
