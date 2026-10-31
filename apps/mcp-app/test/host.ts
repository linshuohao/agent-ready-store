// Official SDK fixture, not evidence of a production Host or Human approval.
import {
  AppBridge,
  PostMessageTransport,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import type { ShoppingCartView, OrderView } from '@store/contracts';
declare const __APP_HTML__: string;
const id = '10000000-0000-4000-8000-000000000001',
  oid = '20000000-0000-4000-8000-000000000001';
let cart: ShoppingCartView = {
  cartId: id,
  cartVersion: 1,
  agentCreated: true,
  items: ['P001', 'P002'].map((productId) => ({
    productId,
    quantity: 1,
    name: '同名耳機',
    unitPrice: '10.00',
    availability: { canPurchase: true, reasons: [], currentQuantity: 8 },
  })),
  issues: [],
  pendingOrders: [],
};
let order: OrderView | null = null;
const calls: string[] = [],
  opens: string[] = [];
const controls = {
  failPayOnce: false,
  conflictOnce: false,
  failProductOnce: new URL(location.href).searchParams.has('failDiscovery'),
};
const searchMode = new URL(location.href).searchParams.has('search');
const productMode = new URL(location.href).searchParams.has('product');
const productDetail = {
  id: 'P001',
  name: 'Aero 耳機',
  brand: 'Pulso',
  category: '3C',
  currency: 'TWD',
  price: '1890.00',
  imagePath: null,
  availability: { canPurchase: true, reasons: [], currentQuantity: 8 },
  description: '商品詳情',
  specs: { 連線: '藍牙' },
  reviewOverview: { count: 0 },
};
const {
  description: _description,
  specs: _specs,
  reviewOverview: _reviews,
  ...productSummary
} = productDetail;
const catalogData = {
  items: [productSummary],
  total: 1,
  nextOffset: null,
  catalogRevision: 'fixture',
};
const checkoutMode = new URL(location.href).searchParams.has('checkout');
const entry = checkoutMode
  ? 'create_order'
  : searchMode
    ? 'search_products'
    : productMode
      ? 'get_product'
      : 'get_cart';
// Legacy deliveries exercise shared navigation; only search/create_order are public UI entries.
const resourceHtml = __APP_HTML__.replace(
  'data-entry-tool="search_products"',
  `data-entry-tool="${entry}"`,
);
const ok = (data: unknown) => ({
  content: [{ type: 'text' as const, text: 'fixture' }],
  structuredContent: { ok: true, data },
});
const summary = (items: ShoppingCartView['items']) => ({
  currency: 'TWD' as const,
  pricingRuleVersion: 'fixture',
  items: items.map((i) => ({
    productId: i.productId,
    name: i.name!,
    brand: 'Fixture',
    specs: { 顏色: '黑' },
    quantity: i.quantity,
    unitPrice: i.unitPrice!,
    lineSubtotal: (i.quantity * 10).toFixed(2),
  })),
  subtotal: '20.00',
  thresholdDiscount: '0.00',
  aiDiscount: '1.00',
  shipping: '100.00',
  total: '119.00',
});
function createFixtureOrder(selected: ShoppingCartView['items']) {
  order ??= {
    orderId: oid,
    cartId: id,
    sourceCartVersion: cart.cartVersion,
    status: 'CHECKOUT',
    effectiveStatus: 'CHECKOUT',
    createdAt: '2026-01-01T00:00:00.000Z',
    reservationExpiresAt: '2099-01-01T00:00:00.000Z',
    paidAt: null,
    closedAt: null,
    closeReason: null,
    createdByChannel: 'APPS',
    aiEligible: true,
    summary: summary(selected),
    allowedActions: { canPay: true, canCancel: true },
    navigation: {
      orderUrl: `http://localhost:3000/orders/${oid}`,
      shareUrl: `http://localhost:3000/orders/${oid}?view=share`,
    },
  };
  cart = {
    ...cart,
    cartVersion: cart.cartVersion + 1,
    items: cart.items.filter((i) => !selected.includes(i)),
    pendingOrders: [order],
  };
  return ok({ order, cart });
}
const bridge = new AppBridge(
  null,
  { name: 'Lifecycle test Host', version: '1' },
  { openLinks: {}, serverTools: {} },
  {
    hostContext: {
      toolInfo: {
        id: 'fixture-cart-call',
        tool: {
          name: entry,
          inputSchema: { type: 'object' },
        },
      },
    },
  },
);
bridge.oncalltool = async ({ name, arguments: args }) => {
  calls.push(name);
  if (name === 'get_cart') return ok(cart);
  if (name === 'get_product') {
    if (controls.failProductOnce) {
      controls.failProductOnce = false;
      return {
        structuredContent: {
          ok: false,
          error: { code: 'TEMPORARY_UNAVAILABLE' },
        },
        content: [],
        isError: true,
      };
    }
    return ok(productDetail);
  }
  if (name === 'query_products') return ok(catalogData);
  if (name === 'list_product_reviews')
    return ok({
      productId: 'P001',
      items: [],
      total: 0,
      nextOffset: null,
      catalogRevision: 'fixture',
    });
  if (name === 'quote_selection')
    return ok(
      summary(
        cart.items.filter((i) =>
          (args!.selectedItems as { productId: string }[]).some(
            (s) => s.productId === i.productId,
          ),
        ),
      ),
    );
  if (name === 'update_cart_item') {
    if (controls.conflictOnce) {
      controls.conflictOnce = false;
      return {
        structuredContent: {
          ok: false,
          error: { code: 'CART_VERSION_CONFLICT' },
        },
        content: [],
        isError: true,
      };
    }
    cart = {
      ...cart,
      cartVersion: cart.cartVersion + 1,
      items: cart.items.map((i) =>
        i.productId === args!.productId
          ? { ...i, quantity: args!.quantity as number }
          : i,
      ),
    };
    return ok(cart);
  }
  if (name === 'remove_cart_item') {
    cart = {
      ...cart,
      cartVersion: cart.cartVersion + 1,
      items: cart.items.filter((i) => i.productId !== args!.productId),
    };
    return ok(cart);
  }
  if (name === 'apps_create_order') {
    const selected = cart.items.filter((i) =>
      (args!.selectedItems as { productId: string }[]).some(
        (s) => s.productId === i.productId,
      ),
    );
    return createFixtureOrder(selected);
  }
  if (name === 'get_order') return ok(order);
  if (name === 'list_orders')
    return ok({ items: order ? [order] : [], nextOffset: null });
  if (name === 'apps_pay_order' && order) {
    if (controls.failPayOnce) {
      controls.failPayOnce = false;
      throw Error('lost response');
    }
    order = {
      ...order,
      status: 'PAID',
      effectiveStatus: 'PAID',
      paidAt: '2026-01-01T00:01:00.000Z',
      allowedActions: { canPay: false, canCancel: false },
    };
    cart = { ...cart, pendingOrders: [] };
    return ok(order);
  }
  if (name === 'cancel_order' && order) {
    order = {
      ...order,
      effectiveStatus: 'CANCELLED',
      closedAt: '2026-01-01T00:01:00.000Z',
      closeReason: 'CANCELLED',
      allowedActions: { canPay: false, canCancel: false },
    };
    return ok(order);
  }
  throw Error('Unexpected fixture call');
};
bridge.onopenlink = async ({ url }) => {
  opens.push(url);
  return { isError: false };
};
bridge.oninitialized = async () => {
  if (checkoutMode) {
    if (!order) createFixtureOrder(cart.items);
    await bridge.sendToolInput({ arguments: { cartId: id } });
    await bridge.sendToolResult(ok({ order, cart }));
  } else if (searchMode) {
    await bridge.sendToolInput({ arguments: { q: '耳機' } });
    await bridge.sendToolResult(ok(catalogData));
  } else {
    await bridge.sendToolInput({
      arguments: productMode ? { productId: 'P001' } : { cartId: id },
    });
    await bridge.sendToolResult(ok(productMode ? productDetail : cart));
  }
};
const iframe = document.querySelector('iframe')!;
await bridge.connect(
  new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!),
);
iframe.srcdoc = resourceHtml;
Object.assign(window, {
  fixture: {
    calls,
    opens,
    controls,
    deliverCart: async (cartId: string) => {
      await bridge.sendToolInput({ arguments: { cartId } });
      await bridge.sendToolResult(ok({ ...cart, cartId }));
    },
    remount: () => {
      iframe.srcdoc = resourceHtml;
    },
  },
});
