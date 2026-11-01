import { expect, it } from 'vitest';
import * as c from '../src/index.js';
const id = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
it('accepts an independent purchase quantity without a cart version', () => {
  const body = {
    requestId,
    selectedItems: [{ productId: 'P001', quantity: 2 }],
    constraints: { currency: 'TWD' },
  };
  expect(c.createOrderInput.safeParse(body).success).toBe(true);
  expect(
    c.createOrderInput.safeParse({ ...body, expectedCartVersion: 1 }).success,
  ).toBe(false);
  expect(
    c.createOrderInput.safeParse({
      ...body,
      selectedItems: [{ productId: 'P001', expectedQuantity: 2 }],
    }).success,
  ).toBe(false);
  expect(
    c.quoteSelectionInput.safeParse({
      selectedItems: body.selectedItems,
      constraints: body.constraints,
    }).success,
  ).toBe(true);
});
it('accepts only one add identity and never a version', () => {
  expect(c).toHaveProperty('addCartItemInput');
  const schema = c.addCartItemInput;
  const body = {
    initializationId: id,
    operationRequestId: requestId,
    productId: 'P001',
    quantity: 1,
  };
  expect(schema.safeParse(body).success).toBe(true);
  expect(schema.safeParse({ ...body, cartId: id }).success).toBe(false);
  expect(schema.safeParse({ ...body, expectedCartVersion: 1 }).success).toBe(
    false,
  );
  expect(schema.safeParse({ ...body, quantity: 0 }).success).toBe(false);
  expect(schema.safeParse({ ...body, origin: 'AGENT' }).success).toBe(false);
  expect(
    schema.safeParse({
      operationRequestId: requestId,
      productId: 'P001',
      quantity: 1,
    }).success,
  ).toBe(false);
});
it('keeps version protection only on absolute edits', () => {
  const add = {
    operationRequestId: requestId,
    operation: { type: 'add_item', productId: 'P001', quantity: 1 },
  };
  expect(c.persistentCartOperationInput.safeParse(add).success).toBe(true);
  expect(
    c.persistentCartOperationInput.safeParse({ ...add, expectedCartVersion: 1 })
      .success,
  ).toBe(false);
  const set = { ...add, operation: { ...add.operation, type: 'set_quantity' } };
  expect(c.persistentCartOperationInput.safeParse(set).success).toBe(false);
  expect(
    c.persistentCartOperationInput.safeParse({ ...set, expectedCartVersion: 1 })
      .success,
  ).toBe(true);
  expect(
    c.getOrCreateCartInput.safeParse({ requestId, initialItems: [] }).success,
  ).toBe(false);
});
it('uses a read-only result target rather than a replay payload', () => {
  expect(c).toHaveProperty('requestResultInput');
  const schema = c.requestResultInput;
  expect(
    schema.safeParse({ kind: 'order', cartId: id, requestId }).success,
  ).toBe(true);
  expect(
    schema.safeParse({ kind: 'cart', initializationId: id, requestId }).success,
  ).toBe(true);
  expect(schema.safeParse({ kind: 'initialize', requestId }).success).toBe(
    true,
  );
  expect(
    schema.safeParse({ kind: 'order', initializationId: id, requestId })
      .success,
  ).toBe(false);
  expect(
    schema.safeParse({
      kind: 'cart',
      cartId: id,
      initializationId: id,
      requestId,
    }).success,
  ).toBe(false);
  expect(
    schema.safeParse({
      kind: 'order',
      cartId: id,
      requestId,
      selectedItems: [],
    }).success,
  ).toBe(false);
});
it('does not fabricate failure or execution status from missing results', () => {
  expect(c).toHaveProperty('requestResultOutput');
  expect(
    c.requestResultOutput.safeParse({ status: 'not_found', kind: 'order' })
      .success,
  ).toBe(true);
  for (const status of ['failed', 'in_progress', 'cancelled'])
    expect(
      c.requestResultOutput.safeParse({ status, kind: 'order' }).success,
    ).toBe(false);
});
