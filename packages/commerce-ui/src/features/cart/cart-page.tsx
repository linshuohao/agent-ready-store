'use client';

import { CommerceActions, illustration } from '../../index';
import { Artwork, useRuntime } from '../../runtime';
import { useState } from 'react';
import {
  CompactNavigation,
  ItemPagination,
  type PurchaseView,
} from './compact-navigation';
import { Link } from '../../runtime';
import { PageTools } from '../../runtime';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MoneyBreakdown } from './money-breakdown';
import { formatMoney, multiplyMoney } from '../../lib/money';
import { Checkbox } from '../../components/ui/checkbox';
import { useCartPage } from './use-cart-page';
import { PurchaseAside } from './purchase-aside';
export function CartPage({ id }: { id?: string }) {
  const embedded = useRuntime().surface === 'embedded';
  const [tab, setTab] = useState<PurchaseView>('overview');
  const [itemPage, setItemPage] = useState(0);
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
    selection,
    rowErrors,
    rows,
    orderRequests,
    queryOrder,
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
  const pages = Math.ceil((view?.items.length ?? 0) / 4);
  const safePage = Math.min(itemPage, Math.max(0, pages - 1));
  const visibleItems = !embedded
    ? view?.items
    : tab === 'overview'
      ? view?.items.slice(0, 2)
      : tab === 'items'
        ? view?.items.slice(safePage * 4, safePage * 4 + 4)
        : [];
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
    <main
      id="main"
      tabIndex={-1}
      className="commerce-page cart-page"
      data-compact={embedded || undefined}
    >
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
          {embedded && view && (
            <CompactNavigation
              value={tab}
              onChange={setTab}
              count={view.items.length}
              disabled={Boolean(busy || dirty || reload)}
            />
          )}
          {embedded && view && (
            <p className="compact-count">
              共 {view.items.length} 項 · 已選 {selected.length} 項
              {view.issues.length > 0
                ? ` · ${view.issues.length} 項問題，請在商品明細確認`
                : ''}
            </p>
          )}
          {loading && <p role="status">正在讀取購物車…</p>}
          {error && <p role="alert">{error}</p>}
          {conflict && (
            <p role="alert">
              這不是目前購物車，未更換購物上下文。
              <Link href={`/cart/${operations.currentCartId}`} prefetch={false}>
                返回目前購物車
              </Link>
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
              <section
                className="purchase-products"
                aria-label="編輯購物車"
                hidden={embedded && tab === 'fees'}
              >
                <h2>商品明細</h2>
                {!!view.items.length && (
                  <label
                    className="cart-selection cart-select-all"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <Checkbox
                      indeterminate={
                        selected.length > 0 &&
                        selected.length < view.items.length
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
                {visibleItems?.map((item) => (
                  <article
                    key={item.productId}
                    className="purchase-product cart-line"
                  >
                    <div className="cart-line-heading">
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
                          <span>
                            {' '}
                            ×{' '}
                            {Number(
                              selection[item.productId]?.quantity ??
                                item.quantity,
                            )}{' '}
                            件
                          </span>
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
                    {selection[item.productId] &&
                      !rows.includes(item.productId) &&
                      Number(selection[item.productId].quantity) !==
                        item.quantity && (
                        <p className="cart-issue">
                          本次 {selection[item.productId].quantity} 件 ·
                          車內已儲存 {item.quantity} 件
                        </p>
                      )}
                    {rowErrors[item.productId] && (
                      <p role="alert" className="cart-issue">
                        {rowErrors[item.productId]}
                      </p>
                    )}
                    <p className="cart-line-subtotal">
                      小計{' '}
                      <strong>
                        {item.unitPrice &&
                        Number.isSafeInteger(
                          Number(
                            selection[item.productId]?.quantity ??
                              draft[item.productId] ??
                              item.quantity,
                          ),
                        ) &&
                        Number(
                          selection[item.productId]?.quantity ??
                            draft[item.productId] ??
                            item.quantity,
                        ) > 0
                          ? formatMoney(
                              multiplyMoney(
                                item.unitPrice,
                                Number(
                                  selection[item.productId]?.quantity ??
                                    draft[item.productId] ??
                                    item.quantity,
                                ),
                              ),
                            )
                          : '待確認'}
                      </strong>
                    </p>
                    {(!embedded || tab === 'items') && (
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
                              conflict ||
                              rows.includes(item.productId) ||
                              !Number.isSafeInteger(
                                Number(draft[item.productId]),
                              ) ||
                              Number(draft[item.productId]) <= 1
                            }
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              const quantity =
                                Number(draft[item.productId]) - 1;
                              change(item.productId, String(quantity));
                              void perform({
                                type: 'set_quantity',
                                productId: item.productId,
                                quantity,
                              });
                            }}
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
                            disabled={busy || conflict}
                            onChange={(e) =>
                              change(item.productId, e.target.value)
                            }
                            onBlur={() => {
                              if (
                                draft[item.productId] !== String(item.quantity)
                              )
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
                              conflict ||
                              rows.includes(item.productId) ||
                              !Number.isSafeInteger(
                                Number(draft[item.productId]),
                              ) ||
                              Number(draft[item.productId]) < 1 ||
                              !item.availability?.canPurchase ||
                              Number(draft[item.productId]) >=
                                (item.availability.currentQuantity ?? 0)
                            }
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              const quantity =
                                Number(draft[item.productId]) + 1;
                              change(item.productId, String(quantity));
                              void perform({
                                type: 'set_quantity',
                                productId: item.productId,
                                quantity,
                              });
                            }}
                          >
                            +
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          className="cart-line-remove"
                          onMouseDown={(event) => event.preventDefault()}
                          aria-label={`移除 ${item.productId}`}
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
                    )}
                  </article>
                ))}
                {embedded && tab === 'overview' && view.items.length > 2 && (
                  <Button
                    variant="outline"
                    onClick={() => setTab('items')}
                    disabled={Boolean(busy || dirty || reload)}
                  >
                    查看全部 {view.items.length} 項商品
                  </Button>
                )}
                {embedded && tab === 'items' && (
                  <ItemPagination
                    page={safePage}
                    pages={pages}
                    onChange={setItemPage}
                    disabled={Boolean(busy || dirty || reload)}
                  />
                )}
                <p className="hint">
                  數量會在離開欄位或按 Enter 後自動更新，按 Esc 撤銷輸入。
                </p>
              </section>

              {!embedded && (
                <p>購物車與訂單會保留；取消或到期不會自動把商品放回車中。</p>
              )}
            </>
          )}
          <p>
            <Link href="/">繼續選購</Link>
          </p>
          <div className="purchase-secondary-actions">
            <CommerceActions>
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
                    <>
                      <p>
                        繼續可能現在執行原購買，並移除目前購物車內同商品的整行數量。
                      </p>
                      <Button
                        disabled={working || busy || conflict}
                        onClick={() => void create(request)}
                      >
                        繼續原購買
                      </Button>
                    </>
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
          </div>
        </div>
        {view && (
          <PurchaseAside
            label="所選商品預估"
            total={quote ? quote.total : null}
            primaryAction={
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
                    : '去結算'}
              </Button>
            }
          >
            <h2>所選商品預估</h2>
            <span className="sr-only">
              {Object.values(selection)
                .map((item) => `${item.productId} 本次購買量 ${item.quantity}`)
                .join('；')}
            </span>
            <p className="hint">
              按所列數量建立訂單；完成後會移除車內同商品的整行數量，包含額外數量。
            </p>
            {Object.values(selection)
              .filter(
                (item) =>
                  !view.items.some((line) => line.productId === item.productId),
              )
              .map((item) => (
                <div className="notice" key={item.productId}>
                  <p>{item.productId} 目前不在購物車，購買選擇仍保留。</p>
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
                </div>
              ))}
            {unknownOrder && (
              <p role="status">
                原購買仍可能成功。若只是確認或繼續原購買，請使用原購買恢復操作；另建新訂單代表獨立的第二次購買。
              </p>
            )}
            {quote ? (
              <>
                {!embedded || tab === 'fees' ? (
                  <MoneyBreakdown
                    quote={quote}
                    updating={quoteLoading}
                    presentation={embedded ? 'inline' : 'dialog'}
                  />
                ) : (
                  <p className="compact-count">
                    已選 {selected.length} 項 · 金額以本次購買量計算
                  </p>
                )}
                {embedded && Boolean(quote.issues?.length) && (
                  <p role="status">
                    所選商品有 {quote.issues?.length}{' '}
                    項庫存不足，請在商品明細調整數量。
                  </p>
                )}
                {!embedded &&
                  quote.issues?.map((issue) => (
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
          </PurchaseAside>
        )}
      </div>
    </main>
  );
}
