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
const key = randomBytes(32).toString('hex');
const request = () => ({
  createRequestId: randomUUID(),
  cartToken: randomBytes(32).toString('base64url'),
  items: [{ productId: 'P001', quantity: 1 }],
});
(url ? describe : describe.skip)(
  'persistent Cart on isolated PostgreSQL',
  () => {
    let db: ReturnType<typeof database>;
    let second: ReturnType<typeof database>;
    let carts: CartService;
    let other: CartService;
    beforeAll(() => {
      if (!url || new URL(url).pathname !== '/store_test')
        throw new Error('Isolated store_test required');
      db = database(url);
      second = database(url);
      carts = new CartService(catalog, db, new CartCredentials(key));
      other = new CartService(catalog, second, new CartCredentials(key));
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
    it('creates once under concurrent identical requests and rejects conflicting original payload', async () => {
      const input = request();
      const [a, b] = await Promise.all([
        carts.create(input),
        other.create(input),
      ]);
      expect(a.cart.cartId).toBe(b.cart.cartId);
      expect(await db.cart.count()).toBe(1);
      expect([a.replayed, b.replayed].sort()).toEqual([false, true]);
      await expect(carts.create({ ...input, items: [] })).rejects.toMatchObject(
        { code: 'CREATE_REQUEST_CONFLICT' },
      );
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .quantity,
      ).toBe(
        catalog.initialInventory().find((p) => p.productId === 'P001')!
          .quantity,
      );
    });
    it('recovers current contents after response loss, restart, edits and stock loss', async () => {
      const input = request();
      const created = await carts.create(input);
      await carts.replace(created.cart.cartId, input.cartToken, {
        expectedCartVersion: 1,
        items: [{ productId: 'P001', quantity: 2 }],
      });
      await db.inventory.update({
        where: { productId: 'P001' },
        data: { quantity: 0 },
      });
      const replay = await other.create(input);
      expect(replay.cart.cartId).toBe(created.cart.cartId);
      expect(replay.cart.cartVersion).toBe(2);
      expect(replay.cart.items[0].quantity).toBe(2);
      expect(replay.cart.issues).toContainEqual({
        productId: 'P001',
        code: 'SOLD_OUT',
      });
      expect(replay.cart.quote).toBeNull();
      expect(replay.cart.expiresAt).toBe(created.cart.expiresAt);
      const data = JSON.parse(readFileSync('references/products.json', 'utf8'));
      data.products = data.products.filter(
        (p: { id: string }) => p.id !== 'P001',
      );
      const changed = new CartService(
        new Catalog(JSON.stringify(data)),
        second,
        new CartCredentials(key),
      );
      expect((await changed.create(input)).cart.issues).toContainEqual({
        productId: 'P001',
        code: 'PRODUCT_NOT_FOUND',
      });
    });
    it('allows at most one same-version replacement and protects the resulting contents', async () => {
      const input = request();
      const { cart } = await carts.create(input);
      const operations = [
        { expectedCartVersion: 1, items: [{ productId: 'P001', quantity: 2 }] },
        { expectedCartVersion: 1, items: [{ productId: 'P001', quantity: 3 }] },
      ];
      const results = await Promise.allSettled(
        operations.map((operation, n) =>
          (n ? other : carts).replace(cart.cartId, input.cartToken, operation),
        ),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const row = await carts.get(cart.cartId, input.cartToken);
      expect(row.cartVersion).toBe(2);
      const winner = results.findIndex((r) => r.status === 'fulfilled');
      expect(row.items[0].quantity).toBe(operations[winner].items[0].quantity);
      await expect(
        carts.replace(cart.cartId, input.cartToken, operations[0]),
      ).rejects.toMatchObject({ code: 'CART_VERSION_CONFLICT' });
    });
    it('rejects invalid contents without partial rows or mutation and lets an invalid item be removed', async () => {
      const input = request();
      await expect(
        carts.create({ ...input, items: [{ productId: 'P002', quantity: 1 }] }),
      ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
      expect(await db.cart.count()).toBe(0);
      const { cart } = await carts.create(input);
      await expect(
        carts.replace(cart.cartId, input.cartToken, {
          expectedCartVersion: 1,
          items: [{ productId: 'P001', quantity: 2147483647 }],
        }),
      ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
      expect((await carts.get(cart.cartId, input.cartToken)).cartVersion).toBe(
        1,
      );
      await db.inventory.update({
        where: { productId: 'P001' },
        data: { quantity: -1 },
      });
      const empty = await carts.replace(cart.cartId, input.cartToken, {
        expectedCartVersion: 1,
        items: [],
      });
      expect(empty.quote).toBeNull();
      expect(empty.canCheckout).toBe(false);
    });
    it('rejects wrong capability and expired access without renewing or removing Cart', async () => {
      const input = request();
      const { cart } = await carts.create(input);
      await expect(
        carts.get(cart.cartId, request().cartToken),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await db.$executeRaw`UPDATE "Cart" SET "createdAt" = clock_timestamp() - interval '24 hours' WHERE id = ${cart.cartId}::uuid`;
      await expect(
        carts.get(cart.cartId, input.cartToken),
      ).rejects.toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
      await expect(carts.create(input)).rejects.toMatchObject({
        code: 'CREDENTIAL_EXPIRED',
      });
      await expect(
        carts.replace(cart.cartId, input.cartToken, {
          expectedCartVersion: 1,
          items: [],
        }),
      ).rejects.toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
      expect(await db.cart.count()).toBe(1);
    });
    async function waitForBlockedWriters(count: number) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const [row] = await db.$queryRaw<
          { count: number }[]
        >`SELECT count(*)::integer AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FROM "Cart" WHERE id%'`;
        if (row.count >= count) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error('Expected PostgreSQL lock barrier was not reached');
    }
    it('rejects an edit which expires while waiting for the actual Cart lock', async () => {
      const input = request();
      const { cart } = await carts.create(input);
      let pending: Promise<unknown>;
      await second.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cart.cartId}::uuid FOR UPDATE`;
        pending = carts
          .replace(cart.cartId, input.cartToken, {
            expectedCartVersion: 1,
            items: [],
          })
          .catch((error) => error);
        await waitForBlockedWriters(1);
        await tx.$executeRaw`UPDATE "Cart" SET "createdAt" = clock_timestamp() - interval '24 hours' WHERE id = ${cart.cartId}::uuid`;
      });
      expect(await pending!).toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
      expect(
        (await db.cart.findUniqueOrThrow({ where: { id: cart.cartId } }))
          .version,
      ).toBe(1);
    });
    it.each(['original', 'retry', 'third-party'])(
      'preserves contents when %s wins after a recovery GET observes the old version',
      async (winner) => {
        const input = request();
        const { cart } = await carts.create(input);
        const payload = {
          expectedCartVersion: 1,
          items: [{ productId: 'P001', quantity: 2 }],
        };
        const outcomes: Promise<unknown>[] = [];
        await second.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cart.cartId}::uuid FOR UPDATE`;
          outcomes.push(
            (winner === 'retry' ? other : carts)
              .replace(cart.cartId, input.cartToken, payload)
              .catch((error) => error),
          );
          await waitForBlockedWriters(1);
          expect(
            (await carts.get(cart.cartId, input.cartToken)).cartVersion,
          ).toBe(1);
          outcomes.push(
            (winner === 'retry' ? carts : other)
              .replace(cart.cartId, input.cartToken, payload)
              .catch((error) => error),
          );
          await waitForBlockedWriters(2);
          if (winner === 'third-party')
            await tx.cart.update({
              where: { id: cart.cartId },
              data: { version: 2, items: [{ productId: 'P001', quantity: 3 }] },
            });
        });
        const result = await Promise.all(outcomes);
        expect(
          result.filter(
            (value) =>
              typeof value === 'object' &&
              value !== null &&
              'cartVersion' in value,
          ),
        ).toHaveLength(winner === 'third-party' ? 0 : 1);
        const latest = await carts.get(cart.cartId, input.cartToken);
        expect(latest.cartVersion).toBe(2);
        expect(latest.items[0].quantity).toBe(winner === 'third-party' ? 3 : 2);
      },
    );
  },
);
