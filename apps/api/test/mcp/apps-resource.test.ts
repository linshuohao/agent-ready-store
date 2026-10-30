import { request as httpRequest } from 'node:http';
import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const base = process.env.API_BASE_URL;
const token = process.env.MCP_SERVICE_TOKEN;
(base && token ? describe : describe.skip)('Apps resource probe', () => {
  it('associates the read-only search tool with a static isolated HTML resource', async () => {
    const client = new Client({
      name: 's6-resource-probe-test',
      version: '0.0.0',
    });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      }),
    );
    try {
      const tool = (await client.listTools()).tools.find(
        (tool) => tool.name === 'search_products',
      );
      expect(tool?._meta?.ui).toMatchObject({
        resourceUri: 'ui://store/search-products-v1.html',
      });
      expect(tool?._meta?.['ui/resourceUri']).toBe(
        'ui://store/search-products-v1.html',
      );
      const resource = await client.readResource({
        uri: 'ui://store/search-products-v1.html',
      });
      const html = resource.contents[0];
      expect(html.mimeType).toBe('text/html;profile=mcp-app');
      if (!('text' in html)) throw new Error('Expected a text UI resource');
      expect(html.text).toContain('Agent-Ready Store');
      const resources = (await client.listResources()).resources;
      expect(resources).toHaveLength(8);
      const tools = (await client.listTools()).tools;
      expect(tools).toHaveLength(15);
      for (const resource of resources) {
        const entry = tools.find(
          (tool) =>
            (tool._meta?.ui as { resourceUri?: string })?.resourceUri ===
            resource.uri,
        )!;
        expect(entry).toBeDefined();
        const result = await client.readResource({ uri: resource.uri });
        const value = result.contents[0];
        if (!('text' in value)) throw new Error('Expected text resource');
        expect(value.text.includes(`data-entry-tool="${entry.name}"`)).toBe(
          true,
        );
        expect(value.text.includes(token!)).toBe(false);
        expect(value.text.match(/<\/script\s*>/gi)).toHaveLength(1);
        expect(value._meta).toEqual({
          'openai/widgetCSP': {
            connect_domains: [],
            resource_domains: [],
            redirect_domains: [
              process.env.WEB_ORIGIN ?? 'http://localhost:3000',
            ],
          },
          ui: {
            csp: { connectDomains: [], resourceDomains: [], frameDomains: [] },
          },
        });
      }
      expect(
        tools.find((tool) => tool.name === 'list_product_reviews')?._meta,
      ).toBeUndefined();
      expect(html.text.match(/<\/script\s*>/gi)).toHaveLength(1);
      expect(html.text).not.toContain('src="/main.js"');
      expect(html.text).not.toContain(token!);
      await expect(
        client.readResource({ uri: 'ui://store/unknown.html' }),
      ).rejects.toThrow();
    } finally {
      await client.close();
    }
  });
  it('rejects unauthenticated resource requests and untrusted origins/hosts', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'resources/read',
      params: { uri: 'ui://store/get-cart-v1.html' },
    };
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    expect(
      (
        await fetch(`${base}/mcp`, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await fetch(`${base}/mcp`, {
          method: 'POST',
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
            Origin: 'https://untrusted.example',
          },
          body: JSON.stringify(request),
        })
      ).status,
    ).toBe(403);
    const rejectedHost = await new Promise<number | undefined>(
      (resolve, reject) => {
        const req = httpRequest(
          `${base}/mcp`,
          {
            method: 'POST',
            headers: {
              ...headers,
              Authorization: `Bearer ${token}`,
              Host: 'untrusted.example',
            },
          },
          (res) => {
            res.resume();
            resolve(res.statusCode);
          },
        );
        req.on('error', reject);
        req.end(JSON.stringify(request));
      },
    );
    expect(rejectedHost).toBe(403);
  });
});
