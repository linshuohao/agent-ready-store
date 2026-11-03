import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { quoteSelectionInput } from '@store/contracts';
import { z } from 'zod';

const selectionQuote = quoteSelectionInput.safeExtend({ cartId: z.uuid() });

export function createQuoteSelection(
  carts: CartService,
): ToolDefinition<z.output<typeof selectionQuote>> {
  return {
    name: 'quote_selection',
    description:
      '需要核对本店选定商品的优惠后含运总额、预算或规格约束时，按完整selectedItems及constraints只读预估。需要已有真实cartId；无车且仅询价时说明无法取得完整报价，不为询价加购建车或编造cartId。无UI、不占库、不生单。购买有预算/规格时优先预检以减少失败卡片；通过不保证稍后仍有库存，create_order仍重验。非强制前置步骤。',
    inputSchema: selectionQuote,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        const { cartId, ...body } = input;
        return await carts.quoteSelection(cartId, body, 'MCP');
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
          case 'SELECTION_CHANGED':
            throw new ToolError(
              error,
              '确定失败；重读原购物车并核对完整目标及数量，不用新版本自动重放旧编辑。',
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
