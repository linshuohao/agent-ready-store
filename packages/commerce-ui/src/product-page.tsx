'use client';
import { Artwork, Link, PageTools } from './runtime';

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
  if (!r.ok) {
    return (
      <main tabIndex={-1} id="main">
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
  return (
    <main tabIndex={-1} id="main">
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
          <p>{p.description}</p>
          <p className="hint">此為當次查詢狀態，瀏覽不保留庫存。</p>
          <a href="#reviews-heading">閱讀 {p.reviewOverview.count} 則評論</a>
          <h2>商品規格</h2>
          <dl>
            {Object.entries(p.specs).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <Reviews key={id} productId={id} />
    </main>
  );
}
