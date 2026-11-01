'use client';
import { useRuntime } from '../../runtime';
import { Share2 } from 'lucide-react';

import { CommerceActions } from '../../index';
import { PageTools } from '../../runtime';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from '../../runtime';
import { Button } from '../../components/ui/button';
import { MoneyBreakdown } from '../cart/money-breakdown';
import { CartFeedback } from '../cart/feedback';
import { useCartOperations } from '../cart/provider';
import { useOrderPage } from './use-order-page';
import { OrderProduct } from './order-product';
import {
  CompactNavigation,
  ItemPagination,
  type PurchaseView,
} from '../cart/compact-navigation';
import { PurchaseAside } from '../cart/purchase-aside';
export function OrderPage({
  id,
  share = false,
  created = false,
}: {
  id: string;
  share?: boolean;
  created?: boolean;
}) {
  const runtime = useRuntime();
  const embedded = runtime.surface === 'embedded';
  const [tab, setTab] = useState<PurchaseView>('overview');
  const [itemPage, setItemPage] = useState(0);
  const [shareError, setShareError] = useState('');
  const page = useOrderPage(id),
    cart = useCartOperations();
  const { order } = page;
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const dismissFeedback = useCallback(() => setFeedback(''), []);
  const result =
    order?.status === 'PAID'
      ? '支付成功'
      : order?.closedAt
        ? order.closeReason === 'CANCELLED'
          ? '訂單已取消'
          : '訂單已超時'
        : null;
  useEffect(() => {
    if (!order) return;
    const state = result ?? 'CHECKOUT';
    const changed = previous.current !== null && previous.current !== state;
    const justCreated =
      previous.current === null && created && state === 'CHECKOUT';
    previous.current = state;
    if (!changed && !justCreated) return;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    queueMicrotask(() =>
      setFeedback(result ?? '訂單已建立，請核對後確認支付。'),
    );
    if (created)
      router.replace(`/orders/${id}${share ? '?view=share' : ''}`, {
        scroll: false,
      });
  }, [order, result, created, router, id, share]);
  const [confirmation, setConfirmation] = useState<{
    currentId: string | null;
  } | null>(null);
  const [resumeError, setResumeError] = useState('');
  const { ready, currentCartId, selectCart } = cart;
  const sourceCart = order?.cartId;
  useEffect(() => {
    if (!share && ready && !currentCartId && sourceCart) selectCart(sourceCart);
  }, [share, ready, currentCartId, sourceCart, selectCart]);
  if (page.missing)
    return (
      <main id="main" tabIndex={-1} className="commerce-page">
        <h1>找不到這筆訂單</h1>
        <p>
          請確認訂單連結，或請從購物車進入新的訂單流程。舊購物車編號不會轉換成新訂單。
        </p>
        <CommerceActions>
          <Button disabled={page.loading} onClick={() => void page.load()}>
            重新查詢訂單
          </Button>
        </CommerceActions>
      </main>
    );
  if (!order)
    return (
      <main id="main" tabIndex={-1} className="commerce-page">
        <h1>訂單</h1>
        <p role="status">{page.message || '正在讀取訂單…'}</p>
        <CommerceActions>
          <Button disabled={page.loading} onClick={() => void page.load()}>
            重新查詢訂單
          </Button>
        </CommerceActions>
      </main>
    );
  const pages = Math.ceil(order.summary.items.length / 4);
  const safePage = Math.min(itemPage, Math.max(0, pages - 1));
  const visibleItems = !embedded
    ? order.summary.items
    : tab === 'overview'
      ? order.summary.items.slice(0, 2)
      : tab === 'items'
        ? order.summary.items.slice(safePage * 4, safePage * 4 + 4)
        : [];
  const paid = order.status === 'PAID',
    closed = order.closedAt !== null;
  const title = paid
    ? '支付成功'
    : closed
      ? order.closeReason === 'CANCELLED'
        ? '訂單已取消'
        : '訂單已超時'
      : page.expired || order.effectiveStatus === 'EXPIRED'
        ? '支付期限已到'
        : '待支付訂單';
  const sameCart = cart.ready && cart.currentCartId === order.cartId;
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(order.reservationExpiresAt) - page.now) / 1000),
  );
  return (
    <main
      id="main"
      tabIndex={-1}
      className="commerce-page order-page"
      data-compact={embedded || undefined}
    >
      {feedback && (
        <CartFeedback
          key={feedback}
          label="訂單操作狀態"
          dismissLabel="關閉訂單提示"
          success
          onDismiss={dismissFeedback}
        >
          <p role="status">{feedback}</p>
        </CartFeedback>
      )}
      <section
        className="purchase-layout purchase-page-layout"
        aria-label="訂單固定摘要"
      >
        <div className="purchase-main">
          <div className="commerce-page-heading">
            <p className="eyebrow">{share ? 'SHARED ORDER' : 'ORDER'}</p>
            {!share && <PageTools orderId={id} />}
            <h1 ref={heading} tabIndex={-1} aria-live="polite">
              {title}
            </h1>
            <div className="order-reference-row">
              <p className="order-reference">
                訂單編號：<span data-testid="order-id">{order.orderId}</span>
              </p>
              {!share && (
                <Button
                  variant="outline"
                  className="order-share-button"
                  aria-label="分享這筆訂單"
                  onClick={() => {
                    setShareError('');
                    void runtime
                      .share(order.navigation.shareUrl, order.orderId)
                      .catch(() =>
                        setShareError('無法開啟分享入口，原訂單已保留。'),
                      );
                  }}
                >
                  <Share2 aria-hidden="true" />
                  分享
                </Button>
              )}
            </div>
            {shareError && <p role="alert">{shareError}</p>}
            <p>
              來源：
              {order.createdByChannel === 'WEB'
                ? '自行選購'
                : `AI 購物 · ${order.createdByChannel}`}{' '}
              · {order.aiEligible ? '含本單 AI 優惠' : '一般訂單'}
            </p>
            <p>
              預留截止：
              <time dateTime={order.reservationExpiresAt}>
                {new Date(order.reservationExpiresAt).toLocaleString('zh-TW')}
              </time>
            </p>
            {paid ? (
              <p>這筆訂單已完成支付，以下為固定成交內容。</p>
            ) : closed ? (
              <p>
                此單已關閉，無法支付；商品不會自動放回購物車。需要時請重新選購。
              </p>
            ) : (
              <>
                <p>
                  商品與金額已固定，請核對後親自確認支付。離開頁面不會取消訂單。
                </p>
                {page.expired || order.effectiveStatus === 'EXPIRED' ? (
                  <p role="status">
                    已停止新的支付操作，正在核實原單結果；期限已到不代表關閉已提交。
                  </p>
                ) : (
                  <div className="order-deadline-actions">
                    <p role="timer">
                      剩餘支付時間：{Math.floor(seconds / 60)} 分 {seconds % 60}{' '}
                      秒
                    </p>{' '}
                    {!share &&
                      !paid &&
                      !closed &&
                      (!page.pendingAction ||
                        page.pendingAction === 'cancel') &&
                      order.allowedActions.canCancel && (
                        <Button
                          variant="outline"
                          disabled={
                            page.busy ||
                            page.loading ||
                            page.expired ||
                            page.conflict
                          }
                          onClick={() => void page.act('cancel')}
                        >
                          {page.pendingAction === 'cancel'
                            ? '重試原單取消'
                            : '取消這筆訂單'}
                        </Button>
                      )}
                  </div>
                )}
              </>
            )}
          </div>
          {embedded && (
            <CompactNavigation
              value={tab}
              onChange={setTab}
              count={order.summary.items.length}
              disabled={page.busy || page.loading}
            />
          )}
          {page.message && <p role="alert">{page.message}</p>}
          {page.unknown && !paid && !closed && (
            <p role="status">
              原操作結果待確認，請先查詢原單。重試只操作這筆訂單。
            </p>
          )}
          <div
            className="purchase-products"
            hidden={embedded && tab === 'fees'}
          >
            <h2>商品明細</h2>
            <ul className="purchase-product-list">
              {visibleItems.map((item) => (
                <li key={item.productId} className="purchase-product">
                  <OrderProduct
                    item={item}
                    compact={embedded}
                    expandableDetails={embedded && tab === 'items'}
                  />
                </li>
              ))}
            </ul>
            {embedded &&
              tab === 'overview' &&
              order.summary.items.length > 2 && (
                <Button variant="outline" onClick={() => setTab('items')}>
                  查看全部 {order.summary.items.length} 項商品
                </Button>
              )}
            {embedded && tab === 'items' && (
              <ItemPagination
                page={safePage}
                pages={pages}
                onChange={setItemPage}
              />
            )}
          </div>

          {!share && confirmation && (
            <section
              aria-label="接續確認"
              aria-labelledby="resume-heading"
              className="notice"
            >
              <h2 id="resume-heading">接續訂單的購物車？</h2>
              <p>
                將接續這筆訂單的來源購物車。目前的購物車資料會保留，不會合併或刪除。
              </p>
              <CommerceActions>
                <Button
                  onClick={() => {
                    if (cart.resumeCart(order.cartId, confirmation.currentId)) {
                      setConfirmation(null);
                      router.push(`/cart/${order.cartId}`);
                    } else
                      setResumeError(
                        '目前購物車或操作已改變，請先完成原操作後再確認。',
                      );
                  }}
                >
                  確認接續原購物車
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmation(null);
                    setResumeError('');
                  }}
                >
                  保留目前購物車
                </Button>
              </CommerceActions>
              {resumeError && <p role="alert">{resumeError}</p>}
            </section>
          )}
          <div className="purchase-secondary-actions">
            <CommerceActions>
              {(page.message ||
                page.unknown ||
                page.conflict ||
                (!paid && !closed && page.expired)) && (
                <Button
                  disabled={page.loading}
                  onClick={() => void page.load()}
                >
                  重新查詢訂單
                </Button>
              )}
              {!share && !sameCart && (
                <>
                  <Button
                    disabled={!cart.ready || cart.busy}
                    onClick={() =>
                      setConfirmation({ currentId: cart.currentCartId })
                    }
                  >
                    接續這次購物
                  </Button>
                </>
              )}
            </CommerceActions>
          </div>
          <p className="hint">
            Demo 僅模擬支付，不會產生真實扣款。訂單 ID
            用於定位資料，不代表身分驗證或存取隔離。
          </p>
        </div>
        <PurchaseAside
          label="訂單金額與操作"
          total={order.summary.total}
          totalLabel={paid ? '實付金額' : closed ? '訂單金額' : '應付金額'}
          primaryAction={
            !paid &&
            !closed &&
            (!page.pendingAction || page.pendingAction === 'pay') &&
            order.allowedActions.canPay && (
              <Button
                disabled={
                  page.busy || page.loading || page.expired || page.conflict
                }
                onClick={() => void page.act('pay')}
              >
                {page.busy
                  ? '正在處理…'
                  : page.unknown
                    ? '重試原單支付'
                    : '確認支付'}
              </Button>
            )
          }
        >
          {(!embedded || tab === 'fees') && (
            <MoneyBreakdown
              presentation={embedded ? 'inline' : 'dialog'}
              quote={order.summary}
              mode={paid ? 'completed' : 'confirmation'}
            />
          )}
          {embedded && tab !== 'fees' && (
            <p className="compact-count">
              共 {order.summary.items.length} 項商品 · 商品與金額已固定
            </p>
          )}
        </PurchaseAside>
      </section>
    </main>
  );
}
