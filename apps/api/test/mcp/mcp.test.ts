import { request as httpRequest } from 'node:http';
import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
const base = process.env.API_BASE_URL;
const token = process.env.MCP_SERVICE_TOKEN;
(base && token ? describe : describe.skip)(
  'real Streamable HTTP adapter',
  () => {
    it('discovers lifecycle tools without payment or obsolete purchase tools and matches catalog HTTP data and errors', async () => {
      const client = new Client({ name: 's1-contract-test', version: '1.0.0' });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
          requestInit: { headers: { Authorization: `Bearer ${token}` } },
        }),
      );
      try {
        const tools = await client.listTools();
        expect(tools.tools.map((t) => t.name).sort()).toEqual([
          'add_cart_item',
          'apps_create_order',
          'apps_get_or_create_cart',
          'apps_pay_order',
          'cancel_order',
          'create_order',
          'get_cart',
          'get_or_create_cart',
          'get_order',
          'get_product',
          'list_orders',
          'list_product_categories',
          'list_product_reviews',
          'query_products',
          'quote_selection',
          'remove_cart_item',
          'resolve_product_choices',
          'search_products',
          'update_cart_item',
        ]);
        const schemas = new Map(
          tools.tools.map((tool) => [tool.name, tool.inputSchema]),
        );
        expect(schemas.get('get_or_create_cart')).toMatchObject({
          type: 'object',
          anyOf: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                initialItems: expect.objectContaining({ minItems: 1 }),
              }),
            }),
          ]),
        });
        expect(schemas.get('create_order')).toMatchObject({
          type: 'object',
          additionalProperties: false,
          required: expect.arrayContaining([
            'cartId',
            'requestId',
            'expectedCartVersion',
            'selectedItems',
            'constraints',
          ]),
        });
        expect(schemas.get('cancel_order')).toMatchObject({
          required: ['orderId'],
          additionalProperties: false,
        });
        expect(
          tools.tools.find((tool) => tool.name === 'create_order')?.annotations
            ?.readOnlyHint,
        ).toBe(false);
        const uiOnly = tools.tools.filter((tool) =>
          tool.name.startsWith('apps_'),
        );
        expect(uiOnly).toHaveLength(3);
        for (const tool of uiOnly)
          expect(tool._meta?.ui).toEqual({ visibility: ['app'] });
        expect(
          tools.tools
            .filter((tool) => !tool.name.startsWith('apps_'))
            .some((tool) => /pay/.test(tool.name)),
        ).toBe(false);
        expect(
          tools.tools
            .filter((t) =>
              [
                'get_product',
                'search_products',
                'list_product_reviews',
                'get_cart',
              ].includes(t.name),
            )
            .every((t) => t.annotations?.readOnlyHint),
        ).toBe(true);
        for (const [tool, args, path] of [
          ['search_products', { limit: 2 }, '/api/v1/products?limit=2'],
          [
            'list_product_categories',
            { limit: 2 },
            '/api/v1/catalog/categories?limit=2',
          ],
          ['query_products', { limit: 2 }, '/api/v1/products?limit=2'],
          ['get_product', { productId: 'P005' }, '/api/v1/products/P005'],
          [
            'get_product',
            { productId: 'P001', unknown: 'x' },
            '/api/v1/products/P001?unknown=x',
          ],
          [
            'list_product_reviews',
            { productId: 'P005', limit: 1 },
            '/api/v1/products/P005/reviews?limit=1',
          ],
          ['search_products', { limit: 51 }, '/api/v1/products?limit=51'],
          [
            'search_products',
            { catalogRevision: 'old' },
            '/api/v1/products?catalogRevision=old',
          ],
        ] as const) {
          const mcp = await client.callTool({ name: tool, arguments: args });
          const http = await (await fetch(`${base}${path}`)).json();
          const structured = mcp.structuredContent as Record<string, unknown>;
          expect(structured.ok).toBe(http.ok);
          if (http.ok) expect(structured.data).toEqual(http.data);
          else expect(structured.error).toEqual(http.error);
        }
      } finally {
        await client.close();
      }
    });
    it('rejects missing identity, forged Host and hostile Origin before parsing protocol input', async () => {
      for (const [headers, status] of [
        [{}, 401],
        [{ Authorization: `Bearer ${token}`, Host: 'evil.example' }, 403],
        [
          { Authorization: `Bearer ${token}`, Origin: 'https://evil.example' },
          403,
        ],
      ] as const) {
        const response = await new Promise<{ status: number; body: string }>(
          (resolve, reject) => {
            const req = httpRequest(
              `${base}/mcp`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
              },
              (res) => {
                let body = '';
                res.on('data', (chunk) => {
                  body += chunk;
                });
                res.on('end', () => resolve({ status: res.statusCode!, body }));
              },
            );
            req.on('error', reject);
            req.end('{}');
          },
        );
        expect(response.status).toBe(status);
        expect(response.body).not.toContain(token!);
      }
    });
  },
);
