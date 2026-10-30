import { it, expect } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MoneyBreakdown, ProductPresentation, formatMoney } from '../src/index';
it('preserves exact decimal strings and unique quote headings across repeated mounts', () => {
  const quote = {
    currency: 'TWD' as const,
    items: [],
    subtotal: '90071992547409.91',
    thresholdDiscount: '0.00',
    aiDiscount: '0.00',
    shipping: '0.00',
    total: '90071992547409.91',
  };
  const html = renderToStaticMarkup(
    h(
      'div',
      null,
      h(MoneyBreakdown, { quote }),
      h(MoneyBreakdown, { quote, mode: 'completed' }),
    ),
  );
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((x) => x[1]);
  expect(new Set(ids).size).toBe(2);
  expect(html).toContain('成交金額');
  expect(html).toContain('目前已儲存報價');
  expect(formatMoney(quote.total)).toBe('NT$ 90,071,992,547,409.91');
});
it('escapes product text and retains distinct same-name product identities', () => {
  const product = {
    id: 'P001',
    name: '<script>alert(1)</script>',
    brand: 'Brand',
    category: 'A',
    currency: 'TWD' as const,
    price: '10.00',
    imagePath: null,
    availability: {
      canPurchase: false,
      reasons: ['SOLD_OUT' as const],
      currentQuantity: 0,
    },
  };
  const html = renderToStaticMarkup(
    h(
      'div',
      null,
      h(ProductPresentation, { product }),
      h(ProductPresentation, { product: { ...product, id: 'P002' } }),
    ),
  );
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('P001');
  expect(html).toContain('P002');
  expect(html).toContain('已售罄');
});
