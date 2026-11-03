import {
  appResource,
  createResourceRegistrar,
} from '../../src/mcp/resources.js';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { z } from 'zod';
import { attachMcp } from '../../src/mcp/mcp.adapter.js';
import { createToolRegistrar } from '../../src/mcp/register-tools.js';
import type { CatalogService } from '../../src/catalog/catalog.service.js';
import type { CartService } from '../../src/cart/cart.service.js';

const listeners: Server[] = [];
const clients: Client[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(
    listeners
      .splice(0)
      .map(
        (listener) =>
          new Promise<void>((resolve) => listener.close(() => resolve())),
      ),
  );
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
async function connect(attach = attachMcp, mode: 'demo' | 'token' = 'demo') {
  const app = express();
  app.use(express.json());
  const listener = app.listen(0, '127.0.0.1');
  listeners.push(listener);
  await new Promise<void>((resolve) => listener.once('listening', resolve));
  const address = listener.address();
  if (!address || typeof address === 'string') throw Error('No address');
  const host = `127.0.0.1:${address.port}`;
  vi.stubEnv('MCP_AUTH_MODE', mode);
  vi.stubEnv('MCP_SERVICE_TOKEN', 'registration-service-token-for-tests');
  vi.stubEnv('MCP_ALLOWED_HOSTS', host);
  vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000');
  attach(app, {} as CatalogService, {} as CartService);
  const client = new Client({ name: 'registration-test', version: '1' });
  clients.push(client);
  await client.connect(
    new StreamableHTTPClientTransport(
      new URL(`http://${host}/mcp`),
      mode === 'token'
        ? {
            requestInit: {
              headers: {
                Authorization: 'Bearer registration-service-token-for-tests',
              },
            },
          }
        : {},
    ),
  );
  return { client, host };
}
it('preserves every committed discovery contract', async () => {
  const migrated = await connect();
  // Captured from the v2 cart-command adapter through the real SDK.
  const expected = JSON.parse(
    readFileSync(new URL('./tool-discovery.json', import.meta.url), 'utf8'),
  );
  expect(await migrated.client.listTools()).toEqual(expected);
});
it('rejects unregistered and invalid calls before maintenance', async () => {
  const beforeCall = vi.fn(async () => {});
  const { client } = await connect((app, catalog, carts) =>
    attachMcp(app, catalog, carts, beforeCall),
  );
  for (const name of ['prepare_checkout', 'unknown_tool']) {
    await expect(
      client.callTool({ name, arguments: {} }),
    ).rejects.toMatchObject({ code: -32602 });
  }
  const response = await client.callTool({ name: 'get_cart', arguments: {} });
  expect(response).toMatchObject({
    isError: true,
    content: [{ type: 'text', text: expect.any(String) }],
  });
  expect(response.structuredContent).toBeUndefined();
  expect(beforeCall).not.toHaveBeenCalled();
});

it('rejects historical resource URIs instead of serving current HTML', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-resources-'));
  for (const name of ['search-products', 'create-order'])
    writeFileSync(join(dir, `${name}-v9.html`), '<html>current UI</html>');
  vi.stubEnv('MCP_APPS_PATH', dir);
  const { client } = await connect();
  try {
    expect(
      (await client.readResource({ uri: 'ui://store/search-products-v9.html' }))
        .contents[0],
    ).toMatchObject({
      text: '<html>current UI</html>',
      mimeType: 'text/html;profile=mcp-app',
      _meta: { ui: { csp: { connectDomains: [] } } },
    });
    expect(
      (await client.listResources()).resources.map((r) => r.uri).sort(),
    ).toEqual([
      'ui://store/create-order-v9.html',
      'ui://store/search-products-v9.html',
    ]);
    for (const name of ['search-products', 'create-order']) {
      for (const version of ['v4', 'v5', 'v6', 'v7', 'v8']) {
        await expect(
          client.readResource({ uri: `ui://store/${name}-${version}.html` }),
        ).rejects.toThrow();
      }
    }

    for (const uri of [
      'ui://store/unknown.html',
      'file:///etc/passwd',
      'ui://store/../unknown.html',
      'ui://store/search-products-v999.html',
    ])
      await expect(client.readResource({ uri })).rejects.toThrow();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it('rejects duplicate registrations before a second handler replaces the first', () => {
  const tool = {
    name: 'example',
    description: 'Example',
    inputSchema: z.object({}),
    annotations: {},
    handler: () => ({}),
  };
  const register = createToolRegistrar(
    new McpServer({ name: 'test', version: '1' }),
    async () => {},
    () => {},
  );
  register(tool);
  expect(() => register(tool)).toThrow(/already registered/i);
});
it('preserves Host and Origin rejection in demo mode', async () => {
  const { host } = await connect();
  const response = await fetch(`http://${host}/mcp`, {
    headers: { Origin: 'https://untrusted.example' },
  });
  expect(response.status).toBe(403);
});

it('requires the token only when explicitly configured', async () => {
  const { host } = await connect(attachMcp, 'token');
  for (const authorization of [undefined, 'Bearer wrong']) {
    const response = await fetch(`http://${host}/mcp`, {
      headers: authorization ? { Authorization: authorization } : {},
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: 'ACCESS_DENIED' });
  }
});

it.each([false, true])(
  'discovers and invokes an independent tool with resource=%s through one registration',
  async (withResource) => {
    const echoInput = z
      .object({
        value: z
          .string()
          .default(' default ')
          .transform((value) => value.trim()),
      })
      .strict();
    const calls: string[] = [];
    const { client } = await connect((app) => {
      const handler = createMcpHandler(() => {
        const server = new McpServer({
          name: 'isolated-tool-test',
          version: '1',
        });
        const register = createToolRegistrar(
          server,
          async () => {},
          createResourceRegistrar(server, 'http://localhost:3000'),
        );
        const resource = appResource('independent_example');
        register({
          name: 'independent_example',
          description: 'Self-contained example',
          ...(withResource ? { resource, _meta: resource.metadata } : {}),
          inputSchema: echoInput,
          annotations: { readOnlyHint: true },
          handler: (input) => {
            const { value } = input;
            calls.push(value);
            return { echoed: value };
          },
        });
        return server;
      });
      const handle = toNodeHandler(handler);
      app.all('/mcp', async (request, response) => {
        await handle(request, response, request.body);
      });
    });
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual([
      'independent_example',
    ]);
    expect(
      await client.callTool({
        name: 'independent_example',
        arguments: { value: ' works ' },
      }),
    ).toMatchObject({
      structuredContent: { ok: true, data: { echoed: 'works' } },
    });
    expect(calls).toEqual(['works']);
    expect(
      await client.callTool({
        name: 'independent_example',
        arguments: { value: 42 },
      }),
    ).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: expect.any(String) }],
    });
    expect(calls).toEqual(['works']);
    expect(
      await client.callTool({ name: 'independent_example', arguments: {} }),
    ).toMatchObject({
      structuredContent: { ok: true, data: { echoed: 'default' } },
    });
    expect(calls).toEqual(['works', 'default']);
    const resources = withResource
      ? (await client.listResources()).resources
      : [];
    if (!withResource)
      expect(client.getServerCapabilities()?.resources).toBeUndefined();
    expect(resources.map((resource) => resource.uri)).toEqual(
      withResource ? ['ui://store/independent-example-v9.html'] : [],
    );
  },
);

it.each(['tool', 'maintenance', 'unknown'] as const)(
  'keeps %s failure ownership across the protocol boundary',
  async (source) => {
    const { AppError } = await import('../../src/shared/app-error.js');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const id = '00000000-0000-4000-8000-000000000001';
    const error =
      source === 'unknown'
        ? new Error('private database credential')
        : new AppError('SPEC_MISMATCH', 422, {
            constraintViolations: [
              { field: 'color', expected: 'red', actual: 'blue' },
            ],
          });
    const createOrder = vi.fn(async () => {
      throw error;
    });
    const { client } = await connect((app, catalog) =>
      attachMcp(
        app,
        catalog,
        { createOrder } as unknown as CartService,
        async () => {
          if (source === 'maintenance') throw error;
        },
      ),
    );
    const response = await client.callTool({
      name: 'create_order',
      arguments: {
        cartId: id,
        requestId: id,
        selectedItems: [{ productId: 'P001', quantity: 1 }],
        constraints: { currency: 'TWD' },
      },
    });
    const content = response.structuredContent as Record<string, unknown>;
    expect(response).toMatchObject({
      isError: true,
      structuredContent: {
        ok: false,
        requestId: expect.any(String),
        environment: { mode: 'simulation' },
        error: {
          code:
            source === 'unknown' ? 'TEMPORARY_UNAVAILABLE' : 'SPEC_MISMATCH',
          retryable: source === 'unknown',
        },
        recovery: expect.stringContaining(
          source === 'tool'
            ? '商品原文规格'
            : source === 'maintenance'
              ? '操作未完成'
              : '结果可能未知',
        ),
      },
    });
    expect(response.content).toEqual([
      { type: 'text', text: JSON.stringify(content) },
    ]);
    if (source === 'unknown') {
      expect(log).toHaveBeenCalledExactlyOnceWith({
        event: 'service_failure',
        requestId: content.requestId,
        operation: 'mcp.create_order',
        category: 'UnknownError',
      });
      expect(JSON.stringify(response)).not.toContain(
        'private database credential',
      );
    } else {
      expect(content.error).toMatchObject({
        constraintViolations: [
          { field: 'color', expected: 'red', actual: 'blue' },
        ],
      });
      expect(log).not.toHaveBeenCalled();
    }
    expect(createOrder).toHaveBeenCalledTimes(source === 'maintenance' ? 0 : 1);
    log.mockRestore();
  },
);

it.each(['demo', 'token'] as const)(
  'request-result bypasses maintenance after %s authentication and preserves technical errors',
  async (mode) => {
    const beforeCall = vi.fn(async () => {
      throw new Error('maintenance must not run');
    });
    const requestResult = vi
      .fn()
      .mockResolvedValueOnce({ status: 'not_found', kind: 'initialize' })
      .mockRejectedValueOnce(new Error('private connection failure'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, host } = await connect(
      (app, catalog) =>
        attachMcp(
          app,
          catalog,
          { requestResult } as unknown as CartService,
          beforeCall,
        ),
      mode,
    );
    const args = {
      kind: 'initialize',
      requestId: '00000000-0000-4000-8000-000000000001',
    };
    expect(
      await client.callTool({ name: 'get_request_result', arguments: args }),
    ).toMatchObject({
      structuredContent: {
        ok: true,
        data: { status: 'not_found', kind: 'initialize' },
      },
    });
    expect(
      await client.callTool({ name: 'get_request_result', arguments: args }),
    ).toMatchObject({
      isError: true,
      structuredContent: {
        ok: false,
        error: { code: 'TEMPORARY_UNAVAILABLE' },
      },
    });
    expect(
      await client.callTool({
        name: 'get_request_result',
        arguments: { ...args, execute: true },
      }),
    ).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: expect.any(String) }],
    });
    expect(beforeCall).not.toHaveBeenCalled();
    expect(requestResult).toHaveBeenCalledTimes(2);
    if (mode === 'token')
      expect(
        (
          await fetch(`http://${host}/mcp`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: { name: 'get_request_result', arguments: args },
            }),
          })
        ).status,
      ).toBe(401);
    expect(requestResult).toHaveBeenCalledTimes(2);
    log.mockRestore();
  },
);
