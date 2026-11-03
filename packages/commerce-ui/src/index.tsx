import { formatMoney } from './lib/money';
export { formatMoney };
export { MoneyBreakdown } from './features/cart/money-breakdown';

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
