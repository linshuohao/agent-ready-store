'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { Page, ProductCategory, Result } from '@store/contracts';
import { useRuntime } from '../../../runtime';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
export type CategoriesResult = Result<Page<ProductCategory>>;
export function CategorySelect({
  initial,
  value = '',
}: {
  initial?: CategoriesResult;
  value?: string;
}) {
  const { transport } = useRuntime();
  const id = useId();
  const [selected, setSelected] = useState(value);
  const [page, setPage] = useState(initial?.ok ? initial.data : undefined);
  const [error, setError] = useState(
    initial?.ok ? '' : (initial?.error.code ?? 'TEMPORARY_UNAVAILABLE'),
  );
  const [pending, setPending] = useState(false);
  const requestId = useRef(0);
  const busy = useRef(false);
  useEffect(
    () => () => {
      requestId.current++;
    },
    [],
  );
  async function load() {
    if (busy.current) return;
    busy.current = true;
    const request = ++requestId.current;
    const append = page !== undefined && page.nextOffset !== null;
    const params = new URLSearchParams();
    if (append) {
      params.set('offset', String(page.nextOffset));
      params.set('catalogRevision', page.catalogRevision);
    }
    setPending(true);
    setError('');
    try {
      const response = await transport(`/api/v1/catalog/categories?${params}`);
      const result: CategoriesResult = await response.json();
      if (request !== requestId.current) return;
      if (!result.ok) {
        setError(result.error.code);
        if (result.error.code === 'CATALOG_CHANGED') setPage(undefined);
      } else {
        setPage({
          ...result.data,
          items: append
            ? [...page.items, ...result.data.items]
            : result.data.items,
        });
      }
    } catch {
      if (request === requestId.current) setError('TEMPORARY_UNAVAILABLE');
    } finally {
      if (request === requestId.current) {
        busy.current = false;
        setPending(false);
      }
    }
  }
  const missing =
    selected !== '' && !page?.items.some((item) => item.value === selected);
  return (
    <div className="field" aria-busy={pending}>
      <Label htmlFor={id}>商品分類</Label>
      <select
        id={id}
        name="category"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="category-select"
      >
        <option value="">全部分類</option>
        {missing && (
          <option value={selected}>
            {selected}（目前條件，尚未出現在已載入分類）
          </option>
        )}
        {page?.items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert">
          {error === 'CATALOG_CHANGED'
            ? '分類目錄已更新，請重新載入。'
            : '暫時無法載入分類，已保留目前條件。'}
        </p>
      )}
      {pending && <p role="status">正在載入分類…</p>}
      {error ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={load}
        >
          重新載入分類
        </Button>
      ) : (
        page?.nextOffset != null && (
          <>
            <span className="hint">分類尚未全部載入</span>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={load}
            >
              載入更多分類
            </Button>
          </>
        )
      )}
    </div>
  );
}
