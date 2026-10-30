import { OrdersPage } from '@/features/checkout/orders-page';
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ cartId?: string }>;
}) {
  const { cartId } = await searchParams;
  return <OrdersPage cartId={cartId} />;
}
