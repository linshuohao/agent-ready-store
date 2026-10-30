import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import {
  database,
  seedInventory,
} from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';

const base = process.env.CHECKOUT_CORE_API_URL;
const url = process.env.TEST_DATABASE_URL;
(base && url ? describe : describe.skip)(
  'checkout lifecycle HTTP on isolated API/Next proxy',
  () => {
    let db: ReturnType<typeof database>;
    const origin = process.env.WEB_ORIGIN!;
    const root = '/api/v1/shopping';
    beforeAll(() => {
      const target = new URL(base!);
      if (
        !['localhost', '127.0.0.1'].includes(target.hostname) ||
        !['3003', '3004'].includes(target.port) ||
        new URL(url!).pathname !== '/store_test'
      )
        throw Error('isolated store_test API 3003 or proxy 3004 required');
      db = database(url!);
    });
    beforeEach(async () => {
      await db.orderLine.deleteMany();
      await db.order.deleteMany();
      await db.cartOperation.deleteMany();
      await db.cart.deleteMany();
      await db.inventory.deleteMany();
      await seedInventory(
        db,
        new Catalog(readFileSync('references/products.json', 'utf8')),
      );
    });
    afterAll(async () => db.$disconnect());
    async function call(
      path: string,
      body?: unknown,
      headers: Record<string, string> = {},
    ) {
      const response = await fetch(base + root + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { origin, 'content-type': 'application/json', ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('set-cookie')).toBeNull();
      return { status: response.status, payload: await response.json() };
    }
    const initialization = () => ({
      requestId: randomUUID(),
      initialItems: [{ productId: 'P001', quantity: 1 }],
    });
    const creation = (cart: any) => ({
      requestId: randomUUID(),
      expectedCartVersion: cart.cartVersion,
      selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
      constraints: { currency: 'TWD' },
    });
    async function setup() {
      const initialized = await call('/carts', initialization());
      expect(initialized).toMatchObject({ status: 200, payload: { ok: true } });
      const cart = initialized.payload.data;
      const input = creation(cart);
      const created = await call(`/carts/${cart.cartId}/orders`, input);
      expect(created).toMatchObject({ status: 200, payload: { ok: true } });
      return { cart, input, order: created.payload.data.order };
    }
    it('recovers initialization and operations without duplicating rows, rejects stale/changed payloads', async () => {
      const input = initialization();
      const first = await call('/carts', input);
      expect(first).toMatchObject({ status: 200, payload: { ok: true } });
      const cart = first.payload.data;
      const operation = {
        operationRequestId: randomUUID(),
        expectedCartVersion: 1,
        operation: { type: 'add_item', productId: 'P001', quantity: 1 },
      };
      const path = `/carts/${cart.cartId}/operations`;
      const responses = await Promise.all([
        call(path, operation),
        call(path, operation),
      ]);
      for (const response of responses)
        expect(response.payload.data).toMatchObject({
          cartVersion: 2,
          items: [{ quantity: 2 }],
        });
      expect((await call('/carts', input)).payload.data).toMatchObject({
        cartId: cart.cartId,
        cartVersion: 2,
        items: [{ quantity: 2 }],
      });
      expect(
        (await call('/carts', { cartId: cart.cartId })).payload.data.cartId,
      ).toBe(cart.cartId);
      expect(
        await call(path, {
          ...operation,
          operation: { ...operation.operation, quantity: 3 },
        }),
      ).toMatchObject({
        status: 409,
        payload: { error: { code: 'REQUEST_CONFLICT' } },
      });
      expect(
        await call(path, { ...operation, operationRequestId: randomUUID() }),
      ).toMatchObject({
        status: 409,
        payload: {
          error: { code: 'CART_VERSION_CONFLICT', currentCartVersion: 2 },
        },
      });
      expect(await db.cart.count()).toBe(1);
    });
    it('quotes without reserving, creates once, pays the original order and lists it from an empty cart', async () => {
      const initialized = await call('/carts', initialization());
      expect(initialized.payload.ok).toBe(true);
      const cart = initialized.payload.data;
      const input = creation(cart);
      const quote = await call(`/carts/${cart.cartId}/quote`, {
        selectedItems: input.selectedItems,
        constraints: input.constraints,
      });
      expect(quote.payload.ok).toBe(true);
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(0);
      const path = `/carts/${cart.cartId}/orders`;
      const made = await Promise.all([call(path, input), call(path, input)]);
      expect(made[0].payload.ok).toBe(true);
      const order = made[0].payload.data.order;
      expect(made[1].payload.data.order.orderId).toBe(order.orderId);
      expect(order).toMatchObject({
        status: 'CHECKOUT',
        createdByChannel: 'WEB',
        aiEligible: false,
      });
      expect(made[0].payload.data.cart.items).toEqual([]);
      const paid = await call(`/orders/${order.orderId}/pay`, {
        cartId: cart.cartId,
      });
      expect(paid.payload.data).toMatchObject({
        orderId: order.orderId,
        status: 'PAID',
        summary: order.summary,
      });
      expect(
        (await call(`/orders/${order.orderId}/pay`, {})).payload.data.paidAt,
      ).toBe(paid.payload.data.paidAt);
      expect((await call(path, input)).payload.data.order.status).toBe('PAID');
      expect(
        (await call(`/orders/${order.orderId}?cartId=${cart.cartId}`)).payload
          .data.status,
      ).toBe('PAID');
      expect((await call(`/carts/${cart.cartId}`)).payload.data).toMatchObject({
        items: [],
        pendingOrders: [],
      });
      expect(
        (await call(path + '?limit=1&offset=0&pendingOnly=false')).payload.data
          .items,
      ).toHaveLength(1);
      expect(
        (await call(path + '?pendingOnly=true')).payload.data.items,
      ).toHaveLength(0);
      expect(await db.order.count()).toBe(1);
    });
    it('validates target association before reads or mutations and closes without returning rows', async () => {
      const { cart, order } = await setup();
      const wrongCart = randomUUID();
      for (const suffix of ['/pay', '/cancel']) {
        expect(
          await call(`/orders/${order.orderId}${suffix}`, {
            cartId: wrongCart,
          }),
        ).toMatchObject({
          status: 409,
          payload: { error: { code: 'ORDER_CART_MISMATCH' } },
        });
      }
      expect(
        await call(`/orders/${order.orderId}?cartId=${wrongCart}`),
      ).toMatchObject({
        status: 409,
        payload: { error: { code: 'ORDER_CART_MISMATCH' } },
      });
      const closed = await call(`/orders/${order.orderId}/cancel`, {});
      expect(closed.payload.data).toMatchObject({
        status: 'CHECKOUT',
        effectiveStatus: 'CANCELLED',
        closeReason: 'CANCELLED',
      });
      expect(
        (await call(`/orders/${order.orderId}/pay`, {})).payload.data
          .effectiveStatus,
      ).toBe('CANCELLED');
      expect((await call(`/carts/${cart.cartId}`)).payload.data.items).toEqual(
        [],
      );
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(0);
    });
    it('maps selection and budget failures without moving rows or reserving inventory', async () => {
      const initialized = await call('/carts', initialization());
      const cart = initialized.payload.data;
      const input = creation(cart);
      const path = `/carts/${cart.cartId}/orders`;
      expect(await call(path, { ...input, selectedItems: [] })).toMatchObject({
        status: 400,
        payload: { error: { code: 'VALIDATION_ERROR' } },
      });
      expect(
        await call(path, {
          ...input,
          selectedItems: [{ productId: 'P001', expectedQuantity: 2 }],
        }),
      ).toMatchObject({
        status: 409,
        payload: { error: { code: 'SELECTION_CHANGED' } },
      });
      expect(
        await call(path, {
          ...input,
          constraints: { currency: 'TWD', maxTotal: '0.00' },
        }),
      ).toMatchObject({
        status: 409,
        payload: { error: { code: 'BUDGET_EXCEEDED' } },
      });
      expect(await call(path, { ...input, aiEligible: true })).toMatchObject({
        status: 400,
        payload: { error: { code: 'VALIDATION_ERROR' } },
      });
      expect(await db.order.count()).toBe(0);
      expect(
        (
          await db.inventory.findUniqueOrThrow({
            where: { productId: 'P001' },
          })
        ).reservedQuantity,
      ).toBe(0);
      expect((await call(`/carts/${cart.cartId}`)).payload.data).toMatchObject({
        cartVersion: 1,
        items: [{ quantity: 1 }],
      });
    });
    it('rejects forged fields, bad IDs/pagination, unsafe writes and obsolete credentials', async () => {
      for (const fields of [
        { origin: 'MCP' },
        { aiEligible: true },
        { cartToken: 'old' },
      ])
        expect(
          await call('/carts', { ...initialization(), ...fields }),
        ).toMatchObject({
          status: 400,
          payload: { error: { code: 'VALIDATION_ERROR' } },
        });
      const unsafeHeaders: Record<string, string>[] = [
        { origin: 'https://other.example' },
        { origin: '' },
        { 'content-type': 'text/plain' },
      ];
      for (const headers of unsafeHeaders)
        expect(await call('/carts', initialization(), headers)).toMatchObject({
          status: 403,
          payload: { error: { code: 'FORBIDDEN' } },
        });
      expect(
        await call('/carts', initialization(), { 'x-cart-token': 'old' }),
      ).toMatchObject({
        status: 400,
        payload: { error: { code: 'VALIDATION_ERROR' } },
      });
      expect(await call('/carts/not-an-id')).toMatchObject({
        status: 400,
        payload: { error: { code: 'VALIDATION_ERROR' } },
      });
      expect(await call(`/orders/${randomUUID()}`)).toMatchObject({
        status: 404,
        payload: { error: { code: 'ORDER_NOT_FOUND' } },
      });
      const { cart, order } = await setup();
      for (const query of [
        'limit=101',
        'offset=-1',
        'pendingOnly=maybe',
        'limit=1&limit=2',
        'token=old',
      ])
        expect(
          await call(`/carts/${cart.cartId}/orders?${query}`),
        ).toMatchObject({
          status: 400,
          payload: { error: { code: 'VALIDATION_ERROR' } },
        });
      expect(
        await call(`/orders/${order.orderId}/pay`, { userApproved: true }),
      ).toMatchObject({
        status: 400,
        payload: { error: { code: 'VALIDATION_ERROR' } },
      });
      expect(
        await call(
          `/orders/${order.orderId}/pay`,
          {},
          { origin: 'https://other.example' },
        ),
      ).toMatchObject({
        status: 403,
        payload: { error: { code: 'FORBIDDEN' } },
      });
      expect((await call(`/orders/${order.orderId}`)).payload.data.status).toBe(
        'CHECKOUT',
      );
    });
  },
);
