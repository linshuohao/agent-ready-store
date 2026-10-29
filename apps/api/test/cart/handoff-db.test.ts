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
(url ? describe : describe.skip)('Agent Handoff on isolated PostgreSQL', () => {
  let db: ReturnType<typeof database>,
    second: ReturnType<typeof database>,
    carts: CartService,
    other: CartService;
  const key = randomBytes(32).toString('hex');
  const input = () => ({
    createRequestId: randomUUID(),
    items: [{ productId: 'P001', quantity: 1 }],
  });
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
  it('creates one AGENT cart, recovers the same token after edits and restart, and counts once', async () => {
    const original = input();
    const [a, b] = await Promise.all([
      carts.createAgent(original),
      other.createAgent(original),
    ]);
    expect(a.cart.cartId).toBe(b.cart.cartId);
    expect(a.cartAccessToken).toBe(b.cartAccessToken);
    expect(a.cart.origin).toBe('AGENT');
    await carts.replace(a.cart.cartId, a.cartAccessToken, {
      expectedCartVersion: 1,
      items: [],
    });
    const replay = await other.createAgent(original);
    expect(replay.cart.items).toEqual([]);
    expect(replay.cartAccessToken).toBe(a.cartAccessToken);
    await expect(
      carts.createAgent({
        ...original,
        items: [{ productId: 'P003', quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'CREATE_REQUEST_CONFLICT' });
    await expect(
      carts.createAgent({ ...input(), items: [] }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await carts.agentCreationCount()).toBe(1);
    await db.inventory.update({
      where: { productId: 'P001' },
      data: { quantity: 0 },
    });
    expect((await carts.createAgent(original)).cart.cartId).toBe(a.cart.cartId);
  });
  it('shares the same capability once, survives original creation expiry, and expires all entrances together', async () => {
    const original = input(),
      a = await carts.createAgent(original);
    await expect(
      carts.exchange(a.cart.cartId, a.cartAccessToken),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await db.$executeRaw`UPDATE "Cart" SET "createdAt"=clock_timestamp()-interval '23 hours' WHERE id=${a.cart.cartId}::uuid`;
    const shares = await Promise.all([
      carts.handoff(a.cart.cartId, a.cartAccessToken),
      other.handoff(a.cart.cartId, a.cartAccessToken),
    ]);
    expect(shares[0]).toEqual(shares[1]);
    expect(
      Date.parse(shares[0].expiresAt) - Date.parse(shares[0].issuedAt),
    ).toBe(86400000);
    await db.$executeRaw`UPDATE "Cart" SET "createdAt"=clock_timestamp()-interval '25 hours' WHERE id=${a.cart.cartId}::uuid`;
    expect(
      (
        await carts.replace(a.cart.cartId, a.cartAccessToken, {
          expectedCartVersion: 1,
          items: [],
        })
      ).cartVersion,
    ).toBe(2);
    expect(
      (await carts.exchange(a.cart.cartId, a.cartAccessToken)).expiresAt,
    ).toBe(shares[0].expiresAt);
    expect((await other.createAgent(original)).cart.expiresAt).toBe(
      shares[0].expiresAt,
    );
    await db.$executeRaw`UPDATE "Cart" SET "handoffIssuedAt"=date_trunc('milliseconds', clock_timestamp())-interval '24 hours' WHERE id=${a.cart.cartId}::uuid`;
    for (const op of [
      () => carts.get(a.cart.cartId, a.cartAccessToken),
      () => carts.handoff(a.cart.cartId, a.cartAccessToken),
      () => carts.exchange(a.cart.cartId, a.cartAccessToken),
      () => carts.createAgent(original),
    ])
      await expect(op()).rejects.toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
    expect(await carts.agentCreationCount()).toBe(1);
  });
  it('returns the immutable order after completion without another handoff or epoch change', async () => {
    const original = input(),
      a = await carts.createAgent(original),
      session = randomBytes(32).toString('base64url');
    await carts.handoff(a.cart.cartId, a.cartAccessToken);
    const review = await carts.review(
      a.cart.cartId,
      a.cartAccessToken,
      session,
    );
    if (review.state !== 'ready') throw new Error('Expected ready');
    const order = await carts.submit(
      a.cart.cartId,
      a.cartAccessToken,
      session,
      { confirmation: review.confirmation },
    );
    const epoch = (
      await db.cart.findUniqueOrThrow({ where: { id: a.cart.cartId } })
    ).checkoutEpoch;
    expect(
      (await carts.agentGet(a.cart.cartId, a.cartAccessToken)).order,
    ).toEqual(order);
    expect(
      (await carts.exchange(a.cart.cartId, a.cartAccessToken)).orderId,
    ).toBe(order.orderId);
    await expect(
      carts.handoff(a.cart.cartId, a.cartAccessToken),
    ).rejects.toMatchObject({ code: 'CART_COMPLETED' });
    expect(
      (await db.cart.findUniqueOrThrow({ where: { id: a.cart.cartId } }))
        .checkoutEpoch,
    ).toBe(epoch);
  });
  it('keeps old confirmation expiry separate from the newly extended cart expiry', async () => {
    const a = await carts.createAgent(input()),
      session = randomBytes(32).toString('base64url');
    const old = await carts.review(a.cart.cartId, a.cartAccessToken, session);
    if (old.state !== 'ready') throw new Error('Expected ready');
    const credentials = new CartCredentials(key);
    const payload = credentials.confirmation.verify(
      old.confirmation,
      session,
      Date.now(),
    );
    const expired = credentials.confirmation.sign(
      { ...payload, expiresAt: Date.now() - 1 },
      session,
    );
    await carts.handoff(a.cart.cartId, a.cartAccessToken);
    await expect(
      carts.submit(a.cart.cartId, a.cartAccessToken, session, {
        confirmation: expired,
      }),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_EXPIRED' });
    expect(await db.order.count()).toBe(0);
    const fresh = await carts.review(a.cart.cartId, a.cartAccessToken, session);
    expect(fresh.state).toBe('ready');
  });
  async function blocked(count: number) {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const [row] = await db.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::integer AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM "Cart" WHERE id%'`;
      if (row.count >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Cart lock barrier not reached');
  }
  it('rejects first sharing after a real lock wait crosses creation expiry', async () => {
    const a = await carts.createAgent(input());
    let pending: Promise<unknown>;
    await second.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${a.cart.cartId}::uuid FOR UPDATE`;
      pending = carts.handoff(a.cart.cartId, a.cartAccessToken).catch((e) => e);
      await blocked(1);
      await tx.$executeRaw`UPDATE "Cart" SET "createdAt"=date_trunc('milliseconds', clock_timestamp())-interval '24 hours' WHERE id=${a.cart.cartId}::uuid`;
    });
    expect(await pending!).toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
    expect(
      (await db.cart.findUniqueOrThrow({ where: { id: a.cart.cartId } }))
        .handoffIssuedAt,
    ).toBeNull();
  });
  it('uses the shared deadline after an edit waits across the original deadline', async () => {
    const a = await carts.createAgent(input());
    await carts.handoff(a.cart.cartId, a.cartAccessToken);
    let pending: Promise<unknown>;
    await second.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${a.cart.cartId}::uuid FOR UPDATE`;
      pending = carts.replace(a.cart.cartId, a.cartAccessToken, {
        expectedCartVersion: 1,
        items: [],
      });
      await blocked(1);
      await tx.$executeRaw`UPDATE "Cart" SET "createdAt"=date_trunc('milliseconds', clock_timestamp())-interval '24 hours' WHERE id=${a.cart.cartId}::uuid`;
    });
    expect(await pending!).toMatchObject({ cartVersion: 2, items: [] });
  });
  it.each(['share', 'order'])(
    'serializes %s before the competing order/share request',
    async (first) => {
      const a = await carts.createAgent(input()),
        session = randomBytes(32).toString('base64url');
      const review = await carts.review(
        a.cart.cartId,
        a.cartAccessToken,
        session,
      );
      if (review.state !== 'ready') throw new Error('Expected ready');
      const share = () =>
        carts.handoff(a.cart.cartId, a.cartAccessToken).catch((e) => e);
      const submit = () =>
        carts.submit(a.cart.cartId, a.cartAccessToken, session, {
          confirmation: review.confirmation,
        });
      let firstResult: Promise<any>, secondResult: Promise<any>;
      await second.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${a.cart.cartId}::uuid FOR UPDATE`;
        firstResult = first === 'share' ? share() : submit();
        await blocked(1);
        secondResult = first === 'share' ? submit() : share();
        await blocked(2);
      });
      const [one, two] = await Promise.all([firstResult!, secondResult!]);
      const shared = first === 'share' ? one : two;
      expect(await db.order.count()).toBe(1);
      if (first === 'share') expect(shared.issuedAt).toBeTypeOf('string');
      else expect(shared.code).toBe('CART_COMPLETED');
    },
  );
  it('rechecks confirmation expiry after a real inventory lock wait while shared cart remains valid', async () => {
    const a = await carts.createAgent(input()),
      session = randomBytes(32).toString('base64url');
    await carts.handoff(a.cart.cartId, a.cartAccessToken);
    const review = await carts.review(
      a.cart.cartId,
      a.cartAccessToken,
      session,
    );
    if (review.state !== 'ready') throw new Error('Expected ready');
    const credentials = new CartCredentials(key);
    const payload = credentials.confirmation.verify(
      review.confirmation,
      session,
      Date.now(),
    );
    const expiry = Date.now() + 1000;
    const proof = credentials.confirmation.sign(
      { ...payload, expiresAt: expiry },
      session,
    );
    const before = await db.inventory.findUniqueOrThrow({
      where: { productId: 'P001' },
    });
    let pending: Promise<unknown>;
    await second.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "productId" FROM "Inventory" WHERE "productId"='P001' FOR UPDATE`;
      pending = carts
        .submit(a.cart.cartId, a.cartAccessToken, session, {
          confirmation: proof,
        })
        .catch((e) => e);
      const deadline = Date.now() + 3000;
      let waiting = false;
      while (Date.now() < deadline) {
        const [row] = await db.$queryRaw<
          { count: number }[]
        >`SELECT count(*)::integer AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM "Inventory" WHERE%'`;
        if (row.count >= 1) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      while (Date.now() <= expiry)
        await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(await pending!).toMatchObject({ code: 'CONFIRMATION_EXPIRED' });
    expect(await db.order.count()).toBe(0);
    expect(
      (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
        .quantity,
    ).toBe(before.quantity);
    expect(
      (await carts.get(a.cart.cartId, a.cartAccessToken)).canCheckout,
    ).toBe(true);
  });
});
