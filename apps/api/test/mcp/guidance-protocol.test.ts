import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { attachMcp } from '../../src/mcp/mcp.adapter.js';
import type { CatalogService } from '../../src/catalog/catalog.service.js';
import type { CartService } from '../../src/cart/cart.service.js';

// Real HTTP/MCP discovery and result delivery, with a read-only catalog fixture.
// No database or shopping mutations are performed.
describe('MCP guidance wire compatibility', () => {
  let server: Server, client: Client;
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('Missing address');
    const host = `127.0.0.1:${address.port}`;
    vi.stubEnv('MCP_SERVICE_TOKEN', 'read-only-guidance-test-token');
    vi.stubEnv('MCP_ALLOWED_HOSTS', host);
    vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000');
    const catalog = {
      discover: async () => ({
        items: [],
        total: 0,
        nextOffset: null,
        catalogRevision: 'fixture',
      }),
    } as unknown as CatalogService;
    attachMcp(app, catalog, {} as CartService);
    client = new Client({ name: 'guidance-wire-test', version: '1' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://${host}/mcp`), {
        requestInit: {
          headers: { Authorization: 'Bearer read-only-guidance-test-token' },
        },
      }),
    );
  });
  afterAll(async () => {
    await client?.close();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    vi.unstubAllEnvs();
  });
  it('keeps UI association limited to the two final entry tools and exposes filter semantics', async () => {
    const { tools } = await client.listTools();
    expect(
      tools
        .filter((t) => t._meta?.['ui/resourceUri'])
        .map((t) => t.name)
        .sort(),
    ).toEqual(['create_order', 'search_products']);
    const schema = tools.find((t) => t.name === 'query_products')!.inputSchema;
    const encoded = JSON.stringify(schema);
    expect(encoded).toContain('精确匹配');
    expect(
      tools.find((t) => t.name === 'query_products')?._meta?.['ui/resourceUri'],
    ).toBeUndefined();
  });
  it('delivers the same simulation envelope in model-readable text and structured content', async () => {
    const response = await client.callTool({
      name: 'query_products',
      arguments: { q: 'earphones' },
    });
    expect(response.structuredContent).toMatchObject({
      ok: true,
      data: { items: [] },
      environment: {
        mode: 'simulation',
        realPayment: false,
        fulfillment: false,
      },
    });
    const content = response.content as Array<{ type: string; text?: string }>;
    expect(JSON.parse(content[0].text!)).toEqual(response.structuredContent);
  });
});
