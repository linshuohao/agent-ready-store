import { expect, it } from 'vitest';
import type { ServerContext } from '@modelcontextprotocol/server';
import type { CartService } from '../../src/cart/cart.service.js';
import { AppError } from '../../src/shared/app-error.js';
import { ToolError } from '../../src/mcp/tool-error.js';
import { createAppsCreateOrder } from '../../src/mcp/tools/apps-create-order.js';
import { createOrderTool } from '../../src/mcp/tools/create-order.js';
import { createUpdateCartItem } from '../../src/mcp/tools/update-cart-item.js';
import { createGetOrder } from '../../src/mcp/tools/get-order.js';

const id = '00000000-0000-4000-8000-000000000001';
const orderInput = {
  cartId: id,
  requestId: id,
  selectedItems: [{ productId: 'P001', quantity: 1 }],
  constraints: { currency: 'TWD' },
};
const context = {} as ServerContext;

it.each([
  ['SPEC_MISMATCH', '商品原文规格'],
  ['BUDGET_EXCEEDED', '总额含运费'],
  ['REQUEST_CONFLICT', '请求键与载荷冲突'],
  ['PENDING_ORDER_LIMIT', '操作未完成'],
])('create_order owns its %s recovery', async (code, hint) => {
  const details = { pendingOrderIds: [id] };
  const tool = createOrderTool({
    createOrder: async () => {
      throw new AppError(code, 409, details);
    },
  } as unknown as CartService);
  await expect(tool.handler(orderInput, context)).rejects.toMatchObject({
    code,
    status: 409,
    details,
    recovery: expect.stringContaining(hint),
  });
  await expect(tool.handler(orderInput, context)).rejects.toBeInstanceOf(
    ToolError,
  );
});
it('cart editing owns version conflicts and preserves current version details', async () => {
  const tool = createUpdateCartItem({
    operate: async () => {
      throw new AppError('CART_VERSION_CONFLICT', 409, {
        currentCartVersion: 7,
      });
    },
  } as unknown as CartService);
  await expect(
    tool.handler(
      {
        cartId: id,
        operationRequestId: id,
        expectedCartVersion: 1,
        productId: 'P001',
        quantity: 1,
      },
      context,
    ),
  ).rejects.toMatchObject({
    code: 'CART_VERSION_CONFLICT',
    details: { currentCartVersion: 7 },
    recovery: expect.stringContaining('不用新版本自动重放'),
  });
});
it('order reads handle their business failures without claiming recovery succeeded', async () => {
  const tool = createGetOrder({
    getOrder: async () => {
      throw new AppError('ORDER_NOT_FOUND', 404);
    },
  } as unknown as CartService);
  await expect(tool.handler({ orderId: id }, context)).rejects.toMatchObject({
    code: 'ORDER_NOT_FOUND',
    status: 404,
    recovery: expect.stringContaining('操作未完成'),
  });
});
it.each([
  new Error('secret database failure'),
  new AppError('VALIDATION_ERROR', 400),
  new AppError('TEMPORARY_UNAVAILABLE', 503),
])('passes shared failures through unchanged: %s', async (error) => {
  const tool = createOrderTool({
    createOrder: async () => {
      throw error;
    },
  } as unknown as CartService);
  await expect(tool.handler(orderInput, context)).rejects.toBe(error);
});

it('Apps order creation preserves request conflict recovery', async () => {
  const tool = createAppsCreateOrder({
    createOrder: async () => {
      throw new AppError('REQUEST_CONFLICT', 409, {
        currentCartVersion: 7,
      });
    },
  } as unknown as CartService);
  await expect(tool.handler(orderInput, context)).rejects.toMatchObject({
    code: 'REQUEST_CONFLICT',
    details: { currentCartVersion: 7 },
    recovery: expect.stringContaining('请求键'),
  });
});
