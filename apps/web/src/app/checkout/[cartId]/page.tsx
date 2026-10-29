import { CheckoutPage } from '@/features/checkout/checkout-page';
export default async function Checkout({
  params,
}: {
  params: Promise<{ cartId: string }>;
}) {
  const { cartId } = await params;
  return <CheckoutPage key={cartId} id={cartId} />;
}
