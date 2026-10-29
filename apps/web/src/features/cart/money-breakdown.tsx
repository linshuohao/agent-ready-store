import type { Quote } from '@store/contracts';
import { formatMoney } from '@/lib/money';
export function MoneyBreakdown({ quote }: { quote: Quote }) {
  return (
    <section className="cart-totals" aria-labelledby="quote-heading">
      <h2 id="quote-heading">目前已儲存報價</h2>
      <p className="hint">未儲存的調整尚未計入報價；庫存與價格仍可能變動。</p>
      <dl>
        {[
          ['商品小計', quote.subtotal],
          ['全站滿減', quote.thresholdDiscount],
          ['AI 優惠', quote.aiDiscount],
          ['運費', quote.shipping],
          ['應付金額', quote.total],
        ].map(([label, amount]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{formatMoney(amount)}</dd>
          </div>
        ))}
      </dl>
      <ul aria-label="已儲存商品明細">
        {quote.items.map((item) => (
          <li key={item.productId}>
            {item.name} · {item.productId} · {item.quantity} 件 ×{' '}
            {formatMoney(item.unitPrice)} = {formatMoney(item.lineSubtotal)}
          </li>
        ))}
      </ul>
    </section>
  );
}
