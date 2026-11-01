'use client';
import { useRuntime } from '../../runtime';

import { CommerceActions } from '../../index';
import { useEffect, useState, useId } from 'react';
import { Link } from '../../runtime';
import type { OrderView } from '@store/contracts';
import { Button } from '../../components/ui/button';
import { readOrders, cartFailure } from './lifecycle-commands';
import { formatMoney } from '../../lib/money';
import { OrderProduct } from '../checkout/order-product';
const status = {
  CHECKOUT: '待支付',
  PAID: '已支付',
  CANCELLED: '已取消',
  EXPIRED: '已超時',
};
export function CartOrders({ id, revision }: { id: string; revision: number }) {
  const { transport, surface } = useRuntime();
  const embedded = surface === 'embedded';
  const limit = embedded ? 4 : 20;
  const productsId = useId();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState<{
      items: OrderView[];
      nextOffset: number | null;
    } | null>(null),
    [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    let sequence = 0;
    async function load() {
      const request = ++sequence;
      const result = await readOrders(id, offset, limit, false, transport);
      if (!live || request !== sequence) return;
      if (result.kind === 'success') {
        setPage(result.data);
        setError('');
      } else
        setError(
          result.kind === 'failure'
            ? cartFailure(result.error.code)
            : '暫時無法讀取訂單，請重試。',
        );
    }
    void load();
    const returned = () => {
      if (document.visibilityState !== 'hidden') void load();
    };
    window.addEventListener('focus', returned);
    document.addEventListener('visibilitychange', returned);
    return () => {
      live = false;
      window.removeEventListener('focus', returned);
      document.removeEventListener('visibilitychange', returned);
    };
  }, [id, revision, offset, refresh, transport, limit]);
  return (
    <section aria-label="所有訂單">
      <h2>所有訂單</h2>
      {error ? (
        <div>
          <p role="alert">{error}</p>
          <CommerceActions>
            <Button onClick={() => setRefresh((n) => n + 1)}>
              重新查詢訂單
            </Button>
          </CommerceActions>
        </div>
      ) : !page ? (
        <p role="status">正在讀取訂單…</p>
      ) : page.items.length ? (
        page.items.map((order) => (
          <article
            key={order.orderId}
            className="order-list-item"
            data-status={order.effectiveStatus}
          >
            <div className="order-list-heading">
              <div className="order-list-reference">
                <p className="order-list-label">訂單編號</p>
                <Link href={`/orders/${order.orderId}`} prefetch={false}>
                  <span className="sr-only">訂單 </span>
                  {order.orderId}
                </Link>
                <p className="order-list-date">
                  建立於{' '}
                  <time dateTime={order.createdAt}>
                    {new Date(order.createdAt).toLocaleString('zh-TW')}
                  </time>
                </p>
              </div>
              <span
                className="order-list-status"
                data-status={order.effectiveStatus}
              >
                <span className="order-status-dot" aria-hidden="true" />
                {status[order.effectiveStatus]}
              </span>
            </div>
            <ul
              id={`${productsId}-${order.orderId}`}
              className="order-list-products"
              aria-label="訂單商品"
            >
              {(expanded[order.orderId]
                ? order.summary.items
                : order.summary.items.slice(0, 2)
              ).map((item) => (
                <li key={item.productId}>
                  <OrderProduct item={item} compact />
                </li>
              ))}
            </ul>
            <div className="order-list-product-controls">
              <p>共 {order.summary.items.length} 項商品</p>
              {order.summary.items.length > 2 && (
                <Button
                  variant="outline"
                  aria-expanded={Boolean(expanded[order.orderId])}
                  aria-controls={`${productsId}-${order.orderId}`}
                  onClick={() =>
                    setExpanded((previous) => ({
                      ...previous,
                      [order.orderId]: !previous[order.orderId],
                    }))
                  }
                >
                  {expanded[order.orderId]
                    ? '收起商品'
                    : `展開其餘 ${order.summary.items.length - 2} 項商品`}
                </Button>
              )}
            </div>
            <div className="order-list-meta">
              <div className="order-list-total">
                <span>
                  {order.effectiveStatus === 'PAID' ? '實付金額' : '訂單金額'}
                </span>
                <strong>{formatMoney(order.summary.total)}</strong>
              </div>
              {order.effectiveStatus === 'CHECKOUT' && (
                <p className="order-list-deadline">
                  支付截止{' '}
                  <time dateTime={order.reservationExpiresAt}>
                    {new Date(order.reservationExpiresAt).toLocaleString(
                      'zh-TW',
                    )}
                  </time>
                  <span>請進入訂單核對並確認支付</span>
                </p>
              )}
            </div>
          </article>
        ))
      ) : (
        <p>尚無訂單。</p>
      )}
      <CommerceActions>
        {offset > 0 && (
          <Button
            onClick={() => {
              setPage(null);
              setOffset(Math.max(0, offset - limit));
            }}
          >
            上一頁訂單
          </Button>
        )}
        {page?.nextOffset !== null && page?.nextOffset !== undefined && (
          <Button
            onClick={() => {
              setOffset(page.nextOffset!);
              setPage(null);
            }}
          >
            下一頁訂單
          </Button>
        )}
      </CommerceActions>
    </section>
  );
}
