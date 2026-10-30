import { describe, it, expect } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
const base = process.env.API_BASE_URL,
  origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
(base ? describe : describe.skip)('cart operation HTTP', () => {
  it('protects each operation and keeps old HTTP and MCP schemas compatible', async () => {
    const send = (
      path: string,
      body: unknown,
      cookie = '',
      requestOrigin = origin,
      contentType = 'application/json',
    ) =>
      fetch(`${base}/api/v1${path}`, {
        method: 'POST',
        headers: {
          Origin: requestOrigin,
          'Content-Type': contentType,
          Cookie: cookie,
        },
        body: JSON.stringify(body),
      });
    const input = {
      createRequestId: randomUUID(),
      cartToken: randomBytes(32).toString('base64url'),
      items: [{ productId: 'P001', quantity: 1 }],
    };
    const response = await send('/carts', input),
      made = (await response.json()).data;
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const path = `/webmcp/carts/${made.cartId}/operations`,
      body = {
        expectedCartVersion: 1,
        operation: { type: 'set_quantity', productId: 'P001', quantity: 1 },
      };
    expect((await send(path, body)).status).toBe(403);
    expect(
      (await send(path, body, cookie, 'https://evil.example')).status,
    ).toBe(403);
    expect((await send(path, body, cookie, origin, 'text/plain')).status).toBe(
      403,
    );
    for (const extra of [
      { origin: 'AGENT' },
      { price: '1' },
      { cartAccessToken: input.cartToken },
      { items: [] },
    ])
      expect((await send(path, { ...body, ...extra }, cookie)).status).toBe(
        400,
      );
    const upgraded = await send(path, body, cookie);
    expect(upgraded.status).toBe(200);
    expect(upgraded.headers.get('cache-control')).toBe('no-store');
    expect((await upgraded.json()).data).toMatchObject({
      cartVersion: 2,
      origin: 'AGENT',
    });
    expect((await send(path, body, cookie)).status).toBe(409);
    const removed = await send(
      `/carts/${made.cartId}/operations`,
      {
        expectedCartVersion: 2,
        operation: { type: 'remove_item', productId: 'P001' },
      },
      cookie,
    );
    expect((await removed.json()).data).toMatchObject({
      items: [],
      cartVersion: 3,
      origin: 'AGENT',
    });
    const legacy = await fetch(`${base}/api/v1/carts/${made.cartId}/items`, {
      method: 'PUT',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ expectedCartVersion: 3, items: input.items }),
    });
    expect(legacy.status).toBe(200);
    const second = await send('/carts', {
        ...input,
        createRequestId: randomUUID(),
        cartToken: randomBytes(32).toString('base64url'),
      }),
      secondId = (await second.json()).data.cartId;
    expect(
      (await send(`/carts/${secondId}/operations`, body, cookie)).status,
    ).toBe(403);
  });
});
