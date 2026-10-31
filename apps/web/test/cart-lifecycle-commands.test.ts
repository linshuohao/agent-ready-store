import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CartCommands,
  readCart,
  acceptCart,
  pendingCartKey,
} from '../src/features/cart/lifecycle-commands';
const id = '10000000-0000-4000-8000-000000000001';
const key = '10000000-0000-4000-8000-000000000002';
const cart = (version = 1, quantity = 1) => ({
  cartId: id,
  cartVersion: version,
  agentCreated: false,
  items: [
    {
      productId: 'P001',
      quantity,
      name: 'Item',
      unitPrice: '100.00',
      availability: { canPurchase: true, reasons: [], currentQuantity: 10 },
    },
  ],
  issues: [],
  pendingOrders: [],
});
const ok = (data: unknown) =>
  new Response(JSON.stringify({ ok: true, data, requestId: key }));
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
afterEach(() => vi.unstubAllGlobals());
describe('persistent cart commands', () => {
  it('saves initialization before sending and recovers the identical request across remount without duplicating items', async () => {
    const storage = memory(),
      commands = new CartCommands(storage);
    const input = {
      requestId: key,
      initialItems: [{ productId: 'P001', quantity: 1 }],
    };
    const fetcher = vi.fn(async (_url: unknown, _options?: RequestInit) => {
      void _url;
      void _options;
      expect(storage.getItem(pendingCartKey())).toContain(key);
      throw new TypeError('lost response');
    });
    vi.stubGlobal('fetch', fetcher);
    expect(await commands.initialize(input)).toEqual({ kind: 'unknown' });
    expect(
      await commands.initialize({ ...input, requestId: id }),
    ).toMatchObject({
      kind: 'failure',
      error: { code: 'CART_RECOVERY_REQUIRED' },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, options) => {
        expect(options.body).toBe(fetcher.mock.calls[0][1]!.body);
        return ok(cart(2, 2));
      }),
    );
    expect(await new CartCommands(storage).retry()).toMatchObject({
      kind: 'success',
      data: { cartVersion: 2 },
    });
    expect(storage.getItem(pendingCartKey())).toBeNull();
  });
  it('keeps the original operation on unknown, refuses new writes, then explicitly retries that key', async () => {
    const storage = memory(),
      commands = new CartCommands(storage);
    const input = {
      operationRequestId: key,
      expectedCartVersion: 1,
      operation: { type: 'add_item' as const, productId: 'P001', quantity: 1 },
    };
    const fetcher = vi.fn(async (_url: unknown, _options?: RequestInit) => {
      void _url;
      void _options;
      expect(storage.getItem(pendingCartKey(id))).toContain(key);
      throw new TypeError('lost');
    });
    vi.stubGlobal('fetch', fetcher);
    expect(await commands.operate(id, input)).toEqual({ kind: 'unknown' });
    expect(
      await commands.operate(id, { ...input, operationRequestId: id }),
    ).toMatchObject({
      kind: 'failure',
      error: { code: 'CART_RECOVERY_REQUIRED' },
    });
    const retry = vi.fn<
      (url: unknown, options?: RequestInit) => Promise<Response>
    >(async () => ok(cart(2, 2)));
    vi.stubGlobal('fetch', retry);
    expect(await new CartCommands(storage).retry(id)).toMatchObject({
      kind: 'success',
      data: { items: [{ quantity: 2 }] },
    });
    expect(retry.mock.calls[0][1]!.body).toBe(fetcher.mock.calls[0][1]!.body);
  });
  it('does not write when persistence fails and does not clear uncertainty for malformed or wrong-target responses', async () => {
    const fetcher = vi.fn(async () => ok({ ...cart(), cartId: key }));
    vi.stubGlobal('fetch', fetcher);
    const broken = {
      ...memory(),
      setItem: () => {
        throw Error('unavailable');
      },
    };
    expect(
      await new CartCommands(broken).initialize({
        requestId: key,
        initialItems: [],
      }),
    ).toMatchObject({
      kind: 'failure',
      error: { code: 'LOCAL_STORAGE_UNAVAILABLE' },
    });
    expect(fetcher).not.toHaveBeenCalled();
    const storage = memory();
    expect(
      await new CartCommands(storage).operate(id, {
        operationRequestId: key,
        expectedCartVersion: 1,
        operation: { type: 'remove_item', productId: 'P001' },
      }),
    ).toEqual({ kind: 'unknown' });
    expect(storage.getItem(pendingCartKey(id))).not.toBeNull();
    expect(await readCart(id)).toEqual({ kind: 'unknown' });
  });
  it('preserves newer and different-cart snapshots and does not retry version conflicts', async () => {
    expect(acceptCart(cart(3), cart(2), id)?.cartVersion).toBe(3);
    expect(acceptCart(cart(3), { ...cart(4), cartId: key }, id)?.cartId).toBe(
      id,
    );
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: {
              code: 'CART_VERSION_CONFLICT',
              message: 'conflict',
              retryable: false,
            },
            requestId: key,
          }),
          { status: 409 },
        ),
    );
    vi.stubGlobal('fetch', fetcher);
    const storage = memory();
    expect(
      await new CartCommands(storage).operate(id, {
        operationRequestId: key,
        expectedCartVersion: 1,
        operation: { type: 'remove_item', productId: 'P001' },
      }),
    ).toMatchObject({
      kind: 'failure',
      error: { code: 'CART_VERSION_CONFLICT' },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(storage.getItem(pendingCartKey(id))).toBeNull();
  });
});

it('recovers a WebMCP initialization through the original channel after a lost response', async () => {
  const storage = memory(),
    input = {
      requestId: key,
      initialItems: [{ productId: 'P001', quantity: 1 }],
    };
  vi.stubGlobal('fetch', async () => {
    throw Error('lost');
  });
  await new CartCommands(storage).initialize(input, 'webmcp');
  vi.stubGlobal('fetch', async (url: string) => {
    expect(url).toBe('/api/v1/shopping/webmcp/carts');
    return ok({ ...cart(), agentCreated: true });
  });
  expect(
    await new CartCommands(storage).initialize(input, 'webmcp'),
  ).toMatchObject({ kind: 'success', data: { agentCreated: true } });
});
