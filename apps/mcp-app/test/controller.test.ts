import { describe, it, expect, vi } from 'vitest';
import { StoreController, type Bridge, type Storage } from '../src/controller';
import type { ShoppingCartView, OrderView } from '@store/contracts';
export const id = '10000000-0000-4000-8000-000000000001',
  oid = '20000000-0000-4000-8000-000000000001';
export const cart: ShoppingCartView = {
  cartId: id,
  cartVersion: 1,
  agentCreated: true,
  items: [
    {
      productId: 'P001',
      quantity: 1,
      name: '耳機',
      unitPrice: '10.00',
      availability: { canPurchase: true, reasons: [], currentQuantity: 10 },
    },
  ],
  issues: [],
  pendingOrders: [],
};
export const order: OrderView = {
  orderId: oid,
  cartId: id,
  sourceCartVersion: 1,
  status: 'CHECKOUT',
  effectiveStatus: 'CHECKOUT',
  createdAt: '2026-01-01T00:00:00.000Z',
  reservationExpiresAt: '2099-01-01T00:00:00.000Z',
  paidAt: null,
  closedAt: null,
  closeReason: null,
  createdByChannel: 'APPS',
  aiEligible: true,
  summary: {
    currency: 'TWD',
    pricingRuleVersion: 'v1',
    items: [
      {
        productId: 'P001',
        name: '耳機',
        brand: 'Brand',
        specs: { color: '黑' },
        quantity: 1,
        unitPrice: '10.00',
        lineSubtotal: '10.00',
      },
    ],
    subtotal: '10.00',
    thresholdDiscount: '0.00',
    aiDiscount: '0.50',
    shipping: '100.00',
    total: '109.50',
  },
  allowedActions: { canPay: true, canCancel: true },
  navigation: {
    orderUrl: `http://localhost:3000/orders/${oid}`,
    shareUrl: `http://localhost:3000/orders/${oid}?view=share`,
  },
};
const ok = (data: unknown) => ({ structuredContent: { ok: true, data } });
function memory(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
}
function setup(
  entry = 'get_cart',
  storage = memory(),
  cardId: string | undefined = 'fixture-card',
) {
  const call = vi.fn<Bridge['call']>(async (name) =>
    ok(
      name === 'get_order'
        ? order
        : name === 'quote_selection'
          ? order.summary
          : cart,
    ),
  );
  const bridge = { call, open: vi.fn(async () => ({})), canOpen: () => true };
  return {
    c: new StoreController(
      entry as 'get_cart',
      bridge,
      'http://localhost:3000',
      storage,
      cardId,
    ),
    bridge,
    storage,
  };
}
describe('Apps lifecycle', () => {
  it('reads a historical order by ID without creating or paying', async () => {
    const { c, bridge } = setup('get_order');
    await c.receive(undefined, ok(order));
    expect(c.getSnapshot().order?.orderId).toBe(oid);
    expect(bridge.call.mock.calls.map((x) => x[0])).toEqual(['get_order']);
  });
  it('persists original creation before sending and recovers exact payload after remount', async () => {
    const { c, bridge, storage } = setup();
    await c.receive({ cartId: id }, ok(cart));
    await c.select('P001', true);
    let original: unknown;
    bridge.call.mockImplementation(async (name, args) => {
      if (name === 'apps_create_order') {
        original = args;
        throw Error('lost');
      }
      return ok(cart);
    });
    await c.checkout();
    expect(c.getSnapshot().pending?.name).toBe('apps_create_order');
    const second = setup('get_cart', storage);
    await second.c.receive({ cartId: id }, ok(cart));
    second.bridge.call.mockImplementation(async (name, args) => {
      expect(name).toBe('apps_create_order');
      expect(args).toEqual(original);
      return ok({ order, cart: { ...cart, cartVersion: 2, items: [] } });
    });
    await second.c.retry();
    expect(second.c.getSnapshot().order?.orderId).toBe(oid);
  });
  it('blocks writes when persistence fails', async () => {
    const { c, bridge } = setup('get_cart', {
      getItem: () => null,
      setItem: () => {
        throw Error('denied');
      },
      removeItem: () => {},
    });
    await c.receive({ cartId: id }, ok(cart));
    await c.select('P001', true);
    await c.checkout();
    expect(
      bridge.call.mock.calls.some((x) => x[0] === 'apps_create_order'),
    ).toBe(false);
  });
  it('preserves dirty quantity on external snapshots and requires explicit reload', async () => {
    const { c } = setup();
    await c.receive({ cartId: id }, ok(cart));
    c.change('P001', '3');
    await c.receive({ cartId: id }, ok({ ...cart, cartVersion: 2 }));
    expect(c.getSnapshot().draft.P001).toBe('3');
    expect(c.getSnapshot().needsRefresh).toBe(true);
  });
  it('unknown cancel cannot become a pay retry', async () => {
    const { c, bridge } = setup('get_order');
    await c.receive({ orderId: oid }, ok(order));
    bridge.call.mockRejectedValueOnce(Error('lost'));
    await c.cancel();
    expect(c.getSnapshot().pending?.name).toBe('cancel_order');
    await c.pay();
    expect(bridge.call.mock.calls.some((x) => x[0] === 'apps_pay_order')).toBe(
      false,
    );
    await c.reload();
    await c.retry();
    expect(bridge.call.mock.calls.at(-1)?.[0]).toBe('cancel_order');
  });
  it('late payment updates original order only and prevents terminal regression', async () => {
    const { c, bridge } = setup('get_order');
    await c.receive({ orderId: oid }, ok(order));
    let done!: (x: unknown) => void;
    bridge.call.mockImplementationOnce(
      () =>
        new Promise((r) => {
          done = r;
        }),
    );
    const pay = c.pay();
    const b = { ...order, orderId: '20000000-0000-4000-8000-000000000002' };
    bridge.call.mockResolvedValueOnce(ok(b));
    await c.openOrder(b.orderId);
    done(
      ok({
        ...order,
        status: 'PAID',
        effectiveStatus: 'PAID',
        paidAt: '2026-01-01T00:01:00.000Z',
        allowedActions: { canPay: false, canCancel: false },
      }),
    );
    await pay;
    expect(c.getSnapshot().order?.orderId).toBe(b.orderId);
    bridge.call.mockResolvedValueOnce(ok(order));
    await c.openOrder(oid);
    expect(c.getSnapshot().order?.status).toBe('PAID');
  });
  it('checks trusted share path and requires explicit cross-cart continuation', async () => {
    const { c, bridge, storage } = setup('get_order');
    storage.setItem(
      'store.apps.currentCartId',
      '30000000-0000-4000-8000-000000000001',
    );
    bridge.call.mockResolvedValueOnce(
      ok({
        ...order,
        navigation: { ...order.navigation, shareUrl: 'https://evil.test/' },
      }),
    );
    await c.receive({ orderId: oid }, ok(order));
    await c.share();
    expect(bridge.open).not.toHaveBeenCalled();
    await c.continueShopping();
    expect(c.getSnapshot().confirmCartId).toBe(id);
    expect(storage.getItem('store.apps.currentCartId')).not.toBe(id);
    await c.continueShopping(true);
    expect(storage.getItem('store.apps.currentCartId')).toBe(id);
  });
});

it('failed initial order read still reloads order ID rather than treating it as cart', async () => {
  const { c, bridge } = setup('get_order');
  bridge.call.mockRejectedValueOnce(Error('offline'));
  await c.receive({ orderId: oid }, ok(order));
  await c.reload();
  expect(bridge.call.mock.calls.at(-1)).toEqual([
    'get_order',
    { orderId: oid },
  ]);
});
it('late payment is visible after leaving and returning to the original order', async () => {
  const { c, bridge } = setup('get_order');
  await c.receive({ orderId: oid }, ok(order));
  let done!: (v: unknown) => void;
  bridge.call.mockImplementationOnce(
    () =>
      new Promise((r) => {
        done = r;
      }),
  );
  const pay = c.pay();
  await c.continueShopping();
  await c.openOrder(oid);
  done(
    ok({
      ...order,
      status: 'PAID',
      effectiveStatus: 'PAID',
      paidAt: '2026-01-01T00:01:00.000Z',
      allowedActions: { canPay: false, canCancel: false },
    }),
  );
  await pay;
  expect(c.getSnapshot().order?.status).toBe('PAID');
});
it('stores full request before dispatch and preserves it on transport error', async () => {
  const { c, bridge, storage } = setup();
  await c.receive({ cartId: id }, ok(cart));
  c.change('P001', '2');
  bridge.call.mockImplementationOnce(async (name, args) => {
    expect(name).toBe('update_cart_item');
    expect(
      JSON.parse(storage.getItem('store.apps.pending.' + id)!).args,
    ).toEqual(args);
    throw Error('lost');
  });
  await c.save('P001');
  expect(c.getSnapshot().pending?.args.quantity).toBe(2);
});
it('clearing selection invalidates an in-flight estimate', async () => {
  const { c, bridge } = setup();
  await c.receive({ cartId: id }, ok(cart));
  let done!: (v: unknown) => void;
  bridge.call.mockImplementationOnce(
    () =>
      new Promise((r) => {
        done = r;
      }),
  );
  const quote = c.select('P001', true);
  await c.select('P001', false);
  done(ok(order.summary));
  await quote;
  expect(c.getSnapshot().quote).toBeNull();
});
it('another mounted card cannot overwrite an unresolved original request', async () => {
  const shared = memory(),
    a = setup('get_cart', shared),
    b = setup('get_cart', shared);
  await a.c.receive({ cartId: id }, ok(cart));
  await b.c.receive({ cartId: id }, ok(cart));
  await a.c.select('P001', true);
  await b.c.select('P001', true);
  a.bridge.call.mockRejectedValueOnce(Error('lost'));
  await a.c.checkout();
  const original = shared.getItem('store.apps.pending.' + id);
  await b.c.checkout();
  expect(
    b.bridge.call.mock.calls.filter((x) => x[0] === 'apps_create_order'),
  ).toHaveLength(0);
  expect(shared.getItem('store.apps.pending.' + id)).toBe(original);
});
it('saving one row preserves other quantity drafts', async () => {
  const { c, bridge } = setup();
  const two = {
    ...cart,
    items: [...cart.items, { ...cart.items[0], productId: 'P002' }],
  };
  bridge.call.mockResolvedValueOnce(ok(two));
  await c.receive({ cartId: id }, ok(two));
  c.change('P001', '2');
  c.change('P002', '3');
  bridge.call.mockResolvedValueOnce(
    ok({
      ...two,
      cartVersion: 2,
      items: two.items.map((i) =>
        i.productId === 'P001' ? { ...i, quantity: 2 } : i,
      ),
    }),
  );
  await c.save('P001');
  expect(c.getSnapshot().draft).toEqual({ P002: '3' });
  expect(c.getSnapshot().dirty).toBe(true);
});
it('corrupted persisted request remains blocked after a fresh read', async () => {
  const { c, bridge, storage } = setup();
  storage.setItem('store.apps.pending.' + id, '{bad');
  await c.receive({ cartId: id }, ok(cart));
  expect(c.getSnapshot().needsRefresh).toBe(true);
  await c.select('P001', true);
  await c.checkout();
  expect(bridge.call.mock.calls.some((x) => x[0] === 'apps_create_order')).toBe(
    false,
  );
  expect(storage.getItem('store.apps.pending.' + id)).toBe('{bad');
});
it('remounted cart card reads its original created order even after payment', async () => {
  const { c, bridge, storage } = setup();
  await c.receive({ cartId: id }, ok(cart));
  await c.select('P001', true);
  bridge.call.mockResolvedValueOnce(
    ok({ order, cart: { ...cart, cartVersion: 2, items: [] } }),
  );
  await c.checkout();
  c.dispose();
  const next = setup('get_cart', storage);
  const paid = {
    ...order,
    status: 'PAID',
    effectiveStatus: 'PAID',
    paidAt: '2026-01-01T00:01:00.000Z',
    allowedActions: { canPay: false, canCancel: false },
  };
  next.bridge.call.mockImplementation(async (name) =>
    ok(name === 'get_order' ? paid : cart),
  );
  await next.c.receive({ cartId: id }, ok(cart));
  expect(next.c.getSnapshot().order?.status).toBe('PAID');
  expect(next.bridge.call.mock.calls.map((x) => x[0])).toEqual(['get_order']);
});

it('each original card restores its own order rather than the last order on a shared cart', async () => {
  const storage = memory();
  const a = setup('get_cart', storage, 'card-A'),
    b = setup('get_cart', storage, 'card-B');
  const other = { ...order, orderId: '20000000-0000-4000-8000-000000000002' };
  for (const [ctx, o] of [
    [a, order],
    [b, other],
  ] as const) {
    await ctx.c.receive({ cartId: id }, ok(cart));
    await ctx.c.select('P001', true);
    ctx.bridge.call.mockResolvedValueOnce(
      ok({ order: o, cart: { ...cart, cartVersion: 2, items: [] } }),
    );
    await ctx.c.checkout();
    ctx.c.dispose();
  }
  for (const [cardId, o] of [
    ['card-A', order],
    ['card-B', other],
  ] as const) {
    const next = setup('get_cart', storage, cardId);
    next.bridge.call.mockImplementation(async (name, args) => {
      expect(name).toBe('get_order');
      expect(args.orderId).toBe(o.orderId);
      return ok(o);
    });
    await next.c.receive({ cartId: id }, ok(cart));
    expect(next.c.getSnapshot().order?.orderId).toBe(o.orderId);
  }
});
it('conflicting committed terminals preserve known fact and make one bounded recheck', async () => {
  const { c, bridge } = setup('get_order');
  const paid = {
    ...order,
    status: 'PAID',
    effectiveStatus: 'PAID',
    paidAt: '2026-01-01T00:01:00.000Z',
    allowedActions: { canPay: false, canCancel: false },
  };
  bridge.call.mockResolvedValueOnce(ok(paid));
  await c.receive({ orderId: oid }, ok(order));
  const closed = {
    ...order,
    effectiveStatus: 'CANCELLED',
    closedAt: '2026-01-01T00:02:00.000Z',
    closeReason: 'CANCELLED',
    allowedActions: { canPay: false, canCancel: false },
  };
  bridge.call.mockResolvedValue(ok(closed));
  await c.reload();
  expect(c.getSnapshot().order?.status).toBe('PAID');
  expect(c.getSnapshot().needsRefresh).toBe(true);
  expect(bridge.call).toHaveBeenCalledTimes(3);
});
it('pending request with a mismatched order target is blocked before payment', async () => {
  const { c, bridge, storage } = setup('get_order');
  storage.setItem(
    'store.apps.pending.' + oid,
    JSON.stringify({
      name: 'apps_pay_order',
      target: oid,
      args: { orderId: '20000000-0000-4000-8000-000000000002' },
    }),
  );
  await c.receive({ orderId: oid }, ok(order));
  await c.retry();
  expect(bridge.call.mock.calls.some((x) => x[0] === 'apps_pay_order')).toBe(
    false,
  );
  expect(c.getSnapshot().needsRefresh).toBe(true);
});
it('product card consultation is read-only and its UI-created order survives remount', async () => {
  const product = {
    id: 'P001',
    name: '耳機',
    brand: 'Brand',
    category: 'Audio',
    currency: 'TWD',
    price: '10.00',
    imagePath: null,
    availability: { canPurchase: true, reasons: [], currentQuantity: 10 },
    description: 'Public',
    specs: { color: '黑' },
    reviewOverview: { count: 0 },
  };
  const { c, bridge, storage } = setup('get_product');
  await c.receive({ productId: 'P001' }, ok(product));
  expect(bridge.call).not.toHaveBeenCalled();
  bridge.call.mockResolvedValueOnce(ok(cart));
  await c.add('P001');
  await c.select('P001', true);
  bridge.call.mockResolvedValueOnce(
    ok({ order, cart: { ...cart, cartVersion: 2, items: [] } }),
  );
  await c.checkout();
  const next = setup('get_product', storage);
  await next.c.receive({ productId: 'P001' }, ok(product));
  expect(next.c.getSnapshot().order?.orderId).toBe(oid);
  expect(next.bridge.call.mock.calls.map((x) => x[0])).toEqual(['get_order']);
});
it('foreground return during a write recalibrates after the response settles', async () => {
  const { c, bridge } = setup();
  await c.receive({ cartId: id }, ok(cart));
  c.change('P001', '2');
  let done!: (v: unknown) => void;
  bridge.call.mockImplementationOnce(
    () =>
      new Promise((r) => {
        done = r;
      }),
  );
  const save = c.save('P001');
  await c.foreground();
  const newer = {
    ...cart,
    cartVersion: 3,
    items: [{ ...cart.items[0], quantity: 3 }],
  };
  bridge.call.mockResolvedValueOnce(ok(newer));
  done(
    ok({ ...cart, cartVersion: 2, items: [{ ...cart.items[0], quantity: 2 }] }),
  );
  await save;
  expect(c.getSnapshot().cart?.cartVersion).toBe(3);
});
it('failure to persist returned order location retains the original creation request', async () => {
  const base = memory();
  const storage: Storage = {
    ...base,
    setItem: (k, v) => {
      if (k.startsWith('store.apps.created.')) throw Error('quota');
      base.setItem(k, v);
    },
  };
  const { c, bridge } = setup('get_cart', storage);
  await c.receive({ cartId: id }, ok(cart));
  await c.select('P001', true);
  bridge.call.mockResolvedValueOnce(
    ok({ order, cart: { ...cart, cartVersion: 2, items: [] } }),
  );
  await c.checkout();
  expect(storage.getItem('store.apps.pending.' + id)).not.toBeNull();
  expect(c.getSnapshot().pending?.name).toBe('apps_create_order');
});
