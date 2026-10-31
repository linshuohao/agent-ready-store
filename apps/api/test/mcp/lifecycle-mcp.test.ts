import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import {
  database,
  seedInventory,
} from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';
const base = process.env.CHECKOUT_CORE_API_URL;
const url = process.env.TEST_DATABASE_URL;
(base && url && process.env.MCP_SERVICE_TOKEN ? describe : describe.skip)(
  'isolated MCP lifecycle scenarios',
  () => {
    let db: ReturnType<typeof database>;
    let client: Client;
    beforeAll(async () => {
      const target = new URL(base!);
      if (
        !['localhost', '127.0.0.1'].includes(target.hostname) ||
        target.port !== '3003' ||
        new URL(url!).pathname !== '/store_test'
      )
        throw Error('isolated API3003 and store_test required');
      db = database(url!);
      client = new Client({ name: 'lifecycle-contract-test', version: '1' });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(base + '/mcp'), {
          requestInit: {
            headers: {
              Authorization: `Bearer ${process.env.MCP_SERVICE_TOKEN}`,
            },
          },
        }),
      );
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
    afterAll(async () => {
      await client?.close();
      await db?.$disconnect();
    });
    async function call(name: string, args: Record<string, unknown>) {
      const response = await client.callTool({ name, arguments: args });
      const payload = response.structuredContent as any;
      expect(response.isError).toBe(!payload.ok);
      expect(response.content).toEqual([
        { type: 'text', text: JSON.stringify(payload) },
      ]);
      return payload;
    }
    const initialize = () => ({
      requestId: randomUUID(),
      initialItems: [{ productId: 'P001', quantity: 1 }],
    });
    const creation = (cart: any) => ({
      cartId: cart.cartId,
      requestId: randomUUID(),
      expectedCartVersion: cart.cartVersion,
      selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
      constraints: { currency: 'TWD' },
    });
    it('keeps consultation read-only and initializes atomically only for nonempty valid write intent', async () => {
      expect((await call('search_products', { limit: 1 })).ok).toBe(true);
      expect((await call('get_product', { productId: 'P001' })).ok).toBe(true);
      expect(
        (await call('list_product_reviews', { productId: 'P001' })).ok,
      ).toBe(true);
      expect(await db.cart.count()).toBe(0);
      expect(await db.order.count()).toBe(0);
      expect(
        await call('get_or_create_cart', {
          requestId: randomUUID(),
          initialItems: [],
        }),
      ).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(
        (
          await call('get_or_create_cart', {
            requestId: randomUUID(),
            initialItems: [
              { productId: 'P001', quantity: 1 },
              { productId: 'missing', quantity: 1 },
            ],
          })
        ).ok,
      ).toBe(false);
      expect(await db.cart.count()).toBe(0);
      const input = initialize();
      const cart = (await call('get_or_create_cart', input)).data;
      expect(cart.agentCreated).toBe(true);
      expect(cart.pendingOrders).toEqual([]);
      const op = {
        cartId: cart.cartId,
        operationRequestId: randomUUID(),
        expectedCartVersion: 1,
        productId: 'P001',
        quantity: 1,
      };
      const updated = await call('add_cart_item', op);
      expect(updated.data).toMatchObject({
        cartVersion: 2,
        items: [{ quantity: 2 }],
      });
      expect((await call('add_cart_item', op)).data).toEqual(updated.data);
      expect((await call('get_or_create_cart', input)).data).toEqual(
        updated.data,
      );
      expect(
        (await call('get_or_create_cart', { cartId: cart.cartId })).data.cartId,
      ).toBe(cart.cartId);
      expect(await call('add_cart_item', { ...op, quantity: 2 })).toMatchObject(
        { error: { code: 'REQUEST_CONFLICT' } },
      );
      expect(
        await call('add_cart_item', {
          ...op,
          operationRequestId: randomUUID(),
        }),
      ).toMatchObject({
        error: { code: 'CART_VERSION_CONFLICT', currentCartVersion: 2 },
      });
      expect(await db.cart.count()).toBe(1);
      expect(await db.order.count()).toBe(0);
    });
    it('preserves A after B fails and rejects a complete target with missing B without shrinking the order', async () => {
      const cart = (await call('get_or_create_cart', initialize())).data;
      expect(
        (
          await call('add_cart_item', {
            cartId: cart.cartId,
            operationRequestId: randomUUID(),
            expectedCartVersion: 1,
            productId: 'missing',
            quantity: 1,
          })
        ).ok,
      ).toBe(false);
      expect(
        await call('create_order', {
          ...creation(cart),
          selectedItems: [
            { productId: 'P001', expectedQuantity: 1 },
            { productId: 'missing', expectedQuantity: 1 },
          ],
        }),
      ).toMatchObject({ error: { code: 'SELECTION_CHANGED' } });
      expect(
        (await call('get_cart', { cartId: cart.cartId })).data.items,
      ).toMatchObject([{ productId: 'P001', quantity: 1 }]);
      expect(await db.order.count()).toBe(0);
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(0);
    });
    it('enforces selection, budget, specs and trusted attribution then recovers one fixed pending order and webpage entry', async () => {
      const cart = (await call('get_or_create_cart', initialize())).data;
      const input = creation(cart);
      for (const [constraints, code] of [
        [{ currency: 'TWD', maxTotal: '0.00' }, 'BUDGET_EXCEEDED'],
        [
          {
            currency: 'TWD',
            items: [{ productId: 'P001', specs: { impossible: true } }],
          },
          'SPEC_MISMATCH',
        ],
      ] as const)
        expect(
          await call('create_order', { ...input, constraints }),
        ).toMatchObject({ error: { code } });
      expect(
        await call('create_order', { ...input, userApproved: true }),
      ).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(
        await call('get_or_create_cart', {
          ...initialize(),
          createdByChannel: 'WEB',
        }),
      ).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(
        await call('create_order', {
          ...input,
          selectedItems: [{ productId: 'P001', expectedQuantity: 2 }],
        }),
      ).toMatchObject({ error: { code: 'SELECTION_CHANGED' } });
      expect(await db.order.count()).toBe(0);
      expect(
        (
          await call('quote_selection', {
            cartId: cart.cartId,
            selectedItems: input.selectedItems,
            constraints: input.constraints,
          })
        ).ok,
      ).toBe(true);
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(0);
      const result = await call('create_order', input);
      const order = result.data.order;
      expect(order).toMatchObject({
        cartId: cart.cartId,
        status: 'CHECKOUT',
        effectiveStatus: 'CHECKOUT',
        createdByChannel: 'MCP',
        aiEligible: true,
      });
      expect(order.summary.items).toHaveLength(1);
      expect(order.navigation.orderUrl).toContain(order.orderId);
      expect(order.navigation.shareUrl).toContain(order.orderId);
      expect(result.data.cart.items).toEqual([]);
      expect((await call('create_order', input)).data.order).toEqual(order);
      expect(
        await call('create_order', {
          ...input,
          constraints: { currency: 'TWD', maxTotal: '999999.00' },
        }),
      ).toMatchObject({ error: { code: 'REQUEST_CONFLICT' } });
      expect(
        (
          await call('get_order', {
            orderId: order.orderId,
            cartId: cart.cartId,
          })
        ).data,
      ).toEqual(order);
      expect(await db.order.count()).toBe(1);
      expect(JSON.stringify(result)).not.toMatch(
        /cartAccessToken|password|createPayloadHash|reservedQuantity|stack/,
      );
    });
    it('lists multiple candidates and only cancels an explicit matching order, leaving another pending order intact', async () => {
      const cart = (await call('get_or_create_cart', initialize())).data;
      const first = (await call('create_order', creation(cart))).data.order;
      const added = (
        await call('add_cart_item', {
          cartId: cart.cartId,
          operationRequestId: randomUUID(),
          expectedCartVersion: 2,
          productId: 'P001',
          quantity: 1,
        })
      ).data;
      const second = (await call('create_order', creation(added))).data.order;
      expect(
        (
          await call('list_orders', {
            cartId: cart.cartId,
            limit: 1,
            pendingOnly: true,
          })
        ).data.items,
      ).toHaveLength(1);
      expect(
        (await call('list_orders', { cartId: cart.cartId, pendingOnly: true }))
          .data.items,
      ).toHaveLength(2);
      expect(await call('cancel_order', { cartId: cart.cartId })).toMatchObject(
        { error: { code: 'VALIDATION_ERROR' } },
      );
      expect(
        await call('cancel_order', {
          cartId: randomUUID(),
          orderId: first.orderId,
        }),
      ).toMatchObject({ error: { code: 'ORDER_CART_MISMATCH' } });
      expect(
        (await call('cancel_order', { orderId: first.orderId })).data
          .effectiveStatus,
      ).toBe('CANCELLED');
      expect(
        (await call('cancel_order', { orderId: first.orderId })).data
          .effectiveStatus,
      ).toBe('CANCELLED');
      expect(
        (await call('get_order', { orderId: second.orderId })).data
          .effectiveStatus,
      ).toBe('CHECKOUT');
      expect(
        (await call('list_orders', { cartId: cart.cartId, pendingOnly: true }))
          .data.items,
      ).toMatchObject([{ orderId: second.orderId }]);
    });
    it('uses APPS attribution for UI Bridge creation and pays only the original order once', async () => {
      const init = initialize();
      const cart = (await call('apps_get_or_create_cart', init)).data;
      expect(cart.agentCreated).toBe(true);
      expect((await call('apps_get_or_create_cart', init)).data.cartId).toBe(
        cart.cartId,
      );
      const input = creation(cart);
      const order = (await call('apps_create_order', input)).data.order;
      expect(order).toMatchObject({
        createdByChannel: 'APPS',
        aiEligible: true,
        status: 'CHECKOUT',
      });
      expect((await call('apps_create_order', input)).data.order.orderId).toBe(
        order.orderId,
      );
      const inventory = await db.inventory.findUniqueOrThrow({
        where: { productId: 'P001' },
      });
      expect(
        await call('apps_pay_order', {
          orderId: order.orderId,
          cartId: randomUUID(),
        }),
      ).toMatchObject({ ok: false });
      for (let n = 0; n < 2; n++)
        expect(
          (
            await call('apps_pay_order', {
              orderId: order.orderId,
              cartId: cart.cartId,
            })
          ).data,
        ).toMatchObject({ orderId: order.orderId, status: 'PAID' });
      const after = await db.inventory.findUniqueOrThrow({
        where: { productId: 'P001' },
      });
      expect(after.quantity).toBe(inventory.quantity - 1);
      expect(after.reservedQuantity).toBe(inventory.reservedQuantity - 1);
      expect(await db.order.count()).toBe(1);
      expect(
        await call('apps_pay_order', {
          orderId: order.orderId,
          approved: true,
        }),
      ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    });
    it('maps named updates/removals and refuses schema bypass or invented payment calls', async () => {
      const cart = (await call('get_or_create_cart', initialize())).data;
      const context = {
        cartId: cart.cartId,
        operationRequestId: randomUUID(),
        expectedCartVersion: 1,
        productId: 'P001',
      };
      expect(
        (await call('update_cart_item', { ...context, quantity: 3 })).data
          .items,
      ).toMatchObject([{ quantity: 3 }]);
      expect(
        (
          await call('remove_cart_item', {
            ...context,
            operationRequestId: randomUUID(),
            expectedCartVersion: 2,
          })
        ).data.items,
      ).toEqual([]);
      for (const name of ['pay_order', 'simulate_click'])
        expect(await call(name, {})).toMatchObject({
          error: { code: 'VALIDATION_ERROR' },
        });
      expect(
        await call('get_cart', { cartId: cart.cartId, cartAccessToken: 'old' }),
      ).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(
        await call('list_orders', { cartId: cart.cartId, limit: 101 }),
      ).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(
        await call('remove_cart_item', {
          ...context,
          operation: { type: 'add_item', quantity: 9 },
        }),
      ).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    });
  },
);
