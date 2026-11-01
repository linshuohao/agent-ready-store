'use client';
import { useState } from 'react';
import { Button } from './components/ui/button';
import { Artwork, Link, PageTools, useRuntime } from './runtime';

import type { ProductDetail } from '@store/contracts';

import {
  Availability,
  illustration,
} from './features/product-discovery/components/product-card';
import { Reviews } from './features/product-discovery/components/reviews';
import { AddButton } from './features/cart/add-button';
import { formatMoney } from './lib/money';

export function ProductPage({
  id,
  response: r,
  returnTo,
}: {
  id: string;
  returnTo?: string;
  response: import('@store/contracts').Result<ProductDetail>;
}) {
  const embedded = useRuntime().surface === 'embedded';
  const [view, setView] = useState<{
    id: string;
    tab: 'overview' | 'specs' | 'reviews';
  }>({ id, tab: 'overview' });
  const tab = view.id === id ? view.tab : 'overview';
  if (!r.ok) {
    return (
      <main
        tabIndex={-1}
        id="main"
        className="product-page"
        data-compact={embedded || undefined}
      >
        <div role="alert">
          <h1>暫時無法載入商品</h1>
          <Link href={`/products/${encodeURIComponent(id)}`} prefetch={false}>
            重試
          </Link>
        </div>
      </main>
    );
  }
  const p = r.data;
  const specifications = (
    <>
      <h2>商品規格</h2>
      <dl>
        {Object.entries(p.specs).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
  return (
    <main
      tabIndex={-1}
      id="main"
      className="product-page"
      data-compact={embedded || undefined}
    >
      <PageTools product={p} />
      <Link href={returnTo?.startsWith('/search?collection=') ? returnTo : '/'}>
        返回商品列表
      </Link>
      <div className="detail">
        <div className="art">
          <Artwork
            kind={illustration(p.id)}
            width={520}
            height={520}
            alt={`${p.id} 商品示意，非實物照片`}
          />
          <span>商品示意 · {p.id}</span>
        </div>
        <section>
          <p className="eyebrow">
            {p.brand} · {p.id}
          </p>
          <h1>{p.name}</h1>
          <p className="price">{formatMoney(p.price)}</p>
          <Availability product={p} />
          <AddButton
            productId={p.id}
            canPurchase={p.availability.canPurchase}
          />
          {!embedded && <p>{p.description}</p>}
          <p className="hint">此為當次查詢狀態，瀏覽不保留庫存。</p>
          {!embedded && (
            <>
              <a href="#reviews-heading">
                閱讀 {p.reviewOverview.count} 則評論
              </a>
              {specifications}
            </>
          )}
        </section>
      </div>
      {embedded && (
        <>
          <nav className="purchase-view-switch" aria-label="商品內容">
            {(
              [
                ['overview', '概覽'],
                ['specs', '規格'],
                ['reviews', `評論（${p.reviewOverview.count}）`],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                variant={tab === key ? 'default' : 'outline'}
                aria-current={tab === key ? 'page' : undefined}
                onClick={() => setView({ id, tab: key })}
              >
                {label}
              </Button>
            ))}
          </nav>
          {tab === 'overview' && (
            <details className="product-description">
              <summary>商品介紹</summary>
              <p>{p.description}</p>
            </details>
          )}
          {tab === 'specs' && specifications}
        </>
      )}
      <div hidden={embedded && tab !== 'reviews'}>
        <Reviews key={id} productId={id} />
      </div>
    </main>
  );
}
