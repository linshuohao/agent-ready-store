import { describe, it, expect } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
const base = process.env.API_BASE_URL,
  origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
(base ? describe : describe.skip)('WebMCP browser HTTP boundaries', () => {
  it('keeps cookies/proofs, isolates create entrances and upgrades only authorized same-cart writes', async () => {
    const input = {
      createRequestId: randomUUID(),
      cartToken: randomBytes(32).toString('base64url'),
      items: [{ productId: 'P001', quantity: 1 }],
    };
    const send = (
      path: string,
      body: unknown,
      cookie = '',
      requestOrigin = origin,
      method = 'POST',
    ) =>
      fetch(`${base}/api/v1${path}`, {
        method,
        headers: {
          Origin: requestOrigin,
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });
    const human = await send('/carts', input),
      created = await human.json(),
      id = created.data.cartId;
    const cookie = human.headers.get('set-cookie')!.split(';')[0];
    const update = { expectedCartVersion: 1, items: input.items };
    expect(
      (await send(`/webmcp/carts/${id}/items`, update, '', origin, 'PUT'))
        .status,
    ).toBe(403);
    expect(
      (
        await send(
          `/webmcp/carts/${id}/items`,
          update,
          cookie,
          'https://evil.example',
          'PUT',
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await send(
          `/webmcp/carts/${id}/items`,
          { ...update, origin: 'AGENT' },
          cookie,
          origin,
          'PUT',
        )
      ).status,
    ).toBe(400);
    const upgraded = await send(
      `/webmcp/carts/${id}/items`,
      update,
      cookie,
      origin,
      'PUT',
    );
    expect(upgraded.status).toBe(200);
    expect(upgraded.headers.get('cache-control')).toBe('no-store');
    const result = await upgraded.json();
    expect(result.data).toMatchObject({
      origin: 'AGENT',
      cartVersion: 2,
      cartId: id,
    });
    expect(result.data.quote.aiDiscount).not.toBe('0.00');
    expect(result.data).not.toHaveProperty('cartAccessToken');
    expect(
      (await send(`/webmcp/carts/${id}/items`, update, cookie, origin, 'PUT'))
        .status,
    ).toBe(409);
    expect((await (await send('/carts', input)).json()).data.cartId).toBe(id);
    const browser = await send('/webmcp/carts', input),
      agent = await browser.json();
    expect(browser.status).toBe(201);
    expect(agent.data.origin).toBe('AGENT');
    expect(agent.data.cartId).not.toBe(id);
    expect(browser.headers.get('set-cookie')).toContain('HttpOnly');
    expect(
      (await (await send('/webmcp/carts', input)).json()).data.cartId,
    ).toBe(agent.data.cartId);
    expect(
      (await send('/webmcp/carts', { ...input, origin: 'AGENT' })).status,
    ).toBe(400);
    expect((await send('/webmcp/carts', { ...input, items: [] })).status).toBe(
      400,
    );
    expect(
      (await send('/webmcp/carts', input, '', 'https://evil.example')).status,
    ).toBe(403);
  });
});
