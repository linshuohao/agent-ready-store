import type { z } from 'zod';
import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { addCartItemInput } from '@store/contracts';

export function createAddCartItem(
  carts: CartService,
  channel: 'MCP' | 'APPS' = 'MCP',
): ToolDefinition<z.output<typeof addCartItemInput>> {
  return {
    name: channel === 'APPS' ? 'apps_add_cart_item' : 'add_cart_item',
    ...(channel === 'APPS' ? { _meta: { ui: { visibility: ['app'] } } } : {}),
    description:
      'Add an explicit increment without creating an order. Pass exactly one of cartId or shared initializationId, plus an independent operationRequestId; no cart version. Concurrent first adds sharing initializationId resolve to one cart. Unknown results use get_request_result first; only explicitly continue with the original key and payload. Purchase quantity is independently specified in quote_selection/create_order.',
    inputSchema: addCartItemInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        return await carts.add(input, channel);
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
