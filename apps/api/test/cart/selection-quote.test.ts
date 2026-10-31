import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Catalog } from '../../src/catalog/catalog.js';
import { quoteCart } from '../../../../packages/commerce-ui/src/features/cart/lifecycle-commands';
import { CartService } from '../../src/cart/cart.service.js';

const cartId = '10000000-0000-4000-8000-000000000001';
const catalog = new Catalog(readFileSync('references/products.json', 'utf8'));
const input = {
  selectedItems: [{ productId: 'P001', expectedQuantity: 2 }],
  constraints: { currency: 'TWD' },
};
// Only the database read boundary is substituted; selection and pricing are real.
function service(quantity: number, reservedQuantity = 0) {
  const tx = {
    cart: {
      findUnique: async () => ({
        id: cartId,
        items: [{ productId: 'P001', quantity: 2 }],
      }),
    },
    inventory: {
      findMany: async () => [{ productId: 'P001', quantity, reservedQuantity }],
    },
  };
  return new CartService(catalog, {
    $transaction: async (work: (db: typeof tx) => unknown) => work(tx),
  } as never);
}
it.each([
  [2, 1, 'INSUFFICIENT_STOCK'],
  [2, 2, 'SOLD_OUT'],
] as const)(
  'quotes unchanged amounts when inventory %s has %s reserved',
  async (quantity, reserved, code) => {
    const available = await service(2).quoteSelection(cartId, input, 'WEB');
    const blocked = await service(quantity, reserved).quoteSelection(
      cartId,
      input,
      'WEB',
    );
    expect(blocked).toMatchObject({
      total: available.total,
      subtotal: available.subtotal,
      issues: [{ productId: 'P001', code }],
    });
  },
);
it('does not quote anomalous inventory as a stock shortage', async () => {
  await expect(
    service(-1).quoteSelection(cartId, input, 'WEB'),
  ).rejects.toMatchObject({ code: 'CART_ITEMS_INVALID' });
});

it('preserves shortage issues through the shared Web/Apps quote response parser', async () => {
  const estimate = await service(2, 1).quoteSelection(cartId, input, 'WEB');
  const result = await quoteCart(
    cartId,
    input.selectedItems,
    async () => new Response(JSON.stringify({ ok: true, data: estimate })),
  );
  expect(result).toMatchObject({
    kind: 'success',
    data: {
      total: estimate.total,
      issues: [{ productId: 'P001', code: 'INSUFFICIENT_STOCK' }],
    },
  });
});
