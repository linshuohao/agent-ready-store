import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { orderTargetInput } from '@store/contracts';
import { parseToolInput as parse } from '../tool-input.js';

export function createAppsPayOrder(carts: CartService): ToolDefinition {
  return {
    name: 'apps_pay_order',
    description:
      '仅供Apps UI在Human查看完整原单后点击模拟支付；不通过模型调用。',
    inputSchema: orderTargetInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: { ui: { visibility: ['app'] } },
    handler: async (input) => {
      try {
        const { orderId, cartId } = parse(orderTargetInput, input);
        return await carts.payOrder(orderId, cartId);
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
