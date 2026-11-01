import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { createOrderInput } from '@store/contracts';
import { z } from 'zod';
import { parseToolInput as parse } from '../tool-input.js';

const orderCreation = createOrderInput.safeExtend({ cartId: z.uuid() });

export function createAppsCreateOrder(carts: CartService): ToolDefinition {
  return {
    name: 'apps_create_order',
    description:
      'UI Bridge按显式商品和quantity生单，完整选择及限制，不依赖车数量或版本；成功按SKU移除当前车整行，不支付。未知先get_request_result只读核实；明确继续原购买才提交原键和冻结载荷。',
    inputSchema: orderCreation,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: { ui: { visibility: ['app'] } },
    handler: async (input) => {
      try {
        const { cartId, ...body } = parse(orderCreation, input);
        return await carts.createOrder(cartId, body, 'APPS');
      } catch (error) {
        if (
          !(error instanceof AppError) ||
          error.code === 'VALIDATION_ERROR' ||
          error.code === 'TEMPORARY_UNAVAILABLE'
        )
          throw error;
        switch (error.code) {
          case 'SPEC_MISMATCH':
            throw new ToolError(
              error,
              '确定失败；核对constraintViolations与商品原文规格。不翻译键值、不删除用户硬约束；确属参数错误时修正后用新请求键提交。',
            );
          case 'BUDGET_EXCEEDED':
            throw new ToolError(
              error,
              '确定失败；核对constraintViolations中的金额（总额含运费）。不提高预算；仅在原授权范围内重新选品，否则停止说明。',
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
