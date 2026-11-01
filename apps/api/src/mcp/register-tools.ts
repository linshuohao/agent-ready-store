import { ToolError } from './tool-error.js';
import type { AppResource } from './resources.js';
import {
  McpServer,
  isInputRequiredResult,
  type ServerContext,
  type Tool,
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import { AppError } from '../shared/app-error.js';
import { result } from '../shared/result.js';
import { mcpResult } from './result-guidance.js';

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  annotations: Tool['annotations'];
  _meta?: Record<string, unknown>;
  skipMaintenance?: boolean;
  resource?: AppResource;
  handler: (
    input: unknown,
    context: ServerContext,
  ) => unknown | Promise<unknown>;
};

const retiredTools = new Set([
  'prepare_checkout',
  'get_purchase_status',
  'pay_purchase',
  'cancel_app_purchase',
  'get_order_link',
  'request_purchase_confirmation',
  'submit_order',
  'cancel_purchase',
  'create_cart',
  'update_cart',
  'create_handoff',
]);

export function createToolRegistrar(
  server: McpServer,
  beforeCall: () => Promise<void>,
  registerResource: (resource: AppResource) => void,
) {
  const registry = new Map<string, ToolDefinition>();
  const invoke = async (
    name: string,
    input: unknown,
    context: ServerContext,
  ) => {
    const tool = registry.get(name);
    let toolRecovery: string | undefined;
    const response = await result(
      async () => {
        if (!tool?.skipMaintenance) await beforeCall();
        if (retiredTools.has(name))
          throw new AppError('CHECKOUT_FLOW_REPLACED', 410);
        if (!tool) throw new AppError('VALIDATION_ERROR', 400);
        try {
          return await tool.handler(input, context);
        } catch (error) {
          if (error instanceof ToolError) toolRecovery = error.recovery;
          throw error;
        }
      },
      tool ? `mcp.${tool.name}` : 'mcp.unknown',
    );
    if (response.ok && isInputRequiredResult(response.data))
      return response.data;
    const output = mcpResult(response, toolRecovery);
    return {
      isError: !response.ok,
      structuredContent: output,
      content: [{ type: 'text' as const, text: JSON.stringify(output) }],
    };
  };
  let dispatchInstalled = false;
  return (tool: ToolDefinition) => {
    if (registry.has(tool.name) || retiredTools.has(tool.name))
      throw new Error(`Duplicate or retired tool: ${tool.name}`);
    registry.set(tool.name, tool);
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
        _meta: tool._meta,
      },
      (input, context) => invoke(tool.name, input, context),
    );
    if (tool.resource) registerResource(tool.resource);
    // SDK automatic validation changes our public error envelope and retired-tool
    // semantics. Keep one compatibility boundary; registration owns discovery,
    // while each handler retains the existing domain validation and parsing.
    if (!dispatchInstalled) {
      server.server.setRequestHandler('tools/call', (request, context) =>
        invoke(request.params.name, request.params.arguments ?? {}, context),
      );
      dispatchInstalled = true;
    }
  };
}
