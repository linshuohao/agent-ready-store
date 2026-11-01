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

export function createGetOrCreateCart(carts: CartService): ToolDefinition {
  return {
    name: 'get_or_create_cart',
    description:
      '仅首次明确加购/购买且无cartId时以新UUID requestId及完整非空initialItems原子建车；咨询零写。已有车仅传cartId恢复。购买准备属内部步骤，不展示购物车；购买准备遇到已有同SKU时先核对本次目标数量与整行数量，不自动累加或覆盖旧数量、不换车绕过限制，冲突先澄清。未知结果沿原键原载荷重试，不另建车，不覆盖后续编辑。',
    inputSchema: agentCartInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        return await carts.getOrCreate(parse(agentCartInput, input), 'MCP');
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
