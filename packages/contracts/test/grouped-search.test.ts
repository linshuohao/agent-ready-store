import { describe, it, expect } from 'vitest';
import { groupedSearchInput, discoveryInput } from '../src/index';
describe('grouped search input boundaries', () => {
  it('accepts five independent goals with bounded defaults and legacy input', () => {
    const parsed = groupedSearchInput.parse({
      queries: Array.from({ length: 5 }, (_, i) => ({ id: `g${i}` })),
    });
    expect(parsed.queries.every((q) => q.limit === 4 && q.offset === 0)).toBe(
      true,
    );
    expect(discoveryInput.parse({ q: 'earphones' })).not.toHaveProperty(
      'queries',
    );
  });
  it.each([
    { queries: Array.from({ length: 6 }, (_, i) => ({ id: `g${i}` })) },
    { queries: [{ id: 'a'.repeat(65) }] },
    { queries: [{ id: 'a', q: 'a'.repeat(201) }] },
    { queries: [{ id: 'a', label: 'a'.repeat(81) }] },
    { queries: [{ id: 'a', offset: -1 }] },
    { queries: [{ id: 'a', offset: Number.MAX_SAFE_INTEGER + 1 }] },
    { queries: [{ id: 'a', catalogRevision: 'nested' }] },
    { queries: [{ id: 'a', offset: 1 }], catalogRevision: 'c' },
    { queries: [{ id: 'a' }], unexpected: true },
  ])('rejects invalid whole batch %j', (input) => {
    expect(groupedSearchInput.safeParse(input).success).toBe(false);
  });
});
