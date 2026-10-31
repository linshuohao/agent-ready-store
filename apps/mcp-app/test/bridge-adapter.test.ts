import { describe, it, expect, vi } from 'vitest';
import {
  toolDeliveryContext,
  bridgeTransport,
  toolRoute,
  validateShare,
  migrateRecovery,
  type Bridge,
} from '../src/bridge-adapter';
import {
  CartCommands,
  createCartOrder,
  readCart,
  quoteCart,
  readOrders,
  pendingOrderKey,
} from '@store/commerce-ui/features/cart/lifecycle-commands';
import { OrderCommands } from '@store/commerce-ui/features/checkout/order-commands';
import type { Storage } from '@store/commerce-ui/transport';
import type { ShoppingCartView, OrderView } from '@store/contracts';
const id = '10000000-0000-4000-8000-000000000001',
  oid = '20000000-0000-4000-8000-000000000001';
const cart: ShoppingCartView = {
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
const order: OrderView = {
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

function setup() {
  const call = vi.fn<Bridge['call']>(async (name) =>
    ok(
      name === 'get_order' ||
        name === 'apps_pay_order' ||
        name === 'cancel_order'
        ? order
        : name === 'quote_selection'
          ? order.summary
          : name === 'list_orders'
            ? { items: [order], nextOffset: null }
            : name === 'apps_create_order'
              ? { order, cart }
              : { ...cart },
    ),
  );
  const bridge = { call, open: vi.fn(async () => ({})) };
  return { call, transport: bridgeTransport(bridge), storage: memory() };
}
describe('Apps protocol adapter with the shared shopping application', () => {
  it('reads carts, quotes and lists through Bridge with complete parameters', async () => {
    const { call, transport } = setup();
    expect((await readCart(id, transport)).kind).toBe('success');
    await quoteCart(
      id,
      [{ productId: 'P001', expectedQuantity: 1 }],
      transport,
    );
    await readOrders(id, 20, 10, true, transport);
    expect(call.mock.calls).toEqual([
      ['get_cart', { cartId: id }],
      [
        'quote_selection',
        {
          cartId: id,
          selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
          constraints: { currency: 'TWD' },
        },
      ],
      ['list_orders', { cartId: id, offset: 20, limit: 10, pendingOnly: true }],
    ]);
  });
  it('shared cart operations translate without changing request keys or version', async () => {
    const { call, transport, storage } = setup(),
      commands = new CartCommands(storage, transport);
    const operationRequestId = crypto.randomUUID();
    await commands.operate(id, {
      operationRequestId,
      expectedCartVersion: 1,
      operation: { type: 'set_quantity', productId: 'P001', quantity: 2 },
    });
    expect(call).toHaveBeenCalledWith('update_cart_item', {
      cartId: id,
      operationRequestId,
      expectedCartVersion: 1,
      productId: 'P001',
      quantity: 2,
    });
  });
  it('shared initialization uses the APPS entry and never a Web endpoint', async () => {
    const { call, transport, storage } = setup();
    const input = {
      requestId: crypto.randomUUID(),
      initialItems: [{ productId: 'P001', quantity: 1 }],
    };
    expect(
      (await new CartCommands(storage, transport).initialize(input)).kind,
    ).toBe('success');
    expect(call).toHaveBeenCalledWith('apps_get_or_create_cart', input);
  });
  it('unknown creation persists the original request before Bridge and restores it after remount', async () => {
    const { call, transport, storage } = setup();
    const input = {
      requestId: crypto.randomUUID(),
      expectedCartVersion: 1,
      selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
      constraints: { currency: 'TWD' as const },
    };
    call.mockImplementationOnce(async () => {
      expect(storage.getItem(pendingOrderKey(id))).not.toBeNull();
      throw Error('lost');
    });
    expect(
      (await createCartOrder(storage, id, input, undefined, transport)).kind,
    ).toBe('unknown');
    const payload = call.mock.calls[0][1];
    expect(
      (await createCartOrder(storage, id, undefined, undefined, transport))
        .kind,
    ).toBe('success');
    expect(call.mock.calls[1]).toEqual(['apps_create_order', payload]);
    expect(storage.getItem(pendingOrderKey(id))).toBeNull();
  });
  it('UI pay uses apps_pay_order; a remount reads the original order without paying again', async () => {
    const { call, transport, storage } = setup();
    call.mockImplementation(async (name) =>
      ok(
        name === 'apps_pay_order'
          ? {
              ...order,
              status: 'PAID',
              effectiveStatus: 'PAID',
              paidAt: '2026-01-01T00:01:00.000Z',
              allowedActions: { canPay: false, canCancel: false },
            }
          : order,
      ),
    );
    const commands = new OrderCommands(storage, transport);
    await commands.read(oid);
    await commands.act(oid, 'pay');
    expect(commands.snapshot(oid).order?.status).toBe('PAID');
    await new OrderCommands(storage, transport).read(oid);
    expect(
      call.mock.calls.filter((c) => c[0] === 'apps_pay_order'),
    ).toHaveLength(1);
    expect(call.mock.calls.filter((c) => c[0] === 'get_order')).toHaveLength(2);
  });
  it('wrong-entity results are rejected by shared response validation', async () => {
    const { call, transport } = setup();
    call.mockResolvedValue(
      ok({ ...cart, cartId: '10000000-0000-4000-8000-000000000002' }),
    );
    expect((await readCart(id, transport)).kind).toBe('unknown');
  });
  it('known errors remain actionable and malformed envelopes are unknown', async () => {
    const { call, transport } = setup();
    call.mockResolvedValueOnce({
      isError: true,
      structuredContent: {
        ok: false,
        error: { code: 'CART_VERSION_CONFLICT' },
      },
    });
    expect(await readCart(id, transport)).toEqual({
      kind: 'failure',
      error: { code: 'CART_VERSION_CONFLICT' },
    });
    call.mockResolvedValueOnce({
      structuredContent: { ok: true, data: null },
      isError: true,
    });
    expect((await readCart(id, transport)).kind).toBe('unknown');
  });
  it('delivery selects the original shared route and never invokes writes', () => {
    expect(toolRoute('get_cart', { cartId: id }, ok(cart))).toBe('/cart/' + id);
    expect(toolRoute('get_order', { orderId: oid }, ok(order))).toBe(
      '/orders/' + oid,
    );
    expect(() => toolRoute('get_order', { orderId: id }, ok(order))).toThrow(
      'WRONG_ENTITY',
    );
    expect(() => toolRoute('get_cart', { cartId: oid }, ok(cart))).toThrow(
      'WRONG_ENTITY',
    );
  });
  it('share accepts only the configured origin and exact single-order share path', () => {
    const url = order.navigation.shareUrl;
    expect(validateShare(url, 'http://localhost:3000')).toBe(url);
    for (const bad of [
      url.replace('localhost', 'evil.example'),
      url + '&other=1',
      url + '#token',
      url.replace('?view=share', ''),
      url.replace('/orders/', '/cart/'),
    ])
      expect(() => validateShare(bad, 'http://localhost:3000')).toThrow();
  });
  it('rejects any non-adapter request without calling tools or website HTTP', async () => {
    const { call, transport } = setup();
    await expect(
      transport('https://evil.example/api/v1/products'),
    ).rejects.toThrow();
    await expect(
      transport('/api/v1/shopping/orders/' + oid + '/refund', {}),
    ).rejects.toThrow();
    expect(call).not.toHaveBeenCalled();
  });
  it('migrates old unknown payment materials without reissuing payment', () => {
    const storage = memory();
    storage.setItem('store.apps.currentCartId', id);
    storage.setItem(
      'store.apps.pending.' + oid,
      JSON.stringify({
        name: 'apps_pay_order',
        args: { orderId: oid },
        target: oid,
      }),
    );
    migrateRecovery(storage, '/orders/' + oid);
    expect(storage.getItem('store.currentCartId')).toBe(id);
    expect(JSON.parse(storage.getItem('store.order.pending.' + oid)!)).toEqual({
      orderId: oid,
      action: 'pay',
    });
  });
  it('does not overwrite conflicting recovery materials', () => {
    const storage = memory();
    storage.setItem('store.order.pending.' + oid, 'existing');
    const raw = JSON.stringify({
      name: 'apps_pay_order',
      args: { orderId: oid },
      target: oid,
    });
    storage.setItem('store.apps.pending.' + oid, raw);
    expect(() => migrateRecovery(storage, '/orders/' + oid)).toThrow(
      'LOCAL_RECOVERY_INVALID',
    );
    expect(storage.getItem('store.apps.pending.' + oid)).toBe(raw);
    expect(storage.getItem('store.order.pending.' + oid)).toBe('existing');
  });
});

it('temporary tool errors preserve the original creation key', async () => {
  const { call, transport, storage } = setup();
  const input = {
    requestId: crypto.randomUUID(),
    expectedCartVersion: 1,
    selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' as const },
  };
  call.mockResolvedValueOnce({
    isError: true,
    structuredContent: { ok: false, error: { code: 'TEMPORARY_UNAVAILABLE' } },
  });
  expect(
    (await createCartOrder(storage, id, input, undefined, transport)).kind,
  ).toBe('unknown');
  expect(storage.getItem(pendingOrderKey(id))).not.toBeNull();
  await createCartOrder(storage, id, undefined, undefined, transport);
  expect(call.mock.calls[1]).toEqual(call.mock.calls[0]);
});
it('share is bound to the expected order ID', () => {
  expect(() =>
    validateShare(order.navigation.shareUrl, 'http://localhost:3000', id),
  ).toThrow('UNSAFE_LINK');
});

it('old product-card unknown initialization is migrated with the original request key', () => {
  const storage = memory(),
    target = 'catalog:get_product:' + JSON.stringify({ productId: 'P001' });
  const args = {
    requestId: crypto.randomUUID(),
    initialItems: [{ productId: 'P001', quantity: 1 }],
  };
  storage.setItem(
    'store.apps.pending.' + target,
    JSON.stringify({ name: 'apps_get_or_create_cart', target, args }),
  );
  const product = {
    id: 'P001',
    name: 'A',
    brand: 'B',
    category: 'C',
    currency: 'TWD',
    price: '10.00',
    imagePath: null,
    availability: { canPurchase: true, reasons: [], currentQuantity: 1 },
    description: 'A',
    specs: {},
    reviewOverview: { count: 0 },
  };
  const context = toolDeliveryContext(
    'get_product',
    { productId: 'P001' },
    ok(product),
    storage,
    'call-1',
  );
  expect(context.route).toBe('/products/P001');
  expect(JSON.parse(storage.getItem('store.cart.initialize')!)).toEqual({
    kind: 'initialize',
    input: args,
  });
});
it('old card mappings and new persisted routes restore the original order', () => {
  const storage = memory();
  storage.setItem('store.apps.created.get_cart.string:call-1.' + id, oid);
  const context = toolDeliveryContext(
    'get_cart',
    { cartId: id },
    ok(cart),
    storage,
    'call-1',
  );
  expect(context.route).toBe('/orders/' + oid);
  storage.setItem(context.key!, '/orders?cartId=' + id);
  expect(
    toolDeliveryContext('get_cart', { cartId: id }, ok(cart), storage, 'call-1')
      .route,
  ).toBe('/orders?cartId=' + id);
});

it('card catalog reads use the data-only query tool without a new search UI entry', async () => {
  const data = {
    items: [],
    total: 0,
    nextOffset: null,
    catalogRevision: 'fixture',
  };
  const call = vi.fn(async () => ({ structuredContent: { ok: true, data } }));
  const transport = bridgeTransport({ call, open: async () => ({}) });
  expect(
    await (await transport('/api/v1/products?q=earbuds&limit=2')).json(),
  ).toMatchObject({ ok: true, data });
  expect(call).toHaveBeenCalledWith(
    'query_products',
    expect.objectContaining({ q: 'earbuds', limit: 2 }),
  );
});

describe('grouped search bridge', () => {
  const query = {
    id: 'audio',
    q: '蓝牙',
    offset: 0,
    limit: 4,
    purchasableOnly: false,
    sort: 'recommendation',
  };
  const data = {
    kind: 'grouped',
    catalogRevision: 'catalog',
    searchRevision: 'rules',
    groups: [
      {
        id: 'audio',
        label: '蓝牙',
        query,
        status: 'empty',
        productIds: [],
        total: 0,
        nextOffset: null,
      },
    ],
    products: [],
  };
  const delivery = { structuredContent: { ok: true, data } };
  it('routes a grouped delivery and fetches via background query without extra UI', async () => {
    const route = toolRoute(
      'search_products',
      { queries: [{ id: 'audio', q: '蓝牙' }] },
      delivery,
    );
    expect(route.startsWith('/search?')).toBe(true);
    const call = vi.fn(async () => delivery);
    const response = await bridgeTransport({ call, open: async () => ({}) })(
      '/api/v1/products/search',
      { queries: [{ id: 'audio', q: '蓝牙' }] },
    );
    expect((await response.json()).data).toEqual(data);
    expect(call.mock.calls[0][0]).toBe('query_products');
  });
  it('rejects missing references and unknown result kinds', () => {
    expect(() =>
      toolRoute(
        'search_products',
        { queries: [{ id: 'audio' }] },
        { structuredContent: { ok: true, data: { ...data, kind: 'future' } } },
      ),
    ).toThrow();
    expect(() =>
      toolRoute(
        'search_products',
        { queries: [{ id: 'audio' }] },
        {
          structuredContent: {
            ok: true,
            data: {
              ...data,
              groups: [
                {
                  ...data.groups[0],
                  status: 'ok',
                  total: 1,
                  productIds: ['missing'],
                },
              ],
            },
          },
        },
      ),
    ).toThrow();
  });
});

it('isolates identical grouped searches by Host tool call ID', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const input = { queries: [{ id: 'a' }] };
  const query = {
    id: 'a',
    q: '',
    offset: 0,
    limit: 4,
    purchasableOnly: false,
    sort: 'recommendation',
  };
  const raw = {
    structuredContent: {
      ok: true,
      data: {
        kind: 'grouped',
        catalogRevision: 'c',
        searchRevision: 's',
        groups: [
          {
            id: 'a',
            label: '全部商品',
            query,
            status: 'empty',
            productIds: [],
            total: 0,
            nextOffset: null,
          },
        ],
        products: [],
      },
    },
  };
  const a = toolDeliveryContext(
    'search_products',
    input,
    raw,
    storage,
    'call-a',
  );
  const b = toolDeliveryContext(
    'search_products',
    input,
    raw,
    storage,
    'call-b',
  );
  expect(a.route).not.toBe(b.route);
  expect(
    toolDeliveryContext('search_products', input, raw, storage, 'call-a').route,
  ).toBe(a.route);
});
