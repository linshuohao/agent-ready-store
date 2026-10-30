import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import type { Page, ProductSummary } from '@store/contracts';
import { publicApi } from '@/lib/api';
import { ProductCard } from '@/features/product-discovery/components/product-card';
import { SearchForm } from '@/features/product-discovery/components/search-form';
import { PageTools } from '@/features/webmcp/page-tools';
export const dynamic = 'force-dynamic';
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) {
      params.set(key, value);
      values[key] = value;
    }
  }
  const response = await publicApi<Page<ProductSummary>>(`/products?${params}`);
  const pageLink = (offset: number, revision: string) => {
    const p = new URLSearchParams(params);
    p.set('offset', String(offset));
    p.set('catalogRevision', revision);
    return `/?${p}`;
  };
  const retry = new URLSearchParams(params);
  retry.delete('catalogRevision');
  retry.delete('offset');
  return (
    <main tabIndex={-1} id="main">
      <PageTools catalog={response} queryKey={params.toString()} />
      <section className="hero">
        <p className="eyebrow">日常選物 / Agent-Ready 商店</p>
        <h1>找一件適合日常的好物。</h1>
        <p>為自己慢慢選，或由 AI 助理探索商品資訊。</p>
      </section>
      <section aria-labelledby="catalog-heading">
        <div className="section-title">
          <h2 id="catalog-heading">探索商品</h2>
          {response.ok && <p role="status">共 {response.data.total} 件商品</p>}
        </div>
        <SearchForm key={params.toString()} values={values} />
        {!response.ok ? (
          <section role="alert" className="notice">
            <h2>
              {response.error.code === 'VALIDATION_ERROR'
                ? '查詢條件有誤'
                : response.error.code === 'CATALOG_CHANGED'
                  ? '商品目錄已更新'
                  : '暫時無法載入商品'}
            </h2>
            <p>請調整條件或重新載入，不會自動放寬篩選。</p>
            <Link href={`/?${retry}`} prefetch={false}>
              重新載入目錄
            </Link>
          </section>
        ) : (
          <>
            <div className="grid">
              {response.data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {response.data.total === 0 && (
              <p className="notice" role="status">
                沒有符合條件的商品，請調整或清除篩選。
              </p>
            )}
            {response.data.total > 0 && response.data.items.length === 0 && (
              <p>這一頁沒有商品，請返回上一頁。</p>
            )}
            <nav className="pagination" aria-label="商品分頁">
              <span className="pagination-count">
                第{' '}
                {Math.floor(
                  Number(values.offset ?? 0) / Number(values.limit ?? 12),
                ) + 1}{' '}
                頁
              </span>
              {Number(values.offset ?? 0) > 0 && (
                <Link
                  prefetch={false}
                  className={buttonVariants()}
                  href={pageLink(
                    Math.max(
                      0,
                      Number(values.offset) - Number(values.limit ?? 12),
                    ),
                    response.data.catalogRevision,
                  )}
                >
                  <span aria-hidden="true">←</span> 上一頁
                </Link>
              )}
              {response.data.nextOffset !== null && (
                <Link
                  prefetch={false}
                  className={buttonVariants()}
                  href={pageLink(
                    response.data.nextOffset,
                    response.data.catalogRevision,
                  )}
                >
                  下一頁 <span aria-hidden="true">→</span>
                </Link>
              )}
            </nav>
          </>
        )}
      </section>
      <p className="hint">
        所有商品均為虛構資料。圖像為原創商品示意，非實物照片。
      </p>
    </main>
  );
}
