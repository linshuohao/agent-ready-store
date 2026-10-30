import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  database,
  seedInventory,
} from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';
const base = process.env.PURCHASE_TEST_API_URL,
  url = process.env.TEST_DATABASE_URL,
  token = process.env.MCP_SERVICE_TOKEN,
  origin = process.env.WEB_ORIGIN!;
(base && url && token ? describe : describe.skip)(
  'isolated real HTTP/MCP UI purchases',
  () => {
    let db: ReturnType<typeof database>, client: Client;
    beforeAll(async () => {
      if (
        new URL(url!).pathname !== '/store_test' ||
        !/^http:\/\/(localhost|127\.0\.0\.1):(3001|3003)$/.test(base!)
      )
        throw Error('isolated API and store_test required');
      db = database(url!);
      client = new Client({ name: 'purchase-integration-test', version: '1' });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(base! + '/mcp'), {
          requestInit: {
            headers: {
              Authorization: `Bearer ${token}`,
              Host: 'localhost:3003',
            },
          },
        }),
      );
    });
    beforeEach(async () => {
      await db.order.deleteMany();
      await db.cart.deleteMany();
      await db.inventory.deleteMany();
      await seedInventory(
        db,
        new Catalog(readFileSync('references/products.json', 'utf8')),
      );
    });
    afterAll(async () => {
      await client.close();
      await db.$disconnect();
    });
    async function call(name: string, args: Record<string, unknown>) {
      return client.callTool({ name, arguments: args });
    }
    async function http(
      path: string,
      body?: unknown,
      cookie = '',
      requestOrigin = origin,
    ) {
      const r = await fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: requestOrigin,
          Cookie: cookie,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return {
        status: r.status,
        data: await r.json(),
        cookie: r.headers
          .getSetCookie()
          .map((c) => c.split(';')[0])
          .join('; '),
      };
    }
    it('isolates MCP UI material, refuses public submit and basic preparation, and purchases only via valid app material', async () => {
      const created = await call('create_cart', {
        createRequestId: randomUUID(),
        items: [{ productId: 'P001', quantity: 1 }],
      });
      const c = (created.structuredContent as any).data,
        cap = { cartId: c.cart.cartId, cartAccessToken: c.cartAccessToken };
      const basic = await call('prepare_checkout', {
        ...cap,
        prepareRequestId: randomUUID(),
        expectedCartVersion: 1,
        target: 'basic-mcp',
      });
      expect((basic.structuredContent as any).data).toMatchObject({
        confirmationAvailable: false,
        state: 'unavailable',
      });
      expect(await db.purchaseReview.count()).toBe(0);
      const prepared = await call('prepare_checkout', {
          ...cap,
          prepareRequestId: randomUUID(),
          expectedCartVersion: 1,
          target: 'apps',
        }),
        p = (prepared.structuredContent as any).data,
        m = (prepared._meta as any).purchaseMaterials;
      expect(p.state).toBe('pending');
      expect(JSON.stringify(prepared.content)).not.toContain(m.payToken);
      expect(JSON.stringify(prepared.structuredContent)).not.toContain(
        m.payToken,
      );
      expect(await db.order.count()).toBe(0);
      const args = { ...cap, reviewId: p.reviewId };
      expect((await call('get_purchase_status', args))._meta).toBeUndefined();
      for (const name of [
        'submit_order',
        'request_purchase_confirmation',
        'cancel_purchase',
      ])
        expect((await call(name, args)).isError).toBe(true);
      expect(
        (await call('pay_purchase', { ...args, payToken: m.cancelToken }))
          .isError,
      ).toBe(true);
      expect(
        (await call('pay_purchase', { ...args, userApproved: true })).isError,
      ).toBe(true);
      const [a, b] = await Promise.all([
        call('pay_purchase', { ...args, payToken: m.payToken }),
        call('pay_purchase', { ...args, payToken: m.payToken }),
      ]);
      expect((a.structuredContent as any).data.orderId).toBe(
        (b.structuredContent as any).data.orderId,
      );
      expect(await db.order.count()).toBe(1);
      const link = (await call('get_order_link', cap)).structuredContent as any;
      const order = (a.structuredContent as any).data,
        proof = new URLSearchParams(new URL(link.data.url).hash.slice(1)).get(
          'order-read',
        );
      const exchanged = await http('/api/v1/order-links/exchange', {
        orderId: order.orderId,
        orderReadToken: proof,
      });
      expect(exchanged.status).toBe(200);
      expect(exchanged.cookie).toContain('order_read_');
      expect(
        (
          await http(
            `/api/v1/orders/${order.orderId}/read`,
            undefined,
            exchanged.cookie,
          )
        ).data.data.orderId,
      ).toBe(order.orderId);
      expect((await http(`/api/v1/orders/${order.orderId}/read`)).status).toBe(
        403,
      );
      expect(
        (await http(`/api/v1/carts/${cap.cartId}`, undefined, exchanged.cookie))
          .status,
      ).toBe(403);
    });
    it('requires cookie roundtrip, rejects CSRF/wrong scope, keeps preparation/status token-free and pays directly', async () => {
      const created = await http('/api/v1/webmcp/carts', {
        createRequestId: randomUUID(),
        cartToken: randomBytes(32).toString('base64url'),
        items: [{ productId: 'P001', quantity: 1 }],
      });
      const id = created.data.data.cartId,
        cartCookie = created.cookie,
        path = `/api/v1/webmcp/carts/${id}/purchases`,
        input = { prepareRequestId: randomUUID(), expectedCartVersion: 1 };
      expect((await http(path, input, cartCookie)).status).toBe(403);
      const init = await http(
          '/api/v1/webmcp/checkout-session',
          {},
          cartCookie,
        ),
        cookie = cartCookie + '; ' + init.cookie;
      expect(
        (await http(path, input, cookie, 'https://evil.example')).status,
      ).toBe(403);
      const p = await http(path, input, cookie);
      expect(p.status).toBe(200);
      expect(JSON.stringify(p.data)).not.toMatch(
        /payToken|cancelToken|actorScope/,
      );
      const target = path + '/' + p.data.data.reviewId;
      const other = await http('/api/v1/webmcp/checkout-session', {});
      expect(
        (await http(target, undefined, cartCookie + '; ' + other.cookie))
          .status,
      ).toBe(403);
      expect(
        (await http(target + '/materials', {}, cookie, 'https://evil.example'))
          .status,
      ).toBe(403);
      const m = await http(target + '/materials', {}, cookie);
      expect(m.status).toBe(200);
      expect(await db.order.count()).toBe(0);
      expect(
        (
          await http(
            target + '/pay',
            { payToken: m.data.data.cancelToken },
            cookie,
          )
        ).status,
      ).toBe(403);
      const paid = await http(
        target + '/pay',
        { payToken: m.data.data.payToken },
        cookie,
      );
      expect(paid.status).toBe(200);
      const status = await http(target, undefined, cookie);
      expect(status.data.data.state).toBe('completed');
      expect(await db.order.count()).toBe(1);
      expect(
        (
          await http(
            target + '/pay',
            { payToken: m.data.data.payToken },
            cookie,
          )
        ).data.data.orderId,
      ).toBe(paid.data.data.orderId);
    });
  },
);
