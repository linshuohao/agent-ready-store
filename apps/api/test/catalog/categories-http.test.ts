import 'reflect-metadata';
import { request as httpRequest } from 'node:http';
import { describe, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { CatalogController } from '../../src/catalog/catalog.controller.js';
import { CatalogService } from '../../src/catalog/catalog.service.js';
import { Catalog } from '../../src/catalog/catalog.js';
import { attachMcp } from '../../src/mcp/mcp.adapter.js';
import type { CartService } from '../../src/cart/cart.service.js';
import { requestMaintenance } from '../../src/request-maintenance.js';
import { readFileSync } from 'node:fs';

it('HTTP and MCP category discovery bypass maintenance but retain validation and auth', async () => {
  const catalog = new Catalog(readFileSync('references/products.json', 'utf8'));
  const service = Object.create(CatalogService.prototype) as CatalogService;
  Object.defineProperty(service, 'catalog', { value: catalog });
  const stock = vi
    .spyOn(service, 'stock')
    .mockRejectedValue(new Error('db offline'));
  const module = await Test.createTestingModule({
    controllers: [CatalogController],
    providers: [{ provide: CatalogService, useValue: service }],
  }).compile();
  // Test module must not disconnect an intentionally absent database.
  service.onModuleDestroy = async () => {};
  const app = module.createNestApplication<NestExpressApplication>();
  app.use(
    '/api/v1',
    requestMaintenance(async () => {
      throw new Error('db offline');
    }),
  );
  const maintenance = vi.fn(async () => {
    throw new Error('db offline');
  });
  vi.stubEnv('MCP_SERVICE_TOKEN', 'isolated-category-test-token-12345');
  vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000');
  const server = app.getHttpServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('No listen address');
  const base = `http://127.0.0.1:${address.port}`;
  vi.stubEnv('MCP_ALLOWED_HOSTS', new URL(base).host);
  attachMcp(
    app.getHttpAdapter().getInstance(),
    service,
    {} as CartService,
    maintenance,
  );
  const client = new Client({ name: 'category-test', version: '1' });
  try {
    await app.init();
    const headers = {
      Authorization: 'Bearer isolated-category-test-token-12345',
    };
    for (const path of [
      '/catalog/categories',
      '/catalog/categories/',
      '/CATALOG/CATEGORIES',
    ]) {
      const response = await fetch(`${base}/api/v1${path}?limit=1`);
      expect(response.status).toBe(200);
      expect((await response.json()).data).toEqual(
        catalog.categories({ limit: 1 }),
      );
    }
    expect(
      (await fetch(`${base}/api/v1/catalog/categories`, { method: 'HEAD' }))
        .status,
    ).toBe(200);
    expect(
      (await fetch(`${base}/api/v1/catalog/categories?offset=1`)).status,
    ).toBe(400);
    expect((await fetch(`${base}/api/v1/products`)).status).toBe(503);
    expect(
      (await fetch(`${base}/api/v1/catalog/categories`, { method: 'POST' }))
        .status,
    ).toBe(503);
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers },
      }),
    );
    const tools = await client.listTools();
    const tool = tools.tools.find((t) => t.name === 'list_product_categories');
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(tool?._meta).toBeUndefined();
    expect(
      tools.tools.find((t) => t.name === 'search_products')?._meta,
    ).toBeDefined();
    const response = await client.callTool({
      name: 'list_product_categories',
      arguments: { limit: 1 },
    });
    expect(response.structuredContent).toMatchObject({
      ok: true,
      data: catalog.categories({ limit: 1 }),
    });
    const invalid = await client.callTool({
      name: 'list_product_categories',
      arguments: { extra: true },
    });
    expect(invalid.isError).toBe(true);
    expect(maintenance).not.toHaveBeenCalled();
    expect(stock).not.toHaveBeenCalled();
    expect(
      (await client.callTool({ name: 'query_products', arguments: {} }))
        .isError,
    ).toBe(true);
    expect(maintenance).toHaveBeenCalledOnce();
    const failing = vi.spyOn(service, 'categories').mockImplementation(() => {
      throw new Error('catalog unavailable');
    });
    const unavailable = await fetch(`${base}/api/v1/catalog/categories`);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({
      ok: false,
      error: { code: 'TEMPORARY_UNAVAILABLE' },
    });
    expect(
      (
        await client.callTool({
          name: 'list_product_categories',
          arguments: {},
        })
      ).structuredContent,
    ).toMatchObject({ ok: false, error: { code: 'TEMPORARY_UNAVAILABLE' } });
    failing.mockRestore();
    for (const badHeaders of [
      {},
      { ...headers, Origin: 'https://evil.invalid' },
      { ...headers, Host: 'evil.invalid' },
    ]) {
      const status = await new Promise<number>((resolve, reject) => {
        const req = httpRequest(
          `${base}/mcp`,
          {
            method: 'POST',
            headers: { ...badHeaders, 'Content-Type': 'application/json' },
          },
          (res) => {
            res.resume();
            res.on('end', () => resolve(res.statusCode!));
          },
        );
        req.on('error', reject);
        req.end('{}');
      });
      expect([401, 403]).toContain(status);
    }
  } finally {
    await client.close();
    await app.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  }
});
