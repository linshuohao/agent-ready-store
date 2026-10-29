'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  cartIdInput,
  cartItemsInput,
  type CartItem,
  type CartView,
} from '@store/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartOperations } from './provider';
import { getCart, failureText, type EditResult } from './commands';
import { MoneyBreakdown } from './money-breakdown';
import { formatMoney } from '@/lib/money';

const drafts = (items: CartItem[]) =>
  Object.fromEntries(
    items.map((item) => [item.productId, String(item.quantity)]),
  );
const issueText: Record<string, string> = {
  SOLD_OUT: '已售罄',
  INVENTORY_ANOMALY: '庫存異常',
  PRICE_PENDING: '價格待確認',
  INVENTORY_UNAVAILABLE: '庫存暫不可用',
  INSUFFICIENT_STOCK: '目前庫存不足，請調整數量',
  PRODUCT_NOT_FOUND: '商品已失效，請移除',
};
export function CartPage({ id }: { id?: string }) {
  const operations = useCartOperations();
  const { selectCart } = operations;
  const initialRecovery = useRef(operations.pendingEdit);
  const [view, setView] = useState<CartView | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    if (!id) return;
    let active = true;
    async function load() {
      if (!cartIdInput.safeParse(id).success) {
        if (active) {
          setError('購物車連結格式有誤。');
          setLoading(false);
        }
        return;
      }
      selectCart(id!);
      const result = await getCart(id!);
      if (!active) return;
      setLoading(false);
      if (result.kind === 'success') {
        setView(result.cart);
        const recovery = initialRecovery.current;
        setDraft(
          drafts(
            recovery && recovery.cartId === id
              ? recovery.items
              : result.cart.items,
          ),
        );
        setError('');
      } else {
        setError(
          result.kind === 'failure'
            ? failureText(result.error)
            : '暫時無法載入購物車，請重試。',
        );
        setExpired(
          result.kind === 'failure' &&
            ['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(result.error.code),
        );
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id, selectCart, loadAttempt]);
  useEffect(() => {
    if (!view) return;
    const timer = setTimeout(
      () => {
        setExpired(true);
        setError('購物車已過期，請重新發起購物。');
      },
      Math.max(0, Date.parse(view.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [view]);
  const pending = operations.pendingEdit?.cartId === id;
  function accept(result: EditResult | undefined) {
    if (!result) return;
    setStatus('');
    if (result.kind === 'success') {
      setView(result.cart);
      setDraft(drafts(result.cart.items));
      setError('');
      setStatus('已儲存，內容與報價已更新。');
    }
    if (result.kind === 'conflict') {
      setView(result.cart);
      setError('購物車已變更，原草稿已保留，請比較最新內容後重新調整。');
    }
    if (result.kind === 'failure') {
      setError(failureText(result.error));
      setExpired(
        ['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(result.error.code),
      );
    }
    if (result.kind === 'unknown') setError('');
  }
  async function save() {
    if (!view || !id) return;
    const items = Object.entries(draft).map(([productId, value]) => ({
      productId,
      quantity: Number(value),
    }));
    const parsed = cartItemsInput.safeParse(items);
    if (!parsed.success) {
      setError('數量須為不超過目前庫存的正整數，請檢查輸入。');
      setStatus('');
      return;
    }
    accept(
      await operations.save({
        cartId: id,
        expectedCartVersion: view.cartVersion,
        items: parsed.data,
      }),
    );
  }
  if (!id)
    return (
      <main id="main" tabIndex={-1}>
        <h1>購物車</h1>
        {operations.currentCartId ? (
          <Link href={`/cart/${operations.currentCartId}`} prefetch={false}>
            開啟目前購物車
          </Link>
        ) : (
          <p>購物車目前沒有商品</p>
        )}
        <p>
          <Link href="/">繼續選購</Link>
        </p>
      </main>
    );
  if (loading)
    return (
      <main id="main" tabIndex={-1}>
        <h1>購物車</h1>
        <p role="status">正在讀取購物車…</p>
      </main>
    );
  if (expired || !view)
    return (
      <main id="main" tabIndex={-1}>
        <h1>購物車</h1>
        <p role="alert">{error}</p>
        {!expired && (
          <Button
            onClick={() => {
              setLoading(true);
              setLoadAttempt((n) => n + 1);
            }}
          >
            重新讀取
          </Button>
        )}
        {expired && <Button onClick={operations.restart}>重新發起購物</Button>}
        <p>
          <Link href="/">返回商品列表</Link>
        </p>
      </main>
    );
  return (
    <main id="main" tabIndex={-1} className="cart-page">
      <Link href="/">繼續選購</Link>
      <h1>購物車</h1>
      <p className="hint">
        此購物車於 {new Date(view.expiresAt).toLocaleString('zh-TW')}{' '}
        到期，瀏覽或編輯不會續期。
      </p>
      {status && <p role="status">{status}</p>}
      {error && (
        <p role="alert" id="cart-error">
          {error}
        </p>
      )}
      {pending && (
        <section className="notice">
          <p role="status">儲存結果未明，尚未確認是否完成。</p>
          <Button
            type="button"
            onClick={async () => {
              accept(await operations.retryEdit());
            }}
          >
            重試原保存
          </Button>
        </section>
      )}
      {view.items.length === 0 && <p>購物車目前沒有商品</p>}
      <div className="cart-layout">
        <section aria-label="編輯購物車">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {view.items
              .filter((item) => Object.hasOwn(draft, item.productId))
              .map((item) => (
                <article key={item.productId} className="cart-line">
                  <h2>
                    {item.name ?? '商品已失效'}{' '}
                    <span className="hint">{item.productId}</span>
                  </h2>
                  <p>
                    目前單價：
                    {item.unitPrice
                      ? formatMoney(item.unitPrice)
                      : '無法報價'}{' '}
                    · 庫存 {item.availability?.currentQuantity ?? '未知'}
                  </p>
                  {view.issues
                    .filter((issue) => issue.productId === item.productId)
                    .map((issue) => (
                      <p key={issue.code} className="cart-issue">
                        {issueText[issue.code] ?? '請調整此商品'}
                      </p>
                    ))}
                  <label htmlFor={`qty-${item.productId}`}>
                    數量 {item.productId}
                  </label>
                  <Input
                    id={`qty-${item.productId}`}
                    type="number"
                    step="1"
                    value={draft[item.productId]}
                    disabled={operations.busy}
                    aria-describedby={error ? 'cart-error' : undefined}
                    onChange={(event) => {
                      setStatus('');
                      setDraft((old) => ({
                        ...old,
                        [item.productId]: event.target.value,
                      }));
                    }}
                  />
                  <Button
                    variant="outline"
                    type="button"
                    disabled={operations.busy}
                    aria-label={`移除 ${item.productId}`}
                    onClick={() => {
                      setStatus('');
                      setDraft((old) =>
                        Object.fromEntries(
                          Object.entries(old).filter(
                            ([key]) => key !== item.productId,
                          ),
                        ),
                      );
                    }}
                  >
                    移除
                  </Button>
                </article>
              ))}
            {view.items.length > 0 && (
              <Button type="submit" disabled={operations.busy}>
                儲存調整
              </Button>
            )}
          </form>
          {error.includes('購物車已變更') && (
            <section className="notice">
              <h2>最新已儲存內容</h2>
              <ul>
                {view.items.map((item) => (
                  <li key={item.productId}>
                    {item.productId}：{item.quantity} 件
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                onClick={() => {
                  setStatus('');
                  setDraft(drafts(view.items));
                  setError('');
                }}
              >
                載入最新後重新調整
              </Button>
            </section>
          )}
          <p className="hint">
            移除與數量變更須儲存後才生效。不會自動減量或預留庫存。
          </p>
        </section>
        {view.quote ? (
          <MoneyBreakdown quote={view.quote} />
        ) : (
          <section className="notice">
            <h2>目前無可用報價</h2>
            <p>請調整商品；空購物車不計運費。</p>
          </section>
        )}
      </div>
      <p className="notice">購物車與報價已可使用；結帳功能尚未開放。</p>
    </main>
  );
}
