'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { OrderView } from '@store/contracts';
import { Button } from '@/components/ui/button';
import { readOrders, cartFailure } from './lifecycle-commands';
import { formatMoney } from '@/lib/money';
const status = {
  CHECKOUT: '待支付',
  PAID: '已支付',
  CANCELLED: '已取消',
  EXPIRED: '已超時',
};
export function CartOrders({ id, revision }: { id: string; revision: number }) {
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
      const result = await readOrders(id, offset);
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
  }, [id, revision, offset, refresh]);
  return (
    <section aria-label="所有訂單">
      <h2>所有訂單</h2>
      {error ? (
        <div>
          <p role="alert">{error}</p>
          <div className="commerce-actions">
            <Button onClick={() => setRefresh((n) => n + 1)}>重新查詢訂單</Button>
          </div>
        </div>
      ) : !page ? (
        <p role="status">正在讀取訂單…</p>
      ) : page.items.length ? (
        page.items.map((order) => (
          <article key={order.orderId} className="order-list-item">
            <Link href={`/orders/${order.orderId}`} prefetch={false}>
              訂單 {order.orderId}
            </Link>{' '}
            <span className="order-list-status">
              {status[order.effectiveStatus]}
            </span>
            <p>
              {order.summary.items
                .map((item) => `${item.name} × ${item.quantity}`)
                .join('、')}
            </p>
            <div className="order-list-meta">
              <strong>{formatMoney(order.summary.total)}</strong>
              {order.effectiveStatus === 'CHECKOUT' && (
                <span>
                  預留至{' '}
                  {new Date(order.reservationExpiresAt).toLocaleString('zh-TW')}
                </span>
              )}
            </div>
          </article>
        ))
      ) : (
        <p>尚無訂單。</p>
      )}
      <div className="commerce-actions">
        {offset > 0 && (
          <Button
            onClick={() => {
              setPage(null);
              setOffset(Math.max(0, offset - 20));
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
      </div>
    </section>
  );
}
