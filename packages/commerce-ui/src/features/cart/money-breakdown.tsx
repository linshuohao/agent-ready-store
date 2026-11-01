'use client';
import type { Quote } from '@store/contracts';
import { useId, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { ItemPagination } from './compact-navigation';
import { formatMoney } from '../../lib/money';
export function MoneyBreakdown({
  quote,
  mode = 'estimate',
  updating = false,
  presentation = 'dialog',
}: {
  quote: Quote;
  updating?: boolean;
  presentation?: 'dialog' | 'inline';
  mode?: 'estimate' | 'confirmation' | 'completed';
}) {
  const [itemPage, setItemPage] = useState(0);
  const pages = Math.ceil(quote.items.length / 4);
  const safePage = Math.min(itemPage, Math.max(0, pages - 1));
  const feeItems = (items: Quote['items']) => (
    <ul className="fee-items" aria-label="商品費用明細">
      {items.map((item) => (
        <li key={item.productId}>
          <span className="fee-item-name">
            {item.name}
            <span className="sr-only">，{item.productId}</span>
            <span className="fee-item-quantity"> × {item.quantity} 件</span>
          </span>
          <strong>{formatMoney(item.lineSubtotal)}</strong>
        </li>
      ))}
    </ul>
  );
  const headingId = useId();
  const dialogTitleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);
  return (
    <section className="cart-totals commerce-card" aria-labelledby={headingId}>
      <h2 id={headingId}>
        {mode === 'completed'
          ? '成交金額'
          : mode === 'confirmation'
            ? '本次確認金額'
            : '目前已儲存報價'}
      </h2>
      {mode === 'estimate' && (
        <p className="hint">未儲存的調整尚未計入報價；庫存與價格仍可能變動。</p>
      )}
      <p className="fee-count">共 {quote.items.length} 項商品</p>
      {presentation === 'inline' ? (
        <>
          {feeItems(quote.items.slice(safePage * 4, safePage * 4 + 4))}
          <ItemPagination
            page={safePage}
            pages={pages}
            onChange={setItemPage}
          />
        </>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            dialog.current?.showModal();
            setOpen(true);
          }}
        >
          查看商品費用明細
        </Button>
      )}
      <AmountRows
        quote={quote}
        completed={mode === 'completed'}
        updating={updating}
      />
      {presentation === 'dialog' && (
        <dialog
          ref={dialog}
          className="fee-dialog"
          aria-labelledby={dialogTitleId}
          onClose={() => setOpen(false)}
          onKeyDown={(event) => {
            // The close button is the dialog's only interactive control.
            if (event.key === 'Tab') {
              event.preventDefault();
              dialog.current
                ?.querySelector<HTMLButtonElement>('button')
                ?.focus();
            }
          }}
        >
          <div className="fee-dialog-heading">
            <h2 id={dialogTitleId}>商品費用明細</h2>
            <Button variant="outline" onClick={() => dialog.current?.close()}>
              關閉明細
            </Button>
          </div>
          {feeItems(quote.items)}
          <AmountRows
            quote={quote}
            completed={mode === 'completed'}
            updating={updating}
          />
        </dialog>
      )}
    </section>
  );
}

// Shared by the compact summary and full receipt; values remain server-owned.
function AmountRows({
  quote,
  completed,
  updating,
}: {
  quote: Quote;
  completed: boolean;
  updating: boolean;
}) {
  const rows = [
    ['商品合計', quote.subtotal, 'base'],
    ['全站滿減', quote.thresholdDiscount, 'discount'],
    ['AI 優惠', quote.aiDiscount, 'discount'],
    ['運費', quote.shipping, 'shipping'],
    [completed ? '實付金額' : '應付金額', quote.total, 'final'],
  ] as const;
  return (
    <dl aria-busy={updating}>
      {rows.map(([label, amount, kind]) => {
        const zero = amount === '0.00';
        const display =
          kind === 'shipping' && zero
            ? '免運'
            : `${kind === 'discount' && !zero ? '− ' : kind === 'shipping' ? '＋ ' : ''}${formatMoney(amount)}`;
        return (
          <div
            key={label}
            className={`amount-row amount-row-${kind}${kind === 'discount' && zero ? ' amount-row-zero' : ''}`}
          >
            <dt>{label}</dt>
            <dd>{display}</dd>
          </div>
        );
      })}
    </dl>
  );
}
