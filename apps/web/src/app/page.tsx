import { CatalogPage } from '@store/commerce-ui/catalog-page';
import { publicApi } from '@/lib/api';
import type { Page, ProductSummary, ProductCategory } from '@store/contracts';
export const dynamic = 'force-dynamic';
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) params.set(key, value);
  }
  const [response, categories] = await Promise.all([
    publicApi<Page<ProductSummary>>(`/products?${params}`),
    publicApi<Page<ProductCategory>>('/catalog/categories'),
  ]);
  return (
    <CatalogPage
      response={response}
      categories={categories}
      query={params.toString()}
    />
  );
}
