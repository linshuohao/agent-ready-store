import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { z } from 'zod';

const cartTarget = z.object({ cartId: z.uuid() }).strict();

export function createGetCart(
  carts: CartService,
): ToolDefinition<z.output<typeof cartTarget>> {
  return {
    name: 'get_cart',
    description:
      '用户想查看本店购物车内容、数量、当前版本或待支付订单时，按已知cartId读取；不从聊天历史推测当前车。只读、无UI，不建车、不支付。',
    inputSchema: cartTarget,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        return await carts.get(input.cartId);
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
