'use client';
import { Link } from '../../runtime';
import { cartIdInput } from '@store/contracts';
import { CartOrders } from '../cart/cart-orders';
import { useCartOperations } from '../cart/provider';
export function OrdersPage({ cartId }: { cartId?: string }) {
  const cart = useCartOperations();
  const id = cartId ?? cart.currentCartId;
  return (
    <main id="main" tabIndex={-1} className="commerce-page orders-page">
      <div className="commerce-page-heading">
        <p className="eyebrow">ORDERS</p>
        <h1>訂單列表</h1>
        <p>查看這次購物的待支付與歷史訂單，選擇一筆查看明細或繼續支付。</p>
      </div>
      {!cart.ready ? (
        <p role="status">正在讀取訂單…</p>
      ) : id && cartIdInput.safeParse(id).success ? (
        <CartOrders key={id} id={id} revision={cart.orderRevision} />
      ) : (
        <p>
          {id ? '購物車連結格式有誤。' : '尚無訂單，選購商品後即可建立訂單。'}
        </p>
      )}
      <p>
        <Link
          href={
            id && cartIdInput.safeParse(id).success ? `/cart/${id}` : '/cart'
          }
        >
          返回購物車
        </Link>
      </p>
    </main>
  );
}
