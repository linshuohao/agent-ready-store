import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  operateCart,
  createCart,
  failureText,
} from '../src/features/cart/commands';
const id = '10000000-0000-4000-8000-000000000001';
const intent = {
  cartId: id,
  expectedCartVersion: 3,
  operation: { type: 'add_item' as const, productId: 'P001', quantity: 1 },
  entrance: 'webmcp' as const,
};
afterEach(() => vi.unstubAllGlobals());
describe('server authority commands', () => {
  it('requires a reload for a stale version without asking for a comparison', () => {
    expect(failureText({ code: 'CART_VERSION_CONFLICT' })).toBe(
      '服務端的購物車已更新，請重新載入後再調整。',
    );
  });
  it('returns a version rejection directly without a follow-up GET or replay', async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'CART_VERSION_CONFLICT',
            message: 'conflict',
            retryable: false,
          },
          requestId: 'test',
        }),
        { status: 409 },
      ),
    );
    vi.stubGlobal('fetch', request);
    expect(await operateCart(intent)).toMatchObject({
      kind: 'failure',
      error: { code: 'CART_VERSION_CONFLICT' },
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      `/api/v1/webmcp/carts/${id}/operations`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          expectedCartVersion: 3,
          operation: intent.operation,
        }),
      }),
    );
  });
  it('returns an unknown write without reading or replaying it', async () => {
    const request = vi.fn().mockRejectedValue(new TypeError('network'));
    vi.stubGlobal('fetch', request);
    expect(await operateCart(intent)).toEqual({ kind: 'unknown' });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('preserves the original creation key and channel for explicit retry', async () => {
    const request = vi.fn().mockRejectedValue(new TypeError('network'));
    vi.stubGlobal('fetch', request);
    const creation = {
      createRequestId: id,
      cartToken: 'x'.repeat(43),
      items: [],
    };
    await createCart(creation, 'webmcp');
    await createCart(creation, 'webmcp');
    expect(request.mock.calls).toHaveLength(2);
    expect(request.mock.calls[0][0]).toBe(request.mock.calls[1][0]);
    expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);
    expect(request).toHaveBeenCalledWith(
      '/api/v1/webmcp/carts',
      expect.objectContaining({ body: JSON.stringify(creation) }),
    );
  });
});
