import { Button } from '@base-ui/react/button';
import { Input } from '@base-ui/react/input';
import {
  MoneyBreakdown,
  PurchaseSummary,
  ProductPresentation,
} from '@store/commerce-ui';
import type { ViewState } from './controller';
export interface Actions {
  change(id: string, value: string): void;
  remove(id: string): void;
  save(): void;
  reload(discard: boolean): void;
  checkout(): void;
  share(): void;
  openOrderDetails(): void;
  returnToCart(): void;
  pay(retry?: boolean): void;
  cancelPurchase(): void;
  recoverPurchase(): void;
}
export function StoreView({
  state,
  actions,
}: {
  state: ViewState;
  actions: Actions;
}) {
  const { cart, order } = state;
  const blocked = state.busy || !state.editable || state.needsRefresh;
  const lines =
    state.draft ??
    cart?.items.map((x) => ({
      productId: x.productId,
      quantity: String(x.quantity),
    })) ??
    [];
  return (
    <main aria-busy={state.busy}>
      <header className="store-header">
        <p className="eyebrow">AGENT-READY STORE</p>
        <h1>
          {order
            ? '購買完成'
            : state.purchase
              ? '確認購買'
              : cart
                ? '購物車'
                : '商品快照'}
        </h1>
        <p className="hint">由 AI 助理準備，由你決定。</p>
      </header>
      <p className="notice" role="status" aria-live="polite">
        {state.message}
      </p>
      {state.products.length > 0 && (
        <section className="products" aria-label="商品結果">
          {state.products.map((product) => (
            <div key={product.id}>
              <ProductPresentation product={product} />
              {'description' in product && (
                <section className="product-detail">
                  <p>{product.description}</p>
                  <dl>
                    {Object.entries(product.specs).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
          ))}
        </section>
      )}
      {order && (
        <Button
          disabled={state.busy || state.needsRefresh}
          onClick={actions.openOrderDetails}
        >
          開啟唯讀訂單詳情
        </Button>
      )}
      {state.canRecover && (
        <Button disabled={state.busy} onClick={actions.recoverPurchase}>
          恢復原準備（不會支付）
        </Button>
      )}
      {state.purchase && (
        <section aria-label="購買確認">
          <PurchaseSummary
            summary={order?.snapshot ?? state.purchase.summary}
            completed={!!order}
          />
          <p>
            有效至 {new Date(state.purchase.expiresAt).toLocaleString('zh-TW')}
          </p>
          {!order && state.purchase.state !== 'pending' && (
            <Button disabled={state.busy} onClick={actions.returnToCart}>
              返回購物車
            </Button>
          )}
          {!order && (
            <div className="commerce-actions">
              <Button
                disabled={state.busy || !state.canPay || state.needsRefresh}
                onClick={() => actions.pay()}
              >
                確認支付
              </Button>
              {state.canRetryPay && (
                <Button
                  disabled={state.busy || state.needsRefresh}
                  onClick={() => actions.pay(true)}
                >
                  明確重試原購買
                </Button>
              )}
              <Button
                className="secondary"
                disabled={state.busy || !state.canCancel || state.needsRefresh}
                onClick={actions.cancelPurchase}
              >
                取消本次購買
              </Button>
              <Button
                className="secondary"
                disabled={state.busy}
                onClick={() => actions.reload(false)}
              >
                查詢原準備狀態
              </Button>
            </div>
          )}
        </section>
      )}
      {cart && !state.purchase && (
        <>
          <div className="cart-identity">
            <p>
              {cart.origin === 'AGENT' ? 'AI 助理準備' : '自行選購'} · 版本{' '}
              {cart.cartVersion}
            </p>
            <p className="hint">購物車 {cart.cartId}</p>
            <p className="hint">
              有效至 {new Date(cart.expiresAt).toLocaleString('zh-TW')}
            </p>
          </div>
          {order ? (
            <PurchaseSummary summary={order.snapshot} completed />
          ) : (
            <>
              {cart.orderId ? (
                <p>購物已完成；請讓 Agent 重新呼叫 get_cart 取得原成交內容。</p>
              ) : (
                <>
                  <section aria-label="購物車條目">
                    {lines.length === 0 ? (
                      <p className="empty">
                        {state.dirty
                          ? '已移除所有商品，儲存後購物車將為空。'
                          : '購物車目前是空的。'}
                      </p>
                    ) : (
                      <ul className="cart-lines">
                        {lines.map((line) => {
                          const item = cart.items.find(
                            (x) => x.productId === line.productId,
                          )!;
                          return (
                            <li key={line.productId}>
                              <div>
                                <h2>{item.name ?? '商品暫不可用'}</h2>
                                <p className="hint">{line.productId}</p>
                              </div>
                              <div className="line-actions">
                                <label>
                                  數量 · {line.productId}
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={line.quantity}
                                    disabled={blocked}
                                    onChange={(e) =>
                                      actions.change(
                                        line.productId,
                                        e.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <Button
                                  className="secondary"
                                  disabled={blocked}
                                  onClick={() => actions.remove(line.productId)}
                                  aria-label={`移除 ${item.name ?? line.productId}，${line.productId}`}
                                >
                                  移除
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                  {cart.issues.length > 0 && (
                    <section className="notice" aria-label="購物車問題">
                      <h2>請先處理商品問題</h2>
                      <ul>
                        {cart.issues.map((issue, i) => (
                          <li key={`${issue.productId}-${i}`}>
                            {issue.productId} · {issue.code}
                          </li>
                        ))}
                      </ul>
                      <p>整車儲存會重新檢查所有條目；可移除問題商品後儲存。</p>
                    </section>
                  )}
                  {cart.quote ? (
                    <MoneyBreakdown quote={cart.quote} />
                  ) : (
                    <p>目前無可用報價，尚不可結帳。</p>
                  )}
                  <div className="commerce-actions">
                    <Button
                      disabled={blocked || !state.dirty}
                      onClick={actions.save}
                    >
                      儲存調整
                    </Button>
                    <Button
                      className="secondary"
                      disabled={
                        state.busy || (!state.editable && !state.needsRefresh)
                      }
                      onClick={() => actions.reload(state.dirty)}
                    >
                      {state.dirty ? '放棄調整並重新載入' : '重新載入'}
                    </Button>
                    <Button
                      disabled={blocked || state.dirty || !cart.canCheckout}
                      onClick={actions.checkout}
                    >
                      核對並準備購買
                    </Button>
                  </div>
                  <Button
                    className="secondary"
                    disabled={blocked || state.dirty || !cart.canCheckout}
                    onClick={actions.share}
                  >
                    分享／交接至商城
                  </Button>
                  <p className="hint">
                    準備後會顯示完整購買摘要；只有你明確點擊「確認支付」才會提交訂單。
                  </p>
                </>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
