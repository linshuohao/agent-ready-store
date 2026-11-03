import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { persistentCartOperationInput } from '@store/contracts';
import { z } from 'zod';

const operationBase = persistentCartOperationInput.options[1]
  .omit({ operation: true })
  .extend({ cartId: z.uuid() });
const updateItemInput = operationBase
  .extend({
    productId: z.string().min(1).max(64),
    quantity: z.number().int().positive().max(2147483647),
  })
  .strict();

export function createUpdateCartItem(
  carts: CartService,
): ToolDefinition<z.output<typeof updateItemInput>> {
  return {
    name: 'update_cart_item',
    description:
      '明确改量直接设置该行最终数量，不生单；语义含糊才澄清。版本冲突先重读，不覆盖；未知沿原操作键恢复。',
    inputSchema: updateItemInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        const { cartId, productId, quantity, ...context } = input;
        return await carts.operate(cartId, {
          ...context,
          operation: { type: 'set_quantity', productId, quantity },
        });
      } catch (error) {
        if (
          !(error instanceof AppError) ||
          error.code === 'VALIDATION_ERROR' ||
          error.code === 'TEMPORARY_UNAVAILABLE'
        )
          throw error;
        switch (error.code) {
          case 'CART_VERSION_CONFLICT':
            throw new ToolError(
              error,
              '确定失败；重读原购物车并核对完整目标及数量，不用新版本自动重放旧编辑。',
            );
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
