import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  database,
  seedInventory,
} from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';
import { CartCredentials } from '../../src/cart/credentials.js';
import { CartService } from '../../src/cart/cart.service.js';
const url = process.env.TEST_DATABASE_URL;
const catalog = new Catalog(readFileSync('references/products.json', 'utf8'));
const key = randomBytes(32).toString('hex');
(url ? describe : describe.skip)('UI purchases on isolated PostgreSQL', () => {
  let db: ReturnType<typeof database>, service: CartService, other: CartService;
  const web = { channel: 'webmcp' as const, scope: 'browser-one' },
    apps = { channel: 'apps' as const, scope: 'store-mcp-v1' };
  beforeAll(() => {
    if (new URL(url!).pathname !== '/store_test')
      throw Error('store_test required');
    db = database(url!);
    service = new CartService(catalog, db, new CartCredentials(key));
    other = new CartService(catalog, db, new CartCredentials(key));
  });
  beforeEach(async () => {
    await db.order.deleteMany();
    await db.cart.deleteMany();
    await db.inventory.deleteMany();
    await seedInventory(db, catalog);
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  async function create() {
    return service.createAgent({
      createRequestId: randomUUID(),
      items: [{ productId: 'P001', quantity: 1 }],
    });
  }
  const stock = async () =>
    (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
      .quantity;
  it('prepares without purchase; same key replays original review and rejects changed materials', async () => {
    expect(service.preparePurchase).toBeTypeOf('function');
    const c = await create(),
      input = { prepareRequestId: randomUUID(), expectedCartVersion: 1 },
      before = await stock();
    const a = await service.preparePurchase(
      c.cart.cartId,
      c.cartAccessToken,
      web,
      input,
    );
    const b = await other.preparePurchase(
      c.cart.cartId,
      c.cartAccessToken,
      web,
      input,
    );
    expect(b).toEqual(a);
    expect(a.state).toBe('pending');
    expect(a.channel).toBe('webmcp');
    expect(await db.order.count()).toBe(0);
    expect(await stock()).toBe(before);
    expect(JSON.stringify(a)).not.toMatch(/payToken|cancelToken|actorScope/);
    await expect(
      service.preparePurchase(c.cart.cartId, c.cartAccessToken, web, {
        ...input,
        expectedCartVersion: 2,
      }),
    ).rejects.toMatchObject({ code: 'CREATE_REQUEST_CONFLICT' });
  });
  it('requires purpose and scope bound UI material; racing payments consume stock once', async () => {
    expect(service.preparePurchase).toBeTypeOf('function');
    const c = await create(),
      r = await service.preparePurchase(c.cart.cartId, c.cartAccessToken, web, {
        prepareRequestId: randomUUID(),
        expectedCartVersion: 1,
      });
    const m = await service.purchaseMaterials(
        c.cart.cartId,
        c.cartAccessToken,
        web,
        r.reviewId!,
      ),
      before = await stock();
    await expect(
      service.payPurchase(c.cart.cartId, c.cartAccessToken, web, r.reviewId!, {
        payToken: m.cancelToken,
      }),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_INVALID' });
    await expect(
      service.payPurchase(
        c.cart.cartId,
        c.cartAccessToken,
        { ...web, scope: 'other' },
        r.reviewId!,
        { payToken: m.payToken },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      service.payPurchase(c.cart.cartId, c.cartAccessToken, apps, r.reviewId!, {
        payToken: m.payToken,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const [a, b] = await Promise.all([
      service.payPurchase(c.cart.cartId, c.cartAccessToken, web, r.reviewId!, {
        payToken: m.payToken,
      }),
      other.payPurchase(c.cart.cartId, c.cartAccessToken, web, r.reviewId!, {
        payToken: m.payToken,
      }),
    ]);
    expect(a.orderId).toBe(b.orderId);
    expect(await stock()).toBe(before - 1);
    expect(await db.order.count()).toBe(1);
    expect(
      (
        await service.purchaseStatus(
          c.cart.cartId,
          c.cartAccessToken,
          web,
          r.reviewId!,
        )
      ).state,
    ).toBe('completed');
  });
  it('old/repeated cancellation cannot invalidate a newer preparation; cancelled reviews never revive', async () => {
    expect(service.preparePurchase).toBeTypeOf('function');
    const c = await create(),
      input = { prepareRequestId: randomUUID(), expectedCartVersion: 1 };
    const a = await service.preparePurchase(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        input,
      ),
      am = await service.purchaseMaterials(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        a.reviewId!,
      );
    await service.cancelPurchase(
      c.cart.cartId,
      c.cartAccessToken,
      apps,
      a.reviewId!,
      { cancelToken: am.cancelToken },
    );
    const b = await service.preparePurchase(
      c.cart.cartId,
      c.cartAccessToken,
      apps,
      { ...input, prepareRequestId: randomUUID() },
    );
    await service.cancelPurchase(
      c.cart.cartId,
      c.cartAccessToken,
      apps,
      a.reviewId!,
      { cancelToken: am.cancelToken },
    );
    expect(
      (
        await service.purchaseStatus(
          c.cart.cartId,
          c.cartAccessToken,
          apps,
          b.reviewId!,
        )
      ).state,
    ).toBe('pending');
    expect(
      (
        await other.preparePurchase(
          c.cart.cartId,
          c.cartAccessToken,
          apps,
          input,
        )
      ).state,
    ).toBe('cancelled');
    await expect(
      service.payPurchase(c.cart.cartId, c.cartAccessToken, apps, a.reviewId!, {
        payToken: am.payToken,
      }),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_STALE' });
  });
  it('ordinary review fences UI pay and UI preparation fences ordinary confirmation', async () => {
    expect(service.preparePurchase).toBeTypeOf('function');
    const c = await create(),
      session = randomBytes(32).toString('base64url');
    const old = await service.review(c.cart.cartId, c.cartAccessToken, session);
    if (old.state !== 'ready') throw Error('ready');
    const r = await service.preparePurchase(
      c.cart.cartId,
      c.cartAccessToken,
      web,
      { prepareRequestId: randomUUID(), expectedCartVersion: 1 },
    );
    await expect(
      service.submit(c.cart.cartId, c.cartAccessToken, session, {
        confirmation: old.confirmation,
      }),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_STALE' });
    const m = await service.purchaseMaterials(
      c.cart.cartId,
      c.cartAccessToken,
      web,
      r.reviewId!,
    );
    await service.review(c.cart.cartId, c.cartAccessToken, session);
    await expect(
      service.payPurchase(c.cart.cartId, c.cartAccessToken, web, r.reviewId!, {
        payToken: m.payToken,
      }),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_STALE' });
    expect(await db.order.count()).toBe(0);
  });
  it('order read capabilities are distinct, bounded and available only after a committed order', async () => {
    expect(service.orderLink).toBeTypeOf('function');
    const c = await create();
    await expect(
      service.orderLink(c.cart.cartId, c.cartAccessToken),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
    const r = await service.preparePurchase(
      c.cart.cartId,
      c.cartAccessToken,
      apps,
      { prepareRequestId: randomUUID(), expectedCartVersion: 1 },
    );
    const m = await service.purchaseMaterials(
      c.cart.cartId,
      c.cartAccessToken,
      apps,
      r.reviewId!,
    );
    const o = await service.payPurchase(
      c.cart.cartId,
      c.cartAccessToken,
      apps,
      r.reviewId!,
      { payToken: m.payToken },
    );
    const link = await service.orderLink(c.cart.cartId, c.cartAccessToken),
      u = new URL(link.url);
    const token = new URLSearchParams(u.hash.slice(1)).get('order-read')!;
    expect(token).not.toBe(c.cartAccessToken);
    expect(u.pathname).toBe(`/order-details/${o.orderId}`);
    expect(
      (await service.readOrderCapability(o.orderId, token)).order.orderId,
    ).toBe(o.orderId);
    await expect(
      service.readOrderCapability(randomUUID(), token),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_INVALID' });
    await expect(
      service.readOrderCapability(o.orderId, m.payToken),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_INVALID' });
    expect(await service.orderLink(c.cart.cartId, c.cartAccessToken)).toEqual(
      link,
    );
  });
  it('same-value product changes invalidate confirmation; sufficient stock changes do not', async () => {
    const c = await create(),
      r = await service.preparePurchase(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        { prepareRequestId: randomUUID(), expectedCartVersion: 1 },
      ),
      m = await service.purchaseMaterials(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        r.reviewId!,
      );
    const data = JSON.parse(readFileSync('references/products.json', 'utf8'));
    data.products.find((p: { id: string }) => p.id === 'P001').name =
      'Renamed same price';
    const changed = new CartService(
      new Catalog(JSON.stringify(data)),
      db,
      new CartCredentials(key),
    );
    await expect(
      changed.payPurchase(c.cart.cartId, c.cartAccessToken, apps, r.reviewId!, {
        payToken: m.payToken,
      }),
    ).rejects.toMatchObject({ code: 'PURCHASE_CHANGED' });
    await db.inventory.update({
      where: { productId: 'P001' },
      data: { quantity: 99 },
    });
    const order = await service.payPurchase(
      c.cart.cartId,
      c.cartAccessToken,
      apps,
      r.reviewId!,
      { payToken: m.payToken },
    );
    expect(order.snapshot).toEqual(r.summary);
    expect(await stock()).toBe(98);
  });
  it('new preparations and cancel compete with payment under the same Cart lock', async () => {
    const c = await create(),
      input = { prepareRequestId: randomUUID(), expectedCartVersion: 1 },
      r = await service.preparePurchase(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        input,
      ),
      m = await service.purchaseMaterials(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        r.reviewId!,
      ),
      before = await stock();
    const results = await Promise.allSettled([
      service.payPurchase(c.cart.cartId, c.cartAccessToken, apps, r.reviewId!, {
        payToken: m.payToken,
      }),
      other.cancelPurchase(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        r.reviewId!,
        { cancelToken: m.cancelToken },
      ),
      other.preparePurchase(c.cart.cartId, c.cartAccessToken, web, {
        ...input,
        prepareRequestId: randomUUID(),
      }),
    ]);
    const count = await db.order.count();
    expect(count).toBeLessThanOrEqual(1);
    expect(await stock()).toBe(before - count);
    const status = await service.purchaseStatus(
      c.cart.cartId,
      c.cartAccessToken,
      apps,
      r.reviewId!,
    );
    expect(['completed', 'cancelled', 'stale']).toContain(status.state);
    expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
  });
  it('rolls back UI payment and inventory on database failure with no durable UI approval', async () => {
    const c = await create(),
      r = await service.preparePurchase(c.cart.cartId, c.cartAccessToken, web, {
        prepareRequestId: randomUUID(),
        expectedCartVersion: 1,
      }),
      m = await service.purchaseMaterials(
        c.cart.cartId,
        c.cartAccessToken,
        web,
        r.reviewId!,
      ),
      before = await stock();
    await db.$executeRawUnsafe(
      `CREATE FUNCTION test_reject_ui_order() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected order failure'; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER test_reject_ui_order BEFORE INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION test_reject_ui_order()`,
    );
    try {
      await expect(
        service.payPurchase(
          c.cart.cartId,
          c.cartAccessToken,
          web,
          r.reviewId!,
          { payToken: m.payToken },
        ),
      ).rejects.toThrow();
      expect(await stock()).toBe(before);
      expect(await db.order.count()).toBe(0);
      expect(
        (
          await service.purchaseStatus(
            c.cart.cartId,
            c.cartAccessToken,
            web,
            r.reviewId!,
          )
        ).state,
      ).toBe('pending');
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER test_reject_ui_order ON "Order"`,
      );
      await db.$executeRawUnsafe(`DROP FUNCTION test_reject_ui_order()`);
    }
  });
  it('expired original material can only recover an already completed result within extended cart access', async () => {
    const c = await create();
    await db.$executeRaw`UPDATE "Cart" SET "createdAt"=clock_timestamp()-interval '24 hours'+interval '800 milliseconds' WHERE id=${c.cart.cartId}::uuid`;
    const r = await service.preparePurchase(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        { prepareRequestId: randomUUID(), expectedCartVersion: 1 },
      ),
      m = await service.purchaseMaterials(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        r.reviewId!,
      );
    await service.handoff(c.cart.cartId, c.cartAccessToken);
    const order = await service.payPurchase(
      c.cart.cartId,
      c.cartAccessToken,
      apps,
      r.reviewId!,
      { payToken: m.payToken },
    );
    await new Promise((resolve) => setTimeout(resolve, 850));
    expect(
      await service.payPurchase(
        c.cart.cartId,
        c.cartAccessToken,
        apps,
        r.reviewId!,
        { payToken: m.payToken },
      ),
    ).toEqual(order);
    expect(
      (
        await service.cancelPurchase(
          c.cart.cartId,
          c.cartAccessToken,
          apps,
          r.reviewId!,
          { cancelToken: m.cancelToken },
        )
      ).state,
    ).toBe('completed');
    await expect(
      service.payPurchase(c.cart.cartId, c.cartAccessToken, apps, r.reviewId!, {
        payToken: m.cancelToken,
      }),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_INVALID' });
  });
  it('review expiry is rechecked after an actual inventory lock wait even after handoff extends access', async () => {
    const c = await create();
    await db.$executeRaw`UPDATE "Cart" SET "createdAt"=clock_timestamp()-interval '24 hours'+interval '800 milliseconds' WHERE id=${c.cart.cartId}::uuid`;
    const r = await service.preparePurchase(
        c.cart.cartId,
        c.cartAccessToken,
        web,
        { prepareRequestId: randomUUID(), expectedCartVersion: 1 },
      ),
      m = await service.purchaseMaterials(
        c.cart.cartId,
        c.cartAccessToken,
        web,
        r.reviewId!,
      ),
      before = await stock();
    await service.handoff(c.cart.cartId, c.cartAccessToken);
    let payment: Promise<unknown>;
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "productId" FROM "Inventory" WHERE "productId"='P001' FOR UPDATE`;
      payment = other
        .payPurchase(c.cart.cartId, c.cartAccessToken, web, r.reviewId!, {
          payToken: m.payToken,
        })
        .catch((e) => e);
      const deadline = Date.now() + 5000;
      let waiting = false;
      while (Date.now() < deadline) {
        const rows = await db.$queryRaw<
          { query: string }[]
        >`SELECT query FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`;
        if (rows.some((r) => r.query.includes('FROM "Inventory"'))) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 850));
    });
    expect(await payment!).toMatchObject({ code: 'CONFIRMATION_EXPIRED' });
    expect(await stock()).toBe(before);
    expect(await db.order.count()).toBe(0);
  });
});
