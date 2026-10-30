import { OrderPage } from '@/features/checkout/order-page';
export default async function Order({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ view?: string; created?: string }>;
}) {
  const { orderId } = await params;
  const { view, created } = await searchParams;
  return (
    <OrderPage
      key={`${orderId}:${view === 'share'}`}
      id={orderId}
      created={created === '1'}
      share={view === 'share'}
    />
  );
}
