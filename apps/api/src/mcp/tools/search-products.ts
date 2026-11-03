import type { z } from 'zod';
import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CatalogService } from '../../catalog/catalog.service.js';
import { discoveryInput } from '@store/contracts';
import { appResource } from '../resources.js';

const resource = appResource('search_products');

export function createSearchProducts(
  catalog: CatalogService,
): ToolDefinition<z.output<typeof discoveryInput>> {
  return {
    name: resource.tool,
    description:
      '在 Agent-Ready Store 模拟商城中找商品、按预算筛选或获取本店选购建议时使用。返回目录商品、价格与可购状态快照；支持Apps时展示一张商品结果卡片，无真实扣款或物流。仅最终目标为搜索/浏览时调用；找商品并购买使用query_products后台准备，以create_order结束，不补搜索展示。多个目标用queries一次提交（最多5组，各自预算/筛选，默认每组4项），不逐目标展示。每轮对话最多调用一次有UI关联的工具；后台查询不计卡片，展示失败本轮说明而不自动重开。条件明确可直接调用，不强制先query_products；需要改词或核验时先完成后台准备再展示。展示后本轮不再换条件查询，文字以本次展示结果为准；空结果如实说明，用户后续新意图再继续。只问分类/指定商品详情/评论时用对应只读工具直接回答，不追加本工具。超过5组先确认优先范围或分批，不截断目标。有界分页，推荐排序；不建车、不生单。',
    inputSchema: discoveryInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    resource,
    _meta: resource.metadata,
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
