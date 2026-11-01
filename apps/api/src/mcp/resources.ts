import { mcpAppVersion, mcpCachedAppVersions } from '@store/contracts';
import type { McpServer } from '@modelcontextprotocol/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Resource ownership is declared by the tool, not inferred from its name. */
export function appResource(tool: string) {
  const basename = tool.replaceAll('_', '-');
  const uri = `ui://store/${basename}-${mcpAppVersion}.html`;
  return {
    tool,
    uri,
    filename: `${basename}-${mcpAppVersion}.html`,
    cachedUris: mcpCachedAppVersions.map(
      (version) => `ui://store/${basename}-${version}.html`,
    ),
    metadata: {
      ui: { resourceUri: uri, visibility: ['model', 'app'] },
      'ui/resourceUri': uri,
      'openai/outputTemplate': uri,
    },
  };
}
export type AppResource = ReturnType<typeof appResource>;

export function createResourceRegistrar(server: McpServer, origin: string) {
  const resources: AppResource[] = [];
  server.server.registerCapabilities({ resources: {} });
  server.server.setRequestHandler('resources/list', async () => ({
    resources: resources.map(({ uri, tool }) => ({
      uri,
      name: `Store · ${tool}`,
      mimeType: 'text/html;profile=mcp-app',
    })),
  }));
  server.server.setRequestHandler('resources/read', async ({ params }) => {
    const resource = resources.find(
      (entry) =>
        entry.uri === params.uri || entry.cachedUris.includes(params.uri),
    );
    if (!resource) throw new Error('Unknown UI resource');
    return {
      contents: [
        {
          uri: params.uri,
          mimeType: 'text/html;profile=mcp-app',
          text: await readFile(
            process.env.MCP_APPS_PATH
              ? resolve(process.env.MCP_APPS_PATH, resource.filename)
              : new URL(`../mcp-app/${resource.filename}`, import.meta.url),
            'utf8',
          ),
          _meta: {
            'openai/widgetCSP': {
              connect_domains: [],
              resource_domains: [],
              redirect_domains: [origin],
            },
            ui: {
              csp: {
                connectDomains: [],
                resourceDomains: [],
                frameDomains: [],
              },
            },
          },
        },
      ],
    };
  });
  return (resource: AppResource) => {
    if (resources.some((entry) => entry.uri === resource.uri))
      throw new Error(`Duplicate resource: ${resource.uri}`);
    resources.push(resource);
  };
}
