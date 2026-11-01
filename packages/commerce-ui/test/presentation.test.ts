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
  expect(ids).toHaveLength(4);
  expect(new Set(ids).size).toBe(ids.length);
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

it('distinguishes deductions, shipping charges, free shipping and the final server total', () => {
  const quote = {
    currency: 'TWD' as const,
    items: [],
    subtotal: '3360.00',
    thresholdDiscount: '100.00',
    aiDiscount: '0.00',
    shipping: '60.00',
    total: '3320.00',
  };
  const charged = renderToStaticMarkup(h(MoneyBreakdown, { quote }));
  expect(charged).toContain('− NT$ 100.00');
  expect(charged).toContain('＋ NT$ 60.00');
  expect(charged).not.toContain('− NT$ 0.00');
  expect(charged).toContain('NT$ 3,320.00');
  const free = renderToStaticMarkup(
    h(MoneyBreakdown, {
      quote: { ...quote, shipping: '0.00', total: '3260.00' },
    }),
  );
  expect(free).toContain('免運');
  expect(free).not.toContain('＋ NT$ 0.00');
  expect(free).toContain('NT$ 3,260.00');
});
