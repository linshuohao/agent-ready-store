'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cartIdInput, type OrderResult } from '@store/contracts';
import { Button } from '@/components/ui/button';
import { useCartOperations } from '@/features/cart/provider';
import { useOrderMemory } from './order-memory';
import { readOrder } from './commands';
import { PurchaseSummary } from './purchase-summary';
export function OrderPage({ id }: { id: string }) {
  const router = useRouter();
  const memory = useOrderMemory(),
    cart = useCartOperations();
  const cached = memory.order?.cartId === id ? memory.order : null;
  const [loaded, setLoaded] = useState<OrderResult | null>(null),
    [message, setMessage] = useState('正在讀取訂單…'),
    [attempt, setAttempt] = useState(0);
  const order = cached ?? loaded;
  useEffect(() => {
    if (cached) return;
    let active = true;
    async function load() {
      if (!cartIdInput.safeParse(id).success) {
        setMessage('訂單連結格式有誤。');
        return;
      }
      const r = await readOrder(id);
      if (!active) return;
      if (r.kind === 'success') setLoaded(r.data);
      else
        setMessage(
          r.kind === 'failure' &&
            ['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(r.code)
            ? '原存取權限已失效，無法再次讀取訂單；這不表示購買失敗。'
            : '目前無法確認訂單結果，請保留原購物車並重試查詢，不要重新購買。',
        );
    }
    void load();
    return () => {
      active = false;
    };
  }, [cached, id, attempt]);
  return (
    <main id="main" tabIndex={-1} className="commerce-page order-page">
      {order ? (
        <>
          <div className="commerce-page-heading">
            <p className="eyebrow">ORDER CONFIRMED</p>
            <h1>購買成功</h1>
            <p>感謝你的選購，以下是本次訂單的成交內容。</p>
            <p className="order-reference">
              訂單編號：<span data-testid="order-id">{order.orderId}</span>
            </p>
          </div>
          <PurchaseSummary
            summary={order.snapshot}
            completed
            actions={
              <>
                <Button
                  onClick={() => {
                    memory.remember(null);
                    cart.restart();
                    router.push('/');
                  }}
                >
                  開始新的購物
                </Button>
                <Link
                  className="commerce-action-secondary"
                  href={`/cart/${id}`}
                  prefetch={false}
                >
                  查看原購物車
                </Link>
                <p className="commerce-action-note">成交內容與金額已固定。</p>
              </>
            }
          />
        </>
      ) : (
        <>
          <h1>訂單結果</h1>
          <p role="status">{message}</p>
          <Button onClick={() => setAttempt((n) => n + 1)}>重新查詢</Button>
          <p>
            <Link href={`/checkout/${id}`}>返回原結帳</Link>
          </p>
        </>
      )}
    </main>
  );
}
