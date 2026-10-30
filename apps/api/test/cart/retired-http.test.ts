import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const base = process.env.CHECKOUT_CORE_API_URL;
(base ? describe : describe.skip)(
  'retired checkout entry points against isolated API',
  () => {
    it('rejects old routes and cannot register or execute old purchase tools', async () => {
      const parsed = new URL(base!);
      if (
        !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
        parsed.port !== '3003'
      )
        throw Error('isolated API 3003 required');
      for (const path of [
        '/api/v1/carts',
        '/api/v1/carts/11111111-1111-4111-8111-111111111111/orders',
        '/api/v1/handoffs/exchange',
        '/api/v1/webmcp/carts/11111111-1111-4111-8111-111111111111/purchases/22222222-2222-4222-8222-222222222222/pay',
        '/api/v1/order-links/exchange',
      ]) {
        const response = await fetch(base + path, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: process.env.WEB_ORIGIN!,
          },
          body: '{}',
        });
        expect(response.status).toBe(410);
        expect(await response.json()).toMatchObject({
          ok: false,
          error: { code: 'CHECKOUT_FLOW_REPLACED' },
        });
      }
      const client = new Client({
        name: 'checkout-core-retirement-test',
        version: '1',
      });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(base + '/mcp'), {
          requestInit: {
            headers: {
              Authorization: `Bearer ${process.env.MCP_SERVICE_TOKEN}`,
            },
          },
        }),
      );
      try {
        expect(
          (await client.listTools()).tools.map((t) => t.name).sort(),
        ).not.toEqual(
          expect.arrayContaining([
            'prepare_checkout',
            'pay_order',
            'submit_order',
            'create_handoff',
          ]),
        );
        for (const name of [
          'create_cart',
          'prepare_checkout',
          'pay_purchase',
          'submit_order',
          'create_handoff',
        ]) {
          const response = await client.callTool({ name, arguments: {} });
          expect(response.structuredContent).toMatchObject({
            ok: false,
            error: { code: 'CHECKOUT_FLOW_REPLACED' },
          });
        }
      } finally {
        await client.close();
      }
    });
  },
);
