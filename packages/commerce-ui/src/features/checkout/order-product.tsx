import type { OrderView } from '@store/contracts';
import { illustration } from '../../index';
import { Artwork } from '../../runtime';
import { formatMoney } from '../../lib/money';

type OrderItem = OrderView['summary']['items'][number];

// Both views present the fixed order snapshot, without querying live product data.
export function OrderProduct({
  item,
  compact = false,
}: {
  item: OrderItem;
  compact?: boolean;
}) {
  return (
    <div className={`order-product${compact ? ' order-product-compact' : ''}`}>
      <div className="commerce-product-art">
        <Artwork
          kind={illustration(item.productId)}
          alt="商品示意，非實物照片"
          width={96}
          height={96}
        />
      </div>
      <div className="order-product-info">
        <p className="order-product-id">
          {item.productId} · {item.brand}
        </p>
        <h3>{item.name}</h3>
        <p className="order-product-price">
          {formatMoney(item.unitPrice)} <span>× {item.quantity} 件</span>
        </p>
      </div>
      {!compact && (
        <div className="order-product-subtotal">
          <span>商品小計</span>
          <strong>{formatMoney(item.lineSubtotal)}</strong>
        </div>
      )}
      {!compact && Object.keys(item.specs).length > 0 && (
        <dl className="order-product-specs">
          {Object.entries(item.specs).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
