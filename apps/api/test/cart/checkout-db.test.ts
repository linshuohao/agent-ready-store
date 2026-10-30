import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  database,
  seedInventory,
} from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';
import { CartCredentials } from '../../src/cart/credentials.js';
import { CartService } from '../../src/cart/cart.service.js';
const url = process.env.TEST_DATABASE_URL;
const key = randomBytes(32).toString('hex'),
  session = randomBytes(32).toString('base64url');
const raw = readFileSync('references/products.json', 'utf8');
const catalog = new Catalog(raw);
(url ? describe : describe.skip)('Checkout on isolated PostgreSQL', () => {
  let db: ReturnType<typeof database>,
    second: ReturnType<typeof database>,
    service: CartService,
    other: CartService;
  beforeAll(() => {
    if (new URL(url!).pathname != '/store_test')
      throw Error('store_test required');
    db = database(url!);
    second = database(url!);
    service = new CartService(catalog, db, new CartCredentials(key));
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
  async function create(quantity = 1) {
    const input = {
      createRequestId: randomUUID(),
      cartToken: randomBytes(32).toString('base64url'),
      items: [{ productId: 'P001', quantity }],
    };
    return { ...input, ...(await service.create(input)) };
  }
  async function review(c: Awaited<ReturnType<typeof create>>) {
    expect(service.review, 'review use case required').toBeTypeOf('function');
    const r = await service.review(c.cart.cartId, c.cartToken, session);
    if (r.state !== 'ready') throw Error('Expected ready');
    return r;
  }
  const stock = async () =>
    (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
      .quantity;
  it('commits a single order and decrement under concurrent duplicate submission; completed Cart stays read-only', async () => {
    const c = await create();
    const r = await review(c),
      before = await stock();
    const [a, b] = await Promise.all([
      service.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: r.confirmation,
      }),
      other.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: r.confirmation,
      }),
    ]);
    expect(a.orderId).toBe(b.orderId);
    expect(await stock()).toBe(before - 1);
    expect(await db.order.count()).toBe(1);
    expect((await service.get(c.cart.cartId, c.cartToken)).canCheckout).toBe(
      false,
    );
    expect(
      (
        await service.create({
          createRequestId: c.createRequestId,
          cartToken: c.cartToken,
          items: c.items,
        })
      ).cart.orderId,
    ).toBe(a.orderId);
    await expect(
      service.replace(c.cart.cartId, c.cartToken, {
        expectedCartVersion: 1,
        items: [],
      }),
    ).rejects.toMatchObject({ code: 'CART_COMPLETED' });
  });
  it('a new Review fences late old submissions without creating an order', async () => {
    const c = await create(),
      a = await review(c),
      b = await review(c);
    await expect(
      service.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: a.confirmation,
      }),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_STALE' });
    expect(await db.order.count()).toBe(0);
    await service.submit(c.cart.cartId, c.cartToken, session, {
      confirmation: b.confirmation,
    });
  });
  it('does not oversell when two carts compete for the last item', async () => {
    await db.inventory.update({
      where: { productId: 'P001' },
      data: { quantity: 1 },
    });
    const a = await create(),
      b = await create(),
      ar = await review(a),
      br = await review(b);
    const results = await Promise.allSettled([
      service.submit(a.cart.cartId, a.cartToken, session, {
        confirmation: ar.confirmation,
      }),
      other.submit(b.cart.cartId, b.cartToken, session, {
        confirmation: br.confirmation,
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stock()).toBe(0);
    expect(await db.order.count()).toBe(1);
  });
  it('rejects wrong session and changed version, and reuses saved order after restarting service or changing catalog', async () => {
    const c = await create(),
      r = await review(c);
    await expect(
      service.submit(
        c.cart.cartId,
        c.cartToken,
        randomBytes(32).toString('base64url'),
        { confirmation: r.confirmation },
      ),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_INVALID' });
    await service.replace(c.cart.cartId, c.cartToken, {
      expectedCartVersion: 1,
      items: [{ productId: 'P001', quantity: 2 }],
    });
    await expect(
      service.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: r.confirmation,
      }),
    ).rejects.toMatchObject({ code: 'PURCHASE_CHANGED' });
    const fresh = await review(c),
      order = await service.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: fresh.confirmation,
      });
    const data = JSON.parse(raw);
    data.products.find((p: { id: string }) => p.id === 'P001').name = 'Changed';
    const restarted = new CartService(
      new Catalog(JSON.stringify(data)),
      second,
      new CartCredentials(key),
    );
    expect(
      await restarted.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: r.confirmation,
      }),
    ).toEqual(order);
    await db.$executeRaw`UPDATE "Cart" SET "createdAt" = date_trunc('milliseconds', clock_timestamp()) - interval '24 hours' WHERE id=${c.cart.cartId}::uuid`;
    await expect(
      restarted.order(c.cart.cartId, c.cartToken),
    ).rejects.toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
    expect(await db.order.count()).toBe(1);
  });
  it('blocks an empty cart and commits the recovery fence even when stock becomes blocked', async () => {
    const c = await create(),
      r = await review(c);
    await db.inventory.update({
      where: { productId: 'P001' },
      data: { quantity: 0 },
    });
    expect(
      (await service.review(c.cart.cartId, c.cartToken, session)).state,
    ).toBe('blocked');
    await db.inventory.update({
      where: { productId: 'P001' },
      data: { quantity: 10 },
    });
    await expect(
      service.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: r.confirmation,
      }),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_STALE' });
    expect(await db.order.count()).toBe(0);
  });
  async function waitLock(fragment: string) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const rows = await db.$queryRaw<
        { query: string }[]
      >`SELECT query FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`;
      if (rows.some((r) => r.query.includes(fragment))) return;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw Error('PostgreSQL lock barrier not reached');
  }
  it('rolls back all inventory decrements when the order insert fails', async () => {
    const c = await create(),
      r = await review(c),
      before = await stock();
    await db.$executeRawUnsafe(
      `CREATE FUNCTION test_reject_order() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected order failure'; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER test_reject_order BEFORE INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION test_reject_order()`,
    );
    try {
      await expect(
        service.submit(c.cart.cartId, c.cartToken, session, {
          confirmation: r.confirmation,
        }),
      ).rejects.toThrow();
      expect(await stock()).toBe(before);
      expect(await db.order.count()).toBe(0);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER test_reject_order ON "Order"`);
      await db.$executeRawUnsafe(`DROP FUNCTION test_reject_order()`);
    }
  });
  it('refuses a submission that expires behind the Cart lock', async () => {
    const c = await create(),
      r = await review(c),
      before = await stock();
    let pending: Promise<unknown>;
    await second.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${c.cart.cartId}::uuid FOR UPDATE`;
      pending = service
        .submit(c.cart.cartId, c.cartToken, session, {
          confirmation: r.confirmation,
        })
        .catch((e) => e);
      await waitLock('FROM "Cart" WHERE id');
      await tx.$executeRaw`UPDATE "Cart" SET "createdAt"=clock_timestamp()-interval '24 hours' WHERE id=${c.cart.cartId}::uuid`;
    });
    expect(await pending!).toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
    expect(await stock()).toBe(before);
    expect(await db.order.count()).toBe(0);
  });
  it('serializes recovery behind an in-flight submit; a temporary missing order does not imply failure', async () => {
    const c = await create(),
      r = await review(c);
    let submit: Promise<unknown>, recovery: Promise<unknown>;
    await second.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "productId" FROM "Inventory" WHERE "productId"='P001' FOR UPDATE`;
      submit = service.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: r.confirmation,
      });
      await waitLock('FROM "Inventory"');
      await expect(
        service.order(c.cart.cartId, c.cartToken),
      ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
      recovery = service.review(c.cart.cartId, c.cartToken, session);
      await waitLock('FROM "Cart" WHERE id');
    });
    const a = await submit!;
    expect(await recovery!).toMatchObject({ state: 'success', order: a });
    expect(await db.order.count()).toBe(1);
  });
  it('preserves a completed transaction even if Cart expires after final admission', async () => {
    const c = await create(),
      r = await review(c);
    await db.$executeRawUnsafe(
      `CREATE FUNCTION test_expire_cart() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE "Cart" SET "createdAt"=clock_timestamp()-interval '24 hours' WHERE id=NEW."cartId"; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER test_expire_cart BEFORE INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION test_expire_cart()`,
    );
    try {
      const order = await service.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: r.confirmation,
      });
      expect(order.snapshot.quote).toEqual(r.summary.quote);
      expect(await db.order.count()).toBe(1);
      await expect(
        service.order(c.cart.cartId, c.cartToken),
      ).rejects.toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER test_expire_cart ON "Order"`);
      await db.$executeRawUnsafe(`DROP FUNCTION test_expire_cart()`);
    }
  });
  it('rolls back a multi-item purchase if any inventory line is unavailable', async () => {
    const c = await create();
    await service.replace(c.cart.cartId, c.cartToken, {
      expectedCartVersion: 1,
      items: [
        { productId: 'P001', quantity: 1 },
        { productId: 'P003', quantity: 1 },
      ],
    });
    const r = await review(c),
      before = await stock();
    await db.inventory.update({
      where: { productId: 'P003' },
      data: { quantity: 0 },
    });
    await expect(
      service.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: r.confirmation,
      }),
    ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
    expect(await stock()).toBe(before);
    expect(await db.order.count()).toBe(0);
  });
  it('revalidates expiry after an actual Inventory lock wait', async () => {
    const c = await create(),
      r = await review(c),
      before = await stock();
    await db.$executeRaw`UPDATE "Cart" SET "createdAt"=clock_timestamp()-interval '24 hours'+interval '1 second' WHERE id=${c.cart.cartId}::uuid`;
    let pending: Promise<unknown>;
    await second.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "productId" FROM "Inventory" WHERE "productId"='P001' FOR UPDATE`;
      pending = service
        .submit(c.cart.cartId, c.cartToken, session, {
          confirmation: r.confirmation,
        })
        .catch((e) => e);
      await waitLock('FROM "Inventory"');
      for (;;) {
        const [time] = await tx.$queryRaw<
          { expired: boolean }[]
        >`SELECT clock_timestamp() >= "createdAt"+interval '24 hours' AS expired FROM "Cart" WHERE id=${c.cart.cartId}::uuid`;
        if (time.expired) break;
        await new Promise((r) => setTimeout(r, 10));
      }
    });
    expect(await pending!).toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
    expect(await stock()).toBe(before);
    expect(await db.order.count()).toBe(0);
  });
  it('detects changed product identity at the same price but accepts sufficient stock changes', async () => {
    const c = await create(),
      r = await review(c),
      data = JSON.parse(raw);
    data.products.find((p: { id: string }) => p.id === 'P001').brand =
      'Different';
    const changed = new CartService(
      new Catalog(JSON.stringify(data)),
      second,
      new CartCredentials(key),
    );
    await expect(
      changed.submit(c.cart.cartId, c.cartToken, session, {
        confirmation: r.confirmation,
      }),
    ).rejects.toMatchObject({ code: 'PURCHASE_CHANGED' });
    await db.inventory.update({
      where: { productId: 'P001' },
      data: { quantity: 2 },
    });
    expect(
      (
        await service.submit(c.cart.cartId, c.cartToken, session, {
          confirmation: r.confirmation,
        })
      ).snapshot,
    ).toEqual(r.summary);
  });
});
