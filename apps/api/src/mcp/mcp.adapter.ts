import { createGetRequestResult } from './tools/get-request-result.js';
import { createListProductCategories } from './tools/list-product-categories.js';
import {
  createResolveProductChoices,
  createChoiceCodec,
} from './tools/resolve-product-choices.js';
import { createSearchProducts } from './tools/search-products.js';
import { createQueryProducts } from './tools/query-products.js';
import { createGetProduct } from './tools/get-product.js';
import { createListProductReviews } from './tools/list-product-reviews.js';
import { createGetOrCreateCart } from './tools/get-or-create-cart.js';
import { createGetCart } from './tools/get-cart.js';
import { createAddCartItem } from './tools/add-cart-item.js';
import { createUpdateCartItem } from './tools/update-cart-item.js';
import { createRemoveCartItem } from './tools/remove-cart-item.js';
import { createQuoteSelection } from './tools/quote-selection.js';
import { createOrderTool } from './tools/create-order.js';
import { createGetOrder } from './tools/get-order.js';
import { createListOrders } from './tools/list-orders.js';
import { createCancelOrder } from './tools/cancel-order.js';
import { createAppsGetOrCreateCart } from './tools/apps-get-or-create-cart.js';
import { createAppsCreateOrder } from './tools/apps-create-order.js';
import { createAppsPayOrder } from './tools/apps-pay-order.js';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import type { Express } from 'express';
import type { CartService } from '../cart/cart.service.js';
import type { CatalogService } from '../catalog/catalog.service.js';
import { createToolRegistrar } from './register-tools.js';
import { createResourceRegistrar } from './resources.js';
import { mcpAccess, readMcpConfig } from './config.js';

export function attachMcp(
  app: Express,
  catalog: CatalogService,
  carts: CartService,
  beforeToolCall: () => Promise<void> = async () => {},
) {
  const config = readMcpConfig(process.env);
  const { origin } = config;
  app.use('/mcp', mcpAccess(config));
  const choiceCodec = createChoiceCodec();
  const handler = createMcpHandler(({ era }) => {
    const server = new McpServer(
      { name: 'agent-ready-store', version: '0.1.0' },
      {
        instructions: [
          'Agent-Ready Store 是模拟商城，提供商品查找、比较、购物车与待支付订单能力；币种TWD，无真实扣款或物流。本店价格、库存和订单状态以工具返回为准，不是全网商品搜索。',
          '先区分最终意图：仅咨询/比较只读；明确加购只改车；明确购买才生单；查单/取消定位原单。“看看、推荐、比较、选型号”本身不是购买授权，关键歧义先澄清。',
          '商品列表浏览：条件明确可直接一次search_products，不强制先query_products。需要改词、比较或核验规格时先用query_products/get_product完成后台准备，最后一次search_products提交完整目标及最终条件。展示后本轮不再换条件查询；文字以此次展示返回为准，不把后台候选或报价当最终结果。无结果或失败如实说明，不自动重开卡片；用户后续新意图可开启新一轮。',
          '仅问分类、指定商品规格、评论、车或订单时，用对应只读工具直接答复，无须追加search_products。分类用list_product_categories，规格用get_product，评论用list_product_reviews，已有车优先get_cart。',
          '明确购买时用query_products/详情准备完整集合；有预算或规格可用quote_selection预检。仅create_order展示最终订单，成功后停止本轮购物工具调用；支付由Human亲自在网页或内嵌界面完成。已有cartId不为匹配购买量额外加购/改量；无cartId时，明确加购或购买准备通过add_cart_item及共享initializationId取得真实车ID，不编造ID。',
          '每轮最多一次展示工具调用（search_products或create_order）；多个目标一次提交，保留失败/空目标及各自约束。超过5个搜索目标先确认优先范围或分批，不静默截断。不能用展示限制阻止原订单的必要只读状态核实。',
          '改车/生单结果未知先用get_request_result只读核实；not_found不等于失败，明确继续才沿原键原载荷恢复。取消未知用get_order查原单；纯查询失败不能当作未知购买去恢复。保留用户预算和规格硬条件；一般知识问答或全网真实购物不应被本店模拟目录替代。',
        ].join('\n'),
        requestState: { verify: choiceCodec.verify },
        capabilities: { tools: {}, resources: {} },
        supportedProtocolVersions: [
          '2026-07-28',
          '2025-11-25',
          '2025-06-18',
          '2025-03-26',
        ],
      },
    );
    const register = createToolRegistrar(
      server,
      beforeToolCall,
      createResourceRegistrar(server, origin),
    );
    register(createListProductCategories(catalog));
    register(
      createResolveProductChoices({
        server,
        catalog,
        choiceCodec,
        modern: era === 'modern',
      }),
    );
    register(createSearchProducts(catalog));
    register(createQueryProducts(catalog));
    register(createGetProduct(catalog));
    register(createListProductReviews(catalog));
    register(createGetOrCreateCart(carts));
    register(createGetCart(carts));
    register(createAddCartItem(carts));
    register(createAddCartItem(carts, 'APPS'));
    register(createGetRequestResult(carts));
    register(createUpdateCartItem(carts));
    register(createRemoveCartItem(carts));
    register(createQuoteSelection(carts));
    register(createOrderTool(carts));
    register(createGetOrder(carts));
    register(createListOrders(carts));
    register(createCancelOrder(carts));
    register(createAppsGetOrCreateCart(carts));
    register(createAppsCreateOrder(carts));
    register(createAppsPayOrder(carts));
    return server;
  });
  const handleRequest = toNodeHandler(handler);
  app.all('/mcp', async (req, res) => {
    await handleRequest(req, res, req.body);
  });
}
