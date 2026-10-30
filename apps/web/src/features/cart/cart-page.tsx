'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  cartIdInput,
  cartOperationInput,
  type CartOperation,
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
import { PageTools } from '@/features/webmcp/page-tools';

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
  const { selectCart, setDraftGuard } = operations;
  const mounted = useRef(false);
  const submitting = useRef(false);
  const viewRef = useRef<CartView | null>(null);
  const draftRef = useRef<Record<string, string>>({});
  const reloadRequired = useRef(false);
  const generation = useRef(0);
  const inputEpoch = useRef(0);
  const reading = useRef(false);
  const readSequence = useRef(0);
  const deferredRead = useRef(false);
  const busyRef = useRef(false);
  const [pageGeneration, setPageGeneration] = useState(0);
  const [view, setView] = useState<CartView | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const [saveIssues, setSaveIssues] = useState<CartIssue[]>([]);
  const [expired, setExpired] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const dirty = Boolean(
    view &&
    (Object.keys(draft).length !== view.items.length ||
      view.items.some(
        (item) => Number(draft[item.productId]) !== item.quantity,
      )),
  );
  const dirtyProduct = view?.items.find(
    (item) => Number(draft[item.productId]) !== item.quantity,
  )?.productId;
  const hasDraft = useCallback(() => {
    const current = viewRef.current;
    return Boolean(
      current &&
      (Object.keys(draftRef.current).length !== current.items.length ||
        current.items.some(
          (item) => Number(draftRef.current[item.productId]) !== item.quantity,
        )),
    );
  }, []);
  const requireReload = useCallback(
    (text: string) => {
      reloadRequired.current = true;
      inputEpoch.current++;
      setNeedsReload(true);
      setStatus('');
      setError(text);
      if (id) setDraftGuard(id, hasDraft(), true);
    },
    [id, setDraftGuard, hasDraft],
  );
  const install = useCallback((cart: CartView) => {
    if (
      viewRef.current?.cartId === cart.cartId &&
      cart.cartVersion < viewRef.current.cartVersion
    )
      return;
    viewRef.current = cart;
    draftRef.current = drafts(cart.items);
    setView(cart);
    setDraft(draftRef.current);
    setSaveIssues([]);
    setExpired(false);
    setCompleted(Boolean(cart.orderId));
    setError('');
    setStatus('');
  }, []);
  const load = useCallback(
    async (explicit = false) => {
      if (!id) return;
      if (!cartIdInput.safeParse(id).success) {
        setError('購物車連結格式有誤。');
        setLoading(false);
        return;
      }
      if (!explicit) {
        if (reloadRequired.current) return;
        if (busyRef.current || submitting.current) {
          deferredRead.current = true;
          return;
        }
        if (hasDraft()) {
          requireReload('購物車可能已更新，請重新載入後再調整。');
          return;
        }
        if (reading.current) return;
      } else {
        generation.current++;
        inputEpoch.current++;
        setPageGeneration(generation.current);
        setLoading(true);
      }
      const owner = generation.current,
        epoch = inputEpoch.current,
        sequence = ++readSequence.current;
      reading.current = true;
      const result = await getCart(id);
      if (
        !mounted.current ||
        owner !== generation.current ||
        sequence !== readSequence.current
      )
        return;
      reading.current = false;
      setLoading(false);
      if (
        !explicit &&
        (reloadRequired.current ||
          epoch !== inputEpoch.current ||
          busyRef.current)
      ) {
        if (hasDraft()) requireReload('購物車可能已更新，請重新載入後再調整。');
        else if (busyRef.current) deferredRead.current = true;
        return;
      }
      if (result.kind === 'success') {
        install(result.cart);
        if (explicit) {
          reloadRequired.current = false;
          setNeedsReload(false);
        }
        setDraftGuard(id, false, reloadRequired.current);
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
    },
    [id, hasDraft, requireReload, install, setDraftGuard],
  );
  const leavePage = useCallback(() => {
    mounted.current = false;
    generation.current++;
  }, []);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    void Promise.resolve().then(() => {
      if (active && id) {
        selectCart(id);
        void load(true);
      }
    });
    return () => {
      active = false;
      leavePage();
      if (id) setDraftGuard(id, false);
    };
  }, [id, selectCart, setDraftGuard, load, leavePage]);
  useEffect(() => {
    busyRef.current = operations.busy;
    if (!operations.busy && deferredRead.current) {
      deferredRead.current = false;
      void load();
    }
  }, [operations.busy, load]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const returned = () => {
      if (document.visibilityState === 'hidden' || timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        void load();
      }, 0);
    };
    window.addEventListener('focus', returned);
    window.addEventListener('pageshow', returned);
    document.addEventListener('visibilitychange', returned);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', returned);
      window.removeEventListener('pageshow', returned);
      document.removeEventListener('visibilitychange', returned);
    };
  }, [load]);
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
  function accept(result: EditResult | undefined, owner: number) {
    if (!mounted.current || owner !== generation.current || !result) return;
    if (result.kind === 'success') {
      if (result.cart.cartId !== id || reloadRequired.current) return;
      install(result.cart);
      if (id) setDraftGuard(id, false);
      setStatus('已儲存，內容與報價已更新。');
    } else if (result.kind === 'unknown')
      requireReload('保存結果未確認，請重新載入查看服務端的購物車。');
    else {
      if (result.error.code === 'CART_COMPLETED') {
        requireReload('此購物車已完成購買。');
        setCompleted(true);
        return;
      }
      if (
        ['CART_BUSY', 'UNSAVED_DRAFT', 'STALE_CONTEXT'].includes(
          result.error.code,
        )
      )
        return;
      if (
        [
          'CART_VERSION_CONFLICT',
          'CART_ITEM_NOT_FOUND',
          'CART_RELOAD_REQUIRED',
        ].includes(result.error.code)
      )
        requireReload(failureText(result.error));
      else {
        setError(failureText(result.error));
        setSaveIssues(result.error.issues ?? []);
      }
      setExpired(
        ['FORBIDDEN', 'CREDENTIAL_EXPIRED'].includes(result.error.code),
      );
    }
  }
  function changeQuantity(productId: string, value: string) {
    inputEpoch.current++;
    draftRef.current = { ...draftRef.current, [productId]: value };
    setDraft(draftRef.current);
    setStatus('');
    if (id) setDraftGuard(id, hasDraft(), reloadRequired.current);
  }
  async function perform(operation: CartOperation) {
    const current = viewRef.current;
    if (
      !current ||
      !id ||
      submitting.current ||
      busyRef.current ||
      reloadRequired.current
    )
      return;
    const parsed = cartOperationInput.safeParse(operation);
    if (!parsed.success) {
      setError('數量須為不超過目前庫存的正整數，請檢查輸入。');
      return;
    }
    submitting.current = true;
    busyRef.current = true;
    inputEpoch.current++;
    const owner = generation.current;
    try {
      accept(
        await operations.save({
          cartId: id,
          expectedCartVersion: current.cartVersion,
          operation: parsed.data,
        }),
        owner,
      );
    } finally {
      submitting.current = false;
      busyRef.current = false;
    }
  }
  function saveQuantity(productId: string) {
    const current = viewRef.current?.items.find(
      (item) => item.productId === productId,
    );
    const quantity = Number(draftRef.current[productId]);
    if (!current || quantity === current.quantity) return;
    void perform({ type: 'set_quantity', productId, quantity });
  }
  const reload = () => {
    void load(true);
  };

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
              void load(true);
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
  if (view.orderId || completed)
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
    !needsReload &&
    !dirty &&
    Object.keys(draft).length === view.items.length &&
    view.items.every((item) => Number(draft[item.productId]) === item.quantity);
  return (
    <main id="main" tabIndex={-1} className="commerce-page cart-page">
      <PageTools
        cartId={id}
        onCartChanged={(result) => accept(result, pageGeneration)}
      />
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
      {needsReload && (
        <Button type="button" onClick={reload}>
          重新載入購物車（放棄未儲存修改）
        </Button>
      )}
      {view.items.length === 0 && <p>購物車目前沒有商品</p>}
      <div className="purchase-layout">
        <section className="purchase-products" aria-label="編輯購物車">
          <div className="purchase-section-heading">
            <h2>商品明細</h2>
            <p>來源：{view.origin === 'AGENT' ? 'AI 助理準備' : '自行選購'}</p>
          </div>
          {Object.keys(draft).length === 0 && view.items.length > 0 && (
            <p>目前草稿沒有商品，儲存後將清空購物車。</p>
          )}
          <div className="cart-edit-form">
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
                      disabled={
                        operations.busy ||
                        needsReload ||
                        Boolean(dirtyProduct && dirtyProduct !== productId)
                      }
                      aria-describedby={error ? 'cart-error' : undefined}
                      onChange={(event) =>
                        changeQuantity(productId, event.target.value)
                      }
                      onBlur={() => saveQuantity(productId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          saveQuantity(productId);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      type="button"
                      disabled={
                        operations.busy ||
                        needsReload ||
                        Boolean(dirtyProduct && dirtyProduct !== productId)
                      }
                      aria-label={`移除 ${productId}`}
                      onClick={() => {
                        if (!hasDraft())
                          void perform({ type: 'remove_item', productId });
                      }}
                    >
                      移除
                    </Button>
                    {dirtyProduct === productId && !operations.busy && (
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={`恢復已儲存數量 ${productId}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          changeQuantity(
                            productId,
                            String(item?.quantity ?? ''),
                          );
                          if (!reloadRequired.current) setError('');
                        }}
                      >
                        恢復已儲存數量
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="hint">
            數量按 Enter
            或離開欄位後儲存；移除立即提交。以服務端回應為準，不會自動減量或預留庫存。
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
            {operations.busy && <p role="status">儲存中…</p>}
            <Link className="commerce-action-text" href="/">
              繼續選購
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
