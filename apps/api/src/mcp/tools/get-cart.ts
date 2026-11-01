import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { z } from 'zod';
import { parseToolInput as parse } from '../tool-input.js';

const cartTarget = z.object({ cartId: z.uuid() }).strict();

export function createGetCart(carts: CartService): ToolDefinition {
  return {
    name: 'get_cart',
    description:
      '按明确cartId读取当前车、版本及待支付订单；读取不建车、不支付。',
    inputSchema: cartTarget,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        return await carts.get(parse(cartTarget, input).cartId);
      } catch (error) {
        if (
          !(error instanceof AppError) ||
          error.code === 'VALIDATION_ERROR' ||
          error.code === 'TEMPORARY_UNAVAILABLE'
        )
          throw error;
        throw new ToolError(
          error,
          '操作未完成；按错误码核对原目标，不能盲目重试、缩单或创建替代订单。',
        );
      }
    },
  };
}
