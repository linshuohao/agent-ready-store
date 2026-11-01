import { expect, it } from 'vitest';
import {
  consumeSelection,
  purchaseItems,
} from '../src/features/cart/purchase-selection';
it('consumes submitted A but keeps B selected while A was in flight', () => {
  const a = { productId: 'A', quantity: '2', selectionRevision: '1' };
  const b = { productId: 'B', quantity: '3', selectionRevision: '2' };
  expect(consumeSelection({ A: a, B: b }, { A: a })).toEqual({ B: b });
});
it('keeps A canceled and reselected with identical quantity after submission', () => {
  const a = { productId: 'A', quantity: '2', selectionRevision: '1' };
  const reselected = { ...a, selectionRevision: '2' };
  expect(consumeSelection({ A: reselected }, { A: a })).toEqual({
    A: reselected,
  });
});
it('validates only the purchase list and rejects invalid selected quantities', () => {
  expect(
    purchaseItems({
      A: { productId: 'A', quantity: '2', selectionRevision: '1' },
    }),
  ).toEqual([{ productId: 'A', quantity: 2 }]);
  expect(
    purchaseItems({
      A: { productId: 'A', quantity: '', selectionRevision: '1' },
    }),
  ).toBeNull();
});
