import { ToolError } from './tool-error.js';
import type { AppResource } from './resources.js';
import {
  McpServer,
  isInputRequiredResult,
  type ServerContext,
  type Tool,
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import { result } from '../shared/result.js';
import { mcpResult } from './result-guidance.js';

export type ToolDefinition<T> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<T>;
  annotations: Tool['annotations'];
  _meta?: Record<string, unknown>;
  skipMaintenance?: boolean;
  resource?: AppResource;
  handler: (input: T, context: ServerContext) => unknown | Promise<unknown>;
};

export function createToolRegistrar(
  server: McpServer,
  beforeCall: () => Promise<void>,
  registerResource: (resource: AppResource) => void,
) {
  return <T>(tool: ToolDefinition<T>) => {
    const registered = server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
        _meta: tool._meta,
      },
      async (input, context) => {
        let toolRecovery: string | undefined;
        const response = await result(async () => {
          if (!tool.skipMaintenance) await beforeCall();
          try {
            return await tool.handler(input, context);
          } catch (error) {
            if (error instanceof ToolError) toolRecovery = error.recovery;
            throw error;
          }
        }, `mcp.${tool.name}`);
        if (response.ok && isInputRequiredResult(response.data))
          return response.data;
        const output = mcpResult(response, toolRecovery);
        return {
          isError: !response.ok,
          structuredContent: output,
          content: [{ type: 'text' as const, text: JSON.stringify(output) }],
        };
      },
    );
    if (tool.resource) registerResource(tool.resource);
    return registered;
  };
}
