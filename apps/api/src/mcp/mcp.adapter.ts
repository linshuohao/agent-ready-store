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
