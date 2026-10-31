'use client';
import { useEffect, useRef, useState } from 'react';
import {
  groupedSearchInput,
  groupedSearchOutput,
  type GroupedSearchResult,
  type GroupedSearchInput,
  type Result,
} from '@store/contracts';
import { useRuntime } from './runtime';
import { ProductCard } from './features/product-discovery/components/product-card';
import { Button } from './components/ui/button';
import { mergeSearchGroup } from './grouped-search-state';

function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

export function GroupedCatalogPage({ collection }: { collection: string }) {
  const { transport, storage, location } = useRuntime();
  const [data, setData] = useState<GroupedSearchResult | null>(null);
  const current = useRef<GroupedSearchResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [groupErrors, setGroupErrors] = useState<Record<string, string>>({});
  const failedOffsets = useRef(new Map<string, number>());
  const epoch = useRef(0),
    sequences = useRef<Record<string, number>>({});
  const [fallbackScope] = useState(() => crypto.randomUUID());
  const scope =
    new URLSearchParams(location.split('?')[1]).get('scope') ?? fallbackScope;
  const contextKey = 'store.apps.search.' + scope + ':' + collection;
  const [storageWarning, setStorageWarning] = useState(false);
  const save = (next: GroupedSearchResult) => {
    current.current = next;
    setData(next);
    try {
      storage.setItem(
        contextKey,
        JSON.stringify({
          queries: next.groups.map((g) => g.query),
          catalogRevision: next.catalogRevision,
          searchRevision: next.searchRevision,
        }),
      );
    } catch {
      setStorageWarning(true);
    }
  };
  const fetchPage = async (input: GroupedSearchInput) => {
    const response = (await (
      await transport('/api/v1/products/search', input)
    ).json()) as Result<unknown>;
    if (!response.ok) throw Error(response.error.code);
    const parsed = groupedSearchOutput.parse(response.data);
    const requested = groupedSearchInput.parse(input).queries;
    if (
      JSON.stringify(parsed.groups.map((g) => g.query)) !==
      JSON.stringify(requested)
    )
      throw Error('INVALID_RESULT');
    return parsed;
  };
  useEffect(() => {
    const requestEpoch = ++epoch.current;
    let input: GroupedSearchInput;
    try {
      const original = groupedSearchInput.parse(JSON.parse(collection));
      let saved: string | null = null;
      try {
        saved = storage.getItem(contextKey);
      } catch {
        setStorageWarning(true);
      }
      input = saved ? groupedSearchInput.parse(JSON.parse(saved)) : original;
      // A saved page cannot replace the original collection's target constraints.
      const targets = (q: GroupedSearchInput) =>
        groupedSearchInput
          .parse(q)
          .queries.map(({ offset: _offset, ...rest }) => {
            void _offset;
            return rest;
          });
      if (JSON.stringify(targets(input)) !== JSON.stringify(targets(original)))
        throw Error('INVALID_CONTEXT');
    } catch {
      setError('INVALID_CONTEXT');
      return;
    }
    void fetchPage(input)
      .then((next) => {
        if (epoch.current === requestEpoch) save(next);
      })
      .catch((e) => {
        if (epoch.current === requestEpoch)
          setError(e instanceof Error ? e.message : 'TEMPORARY_UNAVAILABLE');
      });
    return () => {
      epoch.current++;
    };
    // A collection identifies one delivered search. Storage writes never retrigger it.
  }, [collection, transport, storage]);
  const loadGroup = async (id: string, offset: number) => {
    const before = current.current;
    if (!before || error) return;
    const group = before.groups.find((g) => g.id === id)!;
    const seq = (own(sequences.current, id) ?? 0) + 1;
    sequences.current = { ...sequences.current, [id]: seq };
    const requestEpoch = epoch.current;
    setBusy((v) => ({ ...v, [id]: true }));
    setGroupErrors((v) => ({ ...v, [id]: '' }));
    try {
      const incoming = await fetchPage({
        queries: [{ ...group.query, offset }],
        catalogRevision: before.catalogRevision,
        searchRevision: before.searchRevision,
      });
      if (epoch.current !== requestEpoch || own(sequences.current, id) !== seq)
        return;
      failedOffsets.current.delete(id);
      save(mergeSearchGroup(current.current!, incoming, id));
    } catch (e) {
      if (epoch.current !== requestEpoch || own(sequences.current, id) !== seq)
        return;
      const code = e instanceof Error ? e.message : 'TEMPORARY_UNAVAILABLE';
      if (code === 'CATALOG_CHANGED') {
        epoch.current++;
        setError(code);
      } else {
        failedOffsets.current.set(id, offset);
        setGroupErrors((v) => ({ ...v, [id]: code }));
      }
    } finally {
      if (epoch.current === requestEpoch && own(sequences.current, id) === seq)
        setBusy((v) => ({ ...v, [id]: false }));
    }
  };
  const refresh = async () => {
    const requestEpoch = ++epoch.current;
    setBusy({});
    setGroupErrors({});
    failedOffsets.current.clear();
    setError('');
    setData(null);
    current.current = null;
    try {
      const input = groupedSearchInput.parse(JSON.parse(collection));
      const next = await fetchPage({
        queries: input.queries.map((q) => ({ ...q, offset: 0 })),
      });
      if (epoch.current === requestEpoch) save(next);
    } catch (e) {
      if (epoch.current === requestEpoch)
        setError(e instanceof Error ? e.message : 'TEMPORARY_UNAVAILABLE');
    }
  };
  return (
    <main id="main" tabIndex={-1} className="grouped-catalog">
      <h1>搜尋結果</h1>
      {storageWarning && (
        <p role="status">無法保存頁碼，重新開啟將從原搜尋位置載入。</p>
      )}
      {error ? (
        <section role="alert">
          <p>
            {error === 'CATALOG_CHANGED'
              ? '目錄或搜尋規則已更新，請重新查詢全部目標。'
              : '無法恢復完整搜尋，請重試或重新搜尋。'}
          </p>
          <Button onClick={() => void refresh()}>重新查詢全部目標</Button>
        </section>
      ) : !data ? (
        <p role="status">正在讀取商品…</p>
      ) : (
        data.groups.map((group) => {
          const products = new Map(data.products.map((p) => [p.id, p]));
          const failed = own(groupErrors, group.id) || group.status === 'error';
          return (
            <section
              key={group.id}
              aria-labelledby={`group-${group.id}`}
              className="search-group"
            >
              <div className="section-title">
                <h2 id={`group-${group.id}`}>{group.label}</h2>
                {group.status !== 'error' && <p>共 {group.total} 件商品</p>}
              </div>
              <p className="hint">
                {[
                  group.query.q,
                  group.query.brand,
                  group.query.category,
                  group.query.minPrice !== undefined
                    ? `最低 TWD ${group.query.minPrice}`
                    : '',
                  group.query.maxPrice !== undefined
                    ? `最高 TWD ${group.query.maxPrice}`
                    : '',
                  group.query.purchasableOnly ? '僅可購買' : '',
                ]
                  .filter(Boolean)
                  .join(' · ') || '全部商品'}
              </p>
              {failed && (
                <p role="alert">
                  這一組暫時無法載入，原頁已保留。
                  <Button
                    disabled={own(busy, group.id)}
                    onClick={() =>
                      void loadGroup(
                        group.id,
                        failedOffsets.current.get(group.id) ??
                          group.query.offset,
                      )
                    }
                  >
                    重試
                  </Button>
                </p>
              )}
              {group.status === 'empty' && (
                <p role="status">沒有符合條件的商品。</p>
              )}
              {group.status !== 'error' && (
                <>
                  <div className="product-grid">
                    {group.productIds.map((id) => (
                      <ProductCard
                        key={id}
                        product={products.get(id)!}
                        returnTo={location}
                      />
                    ))}
                  </div>
                  <nav className="pagination" aria-label={`${group.label}分頁`}>
                    <span>
                      第{' '}
                      {Math.floor(group.query.offset / group.query.limit) + 1}{' '}
                      頁
                    </span>
                    {group.query.offset > 0 && (
                      <Button
                        disabled={own(busy, group.id)}
                        onClick={() =>
                          void loadGroup(
                            group.id,
                            Math.max(0, group.query.offset - group.query.limit),
                          )
                        }
                      >
                        上一頁
                      </Button>
                    )}
                    {group.nextOffset !== null && (
                      <Button
                        disabled={own(busy, group.id)}
                        onClick={() =>
                          void loadGroup(group.id, group.nextOffset!)
                        }
                      >
                        下一頁
                      </Button>
                    )}
                    <Button
                      disabled={own(busy, group.id)}
                      onClick={() => void loadGroup(group.id, 0)}
                    >
                      從首重查
                    </Button>
                  </nav>
                </>
              )}
            </section>
          );
        })
      )}
      <p className="hint">庫存為最近讀取結果；不同分組翻頁並非同一庫存快照。</p>
    </main>
  );
}
