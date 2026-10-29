import { CartPage } from '@/features/cart/cart-page';
export default async function Cart({
  params,
}: {
  params: Promise<{ cartId: string }>;
}) {
  const { cartId } = await params;
  return <CartPage key={cartId} id={cartId} />;
}
