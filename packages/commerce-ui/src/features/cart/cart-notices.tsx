'use client';
import { Link } from '../../runtime';
import { Button } from '../../components/ui/button';
import { CartFeedback } from './feedback';
import type { RecoveryRequest } from './lifecycle-commands';
export function CartNotices({
  orderPage,
  message,
  currentCartId,
  requests,
  dismiss,
  retry,
  query,
}: {
  orderPage: boolean;
  message: string;
  currentCartId: string | null;
  requests: RecoveryRequest[];
  dismiss: () => void;
  retry: (requestId: string) => void;
  query: (requestId: string) => void;
}) {
  return (
    <>
      {!orderPage && message && (
        <CartFeedback success={message === '已加入購物車'} onDismiss={dismiss}>
          <p role="status">{message}</p>
          {currentCartId && (
            <Link href={`/cart/${currentCartId}`} prefetch={false}>
              前往購物車
            </Link>
          )}
        </CartFeedback>
      )}
      {!orderPage &&
        requests.map((request) => (
          <section
            key={request.requestId}
            className="notice"
            aria-label="購物車恢復"
          >
            <p>操作 {request.requestId} 結果未確認。</p>
            <Button onClick={() => query(request.requestId)}>查詢結果</Button>
            {!request.legacy && (
              <Button onClick={() => retry(request.requestId)}>
                繼續原購物車操作
              </Button>
            )}
            {request.legacy && <p>舊請求僅可查詢，不會重新執行。</p>}
          </section>
        ))}
    </>
  );
}
