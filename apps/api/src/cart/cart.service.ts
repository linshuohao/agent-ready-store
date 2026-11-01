import { orderView } from './order-view.js';
import { createHash, randomUUID } from 'node:crypto';
import { Decimal } from 'decimal.js';
import { z } from 'zod';
import {
  addCartItemInput,
  requestResultInput,
  type RequestResult,
  cartIdInput,
  cartItemsInput,
  getOrCreateCartInput,
  persistentCartOperationInput,
  createOrderInput,
  quoteSelectionInput,
  listOrdersInput,
  shoppingChannel,
  type ShoppingChannel,
  type ShoppingCartView,
  type CartItem,
  type CartIssue,
} from '@store/contracts';
import type { Catalog } from '../catalog/catalog.js';
import type { database } from '../infrastructure/database/database.js';
import type {
  Cart,
  Prisma,
} from '../infrastructure/database/generated/prisma/client.js';
import { AppError } from '../shared/app-error.js';
import { priceSelection } from './pricing.js';

type DB = ReturnType<typeof database>;
type Tx = Prisma.TransactionClient;
const include = { lines: { orderBy: { productId: 'asc' as const } } };
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError('VALIDATION_ERROR', 400);
  return result.data;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
function hash(value: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}
export function pendingOrderLimit(
  value = process.env.MAX_PENDING_ORDERS_PER_CART ?? '10',
) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw new Error(
      'MAX_PENDING_ORDERS_PER_CART must be a positive safe integer',
    );
  return Number(value);
}
export class CartService {
  private readonly limit: number;
  // Scheduling cursor only; reservation ownership and terminal facts remain in PostgreSQL.
  private expirationCursor:
    { id: string; reservationExpiresAt: Date } | undefined;
  constructor(
    private readonly catalog: Catalog,
    private readonly db: DB,
    limit = pendingOrderLimit(),
  ) {
    if (!Number.isSafeInteger(limit) || limit <= 0)
      throw new Error('Invalid pending order limit');
    this.limit = limit;
  }
  private async now(tx: Tx) {
    const [row] = await tx.$queryRaw<
      { now: Date }[]
    >`SELECT date_trunc('milliseconds',clock_timestamp()) AS now`;
    return row.now;
  }
  private transaction<T>(work: (tx: Tx) => Promise<T>) {
    return this.db.$transaction(work, { timeout: 10000 });
  }
  private async keyLock(tx: Tx, key: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`;
  }
  private async cart(tx: Tx, id: string, lock = false) {
    parse(cartIdInput, id);
    if (lock)
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${id}::uuid FOR UPDATE`;
    const row = await tx.cart.findUnique({ where: { id } });
    if (!row) throw new AppError('CART_NOT_FOUND', 404);
    return row;
  }
  private async inventory(tx: Tx, ids: string[], lock = false) {
    const sorted = [...new Set(ids)].sort();
    if (lock)
      for (const id of sorted)
        await tx.$queryRaw`SELECT "productId" FROM "Inventory" WHERE "productId"=${id} FOR UPDATE`;
    return tx.inventory.findMany({ where: { productId: { in: sorted } } });
  }
  private async contents(tx: Tx, items: CartItem[]) {
    const stock = new Map(
      (
        await this.inventory(
          tx,
          items.map((i) => i.productId),
        )
      ).map((i) => [i.productId, i.quantity - i.reservedQuantity]),
    );
    const issues: CartIssue[] = [];
    const lines = items.map((item) => {
      let product;
      try {
        product = this.catalog.get(item.productId, stock);
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== 'NOT_FOUND')
          throw error;
        issues.push({ productId: item.productId, code: 'PRODUCT_NOT_FOUND' });
        return { ...item, name: null, unitPrice: null, availability: null };
      }
      for (const code of product.availability.reasons)
        issues.push({ productId: item.productId, code });
      if (
        product.availability.canPurchase &&
        item.quantity > product.availability.currentQuantity!
      )
        issues.push({ productId: item.productId, code: 'INSUFFICIENT_STOCK' });
      return {
        ...item,
        name: product.name,
        unitPrice: product.price,
        availability: product.availability,
      };
    });
    return { items: lines, issues, stock };
  }
  private async validItems(tx: Tx, items: CartItem[]) {
    const result = await this.contents(tx, items);
    if (result.issues.length)
      throw new AppError('CART_ITEMS_INVALID', 409, { issues: result.issues });
    return result;
  }
  private async view(tx: Tx, row: Cart): Promise<ShoppingCartView> {
    const contents = await this.contents(tx, row.items as CartItem[]),
      now = await this.now(tx);
    const orders = await tx.order.findMany({
      where: {
        cartId: row.id,
        status: 'CHECKOUT',
        closedAt: null,
        reservationExpiresAt: { gt: now },
      },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return {
      cartId: row.id,
      cartVersion: row.version,
      agentCreated: row.agentCreated,
      items: contents.items,
      issues: contents.issues,
      pendingOrders: orders.map((o) => orderView(o, now)),
    };
  }
  private checkVersion(row: Cart, expected: number) {
    if (row.version !== expected)
      throw new AppError('CART_VERSION_CONFLICT', 409, {
        currentCartVersion: row.version,
      });
  }
  async get(id: string) {
    return this.transaction(async (tx) =>
      this.view(tx, await this.cart(tx, id)),
    );
  }
  async getOrCreate(
    input: unknown,
    channel: ShoppingChannel,
  ): Promise<ShoppingCartView> {
    const body = parse(getOrCreateCartInput, input);
    parse(shoppingChannel, channel);
    return this.get(body.cartId);
  }
  async add(
    input: unknown,
    channel: ShoppingChannel,
  ): Promise<ShoppingCartView> {
    const body = parse(addCartItemInput, input);
    parse(shoppingChannel, channel);
    const fingerprint = hash({ contract: 'cart-command-v2', ...body, channel });
    return this.transaction(async (tx) => {
      let id: string;
      if ('initializationId' in body) {
        await this.keyLock(tx, `cart-init:${body.initializationId}`);
        const existing = await tx.cart.findUnique({
          where: { initializationId: body.initializationId },
        });
        if (!existing) {
          const items = [
            { productId: body.productId, quantity: body.quantity },
          ];
          await this.validItems(tx, items);
          const row = await tx.cart.create({
            data: {
              id: randomUUID(),
              initializationId: body.initializationId,
              items,
              createdAt: await this.now(tx),
              agentCreated: channel !== 'WEB',
            },
          });
          await tx.cartOperation.create({
            data: {
              cartId: row.id,
              requestId: body.operationRequestId,
              payloadHash: fingerprint,
              createdAt: await this.now(tx),
            },
          });
          return this.view(tx, row);
        }
        id = existing.id;
      } else id = body.cartId;
      return this.applyOperation(
        tx,
        id,
        {
          operationRequestId: body.operationRequestId,
          operation: {
            type: 'add_item',
            productId: body.productId,
            quantity: body.quantity,
          },
        },
        fingerprint,
      );
    });
  }
  async requestResult(input: unknown): Promise<RequestResult> {
    const body = parse(requestResultInput, input);
    return this.transaction(async (tx) => {
      if (body.kind === 'order') {
        const order = await tx.order.findUnique({
          where: {
            cartId_createRequestId: {
              cartId: body.cartId,
              createRequestId: body.requestId,
            },
          },
          include,
        });
        return order
          ? {
              status: 'found',
              kind: 'order',
              order: orderView(order, await this.now(tx)),
            }
          : { status: 'not_found', kind: body.kind };
      }
      if (body.kind === 'initialize') {
        const row = await tx.cart.findUnique({
          where: { createRequestId: body.requestId },
        });
        return row
          ? {
              status: 'found',
              kind: 'initialize',
              cart: await this.view(tx, row),
            }
          : { status: 'not_found', kind: body.kind };
      }
      const row = await tx.cart.findUnique({
        where:
          'cartId' in body
            ? { id: body.cartId }
            : { initializationId: body.initializationId },
      });
      if (!row) return { status: 'not_found', kind: 'cart' };
      const operation = await tx.cartOperation.findUnique({
        where: {
          cartId_requestId: { cartId: row.id, requestId: body.requestId },
        },
      });
      return operation
        ? { status: 'found', kind: 'cart', cart: await this.view(tx, row) }
        : { status: 'not_found', kind: 'cart' };
    });
  }
  async operate(id: string, input: unknown): Promise<ShoppingCartView> {
    parse(cartIdInput, id);
    const body = parse(persistentCartOperationInput, input);
    if (body.operation.type === 'add_item')
      return this.add(
        {
          cartId: id,
          operationRequestId: body.operationRequestId,
          productId: body.operation.productId,
          quantity: body.operation.quantity,
        },
        'WEB',
      );
    return this.transaction((tx) =>
      this.applyOperation(
        tx,
        id,
        body,
        hash({ contract: 'cart-command-v2', ...body }),
      ),
    );
  }
  private async applyOperation(
    tx: Tx,
    id: string,
    body: z.infer<typeof persistentCartOperationInput>,
    fingerprint: string,
  ): Promise<ShoppingCartView> {
    await this.keyLock(tx, `cart-op:${id}:${body.operationRequestId}`);
    const row = await this.cart(tx, id, true),
      prior = await tx.cartOperation.findUnique({
        where: {
          cartId_requestId: {
            cartId: id,
            requestId: body.operationRequestId,
          },
        },
      });
    if (prior) {
      if (prior.payloadHash !== fingerprint)
        throw new AppError('REQUEST_CONFLICT', 409);
      return this.view(tx, row);
    }
    if ('expectedCartVersion' in body)
      this.checkVersion(row, body.expectedCartVersion);
    const items = (row.items as CartItem[]).map((i) => ({ ...i })),
      op = body.operation,
      index = items.findIndex((i) => i.productId === op.productId);
    if (op.type !== 'add_item' && index < 0)
      throw new AppError('CART_ITEM_NOT_FOUND', 409);
    if (op.type === 'remove_item') items.splice(index, 1);
    else {
      const quantity =
        op.type === 'add_item' && index >= 0
          ? items[index].quantity + op.quantity
          : op.quantity;
      const item = { productId: op.productId, quantity };
      if (index >= 0) items[index] = item;
      else items.push(item);
      parse(cartItemsInput, items);
      await this.validItems(tx, [item]);
    }
    const updated = await tx.cart.update({
      where: { id },
      data: { items, version: { increment: 1 } },
    });
    await tx.cartOperation.create({
      data: {
        cartId: id,
        requestId: body.operationRequestId,
        payloadHash: fingerprint,
        createdAt: await this.now(tx),
      },
    });
    return this.view(tx, updated);
  }
  private async selection(
    tx: Tx,
    body: z.infer<typeof quoteSelectionInput>,
    channel: ShoppingChannel,
    quoteOnly = false,
  ) {
    const selected = body.selectedItems;
    const { stock, issues } = await this.contents(tx, selected);
    if (
      issues.some(
        (issue) =>
          !quoteOnly ||
          !['INSUFFICIENT_STOCK', 'SOLD_OUT'].includes(issue.code),
      )
    )
      throw new AppError('CART_ITEMS_INVALID', 409, { issues });
    const products = selected.map((i) => ({
      item: i,
      product: this.catalog.get(i.productId, stock),
    }));
    for (const constraint of body.constraints.items ?? []) {
      const { product } = products.find(
        (p) => p.item.productId === constraint.productId,
      )!;
      if (
        constraint.maxUnitPrice !== undefined &&
        new Decimal(product.price).gt(constraint.maxUnitPrice)
      )
        throw new AppError('BUDGET_EXCEEDED', 409, {
          constraintViolations: [
            {
              productId: product.id,
              field: 'maxUnitPrice',
              expected: constraint.maxUnitPrice!,
              actual: product.price,
            },
          ],
        });
      const mismatches = Object.entries(constraint.specs ?? {})
        .filter(([key, value]) => product.specs[key] !== value)
        .map(([key, value]) => ({
          productId: product.id,
          field: key,
          expected: value,
          actual: Object.hasOwn(product.specs, key) ? product.specs[key] : null,
        }));
      if (mismatches.length)
        throw new AppError('SPEC_MISMATCH', 409, {
          constraintViolations: mismatches,
        });
    }
    const quote = priceSelection(
      products.map(({ item, product }) => ({
        ...item,
        name: product.name,
        unitPrice: product.price,
      })),
      channel !== 'WEB',
    )!;
    if (
      body.constraints.maxTotal !== undefined &&
      new Decimal(quote.total).gt(body.constraints.maxTotal)
    )
      throw new AppError('BUDGET_EXCEEDED', 409, {
        constraintViolations: [
          {
            field: 'maxTotal',
            expected: body.constraints.maxTotal!,
            actual: quote.total,
          },
        ],
      });
    return {
      issues,
      summary: {
        ...quote,
        pricingRuleVersion: 'pricing-v1',
        items: quote.items.map((i) => {
          const p = products.find(
            (p) => p.item.productId === i.productId,
          )!.product;
          return { ...i, brand: p.brand, specs: p.specs };
        }),
      },
    };
  }
  async quoteSelection(id: string, input: unknown, channel: ShoppingChannel) {
    const body = parse(quoteSelectionInput, input);
    parse(shoppingChannel, channel);
    return this.transaction(async (tx) => {
      await this.cart(tx, id);
      const { summary, issues } = await this.selection(tx, body, channel, true);
      return { ...summary, ...(issues.length ? { issues } : {}) };
    });
  }
  async createOrder(id: string, input: unknown, channel: ShoppingChannel) {
    parse(cartIdInput, id);
    const body = parse(createOrderInput, input);
    parse(shoppingChannel, channel);
    const fingerprint = hash({
      contract: 'cart-command-v2',
      ...body,
      selectedItems: [...body.selectedItems].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      ),
      constraints: {
        ...body.constraints,
        items: body.constraints.items
          ? [...body.constraints.items].sort((a, b) =>
              a.productId.localeCompare(b.productId),
            )
          : undefined,
      },
      channel,
    });
    return this.transaction(async (tx) => {
      await this.keyLock(tx, `order:${id}:${body.requestId}`);
      const row = await this.cart(tx, id, true);
      const prior = await tx.order.findUnique({
        where: {
          cartId_createRequestId: {
            cartId: id,
            createRequestId: body.requestId,
          },
        },
        include,
      });
      if (prior) {
        if (prior.requestHash !== fingerprint)
          throw new AppError('REQUEST_CONFLICT', 409);
        return {
          order: orderView(prior, await this.now(tx)),
          cart: await this.view(tx, row),
        };
      }
      const now = await this.now(tx);
      if (
        (await tx.order.count({
          where: {
            cartId: id,
            status: 'CHECKOUT',
            closedAt: null,
            reservationExpiresAt: { gt: now },
          },
        })) >= this.limit
      ) {
        const orders = await tx.order.findMany({
          where: {
            cartId: id,
            status: 'CHECKOUT',
            closedAt: null,
            reservationExpiresAt: { gt: now },
          },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        });
        throw new AppError('PENDING_ORDER_LIMIT', 409, {
          pendingOrderIds: orders.map((o) => o.id),
          pendingOrders: orders.map((o) => ({
            orderId: o.id,
            orderUrl: new URL(
              `/orders/${o.id}`,
              process.env.WEB_ORIGIN ?? 'http://localhost:3000',
            ).href,
          })),
        });
      }
      // A new, uncommitted order cannot be contended by another transaction; inventory locks precede its INSERT.
      await this.inventory(
        tx,
        body.selectedItems.map((i) => i.productId),
        true,
      );
      const { summary } = await this.selection(tx, body, channel),
        createdAt = await this.now(tx),
        { items, ...amounts } = summary;
      const order = await tx.order.create({
        data: {
          id: randomUUID(),
          cartId: id,
          sourceCartVersion: row.version,
          createRequestId: body.requestId,
          requestHash: fingerprint,
          createdAt,
          reservationExpiresAt: new Date(createdAt.getTime() + 900000),
          createdByChannel: channel,
          aiEligible: channel !== 'WEB',
          ...amounts,
          lines: {
            create: items.map((i) => ({
              ...i,
              specs: i.specs as Prisma.InputJsonValue,
            })),
          },
        },
        include,
      });
      for (const item of items)
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { reservedQuantity: { increment: item.quantity } },
        });
      const remaining = (row.items as CartItem[]).filter(
        (i) => !items.some((s) => s.productId === i.productId),
      );
      const updated = await tx.cart.update({
        where: { id },
        data: { items: remaining, version: { increment: 1 } },
      });
      return {
        order: orderView(order, createdAt),
        cart: await this.view(tx, updated),
      };
    });
  }
  private async savedOrder(tx: Tx, id: string, cartId?: string) {
    parse(cartIdInput, id);
    if (cartId !== undefined) parse(cartIdInput, cartId);
    const row = await tx.order.findUnique({ where: { id }, include });
    if (!row) throw new AppError('ORDER_NOT_FOUND', 404);
    if (cartId !== undefined && row.cartId !== cartId)
      throw new AppError('ORDER_CART_MISMATCH', 409);
    return row;
  }
  async getOrder(id: string, cartId?: string) {
    return this.transaction(async (tx) => {
      const row = await this.savedOrder(tx, id, cartId);
      return orderView(row, await this.now(tx));
    });
  }
  async listOrders(id: string, input: unknown) {
    const body = parse(listOrdersInput, input);
    return this.transaction(async (tx) => {
      await this.cart(tx, id);
      const now = await this.now(tx);
      const where: Prisma.OrderWhereInput = {
        cartId: id,
        ...(body.pendingOnly
          ? {
              status: 'CHECKOUT',
              closedAt: null,
              reservationExpiresAt: { gt: now },
            }
          : {}),
      };
      const rows = await tx.order.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: body.offset,
        take: body.limit + 1,
      });
      return {
        items: rows.slice(0, body.limit).map((o) => orderView(o, now)),
        nextOffset: rows.length > body.limit ? body.offset + body.limit : null,
      };
    });
  }
  private async settle(
    id: string,
    action: 'pay' | 'cancel' | 'expire',
    cartId?: string,
  ) {
    parse(cartIdInput, id);
    return this.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${id}::uuid FOR UPDATE`;
      const row = await this.savedOrder(tx, id, cartId);
      if (row.status === 'PAID' || row.closedAt)
        return orderView(row, await this.now(tx));
      const stock = await this.inventory(
          tx,
          row.lines.map((l) => l.productId),
          true,
        ),
        now = await this.now(tx),
        expired = now >= row.reservationExpiresAt;
      if (action === 'expire' && !expired) return orderView(row, now);
      for (const line of row.lines) {
        const item = stock.find((i) => i.productId === line.productId);
        if (
          !item ||
          item.reservedQuantity < line.quantity ||
          item.quantity < item.reservedQuantity
        )
          throw new AppError('INVENTORY_INCONSISTENT', 503);
      }
      const pay = action === 'pay' && !expired;
      for (const line of row.lines)
        await tx.inventory.update({
          where: { productId: line.productId },
          data: {
            reservedQuantity: { decrement: line.quantity },
            ...(pay ? { quantity: { decrement: line.quantity } } : {}),
          },
        });
      const updated = await tx.order.update({
        where: { id },
        data: pay
          ? { status: 'PAID', paidAt: now }
          : { closedAt: now, closeReason: expired ? 'EXPIRED' : 'CANCELLED' },
        include,
      });
      return orderView(updated, now);
    });
  }
  async payOrder(id: string, cartId?: string) {
    return this.settle(id, 'pay', cartId);
  }
  async cancelOrder(id: string, cartId?: string) {
    return this.settle(id, 'cancel', cartId);
  }
  async expireOrders(batchSize = 100) {
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000)
      throw new Error('Invalid expiration batch size');
    const cursor = this.expirationCursor;
    const ids = await this.db.$queryRaw<
      { id: string; reservationExpiresAt: Date }[]
    >`
      SELECT id,"reservationExpiresAt" FROM "Order"
      WHERE status='CHECKOUT' AND "closedAt" IS NULL AND "reservationExpiresAt"<=clock_timestamp()
      AND (${!cursor} OR ("reservationExpiresAt",id)>(${cursor?.reservationExpiresAt ?? new Date(0)},${cursor?.id ?? '00000000-0000-0000-0000-000000000000'}::uuid))
      ORDER BY "reservationExpiresAt",id LIMIT ${batchSize}`;
    const failed: { orderId: string; error: unknown }[] = [];
    for (const { id } of ids) {
      try {
        await this.settle(id, 'expire');
      } catch (error) {
        failed.push({ orderId: id, error });
      }
    }
    this.expirationCursor = ids.length === batchSize ? ids.at(-1) : undefined;
    return { scanned: ids.length, failed };
  }

  async agentCreationCount() {
    return this.db.cart.count({ where: { agentCreated: true } });
  }
}
