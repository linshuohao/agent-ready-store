// Test-only official AppBridge Host. It is not evidence of target Host compatibility.
import {
  AppBridge,
  PostMessageTransport,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import type { OrderResult, PurchaseStatus } from '@store/contracts';
declare const __APP_HTML__: string;
const id = '10000000-0000-4000-8000-000000000001',
  token = 'A'.repeat(43);
let cart = {
  cartId: id,
  origin: 'AGENT',
  cartVersion: 1,
  orderId: null,
  items: [
    {
      productId: 'P001',
      quantity: 1,
      name: '同名耳機',
      unitPrice: '10.00',
      availability: { canPurchase: true, reasons: [], currentQuantity: 8 },
    },
    {
      productId: 'P002',
      quantity: 1,
      name: '同名耳機',
      unitPrice: '10.00',
      availability: { canPurchase: true, reasons: [], currentQuantity: 8 },
    },
  ],
  quote: {
    currency: 'TWD',
    items: [
      {
        productId: 'P001',
        quantity: 1,
        name: '同名耳機',
        unitPrice: '10.00',
        lineSubtotal: '10.00',
      },
      {
        productId: 'P002',
        quantity: 1,
        name: '同名耳機',
        unitPrice: '10.00',
        lineSubtotal: '10.00',
      },
    ],
    subtotal: '20.00',
    thresholdDiscount: '0.00',
    aiDiscount: '0.00',
    shipping: '0.00',
    total: '20.00',
  },
  quoteHash: 'a'.repeat(64),
  issues: [],
  canCheckout: true,
  expiresAt: '2099-01-01T00:00:00.000Z',
};
let purchase: PurchaseStatus | null = null;
let order: OrderResult | null = null;
const reviewId = '20000000-0000-4000-8000-000000000001';
const calls: string[] = [],
  opens: string[] = [];
const ok = (data: unknown) => ({
  content: [{ type: 'text' as const, text: 'test fixture result' }],
  structuredContent: { ok: true, data, requestId: 'fixture' },
});
const controls = { failPayOnce: false };
const bridge = new AppBridge(
  null,
  { name: 'S6 test-only host', version: '1' },
  { openLinks: {}, serverTools: {} },
);
bridge.oncalltool = async ({ name, arguments: args }) => {
  calls.push(name);
  if (name === 'get_cart') return ok({ cart, order });
  if (name === 'update_cart') {
    const items = args!.items as { productId: string; quantity: number }[];
    if (args!.expectedCartVersion !== cart.cartVersion)
      return {
        content: [],
        isError: true,
        structuredContent: {
          ok: false,
          error: { code: 'CART_VERSION_CONFLICT' },
        },
      };
    cart = {
      ...cart,
      cartVersion: cart.cartVersion + 1,
      items: items.map((x) => ({
        ...cart.items.find((i) => i.productId === x.productId)!,
        quantity: x.quantity,
      })),
    };
    cart.quote = {
      ...cart.quote,
      items: cart.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineSubtotal: item.quantity === 2 ? '20.00' : '10.00',
      })),
      subtotal: '30.00',
      total: '30.00',
    };
    return ok(cart);
  }
  if (name === 'prepare_checkout') {
    purchase ??= {
      reviewId,
      cartId: id,
      channel: 'apps',
      state: 'pending',
      expiresAt: cart.expiresAt,
      order: null,
      summary: {
        cartId: id,
        cartVersion: cart.cartVersion,
        origin: 'AGENT',
        pricingRuleVersion: 'pricing-v1',
        quote: { ...cart.quote, currency: 'TWD' },
        items: cart.quote.items.map((item) => ({
          ...item,
          brand: 'Fixture',
          specs: { 顏色: '黑' },
        })),
      },
    };
    return {
      ...ok(purchase),
      _meta: {
        purchaseMaterials: {
          payToken: 'fixture-pay',
          cancelToken: 'fixture-cancel',
        },
      },
    };
  }
  if (name === 'get_purchase_status') return ok(purchase);
  if (name === 'pay_purchase') {
    if (controls.failPayOnce) {
      controls.failPayOnce = false;
      throw new Error('Fixture lost response');
    }
    if (!purchase || args?.payToken !== 'fixture-pay')
      throw new Error('Missing fixture material');
    order = {
      orderId: reviewId,
      cartId: id,
      createdAt: '2026-10-30T00:00:00.000Z',
      purchaseHash: 'a'.repeat(64),
      catalogRevision: 'fixture',
      snapshot: purchase.summary,
    };
    purchase = { ...purchase, state: 'completed', order };
    return ok(order);
  }
  if (name === 'cancel_app_purchase') {
    if (!purchase || args?.cancelToken !== 'fixture-cancel')
      throw new Error('Missing fixture material');
    purchase = { ...purchase, state: 'cancelled' };
    return ok(purchase);
  }
  if (name === 'get_order_link' && order)
    return ok({
      url: `http://localhost:3000/order-details/${order.orderId}#order-read=fixture-order`,
      expiresAt: cart.expiresAt,
    });
  if (name === 'create_handoff')
    return ok({
      cart,
      handoff: {
        url: `http://localhost:3000/checkout/${id}#handoff=${token}`,
        issuedAt: '2026-10-30T00:00:00.000Z',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      requiresHumanConfirmation: true,
    });
  throw new Error('Unexpected fixture tool');
};
bridge.onopenlink = async ({ url }) => {
  opens.push(url);
  return { isError: false };
};
bridge.oninitialized = async () => {
  await bridge.sendToolInput({
    arguments: { cartId: id, cartAccessToken: token },
  });
  await bridge.sendToolResult(ok({ cart, order: null }));
};
const iframe = document.querySelector('iframe')!;
await bridge.connect(
  new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!),
);
iframe.srcdoc = __APP_HTML__;
Object.assign(window, { fixture: { calls, opens, controls } });
