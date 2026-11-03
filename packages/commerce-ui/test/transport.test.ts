import { afterEach, expect, it, vi } from 'vitest';
import { httpTransport } from '../src/transport';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each(['caller', 'deadline'] as const)(
  'cancels the actual HTTP request on %s abort',
  async (source) => {
    const caller = new AbortController();
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
    const fetchMock = vi.fn(
      (_path: string, init: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          void resolve;
          init.signal!.addEventListener(
            'abort',
            () => reject(init.signal!.reason),
            { once: true },
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = httpTransport('/api/v1/products/P001/reviews', undefined, {
      signal: caller.signal,
    });
    const rejected = expect(result).rejects.toThrow('cancelled');
    (source === 'caller' ? caller : deadline).abort(new Error('cancelled'));
    await rejected;
    expect(AbortSignal.timeout).toHaveBeenCalledWith(10000);
    expect(fetchMock).toHaveBeenCalledOnce();
  },
);

it('keeps the existing write payload and deadline without an optional caller signal', async () => {
  const fetchMock = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);
  await httpTransport('/api/v1/shopping/orders/id/pay', {});
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/shopping/orders/id/pay',
    expect.objectContaining({
      method: 'POST',
      body: '{}',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    }),
  );
});
