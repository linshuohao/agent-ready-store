import { OrderDetailsPage } from '@/features/checkout/order-details-page';
export default async function OrderDetails({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailsPage key={orderId} id={orderId} />;
}
