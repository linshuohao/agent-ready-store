import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { getOrCreateCartInput, cartItemsInput } from '@store/contracts';
import { z } from 'zod';
import { parseToolInput as parse } from '../tool-input.js';

const agentCartInput = z.union([
  getOrCreateCartInput.options[0],
  getOrCreateCartInput.options[1].extend({
    initialItems: cartItemsInput.min(1),
  }),
]);

export function createAppsGetOrCreateCart(carts: CartService): ToolDefinition {
  return {
    name: 'apps_get_or_create_cart',
    description:
      'UI Bridge明确加购时初始化或恢复原车；未知沿原键，不自动另建。',
    inputSchema: agentCartInput,
    annotations: {
      readOnlyHint: false,
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
