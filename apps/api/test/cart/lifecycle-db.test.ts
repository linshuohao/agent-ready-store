import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { OrderExpiryWorker } from '../../src/cart/order-expiry.worker.js';
import { CatalogService } from '../../src/catalog/catalog.service.js';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  database,
  seedInventory,
} from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';
import { CartService } from '../../src/cart/cart.service.js';
const url = process.env.TEST_DATABASE_URL;
const catalog = new Catalog(readFileSync('references/products.json', 'utf8'));
(url ? describe : describe.skip)(
  'persistent checkout lifecycle on isolated PostgreSQL',
  () => {
    let db: ReturnType<typeof database>, service: CartService;
    beforeAll(() => {
      if (new URL(url!).pathname !== '/store_test')
        throw Error('store_test required');
      db = database(url!);
      service = new CartService(catalog, db);
    });
    beforeEach(async () => {
      await db.orderLine.deleteMany();
      await db.order.deleteMany();
      await db.cartOperation.deleteMany();
      await db.cart.deleteMany();
      await db.inventory.deleteMany();
      await seedInventory(db, catalog);
    });
    afterAll(async () => db.$disconnect());
    const init = (items = [{ productId: 'P001', quantity: 1 }]) => ({
      requestId: randomUUID(),
      initialItems: items,
    });
    const create = (
      cart: any,
      selectedItems = cart.items.map((i: any) => ({
        productId: i.productId,
        expectedQuantity: i.quantity,
      })),
    ) => ({
      requestId: randomUUID(),
      expectedCartVersion: cart.cartVersion,
      selectedItems,
      constraints: { currency: 'TWD' },
    });
    it('initializes once across instances and resumes current contents before validation', async () => {
      const input = init();
      const results = await Promise.all([
        service.getOrCreate(input, 'MCP'),
        new CartService(catalog, db).getOrCreate(input, 'MCP'),
      ]);
      expect(results[0].cartId).toBe(results[1].cartId);
      expect(await db.cart.count({ where: { agentCreated: true } })).toBe(1);
      const cart = results[0];
      const op = {
        operationRequestId: randomUUID(),
        expectedCartVersion: 1,
        operation: { type: 'add_item', productId: 'P001', quantity: 1 },
      };
      await Promise.all([
        service.operate(cart.cartId, op),
        service.operate(cart.cartId, op),
      ]);
      expect(
        (await new CartService(catalog, db).getOrCreate(input, 'MCP')).items[0]
          .quantity,
      ).toBe(2);
      await expect(
        service.operate(cart.cartId, {
          ...op,
          operation: { ...op.operation, quantity: 2 },
        }),
      ).rejects.toMatchObject({ code: 'REQUEST_CONFLICT' });
      await expect(service.getOrCreate(init([]), 'MCP')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      });
    });
    it('moves complete selected rows, freezes amounts and keeps cart independently editable', async () => {
      const cart = await service.getOrCreate(
        init([
          { productId: 'P001', quantity: 1 },
          { productId: 'P003', quantity: 1 },
        ]),
        'WEB',
      );
      const body = create(cart, [{ productId: 'P001', expectedQuantity: 1 }]);
      const made = await service.createOrder(cart.cartId, body, 'MCP');
      expect(made.order).toMatchObject({
        status: 'CHECKOUT',
        aiEligible: true,
        effectiveStatus: 'CHECKOUT',
      });
      expect(made.cart.items.map((i: any) => i.productId)).toEqual(['P003']);
      expect(made.cart.cartVersion).toBe(2);
      expect(
        Date.parse(made.order.reservationExpiresAt) -
          Date.parse(made.order.createdAt),
      ).toBe(900000);
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(1);
      const paid = await service.payOrder(made.order.orderId);
      expect(paid.status).toBe('PAID');
      expect(paid.orderId).toBe(made.order.orderId);
      expect(
        (await service.createOrder(cart.cartId, body, 'MCP')).order,
      ).toEqual(paid);
      expect((await service.cancelOrder(paid.orderId)).status).toBe('PAID');
      expect((await service.listOrders(cart.cartId, {})).items).toHaveLength(1);
    });
    it('rejects invalid selection and budget atomically, ignores unselected problem rows', async () => {
      const cart = await service.getOrCreate(
        init([
          { productId: 'P001', quantity: 1 },
          { productId: 'P003', quantity: 1 },
        ]),
        'WEB',
      );
      await db.inventory.update({
        where: { productId: 'P003' },
        data: { quantity: 0 },
      });
      for (const selected of [
        [],
        [{ productId: 'P001', expectedQuantity: 2 }],
        [{ productId: 'P002', expectedQuantity: 1 }],
      ])
        await expect(
          service.createOrder(cart.cartId, create(cart, selected), 'WEB'),
        ).rejects.toBeDefined();
      await expect(
        service.createOrder(
          cart.cartId,
          {
            ...create(cart, [{ productId: 'P001', expectedQuantity: 1 }]),
            constraints: { currency: 'TWD', maxTotal: '0.01' },
          },
          'WEB',
        ),
      ).rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' });
      expect(await db.order.count()).toBe(0);
      expect((await service.get(cart.cartId)).cartVersion).toBe(1);
      expect(
        (
          await service.createOrder(
            cart.cartId,
            create(cart, [{ productId: 'P001', expectedQuantity: 1 }]),
            'WEB',
          )
        ).order.aiEligible,
      ).toBe(false);
    });
    it('serializes final stock competition and same-cart old versions', async () => {
      const a = await service.getOrCreate(init(), 'WEB'),
        b = await service.getOrCreate(init(), 'WEB');
      await db.inventory.update({
        where: { productId: 'P001' },
        data: { quantity: 1 },
      });
      const results = await Promise.allSettled([
        service.createOrder(a.cartId, create(a), 'WEB'),
        service.createOrder(b.cartId, create(b), 'WEB'),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(1);
      const order = await db.order.findFirstOrThrow();
      const paid = await service.payOrder(order.id); // public sellable=0 does not block its owner
      expect(paid.status).toBe('PAID');
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .quantity,
      ).toBe(0);
    });
    it('closes once on cancel/pay races and expires using database time without returning cart rows', async () => {
      const cart = await service.getOrCreate(init(), 'WEB');
      const { order } = await service.createOrder(
        cart.cartId,
        create(cart),
        'WEB',
      );
      const outcomes = await Promise.all([
        service.payOrder(order.orderId),
        service.cancelOrder(order.orderId),
        service.cancelOrder(order.orderId),
      ]);
      expect(new Set(outcomes.map((o) => o.effectiveStatus)).size).toBe(1);
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(0);
      expect((await service.get(cart.cartId)).items).toHaveLength(0);
      const another = await service.getOrCreate(init(), 'WEB');
      const made = await service.createOrder(
        another.cartId,
        create(another),
        'WEB',
      );
      await db.$executeRaw`UPDATE "Order" SET "reservationExpiresAt"=clock_timestamp()-interval '1 second' WHERE id=${made.order.orderId}::uuid`;
      expect((await service.getOrder(made.order.orderId)).effectiveStatus).toBe(
        'EXPIRED',
      );
      const expired = await service.cancelOrder(made.order.orderId);
      expect(expired.closeReason).toBe('EXPIRED');
      expect((await service.payOrder(expired.orderId)).closeReason).toBe(
        'EXPIRED',
      );
    });
    it('enforces inventory and lifecycle constraints without rewriting negative source stock', async () => {
      const negative = await db.inventory.findUniqueOrThrow({
        where: { productId: 'P008' },
      });
      expect(negative.quantity).toBeLessThan(0);
      expect(negative.reservedQuantity).toBe(0);
      await expect(
        db.inventory.update({
          where: { productId: 'P008' },
          data: { reservedQuantity: 1 },
        }),
      ).rejects.toBeDefined();
      await expect(
        db.inventory.update({
          where: { productId: 'P001' },
          data: { reservedQuantity: -1 },
        }),
      ).rejects.toBeDefined();
      await expect(
        service.getOrCreate(init([{ productId: 'P008', quantity: 1 }]), 'WEB'),
      ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
      const cart = await service.getOrCreate(init(), 'WEB');
      const { order } = await service.createOrder(
        cart.cartId,
        create(cart),
        'WEB',
      );
      await expect(
        db.order.update({
          where: { id: order.orderId },
          data: { status: 'PAID' },
        }),
      ).rejects.toBeDefined();
      await expect(
        db.order.update({
          where: { id: order.orderId },
          data: { closedAt: new Date() },
        }),
      ).rejects.toBeDefined();
      await service.payOrder(order.orderId);
      await expect(
        db.order.update({
          where: { id: order.orderId },
          data: { closedAt: new Date(), closeReason: 'CANCELLED' },
        }),
      ).rejects.toBeDefined();
    });
    it('keeps removed, zero-price and missing-stock validation local to edited target', async () => {
      const cart = await service.getOrCreate(init(), 'WEB');
      await db.inventory.delete({ where: { productId: 'P001' } });
      const op = (type: string, productId: string, quantity?: number) => ({
        operationRequestId: randomUUID(),
        expectedCartVersion: 1,
        operation: {
          type,
          productId,
          ...(quantity === undefined ? {} : { quantity }),
        },
      });
      await expect(
        service.operate(cart.cartId, op('set_quantity', 'P001', 1)),
      ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
      await expect(
        service.operate(cart.cartId, op('set_quantity', 'P003', 1)),
      ).rejects.toMatchObject({ code: 'CART_ITEM_NOT_FOUND' });
      await expect(
        service.operate(cart.cartId, op('remove_item', 'P003')),
      ).rejects.toMatchObject({ code: 'CART_ITEM_NOT_FOUND' });
      await expect(
        service.operate(cart.cartId, op('set_quantity', 'P001', 0)),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      const zero = JSON.parse(readFileSync('references/products.json', 'utf8'));
      zero.products.find((p: any) => p.id === 'P003').price = 0;
      await expect(
        new CartService(new Catalog(JSON.stringify(zero)), db).operate(
          cart.cartId,
          op('add_item', 'P003', 1),
        ),
      ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
      expect(
        (await service.operate(cart.cartId, op('remove_item', 'P001'))).items,
      ).toEqual([]);
      expect(await db.cartOperation.count()).toBe(1);
    });
    it('rejects competing distinct keys on one old cart version without losing rows', async () => {
      const cart = await service.getOrCreate(
        init([
          { productId: 'P001', quantity: 1 },
          { productId: 'P003', quantity: 1 },
        ]),
        'WEB',
      );
      const results = await Promise.allSettled(
        ['P001', 'P003'].map((productId) =>
          service.createOrder(
            cart.cartId,
            create(cart, [{ productId, expectedQuantity: 1 }]),
            'WEB',
          ),
        ),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.find((r) => r.status === 'rejected')).toMatchObject({
        reason: { code: 'CART_VERSION_CONFLICT' },
      });
      expect((await service.get(cart.cartId)).items).toHaveLength(1);
    });
    it('preserves snapshots through catalog changes, instance restart, pagination and ID mismatches', async () => {
      const initBody = init();
      let cart = await service.getOrCreate(initBody, 'MCP');
      const body = create(cart);
      const made = await service.createOrder(cart.cartId, body, 'WEB');
      const raw = JSON.parse(readFileSync('references/products.json', 'utf8'));
      raw.products.find((p: any) => p.id === 'P001').price = 1;
      const restarted = new CartService(new Catalog(JSON.stringify(raw)), db);
      expect((await restarted.getOrder(made.order.orderId)).summary).toEqual(
        made.order.summary,
      );
      expect(
        (await restarted.createOrder(cart.cartId, body, 'WEB')).order.summary,
      ).toEqual(made.order.summary);
      const another = await service.getOrCreate(init(), 'WEB');
      await expect(
        service.getOrder(made.order.orderId, another.cartId),
      ).rejects.toMatchObject({ code: 'ORDER_CART_MISMATCH' });
      cart = await service.operate(cart.cartId, {
        operationRequestId: randomUUID(),
        expectedCartVersion: 2,
        operation: { type: 'add_item', productId: 'P003', quantity: 1 },
      });
      const next = await service.createOrder(cart.cartId, create(cart), 'APPS');
      expect(next.order.aiEligible).toBe(true);
      expect(made.order.aiEligible).toBe(false);
      expect(
        (await service.listOrders(cart.cartId, { limit: 1 })).nextOffset,
      ).toBe(1);
      expect(
        (await service.listOrders(cart.cartId, { offset: 1, limit: 1 }))
          .items[0].orderId,
      ).toBe(made.order.orderId);
      expect((await restarted.payOrder(made.order.orderId)).summary).toEqual(
        made.order.summary,
      );
    });
    it('holds the configured pending quota inside the cart lock and restores a full-quota key', async () => {
      await db.inventory.update({
        where: { productId: 'P001' },
        data: { quantity: 100 },
      });
      let cart = await service.getOrCreate(init(), 'WEB');
      let first: any;
      for (let i = 0; i < 9; i++) {
        const body = create(cart);
        const made = await service.createOrder(cart.cartId, body, 'WEB');
        if (i === 0) first = { body, order: made.order };
        cart = await service.operate(cart.cartId, {
          operationRequestId: randomUUID(),
          expectedCartVersion: made.cart.cartVersion,
          operation: { type: 'add_item', productId: 'P001', quantity: 1 },
        });
      }
      const results = await Promise.allSettled([
        service.createOrder(cart.cartId, create(cart), 'WEB'),
        service.createOrder(cart.cartId, create(cart), 'WEB'),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.find((r) => r.status === 'rejected')).toMatchObject({
        reason: { code: 'PENDING_ORDER_LIMIT' },
      });
      expect(
        (await service.createOrder(cart.cartId, first.body, 'WEB')).order
          .orderId,
      ).toBe(first.order.orderId);
      expect(
        (
          await new CartService(catalog, db, 1).createOrder(
            cart.cartId,
            first.body,
            'WEB',
          )
        ).order.orderId,
      ).toBe(first.order.orderId);
      await service.cancelOrder(first.order.orderId);
      expect(
        (await service.listOrders(cart.cartId, { pendingOnly: true })).items,
      ).toHaveLength(9);
      const nowCart = await service.get(cart.cartId);
      cart = await service.operate(cart.cartId, {
        operationRequestId: randomUUID(),
        expectedCartVersion: nowCart.cartVersion,
        operation: { type: 'add_item', productId: 'P001', quantity: 1 },
      });
      await expect(
        new CartService(catalog, db, 1).createOrder(
          cart.cartId,
          create(cart),
          'WEB',
        ),
      ).rejects.toMatchObject({ code: 'PENDING_ORDER_LIMIT' });
      await service.createOrder(cart.cartId, create(cart), 'WEB');
      const paid = (
        await service.listOrders(cart.cartId, { pendingOnly: true })
      ).items[0];
      await service.payOrder(paid.orderId);
      expect(
        (await service.listOrders(cart.cartId, { pendingOnly: true })).items,
      ).toHaveLength(9);
    });
    it('does not count expired unmaterialized orders toward quota but never lends their stock', async () => {
      await db.inventory.update({
        where: { productId: 'P001' },
        data: { quantity: 1 },
      });
      const limited = new CartService(catalog, db, 1);
      const cart = await limited.getOrCreate(init(), 'WEB');
      const { order } = await limited.createOrder(
        cart.cartId,
        create(cart),
        'WEB',
      );
      await db.$executeRaw`UPDATE "Order" SET "reservationExpiresAt"=clock_timestamp()-interval '1 second' WHERE id=${order.orderId}::uuid`;
      // Simulate the independent cart row already present while all physical stock is reserved.
      await db.cart.update({
        where: { id: cart.cartId },
        data: { items: [{ productId: 'P001', quantity: 1 }], version: 3 },
      });
      await expect(
        limited.createOrder(
          cart.cartId,
          { ...create(cart), expectedCartVersion: 3 },
          'WEB',
        ),
      ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
      await limited.expireOrders();
      expect(
        (
          await limited.createOrder(
            cart.cartId,
            { ...create(cart), expectedCartVersion: 3 },
            'WEB',
          )
        ).order.effectiveStatus,
      ).toBe('CHECKOUT');
    });
    async function trigger(table: string, event: string, body: string) {
      await db.$executeRawUnsafe(
        `CREATE FUNCTION lifecycle_test_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${body}; RETURN NEW; END $$`,
      );
      await db.$executeRawUnsafe(
        `CREATE TRIGGER lifecycle_test_fault AFTER ${event} ON "${table}" FOR EACH ROW EXECUTE FUNCTION lifecycle_test_fault()`,
      );
    }
    async function clearTrigger(table: string) {
      await db.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS lifecycle_test_fault ON "${table}"`,
      );
      await db.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS lifecycle_test_fault()',
      );
    }
    it.each(['Order', 'OrderLine', 'Inventory', 'Cart'])(
      'rolls back create_order after the %s persistence boundary fails',
      async (table) => {
        const cart = await service.getOrCreate(init(), 'WEB');
        const before = await db.inventory.findMany({
          orderBy: { productId: 'asc' },
        });
        await trigger(
          table,
          ['Order', 'OrderLine'].includes(table) ? 'INSERT' : 'UPDATE',
          "RAISE EXCEPTION 'injected persistence failure'",
        );
        try {
          await expect(
            service.createOrder(cart.cartId, create(cart), 'WEB'),
          ).rejects.toBeDefined();
        } finally {
          await clearTrigger(table);
        }
        expect(await db.order.count()).toBe(0);
        expect(await db.orderLine.count()).toBe(0);
        expect(
          await db.inventory.findMany({ orderBy: { productId: 'asc' } }),
        ).toEqual(before);
        expect((await service.get(cart.cartId)).cartVersion).toBe(1);
        expect((await service.get(cart.cartId)).items).toHaveLength(1);
      },
    );
    it('rolls back cart operations together with their idempotency record', async () => {
      const cart = await service.getOrCreate(init(), 'WEB');
      await trigger(
        'CartOperation',
        'INSERT',
        "RAISE EXCEPTION 'injected operation failure'",
      );
      try {
        await expect(
          service.operate(cart.cartId, {
            operationRequestId: randomUUID(),
            expectedCartVersion: 1,
            operation: { type: 'add_item', productId: 'P001', quantity: 1 },
          }),
        ).rejects.toBeDefined();
      } finally {
        await clearTrigger('CartOperation');
      }
      expect((await service.get(cart.cartId)).items[0].quantity).toBe(1);
      expect(await db.cartOperation.count()).toBe(0);
    });
    it.each(['pay', 'cancel'])(
      'rolls back %s without losing the original reservation or snapshot',
      async (action) => {
        const cart = await service.getOrCreate(init(), 'WEB');
        const { order } = await service.createOrder(
          cart.cartId,
          create(cart),
          'WEB',
        );
        const stock = await db.inventory.findMany({
          orderBy: { productId: 'asc' },
        });
        await trigger(
          'Order',
          'UPDATE',
          "RAISE EXCEPTION 'injected state transition failure'",
        );
        try {
          await expect(
            action === 'pay'
              ? service.payOrder(order.orderId)
              : service.cancelOrder(order.orderId),
          ).rejects.toBeDefined();
        } finally {
          await clearTrigger('Order');
        }
        expect(await service.getOrder(order.orderId)).toEqual(order);
        expect(
          await db.inventory.findMany({ orderBy: { productId: 'asc' } }),
        ).toEqual(stock);
      },
    );
    async function blocked(queryFragment: string) {
      const until = Date.now() + 4000;
      while (Date.now() < until) {
        const rows = await db.$queryRaw<
          { count: number }[]
        >`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE ${'%' + queryFragment + '%'}`;
        if (rows[0].count) return;
        await new Promise((r) => setTimeout(r, 10));
      }
      throw Error('PostgreSQL lock barrier not observed');
    }
    it.each(['pay', 'cancel'])(
      'checks database deadline after inventory lock wait for %s',
      async (action) => {
        const cart = await service.getOrCreate(init(), 'WEB');
        const { order } = await service.createOrder(
          cart.cartId,
          create(cart),
          'WEB',
        );
        await db.$executeRaw`UPDATE "Order" SET "reservationExpiresAt"=clock_timestamp()+interval '300 milliseconds' WHERE id=${order.orderId}::uuid`;
        let pending!: Promise<any>;
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT "productId" FROM "Inventory" WHERE "productId"='P001' FOR UPDATE`;
          pending =
            action === 'pay'
              ? service.payOrder(order.orderId)
              : service.cancelOrder(order.orderId);
          await blocked('FROM "Inventory"');
          await tx.$executeRaw`SELECT pg_sleep(0.35)`;
        });
        expect(await pending).toMatchObject({
          status: 'CHECKOUT',
          closeReason: 'EXPIRED',
        });
        expect(
          (
            await db.inventory.findUniqueOrThrow({
              where: { productId: 'P001' },
            })
          ).reservedQuantity,
        ).toBe(0);
      },
    );
    it('commits a payment admitted before deadline even when commit finishes after it', async () => {
      const cart = await service.getOrCreate(init(), 'WEB');
      const { order } = await service.createOrder(
        cart.cartId,
        create(cart),
        'WEB',
      );
      await db.$executeRaw`UPDATE "Order" SET "reservationExpiresAt"=clock_timestamp()+interval '300 milliseconds' WHERE id=${order.orderId}::uuid`;
      await trigger('Order', 'UPDATE', 'PERFORM pg_sleep(0.4)');
      try {
        expect((await service.payOrder(order.orderId)).status).toBe('PAID');
      } finally {
        await clearTrigger('Order');
      }
      await service.expireOrders();
      expect((await service.cancelOrder(order.orderId)).status).toBe('PAID');
    });

    it('reconciles reservation ownership and counts paid revenue only, including unmaterialized expiry', async () => {
      const cart = await service.getOrCreate(init(), 'WEB');
      const first = await service.createOrder(cart.cartId, create(cart), 'MCP');
      await service.payOrder(first.order.orderId);
      const agent = await service.getOrCreate(init(), 'MCP');
      const second = await service.createOrder(
        agent.cartId,
        create(agent),
        'WEB',
      );
      await service.cancelOrder(second.order.orderId);
      const thirdCart = await service.getOrCreate(init(), 'WEB');
      const third = await service.createOrder(
        thirdCart.cartId,
        create(thirdCart),
        'WEB',
      );
      await db.$executeRaw`UPDATE "Order" SET "reservationExpiresAt"=clock_timestamp()-interval '1 second' WHERE id=${third.order.orderId}::uuid`;
      const metrics = () =>
        JSON.parse(
          execFileSync(
            process.execPath,
            ['apps/api/scripts/checkout-metrics.mjs'],
            { env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8' },
          ),
        );
      expect(metrics()).toMatchObject({
        validAgentCartCreations: 1,
        ordersCreated: 3,
        paidOrders: 1,
        closedOrders: 1,
        pendingOrders: 0,
        expiredUnclosedOrders: 1,
        paidRevenue: first.order.summary.total,
        reservationMismatches: [],
      });
      await db.inventory.update({
        where: { productId: 'P001' },
        data: { reservedQuantity: { increment: 1 } },
      });
      expect(metrics().reservationMismatches).toEqual([
        { productId: 'P001', actual: 2, expected: '1' },
      ]);
    });
    it('projects one sellable quantity across reservation, consumption and release and preserves missing inventory errors', async () => {
      const oldUrl = process.env.DATABASE_URL,
        oldPath = process.env.CATALOG_PATH;
      process.env.DATABASE_URL = url;
      process.env.CATALOG_PATH = 'references/products.json';
      const query = new CatalogService();
      try {
        await db.inventory.update({
          where: { productId: 'P001' },
          data: { quantity: 2 },
        });
        const cart = await service.getOrCreate(init(), 'WEB');
        const { order } = await service.createOrder(
          cart.cartId,
          create(cart),
          'WEB',
        );
        expect((await query.get('P001')).availability.currentQuantity).toBe(1);
        await service.payOrder(order.orderId);
        expect((await query.get('P001')).availability.currentQuantity).toBe(1);
        const other = await service.getOrCreate(init(), 'WEB');
        const next = await service.createOrder(
          other.cartId,
          create(other),
          'WEB',
        );
        expect((await query.get('P001')).availability.currentQuantity).toBe(0);
        await service.cancelOrder(next.order.orderId);
        expect((await query.get('P001')).availability.currentQuantity).toBe(1);
        await db.inventory.delete({ where: { productId: 'P001' } });
        expect((await query.get('P001')).availability.reasons).toContain(
          'INVENTORY_UNAVAILABLE',
        );
        await query.db.$disconnect(); // a genuine dependency failure is not converted into a catalog fallback
      } finally {
        await query.onModuleDestroy();
        if (oldUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = oldUrl;
        if (oldPath === undefined) delete process.env.CATALOG_PATH;
        else process.env.CATALOG_PATH = oldPath;
      }
    });
    it('catches up at startup and releases a normal periodic load once across two API workers within five seconds', async () => {
      await db.inventory.update({
        where: { productId: 'P001' },
        data: { quantity: 100 },
      });
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        const cart = await service.getOrCreate(init(), 'WEB');
        ids.push(
          (await service.createOrder(cart.cartId, create(cart), 'WEB')).order
            .orderId,
        );
      }
      await db.$executeRaw`UPDATE "Order" SET "reservationExpiresAt"=clock_timestamp()-interval '100 milliseconds'`;
      const workers = [
        new OrderExpiryWorker(service),
        new OrderExpiryWorker(new CartService(catalog, db)),
      ];
      const started = Date.now();
      workers.forEach((w) => w.onModuleInit());
      const awaitClosed = async (count: number) => {
        const deadline = Date.now() + 5000;
        while (
          (await db.order.count({ where: { closeReason: 'EXPIRED' } })) < count
        ) {
          if (Date.now() > deadline)
            throw Error('Expiration release exceeded five seconds');
          await new Promise((r) => setTimeout(r, 20));
        }
      };
      try {
        await awaitClosed(20);
        const startupDelay = Date.now() - started;
        const cart = await service.getOrCreate(init(), 'WEB');
        const { order } = await service.createOrder(
          cart.cartId,
          create(cart),
          'WEB',
        );
        await db.$executeRaw`UPDATE "Order" SET "reservationExpiresAt"=clock_timestamp()+interval '100 milliseconds' WHERE id=${order.orderId}::uuid`;
        await awaitClosed(21);
        const delays = await db.$queryRaw<
          { maximum: number }[]
        >`SELECT max(extract(epoch FROM "closedAt"-"reservationExpiresAt")*1000)::float8 AS maximum FROM "Order"`;
        expect(delays[0].maximum).toBeLessThanOrEqual(5000);
        expect(
          await db.inventory.findUniqueOrThrow({
            where: { productId: 'P001' },
          }),
        ).toMatchObject({ quantity: 100, reservedQuantity: 0 });
        writeFileSync(
          '/private/tmp/checkout-expiration-evidence.json',
          JSON.stringify({
            startupOrders: 20,
            periodicOrders: 1,
            workers: 2,
            maximumReleaseDelayMs: delays[0].maximum,
            startupCatchupMs: startupDelay,
          }),
        );
      } finally {
        await Promise.all(workers.map((w) => w.onModuleDestroy()));
      }
    });
    it('reports a broken oldest reservation but releases unrelated orders beyond that batch', async () => {
      const cart = await service.getOrCreate(init(), 'WEB');
      const bad = await service.createOrder(cart.cartId, create(cart), 'WEB');
      const other = await service.getOrCreate(
        init([{ productId: 'P003', quantity: 1 }]),
        'WEB',
      );
      const good = await service.createOrder(
        other.cartId,
        create(other),
        'WEB',
      );
      await db.$executeRaw`UPDATE "Order" SET "reservationExpiresAt"=clock_timestamp()-interval '2 seconds' WHERE id=${bad.order.orderId}::uuid`;
      await db.$executeRaw`UPDATE "Order" SET "reservationExpiresAt"=clock_timestamp()-interval '1 second' WHERE id=${good.order.orderId}::uuid`;
      await db.inventory.delete({ where: { productId: 'P001' } });
      const first = await service.expireOrders(1);
      expect(first.failed).toHaveLength(1);
      await service.expireOrders(1);
      expect((await service.getOrder(good.order.orderId)).closeReason).toBe(
        'EXPIRED',
      );
      expect((await service.getOrder(bad.order.orderId)).closedAt).toBeNull();
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P003' } }))
          .reservedQuantity,
      ).toBe(0);
    });

    it('checks all channel eligibility, unselected thresholds and explicit product constraints', async () => {
      const raw = JSON.parse(readFileSync('references/products.json', 'utf8'));
      raw.products.find((p: any) => p.id === 'P001').price = 500;
      raw.products.find((p: any) => p.id === 'P003').price = 500;
      const priced = new CartService(new Catalog(JSON.stringify(raw)), db);
      const cart = await priced.getOrCreate(
        init([
          { productId: 'P001', quantity: 1 },
          { productId: 'P003', quantity: 1 },
        ]),
        'MCP',
      );
      const selection = {
        selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
        constraints: { currency: 'TWD' },
      };
      for (const channel of ['WEB', 'MCP', 'WEBMCP', 'APPS'] as const) {
        const quote = await priced.quoteSelection(
          cart.cartId,
          selection,
          channel,
        );
        expect(quote).toMatchObject({
          subtotal: '500.00',
          thresholdDiscount: '0.00',
          shipping: '100.00',
          total: channel === 'WEB' ? '600.00' : '575.00',
        });
      }
      await expect(
        priced.createOrder(
          cart.cartId,
          {
            ...create(cart),
            constraints: {
              currency: 'TWD',
              items: [{ productId: 'P001', maxUnitPrice: '499.99' }],
            },
          },
          'WEB',
        ),
      ).rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' });
      await expect(
        priced.createOrder(
          cart.cartId,
          {
            ...create(cart),
            constraints: {
              currency: 'TWD',
              items: [{ productId: 'P001', specs: { nonexistent: 'wrong' } }],
            },
          },
          'WEB',
        ),
      ).rejects.toMatchObject({ code: 'SPEC_MISMATCH' });
      expect(await db.order.count()).toBe(0);
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(0);
    });
    it('recovers the identical creation key across database clients and after closure without reviving it', async () => {
      const second = database(url!);
      const restarted = new CartService(catalog, second);
      try {
        const cart = await service.getOrCreate(init(), 'WEB');
        const body = create(cart);
        const orders = await Promise.all([
          service.createOrder(cart.cartId, body, 'MCP'),
          restarted.createOrder(cart.cartId, body, 'MCP'),
        ]);
        expect(orders[0].order.orderId).toBe(orders[1].order.orderId);
        expect(await db.order.count()).toBe(1);
        await expect(
          restarted.createOrder(
            cart.cartId,
            {
              ...body,
              constraints: { currency: 'TWD', maxTotal: '999999.00' },
            },
            'MCP',
          ),
        ).rejects.toMatchObject({ code: 'REQUEST_CONFLICT' });
        await service.cancelOrder(orders[0].order.orderId);
        expect(
          (await restarted.createOrder(cart.cartId, body, 'MCP')).order
            .effectiveStatus,
        ).toBe('CANCELLED');
        expect(
          (
            await db.inventory.findUniqueOrThrow({
              where: { productId: 'P001' },
            })
          ).reservedQuantity,
        ).toBe(0);
      } finally {
        await second.$disconnect();
      }
    });
  },
);
