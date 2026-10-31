import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server as HttpServer } from 'node:http';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import type { ElicitResult } from '@modelcontextprotocol/server';
import { attachMcp } from '../../src/mcp/mcp.adapter.js';
import { Catalog } from '../../src/catalog/catalog.js';
import { readFileSync } from 'node:fs';
import type { CatalogService } from '../../src/catalog/catalog.service.js';
import type { CartService } from '../../src/cart/cart.service.js';

let listener: HttpServer | undefined;
afterEach(async () => {
  if (listener)
    await new Promise<void>((resolve) => listener!.close(() => resolve()));
  listener = undefined;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('MCP protocol migration', () => {
  it.each([
    { mode: 'legacy' as const, action: 'accept' as const, scenario: 'normal' },
    { mode: 'auto' as const, action: 'accept' as const, scenario: 'normal' },
    ...[
      'normal',
      'decline',
      'cancel',
      'invalid',
      'missing',
      'sold-out',
      'two-groups',
      'unsupported',
      'reserved-id',
      'proto-id',
      'tamper',
      'changed-args',
      'expired',
      'price-change',
      'too-many',
      'explicit',
      'timeout',
      'disconnected',
    ].map((scenario) => ({
      mode: { pin: '2026-07-28' } as const,
      action:
        scenario === 'decline'
          ? ('decline' as const)
          : scenario === 'cancel'
            ? ('cancel' as const)
            : ('accept' as const),
      scenario,
    })),
  ])(
    'serves tools through the real SDK with negotiation %j',
    async ({ mode, action, scenario }) => {
      const app = express();
      app.use(express.json());
      const token = 'isolated-protocol-test-token-12345';
      vi.stubEnv('MCP_SERVICE_TOKEN', token);
      vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000');
      listener = app.listen(0, '127.0.0.1');
      await new Promise<void>((resolve) =>
        listener!.once('listening', resolve),
      );
      const address = listener.address();
      if (!address || typeof address === 'string')
        throw new Error('No address');
      const host = `127.0.0.1:${address.port}`;
      vi.stubEnv('MCP_ALLOWED_HOSTS', host);
      const raw = JSON.parse(readFileSync('references/products.json', 'utf8'));
      raw.products = ['A', 'B'].map((id) => ({
        ...raw.products[0],
        id,
        name: '藍牙耳機',
        price: 100,
        stock: 2,
      }));
      if (scenario === 'too-many')
        raw.products = Array.from({ length: 11 }, (_, i) => ({
          ...raw.products[0],
          id: String(i),
        }));
      let catalog = new Catalog(JSON.stringify(raw));
      const inventory = new Map<string, number>(
        raw.products.map((p: { id: string }) => [p.id, 2]),
      );
      attachMcp(
        app,
        {
          get catalog() {
            return catalog;
          },
          stock: async () => inventory,
        } as CatalogService,
        {} as CartService,
      );
      const client = new Client(
        { name: 'upgrade-test', version: '1' },
        {
          versionNegotiation: { mode },
          capabilities:
            scenario === 'unsupported' ? {} : { elicitation: { form: {} } },
        },
      );
      const abort = new AbortController();
      let prompts = 0;
      if (scenario !== 'unsupported')
        client.setRequestHandler(
          'elicitation/create',
          async (): Promise<ElicitResult> => {
            prompts++;
            if (scenario === 'timeout')
              return new Promise<never>((_resolve, reject) =>
                setTimeout(() => reject(new Error('Host input timed out')), 20),
              );
            if (scenario === 'price-change') {
              raw.products[1].price = 110;
              catalog = new Catalog(JSON.stringify(raw));
            }
            if (scenario === 'sold-out') inventory.set('B', 0);
            return {
              action,
              ...(action === 'accept'
                ? {
                    content:
                      scenario === 'missing'
                        ? {}
                        : scenario === 'two-groups'
                          ? { choice_1: 'A', choice_2: 'B' }
                          : {
                              choice_1:
                                scenario === 'invalid' ? 'unknown' : 'B',
                            },
                  }
                : {}),
            };
          },
        );
      try {
        await client.connect(
          new StreamableHTTPClientTransport(new URL(`http://${host}/mcp`), {
            requestInit: { headers: { Authorization: `Bearer ${token}` } },
            fetch: async (url, init) => {
              if (typeof init?.body === 'string') {
                const body = JSON.parse(init.body);
                if (body.params?.requestState) {
                  if (scenario === 'disconnected')
                    throw new TypeError(
                      'Simulated lost continuation transport',
                    );
                  if (scenario === 'tamper') body.params.requestState += 'x';
                  if (scenario === 'changed-args')
                    body.params.arguments.queries[0].q = '水瓶';
                  if (scenario === 'expired') {
                    const now = Date.now();
                    vi.spyOn(Date, 'now').mockReturnValue(now + 601000);
                  }
                  init = { ...init, body: JSON.stringify(body) };
                }
              }
              return fetch(url, init);
            },
          }),
        );
        expect(client.getProtocolEra()).toBe(
          mode === 'legacy' ? 'legacy' : 'modern',
        );
        const tools = await client.listTools();
        expect(tools.tools.some((tool) => tool.name === 'query_products')).toBe(
          true,
        );
        expect(
          tools.tools.every((tool) => tool.inputSchema.type === 'object'),
        ).toBe(true);
        const resources = await client.listResources();
        expect(resources.resources).toHaveLength(2);
        const invalid = await client.callTool({
          name: 'get_product',
          arguments: {},
        });
        expect(invalid.isError).toBe(true);
        const selection = client.callTool(
          {
            name: 'resolve_product_choices',
            arguments: {
              ...(scenario === 'explicit' ? { choices: { audio: 'B' } } : {}),
              queries: [
                {
                  id:
                    scenario === 'reserved-id'
                      ? 'constructor'
                      : scenario === 'proto-id'
                        ? '__proto__'
                        : 'audio',
                  q: '蓝牙',
                },
                ...(scenario === 'two-groups'
                  ? [{ id: 'second', q: '蓝牙' }]
                  : []),
              ],
            },
          },
          { signal: abort.signal, timeout: 1000 },
        );
        if (['timeout', 'disconnected'].includes(scenario)) {
          await expect(selection).rejects.toThrow();
          expect(prompts).toBe(1);
          return;
        }
        if (['tamper', 'expired'].includes(scenario)) {
          await expect(selection).rejects.toThrow(
            'Invalid or expired requestState',
          );
          expect(prompts).toBe(1);
          return;
        }
        const selected = await selection;
        if (scenario === 'changed-args') {
          expect(selected.structuredContent).toMatchObject({
            ok: false,
            error: { code: 'VALIDATION_ERROR' },
          });
          expect(prompts).toBe(1);
          return;
        }
        expect(selected.structuredContent).toMatchObject({
          ok: true,
          data: {
            kind:
              mode === 'legacy' ||
              [
                'invalid',
                'missing',
                'sold-out',
                'unsupported',
                'price-change',
                'too-many',
              ].includes(scenario)
                ? 'selection_required'
                : action !== 'accept'
                  ? 'selection_cancelled'
                  : 'selection_resolved',
          },
        });
        expect(prompts).toBe(
          mode === 'legacy' ||
            ['unsupported', 'too-many', 'explicit'].includes(scenario)
            ? 0
            : 1,
        );
      } finally {
        await client.close();
      }
    },
  );
});
