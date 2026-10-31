import Image from 'next/image';
import Link from 'next/link';
import type { ProductSummary } from '@store/contracts';
import { AddButton } from '@/features/cart/add-button';
import { ProductPresentation } from '@store/commerce-ui';
export { Availability, reasonText } from '@store/commerce-ui';
export { illustration } from '@store/commerce-ui';
import { illustration } from '@store/commerce-ui';
export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <ProductPresentation
      product={product}
      art={
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
      }
      title={
        <Link href={`/products/${product.id}`} prefetch={false}>
          {product.name}
        </Link>
      }
      actions={
        <AddButton
          productId={product.id}
          canPurchase={product.availability.canPurchase}
        />
      }
    />
  );
}
