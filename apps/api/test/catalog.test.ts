import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Catalog } from '../src/catalog.js';
const raw = readFileSync('references/products.json', 'utf8');
const stock = new Map<string, number>(
  JSON.parse(raw).products.map((p: { id: string; stock: number }) => [
    p.id,
    p.stock,
  ]),
);
describe('Catalog public contract', () => {
  it('preserves 30 identities and excludes private fields from list and detail', () => {
    const c = new Catalog(raw);
    const page = c.search({ limit: 50 }, stock);
    expect(page.total).toBe(30);
    expect(page.items).toHaveLength(30);
    expect(c.get('P001', stock).id).not.toBe(c.get('P002', stock).id);
    const text = JSON.stringify([page, c.get('P005', stock)]);
    expect(text).not.toMatch(/margin_rate|recommendation_score/);
    expect(page.items[0]).not.toHaveProperty('reviews');
    expect(c.get('P005', stock)).not.toHaveProperty('reviews');
  });
  it('classifies real unavailable samples and never falls back on missing inventory', () => {
    const c = new Catalog(raw);
    for (const [id, reason] of [
      ['P002', 'SOLD_OUT'],
      ['P008', 'INVENTORY_ANOMALY'],
      ['P010', 'PRICE_PENDING'],
    ]) {
      expect(c.get(id, stock).availability).toMatchObject({
        canPurchase: false,
        reasons: [reason],
      });
    }
    const missing = new Map(stock);
    missing.delete('P001');
    expect(c.get('P001', missing).availability).toMatchObject({
      canPurchase: false,
      currentQuantity: null,
      reasons: ['INVENTORY_UNAVAILABLE'],
    });
  });
  it('filters before sorting and uses stable ID ties with normalized AND search', () => {
    const source = JSON.parse(raw);
    const sample = source.products[0];
    source.products = [
      {
        ...sample,
        id: 'B',
        name: 'Audio Pro',
        brand: 'Acme',
        recommendation_score: 99,
      },
      {
        ...sample,
        id: 'A',
        name: 'Audio Pro',
        brand: 'Acme',
        recommendation_score: 99,
      },
      {
        ...sample,
        id: 'C',
        name: 'Other',
        brand: 'Acme',
        recommendation_score: 100,
      },
    ];
    const c = new Catalog(JSON.stringify(source));
    expect(
      c.search(
        { q: ' ＡＵＤＩＯ  acme ', limit: 1 },
        new Map([
          ['A', 1],
          ['B', 1],
          ['C', 1],
        ]),
      ),
    ).toMatchObject({ total: 2, nextOffset: 1, items: [{ id: 'A' }] });
  });
  it('rejects malformed input, unknown fields and outdated revisions', () => {
    const c = new Catalog(raw);
    for (const input of [
      { limit: 51 },
      { offset: -1 },
      { minPrice: 10, maxPrice: 1 },
      { sort: 'margin' },
      { bogus: 1 },
    ])
      expect(() => c.search(input, stock)).toThrow('VALIDATION_ERROR');
    expect(() => c.search({ catalogRevision: 'old' }, stock)).toThrow(
      'CATALOG_CHANGED',
    );
    expect(() => c.get('missing', stock)).toThrow('NOT_FOUND');
  });
  it('paginates all comments as untrusted text and rejects mixed revisions', () => {
    const c = new Catalog(raw);
    const first = c.reviews('P005', { limit: 1 });
    const source = JSON.parse(raw).products.find(
      (p: { id: string }) => p.id === 'P005',
    );
    const items = [...first.items];
    let next = first.nextOffset;
    while (next !== null) {
      const p = c.reviews('P005', {
        limit: 1,
        offset: next,
        catalogRevision: first.catalogRevision,
      });
      items.push(...p.items);
      next = p.nextOffset;
    }
    expect(items.map((r) => r.content)).toEqual(
      source.reviews.map((r: { content: string }) => r.content),
    );
    expect(new Set(items.map((r) => r.reviewId)).size).toBe(items.length);
    expect(items.some((r) => r.content.includes('[SYSTEM]'))).toBe(true);
    expect(() => c.reviews('P005', { catalogRevision: 'old' })).toThrow(
      'CATALOG_CHANGED',
    );
  });
  it('reflects inventory changes between pages without changing catalog revision', () => {
    const c = new Catalog(raw);
    const first = c.search({ purchasableOnly: true, limit: 1 }, stock);
    const updated = new Map(stock);
    updated.set(first.items[0].id, 0);
    const second = c.search(
      {
        purchasableOnly: true,
        offset: 1,
        limit: 1,
        catalogRevision: first.catalogRevision,
      },
      updated,
    );
    expect(second.total).toBe(first.total - 1);
    expect(second.catalogRevision).toBe(first.catalogRevision);
    expect(c.search({ offset: 1000 }, stock)).toMatchObject({
      items: [],
      nextOffset: null,
    });
  });
  it('rejects duplicate IDs or missing fields instead of silently dropping products', () => {
    const source = JSON.parse(raw);
    source.products.push(source.products[0]);
    expect(() => new Catalog(JSON.stringify(source))).toThrow();
    expect(() => new Catalog('{"currency":"TWD","products":[{}]}')).toThrow();
  });
});
