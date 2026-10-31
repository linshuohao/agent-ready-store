import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CartService } from '../../src/cart/cart.service.js';
import { Catalog } from '../../src/catalog/catalog.js';
import { result } from '../../src/shared/result.js';

// Read-only fixture: exercises the real selection, catalog, pricing and constraint code.
// Does not claim database transaction, reservation or concurrency verification.
const catalog = new Catalog(readFileSync('references/products.json', 'utf8'));
const cartId = randomUUID();
const tx = {
  cart: {
    findUnique: async () => ({
      id: cartId,
      items: [{ productId: 'P001', quantity: 1 }],
    }),
  },
  inventory: {
    findMany: async () => [
      { productId: 'P001', quantity: 30, reservedQuantity: 0 },
    ],
  },
};
const db = {
  $transaction: async (work: (t: typeof tx) => unknown) => work(tx),
} as unknown as ConstructorParameters<typeof CartService>[1];
const service = new CartService(catalog, db);
const quote = (constraints: Record<string, unknown>) =>
  result(() =>
    service.quoteSelection(
      cartId,
      {
        selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
        constraints: { currency: 'TWD', ...constraints },
      },
      'MCP',
    ),
  );

describe('selection constraint failure details', () => {
  it('reports untranslated missing spec keys and actual values', async () => {
    const value = await quote({
      items: [
        { productId: 'P001', specs: { 连接: '蓝牙 5.3', 連線: 'wrong' } },
      ],
    });
    expect(value).toMatchObject({
      ok: false,
      error: {
        code: 'SPEC_MISMATCH',
        retryable: false,
        constraintViolations: [
          {
            productId: 'P001',
            field: '连接',
            expected: '蓝牙 5.3',
            actual: null,
          },
          {
            productId: 'P001',
            field: '連線',
            expected: 'wrong',
            actual: '藍牙 5.3',
          },
        ],
      },
    });
  });
  it('reports inherited object property names as absent specs', async () => {
    expect(
      await quote({
        items: [{ productId: 'P001', specs: { toString: 'invalid' } }],
      }),
    ).toMatchObject({
      ok: false,
      error: { constraintViolations: [{ field: 'toString', actual: null }] },
    });
  });
  it('reports unit price and the discounted total including shipping separately', async () => {
    expect(
      await quote({ items: [{ productId: 'P001', maxUnitPrice: '1.00' }] }),
    ).toMatchObject({
      ok: false,
      error: {
        code: 'BUDGET_EXCEEDED',
        constraintViolations: [
          {
            productId: 'P001',
            field: 'maxUnitPrice',
            expected: '1.00',
            actual: '1890.00',
          },
        ],
      },
    });
    expect(await quote({ maxTotal: '1700.49' })).toMatchObject({
      ok: false,
      error: {
        code: 'BUDGET_EXCEEDED',
        constraintViolations: [
          { field: 'maxTotal', expected: '1700.49', actual: '1700.50' },
        ],
      },
    });
  });
  it('accepts the exact spec and budget boundary without changing pricing', async () => {
    expect(
      await quote({
        maxTotal: '1700.50',
        items: [{ productId: 'P001', specs: { 連線: '藍牙 5.3' } }],
      }),
    ).toMatchObject({ ok: true, data: { total: '1700.50', shipping: '0.00' } });
  });
});
