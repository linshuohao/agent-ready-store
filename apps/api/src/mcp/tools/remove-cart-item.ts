import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { persistentCartOperationInput } from '@store/contracts';
import { z } from 'zod';
import { parseToolInput as parse } from '../tool-input.js';

const operationBase = persistentCartOperationInput
  .omit({ operation: true })
  .extend({ cartId: z.uuid() });
const removeItemInput = operationBase
  .extend({ productId: z.string().min(1).max(64) })
  .strict();

export function createRemoveCartItem(carts: CartService): ToolDefinition {
  return {
    name: 'remove_cart_item',
    description: '移除明确指定车行，不取消或修改已有订单；未知沿原操作键恢复。',
    inputSchema: removeItemInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        const { cartId, productId, ...context } = parse(removeItemInput, input);
        return await carts.operate(cartId, {
          ...context,
          operation: { type: 'remove_item', productId },
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
