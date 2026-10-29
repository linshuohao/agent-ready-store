import { describe, it, expect } from 'vitest';
import { cartCreateInput, cartReplaceInput } from '../src/index.js';
const valid = {
  createRequestId: '75bf81b7-1522-44e6-9a23-72916da06446',
  cartToken: 'A'.repeat(43),
  items: [{ productId: 'P001', quantity: 1 }],
};
describe('cart request boundaries', () => {
  it('accepts valid and empty human carts', () => {
    expect(cartCreateInput.safeParse(valid).success).toBe(true);
    expect(cartCreateInput.safeParse({ ...valid, items: [] }).success).toBe(
      true,
    );
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER])(
    'rejects invalid quantity %s without correcting it',
    (quantity) => {
      expect(
        cartCreateInput.safeParse({
          ...valid,
          items: [{ productId: 'P001', quantity }],
        }).success,
      ).toBe(false);
    },
  );
  it('rejects duplicate IDs, forged origin/prices and oversized requests', () => {
    expect(
      cartCreateInput.safeParse({
        ...valid,
        items: [valid.items[0], valid.items[0]],
      }).success,
    ).toBe(false);
    expect(
      cartCreateInput.safeParse({ ...valid, origin: 'AGENT' }).success,
    ).toBe(false);
    expect(
      cartCreateInput.safeParse({
        ...valid,
        items: [{ ...valid.items[0], price: '1.00' }],
      }).success,
    ).toBe(false);
    expect(
      cartCreateInput.safeParse({
        ...valid,
        items: Array.from({ length: 101 }, (_, n) => ({
          productId: `P${n}`,
          quantity: 1,
        })),
      }).success,
    ).toBe(false);
  });
  it('requires a positive expected version and does not permit credentials in edits', () => {
    expect(
      cartReplaceInput.safeParse({ expectedCartVersion: 1, items: [] }).success,
    ).toBe(true);
    expect(
      cartReplaceInput.safeParse({ expectedCartVersion: 0, items: [] }).success,
    ).toBe(false);
    expect(
      cartReplaceInput.safeParse({
        expectedCartVersion: 1,
        items: [],
        cartToken: valid.cartToken,
      }).success,
    ).toBe(false);
  });
});
