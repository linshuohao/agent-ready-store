import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { getOrCreateCartInput } from '@store/contracts';
import { parseToolInput as parse } from '../tool-input.js';

const agentCartInput = getOrCreateCartInput;

export function createAppsGetOrCreateCart(carts: CartService): ToolDefinition {
  return {
    name: 'apps_get_or_create_cart',
    description:
      'Read an existing cart by cartId only. First explicit add uses add_cart_item with shared initializationId. Legacy initialization payloads are rejected; use get_request_result for read-only reconciliation.',
    inputSchema: agentCartInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: { ui: { visibility: ['app'] } },
    handler: async (input) => {
      try {
        return await carts.getOrCreate(parse(agentCartInput, input), 'APPS');
      } catch (error) {
        if (
          !(error instanceof AppError) ||
          error.code === 'VALIDATION_ERROR' ||
          error.code === 'TEMPORARY_UNAVAILABLE'
        )
          throw error;
        switch (error.code) {
          case 'REQUEST_CONFLICT':
            throw new ToolError(
              error,
              '请求键与载荷冲突；核对并恢复原请求，不换键绕过冲突。',
            );
        }
        throw new ToolError(
          error,
          '操作未完成；按错误码核对原目标，不能盲目重试、缩单或创建替代订单。',
        );
      }
    },
  };
}
