'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cartIdInput } from '@store/contracts';
import { useCartOperations } from './provider';

export function SiteHeader() {
  const { currentCartId } = useCartOperations();
  const path = usePathname().split('/');
  const routeCart =
    ['cart', 'checkout', 'orders'].includes(path[1]) &&
    cartIdInput.safeParse(path[2]).success
      ? path[2]
      : null;
  const cartId = routeCart ?? currentCartId;
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" href="/">
          AGENT / STORE
        </Link>
        <span className="site-tagline">為人與 AI 助理設計</span>
        {path[1] !== 'order-details' && (
          <nav aria-label="購物導覽">
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
