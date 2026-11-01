import {
  appResource,
  createResourceRegistrar,
} from '../../src/mcp/resources.js';
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { parseToolInput } from '../../src/mcp/tool-input.js';
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
  // Captured from committed pre-refactor adapter faeaeca, compared through real SDK.
  const expected = JSON.parse(
    readFileSync(new URL('./tool-discovery.json', import.meta.url), 'utf8'),
  );
  expect(await migrated.client.listTools()).toEqual(expected);
});
it('keeps retired, unknown and invalid-input failures inside the existing envelope', async () => {
  const { client } = await connect();
  for (const [name, code] of [
    ['prepare_checkout', 'CHECKOUT_FLOW_REPLACED'],
    ['unknown_tool', 'VALIDATION_ERROR'],
    ['get_cart', 'VALIDATION_ERROR'],
  ]) {
    const response = await client.callTool({ name, arguments: {} });
    expect(response).toMatchObject({
      isError: true,
      structuredContent: {
        ok: false,
        error: { code },
        environment: { mode: 'simulation' },
      },
    });
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
  expect(() => register(tool)).toThrow('Duplicate');
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
    const echoInput = z.object({ value: z.string() }).strict();
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
            const { value } = parseToolInput(echoInput, input);
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
        arguments: { value: 'works' },
      }),
    ).toMatchObject({
      structuredContent: { ok: true, data: { echoed: 'works' } },
    });
    expect(calls).toEqual(['works']);
    expect(
      await client.callTool({ name: 'independent_example', arguments: {} }),
    ).toMatchObject({
      isError: true,
      structuredContent: { error: { code: 'VALIDATION_ERROR' } },
    });
    expect(calls).toEqual(['works']);
    const resources = (await client.listResources()).resources;
    expect(resources.map((resource) => resource.uri)).toEqual(
      withResource ? ['ui://store/independent-example-v8.html'] : [],
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
        expectedCartVersion: 1,
        selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
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
