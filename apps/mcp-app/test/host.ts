// Test-only official AppBridge Host. It is not evidence of target Host compatibility.
import {
  AppBridge,
  PostMessageTransport,
} from '@modelcontextprotocol/ext-apps/app-bridge';
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
const calls: string[] = [],
  opens: string[] = [];
const ok = (data: unknown) => ({
  content: [{ type: 'text' as const, text: 'test fixture result' }],
  structuredContent: { ok: true, data, requestId: 'fixture' },
});
const bridge = new AppBridge(
  null,
  { name: 'S6 test-only host', version: '1' },
  { openLinks: {}, serverTools: {} },
);
bridge.oncalltool = async ({ name, arguments: args }) => {
  calls.push(name);
  if (name === 'get_cart') return ok({ cart, order: null });
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
Object.assign(window, { fixture: { calls, opens } });
