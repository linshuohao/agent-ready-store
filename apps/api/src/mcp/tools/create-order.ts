import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CartService } from '../../cart/cart.service.js';
import { createOrderInput } from '@store/contracts';
import { z } from 'zod';
import { parseToolInput as parse } from '../tool-input.js';
import { appResource } from '../resources.js';

const orderCreation = createOrderInput.safeExtend({ cartId: z.uuid() });
const resource = appResource('create_order');

export function createOrderTool(carts: CartService): ToolDefinition {
  return {
    name: resource.tool,
    description:
      '模拟商店，无真实扣款或物流；订单结果应明确告知用户。仅Human明确购买意图并遵守Host审批后，为本次完整目标创建待支付订单、固定摘要并预留库存；selectedItems断言整行数量，显式传TWD及所有预算/规格约束，maxTotal为优惠后含运总额上限；specs须原样引用目录，仅传用户硬条件。准备任一目标失败不可缩单；默认仅本次目标行。未知沿原requestId和原载荷恢复。同一次购买多个商品须一次包含完整目标，仅生成一笔订单及一张最终结算卡片，不能逐商品生单；用户明确拆单除外。每轮对话最多调用一次有UI关联的工具（search_products或create_order），购买只展示最终订单。预算/规格明确时优先quote_selection无UI预检；本工具失败或结果未知时也不在同轮重新调用展示工具，说明状态并保留原请求以便后续恢复。成功后本轮购物工具调用结束，不再补搜索或购物车展示；后续仅用户新意图或未知结果恢复才能继续。支持Apps时仅本工具展示最终结算卡片并在同卡片由Human点击支付；无Apps返回网页orderUrl/shareUrl供Human亲自打开核对并点击支付；不得代开UI点击、代付或宣称已支付。',
    inputSchema: orderCreation,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    resource,
    _meta: resource.metadata,
    handler: async (input) => {
      try {
        const { cartId, ...body } = parse(orderCreation, input);
        return await carts.createOrder(cartId, body, 'MCP');
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
          case 'CART_VERSION_CONFLICT':
          case 'SELECTION_CHANGED':
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
