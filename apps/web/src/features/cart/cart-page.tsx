'use client';

import { CommerceActions } from '@store/commerce-ui';
import Link from 'next/link';
import { PageTools } from '@/features/webmcp/page-tools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyBreakdown } from './money-breakdown';
import { formatMoney } from '@/lib/money';
import { Checkbox } from '@/components/ui/checkbox';
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
    error,
    loading,
    reload,
    working,
    unknownOrder,
    createdId,
    change,
    perform,
    create,
    load,
  } = page;
  const dirtyProduct = view?.items.find(
    (item) => draft[item.productId] !== String(item.quantity),
  )?.productId;
  const busy =
    working || operations.busy || operations.pending || !operations.ready;
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
            {reload ? '重新載入購物車（放棄未儲存修改）' : '重新讀取'}
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
                <label className="cart-selection cart-select-all">
                  <Checkbox
                    indeterminate={
                      selected.length > 0 && selected.length < view.items.length
                    }
                    aria-label="全選商品"
                    checked={selected.length === view.items.length}
                    disabled={busy || dirty || reload || conflict}
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
                    <label className="cart-selection">
                      <Checkbox
                        aria-label={`選取 ${item.productId}`}
                        checked={selected.includes(item.productId)}
                        disabled={busy || dirty || reload || conflict}
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
                      disabled={
                        busy ||
                        reload ||
                        conflict ||
                        Boolean(dirtyProduct && dirtyProduct !== item.productId)
                      }
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
                        disabled={busy || reload || conflict}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                          change(item.productId, String(item.quantity))
                        }
                      >
                        還原數量 {item.productId}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      aria-label={`移除 ${item.productId}`}
                      disabled={busy || dirty || reload || conflict}
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
              {quote && !dirty && !reload ? (
                <MoneyBreakdown quote={quote} />
              ) : (
                <p>
                  {selected.length
                    ? '正在更新所選商品預估。'
                    : '請勾選要購買的整行商品。'}
                </p>
              )}
              <CommerceActions>
                <Button
                  disabled={
                    busy ||
                    dirty ||
                    reload ||
                    conflict ||
                    !selected.length ||
                    unknownOrder
                  }
                  onClick={() => void create()}
                >
                  {working ? '正在建立…' : '建立待支付訂單'}
                </Button>
                {unknownOrder && (
                  <div role="status">
                    <p>原建立結果尚待確認。</p>
                    <Button
                      disabled={busy || conflict}
                      onClick={() => void create(true)}
                    >
                      恢復原建立訂單請求
                    </Button>
                  </div>
                )}
                {createdId && (
                  <p role="status">
                    訂單已建立，尚未支付。
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
