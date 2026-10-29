import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const base = process.env.API_BASE_URL,
  token = process.env.MCP_SERVICE_TOKEN;
const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
(base && token ? describe : describe.skip)(
  'MCP cart to HTTP handoff exchange',
  () => {
    it('recovers one trusted cart and exchanges its shared capability with protected Cookie', async () => {
      const client = new Client({ name: 's4-integration', version: '1' });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
          requestInit: { headers: { Authorization: `Bearer ${token}` } },
        }),
      );
      const call = async (name: string, args: Record<string, unknown>) => {
        const value = await client.callTool({ name, arguments: args });
        return value.structuredContent as {
          ok: boolean;
          data: any;
          error?: { code: string };
        };
      };
      try {
        const input = {
          createRequestId: randomUUID(),
          items: [{ productId: 'P001', quantity: 1 }],
        };
        const created = await call('create_cart', input);
        expect(created.ok).toBe(true);
        const { cart, cartAccessToken } = created.data,
          capability = { cartId: cart.cartId, cartAccessToken };
        expect(cart.origin).toBe('AGENT');
        const exchange = async (
          body: unknown,
          headers: Record<string, string> = {},
        ) =>
          fetch(`${base}/api/v1/handoffs/exchange`, {
            method: 'POST',
            headers: {
              Origin: origin,
              'Content-Type': 'application/json',
              ...headers,
            },
            body: JSON.stringify(body),
          });
        expect((await exchange(capability)).status).toBe(403);
        const shared = await call('create_handoff', capability);
        expect(shared.ok).toBe(true);
        expect(shared.data.requiresHumanConfirmation).toBe(true);
        expect(shared.data.handoff.url).toBe(
          `${origin}/checkout/${cart.cartId}#handoff=${cartAccessToken}`,
        );
        expect(shared.data.cart.quote).toEqual(cart.quote);
        const response = await exchange(capability);
        expect(response.status).toBe(200);
        const cookie = response.headers.get('set-cookie')!;
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Strict');
        expect(response.headers.get('cache-control')).toBe('no-store');
        const saved = await (
          await fetch(`${base}/api/v1/carts/${cart.cartId}`, {
            headers: { Cookie: cookie.split(';')[0] },
          })
        ).json();
        expect(saved.data.origin).toBe('AGENT');
        expect(saved.data.quote).toEqual(cart.quote);
        const update = await call('update_cart', {
          ...capability,
          expectedCartVersion: 1,
          items: [{ productId: 'P001', quantity: 2 }],
        });
        expect(update.ok).toBe(true);
        const stale = await call('update_cart', {
          ...capability,
          expectedCartVersion: 1,
          items: [],
        });
        expect(stale.error?.code).toBe('CART_VERSION_CONFLICT');
        const replay = await call('create_cart', input);
        expect(replay.data.cartAccessToken).toBe(cartAccessToken);
        expect(replay.data.cart.cartVersion).toBe(2);
        expect((await call('get_cart', capability)).data.order).toBeNull();
        expect(
          (await call('create_cart', { ...input, origin: 'AGENT' })).ok,
        ).toBe(false);
        expect(
          (await exchange(capability, { Origin: 'https://evil.example' }))
            .status,
        ).toBe(403);
        expect(
          (
            await exchange(capability, {
              Cookie: `cart_${cart.cartId}=${'x'.repeat(43)}`,
            })
          ).status,
        ).toBe(403);
        expect(
          (await exchange({ ...capability, cartAccessToken: 'x'.repeat(43) }))
            .status,
        ).toBe(403);
        expect(
          (
            await exchange({
              ...capability,
              redirectUrl: 'https://evil.example',
            })
          ).status,
        ).toBe(400);
        const raw = (
          suffix: string,
          headers: Record<string, string>,
          body: string,
        ) =>
          fetch(`${base}/api/v1/handoffs/exchange${suffix}`, {
            method: 'POST',
            headers: {
              Origin: origin,
              'Content-Type': 'application/json',
              ...headers,
            },
            body,
          });
        expect(
          (await raw('?token=forbidden', {}, JSON.stringify(capability)))
            .status,
        ).toBe(400);
        expect(
          (
            await raw(
              '',
              { 'x-cart-token': cartAccessToken },
              JSON.stringify(capability),
            )
          ).status,
        ).toBe(400);
        expect(
          (
            await raw(
              '',
              {
                Cookie: `cart_${cart.cartId}=${cartAccessToken}; cart_${cart.cartId}=${cartAccessToken}`,
              },
              JSON.stringify(capability),
            )
          ).status,
        ).toBe(403);
        expect(
          (
            await raw(
              '',
              { 'Content-Type': 'text/plain' },
              JSON.stringify(capability),
            )
          ).status,
        ).toBe(403);
        expect((await raw('', {}, '{')).status).toBe(400);
        expect(
          (await raw('', {}, JSON.stringify({ pad: 'x'.repeat(66000) })))
            .status,
        ).toBe(413);
      } finally {
        await client.close();
      }
    });
  },
);
