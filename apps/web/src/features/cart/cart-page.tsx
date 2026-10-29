'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  cartIdInput,
  cartItemsInput,
  type CartItem,
  type CartIssue,
  type CartView,
} from '@store/contracts';
import { Button, buttonVariants } from '@/components/ui/button';
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
  const [conflicted, setConflicted] = useState(false);
  const [saveIssues, setSaveIssues] = useState<CartIssue[]>([]);
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
      setConflicted(false);
      setSaveIssues([]);
      setStatus('已儲存，內容與報價已更新。');
    }
    if (result.kind === 'conflict') {
      setView(result.cart);
      setConflicted(true);
      setSaveIssues([]);
      setError('購物車已變更，原草稿已保留，請比較最新內容後重新調整。');
    }
    if (result.kind === 'failure') {
      setError(failureText(result.error));
      setSaveIssues(result.error.issues ?? []);
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
      <main id="main" tabIndex={-1} className="commerce-page">
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
  if (view.orderId)
    return (
      <main id="main" tabIndex={-1}>
        <h1>購物車</h1>
        <p>此購物車已完成購買。</p>
        <Link href={`/orders/${id}`} prefetch={false}>
          查看原訂單
        </Link>
        <p>
          <Button onClick={operations.restart}>開始新的購物</Button>
        </p>
      </main>
    );
  const canProceed =
    view.canCheckout &&
    !operations.busy &&
    !pending &&
    !conflicted &&
    Object.keys(draft).length === view.items.length &&
    view.items.every((item) => Number(draft[item.productId]) === item.quantity);
  return (
    <main id="main" tabIndex={-1} className="commerce-page cart-page">
      <div className="commerce-page-heading">
        <p className="eyebrow">CART</p>
        <h1>購物車</h1>
        <p>調整商品與數量，儲存後核對報價，再前往結帳。</p>
        <p className="hint">
          此購物車於 {new Date(view.expiresAt).toLocaleString('zh-TW')}{' '}
          到期，瀏覽或編輯不會續期。
        </p>
      </div>
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
      <div className="purchase-layout">
        <section className="purchase-products" aria-label="編輯購物車">
          <div className="purchase-section-heading">
            <h2>商品明細</h2>
            <p>來源：{view.origin === 'AGENT' ? 'AI 助理準備' : '自行選購'}</p>
          </div>
          {conflicted && (
            <>
              <h2>目前草稿</h2>
              <p>儲存會以完整草稿取代最新內容，不會自動合併其他入口的調整。</p>
            </>
          )}
          {Object.keys(draft).length === 0 && view.items.length > 0 && (
            <p>目前草稿沒有商品，儲存後將清空購物車。</p>
          )}
          <form
            id="cart-edit-form"
            className="cart-edit-form"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {Object.entries(draft).map(([productId, quantity]) => {
              const item = view.items.find(
                (item) => item.productId === productId,
              );
              const issues = saveIssues.length ? saveIssues : view.issues;
              return (
                <article key={productId} className="purchase-product cart-line">
                  <div className="purchase-product-heading">
                    <h3>
                      {item ? (item.name ?? '商品已失效') : '待重新驗證的商品'}{' '}
                      <span className="hint">{productId}</span>
                    </h3>
                  </div>
                  {!item && (
                    <p className="cart-issue">
                      此商品已不在最新購物車，草稿仍保留；儲存時會重新驗證。
                    </p>
                  )}
                  <p>
                    目前單價：
                    {item?.unitPrice
                      ? formatMoney(item.unitPrice)
                      : '無法報價'}{' '}
                    · 庫存 {item?.availability?.currentQuantity ?? '未知'}
                  </p>
                  {issues
                    .filter((issue) => issue.productId === productId)
                    .map((issue) => (
                      <p key={issue.code} className="cart-issue">
                        {issueText[issue.code] ?? '請調整此商品'}
                      </p>
                    ))}
                  <div className="cart-line-controls">
                    <label htmlFor={`qty-${productId}`}>數量 {productId}</label>
                    <Input
                      id={`qty-${productId}`}
                      type="number"
                      step="1"
                      value={quantity}
                      disabled={operations.busy}
                      aria-describedby={error ? 'cart-error' : undefined}
                      onChange={(event) => {
                        setStatus('');
                        setDraft((old) => ({
                          ...old,
                          [productId]: event.target.value,
                        }));
                      }}
                    />
                    <Button
                      variant="outline"
                      type="button"
                      disabled={operations.busy}
                      aria-label={`移除 ${productId}`}
                      onClick={() => {
                        setStatus('');
                        setDraft((old) =>
                          Object.fromEntries(
                            Object.entries(old).filter(
                              ([key]) => key !== productId,
                            ),
                          ),
                        );
                      }}
                    >
                      移除
                    </Button>
                  </div>
                </article>
              );
            })}
          </form>
          {conflicted && (
            <section className="notice">
              <h2>最新已儲存內容</h2>
              {view.items.length === 0 && <p>最新購物車沒有商品。</p>}
              <ul>
                {view.items.map((item) => (
                  <li key={item.productId}>
                    {item.productId}：{item.quantity} 件
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                disabled={operations.busy}
                onClick={() => {
                  setStatus('');
                  setDraft(drafts(view.items));
                  setError('');
                  setConflicted(false);
                  setSaveIssues([]);
                }}
              >
                放棄草稿，載入最新
              </Button>
            </section>
          )}
          <p className="hint">
            移除與數量變更須儲存後才生效。不會自動減量或預留庫存。
          </p>
        </section>
        <aside className="purchase-aside" aria-label="購物車摘要">
          {view.quote ? (
            <MoneyBreakdown quote={view.quote} />
          ) : (
            <section className="notice">
              <h2>目前無可用報價</h2>
              <p>請調整商品；空購物車不計運費。</p>
            </section>
          )}
          <div className="commerce-actions">
            {canProceed ? (
              <Link
                className={buttonVariants()}
                href={`/checkout/${id}`}
                prefetch={false}
              >
                前往結帳
              </Link>
            ) : (
              <p className="commerce-action-note" role="status">
                請先儲存調整並排除商品問題後再前往結帳。
              </p>
            )}
            {(view.items.length > 0 ||
              Object.keys(draft).length > 0 ||
              conflicted) && (
              <Button
                type="submit"
                form="cart-edit-form"
                variant={canProceed ? 'outline' : 'default'}
                disabled={operations.busy}
              >
                {conflicted ? '以目前草稿儲存' : '儲存調整'}
              </Button>
            )}
            <Link className="commerce-action-text" href="/">
              繼續選購
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
