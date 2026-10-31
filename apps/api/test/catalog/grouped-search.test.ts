import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Catalog } from '../../src/catalog/catalog.js';
const sample = JSON.parse(readFileSync('references/products.json', 'utf8'))
  .products[0];
const products = [
  {
    ...sample,
    id: 'A',
    name: '藍牙耳機',
    brand: 'Acme',
    category: '音訊',
    description: '無線',
    price: 100,
    recommendation_score: 90,
  },
  {
    ...sample,
    id: 'B',
    name: '藍牙耳機',
    brand: 'Acme',
    category: '音訊',
    description: '無線',
    price: 200,
    recommendation_score: 90,
  },
  {
    ...sample,
    id: 'C',
    name: '水瓶',
    brand: 'Bottle',
    category: '容器',
    description: '水瓶',
    price: 50,
    recommendation_score: 95,
  },
  {
    ...sample,
    id: 'D',
    name: '保溫杯',
    brand: 'Bottle',
    category: '容器',
    description: '保溫杯',
    price: 60,
    recommendation_score: 99,
  },
];
const catalog = new Catalog(JSON.stringify({ currency: 'TWD', products }));
const stock = new Map(products.map((p) => [p.id, 3]));
describe('multilingual grouped catalog', () => {
  it('normalizes traditional/simplified and registered aliases without dropping unknown constraints', () => {
    for (const q of ['藍牙', '蓝牙', 'Bluetooth', 'ＢＬＵＥＴＯＯＴＨ'])
      expect(catalog.search({ q }, stock).items.map((p) => p.id)).toEqual([
        'A',
        'B',
      ]);
    expect(
      catalog.search({ q: 'water bottle' }, stock).items.map((p) => p.id),
    ).toEqual(['C']);
    for (const q of ['water bottle missing', 'Bluetooth Z99', 'bluetoothish'])
      expect(catalog.search({ q }, stock).total).toBe(0);
    expect(catalog.search({ q: '蓝牙', brand: 'acme' }, stock).total).toBe(0);
  });
  it('keeps independent budgets, empty targets and deduplicated identity references', () => {
    const result = catalog.searchGrouped(
      {
        queries: [
          { id: 'a', q: 'Bluetooth', maxPrice: 100 },
          { id: 'b', q: '蓝牙' },
          { id: 'c', q: 'missing' },
        ],
      },
      stock,
    );
    expect(
      result.groups.map((g) => [
        g.id,
        g.status,
        g.status === 'error' ? [] : g.productIds,
      ]),
    ).toEqual([
      ['a', 'ok', ['A']],
      ['b', 'ok', ['A', 'B']],
      ['c', 'empty', []],
    ]);
    expect(result.products.map((p) => p.id)).toEqual(['A', 'B']);
    expect(JSON.stringify(result)).not.toMatch(
      /margin_rate|recommendation_score/,
    );
  });
  it('requires both top-level versions for continuation and rejects mixed/invalid queries', () => {
    const first = catalog.searchGrouped(
      { queries: [{ id: 'a', q: '蓝牙', limit: 1 }] },
      stock,
    );
    expect(first.groups[0]).toMatchObject({ total: 2, nextOffset: 1 });
    const versions = {
      catalogRevision: first.catalogRevision,
      searchRevision: first.searchRevision,
    };
    expect(
      catalog.searchGrouped(
        { ...versions, queries: [{ id: 'a', q: '蓝牙', limit: 1, offset: 1 }] },
        stock,
      ).groups[0],
    ).toMatchObject({ productIds: ['B'] });
    for (const input of [
      { queries: [] },
      { queries: [{ id: 'a' }, { id: 'a' }] },
      { queries: [{ id: 'a', limit: 11 }] },
      { queries: [{ id: 'a', offset: 1 }] },
      { queries: [{ id: 'a' }], q: 'x' },
      { queries: [{ id: 'a', minPrice: 100, maxPrice: 1 }] },
    ])
      expect(() => catalog.searchGrouped(input, stock)).toThrow(
        'VALIDATION_ERROR',
      );
    expect(() =>
      catalog.searchGrouped(
        { ...versions, searchRevision: 'old', queries: [{ id: 'a' }] },
        stock,
      ),
    ).toThrow('CATALOG_CHANGED');
  });
});

it('reads shared inventory once and fails the entire batch when that read fails', async () => {
  const { CatalogService } =
    await import('../../src/catalog/catalog.service.js');
  let reads = 0;
  let fail = false;
  const service = Object.assign(Object.create(CatalogService.prototype), {
    catalog,
    db: {
      inventory: {
        findMany: async () => {
          reads++;
          if (fail) throw Error('DB unavailable');
          return products.map((p) => ({
            productId: p.id,
            quantity: 3,
            reservedQuantity: 0,
          }));
        },
      },
    },
  }) as InstanceType<typeof CatalogService>;
  const response = await service.discover({
    queries: [{ id: 'a' }, { id: 'b' }],
  });
  expect('groups' in response && response.groups.length).toBe(2);
  expect(reads).toBe(1);
  fail = true;
  await expect(
    service.discover({ queries: [{ id: 'a' }, { id: 'b' }] }),
  ).rejects.toThrow('DB unavailable');
});
