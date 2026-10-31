import { Artwork } from '../../../runtime';
import { Link } from '../../../runtime';
import type { ProductSummary } from '@store/contracts';
import { AddButton } from '../../cart/add-button';
import { ProductPresentation } from '../../../index';
export { Availability, reasonText } from '../../../index';
export { illustration } from '../../../index';
import { illustration } from '../../../index';
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
          <Artwork
            kind={illustration(product.id)}
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
