import { describe, it, expect } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
const base = process.env.S3_API_BASE_URL;
(base ? describe : describe.skip)(
  'Checkout HTTP authorization and results',
  () => {
    const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const write = (path: string, body: unknown, cookie = '', o = origin) =>
      fetch(base + path, {
        method: 'POST',
        headers: {
          Origin: o,
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify(body),
      });
    it('requires a separate browser confirmation, rejects forged origin and returns the saved order on retry', async () => {
      const create = await write('/carts', {
        createRequestId: randomUUID(),
        cartToken: randomBytes(32).toString('base64url'),
        items: [{ productId: 'P001', quantity: 1 }],
      });
      const { data: cart } = await create.json(),
        path = `/carts/${cart.cartId}`;
      const capability = create.headers.getSetCookie()[0].split(';')[0];
      expect(
        (
          await write(
            path + '/checkout-review',
            {},
            capability,
            'https://attacker.invalid',
          )
        ).status,
      ).toBe(403);
      const review = await write(path + '/checkout-review', {}, capability);
      expect(review.status).toBe(200);
      const material = await review.json();
      expect(material.data.state).toBe('ready');
      expect(material.data.confirmationExpiresAt).toBe(cart.expiresAt);
      const session = review.headers.getSetCookie()[0];
      expect(session).toContain('HttpOnly');
      expect(session).toContain('SameSite=Strict');
      const cookie = capability + '; ' + session.split(';')[0];
      expect(
        (
          await write(
            path + '/orders',
            { confirmation: material.data.confirmation },
            capability,
          )
        ).status,
      ).toBe(403);
      expect(
        (await write(path + '/orders', { userApproved: true }, cookie)).status,
      ).toBe(400);
      const response = await write(
        path + '/orders',
        { confirmation: material.data.confirmation },
        cookie,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const order = (await response.json()).data;
      expect(order.snapshot.quote.total).toBe(cart.quote.total);
      const retry = await write(
        path + '/orders',
        { confirmation: material.data.confirmation },
        cookie,
      );
      expect((await retry.json()).data).toEqual(order);
      expect((await fetch(base + path + '/order')).status).toBe(403);
      expect(
        (
          await write(
            path + '/orders',
            { confirmation: material.data.confirmation },
            capability,
          )
        ).status,
      ).toBe(200);
      const read = await fetch(base + path + '/order', {
        headers: { Cookie: capability },
      });
      expect((await read.json()).data).toEqual(order);
    });

    it('fails safely when concurrent first reviews replace the browser confirmation cookie', async () => {
      const create = await write('/carts', {
        createRequestId: randomUUID(),
        cartToken: randomBytes(32).toString('base64url'),
        items: [{ productId: 'P003', quantity: 1 }],
      });
      const cart = (await create.json()).data,
        path = `/carts/${cart.cartId}`,
        capability = create.headers.getSetCookie()[0].split(';')[0];
      const [a, b] = await Promise.all([
        write(path + '/checkout-review', {}, capability),
        write(path + '/checkout-review', {}, capability),
      ]);
      const proofA = (await a.json()).data.confirmation,
        cookieB = capability + '; ' + b.headers.getSetCookie()[0].split(';')[0];
      expect(
        (await write(path + '/orders', { confirmation: proofA }, cookieB))
          .status,
      ).toBe(403);
      const fresh = (
        await (await write(path + '/checkout-review', {}, cookieB)).json()
      ).data;
      expect(
        (
          await write(
            path + '/orders',
            { confirmation: fresh.confirmation },
            cookieB,
          )
        ).status,
      ).toBe(200);
    });
  },
);
