import { afterEach, expect, it, vi } from 'vitest';
import {
  preparePurchase,
  readPurchase,
  payPurchase,
} from '../src/features/checkout/purchase-commands';
afterEach(() => vi.unstubAllGlobals());
const input = {
  prepareRequestId: '10000000-0000-4000-8000-000000000001',
  expectedCartVersion: 1,
};
it('establishes a cookie round trip before preparation and stops on stale navigation', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, data: { ready: true }, requestId: 'test' }),
      ),
    );
  vi.stubGlobal('fetch', fetch);
  expect(await preparePurchase('cart', input, () => false)).toEqual({
    kind: 'failure',
    code: 'STALE_CONTEXT',
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('/api/v1/webmcp/checkout-session');
});
it('never retries an unknown payment or turns a status read into a write', async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError('lost response'));
  vi.stubGlobal('fetch', fetch);
  expect(await payPurchase('cart', 'review', 'secret')).toEqual({
    kind: 'unknown',
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  await readPurchase('cart', 'review');
  expect(fetch.mock.calls[1][1].method).toBe('GET');
  expect(fetch.mock.calls[1][0]).toBe(
    '/api/v1/webmcp/carts/cart/purchases/review',
  );
});

it('keeps readonly order exchange separate and does not replay an unknown exchange', async () => {
  const { orderDetailsRequest } =
    await import('../src/features/checkout/purchase-commands');
  const fetch = vi.fn().mockRejectedValue(new TypeError('lost exchange'));
  vi.stubGlobal('fetch', fetch);
  expect(await orderDetailsRequest('order', 'read-secret')).toEqual({
    kind: 'unknown',
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('/api/v1/order-links/exchange');
  await orderDetailsRequest('order');
  expect(fetch.mock.calls[1][0]).toBe('/api/v1/orders/order/read');
  expect(fetch.mock.calls[1][1].method).toBe('GET');
});

it('sends the preparation after the session response with same-origin credentials', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ok: true, data: { ready: true }, requestId: 'test' }),
      ),
    )
    .mockRejectedValueOnce(new TypeError('preparation lost'));
  vi.stubGlobal('fetch', fetch);
  expect(await preparePurchase('cart', input, () => true)).toEqual({
    kind: 'unknown',
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][0]).toBe('/api/v1/webmcp/carts/cart/purchases');
  expect(fetch.mock.calls[1][1]).toMatchObject({
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });
});
