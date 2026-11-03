import type { z } from 'zod';
import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CatalogService } from '../../catalog/catalog.service.js';
import { discoveryInput } from '@store/contracts';

export function createQueryProducts(
  catalog: CatalogService,
): ToolDefinition<z.output<typeof discoveryInput>> {
  return {
    name: 'query_products',
    description:
      '需要在 Agent-Ready Store 模拟商城比较候选、反复检索选品或准备购买时，使用本工具查询目录商品、价格与可购状态，不生成UI。仅搜索/浏览且需要后台探索时，在展示前完成改词、筛选和规格核验，最后一次search_products提交完整目标及最终条件；不在展示后继续探索并用不同结果回答。条件明确可直接search_products，不强制重复查询；仅问已知商品详情或评论用对应工具直接答复。明确购买时准备完整集合，仅create_order展示最终订单，成功后停止本轮购物工具调用，不补搜索/购物车展示。多个目标用queries保留集合及各自约束，不传自造商品结果。用户授权自选且约束充分时直接选品，不因候选多就追问；关键歧义才澄清。无匹配可调整检索措辞，不放宽硬条件。只读、不建车、不生单；无真实扣款或物流。',
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
