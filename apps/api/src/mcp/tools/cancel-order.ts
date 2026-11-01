import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { orderTargetInput } from '@store/contracts';
import { parseToolInput as parse } from '../tool-input.js';

export function createCancelOrder(carts: CartService): ToolDefinition {
  return {
    name: 'cancel_order',
    description:
      '仅取消Human明确指定的未支付orderId；多个候选先澄清。按真实返回确认关闭，未知查原单；停止等待/离页不等于取消，已支付不承诺撤销或退款，不影响其他订单。',
    inputSchema: orderTargetInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        const { orderId, cartId } = parse(orderTargetInput, input);
        return await carts.cancelOrder(orderId, cartId);
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
