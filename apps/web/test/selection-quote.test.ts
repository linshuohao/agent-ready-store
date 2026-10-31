import { it, expect } from 'vitest';
import { quoteCart } from '../src/features/cart/lifecycle-commands';
it('preserves shortage issues through the shared Web/Apps quote response parser', async () => {
  const estimate = {
    currency: 'TWD',
    pricingRuleVersion: 'pricing-v1',
    items: [
      {
        productId: 'P001',
        name: 'Item',
        brand: 'Brand',
        specs: {},
        quantity: 2,
        unitPrice: '100.00',
        lineSubtotal: '200.00',
      },
    ],
    subtotal: '200.00',
    thresholdDiscount: '0.00',
    aiDiscount: '0.00',
    shipping: '100.00',
    total: '300.00',
    issues: [{ productId: 'P001', code: 'INSUFFICIENT_STOCK' }],
  };
  const result = await quoteCart(
    '10000000-0000-4000-8000-000000000001',
    [{ productId: 'P001', expectedQuantity: 2 }],
    async () => new Response(JSON.stringify({ ok: true, data: estimate })),
  );
  expect(result).toMatchObject({
    kind: 'success',
    data: {
      total: '300.00',
      issues: [{ productId: 'P001', code: 'INSUFFICIENT_STOCK' }],
    },
  });
});
