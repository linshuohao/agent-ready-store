export const formatMoney = (amount: string) => {
  const [whole, fraction] = amount.split('.');
  return `NT$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
};
import type { Quote } from '@store/contracts';
import { useId } from 'react';
export function MoneyBreakdown({
  quote,
  mode = 'estimate',
}: {
  quote: Quote;
  mode?: 'estimate' | 'confirmation' | 'completed';
}) {
  const headingId = useId();
  return (
    <section className="cart-totals" aria-labelledby={headingId}>
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
import type { PurchaseSummary as Summary } from '@store/contracts';

export function PurchaseSummary({
  summary,
  completed = false,
  actions,
}: {
  summary: Summary;
  completed?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className="purchase-layout"
      aria-label={completed ? '成交內容' : '本次購買內容'}
    >
      <div className="purchase-products">
        <div className="purchase-section-heading">
          <h2>商品明細</h2>
          <p>來源：{summary.origin === 'AGENT' ? 'AI 助理準備' : '自行選購'}</p>
        </div>
        <ul className="purchase-product-list">
          {summary.items.map((item) => (
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
      <aside
        className="purchase-aside"
        aria-label={completed ? '成交摘要' : '結帳摘要'}
      >
        <MoneyBreakdown
          quote={summary.quote}
          mode={completed ? 'completed' : 'confirmation'}
        />
        {actions && <div className="commerce-actions">{actions}</div>}
      </aside>
    </section>
  );
}

export const reasonText = {
  SOLD_OUT: '已售罄',
  INVENTORY_ANOMALY: '庫存異常',
  PRICE_PENDING: '價格待確認',
  INVENTORY_UNAVAILABLE: '庫存暫不可用',
};
export function Availability({
  product,
}: {
  product: import('@store/contracts').ProductSummary;
}) {
  return (
    <p className="availability">
      {product.availability.canPurchase
        ? '可購買'
        : product.availability.reasons.map((r) => reasonText[r]).join(' · ')}
      <span> · 庫存 {product.availability.currentQuantity ?? '暫無資料'}</span>
    </p>
  );
}
export function ProductPresentation({
  product,
  art,
  title,
  actions,
}: {
  product: import('@store/contracts').ProductSummary;
  art?: React.ReactNode;
  title?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <article className="product-card">
      {art}
      <p className="eyebrow">
        {product.brand} · {product.id}
      </p>
      <h3>{title ?? product.name}</h3>
      <p className="price">{formatMoney(product.price)}</p>
      <Availability product={product} />
      {actions}
    </article>
  );
}

export function illustration(id: string) {
  return ['P001', 'P002'].includes(id)
    ? 'earbuds'
    : id === 'P005'
      ? 'headphones'
      : ['P009', 'P019', 'P022', 'P023', 'P025'].includes(id)
        ? 'bottle'
        : id === 'P004'
          ? 'charger'
          : ['P026', 'P027', 'P028', 'P029', 'P030'].includes(id)
            ? 'packet'
            : 'object';
}
