'use client';
import { Link } from '../../runtime';
import { CommerceActions } from '../../index';
import { Button } from '../../components/ui/button';
import { CartFeedback } from './feedback';

// Presentation only; operation and recovery state remain owned by CartProvider.
export function CartNotices({
  orderPage,
  message,
  currentCartId,
  pending,
  busy,
  dismiss,
  retry,
}: {
  orderPage: boolean;
  message: string;
  currentCartId: string | null;
  pending: boolean;
  busy: boolean;
  dismiss: () => void;
  retry: () => void;
}) {
  return (
    <>
      {!orderPage && message && (
        <CartFeedback success={message === '已儲存購物車'} onDismiss={dismiss}>
          <p role="status">{message}</p>
          {currentCartId && (
            <Link href={`/cart/${currentCartId}`} prefetch={false}>
              前往購物車
            </Link>
          )}
        </CartFeedback>
      )}
      {!orderPage && pending && (
        <section className="notice" aria-label="購物車恢復">
          <p>上次購物車操作結果未確認，請使用原請求恢復。</p>
          <CommerceActions>
            <Button disabled={busy} onClick={retry}>
              重試原購物車請求
            </Button>
          </CommerceActions>
        </section>
      )}
    </>
  );
}
