'use client';
import { useEffect, useState, type ReactNode } from 'react';
import {
  CommerceRuntimeProvider,
  useRuntime,
  type CommerceRuntime,
} from './runtime';
import { CartProvider, useCartOperations } from './features/cart/provider';
import {
  OrderMemory,
  useLifecycleOrders,
} from './features/checkout/order-memory';
import { SiteHeader } from './features/cart/site-header';
import { CartPage } from './features/cart/cart-page';
import { OrderPage } from './features/checkout/order-page';
import { OrdersPage } from './features/checkout/orders-page';
import { CatalogPage } from './catalog-page';
import { ProductPage } from './product-page';
import type { RouteDelivery } from './runtime';
import { Button } from './components/ui/button';
import type {
  Page,
  ProductSummary,
  ProductDetail,
  Result,
} from '@store/contracts';

function DiscoveryRoute({ id, query }: { id?: string; query: string }) {
  const { transport, revision } = useRuntime();
  const [response, setResponse] = useState<Result<
    Page<ProductSummary> | ProductDetail
  > | null>(null);
  useEffect(() => {
    let live = true;
    void transport(
      id
        ? `/api/v1/products/${encodeURIComponent(id)}`
        : `/api/v1/products?${query}`,
    )
      .then((r) => r.json())
      .then((r) => {
        if (live) setResponse(r);
      })
      .catch(() => {
        if (live)
          setResponse({
            ok: false,
            error: {
              code: 'TEMPORARY_UNAVAILABLE',
              message: '暫時無法載入資料',
              retryable: true,
            },
            requestId: '',
          });
      });
    return () => {
      live = false;
    };
  }, [transport, id, query, revision]);
  if (!response)
    return (
      <main id="main" tabIndex={-1}>
        <p role="status">正在讀取商品…</p>
      </main>
    );
  return id ? (
    <ProductPage id={id} response={response as Result<ProductDetail>} />
  ) : (
    <CatalogPage
      query={query}
      response={response as Result<Page<ProductSummary>>}
    />
  );
}
export function CommerceRoute() {
  const { location } = useRuntime();
  const [pathname, query = ''] = location.split('?');
  const parts = pathname.split('/');
  if (parts[1] === 'cart')
    return <CartPage key={parts[2] ?? 'empty'} id={parts[2]} />;
  if (parts[1] === 'orders') {
    const params = new URLSearchParams(query);
    return parts[2] ? (
      <OrderPage
        key={parts[2]}
        id={parts[2]}
        share={params.get('view') === 'share'}
        created={params.get('created') === '1'}
      />
    ) : (
      <OrdersPage cartId={params.get('cartId') ?? undefined} />
    );
  }
  return (
    <DiscoveryRoute
      key={location}
      id={parts[1] === 'products' ? parts[2] : undefined}
      query={query}
    />
  );
}
function DeliveryCoordinator() {
  const { subscribeDelivery } = useRuntime(),
    cart = useCartOperations(),
    orders = useLifecycleOrders();
  const [pending, setPending] = useState<RouteDelivery | null>(null);
  useEffect(
    () =>
      subscribeDelivery?.((delivery) => {
        if (cart.canAcceptDelivery() && !orders.hasBusy()) {
          delivery.navigate();
          setPending(null);
        } else setPending(() => delivery);
      }),
    [subscribeDelivery, cart, orders],
  );
  return pending ? (
    <section className="notice" role="status">
      <p>
        收到其他入口結果，目前草稿或操作已保留。請先完成或放棄目前草稿，再查看新結果。
      </p>
      <Button
        onClick={() => {
          if (cart.canAcceptDelivery() && !orders.hasBusy()) {
            pending.navigate();
            setPending(null);
          }
        }}
      >
        查看收到的結果
      </Button>
    </section>
  ) : null;
}
export function CommerceApplication({
  runtime,
  children,
}: {
  runtime: CommerceRuntime;
  children?: ReactNode;
}) {
  return (
    <CommerceRuntimeProvider value={runtime}>
      <div
        className="commerce-application"
        data-surface={runtime.surface ?? 'web'}
      >
        <a className="skip" href="#main">
          跳至主要內容
        </a>
        <OrderMemory>
          <CartProvider>
            <SiteHeader />
            <DeliveryCoordinator />
            {children ?? <CommerceRoute />}
          </CartProvider>
        </OrderMemory>
        <footer>商品資訊為目前快照，實際庫存可能變動。</footer>
      </div>
    </CommerceRuntimeProvider>
  );
}
