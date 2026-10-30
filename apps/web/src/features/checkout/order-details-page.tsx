'use client';
import { useEffect, useRef, useState } from 'react';
import type { OrderResult } from '@store/contracts';
import { Button } from '@/components/ui/button';
import { PurchaseSummary } from './purchase-summary';
import { orderDetailsRequest } from './purchase-commands';
export function OrderDetailsPage({ id }: { id: string }) {
  const token = useRef<string | undefined>(undefined),
    captured = useRef(false),
    busy = useRef(false),
    generation = useRef(0);
  const [order, setOrder] = useState<OrderResult | null>(null),
    [message, setMessage] = useState('正在讀取訂單…'),
    [working, setWorking] = useState(false);
  async function load() {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    const owner = ++generation.current;
    const result = await orderDetailsRequest(id, token.current);
    if (owner !== generation.current) return;
    busy.current = false;
    setWorking(false);
    if (result.kind === 'success' && result.data.orderId === id) {
      token.current = undefined;
      setOrder(result.data);
      setMessage('此連結只提供訂單讀取，不授予編輯或購買權限。');
    } else if (result.kind === 'unknown')
      setMessage(
        '讀取結果尚未確認，可明確重試原連結。重新整理只會以現有讀取權限查詢。',
      );
    else {
      token.current = undefined;
      setMessage('無法存取此訂單，連結可能已失效或缺少讀取權限。');
    }
  }
  useEffect(() => {
    if (!captured.current) {
      captured.current = true;
      token.current =
        new URLSearchParams(window.location.hash.slice(1)).get('order-read') ??
        undefined;
      // Remove bearer fragment before any network request, even when malformed.
      if (window.location.hash)
        history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search,
        );
    }
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
      generation.current += 1;
      busy.current = false;
    };
    // The keyed route owns this memory-only exchange attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return (
    <main id="main" tabIndex={-1} className="commerce-page order-page">
      <h1>唯讀訂單詳情</h1>
      <p role="status">{message}</p>
      {order ? (
        <>
          <p>
            訂單編號：<span data-testid="order-id">{order.orderId}</span>
          </p>
          <PurchaseSummary summary={order.snapshot} completed />
        </>
      ) : (
        <Button disabled={working} onClick={() => void load()}>
          重新查詢
        </Button>
      )}
    </main>
  );
}
