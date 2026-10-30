import { OrderPage } from '@/features/checkout/order-page';
export default async function Order({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { orderId } = await params;
  const { view } = await searchParams;
  return (
    <OrderPage
      key={`${orderId}:${view === 'share'}`}
      id={orderId}
      share={view === 'share'}
    />
  );
}
