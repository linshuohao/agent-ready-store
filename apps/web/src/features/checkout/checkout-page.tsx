'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  cartIdInput,
  type CheckoutReview,
  type OrderResult,
  type PurchaseSummary as Summary,
} from '@store/contracts';
import { Button } from '@/components/ui/button';
import { PurchaseSummary, PurchaseChanges } from './purchase-summary';
import { useOrderMemory } from './order-memory';
import { pendingKey, reviewCheckout, submitOrder, readOrder } from './commands';

type Ready = Extract<CheckoutReview, { state: 'ready' }>;
type Phase =
  | 'loading'
  | 'reviewing'
  | 'ready'
  | 'submitting'
  | 'changed'
  | 'blocked'
  | 'unknown'
  | 'expired'
  | 'success';
const errorText = (code: string) =>
  code === 'FORBIDDEN'
    ? '無法存取這個購物車，請確認原連結。'
    : code === 'CREDENTIAL_EXPIRED'
      ? '購物車已過期，無法繼續購買。'
      : code === 'CONFIRMATION_INVALID'
        ? '確認資料與目前瀏覽器不符，請重新審閱。'
        : '購買內容或確認資料已變更，請重新審閱。';
export function CheckoutPage({ id }: { id: string }) {
  const router = useRouter(),
    { remember } = useOrderMemory();
  const [phase, setPhase] = useState<Phase>('loading'),
    [ready, setReady] = useState<Ready | null>(null),
    [message, setMessage] = useState('');
  const [previous, setPrevious] = useState<Summary | null>(null);
  const [blocked, setBlocked] = useState<Extract<
    CheckoutReview,
    { state: 'blocked' }
  > | null>(null);
  const mounted = useRef(false),
    busy = useRef(false),
    generation = useRef(0);
  function success(order: OrderResult) {
    sessionStorage.removeItem(pendingKey(id));
    remember(order);
    setPhase('success');
    router.push(`/orders/${id}`);
  }
  async function review() {
    if (busy.current) return;
    busy.current = true;
    const owner = ++generation.current;
    setPhase('reviewing');
    setMessage('');
    setReady(null);
    const result = await reviewCheckout(id);
    busy.current = false;
    if (!mounted.current || owner !== generation.current) return;
    if (result.kind === 'success') {
      sessionStorage.removeItem(pendingKey(id));
      if (result.data.state === 'success') success(result.data.order);
      else if (result.data.state === 'ready') {
        setReady(result.data);
        setPhase('ready');
      } else {
        setBlocked(result.data);
        setPhase('blocked');
        setMessage('部分商品無法購買，請調整原購物車。');
      }
    } else if (result.kind === 'failure') {
      setMessage(errorText(result.code));
      setPhase(
        ['CREDENTIAL_EXPIRED', 'FORBIDDEN'].includes(result.code)
          ? 'expired'
          : 'changed',
      );
    } else {
      setPhase('unknown');
      setMessage('結果尚未確認，重新審閱未完成；請勿重新建立購買。');
    }
  }
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      if (!cartIdInput.safeParse(id).success) {
        setMessage('購物車連結格式有誤。');
        setPhase('expired');
        return;
      }
      if (sessionStorage.getItem(pendingKey(id))) {
        setPhase('unknown');
        setMessage('先前購買結果尚未確認，請查詢原訂單或重新審閱。');
      } else void review();
    });
    return () => {
      active = false;
      mounted.current = false;
    };
    // The route keys this component by cartId; mutations are initiated only by this flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (phase !== 'ready' || !ready) return;
    const timeout = setTimeout(
      () => {
        setReady(null);
        setPhase('expired');
        setMessage('購物車已過期，無法繼續購買。');
      },
      Math.max(0, Date.parse(ready.confirmationExpiresAt) - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [ready, phase]);
  useEffect(() => {
    if (phase !== 'unknown') return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      if (!active || document.hidden) return;
      const result = await readOrder(id);
      if (!active) return;
      if (result.kind === 'success') {
        success(result.data);
        return;
      }
      if (
        result.kind === 'failure' &&
        ['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(result.code)
      ) {
        setMessage(
          '購買結果尚未確認，原存取權限已失效，無法繼續查詢；這不表示購買失敗。',
        );
        setPhase('expired');
        return;
      }
      if (++attempts < 3) timer = setTimeout(() => void poll(), 1000);
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, id]);
  async function submit() {
    if (busy.current || phase !== 'ready' || !ready) return;
    busy.current = true;
    const owner = ++generation.current;
    sessionStorage.setItem(pendingKey(id), '1');
    setPhase('submitting');
    setMessage('');
    const result = await submitOrder(id, ready.confirmation);
    busy.current = false;
    if (!mounted.current || owner !== generation.current) return;
    if (result.kind === 'success') {
      success(result.data);
      return;
    }
    setReady(null);
    if (result.kind === 'unknown') {
      setPhase('unknown');
      setMessage('結果尚未確認，請勿重新建立購買。');
      return;
    }
    setPrevious(ready.summary);
    sessionStorage.removeItem(pendingKey(id));
    setMessage(
      result.code === 'CART_ITEMS_INVALID'
        ? '庫存或商品狀態已改變，本次未完成購買，請調整原購物車。'
        : errorText(result.code),
    );
    setPhase(
      ['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(result.code)
        ? 'expired'
        : result.code === 'CART_ITEMS_INVALID'
          ? 'blocked'
          : 'changed',
    );
  }
  const working = ['loading', 'reviewing', 'submitting', 'success'].includes(
    phase,
  );
  return (
    <main id="main" tabIndex={-1} className="commerce-page checkout-page">
      <div className="commerce-page-heading">
        <p className="eyebrow">CHECKOUT</p>
        <h1>結帳</h1>
        <p>
          核對商品與完整金額後，按下「確認購買」即完成模擬購買，沒有額外付款步驟。
        </p>
      </div>
      {working && (
        <p role="status">
          {phase === 'submitting'
            ? '正在提交購買，請稍候…'
            : '正在核對購買內容…'}
        </p>
      )}
      {message && (
        <p role="alert" className="notice">
          {message}
        </p>
      )}
      {ready && previous && (
        <PurchaseChanges before={previous} after={ready.summary} />
      )}
      {ready && (
        <PurchaseSummary
          summary={ready.summary}
          actions={
            <>
              <Button
                onClick={() => void submit()}
                disabled={phase !== 'ready'}
              >
                {phase === 'submitting' ? '正在提交購買…' : '確認購買'}
              </Button>
              {phase === 'ready' && (
                <>
                  <Link
                    className="commerce-action-secondary"
                    href={`/cart/${id}`}
                    prefetch={false}
                  >
                    編輯原購物車
                  </Link>
                  <Link className="commerce-action-text" href="/">
                    繼續選購
                  </Link>
                </>
              )}
            </>
          }
        />
      )}
      {blocked && (
        <ul>
          {blocked.cart.issues.map((issue, i) => (
            <li key={i}>
              {issue.productId}：{issue.code}
            </li>
          ))}
        </ul>
      )}
      {['changed', 'unknown'].includes(phase) && (
        <Button onClick={() => void review()}>
          {phase === 'unknown' ? '確認原提交結果並重新審閱' : '重新審閱'}
        </Button>
      )}
      {phase === 'unknown' && (
        <Button
          variant="outline"
          onClick={async () => {
            const r = await readOrder(id);
            if (mounted.current && r.kind === 'success') success(r.data);
          }}
        >
          查詢原訂單
        </Button>
      )}
      {!working && !ready && phase !== 'unknown' && phase !== 'expired' && (
        <p>
          <Link
            className="commerce-action-secondary"
            href={`/cart/${id}`}
            prefetch={false}
          >
            編輯原購物車
          </Link>
        </p>
      )}
      {phase === 'expired' && <Link href="/">返回商品列表</Link>}
    </main>
  );
}
