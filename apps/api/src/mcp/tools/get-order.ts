import type { z } from 'zod';
import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { orderTargetInput } from '@store/contracts';

export function createGetOrder(
  carts: CartService,
): ToolDefinition<z.output<typeof orderTargetInput>> {
  return {
    name: 'get_order',
    description:
      '按原orderId读取真实状态、固定摘要、截止、操作及网页入口；不支付、不切换当前车。结果未知读取原单，不另生单。',
    inputSchema: orderTargetInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        const { orderId, cartId } = input;
        return await carts.getOrder(orderId, cartId);
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
