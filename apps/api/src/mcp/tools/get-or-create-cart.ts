import type { z } from 'zod';
import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { getOrCreateCartInput } from '@store/contracts';

const agentCartInput = getOrCreateCartInput;

export function createGetOrCreateCart(
  carts: CartService,
): ToolDefinition<z.output<typeof agentCartInput>> {
  return {
    name: 'get_or_create_cart',
    description:
      '兼容旧工具名，仅按cartId读取已有购物车；查看购物车优先get_cart。本工具不创建购物车。首次明确加购使用add_cart_item并传共享initializationId；旧初始化载荷被拒绝，原请求结果用get_request_result只读核实。',
    inputSchema: agentCartInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        return await carts.getOrCreate(input, 'MCP');
      } catch (error) {
        if (
          !(error instanceof AppError) ||
          error.code === 'VALIDATION_ERROR' ||
          error.code === 'TEMPORARY_UNAVAILABLE'
        )
          throw error;
        switch (error.code) {
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
