import { describe, it, expect, vi } from 'vitest';
import { StoreController, validateHandoff } from '../src/controller';
import type { CartView } from '@store/contracts';
const id = '10000000-0000-4000-8000-000000000001';
const token = 'A'.repeat(43);
const cap = { cartId: id, cartAccessToken: token };
const cart = (version = 1, overrides: Partial<CartView> = {}): CartView => ({
  cartId: id,
  origin: 'AGENT',
  cartVersion: version,
  orderId: null,
  items: [
    {
      productId: 'P001',
      quantity: 1,
      name: '耳機',
      unitPrice: '10.00',
      availability: { canPurchase: true, reasons: [], currentQuantity: 8 },
    },
  ],
  quote: {
    currency: 'TWD',
    items: [
      {
        productId: 'P001',
        quantity: 1,
        name: '耳機',
        unitPrice: '10.00',
        lineSubtotal: '10.00',
      },
    ],
    subtotal: '10.00',
    thresholdDiscount: '0.00',
    aiDiscount: '0.00',
    shipping: '0.00',
    total: '10.00',
  },
  quoteHash: 'a'.repeat(64),
  issues: [],
  canCheckout: true,
  expiresAt: '2099-01-01T00:00:00.000Z',
  ...overrides,
});
const ok = (data: unknown) => ({
  structuredContent: { ok: true, data, requestId: 'test' },
});
const deferred = () => {
  let resolve!: (v: unknown) => void;
  const promise = new Promise<unknown>((r) => (resolve = r));
  return { promise, resolve };
};
function setup() {
  const bridge = {
    call: vi.fn(async (name?: string) =>
      name === 'get_purchase_status'
        ? ok(purchase())
        : ok({ cart: cart(), order: null }),
    ),
    open: vi.fn(async () => ({ isError: false })),
    canOpen: () => true,
  };
  const c = new StoreController('get_cart', bridge, 'http://localhost:3000');
  return { c, bridge };
}
async function ready() {
  const s = setup();
  await s.c.receive(cap, ok({ cart: cart(), order: null }));
  return s;
}
describe('Apps cart coordination', () => {
  it('calibrates from complete input without toolInfo and keeps capability outside public state', async () => {
    const { c, bridge } = await ready();
    expect(bridge.call).toHaveBeenCalledWith('get_cart', cap);
    expect(c.getSnapshot().cart?.cartVersion).toBe(1);
    expect(JSON.stringify(c.getSnapshot())).not.toContain(token);
  });
  it('missing input stays read-only; mismatched cart or toolInfo grants no authority', async () => {
    const { c, bridge } = setup();
    await c.receive(undefined, ok({ cart: cart(), order: null }));
    expect(c.getSnapshot().editable).toBe(false);
    expect(bridge.call).not.toHaveBeenCalled();
    await c.receive(
      { ...cap, cartId: '10000000-0000-4000-8000-000000000002' },
      ok({ cart: cart(), order: null }),
    );
    expect(c.getSnapshot().editable).toBe(false);
    await c.receive(cap, ok({ cart: cart(), order: null }), 'update_cart');
    expect(c.getSnapshot().editable).toBe(false);
  });
  it('saves an explicit full draft at the accepted version, including empty carts', async () => {
    const { c, bridge } = await ready();
    c.change('P001', '2');
    bridge.call.mockImplementation(async () => ok(cart(2)));
    await c.save();
    expect(bridge.call).toHaveBeenLastCalledWith('update_cart', {
      ...cap,
      expectedCartVersion: 1,
      items: [{ productId: 'P001', quantity: 2 }],
    });
    c.remove('P001');
    bridge.call.mockImplementation(async () =>
      ok(cart(3, { items: [], quote: null, canCheckout: false })),
    );
    await c.save();
    expect(bridge.call).toHaveBeenLastCalledWith('update_cart', {
      ...cap,
      expectedCartVersion: 2,
      items: [],
    });
    expect(c.getSnapshot().cart?.items).toEqual([]);
  });
  it('rejects invalid quantities without calling the server', async () => {
    const { c, bridge } = await ready();
    for (const v of ['0', '-1', '1.5', '', '2147483648']) {
      c.change('P001', v);
      await c.save();
    }
    expect(bridge.call).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().dirty).toBe(true);
  });
  it('blocks both handlers and controls synchronously while reloading', async () => {
    const { c, bridge } = await ready();
    c.change('P001', '2');
    await c.reload(false);
    expect(bridge.call).toHaveBeenCalledTimes(1);
    const d = deferred();
    bridge.call.mockImplementation(() => d.promise);
    const p = c.reload(true);
    expect(c.getSnapshot().busy).toBe(true);
    c.change('P001', '3');
    c.remove('P001');
    await c.save();
    await c.share();
    await c.reload(true);
    expect(c.getSnapshot().dirty).toBe(false);
    expect(bridge.call).toHaveBeenCalledTimes(2);
    d.resolve(ok({ cart: cart(2), order: null }));
    await p;
    expect(c.getSnapshot().cart?.cartVersion).toBe(2);
  });
  it('unknown save and conflict require explicit refresh and do not replay', async () => {
    const { c, bridge } = await ready();
    c.change('P001', '2');
    bridge.call.mockRejectedValueOnce(new Error('secret request lost'));
    await c.save();
    expect(c.getSnapshot().needsRefresh).toBe(true);
    expect(c.getSnapshot().message).not.toContain('secret');
    await c.save();
    await c.share();
    expect(bridge.call).toHaveBeenCalledTimes(2);
    bridge.call.mockImplementation(async () =>
      ok({ cart: cart(2), order: null }),
    );
    await c.reload(true);
    expect(c.getSnapshot().needsRefresh).toBe(false);
    c.change('P001', '3');
    bridge.call.mockImplementation(async () => ({
      structuredContent: {
        ok: false,
        error: { code: 'CART_VERSION_CONFLICT' },
      },
    }));
    await c.save();
    expect(c.getSnapshot().needsRefresh).toBe(true);
  });
  it('protects draft against host snapshots and refuses lower versions', async () => {
    const { c, bridge } = await ready();
    c.change('P001', '2');
    await c.receive(cap, ok({ cart: cart(2), order: null }));
    expect(c.getSnapshot().draft?.[0].quantity).toBe('2');
    expect(c.getSnapshot().needsRefresh).toBe(true);
    bridge.call.mockImplementation(async () =>
      ok({ cart: cart(3), order: null }),
    );
    await c.reload(true);
    bridge.call.mockImplementation(async () =>
      ok({ cart: cart(1), order: null }),
    );
    await c.reload(true);
    expect(c.getSnapshot().cart?.cartVersion).toBe(3);
    expect(c.getSnapshot().needsRefresh).toBe(true);
  });
  it('keeps checkout busy through calibration and handoff, denies input and validates the returned URL', async () => {
    const { c, bridge } = await ready();
    const read = deferred(),
      handoff = deferred();
    bridge.call
      .mockImplementationOnce(() => read.promise)
      .mockImplementationOnce(() => handoff.promise);
    const p = c.share();
    c.change('P001', '8');
    expect(c.getSnapshot().dirty).toBe(false);
    read.resolve(ok({ cart: cart(2), order: null }));
    await vi.waitFor(() => expect(bridge.call).toHaveBeenCalledTimes(3));
    c.remove('P001');
    await c.save();
    expect(c.getSnapshot().dirty).toBe(false);
    handoff.resolve(
      ok({
        cart: cart(2),
        handoff: {
          url: `http://localhost:3000/checkout/${id}#handoff=${token}`,
          issuedAt: '2026-10-30T00:00:00.000Z',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
        requiresHumanConfirmation: true,
      }),
    );
    await p;
    expect(bridge.open).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(c.getSnapshot())).not.toContain(token);
    expect(c.getSnapshot().message).toContain('若未開啟');
  });
  it('does not open a late handoff after teardown', async () => {
    const { c, bridge } = await ready();
    const d = deferred();
    bridge.call
      .mockImplementationOnce(async () => ok({ cart: cart(2), order: null }))
      .mockImplementationOnce(() => d.promise);
    const p = c.share();
    await vi.waitFor(() => expect(bridge.call).toHaveBeenCalledTimes(3));
    c.dispose();
    d.resolve(
      ok({
        cart: cart(2),
        handoff: {
          url: `http://localhost:3000/checkout/${id}#handoff=${token}`,
          issuedAt: '2026-10-30T00:00:00.000Z',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
        requiresHumanConfirmation: true,
      }),
    );
    await p;
    expect(bridge.open).not.toHaveBeenCalled();
    expect(c.getSnapshot().editable).toBe(false);
  });
  it('blocks malicious handoff URL, explicit host denial, and non-checkoutable calibration', async () => {
    const { c, bridge } = await ready();
    bridge.call
      .mockImplementationOnce(async () => ok({ cart: cart(2), order: null }))
      .mockImplementationOnce(async () =>
        ok({
          cart: cart(2),
          handoff: {
            url: 'https://evil.example/',
            issuedAt: '2026-10-30T00:00:00.000Z',
            expiresAt: '2099-01-01T00:00:00.000Z',
          },
          requiresHumanConfirmation: true,
        }),
      );
    await c.share();
    expect(bridge.open).not.toHaveBeenCalled();
    bridge.call.mockImplementation(async () =>
      ok({
        cart: cart(3, {
          canCheckout: false,
          issues: [{ productId: 'P001', code: 'SOLD_OUT' }],
        }),
        order: null,
      }),
    );
    await c.share();
    expect(bridge.open).not.toHaveBeenCalled();
  });
});

describe('Apps authority and asynchronous boundaries', () => {
  it('old reads cannot unlock a newly selected cart', async () => {
    const { c, bridge } = await ready();
    const old = deferred(),
      next = deferred();
    bridge.call
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => next.promise);
    const first = c.reload(true);
    const other = '10000000-0000-4000-8000-000000000002';
    const second = c.receive(
      { ...cap, cartId: other },
      ok({ cart: cart(1, { cartId: other }), order: null }),
    );
    old.resolve(ok({ cart: cart(9), order: null }));
    await first;
    expect(c.getSnapshot().busy).toBe(true);
    expect(c.getSnapshot().cart?.cartId).toBe(other);
    next.resolve(ok({ cart: cart(2, { cartId: other }), order: null }));
    await second;
    expect(c.getSnapshot().cart?.cartVersion).toBe(2);
    expect(c.getSnapshot().busy).toBe(false);
  });
  it('a host snapshot invalidates a pending save; late success cannot clear refresh', async () => {
    const { c, bridge } = await ready();
    c.change('P001', '2');
    const d = deferred();
    bridge.call.mockImplementationOnce(() => d.promise);
    const saving = c.save();
    await c.receive(cap, ok({ cart: cart(3), order: null }));
    d.resolve(ok(cart(2)));
    await saving;
    expect(c.getSnapshot().needsRefresh).toBe(true);
    expect(c.getSnapshot().draft?.[0].quantity).toBe('2');
  });
  it('handles host refusal and unsupported external links without claiming navigation', async () => {
    const { c, bridge } = await ready();
    bridge.canOpen = () => false;
    await c.share();
    expect(bridge.call).toHaveBeenCalledTimes(1);
    bridge.canOpen = () => true;
    bridge.call
      .mockImplementationOnce(async () => ok({ cart: cart(2), order: null }))
      .mockImplementationOnce(async () =>
        ok({
          cart: cart(2),
          handoff: {
            url: `http://localhost:3000/checkout/${id}#handoff=${token}`,
            issuedAt: '2026-10-30T00:00:00.000Z',
            expiresAt: '2099-01-01T00:00:00.000Z',
          },
          requiresHumanConfirmation: true,
        }),
      );
    bridge.open.mockResolvedValue({ isError: true });
    await c.share();
    expect(c.getSnapshot().message).toContain('拒絕');
  });
  it('rejects expired authority and completed carts without writes', async () => {
    const { c, bridge } = setup();
    bridge.call.mockImplementation(async () =>
      ok({
        cart: cart(2, { expiresAt: '2020-01-01T00:00:00.000Z' }),
        order: null,
      }),
    );
    await c.receive(cap, ok({ cart: cart(), order: null }));
    c.change('P001', '2');
    await c.save();
    await c.share();
    expect(c.getSnapshot().editable).toBe(false);
    expect(bridge.call).toHaveBeenCalledTimes(1);
  });
  it('new controller cannot restore authority from public snapshot', async () => {
    const { c } = await ready();
    const { c: newView, bridge } = setup();
    await newView.receive(
      undefined,
      ok({ cart: c.getSnapshot().cart, order: null }),
    );
    await newView.save();
    await newView.share();
    expect(bridge.call).not.toHaveBeenCalled();
  });
});

it.each(['FORBIDDEN', 'CREDENTIAL_EXPIRED'])(
  'drops revoked authority on %s without further reads',
  async (code) => {
    const { c, bridge } = await ready();
    bridge.call.mockImplementation(async () => ({
      structuredContent: { ok: false, error: { code } },
    }));
    await c.reload(true);
    expect(c.getSnapshot().editable).toBe(false);
    await c.reload(true);
    expect(bridge.call).toHaveBeenCalledTimes(2);
  },
);
it('a new cart input clears old authority before its result arrives', async () => {
  const { c, bridge } = await ready();
  c.prepareInput({ ...cap, cartId: '10000000-0000-4000-8000-000000000002' });
  await c.share();
  expect(c.getSnapshot().cart).toBeNull();
  expect(bridge.call).toHaveBeenCalledTimes(1);
});

it('host snapshots cannot clear an existing explicit-refresh requirement', async () => {
  const { c, bridge } = await ready();
  bridge.call.mockRejectedValueOnce(new Error('read response lost'));
  await c.reload(true);
  expect(c.getSnapshot().needsRefresh).toBe(true);
  bridge.call.mockImplementation(async () =>
    ok({ cart: cart(3), order: null }),
  );
  await c.receive(cap, ok({ cart: cart(2), order: null }));
  expect(c.getSnapshot().needsRefresh).toBe(true);
  expect(bridge.call).toHaveBeenCalledTimes(2);
  await c.reload(true);
  expect(c.getSnapshot().needsRefresh).toBe(false);
  expect(c.getSnapshot().cart?.cartVersion).toBe(3);
});

it('valid same-cart input can restore authority after invalid data, but requires explicit refresh', async () => {
  const { c, bridge } = await ready();
  await c.receive(
    { ...cap, cartAccessToken: 'bad' },
    ok({ cart: cart(2), order: null }),
  );
  expect(c.getSnapshot().editable).toBe(false);
  await c.receive(cap, ok({ cart: cart(2), order: null }));
  expect(c.getSnapshot().needsRefresh).toBe(true);
  expect(bridge.call).toHaveBeenCalledTimes(1);
  bridge.call.mockImplementation(async () =>
    ok({ cart: cart(3), order: null }),
  );
  await c.reload(true);
  expect(c.getSnapshot().cart?.cartVersion).toBe(3);
  expect(c.getSnapshot().editable).toBe(true);
  expect(c.getSnapshot().needsRefresh).toBe(false);
});

it('reports an expired handoff and does not open it', async () => {
  const { c, bridge } = await ready();
  bridge.call
    .mockImplementationOnce(async () => ok({ cart: cart(2), order: null }))
    .mockImplementationOnce(async () =>
      ok({
        cart: cart(2),
        handoff: {
          url: `http://localhost:3000/checkout/${id}#handoff=${token}`,
          issuedAt: '2020-01-01T00:00:00.000Z',
          expiresAt: '2020-01-02T00:00:00.000Z',
        },
        requiresHumanConfirmation: true,
      }),
    );
  await c.share();
  expect(bridge.open).not.toHaveBeenCalled();
  expect(c.getSnapshot().message).toContain('到期');
});

it.each([
  'https://evil.example/checkout/',
  `http://user@localhost:3000/checkout/${id}#handoff=${token}`,
  `http://localhost:3000/checkout/${id}?copy=1#handoff=${token}`,
  `http://localhost:3000/checkout/${id}#handoff=${token}&extra=1`,
  `http://localhost:3000/checkout/10000000-0000-4000-8000-000000000002#handoff=${token}`,
  'javascript:alert(1)',
])('rejects an unsafe handoff variant without exposing it', (url) => {
  expect(() =>
    validateHandoff(url, 'http://localhost:3000', id, token),
  ).toThrow();
});

it('shows the original completed order and never offers another write or checkout', async () => {
  const { c, bridge } = setup();
  const saved = cart(2, {
    orderId: '10000000-0000-4000-8000-000000000099',
    canCheckout: false,
  });
  const order = {
    orderId: saved.orderId,
    cartId: id,
    createdAt: '2026-10-30T00:00:00.000Z',
    purchaseHash: 'a'.repeat(64),
    catalogRevision: 'original',
    snapshot: {
      cartId: id,
      cartVersion: 1,
      origin: 'AGENT',
      pricingRuleVersion: 'pricing-v1',
      quote: saved.quote,
      items: [
        {
          productId: 'P001',
          quantity: 1,
          name: '原成交耳機',
          brand: 'Brand',
          specs: { 顏色: '黑' },
          unitPrice: '10.00',
          lineSubtotal: '10.00',
        },
      ],
    },
  };
  bridge.call.mockImplementation(async () => ok({ cart: saved, order }));
  await c.receive(cap, ok({ cart: saved, order }));
  expect(c.getSnapshot().order?.snapshot.items[0].name).toBe('原成交耳機');
  expect(c.getSnapshot().editable).toBe(false);
  c.change('P001', '2');
  await c.save();
  await c.share();
  expect(bridge.call).toHaveBeenCalledTimes(1);
});

const reviewId = '20000000-0000-4000-8000-000000000001';
const purchase = (state = 'pending') => ({
  reviewId,
  cartId: id,
  channel: 'apps',
  state,
  summary: {
    cartId: id,
    cartVersion: 1,
    origin: 'AGENT',
    items: [
      {
        productId: 'P001',
        quantity: 1,
        name: '耳機',
        brand: 'Brand',
        specs: {},
        unitPrice: '10.00',
        lineSubtotal: '10.00',
      },
    ],
    quote: cart().quote,
    pricingRuleVersion: 'pricing-v1',
  },
  expiresAt: cart().expiresAt,
  order: null,
});
const prepared = () => ({
  ...ok(purchase()),
  _meta: {
    purchaseMaterials: {
      payToken: 'private-pay',
      cancelToken: 'private-cancel',
    },
  },
});
describe('Apps embedded purchase', () => {
  it('calibrates then prepares without opening checkout; materials remain private until explicit Human pay', async () => {
    const { c, bridge } = await ready();
    bridge.call
      .mockImplementationOnce(async () => ok({ cart: cart(), order: null }))
      .mockImplementationOnce(async () => prepared());
    await c.checkout();
    expect(bridge.call).toHaveBeenLastCalledWith(
      'prepare_checkout',
      expect.objectContaining({
        ...cap,
        target: 'apps',
        expectedCartVersion: 1,
      }),
    );
    expect(c.getSnapshot().purchase?.reviewId).toBe(reviewId);
    expect(c.getSnapshot().canPay).toBe(true);
    expect(JSON.stringify(c.getSnapshot())).not.toContain('private-');
    expect(bridge.open).not.toHaveBeenCalled();
    expect(bridge.call.mock.calls.some((x) => x[0] === 'pay_purchase')).toBe(
      false,
    );
    bridge.call.mockRejectedValueOnce(new Error('lost response'));
    await c.pay();
    expect(bridge.call).toHaveBeenLastCalledWith('pay_purchase', {
      ...cap,
      reviewId,
      payToken: 'private-pay',
    });
    expect(c.getSnapshot().canPay).toBe(false);
    bridge.call.mockImplementationOnce(async () => ok(purchase()));
    await c.reload();
    expect(bridge.call).toHaveBeenLastCalledWith('get_purchase_status', {
      ...cap,
      reviewId,
    });
    expect(c.getSnapshot().canPay).toBe(false);
  });
  it('initial prepare delivery calibrates before payment but status delivery never grants payment', async () => {
    const { bridge } = setup();
    const c = new StoreController(
      'prepare_checkout',
      bridge,
      'http://localhost:3000',
    );
    await c.receive(
      {
        ...cap,
        prepareRequestId: reviewId,
        expectedCartVersion: 1,
        target: 'apps',
      },
      prepared(),
    );
    expect(c.getSnapshot().canPay).toBe(true);
    expect(bridge.call).toHaveBeenCalledExactlyOnceWith('get_purchase_status', {
      ...cap,
      reviewId,
    });
    const status = new StoreController(
      'get_purchase_status',
      bridge,
      'http://localhost:3000',
    );
    await status.receive({ ...cap, reviewId }, prepared());
    expect(status.getSnapshot().canPay).toBe(false);
    expect(JSON.stringify(c.getSnapshot())).not.toContain('private-');
  });
  it('cancels only by explicit action and sends separate purpose material', async () => {
    const { bridge } = setup();
    const c = new StoreController(
      'prepare_checkout',
      bridge,
      'http://localhost:3000',
    );
    await c.receive(
      {
        ...cap,
        prepareRequestId: reviewId,
        expectedCartVersion: 1,
        target: 'apps',
      },
      prepared(),
    );
    bridge.call.mockImplementationOnce(async () => ok(purchase('cancelled')));
    await c.cancelPurchase();
    expect(bridge.call).toHaveBeenLastCalledWith('cancel_app_purchase', {
      ...cap,
      reviewId,
      cancelToken: 'private-cancel',
    });
    expect(c.getSnapshot().purchase?.state).toBe('cancelled');
    expect(c.getSnapshot().canPay).toBe(false);
  });
});

it('missing prepare metadata recovers with the same request key and never pays automatically', async () => {
  const { bridge } = setup();
  const c = new StoreController(
    'prepare_checkout',
    bridge,
    'http://localhost:3000',
  );
  const input = {
    ...cap,
    prepareRequestId: reviewId,
    expectedCartVersion: 1,
    target: 'apps',
  };
  await c.receive(input, ok(purchase()));
  expect(c.getSnapshot().canPay).toBe(false);
  expect(c.getSnapshot().canRecover).toBe(true);
  bridge.call.mockImplementationOnce(async () => prepared());
  await c.recoverPurchase();
  expect(bridge.call.mock.calls).toEqual([
    ['get_purchase_status', { ...cap, reviewId }],
    ['prepare_checkout', input],
  ]);
  expect(c.getSnapshot().canPay).toBe(true);
});
it('unknown preparation retains its key even after a cart reload', async () => {
  const { c, bridge } = await ready();
  bridge.call
    .mockImplementationOnce(async () => ok({ cart: cart(), order: null }))
    .mockRejectedValueOnce(new Error('lost'));
  await c.checkout();
  const args = bridge.call.mock.calls.at(-1)![1];
  bridge.call.mockImplementationOnce(async () =>
    ok({ cart: cart(), order: null }),
  );
  await c.reload();
  const count = bridge.call.mock.calls.length;
  await c.checkout();
  expect(bridge.call).toHaveBeenCalledTimes(count);
  bridge.call.mockImplementationOnce(async () => prepared());
  await c.recoverPurchase();
  expect(bridge.call).toHaveBeenLastCalledWith('prepare_checkout', args);
});
it('a late prepare cannot grant payment after the Host selects another cart', async () => {
  const { c, bridge } = await ready();
  const pending = deferred();
  bridge.call
    .mockImplementationOnce(async () => ok({ cart: cart(), order: null }))
    .mockImplementationOnce(() => pending.promise);
  const work = c.checkout();
  await vi.waitFor(() =>
    expect(bridge.call).toHaveBeenLastCalledWith(
      'prepare_checkout',
      expect.anything(),
    ),
  );
  c.prepareInput({ ...cap, cartId: '10000000-0000-4000-8000-000000000002' });
  pending.resolve(prepared());
  await work;
  expect(c.getSnapshot().purchase).toBeNull();
  expect(c.getSnapshot().canPay).toBe(false);
});
it('successful payment renders the original order and only explicit safe details opening calls the Host', async () => {
  const { bridge } = setup();
  const c = new StoreController(
    'prepare_checkout',
    bridge,
    'http://localhost:3000',
  );
  await c.receive(
    {
      ...cap,
      prepareRequestId: reviewId,
      expectedCartVersion: 1,
      target: 'apps',
    },
    prepared(),
  );
  const order = {
    orderId: reviewId,
    cartId: id,
    createdAt: '2026-10-30T00:00:00.000Z',
    purchaseHash: 'a'.repeat(64),
    catalogRevision: 'original',
    snapshot: purchase().summary,
  };
  bridge.call.mockImplementationOnce(async () => ok(order));
  await c.pay();
  expect(c.getSnapshot().order?.orderId).toBe(reviewId);
  expect(bridge.open).not.toHaveBeenCalled();
  await c.pay();
  expect(bridge.call).toHaveBeenCalledTimes(2);
  const url = `http://localhost:3000/order-details/${reviewId}#order-read=private-order`;
  bridge.call.mockImplementationOnce(async () =>
    ok({ url, expiresAt: cart().expiresAt }),
  );
  await c.openOrderDetails();
  expect(bridge.open).toHaveBeenCalledExactlyOnceWith(url);
  expect(JSON.stringify(c.getSnapshot())).not.toContain('private-order');
  bridge.call.mockImplementationOnce(async () =>
    ok({ url: 'https://evil.example/' + url, expiresAt: cart().expiresAt }),
  );
  await c.openOrderDetails();
  expect(bridge.open).toHaveBeenCalledTimes(1);
});
it('initial purchase views invalidate a late pay response as soon as another cart input arrives', async () => {
  const { bridge } = setup();
  const c = new StoreController(
    'prepare_checkout',
    bridge,
    'http://localhost:3000',
  );
  await c.receive(
    {
      ...cap,
      prepareRequestId: reviewId,
      expectedCartVersion: 1,
      target: 'apps',
    },
    prepared(),
  );
  const pending = deferred();
  bridge.call.mockImplementationOnce(() => pending.promise);
  const work = c.pay();
  c.prepareInput({ ...cap, cartId: '10000000-0000-4000-8000-000000000002' });
  pending.resolve(
    ok({
      orderId: reviewId,
      cartId: id,
      createdAt: '2026-10-30T00:00:00.000Z',
      purchaseHash: 'a'.repeat(64),
      catalogRevision: 'original',
      snapshot: purchase().summary,
    }),
  );
  await work;
  expect(c.getSnapshot().order).toBeNull();
  expect(c.getSnapshot().purchase).toBeNull();
  expect(c.getSnapshot().canPay).toBe(false);
});

it('readonly status preserves missing-material recovery with the original prepare key', async () => {
  const { bridge } = setup();
  const c = new StoreController(
    'prepare_checkout',
    bridge,
    'http://localhost:3000',
  );
  const input = {
    ...cap,
    prepareRequestId: reviewId,
    expectedCartVersion: 1,
    target: 'apps',
  };
  await c.receive(input, ok(purchase()));
  expect(c.getSnapshot().canRecover).toBe(true);
  bridge.call.mockImplementationOnce(async () => ok(purchase()));
  await c.reload();
  expect(c.getSnapshot().canRecover).toBe(true);
  expect(c.getSnapshot().canRetryPay).toBe(false);
  bridge.call.mockImplementationOnce(async () => prepared());
  await c.recoverPurchase();
  expect(bridge.call).toHaveBeenLastCalledWith('prepare_checkout', input);
  expect(c.getSnapshot().canPay).toBe(true);
});

describe('Host purchase result calibration', () => {
  const input = {
    ...cap,
    prepareRequestId: reviewId,
    expectedCartVersion: 1,
    target: 'apps',
  };
  const order = {
    orderId: reviewId,
    cartId: id,
    createdAt: '2026-10-30T00:00:00.000Z',
    purchaseHash: 'a'.repeat(64),
    catalogRevision: 'original',
    snapshot: purchase().summary,
  };
  const completed = () => ok({ ...purchase('completed'), order });
  it('restores the original order on remount and on repeated historical delivery', async () => {
    const { bridge } = setup();
    bridge.call.mockImplementation(async () => completed());
    const c = new StoreController(
      'prepare_checkout',
      bridge,
      'http://localhost:3000',
    );
    for (let delivery = 0; delivery < 2; delivery++) {
      await c.receive(input, prepared());
      expect(c.getSnapshot().purchase?.state).toBe('completed');
      expect(c.getSnapshot().order).toEqual(order);
      expect(c.getSnapshot().canPay).toBe(false);
    }
    expect(bridge.call.mock.calls).toEqual([
      ['get_purchase_status', { ...cap, reviewId }],
      ['get_purchase_status', { ...cap, reviewId }],
    ]);
  });
  it('blocks actions while calibrating and keeps failed reads unknown until an explicit read', async () => {
    const { bridge } = setup();
    const pending = deferred();
    bridge.call.mockImplementationOnce(() => pending.promise);
    const c = new StoreController(
      'prepare_checkout',
      bridge,
      'http://localhost:3000',
    );
    const receiving = c.receive(input, prepared());
    expect(c.getSnapshot().busy).toBe(true);
    expect(c.getSnapshot().canPay).toBe(false);
    await c.pay();
    await c.cancelPurchase();
    await c.recoverPurchase();
    pending.resolve({ isError: true });
    await receiving;
    expect(c.getSnapshot().needsRefresh).toBe(true);
    expect(c.getSnapshot().canPay).toBe(false);
    expect(c.getSnapshot().canRetryPay).toBe(false);
    await c.pay();
    await c.cancelPurchase();
    expect(bridge.call.mock.calls).toEqual([
      ['get_purchase_status', { ...cap, reviewId }],
    ]);
    bridge.call.mockImplementationOnce(async () => completed());
    await c.reload();
    expect(c.getSnapshot().order).toEqual(order);
  });
  it.each(['cart', 'review', 'dispose'])(
    'ignores a late calibration after changing %s',
    async (change) => {
      const { bridge } = setup();
      const pending = deferred();
      bridge.call.mockImplementationOnce(() => pending.promise);
      const c = new StoreController(
        'prepare_checkout',
        bridge,
        'http://localhost:3000',
      );
      const receiving = c.receive(input, prepared());
      if (change === 'dispose') c.dispose();
      else
        c.prepareInput({
          ...input,
          ...(change === 'cart'
            ? { cartId: '10000000-0000-4000-8000-000000000002' }
            : { prepareRequestId: '20000000-0000-4000-8000-000000000002' }),
        });
      pending.resolve(completed());
      await receiving;
      expect(c.getSnapshot().purchase).toBeNull();
      expect(c.getSnapshot().order).toBeNull();
      expect(c.getSnapshot().canPay).toBe(false);
    },
  );
});
