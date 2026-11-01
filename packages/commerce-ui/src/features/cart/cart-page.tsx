'use client';

import { CommerceActions, illustration } from '../../index';
import { Artwork } from '../../runtime';
import { Link } from '../../runtime';
import { PageTools } from '../../runtime';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MoneyBreakdown } from './money-breakdown';
import { formatMoney } from '../../lib/money';
import { Checkbox } from '../../components/ui/checkbox';
import { useCartPage } from './use-cart-page';
import { PurchaseAside } from './purchase-aside';
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
      <div className="purchase-layout purchase-page-layout">
        <div className="purchase-main">
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
              <Link href={`/cart/${operations.currentCartId}`}>
                返回目前購物車
              </Link>
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
              <section className="purchase-products" aria-label="編輯購物車">
                <h2>商品明細</h2>
                {!!view.items.length && (
                  <label className="cart-selection cart-select-all">
                    <Checkbox
                      indeterminate={
                        selected.length > 0 &&
                        selected.length < view.items.length
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
                    <div className="cart-line-heading">
                      <label className="cart-selection">
                        <Checkbox
                          aria-label={`選取 ${item.productId}`}
                          checked={selected.includes(item.productId)}
                          disabled={busy || dirty || reload || conflict}
                          onCheckedChange={(checked) =>
                            setSelected(
                              checked
                                ? [...selected, item.productId]
                                : selected.filter(
                                    (id) => id !== item.productId,
                                  ),
                            )
                          }
                        />
                        <span className="sr-only">
                          選取 {item.name ?? item.productId}
                        </span>
                      </label>
                      <div className="commerce-product-art cart-line-art">
                        <Artwork
                          kind={illustration(item.productId)}
                          alt="商品示意，非實物照片"
                          width={96}
                          height={96}
                        />
                      </div>
                      <div className="cart-line-info">
                        <p className="cart-line-id">{item.productId}</p>
                        <h3>{item.name ?? '商品已失效'}</h3>
                        <p className="cart-line-price">
                          {item.unitPrice
                            ? `單價 ${formatMoney(item.unitPrice)}`
                            : '單價待確認'}
                          <span> × {item.quantity} 件</span>
                        </p>
                        <p className="cart-line-stock">
                          可售數量{' '}
                          {item.availability?.currentQuantity ?? '未知'}
                        </p>
                      </div>
                    </div>
                    {view.issues
                      .filter((i) => i.productId === item.productId)
                      .map((i) => (
                        <p className="cart-issue" key={i.code}>
                          {i.code}：請調整或移除此商品
                        </p>
                      ))}
                    <div className="cart-line-controls">
                      <label htmlFor={`qty-${item.productId}`}>
                        數量<span className="sr-only"> {item.productId}</span>
                      </label>
                      <div
                        className="cart-quantity-control"
                        role="group"
                        aria-label={`調整 ${item.productId} 數量`}
                      >
                        <Button
                          variant="ghost"
                          aria-label={`減少 ${item.productId} 數量`}
                          disabled={
                            busy ||
                            dirty ||
                            reload ||
                            conflict ||
                            item.quantity <= 1
                          }
                          onClick={() =>
                            void perform({
                              type: 'set_quantity',
                              productId: item.productId,
                              quantity: item.quantity - 1,
                            })
                          }
                        >
                          −
                        </Button>
                        <Input
                          id={`qty-${item.productId}`}
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          aria-label={`數量 ${item.productId}`}
                          value={draft[item.productId] ?? ''}
                          disabled={
                            busy ||
                            reload ||
                            conflict ||
                            Boolean(
                              dirtyProduct && dirtyProduct !== item.productId,
                            )
                          }
                          onChange={(e) =>
                            change(item.productId, e.target.value)
                          }
                          onBlur={() => {
                            if (draft[item.productId] !== String(item.quantity))
                              void perform({
                                type: 'set_quantity',
                                productId: item.productId,
                                quantity: Number(draft[item.productId]),
                              });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              change(item.productId, String(item.quantity));
                            }
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
                        <Button
                          variant="ghost"
                          aria-label={`增加 ${item.productId} 數量`}
                          disabled={
                            busy ||
                            dirty ||
                            reload ||
                            conflict ||
                            !item.availability?.canPurchase ||
                            item.quantity >=
                              (item.availability.currentQuantity ?? 0)
                          }
                          onClick={() =>
                            void perform({
                              type: 'set_quantity',
                              productId: item.productId,
                              quantity: item.quantity + 1,
                            })
                          }
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        className="cart-line-remove"
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
                  <p role="status">
                    數量會在離開欄位或按 Enter 後自動更新，按 Esc 撤銷輸入。
                  </p>
                )}
              </section>

              <p>購物車與訂單會保留；取消或到期不會自動把商品放回車中。</p>
            </>
          )}
          <p>
            <Link href="/">繼續選購</Link>
          </p>
        </div>
        {view && (
          <PurchaseAside label="所選商品預估">
            <h2>所選商品預估</h2>
            {quote && !dirty && !reload ? (
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
                {selected.length
                  ? error
                    ? '目前無法提供所選商品預估。'
                    : '正在更新所選商品預估。'
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
                  Boolean(quote?.issues?.length) ||
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
                  訂單已建立，請查看最新狀態。
                  <Link href={`/orders/${createdId}`} prefetch={false}>
                    查看新訂單
                  </Link>
                </p>
              )}
            </CommerceActions>
          </PurchaseAside>
        )}
      </div>
    </main>
  );
}
