import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CatalogService } from '../../catalog/catalog.service.js';
import { productInput } from '@store/contracts';
import { parseToolInput as parse } from '../tool-input.js';

export function createGetProduct(catalog: CatalogService): ToolDefinition {
  return {
    name: 'get_product',
    description:
      '按ID读取商品规格与可购状态，不含完整评论；模拟商品，无真实物流。约束specs为目录原文键值的精确断言，只传用户明确硬条件，不翻译键值或把推荐特性额外写成硬约束。',
    inputSchema: productInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        return await catalog.get(parse(productInput, input).productId);
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
