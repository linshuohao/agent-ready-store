import { it, expect } from 'vitest';
import * as contracts from '../src/index.js';
it('requires an entire unique selection and rejects client prices or eligibility', () => {
  expect(contracts).toHaveProperty('createOrderInput');
  const schema = contracts.createOrderInput;
  const body = {
    requestId: '11111111-1111-4111-8111-111111111111',
    expectedCartVersion: 1,
    selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
    constraints: { currency: 'TWD', maxTotal: '1000.00' },
  };
  expect(schema.safeParse(body).success).toBe(true);
  for (const change of [
    { selectedItems: [] },
    { selectedItems: [...body.selectedItems, ...body.selectedItems] },
    { aiEligible: true },
    { price: '1.00' },
    { selectedItems: [{ productId: 'P001', expectedQuantity: 0 }] },
    { constraints: { currency: 'USD' } },
  ])
    expect(schema.safeParse({ ...body, ...change }).success).toBe(false);
});
it('separates ID recovery from initialization and bounds pagination', () => {
  expect(contracts).toHaveProperty('getOrCreateCartInput');
  expect(
    contracts.getOrCreateCartInput.safeParse({
      cartId: '11111111-1111-4111-8111-111111111111',
    }).success,
  ).toBe(true);
  expect(
    contracts.getOrCreateCartInput.safeParse({
      cartId: '11111111-1111-4111-8111-111111111111',
      initialItems: [],
    }).success,
  ).toBe(false);
  expect(contracts.listOrdersInput.safeParse({ limit: 101 }).success).toBe(
    false,
  );
});
it('does not accept a paid effective state without a committed paid order', () => {
  const order = {
    orderId: '11111111-1111-4111-8111-111111111111',
    cartId: '22222222-2222-4222-8222-222222222222',
    sourceCartVersion: 1,
    status: 'CHECKOUT',
    effectiveStatus: 'PAID',
    createdAt: '2026-10-31T00:00:00.000Z',
    reservationExpiresAt: '2026-10-31T00:15:00.000Z',
    paidAt: null,
    closedAt: null,
    closeReason: null,
    createdByChannel: 'WEB',
    aiEligible: false,
    summary: {
      currency: 'TWD',
      pricingRuleVersion: 'pricing-v1',
      items: [
        {
          productId: 'A',
          name: 'A',
          brand: 'A',
          specs: {},
          quantity: 1,
          unitPrice: '10.00',
          lineSubtotal: '10.00',
        },
      ],
      subtotal: '10.00',
      thresholdDiscount: '0.00',
      aiDiscount: '0.00',
      shipping: '100.00',
      total: '110.00',
    },
    allowedActions: { canPay: false, canCancel: false },
    navigation: {
      orderUrl: 'http://localhost/orders/1',
      shareUrl: 'http://localhost/orders/1?view=share',
    },
  };
  expect(contracts.orderViewOutput.safeParse(order).success).toBe(false);
  expect(
    contracts.orderViewOutput.safeParse({
      ...order,
      status: 'PAID',
      paidAt: '2026-10-31T00:01:00.000Z',
    }).success,
  ).toBe(true);
  expect(
    contracts.orderViewOutput.safeParse({
      ...order,
      effectiveStatus: 'EXPIRED',
    }).success,
  ).toBe(true);
  expect(
    contracts.orderViewOutput.safeParse({
      ...order,
      effectiveStatus: 'CANCELLED',
    }).success,
  ).toBe(false);
});
