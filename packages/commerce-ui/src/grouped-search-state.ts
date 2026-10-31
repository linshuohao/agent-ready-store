import {
  groupedSearchOutput,
  type GroupedSearchResult,
} from '@store/contracts';
export function mergeSearchGroup(
  current: GroupedSearchResult,
  incoming: GroupedSearchResult,
  id: string,
): GroupedSearchResult {
  if (
    current.catalogRevision !== incoming.catalogRevision ||
    current.searchRevision !== incoming.searchRevision
  )
    throw Error('CATALOG_CHANGED');
  if (
    incoming.groups.length !== 1 ||
    incoming.groups[0].id !== id ||
    !current.groups.some((g) => g.id === id)
  )
    throw Error('INVALID_RESULT');
  const groups = current.groups.map((g) =>
    g.id === id ? incoming.groups[0] : g,
  );
  const products = new Map(
    [...current.products, ...incoming.products].map((p) => [p.id, p]),
  );
  const ids = new Set(
    groups.flatMap((g) => (g.status === 'error' ? [] : g.productIds)),
  );
  return groupedSearchOutput.parse({
    ...current,
    groups,
    products: [...ids].map((id) => products.get(id)),
  });
}
