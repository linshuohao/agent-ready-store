import Image from 'next/image';
import Link from 'next/link';
import type { ProductSummary } from '@store/contracts';
export const reasonText = {
  SOLD_OUT: '已售罄',
  INVENTORY_ANOMALY: '庫存異常',
  PRICE_PENDING: '價格待確認',
  INVENTORY_UNAVAILABLE: '庫存暫不可用',
};
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
export function Availability({ product }: { product: ProductSummary }) {
  return (
    <p className="availability">
      {product.availability.canPurchase
        ? '可購買'
        : product.availability.reasons.map((r) => reasonText[r]).join(' · ')}
      <span> · 庫存 {product.availability.currentQuantity ?? '暫無資料'}</span>
    </p>
  );
}
export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <article className="product-card">
      <Link
        href={`/products/${product.id}`}
        prefetch={false}
        className="art"
        aria-label={`查看 ${product.name}，${product.id}`}
      >
        <Image
          unoptimized
          src={`/illustrations/${illustration(product.id)}.svg`}
          alt="商品示意，非實物照片"
          width={260}
          height={260}
        />
        <span>商品示意 · {product.id}</span>
      </Link>
      <p className="eyebrow">
        {product.brand} · {product.id}
      </p>
      <h3>
        <Link href={`/products/${product.id}`} prefetch={false}>
          {product.name}
        </Link>
      </h3>
      <p className="price">
        NT${' '}
        {Number(product.price).toLocaleString('zh-TW', {
          minimumFractionDigits: 2,
        })}
      </p>
      <Availability product={product} />
    </article>
  );
}
