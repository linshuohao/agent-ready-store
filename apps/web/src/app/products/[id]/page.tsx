import { ProductPage } from '@store/commerce-ui/product-page';
import { notFound } from 'next/navigation';
import type { ProductDetail } from '@store/contracts';
import { publicApi } from '@/lib/api';
export const dynamic = 'force-dynamic';
export default async function Product({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await publicApi<ProductDetail>(
    `/products/${encodeURIComponent(id)}`,
  );
  if (!response.ok && response.error.code === 'NOT_FOUND') notFound();
  return <ProductPage id={id} response={response} />;
}
