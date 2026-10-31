import type { OrderView } from '@store/contracts';
import { afterEach, it, expect, vi } from 'vitest';
import {
  OrderCommands,
  orderPendingKey,
} from '../src/features/checkout/order-commands';
const id = '10000000-0000-4000-8000-000000000001',
  other = '10000000-0000-4000-8000-000000000002';
const order = (
  status: 'CHECKOUT' | 'PAID' = 'CHECKOUT',
  orderId = id,
): OrderView => ({
  orderId,
  cartId: other,
  sourceCartVersion: 1,
  status,
  effectiveStatus: status,
  createdAt: new Date().toISOString(),
  reservationExpiresAt: new Date(Date.now() + 900000).toISOString(),
  paidAt: status === 'PAID' ? new Date().toISOString() : null,
  closedAt: null,
  closeReason: null,
  createdByChannel: 'WEB',
  aiEligible: false,
  summary: {
    currency: 'TWD',
    pricingRuleVersion: 'v1',
    items: [
      {
        productId: 'P001',
        name: 'Item',
        brand: 'Brand',
        specs: {},
        quantity: 1,
        unitPrice: '100.00',
        lineSubtotal: '100.00',
      },
    ],
    subtotal: '100.00',
    thresholdDiscount: '0.00',
    aiDiscount: '0.00',
    shipping: '100.00',
    total: '200.00',
  },
  allowedActions: {
    canPay: status === 'CHECKOUT',
    canCancel: status === 'CHECKOUT',
  },
  navigation: {
    orderUrl: 'https://example.com/orders/' + orderId,
    shareUrl: 'https://example.com/orders/' + orderId + '?view=share',
  },
});
const ok = (data: unknown) => new Response(JSON.stringify({ ok: true, data }));
const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
};
const deferred = () => {
  let resolve!: (r: Response) => void;
  const promise = new Promise<Response>((r) => (resolve = r));
  return { promise, resolve };
};
afterEach(() => vi.unstubAllGlobals());
it('persists before action, retains a late payment for A while B is queried and rejects a terminal rollback', async () => {
  const storage = memory(),
    cmd = new OrderCommands(storage);
  vi.stubGlobal('fetch', async () => ok(order()));
  await cmd.read(id);
  const delayed = deferred();
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('/pay')) {
      expect(storage.getItem(orderPendingKey(id))).toContain('pay');
      return delayed.promise;
    }
    return ok(order('CHECKOUT', other));
  });
  const payment = cmd.act(id, 'pay');
  await cmd.read(other);
  delayed.resolve(ok(order('PAID')));
  await payment;
  expect(cmd.snapshot(id).order?.status).toBe('PAID');
  expect(cmd.snapshot(other).order?.status).toBe('CHECKOUT');
  expect(storage.getItem(orderPendingKey(id))).toBeNull();
  vi.stubGlobal('fetch', async () => ok(order()));
  await cmd.read(id);
  expect(cmd.snapshot(id).order?.status).toBe('PAID');
});
it('newer reads win while a delayed action success is never discarded by query sequencing', async () => {
  const cmd = new OrderCommands(memory()),
    old = deferred();
  let count = 0;
  vi.stubGlobal('fetch', () =>
    ++count === 1
      ? old.promise
      : Promise.resolve(
          ok({
            ...order(),
            effectiveStatus: 'EXPIRED',
            allowedActions: { canPay: false, canCancel: false },
          }),
        ),
  );
  const first = cmd.read(id);
  await cmd.read(id);
  old.resolve(ok(order()));
  await first;
  expect(cmd.snapshot(id).order?.effectiveStatus).toBe('EXPIRED');
});
it('unknown cancellation restores only that action and storage failures send no write', async () => {
  const storage = memory(),
    cmd = new OrderCommands(storage);
  vi.stubGlobal('fetch', async () => ok(order()));
  await cmd.read(id);
  vi.stubGlobal('fetch', async () => {
    throw Error('offline');
  });
  await cmd.act(id, 'cancel');
  const restored = new OrderCommands(storage);
  vi.stubGlobal('fetch', async () => ok(order()));
  await restored.read(id);
  expect(restored.snapshot(id).pendingAction).toBe('cancel');
  const fetcher = vi.fn(async () => ok(order('PAID')));
  vi.stubGlobal('fetch', fetcher);
  await restored.act(id, 'pay');
  expect(fetcher).not.toHaveBeenCalled();
  const blocked = new OrderCommands({
    ...memory(),
    setItem: () => {
      throw Error('blocked');
    },
  });
  vi.stubGlobal('fetch', async () => ok(order()));
  await blocked.read(id);
  vi.stubGlobal('fetch', fetcher);
  await blocked.act(id, 'pay');
  expect(fetcher).not.toHaveBeenCalled();
});
it('conflicting committed terminals preserve known result, block actions and trigger one authority reread', async () => {
  const cmd = new OrderCommands(memory());
  vi.stubGlobal('fetch', async () => ok(order('PAID')));
  await cmd.read(id);
  const closed = {
    ...order(),
    effectiveStatus: 'CANCELLED',
    closedAt: new Date().toISOString(),
    closeReason: 'CANCELLED',
    allowedActions: { canPay: false, canCancel: false },
  };
  let calls = 0;
  vi.stubGlobal('fetch', async () => {
    calls++;
    return ok(closed);
  });
  await cmd.read(id);
  await Promise.resolve();
  expect(cmd.snapshot(id).order?.status).toBe('PAID');
  expect(cmd.snapshot(id).conflict).toBe(true);
  expect(calls).toBe(2);
});

it('background refresh preserves payment access and its late checkout cannot overwrite payment', async () => {
  const cmd = new OrderCommands(memory());
  vi.stubGlobal('fetch', async () => ok(order()));
  await cmd.read(id);
  const stale = deferred();
  const fetcher = vi.fn((url: string) =>
    url.endsWith('/pay') ? Promise.resolve(ok(order('PAID'))) : stale.promise,
  );
  vi.stubGlobal('fetch', fetcher);
  const refresh = cmd.read(id, { background: true });
  expect(cmd.snapshot(id).loading).toBe(false);
  await cmd.act(id, 'pay');
  expect(fetcher.mock.calls.some(([url]) => url.endsWith('/pay'))).toBe(true);
  stale.resolve(ok(order()));
  await refresh;
  expect(cmd.snapshot(id).order?.status).toBe('PAID');
});

it('initial and explicit reloads still block payment until the read completes', async () => {
  const cmd = new OrderCommands(memory()),
    first = deferred();
  const fetcher = vi.fn(() => first.promise);
  vi.stubGlobal('fetch', fetcher);
  const initial = cmd.read(id, { background: true });
  expect(cmd.snapshot(id).loading).toBe(true);
  await cmd.act(id, 'pay');
  expect(fetcher).toHaveBeenCalledTimes(1);
  first.resolve(ok(order()));
  await initial;
  const reloaded = deferred();
  fetcher.mockImplementation(() => reloaded.promise);
  const reload = cmd.read(id);
  expect(cmd.snapshot(id).loading).toBe(true);
  await cmd.act(id, 'pay');
  expect(fetcher).toHaveBeenCalledTimes(2);
  reloaded.resolve(ok(order()));
  await reload;
});
