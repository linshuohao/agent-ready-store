import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CatalogService } from '../../catalog/catalog.service.js';
import { discoveryInput } from '@store/contracts';

export function createQueryProducts(catalog: CatalogService): ToolDefinition {
  return {
    name: 'query_products',
    description:
      '本服务为模拟商店，无真实扣款或物流。购买准备或后台比较只读查询，不生成UI。按用户最终目标执行：仅搜索/浏览时后台探索后一次search_products展示完整结果；明确购买时用本工具准备完整集合，仅create_order展示最终订单，成功后停止本轮购物工具调用，不补搜索/购物车展示。多个目标使用queries保留集合及各自约束，不传自造商品结果。用户授权自选且约束充分时直接选品，不因有多款商品就追问；关键歧义才澄清。无匹配可调整检索措辞，不放宽硬条件；不建车、不生单。',
    inputSchema: discoveryInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (input) => {
      try {
        return await catalog.discover(input);
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
