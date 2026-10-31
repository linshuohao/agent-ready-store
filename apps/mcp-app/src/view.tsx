import { CommerceActions } from '@store/commerce-ui';
import { useEffect, useRef } from 'react';
import { ProductArt } from './product-art';
import { Button } from './button';
import { Input } from '@base-ui/react/input';
import { MoneyBreakdown, ProductPresentation } from '@store/commerce-ui';
import type { ViewState } from './controller';
export interface Actions {
  change(id: string, value: string): void;
  save(id: string): void;
  remove(id: string): void;
  add(id: string): void;
  select(id: string, value: boolean): void;
  selectAll(value: boolean): void;
  reload(discard?: boolean): void;
  checkout(): void;
  pay(): void;
  cancel(): void;
  retry(): void;
  share(): void;
  openOrder(id: string): void;
  listOrders(offset?: number): void;
  continueShopping(confirm?: boolean): void;
  dismissContinue(): void;
}
export function StoreView({
  state: s,
  actions: a,
}: {
  state: ViewState;
  actions: Actions;
}) {
  const refreshDialog = useRef<HTMLDialogElement>(null);
  const refreshRequired = s.needsRefresh && !s.pending;
  useEffect(() => {
    const dialog = refreshDialog.current;
    if (refreshRequired && !s.busy && dialog && !dialog.open)
      dialog.showModal();
    if (!refreshRequired) dialog?.close();
  }, [refreshRequired, s.busy]);
  const blocked = s.busy || s.needsRefresh || !!s.pending;
  const o = s.order,
    c = s.cart;
  return (
    <main aria-busy={s.busy}>
      <header className="store-header">
        <p className="eyebrow">AGENT-READY STORE</p>
        <h1>
          {o
            ? o.effectiveStatus === 'PAID'
              ? '購買完成'
              : o.effectiveStatus === 'CHECKOUT'
                ? '待支付訂單'
                : o.closedAt
                  ? '訂單已關閉'
                  : '預留期限已到，待核對狀態'
            : c
              ? '購物車'
              : '商品快照'}
        </h1>
        <p className="hint">由 AI 助理協助選購，由你決定支付。</p>
      </header>
      {s.message && !refreshRequired && (
        <p className="notice" role="status" aria-live="polite">
          {s.message}
        </p>
      )}
      {refreshRequired && (
        <Button
          variant="outline"
          onClick={() => refreshDialog.current?.showModal()}
        >
          處理資料更新
        </Button>
      )}
      <dialog
        ref={refreshDialog}
        aria-labelledby="refresh-title"
        className="refresh-dialog"
      >
        <h2 id="refresh-title">資料需要重新確認</h2>
        <p>{s.message}</p>
        {s.dirty && <p>刷新會放棄尚未儲存的數量調整，並取得最新資料。</p>}
        <CommerceActions>
          <Button
            disabled={s.busy}
            onClick={() => {
              refreshDialog.current?.close();
              a.reload(s.dirty);
            }}
          >
            刷新資料
          </Button>
          <Button
            variant="outline"
            onClick={() => refreshDialog.current?.close()}
          >
            稍後處理
          </Button>
        </CommerceActions>
      </dialog>
      {s.pending && (
        <CommerceActions>
          {s.pending && (
            <Button disabled={s.busy || s.dirty} onClick={a.retry}>
              明確重試原操作（
              {s.pending.name === 'cancel_order'
                ? '取消'
                : s.pending.name === 'apps_pay_order'
                  ? '支付'
                  : '購物'}
              ）
            </Button>
          )}
          {s.pending && (
            <Button
              variant="outline"
              disabled={s.busy}
              onClick={() => a.reload(s.dirty)}
            >
              查詢原操作結果
            </Button>
          )}
        </CommerceActions>
      )}
      {!o && !c && (
        <section className="products" aria-label="商品結果">
          {s.products.map((p) => (
            <div key={p.id} className="commerce-stack">
              <ProductPresentation product={p} art={<ProductArt id={p.id} />} />
              {'description' in p && (
                <>
                  <p>{p.description}</p>
                  <dl>
                    {Object.entries(p.specs).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              <Button
                disabled={blocked || !p.availability.canPurchase}
                onClick={() => a.add(p.id)}
              >
                加入購物車 · {p.id}
              </Button>
            </div>
          ))}
        </section>
      )}
      {o && (
        <section id="order-details" aria-label="訂單固定摘要">
          <p>訂單 {o.orderId}</p>
          <p>
            來源 {o.createdByChannel} ·{' '}
            {o.aiEligible ? '本單適用 AI 優惠' : '一般選購'}
          </p>
          <p>
            預留截止 {new Date(o.reservationExpiresAt).toLocaleString('zh-TW')}
          </p>
          <ul className="cart-lines">
            {o.summary.items.map((i) => (
              <li key={i.productId}>
                <div>
                  <h2>{i.name}</h2>
                  <p>
                    {i.productId} · {i.brand}
                  </p>
                  {Object.entries(i.specs).map(([k, v]) => (
                    <p key={k}>
                      {k}：{String(v)}
                    </p>
                  ))}
                  <p>
                    數量 {i.quantity} · 單價 NT$ {i.unitPrice} · 小計 NT${' '}
                    {i.lineSubtotal}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <MoneyBreakdown
            quote={o.summary}
            mode={o.status === 'PAID' ? 'completed' : 'confirmation'}
          />
          <CommerceActions>
            {o.allowedActions.canPay && (
              <Button
                disabled={
                  blocked || Date.parse(o.reservationExpiresAt) <= Date.now()
                }
                onClick={a.pay}
              >
                確認支付
              </Button>
            )}
            {o.allowedActions.canCancel && (
              <Button variant="outline" disabled={blocked} onClick={a.cancel}>
                取消原訂單
              </Button>
            )}
            <Button variant="outline" onClick={() => a.continueShopping()}>
              繼續原車購物
            </Button>
            <Button variant="outline" onClick={a.share}>
              分享此訂單
            </Button>
          </CommerceActions>
          {s.confirmCartId && (
            <section className="commerce-card" aria-label="接續確認">
              <p>已有不同購物車；接續此訂單原車不會合併商品。</p>
              <CommerceActions>
                <Button onClick={() => a.continueShopping(true)}>
                  確認接續原車
                </Button>
                <Button variant="outline" onClick={a.dismissContinue}>
                  保留目前購物車
                </Button>
              </CommerceActions>
            </section>
          )}
        </section>
      )}
      {c && !o && (
        <>
          <p>
            購物車 {c.cartId} · 版本 {c.cartVersion}
          </p>
          <label>
            <input
              type="checkbox"
              checked={
                c.items.length > 0 && s.selected.length === c.items.length
              }
              disabled={blocked || s.dirty}
              onChange={(e) => a.selectAll(e.target.checked)}
            />
            全選整行商品
          </label>
          <ul className="cart-lines">
            {c.items.map((i) => (
              <li key={i.productId}>
                <div>
                  <h2>{i.name ?? '商品暫不可用'}</h2>
                  <p>
                    {i.productId} · 單價 {i.unitPrice ?? '待確認'}
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={s.selected.includes(i.productId)}
                      disabled={blocked || s.dirty}
                      onChange={(e) => a.select(i.productId, e.target.checked)}
                    />
                    選購 {i.productId} 整行
                  </label>
                </div>
                <div className="line-actions">
                  <label>
                    數量 · {i.productId}
                    <Input
                      inputMode="numeric"
                      value={s.draft[i.productId] ?? String(i.quantity)}
                      disabled={blocked}
                      onChange={(e) => a.change(i.productId, e.target.value)}
                      onBlur={() => a.save(i.productId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') a.save(i.productId);
                      }}
                    />
                  </label>
                  <Button
                    variant="outline"
                    disabled={blocked || s.dirty}
                    onClick={() => a.remove(i.productId)}
                  >
                    移除 {i.productId}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {!c.items.length && <p>購物車目前是空的，原訂單仍可查看。</p>}
          {c.issues.map((i, n) => (
            <p key={n}>
              {i.productId} · {i.code}
            </p>
          ))}
          {s.quote ? (
            <section aria-label="選中預估">
              <h2>選中商品預估</h2>
              <MoneyBreakdown quote={s.quote} />
            </section>
          ) : (
            <p>請選擇整行商品；預估以服務端結果為準。</p>
          )}
          <CommerceActions>
            <Button
              disabled={blocked || s.dirty || !s.selected.length}
              onClick={a.checkout}
            >
              建立待支付訂單
            </Button>
            <p className="commerce-action-note">
              生單會固定摘要並預留 15 分鐘；只有明確支付成功才完成購買。
            </p>
          </CommerceActions>
          <section className="order-navigation" aria-label="原車訂單">
            <h2>待支付及歷史訂單</h2>
            {c.pendingOrders.map((p) => (
              <a
                key={p.orderId}
                href="#order-details"
                onClick={(event) => {
                  event.preventDefault();
                  a.openOrder(p.orderId);
                }}
              >
                待支付 {p.orderId}
              </a>
            ))}
            <Button onClick={() => a.listOrders()}>查詢全部訂單</Button>
            {s.orders.map((p) => (
              <a
                key={p.orderId}
                href="#order-details"
                onClick={(event) => {
                  event.preventDefault();
                  a.openOrder(p.orderId);
                }}
              >
                {p.effectiveStatus} · {p.orderId}
              </a>
            ))}
            {s.nextOffset !== null && (
              <Button onClick={() => a.listOrders(s.nextOffset!)}>
                更多訂單
              </Button>
            )}
          </section>
        </>
      )}
    </main>
  );
}
