import { it, expect } from 'vitest';
import { mergeSearchGroup } from '../src/grouped-search-state';
const query = (id: string) => ({
  id,
  q: '',
  limit: 4,
  offset: 0,
  sort: 'recommendation' as const,
  purchasableOnly: false,
});
const group = (id: string) => ({
  id,
  label: id,
  query: query(id),
  status: 'empty' as const,
  total: 0 as const,
  productIds: [],
  nextOffset: null,
});
it('replaces only the requested group and rejects cross-version results', () => {
  const original = {
    kind: 'grouped' as const,
    catalogRevision: 'c',
    searchRevision: 's',
    groups: [group('a'), group('b')],
    products: [],
  };
  const updated = {
    ...original,
    groups: [{ ...group('a'), query: { ...query('a'), offset: 4 } }],
  };
  const merged = mergeSearchGroup(original, updated, 'a');
  expect(merged.groups[0].query.offset).toBe(4);
  expect(merged.groups[1]).toEqual(original.groups[1]);
  expect(() =>
    mergeSearchGroup(original, { ...updated, searchRevision: 'changed' }, 'a'),
  ).toThrow('CATALOG_CHANGED');
  expect(() => mergeSearchGroup(original, updated, 'b')).toThrow(
    'INVALID_RESULT',
  );
});
