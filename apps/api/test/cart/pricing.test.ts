import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { priceSelection } from '../../src/cart/pricing.js';
import { Catalog } from '../../src/catalog/catalog.js';

const line = (unitPrice: string, quantity = 1, productId = 'A') => ({
  productId,
  name: productId,
  unitPrice,
  quantity,
});
describe('approved cart pricing', () => {
  it.each([
    ['HUMAN', '989.99', '0.00', '0.00', '100.00', '1089.99'],
    ['HUMAN', '990.00', '0.00', '0.00', '0.00', '990.00'],
    ['HUMAN', '999.99', '0.00', '0.00', '0.00', '999.99'],
    ['HUMAN', '1000.00', '100.00', '0.00', '0.00', '900.00'],
    ['AGENT', '989.99', '0.00', '49.50', '100.00', '1040.49'],
    ['AGENT', '990.00', '0.00', '49.50', '0.00', '940.50'],
    ['AGENT', '999.99', '0.00', '50.00', '0.00', '949.99'],
    ['AGENT', '1000.00', '100.00', '45.00', '0.00', '855.00'],
    ['AGENT', '2000.00', '100.00', '95.00', '0.00', '1805.00'],
  ] as const)(
    '%s at %s uses independent promotion and shipping thresholds',
    (origin, subtotal, thresholdDiscount, aiDiscount, shipping, total) => {
      expect(
        priceSelection([line(subtotal)], origin === 'AGENT'),
      ).toMatchObject({
        currency: 'TWD',
        subtotal,
        thresholdDiscount,
        aiDiscount,
        shipping,
        total,
      });
    },
  );
  it('rounds HALF_UP after aggregation, not per item', () => {
    expect(priceSelection([line('0.10', 3)], true)).toMatchObject({
      subtotal: '0.30',
      aiDiscount: '0.01',
      shipping: '100.00',
      total: '100.29',
    });
  });
  it('does not charge shipping for an empty cart', () => {
    expect(priceSelection([], false)).toBeNull();
  });
  it('rejects overflow instead of truncating the amount', () => {
    expect(() =>
      priceSelection([line('9007199254740991.00', 2147483647)], false),
    ).toThrow('AMOUNT_OUT_OF_RANGE');
  });
  it('preserves the catalog price literal before binary number conversion', () => {
    const data = JSON.parse(readFileSync('references/products.json', 'utf8'));
    data.products[0].price = 1;
    const raw = JSON.stringify(data).replace(
      '"price":1,',
      '"price":90071992547409.91,',
    );
    const catalog = new Catalog(raw);
    expect(
      catalog.get(data.products[0].id, new Map([[data.products[0].id, 10]]))
        .price,
    ).toBe('90071992547409.91');
  });
});
