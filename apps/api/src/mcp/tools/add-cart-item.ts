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
const addItemInput = operationBase
  .extend({
    productId: z.string().min(1).max(64),
    quantity: z.number().int().positive().max(2147483647),
  })
  .strict();

export function createAddCartItem(carts: CartService): ToolDefinition {
  return {
    name: 'add_cart_item',
    description:
      '明确加购时增加指定数量，不生单；传cartId、操作UUID及已读版本，同键原载荷恢复不重复加量。购买准备先核对已有同SKU整行数量与本次目标，冲突先澄清，不擅自扩大数量。购买A+B时B准备失败须停止生单并说明A已在车，不能缩成A。',
    inputSchema: addItemInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        const { cartId, productId, quantity, ...context } = parse(
          addItemInput,
          input,
        );
        return await carts.operate(cartId, {
          ...context,
          operation: { type: 'add_item', productId, quantity },
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
