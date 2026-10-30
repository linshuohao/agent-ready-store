'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  PurchaseStatus,
  PurchaseMaterials,
  OrderResult,
} from '@store/contracts';
import { Button } from '@/components/ui/button';
import { useCartOperations } from '@/features/cart/provider';
import { PageTools } from '@/features/webmcp/page-tools';
import { PurchaseSummary } from './purchase-summary';
import {
  readPurchase,
  readPurchaseMaterials,
  payPurchase,
  cancelPurchase,
} from './purchase-commands';

export function AgentCheckoutPage({
  id,
  reviewId,
}: {
  id: string;
  reviewId: string;
}) {
  const operations = useCartOperations();
  const [status, setStatus] = useState<PurchaseStatus | null>(null);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [detailsLink, setDetailsLink] = useState<string | null>(null);
  const [message, setMessage] = useState('正在讀取原購買準備…');
  const [working, setWorking] = useState(false);
  const [ready, setReady] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  // Purpose-bound materials stay in this UI controller, never tools, URLs or storage.
  const materials = useRef<PurchaseMaterials | null>(null);
  const generation = useRef(0),
    busy = useRef(false),
    mounted = useRef(false);
  const latest = useRef(operations);
  useEffect(() => {
    latest.current = operations;
  }, [operations]);
  const marker = `webmcpPurchasePending:${id}:${reviewId}`;
  async function load() {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setReady(false);
    materials.current = null;
    const owner = ++generation.current;
    const current = () =>
      mounted.current &&
      generation.current === owner &&
      latest.current.isCurrentCart(id);
    try {
      const result = await readPurchase(id, reviewId);
      if (!current()) return;
      if (result.kind !== 'success') {
        setMessage(
          '無法確認原購買狀態；這不表示購買失敗。請檢查存取權限或重新查詢。',
        );
        return;
      }
      if (result.data.cartId !== id || result.data.reviewId !== reviewId) {
        setMessage('購買準備不符，請重新查詢。');
        return;
      }
      setStatus(result.data);
      if (result.data.state === 'completed' && result.data.order) {
        setOrder(result.data.order);
        setUncertain(false);
        sessionStorage.removeItem(marker);
        setMessage('購買成功');
        return;
      }
      setMessage(
        result.data.state === 'pending'
          ? '請核對完整摘要，明確確認後才會購買。'
          : `此準備目前為 ${result.data.state}，不能支付。請返回原車明確重新準備。`,
      );
      if (result.data.state !== 'pending') return;
      const tokens = await readPurchaseMaterials(id, reviewId);
      if (!current()) return;
      if (tokens.kind === 'success') {
        materials.current = tokens.data;
        setReady(true);
      } else
        setMessage(
          '無法取得此準備的確認資料，請重新查詢；不會自動重新準備或支付。',
        );
    } finally {
      if (current()) {
        busy.current = false;
        setWorking(false);
      }
    }
  }
  useEffect(() => {
    mounted.current = true;
    latest.current.selectCart(id);
    void Promise.resolve().then(() => {
      if (!mounted.current) return;
      setUncertain(sessionStorage.getItem(marker) === '1');
      void load();
    });
    return () => {
      mounted.current = false;
      // Invalidates pending requests; this counter is not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      busy.current = false;
      materials.current = null;
    };
    // The route keys this controller by cart and review; mount only restores the original review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reviewId]);
  async function act(action: 'pay' | 'cancel') {
    if (
      busy.current ||
      !ready ||
      !materials.current ||
      status?.state !== 'pending'
    )
      return;
    const lease = latest.current.acquirePurchase(id);
    if ('code' in lease) {
      setMessage(`目前無法操作：${lease.code}`);
      return;
    }
    busy.current = true;
    setWorking(true);
    const owner = ++generation.current;
    const current = () =>
      mounted.current && generation.current === owner && lease.current();
    sessionStorage.setItem(marker, '1');
    try {
      if (action === 'pay') {
        const result = await payPurchase(
          id,
          reviewId,
          materials.current.payToken,
        );
        if (!current()) return;
        if (result.kind === 'success') {
          setOrder(result.data);
          setReady(false);
          materials.current = null;
          setUncertain(false);
          sessionStorage.removeItem(marker);
          setMessage('購買成功');
        } else {
          setReady(false);
          materials.current = null;
          setUncertain(true);
          setMessage(
            result.kind === 'unknown'
              ? '購買結果尚未確認。請先查詢原準備；不會自動重送支付。'
              : `本次支付未完成：${result.code}。請查詢原準備。`,
          );
        }
      } else {
        const result = await cancelPurchase(
          id,
          reviewId,
          materials.current.cancelToken,
        );
        if (!current()) return;
        if (result.kind === 'success') {
          setStatus(result.data);
          setOrder(result.data.order);
          setReady(false);
          materials.current = null;
          setUncertain(false);
          sessionStorage.removeItem(marker);
          setMessage(
            result.data.state === 'completed'
              ? '購買已完成，不能取消訂單。'
              : `準備狀態：${result.data.state}`,
          );
        } else {
          setReady(false);
          materials.current = null;
          setUncertain(true);
          setMessage(
            '取消結果尚未確認，請查詢原準備；不能據此判斷已阻止購買。',
          );
        }
      }
    } finally {
      lease.release();
      if (mounted.current && generation.current === owner) {
        busy.current = false;
        setWorking(false);
      }
    }
  }
  async function getDetailsLink() {
    if (!order || busy.current) return;
    const owner = ++generation.current;
    const orderId = order.orderId;
    const current = () =>
      mounted.current &&
      generation.current === owner &&
      latest.current.isCurrentCart(id);
    busy.current = true;
    setWorking(true);
    try {
      const response = await fetch(
        `/api/v1/carts/${encodeURIComponent(id)}/order-link`,
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!current()) return;
      const result = await response.json();
      if (!current()) return;
      if (
        !response.ok ||
        result?.ok !== true ||
        typeof result.data?.url !== 'string'
      ) {
        setMessage('無法取得訂單詳情連結，原購買結果不受影響。');
        return;
      }
      const url = new URL(result.data.url);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.pathname !== `/order-details/${orderId}` ||
        !new URLSearchParams(url.hash.slice(1)).has('order-read')
      ) {
        setMessage('訂單詳情連結無效。');
        return;
      }
      setDetailsLink(url.href);
    } catch {
      if (current()) setMessage('無法取得訂單詳情連結，請明確重試。');
    } finally {
      if (current()) {
        busy.current = false;
        setWorking(false);
      }
    }
  }
  return (
    <main id="main" tabIndex={-1} className="commerce-page checkout-page">
      <PageTools cartId={id} reviewId={reviewId} readonly />
      <h1>{order ? '購買成功' : '確認購買'}</h1>
      <p role="status">{working ? '正在處理…' : message}</p>
      {uncertain && !order && (
        <p role="alert">
          先前請求結果未知；pending
          不代表在途請求已失敗。僅明確重試原準備，不另建購買。
        </p>
      )}
      {order && (
        <p>
          訂單編號：<span data-testid="order-id">{order.orderId}</span>
        </p>
      )}
      {(order || status) && (
        <PurchaseSummary
          summary={order?.snapshot ?? status!.summary}
          completed={Boolean(order)}
          actions={
            !order && (
              <>
                <Button
                  disabled={!ready || working || operations.busy}
                  onClick={() => void act('pay')}
                >
                  {uncertain ? '明確重試原支付' : '確認購買'}
                </Button>
                <Button
                  variant="outline"
                  disabled={!ready || working || operations.busy}
                  onClick={() => void act('cancel')}
                >
                  取消本次準備
                </Button>
              </>
            )
          }
        />
      )}
      {!order && (
        <Button
          variant="outline"
          disabled={working}
          onClick={() => void load()}
        >
          查詢原準備
        </Button>
      )}
      {order &&
        (detailsLink ? (
          <a href={detailsLink} referrerPolicy="no-referrer">
            開啟唯讀訂單詳情
          </a>
        ) : (
          <Button disabled={working} onClick={() => void getDetailsLink()}>
            取得唯讀訂單詳情連結
          </Button>
        ))}
      {order && <p>詳情連結可轉交，持有人可在有效期限內讀取此訂單。</p>}
      <Link href={`/cart/${id}`} prefetch={false}>
        返回原購物車
      </Link>
    </main>
  );
}
