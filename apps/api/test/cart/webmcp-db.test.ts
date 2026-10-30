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
(url ? describe : describe.skip)('WebMCP on isolated PostgreSQL', () => {
  let db: ReturnType<typeof database>,
    second: ReturnType<typeof database>,
    carts: CartService,
    other: CartService;
  const key = randomBytes(32).toString('hex');
  const input = () => ({
    createRequestId: randomUUID(),
    cartToken: randomBytes(32).toString('base64url'),
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
  it.each(['conversion', 'order'])(
    'serializes %s first against the competing order/conversion',
    async (first) => {
      const a = input(),
        human = await carts.create(a),
        id = human.cart.cartId,
        session = input().cartToken;
      const before = await carts.review(id, a.cartToken, session);
      if (before.state !== 'ready') throw new Error('Expected ready');
      const stock = await db.inventory.findUniqueOrThrow({
        where: { productId: 'P001' },
      });
      const convert = () =>
        carts
          .replaceWebMcp(id, a.cartToken, {
            expectedCartVersion: 1,
            items: a.items,
          })
          .catch((e) => e);
      const submit = () =>
        carts
          .submit(id, a.cartToken, session, {
            confirmation: before.confirmation,
          })
          .catch((e) => e);
      let one: Promise<any>, two: Promise<any>;
      await second.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${id}::uuid FOR UPDATE`;
        one = first === 'conversion' ? convert() : submit();
        await blocked(1);
        two = first === 'conversion' ? submit() : convert();
        await blocked(2);
      });
      const [x, y] = await Promise.all([one!, two!]);
      if (first === 'conversion') {
        expect(x.origin).toBe('AGENT');
        expect(y.code).toBe('PURCHASE_CHANGED');
        expect(await db.order.count()).toBe(0);
      } else {
        expect(x.orderId).toBeTypeOf('string');
        expect(y.code).toBe('CART_COMPLETED');
        expect(await db.order.count()).toBe(1);
      }
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .quantity,
      ).toBe(stock.quantity - (first === 'order' ? 1 : 0));
    },
  );
  it('creates browser AGENT carts with per-proof recovery and immutable creation counts', async () => {
    const a = input();
    const made = await carts.createWebMcp(a);
    expect(made.cart.origin).toBe('AGENT');
    expect((await other.createWebMcp(a)).cart.cartId).toBe(made.cart.cartId);
    await carts.replace(made.cart.cartId, a.cartToken, {
      expectedCartVersion: 1,
      items: [],
    });
    expect((await other.createWebMcp(a)).cart.items).toEqual([]);
    expect(await carts.agentCreationCount()).toBe(1);
    await expect(
      carts.createWebMcp({ ...input(), items: [] }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    // Different browser proof with the same public request key cannot recover another cart.
    const b = await carts.createWebMcp({ ...a, cartToken: input().cartToken });
    expect(b.cart.cartId).not.toBe(made.cart.cartId);
  });
  it('upgrades the same HUMAN cart atomically, preserves recovery and does not count a creation', async () => {
    const a = input(),
      human = await carts.create(a);
    const upgraded = await carts.replaceWebMcp(human.cart.cartId, a.cartToken, {
      expectedCartVersion: 1,
      items: a.items,
    });
    expect(upgraded).toMatchObject({
      origin: 'AGENT',
      cartVersion: 2,
      cartId: human.cart.cartId,
      expiresAt: human.cart.expiresAt,
    });
    expect(upgraded.quote!.total).not.toBe(human.cart.quote!.total);
    expect(await carts.agentCreationCount()).toBe(0);
    expect((await carts.create(a)).cart).toEqual(upgraded);
    const next = await carts.replace(human.cart.cartId, a.cartToken, {
      expectedCartVersion: 2,
      items: [],
    });
    expect(next.origin).toBe('AGENT');
    expect(await carts.agentCreationCount()).toBe(0);
  });
  it('keeps failed, expired and unauthorized conversions unchanged', async () => {
    const a = input(),
      human = await carts.create(a),
      id = human.cart.cartId;
    for (const [token, body, code] of [
      ['x'.repeat(43), { expectedCartVersion: 1, items: a.items }, 'FORBIDDEN'],
      [
        a.cartToken,
        { expectedCartVersion: 2, items: a.items },
        'CART_VERSION_CONFLICT',
      ],
      [
        a.cartToken,
        {
          expectedCartVersion: 1,
          items: [{ productId: 'P001', quantity: 99999 }],
        },
        'CART_ITEMS_INVALID',
      ],
    ] as const)
      await expect(carts.replaceWebMcp(id, token, body)).rejects.toMatchObject({
        code,
      });
    expect(await carts.get(id, a.cartToken)).toEqual(human.cart);
    await db.$executeRaw`UPDATE "Cart" SET "createdAt"=date_trunc('milliseconds', clock_timestamp())-interval '24 hours' WHERE id=${id}::uuid`;
    await expect(
      carts.replaceWebMcp(id, a.cartToken, {
        expectedCartVersion: 1,
        items: a.items,
      }),
    ).rejects.toMatchObject({ code: 'CREDENTIAL_EXPIRED' });
    expect((await db.cart.findUniqueOrThrow({ where: { id } })).origin).toBe(
      'HUMAN',
    );
  });
  it('serializes competing same-version writes without partial conversion', async () => {
    const a = input(),
      human = await carts.create(a),
      id = human.cart.cartId;
    const result = await Promise.allSettled([
      carts.replaceWebMcp(id, a.cartToken, {
        expectedCartVersion: 1,
        items: a.items,
      }),
      other.replace(id, a.cartToken, { expectedCartVersion: 1, items: [] }),
    ]);
    expect(result.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const saved = await carts.get(id, a.cartToken);
    expect(saved.cartVersion).toBe(2);
    expect(
      saved.items.map(({ productId, quantity }) => ({ productId, quantity })),
    ).toEqual(saved.origin === 'AGENT' ? a.items : []);
    expect(await carts.agentCreationCount()).toBe(0);
  });
  it('rejects old confirmation after conversion and refuses conversion after order', async () => {
    const a = input(),
      human = await carts.create(a),
      id = human.cart.cartId,
      session = input().cartToken;
    const before = await carts.review(id, a.cartToken, session);
    if (before.state !== 'ready') throw new Error('Expected ready');
    await carts.replaceWebMcp(id, a.cartToken, {
      expectedCartVersion: 1,
      items: a.items,
    });
    await expect(
      carts.submit(id, a.cartToken, session, {
        confirmation: before.confirmation,
      }),
    ).rejects.toMatchObject({ code: 'PURCHASE_CHANGED' });
    expect(await db.order.count()).toBe(0);
    const fresh = await carts.review(id, a.cartToken, session);
    if (fresh.state !== 'ready') throw new Error('Expected ready');
    const order = await carts.submit(id, a.cartToken, session, {
      confirmation: fresh.confirmation,
    });
    await expect(
      carts.replaceWebMcp(id, a.cartToken, {
        expectedCartVersion: 2,
        items: [],
      }),
    ).rejects.toMatchObject({ code: 'CART_COMPLETED' });
    expect((await carts.agentGet(id, a.cartToken)).order).toEqual(order);
  });
});
