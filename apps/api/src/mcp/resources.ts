import { mcpAppVersion } from '@store/contracts';
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
    metadata: {
      ui: { resourceUri: uri, visibility: ['model', 'app'] },
      'ui/resourceUri': uri,
      'openai/outputTemplate': uri,
    },
  };
}
export type AppResource = ReturnType<typeof appResource>;

export function createResourceRegistrar(server: McpServer, origin: string) {
  return (resource: AppResource) =>
    server.registerResource(
      `Store · ${resource.tool}`,
      resource.uri,
      { mimeType: 'text/html;profile=mcp-app' },
      async (uri) => {
        return {
          contents: [
            {
              uri: uri.href,
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
      },
    );
}
