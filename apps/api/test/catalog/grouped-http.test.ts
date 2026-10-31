import { describe, it, expect } from 'vitest';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
const base = process.env.API_BASE_URL,
  token = process.env.MCP_SERVICE_TOKEN;
(base && token ? describe : describe.skip)(
  'read-only grouped HTTP/MCP against real inventory',
  () => {
    it('returns identical groups across modern/legacy MCP and HTTP and rejects hostile origins', async () => {
      const input = {
        queries: [
          { id: 'audio', q: 'Bluetooth', limit: 2 },
          { id: 'bottle', q: '保温杯', limit: 2 },
        ],
      };
      const http = await fetch(`${base}/api/v1/products/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: process.env.WEB_ORIGIN!,
        },
        body: JSON.stringify(input),
      });
      expect(http.status).toBe(200);
      const expected = await http.json();
      expect(expected.ok).toBe(true);
      expect(expected.data.groups).toHaveLength(2);
      for (const mode of ['legacy', { pin: '2026-07-28' }] as const) {
        const client = new Client(
          { name: 'grouped-read-only-test', version: '1' },
          { versionNegotiation: { mode } },
        );
        try {
          await client.connect(
            new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
              requestInit: { headers: { Authorization: `Bearer ${token}` } },
            }),
          );
          const resources = await client.listResources();
          const resource = await client.readResource({
            uri: resources.resources[0].uri,
          });
          expect(resource.contents[0].mimeType).toBe(
            'text/html;profile=mcp-app',
          );
          const r = await client.callTool({
            name: 'query_products',
            arguments: input,
          });
          expect(r.structuredContent).toMatchObject({
            ok: true,
            data: expected.data,
          });
          const invalid = await client.callTool({
            name: 'query_products',
            arguments: { queries: [{ id: 'a', offset: 1 }] },
          });
          expect(invalid.structuredContent).toMatchObject({
            ok: false,
            error: { code: 'VALIDATION_ERROR' },
          });
        } finally {
          await client.close();
        }
      }
      const denied = await fetch(`${base}/api/v1/products/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://evil.invalid',
        },
        body: JSON.stringify(input),
      });
      expect(denied.status).toBe(403);
    });
  },
);
