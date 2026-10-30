'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MoneyBreakdown } from '@/features/cart/money-breakdown';
import { CartOrders } from '@/features/cart/cart-orders';
import { useCartOperations } from '@/features/cart/provider';
import { useOrderPage } from './use-order-page';
export function OrderPage({
  id,
  share = false,
}: {
  id: string;
  share?: boolean;
}) {
  const page = useOrderPage(id),
    cart = useCartOperations();
  const { order } = page;
  if (page.missing)
    return (
      <main id="main" tabIndex={-1} className="commerce-page">
        <h1>找不到這筆訂單</h1>
        <p>
          請確認訂單連結，或請從購物車進入新的訂單流程。舊購物車編號不會轉換成新訂單。
        </p>
        <Button disabled={page.loading} onClick={() => void page.load()}>
          重新查詢訂單
        </Button>
        <Link href="/cart">前往購物車</Link>
      </main>
    );
  if (!order)
    return (
      <main id="main" tabIndex={-1} className="commerce-page">
        <h1>訂單</h1>
        <p role="status">{page.message || '正在讀取訂單…'}</p>
        <Button disabled={page.loading} onClick={() => void page.load()}>
          重新查詢訂單
        </Button>
      </main>
    );
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
    <main id="main" tabIndex={-1} className="commerce-page order-page">
      <div className="commerce-page-heading">
        <p className="eyebrow">{share ? 'SHARED ORDER' : 'ORDER'}</p>
        <h1 aria-live="polite">{title}</h1>
        <p className="order-reference">
          訂單編號：<span data-testid="order-id">{order.orderId}</span>
        </p>
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
          <p>這筆訂單已完成模擬支付，以下為固定成交內容。</p>
        ) : closed ? (
          <p>
            此單已關閉，無法支付；商品不會自動放回購物車。需要時請重新選購。
          </p>
        ) : (
          <>
            <p>
              商品與金額已固定，請核對後親自確認模擬支付。離開頁面不會取消訂單。
            </p>
            {page.expired || order.effectiveStatus === 'EXPIRED' ? (
              <p role="status">
                已停止新的支付操作，正在核實原單結果；期限已到不代表關閉已提交。
              </p>
            ) : (
              <p role="timer">
                剩餘支付時間：{Math.floor(seconds / 60)} 分 {seconds % 60} 秒
              </p>
            )}
          </>
        )}
      </div>
      {page.message && <p role="alert">{page.message}</p>}
      {page.unknown && !paid && !closed && (
        <p role="status">
          原操作結果待確認，請先查詢原單。重試只操作這筆訂單。
        </p>
      )}
      <section className="purchase-layout" aria-label="訂單固定摘要">
        <div className="purchase-products">
          <h2>商品明細</h2>
          <ul className="purchase-product-list">
            {order.summary.items.map((item) => (
              <li key={item.productId} className="purchase-product">
                <div className="purchase-product-heading">
                  <h3>{item.name}</h3>
                  <p className="purchase-product-meta">
                    {item.productId} · {item.brand} · {item.quantity} 件
                  </p>
                </div>
                <dl>
                  {Object.entries(item.specs).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </div>
        <aside className="purchase-aside" aria-label="訂單金額與操作">
          <MoneyBreakdown
            quote={order.summary}
            mode={paid ? 'completed' : 'confirmation'}
          />
          <div className="commerce-actions">
            {!paid &&
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
                      ? '重試原單模擬支付'
                      : '確認模擬支付'}
                </Button>
              )}
            {!share &&
              !paid &&
              !closed &&
              (!page.pendingAction || page.pendingAction === 'cancel') &&
              order.allowedActions.canCancel && (
                <Button
                  disabled={
                    page.busy || page.loading || page.expired || page.conflict
                  }
                  onClick={() => void page.act('cancel')}
                >
                  {page.pendingAction === 'cancel'
                    ? '重試原單取消'
                    : '取消這筆訂單'}
                </Button>
              )}
            <Button disabled={page.loading} onClick={() => void page.load()}>
              重新查詢訂單
            </Button>
            {!share && sameCart && (
              <Link
                className="commerce-action-secondary"
                href={`/cart/${order.cartId}`}
                prefetch={false}
              >
                繼續購物
              </Link>
            )}
            {!share && !sameCart && <Link href="/cart">返回目前購物車</Link>}
          </div>
        </aside>
      </section>
      {!share && sameCart && (
        <CartOrders
          key={order.cartId}
          id={order.cartId}
          revision={paid || closed ? 1 : 0}
        />
      )}
      <p className="hint">
        Demo 僅模擬支付，不會產生真實扣款。訂單 ID
        用於定位資料，不代表身分驗證或存取隔離。
      </p>
    </main>
  );
}
