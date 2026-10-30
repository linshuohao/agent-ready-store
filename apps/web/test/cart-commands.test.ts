import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  inspectEdit,
  replaceCart,
  createCart,
} from '../src/features/cart/commands';
const id = '10000000-0000-4000-8000-000000000001';
const intent = {
  cartId: id,
  expectedCartVersion: 3,
  items: [],
  entrance: 'webmcp' as const,
};
const view = (version: number, origin = 'HUMAN') => ({
  orderId: null,
  cartId: id,
  origin,
  cartVersion: version,
  items: [],
  quote: null,
  quoteHash: null,
  issues: [],
  canCheckout: false,
  expiresAt: '2026-11-01T00:00:00.000Z',
});
function respond(cart: unknown) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, data: cart, requestId: 'test' }),
          { status: 200 },
        ),
      ),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe('browser mutation recovery', () => {
  it('keeps the old version unknown', async () => {
    respond(view(3));
    expect(await inspectEdit(intent)).toEqual({ kind: 'unknown' });
  });
  it('reports conflict when a newer HUMAN version blocks the pending conversion', async () => {
    respond(view(4));
    expect(await inspectEdit(intent)).toMatchObject({
      kind: 'conflict',
      cart: { origin: 'HUMAN', cartVersion: 4 },
    });
  });
  it('recognizes current intent only when items and Agent source both match', async () => {
    respond(view(4, 'AGENT'));
    expect(await inspectEdit(intent)).toMatchObject({ kind: 'success' });
  });
  it('keeps ordinary HUMAN recovery semantics', async () => {
    respond(view(4));
    expect(await inspectEdit({ ...intent, entrance: undefined })).toMatchObject(
      { kind: 'success' },
    );
  });
  it('uses a fixed WebMCP entrance and does not submit source fields', async () => {
    respond(view(4, 'AGENT'));
    await replaceCart(intent);
    expect(fetch).toHaveBeenCalledWith(
      `/api/v1/webmcp/carts/${id}/items`,
      expect.objectContaining({
        body: JSON.stringify({ expectedCartVersion: 3, items: [] }),
      }),
    );
    await createCart(
      { createRequestId: id, cartToken: 'x'.repeat(43), items: [] },
      'webmcp',
    );
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/v1/webmcp/carts',
      expect.anything(),
    );
  });
});
