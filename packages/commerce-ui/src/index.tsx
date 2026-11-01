import { formatMoney } from './lib/money';
export { formatMoney };
import { MoneyBreakdown } from './features/cart/money-breakdown';
export { MoneyBreakdown };
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
        {actions && <CommerceActions>{actions}</CommerceActions>}
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

/** Keeps card-to-action and action-to-action spacing consistent in every host. */
export function CommerceActions({ children }: { children: React.ReactNode }) {
  return <div className="commerce-actions">{children}</div>;
}
