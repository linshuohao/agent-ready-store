import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  database,
  seedInventory,
} from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';
import { CartService } from '../../src/cart/cart.service.js';
const url = process.env.TEST_DATABASE_URL;
const catalog = new Catalog(readFileSync('references/products.json', 'utf8'));
(url ? describe : describe.skip)('isolated cart commands on PostgreSQL', () => {
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
  const add = (
    identity = { initializationId: randomUUID() } as
      { initializationId: string } | { cartId: string },
    productId = 'P001',
    quantity = 1,
  ) => ({ ...identity, operationRequestId: randomUUID(), productId, quantity });
  async function blockedOnCart() {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const rows = await db.$queryRaw<
        { count: number }[]
      >`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM "Cart"%FOR UPDATE%'`;
      if (rows[0].count > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw Error('Concurrent Cart lock wait was not observed');
  }
  const purchase = () => ({
    requestId: randomUUID(),
    selectedItems: [{ productId: 'P001', quantity: 2 }],
    constraints: { currency: 'TWD' },
  });
  it('first concurrent independent adds share exactly one cart and each increment commits once', async () => {
    const identity = { initializationId: randomUUID() };
    const a = add(identity),
      b = add(identity),
      c = add(identity, 'P003');
    const peer = new CartService(catalog, db);
    const results = await Promise.all([
      service.add(a, 'MCP'),
      peer.add(b, 'WEB'),
      peer.add(c, 'MCP'),
      service.add(a, 'MCP'),
    ]);
    expect(new Set(results.map((r) => r.cartId)).size).toBe(1);
    expect(await db.cart.count()).toBe(1);
    expect(await db.cartOperation.count()).toBe(3);
    expect((await service.get(results[0].cartId)).items).toMatchObject([
      { productId: 'P001', quantity: 2 },
      { productId: 'P003', quantity: 1 },
    ]);
    await expect(
      service.add({ ...a, quantity: 2 }, 'MCP'),
    ).rejects.toMatchObject({ code: 'REQUEST_CONFLICT' });
    await expect(
      service.add(
        {
          cartId: results[0].cartId,
          operationRequestId: a.operationRequestId,
          productId: a.productId,
          quantity: a.quantity,
        },
        'MCP',
      ),
    ).rejects.toMatchObject({ code: 'REQUEST_CONFLICT' });
  });
  it('invalid first add rolls back mapping, attribution and operation; legacy initialization cannot write', async () => {
    const input = add();
    await expect(
      service.add({ ...input, productId: 'missing' }, 'MCP'),
    ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
    expect(await db.cart.count()).toBe(0);
    expect(await db.cartOperation.count()).toBe(0);
    await expect(
      service.getOrCreate({ requestId: randomUUID(), initialItems: [] }, 'WEB'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      service.add(add({ cartId: randomUUID() }), 'WEB'),
    ).rejects.toMatchObject({ code: 'CART_NOT_FOUND' });
    const cart = await service.add(input, 'WEB');
    await service.add(
      add({
        initializationId: ('initializationId' in input
          ? input.initializationId
          : undefined)!,
      }),
      'MCP',
    );
    expect((await service.get(cart.cartId)).agentCreated).toBe(false);
    expect(await db.cart.count()).toBe(1);
  });
  it.each([0, 1, 5])(
    'buys explicit two with cart quantity %s and recovers without clearing later additions',
    async (quantity) => {
      let cart = await service.add(add(), 'WEB');
      cart = await service.operate(cart.cartId, {
        operationRequestId: randomUUID(),
        expectedCartVersion: cart.cartVersion,
        operation: quantity
          ? { type: 'set_quantity', productId: 'P001', quantity }
          : { type: 'remove_item', productId: 'P001' },
      });
      const input = purchase();
      const made = await service.createOrder(cart.cartId, input, 'WEB');
      expect(made.order.summary.items[0].quantity).toBe(2);
      expect(made.cart.items).toEqual([]);
      expect(made.cart.cartVersion).toBe(cart.cartVersion + 1);
      await service.add(add({ cartId: cart.cartId }), 'WEB');
      const recovered = await service.createOrder(cart.cartId, input, 'WEB');
      expect(recovered.order.orderId).toBe(made.order.orderId);
      expect(recovered.cart.items[0].quantity).toBe(1);
      const second = await service.createOrder(cart.cartId, purchase(), 'WEB');
      expect(second.order.orderId).not.toBe(made.order.orderId);
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(4);
    },
  );
  it('queries only success facts without expiring reservations or creating unknown identities', async () => {
    const input = add();
    const cart = await service.add(input, 'MCP');
    const body = purchase();
    const made = await service.createOrder(cart.cartId, body, 'MCP');
    await db.order.update({
      where: { id: made.order.orderId },
      data: { reservationExpiresAt: new Date(0) },
    });
    const snapshot = async () =>
      Promise.all([
        db.cart.findMany(),
        db.cartOperation.findMany(),
        db.order.findMany(),
        db.orderLine.findMany(),
        db.inventory.findMany(),
      ]);
    const before = await snapshot();
    expect(
      await service.requestResult({
        kind: 'cart',
        initializationId:
          'initializationId' in input ? input.initializationId : undefined,
        requestId: input.operationRequestId,
      }),
    ).toMatchObject({
      status: 'found',
      kind: 'cart',
      cart: { cartId: cart.cartId },
    });
    expect(
      await service.requestResult({
        kind: 'order',
        cartId: cart.cartId,
        requestId: body.requestId,
      }),
    ).toMatchObject({
      status: 'found',
      kind: 'order',
      order: { orderId: made.order.orderId, effectiveStatus: 'EXPIRED' },
    });
    for (const query of [
      { kind: 'initialize', requestId: input.operationRequestId },
      {
        kind: 'cart',
        initializationId: randomUUID(),
        requestId: input.operationRequestId,
      },
      { kind: 'order', cartId: randomUUID(), requestId: body.requestId },
    ])
      expect(await service.requestResult(query)).toEqual({
        status: 'not_found',
        kind: query.kind,
      });
    expect(await snapshot()).toEqual(before);
    const legacyId = randomUUID();
    await db.cart.create({
      data: {
        id: randomUUID(),
        items: [],
        createdAt: new Date(),
        createRequestId: legacyId,
        createPayloadHash: 'historical',
      },
    });
    expect(
      await service.requestResult({ kind: 'initialize', requestId: legacyId }),
    ).toMatchObject({ status: 'found', kind: 'initialize' });
  });
  it.each(['add', 'set', 'remove'] as const)(
    'serializes %s then order: buys frozen quantity and clears current SKU',
    async (action) => {
      const cart = await service.add(add(), 'WEB');
      let reached!: () => void, release!: () => void;
      const ready = new Promise<void>((resolve) => {
        reached = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const held = new CartService(
        catalog,
        new Proxy(db, {
          get(target, property) {
            if (property === '$transaction')
              return (work: (tx: any) => Promise<any>, options: any) =>
                target.$transaction(async (tx) => {
                  const result = await work(tx);
                  reached();
                  await gate;
                  return result;
                }, options);
            return Reflect.get(target, property);
          },
        }),
      );
      const first =
        action === 'add'
          ? held.add(add({ cartId: cart.cartId }), 'WEB')
          : held.operate(cart.cartId, {
              operationRequestId: randomUUID(),
              expectedCartVersion: cart.cartVersion,
              operation:
                action === 'set'
                  ? { type: 'set_quantity', productId: 'P001', quantity: 5 }
                  : { type: 'remove_item', productId: 'P001' },
            });
      await ready;
      const second = service.createOrder(cart.cartId, purchase(), 'WEB');
      try {
        await blockedOnCart();
      } finally {
        release();
      }
      await first;
      const made = await second;
      expect(made.order.summary.items[0].quantity).toBe(2);
      expect(made.cart.items).toEqual([]);
    },
  );
  it.each(['add', 'set', 'remove'] as const)(
    'serializes order then %s: preserves later add and rejects stale absolute edits',
    async (action) => {
      const cart = await service.add(add(), 'WEB');
      let reached!: () => void, release!: () => void;
      const ready = new Promise<void>((resolve) => {
        reached = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const held = new CartService(
        catalog,
        new Proxy(db, {
          get(target, property) {
            if (property === '$transaction')
              return (work: (tx: any) => Promise<any>, options: any) =>
                target.$transaction(async (tx) => {
                  const result = await work(tx);
                  reached();
                  await gate;
                  return result;
                }, options);
            return Reflect.get(target, property);
          },
        }),
      );
      const first = held.createOrder(cart.cartId, purchase(), 'WEB');
      await ready;
      const second =
        action === 'add'
          ? service.add(add({ cartId: cart.cartId }), 'WEB')
          : service.operate(cart.cartId, {
              operationRequestId: randomUUID(),
              expectedCartVersion: cart.cartVersion,
              operation:
                action === 'set'
                  ? { type: 'set_quantity', productId: 'P001', quantity: 5 }
                  : { type: 'remove_item', productId: 'P001' },
            });
      const observed = second.then(
        (value) => ({ value }),
        (error) => ({ error }),
      );
      try {
        await blockedOnCart();
      } finally {
        release();
      }
      await first;
      const result = await observed;
      if (action === 'add')
        expect(result).toMatchObject({
          value: { items: [{ productId: 'P001', quantity: 1 }] },
        });
      else
        expect(result).toMatchObject({
          error: { code: 'CART_VERSION_CONFLICT' },
        });
      expect(
        (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
          .reservedQuantity,
      ).toBe(2);
    },
  );
  it('adding B does not invalidate buying A or remove B', async () => {
    const cart = await service.add(add(), 'WEB');
    await service.add(add({ cartId: cart.cartId }, 'P003'), 'WEB');
    const made = await service.createOrder(cart.cartId, purchase(), 'WEB');
    expect(made.cart.items).toMatchObject([{ productId: 'P003', quantity: 1 }]);
  });

  it('not_found does not stop the original in-flight commit or turn it into a new write', async () => {
    let reached!: () => void, release!: () => void;
    const ready = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const held = new CartService(
      catalog,
      new Proxy(db, {
        get(target, property) {
          if (property === '$transaction')
            return (work: (tx: any) => Promise<any>, options: any) =>
              target.$transaction(async (tx) => {
                const result = await work(tx);
                reached();
                await gate;
                return result;
              }, options);
          return Reflect.get(target, property);
        },
      }),
    );
    const input = add();
    const pending = held.add(input, 'WEB');
    await ready;
    const query = {
      kind: 'cart',
      initializationId:
        'initializationId' in input ? input.initializationId : undefined,
      requestId: input.operationRequestId,
    };
    expect(await service.requestResult(query)).toEqual({
      status: 'not_found',
      kind: 'cart',
    });
    release();
    const cart = await pending;
    expect(await service.requestResult(query)).toMatchObject({
      status: 'found',
      kind: 'cart',
      cart: { cartId: cart.cartId },
    });
    expect(await db.cart.count()).toBe(1);
    expect(await db.cartOperation.count()).toBe(1);
  });
  it('rolls back the first cart and creation attribution when writing its operation fact fails', async () => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION cart_command_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected first operation fault'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER cart_command_fault BEFORE INSERT ON "CartOperation" FOR EACH ROW EXECUTE FUNCTION cart_command_fault()',
    );
    try {
      await expect(service.add(add(), 'MCP')).rejects.toBeDefined();
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER cart_command_fault ON "CartOperation"',
      );
      await db.$executeRawUnsafe('DROP FUNCTION cart_command_fault()');
    }
    expect(await db.cart.count()).toBe(0);
    expect(await db.cartOperation.count()).toBe(0);
  });
});
