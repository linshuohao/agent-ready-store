import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Catalog } from '../../src/catalog/catalog.js';
import { CatalogService } from '../../src/catalog/catalog.service.js';
const source = JSON.parse(readFileSync('references/products.json', 'utf8'));
function fixture(categories: string[]) {
  return new Catalog(
    JSON.stringify({
      ...source,
      products: categories.map((category, i) => ({
        ...source.products[0],
        id: `C${i}`,
        category,
        stock: 0,
      })),
    }),
  );
}
describe('category discovery', () => {
  it('returns original unique nonempty values independent of stock, in stable pages', () => {
    const catalog = fixture(['耳机', '耳機', ' A ', 'B', 'B', '', '  ']);
    const first = catalog.categories({ limit: 2 });
    expect(first).toMatchObject({
      items: [
        { value: ' A ', label: ' A ' },
        { value: 'B', label: 'B' },
      ],
      total: 4,
      nextOffset: 2,
    });
    const second = catalog.categories({
      offset: 2,
      limit: 2,
      catalogRevision: first.catalogRevision,
    });
    expect(second.items.map((v) => v.value)).toEqual(['耳机', '耳機']);
    expect(second.nextOffset).toBeNull();
    expect(
      catalog.search({ category: first.items[0].value }, new Map()).total,
    ).toBe(1);
    expect(JSON.stringify(first)).not.toMatch(
      /stock|margin_rate|recommendation_score/,
    );
  });
  it('rejects invalid inputs and mismatched revisions rather than dropping conditions', () => {
    const catalog = fixture(['A']);
    for (const input of [
      { offset: -1 },
      { limit: 0 },
      { limit: 101 },
      { limit: 1.5 },
      { offset: 1 },
      { q: 'A' },
    ])
      expect(() => catalog.categories(input)).toThrow('VALIDATION_ERROR');
    expect(() => catalog.categories({ catalogRevision: 'old' })).toThrow(
      'CATALOG_CHANGED',
    );
    expect(fixture(['', ' ']).categories({}).items).toEqual([]);
    expect(
      catalog.categories({ offset: 10, catalogRevision: catalog.revision })
        .items,
    ).toEqual([]);
  });
  it('service does not read inventory or maintenance dependencies', () => {
    const service = Object.create(CatalogService.prototype) as CatalogService;
    Object.defineProperty(service, 'catalog', { value: fixture(['A']) });
    const stock = vi
      .spyOn(service, 'stock')
      .mockRejectedValue(new Error('database unavailable'));
    expect(service.categories({}).items).toEqual([{ value: 'A', label: 'A' }]);
    expect(stock).not.toHaveBeenCalled();
  });
});
