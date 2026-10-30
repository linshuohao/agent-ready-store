import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  database,
  seedInventory,
} from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';
import { CartService } from '../../src/cart/cart.service.js';
import { CartCredentials } from '../../src/cart/credentials.js';
const url = process.env.TEST_DATABASE_URL;
const catalog = new Catalog(readFileSync('references/products.json', 'utf8'));
(url ? describe : describe.skip)(
  'single cart operations on isolated PostgreSQL',
  () => {
    let db: ReturnType<typeof database>,
      second: ReturnType<typeof database>,
      carts: CartService;
    const input = () => ({
      createRequestId: randomUUID(),
      cartToken: randomBytes(32).toString('base64url'),
      items: [
        { productId: 'P001', quantity: 1 },
        { productId: 'P003', quantity: 1 },
      ],
    });
    beforeAll(() => {
      if (!url || new URL(url).pathname !== '/store_test')
        throw new Error('Isolated store_test required');
      db = database(url);
      second = database(url);
      carts = new CartService(
        catalog,
        db,
        new CartCredentials(randomBytes(32).toString('hex')),
      );
    });
    beforeEach(async () => {
      await db.order.deleteMany();
      await db.cart.deleteMany();
      await db.inventory.deleteMany();
      await seedInventory(db, catalog);
    });
    afterAll(async () => {
      await db.$disconnect();
      await second.$disconnect();
    });
    it('applies only the selected intent, keeps other lines, upgrades atomically and preserves old API semantics', async () => {
      const a = input(),
        made = await carts.create(a),
        id = made.cart.cartId;
      const stock = await db.inventory.findMany({
        orderBy: { productId: 'asc' },
      });
      let view = await carts.operate(
        id,
        a.cartToken,
        {
          expectedCartVersion: 1,
          operation: { type: 'add_item', productId: 'P001', quantity: 1 },
        },
        true,
      );
      expect(view).toMatchObject({
        cartId: id,
        cartVersion: 2,
        origin: 'AGENT',
        expiresAt: made.cart.expiresAt,
        items: [
          { productId: 'P001', quantity: 2 },
          { productId: 'P003', quantity: 1 },
        ],
      });
      expect(view.quote!.aiDiscount).not.toBe('0.00');
      view = await carts.operate(id, a.cartToken, {
        expectedCartVersion: 2,
        operation: { type: 'set_quantity', productId: 'P001', quantity: 3 },
      });
      expect(view.items[0].quantity).toBe(3);
      view = await carts.operate(id, a.cartToken, {
        expectedCartVersion: 3,
        operation: { type: 'remove_item', productId: 'P003' },
      });
      expect(view.items).toHaveLength(1);
      expect(
        (
          await carts.replace(id, a.cartToken, {
            expectedCartVersion: 4,
            items: [],
          })
        ).origin,
      ).toBe('AGENT');
      expect((await carts.create(a)).cart.items).toEqual([]);
      expect(await carts.agentCreationCount()).toBe(0);
      expect(
        await db.inventory.findMany({ orderBy: { productId: 'asc' } }),
      ).toEqual(stock);
    });
    it.each(['set_quantity', 'remove_item'])(
      'rejects %s on an absent line without a version or origin change',
      async (type) => {
        const a = input(),
          made = await carts.create(a);
        await expect(
          carts.operate(
            made.cart.cartId,
            a.cartToken,
            {
              expectedCartVersion: 1,
              operation: {
                type,
                productId: 'P002',
                ...(type === 'set_quantity' ? { quantity: 1 } : {}),
              },
            },
            true,
          ),
        ).rejects.toMatchObject({ code: 'CART_ITEM_NOT_FOUND' });
        expect(await carts.get(made.cart.cartId, a.cartToken)).toEqual(
          made.cart,
        );
      },
    );
    it('allows successive repairs with multiple unavailable lines, while old replace still rejects invalid full contents', async () => {
      const a = input(),
        made = await carts.create(a),
        id = made.cart.cartId;
      await db.inventory.updateMany({
        where: { productId: { in: ['P001', 'P003'] } },
        data: { quantity: 0 },
      });
      await expect(
        carts.replace(id, a.cartToken, {
          expectedCartVersion: 1,
          items: [a.items[1]],
        }),
      ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
      const partial = await carts.operate(
        id,
        a.cartToken,
        {
          expectedCartVersion: 1,
          operation: { type: 'remove_item', productId: 'P001' },
        },
        true,
      );
      expect(partial).toMatchObject({
        cartVersion: 2,
        origin: 'AGENT',
        canCheckout: false,
      });
      expect(partial.items).toHaveLength(1);
      expect(partial.issues).toContainEqual({
        productId: 'P003',
        code: 'SOLD_OUT',
      });
      const empty = await carts.operate(id, a.cartToken, {
        expectedCartVersion: 2,
        operation: { type: 'remove_item', productId: 'P003' },
      });
      expect(empty).toMatchObject({
        items: [],
        quote: null,
        canCheckout: false,
        cartVersion: 3,
      });
    });
    it('validates a target quantity even when other existing problem lines are retained', async () => {
      const a = input(),
        made = await carts.create(a),
        id = made.cart.cartId;
      await db.inventory.updateMany({
        where: { productId: { in: ['P001', 'P003'] } },
        data: { quantity: 0 },
      });
      await expect(
        carts.operate(
          id,
          a.cartToken,
          {
            expectedCartVersion: 1,
            operation: { type: 'set_quantity', productId: 'P001', quantity: 2 },
          },
          true,
        ),
      ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
      expect(await db.cart.findUniqueOrThrow({ where: { id } })).toMatchObject({
        version: 1,
        origin: 'HUMAN',
      });
      await db.inventory.update({
        where: { productId: 'P001' },
        data: { quantity: 2 },
      });
      const partial = await carts.operate(id, a.cartToken, {
        expectedCartVersion: 1,
        operation: { type: 'set_quantity', productId: 'P001', quantity: 2 },
      });
      expect(partial).toMatchObject({ canCheckout: false, cartVersion: 2 });
      expect(partial.issues.every((x) => x.productId === 'P003')).toBe(true);
    });
    it('rejects malformed operations, zero quantities and caller-controlled fields', async () => {
      const a = input(),
        made = await carts.create(a);
      for (const operation of [
        { type: 'set_quantity', productId: 'P001', quantity: 0 },
        { type: 'remove_item', productId: 'P001', quantity: 1 },
        { type: 'add_item', productId: 'P001', quantity: 1, price: '1' },
        { type: 'replace', items: [] },
      ])
        await expect(
          carts.operate(made.cart.cartId, a.cartToken, {
            expectedCartVersion: 1,
            operation,
          }),
        ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      expect((await carts.get(made.cart.cartId, a.cartToken)).cartVersion).toBe(
        1,
      );
    });
    it('commits at most once for duplicate operations and competing legacy writes', async () => {
      const a = input(),
        made = await carts.create(a),
        id = made.cart.cartId;
      const body = {
        expectedCartVersion: 1,
        operation: { type: 'add_item', productId: 'P001', quantity: 1 },
      };
      const results = await Promise.allSettled([
        carts.operate(id, a.cartToken, body, true),
        carts.operate(id, a.cartToken, body, true),
        carts.replace(id, a.cartToken, { expectedCartVersion: 1, items: [] }),
      ]);
      expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      expect(
        results
          .filter((x) => x.status === 'rejected')
          .every(
            (x) =>
              x.status === 'rejected' &&
              x.reason.code === 'CART_VERSION_CONFLICT',
          ),
      ).toBe(true);
      expect((await carts.get(id, a.cartToken)).cartVersion).toBe(2);
    });
    it('checks capabilities, expiry, confirmation invalidation and completed cart protection', async () => {
      const a = input(),
        made = await carts.create(a),
        id = made.cart.cartId,
        session = randomBytes(32).toString('base64url');
      const body = {
        expectedCartVersion: 1,
        operation: { type: 'set_quantity', productId: 'P001', quantity: 1 },
      };
      await expect(
        carts.operate(id, 'x'.repeat(43), body),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      const review = await carts.review(id, a.cartToken, session);
      if (review.state !== 'ready') throw new Error('Expected ready');
      await carts.operate(id, a.cartToken, body, true);
      await expect(
        carts.submit(id, a.cartToken, session, {
          confirmation: review.confirmation,
        }),
      ).rejects.toMatchObject({ code: 'PURCHASE_CHANGED' });
      const fresh = await carts.review(id, a.cartToken, session);
      if (fresh.state !== 'ready') throw new Error('Expected ready');
      const order = await carts.submit(id, a.cartToken, session, {
        confirmation: fresh.confirmation,
      });
      await expect(
        carts.operate(
          id,
          a.cartToken,
          { ...body, expectedCartVersion: 2 },
          true,
        ),
      ).rejects.toMatchObject({ code: 'CART_COMPLETED' });
      expect((await carts.agentGet(id, a.cartToken)).order).toEqual(order);
      const b = input(),
        expired = await carts.create(b);
      await db.$executeRaw`UPDATE "Cart" SET "createdAt"=date_trunc('milliseconds',clock_timestamp())-interval '24 hours' WHERE id=${expired.cart.cartId}::uuid`;
      await expect(
        carts.operate(expired.cart.cartId, b.cartToken, body),
      ).rejects.toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
    });
    it.each(['operation', 'order'])(
      'serializes a new operation against order submission with %s first',
      async (first) => {
        const a = input(),
          made = await carts.create(a),
          id = made.cart.cartId,
          session = randomBytes(32).toString('base64url');
        const before = await carts.review(id, a.cartToken, session);
        if (before.state !== 'ready') throw new Error('Expected ready');
        const stock = await db.inventory.findUniqueOrThrow({
          where: { productId: 'P001' },
        });
        const operate = () =>
          carts
            .operate(
              id,
              a.cartToken,
              {
                expectedCartVersion: 1,
                operation: {
                  type: 'set_quantity',
                  productId: 'P001',
                  quantity: 1,
                },
              },
              true,
            )
            .catch((e) => e);
        const submit = () =>
          carts
            .submit(id, a.cartToken, session, {
              confirmation: before.confirmation,
            })
            .catch((e) => e);
        const blocked = async (count: number) => {
          const deadline = Date.now() + 4000;
          while (Date.now() < deadline) {
            const [row] = await db.$queryRaw<
              { count: number }[]
            >`SELECT count(*)::integer AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM "Cart" WHERE id%'`;
            if (row.count >= count) return;
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          throw new Error('Cart lock barrier not reached');
        };
        let one!: Promise<any>, two!: Promise<any>;
        await second.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${id}::uuid FOR UPDATE`;
          one = first === 'operation' ? operate() : submit();
          await blocked(1);
          two = first === 'operation' ? submit() : operate();
          await blocked(2);
        });
        const [x, y] = await Promise.all([one, two]);
        expect(first === 'operation' ? x.origin : x.orderId).toEqual(
          first === 'operation' ? 'AGENT' : expect.any(String),
        );
        expect(y.code).toBe(
          first === 'operation' ? 'PURCHASE_CHANGED' : 'CART_COMPLETED',
        );
        expect(await db.order.count()).toBe(first === 'order' ? 1 : 0);
        expect(
          (
            await db.inventory.findUniqueOrThrow({
              where: { productId: 'P001' },
            })
          ).quantity,
        ).toBe(stock.quantity - (first === 'order' ? 1 : 0));
      },
    );
  },
);
