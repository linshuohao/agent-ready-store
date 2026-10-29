import { describe, it, expect } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
const base = process.env.S2_API_BASE_URL;
const origin = process.env.WEB_ORIGIN ?? 'http://127.0.0.1:3005';
(base ? describe : describe.skip)('Cart HTTP boundaries', () => {
  const input = () => ({
    createRequestId: randomUUID(),
    cartToken: randomBytes(32).toString('base64url'),
    items: [{ productId: 'P001', quantity: 1 }],
  });
  const write = (
    path: string,
    body: unknown,
    cookie = '',
    requestOrigin = origin,
    method = 'POST',
  ) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        Origin: requestOrigin,
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    });
  it('sets a protected per-cart cookie and never returns the secret in the body', async () => {
    const payload = input();
    const response = await write('/carts', payload);
    const text = await response.text();
    const result = JSON.parse(text);
    expect(response.status).toBe(201);
    expect(text).not.toContain(payload.cartToken);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const setCookie = response.headers.get('set-cookie')!;
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    const cookie = setCookie.split(';')[0];
    const view = await fetch(`${base}/carts/${result.data.cartId}`, {
      headers: { Cookie: cookie },
    });
    expect(view.status).toBe(200);
    expect((await view.json()).data.cartVersion).toBe(1);
    const edit = await write(
      `/carts/${result.data.cartId}/items`,
      { expectedCartVersion: 1, items: [] },
      cookie,
      origin,
      'PUT',
    );
    expect(edit.status).toBe(200);
    expect((await edit.json()).data.quote).toBeNull();
    const stale = await write(
      `/carts/${result.data.cartId}/items`,
      { expectedCartVersion: 1, items: [] },
      cookie,
      origin,
      'PUT',
    );
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe('CART_VERSION_CONFLICT');
    const replay = await write('/carts', payload);
    expect(replay.status).toBe(200);
    expect((await replay.json()).data.cartVersion).toBe(2);
  });
  it('rejects forged source, prices, cross-origin, missing identity and wrong-cart cookies', async () => {
    expect(
      (await write('/carts', { ...input(), origin: 'AGENT' })).status,
    ).toBe(400);
    expect(
      (
        await write('/carts', {
          ...input(),
          items: [{ productId: 'P001', quantity: 1, price: '0.01' }],
        })
      ).status,
    ).toBe(400);
    expect(
      (await write('/carts', input(), '', 'https://attacker.invalid')).status,
    ).toBe(403);
    expect(
      (
        await fetch(`${base}/carts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input()),
        })
      ).status,
    ).toBe(403);
    const a = await write('/carts', input());
    const aCookie = a.headers.get('set-cookie')!.split(';')[0];
    const b = await write('/carts', input());
    const id = (await b.json()).data.cartId;
    const wrong = await fetch(`${base}/carts/${id}`, {
      headers: { Cookie: aCookie },
    });
    expect(wrong.status).toBe(403);
    expect((await wrong.json()).data).toBeUndefined();
    expect((await fetch(`${base}/carts/${id}?cartToken=invalid`)).status).toBe(
      400,
    );
  });
  it('enforces the actual 64KiB body limit and malformed JSON boundary', async () => {
    const tooLarge = await write('/carts', {
      ...input(),
      padding: 'x'.repeat(65536),
    });
    expect(tooLarge.status).toBe(413);
    const malformed = await fetch(`${base}/carts`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: '{',
    });
    expect(malformed.status).toBe(400);
  });
});
