import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { listOrdersInput } from '@store/contracts';
import { z } from 'zod';
import { parseToolInput as parse } from '../tool-input.js';

const orderList = listOrdersInput.extend({ cartId: z.uuid() }).strict();

export function createListOrders(carts: CartService): ToolDefinition {
  return {
    name: 'list_orders',
    description:
      '按明确cartId有界分页查询订单；多个候选先向Human澄清目标，不擅选一单。',
    inputSchema: orderList,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        const { cartId, ...page } = parse(orderList, input);
        return await carts.listOrders(cartId, page);
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
