import { OrderPage } from '@/features/checkout/order-page';
export default async function Order({
  params,
}: {
  params: Promise<{ cartId: string }>;
}) {
  const { cartId } = await params;
  return <OrderPage key={cartId} id={cartId} />;
}
