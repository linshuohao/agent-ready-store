'use client';

import { CommerceActions } from '../../index';
import { Link } from '../../runtime';
import { PageTools } from '../../runtime';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MoneyBreakdown } from './money-breakdown';
import { formatMoney } from '../../lib/money';
import { Checkbox } from '../../components/ui/checkbox';
import { useCartPage } from './use-cart-page';
export function CartPage({ id }: { id?: string }) {
  const page = useCartPage(id);
  const {
    operations,
    view,
    draft,
    dirty,
    selected,
    setSelected,
    quote,
    quoteError,
    quoteLoading,
    refreshQuote,
    validPurchase,
    error,
    loading,
    reload,
    working,
    unknownOrder,
    orderRequests,
    queryOrder,
    selection,
    rowErrors,
    rows,
    createdId,
    change,
    perform,
    create,
    load,
  } = page;
  const busy = !operations.ready;
  if (!id)
    return (
      <main id="main" tabIndex={-1} className="commerce-page">
        <PageTools cartId={id} />
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
  const conflict =
    operations.currentCartId !== null && operations.currentCartId !== id;
  return (
    <main id="main" tabIndex={-1} className="commerce-page cart-page">
      <div className="commerce-page-heading">
        <p className="eyebrow">CART</p>
        <PageTools cartId={id} />
        <h1>購物車</h1>
        <p>
          勾選要購買的商品並調整數量，即可建立待支付訂單。生單後保留庫存15分鐘，尚未支付。
        </p>
      </div>
      {loading && <p role="status">正在讀取購物車…</p>}
      {error && <p role="alert">{error}</p>}
      {conflict && (
        <p role="alert">
          這不是目前購物車，未更換購物上下文。
          <Link href={`/cart/${operations.currentCartId}`}>返回目前購物車</Link>
        </p>
      )}
      {(reload || (!view && !loading)) && (
        <CommerceActions>
          <Button disabled={busy} onClick={() => void load(true)}>
            {reload ? '重新讀取購物車（保留購買量與草稿）' : '重新讀取'}
          </Button>
        </CommerceActions>
      )}
      {view && (
        <>
          {view.items.length === 0 && <p>購物車目前沒有商品</p>}
          <div className="purchase-layout">
            <section className="purchase-products" aria-label="編輯購物車">
              <h2>商品明細</h2>
              {!!view.items.length && (
                <label
                  className="cart-selection cart-select-all"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <Checkbox
                    indeterminate={
                      selected.length > 0 && selected.length < view.items.length
                    }
                    aria-label="全選商品"
                    checked={selected.length === view.items.length}
                    disabled={busy || conflict}
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked ? view.items.map((i) => i.productId) : [],
                      )
                    }
                  />{' '}
                  全選
                </label>
              )}
              {view.items.map((item) => (
                <article
                  key={item.productId}
                  className="purchase-product cart-line"
                >
                  <h3>
                    <label
                      className="cart-selection"
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      <Checkbox
                        aria-label={`選取 ${item.productId}`}
                        checked={selected.includes(item.productId)}
                        disabled={busy || conflict}
                        onCheckedChange={(checked) =>
                          setSelected(
                            checked
                              ? [...selected, item.productId]
                              : selected.filter((id) => id !== item.productId),
                          )
                        }
                      />
                      <span>
                        {item.name ?? '商品已失效'}{' '}
                        <span className="hint">{item.productId}</span>
                      </span>
                    </label>
                  </h3>
                  <p>
                    目前單價：
                    {item.unitPrice ? formatMoney(item.unitPrice) : '待確認'} ·
                    可售數量 {item.availability?.currentQuantity ?? '未知'}
                  </p>
                  {view.issues
                    .filter((i) => i.productId === item.productId)
                    .map((i) => (
                      <p className="cart-issue" key={i.code}>
                        {i.code}：請調整或移除此商品
                      </p>
                    ))}
                  <p>
                    車內已儲存數量：{item.quantity}；本次購買量：
                    {selection[item.productId]?.quantity ?? '未選取'}
                  </p>
                  {rowErrors[item.productId] && (
                    <p role="alert">{rowErrors[item.productId]}</p>
                  )}
                  {rows.includes(item.productId) && (
                    <p role="status">正在保存此商品…</p>
                  )}
                  <div className="cart-line-controls">
                    <label htmlFor={`qty-${item.productId}`}>
                      數量 {item.productId}
                    </label>
                    <Input
                      id={`qty-${item.productId}`}
                      type="number"
                      min="1"
                      step="1"
                      value={draft[item.productId] ?? ''}
                      disabled={busy || conflict}
                      onChange={(e) => change(item.productId, e.target.value)}
                      onBlur={() => {
                        if (draft[item.productId] !== String(item.quantity))
                          void perform({
                            type: 'set_quantity',
                            productId: item.productId,
                            quantity: Number(draft[item.productId]),
                          });
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          draft[item.productId] !== String(item.quantity)
                        ) {
                          e.preventDefault();
                          void perform({
                            type: 'set_quantity',
                            productId: item.productId,
                            quantity: Number(draft[item.productId]),
                          });
                        }
                      }}
                    />
                    {draft[item.productId] !== String(item.quantity) && (
                      <Button
                        variant="outline"
                        disabled={busy || conflict}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                          change(item.productId, String(item.quantity))
                        }
                      >
                        恢復已儲存數量 {item.productId}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      aria-label={`移除 ${item.productId}`}
                      onMouseDown={(event) => event.preventDefault()}
                      disabled={busy || conflict}
                      onClick={() =>
                        void perform({
                          type: 'remove_item',
                          productId: item.productId,
                        })
                      }
                    >
                      移除
                    </Button>
                  </div>
                </article>
              ))}
              {working && <p role="status">正在更新購物車…</p>}
              {dirty && !working && (
                <p role="status">數量會在離開欄位或按 Enter 後自動更新。</p>
              )}
            </section>
            <aside className="purchase-aside" aria-label="所選商品預估">
              <h2>所選商品預估</h2>
              <p>
                按所列數量建立訂單，完成後從購物車移除這些商品（包含車內額外數量）。
              </p>
              {Object.values(selection).map((item) => (
                <div key={item.productId}>
                  <p>
                    {item.productId} 本次購買量 {item.quantity}
                    {!view.items.some(
                      (line) => line.productId === item.productId,
                    ) && '（目前不在購物車，購買選擇仍保留）'}
                  </p>
                  {!view.items.some(
                    (line) => line.productId === item.productId,
                  ) && (
                    <>
                      <Input
                        aria-label={`本次購買量 ${item.productId}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) =>
                          change(item.productId, event.target.value)
                        }
                      />
                      <Button
                        onClick={() =>
                          setSelected(
                            selected.filter((id) => id !== item.productId),
                          )
                        }
                      >
                        取消購買 {item.productId}
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {quote ? (
                <>
                  <MoneyBreakdown quote={quote} />
                  {quote.issues?.map((issue) => (
                    <p role="status" key={issue.productId}>
                      {issue.productId} 庫存不足，請調整數量後再建立訂單。
                    </p>
                  ))}
                </>
              ) : (
                <p>
                  {quoteError ||
                    (quoteLoading
                      ? '正在更新所選商品預估。'
                      : '請勾選要購買的商品。')}
                </p>
              )}
              {quoteError && validPurchase && (
                <Button variant="outline" onClick={refreshQuote}>
                  重新查詢預估
                </Button>
              )}
              {unknownOrder && (
                <p role="status">
                  原購買仍可能成功。若只是確認或繼續原購買，請使用下方恢復操作；另建新訂單代表獨立的第二次購買。
                </p>
              )}
              <CommerceActions>
                <Button
                  disabled={
                    busy ||
                    working ||
                    conflict ||
                    !selected.length ||
                    !validPurchase ||
                    Boolean(quote?.issues?.length)
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void create()}
                >
                  {working
                    ? '正在建立…'
                    : unknownOrder
                      ? '另建新的待支付訂單'
                      : '建立待支付訂單'}
                </Button>
                {orderRequests.map((request) => (
                  <div role="status" key={request.requestId}>
                    <p>原購買 {request.requestId} 結果尚待確認。</p>
                    <p>
                      凍結清單：
                      {JSON.stringify(
                        (request.body as { selectedItems?: unknown })
                          ?.selectedItems ?? '歷史請求',
                      )}
                    </p>
                    <Button
                      disabled={busy || conflict}
                      onClick={() => void queryOrder(request)}
                    >
                      查詢結果
                    </Button>
                    {!request.legacy && (
                      <p>
                        繼續可能現在執行原購買，並移除目前購物車內同商品的整行數量。
                      </p>
                    )}
                    {!request.legacy && (
                      <Button
                        disabled={working || busy || conflict}
                        onClick={() => void create(request)}
                      >
                        繼續原購買
                      </Button>
                    )}
                  </div>
                ))}
                {createdId && (
                  <p role="status">
                    訂單已建立，請查看最新狀態。
                    <Link href={`/orders/${createdId}`} prefetch={false}>
                      查看新訂單
                    </Link>
                  </p>
                )}
              </CommerceActions>
            </aside>
          </div>
          <p>購物車與訂單會保留；取消或到期不會自動把商品放回車中。</p>
        </>
      )}
      <p>
        <Link href="/">繼續選購</Link>
      </p>
    </main>
  );
}
