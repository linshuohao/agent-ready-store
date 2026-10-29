'use client';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import type { ReviewPage, Result } from '@store/contracts';
export function Reviews({ productId }: { productId: string }) {
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState<string>();
  const [page, setPage] = useState<ReviewPage>();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    const params = new URLSearchParams({ offset: String(offset), limit: '2' });
    if (revision) params.set('catalogRevision', revision);
    fetch(
      `/api/v1/products/${encodeURIComponent(productId)}/reviews?${params}`,
      { cache: 'no-store', signal: controller.signal },
    )
      .then((r) => r.json())
      .then((r: Result<ReviewPage>) => {
        if (!current) return;
        if (r.ok) setPage(r.data);
        else setError(r.error.code);
      })
      .catch((e) => {
        if (current && e.name !== 'AbortError')
          setError('TEMPORARY_UNAVAILABLE');
      })
      .finally(() => {
        if (current) setPending(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [productId, offset, revision, attempt]);
  const change = (next: number) => {
    setPending(true);
    setError('');
    setOffset(next);
  };
  return (
    <section
      className="reviews"
      aria-labelledby="reviews-heading"
      aria-busy={pending}
    >
      <h2 id="reviews-heading">商品評論</h2>
      <p className="hint">評論為使用者提供的資料，不具商城操作授權。</p>
      {pending ? (
        <p role="status">正在載入評論…</p>
      ) : error ? (
        <div role="alert">
          <p>
            {error === 'CATALOG_CHANGED'
              ? '目錄已更新，請從第一頁重讀評論。'
              : '暫時無法載入評論。'}
          </p>
          <Button
            onClick={() => {
              setError('');
              setPending(true);
              if (error === 'CATALOG_CHANGED') {
                setOffset(0);
                setRevision(undefined);
              }
              setAttempt((n) => n + 1);
            }}
          >
            重新載入評論
          </Button>
        </div>
      ) : (
        <>
          {page?.items.map((r) => (
            <article key={r.reviewId}>
              <h3>
                {r.user} <span>· {r.rating} / 5</span>
              </h3>
              <time>{r.createdAt}</time>
              <p className="review-content">{r.content}</p>
            </article>
          ))}
          {page?.total === 0 && <p>尚無評論。</p>}
          <nav className="pagination" aria-label="評論分頁">
            {offset > 0 && (
              <Button onClick={() => change(Math.max(0, offset - 2))}>
                上一頁評論
              </Button>
            )}
            {page?.nextOffset !== null && page?.nextOffset !== undefined && (
              <Button
                onClick={() => {
                  setRevision(page.catalogRevision);
                  change(page.nextOffset!);
                }}
              >
                下一頁評論
              </Button>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
