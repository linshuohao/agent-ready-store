import type { z } from 'zod';
import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CatalogService } from '../../catalog/catalog.service.js';
import { productInput } from '@store/contracts';

export function createGetProduct(
  catalog: CatalogService,
): ToolDefinition<z.output<typeof productInput>> {
  return {
    name: 'get_product',
    description:
      '需要核对本店某款商品的规格、用途适配、价格或可购状态时，按已查询到的productId读取详情；比较多款可分别读取。完整评论用list_product_reviews；未知商品ID先搜索。只读、无UI；模拟商品，无真实物流。约束specs为目录原文键值的精确断言，只传用户明确硬条件，不翻译键值或把推荐特性额外写成硬约束。',
    inputSchema: productInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        return await catalog.get(input.productId);
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
