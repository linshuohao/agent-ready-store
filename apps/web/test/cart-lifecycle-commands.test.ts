import { describe, expect, it, vi } from 'vitest';
import {
  CartCommands,
  addIdentity,
  pendingRequests,
  requestKey,
  pendingCartKey,
  currentCartKey,
  acceptCart,
  createCartOrder,
  queryRequest,
} from '../src/features/cart/lifecycle-commands';
const id = '10000000-0000-4000-8000-000000000001';
const key = '10000000-0000-4000-8000-000000000002';
const other = '10000000-0000-4000-8000-000000000003';
const cart = (version = 1) => ({
  cartId: id,
  cartVersion: version,
  agentCreated: false,
  items: [],
  issues: [],
  pendingOrders: [],
});
const ok = (data: unknown) => Response.json({ ok: true, data });
function memory() {
  const data = new Map<string, string>();
  return {
    keys: () => [...data.keys()],
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
    withLock: async <T>(_name: string, work: () => T) => work(),
  };
}
const add = (requestId = key) => ({
  cartId: id,
  operationRequestId: requestId,
  productId: 'P001',
  quantity: 1,
});
describe('independent durable cart commands', () => {
  it('sends B while A is pending, retains two unknowns and reload never writes', async () => {
    const storage = memory();
    let rejectA!: (reason: unknown) => void;
    const first = new Promise<Response>((_, reject) => {
      rejectA = reject;
    });
    const transport = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockRejectedValueOnce(Error('offline'));
    const commands = new CartCommands(storage, transport);
    const a = commands.add(add());
    expect(storage.getItem(requestKey(key))).toContain(key);
    await commands.add(add(other));
    expect(transport).toHaveBeenCalledTimes(2);
    rejectA(Error('lost'));
    await a;
    expect(new CartCommands(storage, transport).list()).toHaveLength(2);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('query is read-only and continue reuses exact original payload, completing only its slot', async () => {
    const storage = memory(),
      transport = vi.fn().mockRejectedValue(Error('lost'));
    const commands = new CartCommands(storage, transport);
    await commands.add(add());
    await commands.add(add(other));
    transport.mockResolvedValueOnce(ok({ status: 'not_found', kind: 'cart' }));
    await commands.query(key);
    expect(transport.mock.calls[2][0]).toContain('/request-result?');
    expect(transport.mock.calls[2][1]).toBeUndefined();
    expect(commands.list()).toHaveLength(2);
    transport.mockResolvedValueOnce(ok(cart(2)));
    await commands.retry(key);
    expect(transport.mock.calls[3][1]).toEqual(add());
    expect(commands.list().map((r) => r.requestId)).toEqual([other]);
  });
  it('storage failure before dispatch stops writing; wrong target remains unknown', async () => {
    const transport = vi.fn(async () => ok({ ...cart(), cartId: other }));
    const broken = {
      ...memory(),
      setItem: () => {
        throw Error('blocked');
      },
    };
    expect(await new CartCommands(broken, transport).add(add())).toMatchObject({
      kind: 'failure',
      error: { code: 'LOCAL_STORAGE_UNAVAILABLE' },
    });
    expect(transport).not.toHaveBeenCalled();
    const commands = new CartCommands(memory(), transport);
    expect(await commands.add(add())).toEqual({ kind: 'unknown' });
    expect(commands.list()).toHaveLength(1);
  });
  it('a late not_found never reopens a successfully recovered request', async () => {
    const storage = memory();
    await new CartCommands(storage, async () => {
      throw Error('lost');
    }).add(add());
    const request = pendingRequests(storage)[0];
    let finish!: (r: Response) => void;
    const late = queryRequest(
      storage,
      request,
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await queryRequest(storage, request, async () =>
      ok({ status: 'found', kind: 'cart', cart: cart() }),
    );
    finish(ok({ status: 'not_found', kind: 'cart' }));
    await late;
    expect(pendingRequests(storage)).toEqual([]);
  });
  it('legacy initialization can only be queried and blocks a replacement identity', async () => {
    const storage = memory();
    storage.setItem(
      pendingCartKey(),
      JSON.stringify({
        kind: 'initialize',
        input: {
          requestId: key,
          initialItems: [{ productId: 'P001', quantity: 1 }],
        },
      }),
    );
    const transport = vi.fn<
      (path: string, body?: unknown) => Promise<Response>
    >(async () => ok({ status: 'not_found', kind: 'initialize' }));
    const commands = new CartCommands(storage, transport);
    expect(await commands.retry(key)).toMatchObject({
      kind: 'failure',
      error: { code: 'LEGACY_RECOVERY_REQUIRED' },
    });
    await expect(addIdentity(storage)).rejects.toThrow(
      'LEGACY_RECOVERY_REQUIRED',
    );
    await commands.query(key);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][1]).toBeUndefined();
  });
  it('shares one initialization identity without holding a network lock and never replaces a switched cart', async () => {
    const storage = memory();
    const [a, b] = await Promise.all([
      addIdentity(storage),
      addIdentity(storage),
    ]);
    expect(a).toEqual(b);
    let finish!: (r: Response) => void;
    const commands = new CartCommands(
      storage,
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = commands.add({
      ...a,
      operationRequestId: key,
      productId: 'P001',
      quantity: 1,
    });
    storage.setItem(currentCartKey, other);
    finish(ok(cart()));
    await pending;
    expect(storage.getItem(currentCartKey)).toBe(other);
    expect(await addIdentity(storage)).toEqual({ cartId: other });
  });
  it('refuses unsafe identity creation when atomic locking is unavailable', async () => {
    await expect(
      addIdentity({ ...memory(), withLock: undefined }),
    ).rejects.toThrow('INITIALIZATION_LOCK_UNAVAILABLE');
  });
  it('keeps version conflicts local and does not retry automatically', async () => {
    const transport = vi.fn(async () =>
      Response.json(
        { ok: false, error: { code: 'CART_VERSION_CONFLICT' } },
        { status: 409 },
      ),
    );
    const commands = new CartCommands(memory(), transport);
    expect(
      await commands.operate(id, {
        operationRequestId: key,
        expectedCartVersion: 1,
        operation: { type: 'remove_item', productId: 'P001' },
      }),
    ).toMatchObject({ kind: 'failure' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(commands.list()).toEqual([]);
    expect(acceptCart(cart(3), cart(2), id)?.cartVersion).toBe(3);
    expect(
      acceptCart(cart(3), { ...cart(4), cartId: other }, id)?.cartVersion,
    ).toBe(3);
  });
  it('persists separate explicit purchase quantities and does not replay historical orders', async () => {
    const storage = memory(),
      transport = vi.fn<(path: string, body?: unknown) => Promise<Response>>(
        async () => {
          throw Error('lost');
        },
      );
    const input = {
      requestId: key,
      selectedItems: [{ productId: 'P001', quantity: 2 }],
      constraints: { currency: 'TWD' as const },
    };
    await createCartOrder(storage, id, input, undefined, transport);
    await createCartOrder(
      storage,
      id,
      { ...input, requestId: other },
      undefined,
      transport,
    );
    expect(pendingRequests(storage)).toHaveLength(2);
    expect(transport.mock.calls[0][1]).toEqual(input);
    storage.setItem(
      'store.order.create.' + id,
      JSON.stringify({ ...input, requestId: id, expectedCartVersion: 1 }),
    );
    expect(
      await createCartOrder(storage, id, undefined, undefined, transport, id),
    ).toMatchObject({
      kind: 'failure',
      error: { code: 'LEGACY_RECOVERY_REQUIRED' },
    });
    expect(transport).toHaveBeenCalledTimes(2);
  });
});

it('a new request cannot reuse the prior initialization identity after the current cart changes', async () => {
  const storage = memory();
  const initializationId = key;
  expect(await addIdentity(storage, { initializationId })).toEqual({
    initializationId,
  });
  storage.setItem(currentCartKey, other);
  await expect(addIdentity(storage, { initializationId })).rejects.toThrow(
    'STALE_CONTEXT',
  );
  expect(await addIdentity(storage)).toEqual({ cartId: other });
});
