import { ToolError } from '../tool-error.js';
import { AppError } from '../../shared/app-error.js';
import type { ToolDefinition } from '../register-tools.js';
import type { CatalogService } from '../../catalog/catalog.service.js';
import { discoveryInput } from '@store/contracts';
import { appResource } from '../resources.js';

const resource = appResource('search_products');

export function createSearchProducts(catalog: CatalogService): ToolDefinition {
  return {
    name: resource.tool,
    description:
      '本服务为模拟商店，无真实扣款或物流。每轮对话最多调用一次有UI关联的工具；后台查询不计卡片，展示失败本轮说明而不自动重开。仅用户最终目标为搜索/浏览时调用；找商品并购买整体属于购买，使用query_products后台准备并以create_order结束，不补搜索展示。多个目标以queries一次提交（最多5组，各自预算/筛选，默认每组4项），返回一张按目标分组的卡片，不逐目标调用展示。购买准备中请用query_products，避免生成中间卡片。有界分页，推荐排序，库存为当次快照。',
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
