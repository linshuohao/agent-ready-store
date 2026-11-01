'use client';
import { Link } from '../../runtime';
import { useCallback, useSyncExternalStore } from 'react';
import { useLifecycleOrders } from '../checkout/order-memory';
import { useRuntime } from '../../runtime';
import { cartIdInput } from '@store/contracts';
import { useCartOperations } from './provider';

export function SiteHeader() {
  const { currentCartId } = useCartOperations();
  const { location } = useRuntime();
  const [pathname, query = ''] = location.split('?');
  const path = pathname.split('/');
  const sharedOrder =
    path[1] === 'orders' &&
    Boolean(path[2]) &&
    new URLSearchParams(query).get('view') === 'share';
  const orders = useLifecycleOrders();
  const orderId =
    path[1] === 'orders' && path[2] && !sharedOrder ? path[2] : null;
  const subscribeOrder = useCallback(
    (listener: () => void) =>
      orderId ? orders.subscribe(orderId, listener) : () => {},
    [orders, orderId],
  );
  const orderCart = useSyncExternalStore(
    subscribeOrder,
    useCallback(
      () => (orderId ? (orders.snapshot(orderId).order?.cartId ?? null) : null),
      [orders, orderId],
    ),
    () => null,
  );
  const queryCart =
    path[1] === 'orders' && !path[2]
      ? new URLSearchParams(query).get('cartId')
      : null;
  const routeCart =
    path[1] === 'cart' && cartIdInput.safeParse(path[2]).success
      ? path[2]
      : null;
  const cartId = routeCart ?? currentCartId;
  const orderListCartId =
    orderCart ??
    (cartIdInput.safeParse(queryCart).success ? queryCart : cartId);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" href="/">
          AGENT / STORE
        </Link>
        <span className="site-tagline">為人與 AI 助理設計</span>
        {!sharedOrder && !['order-details', 'checkout'].includes(path[1]) && (
          <nav aria-label="購物導覽">
            <Link
              href={
                orderListCartId
                  ? `/orders?cartId=${orderListCartId}`
                  : '/orders'
              }
              prefetch={false}
            >
              訂單列表
            </Link>
            <Link
              className="site-cart-link"
              href={cartId ? `/cart/${cartId}` : '/cart'}
              prefetch={false}
            >
              購物車
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
