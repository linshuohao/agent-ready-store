import { HandoffEntry } from '@/features/checkout/handoff-entry';
export default async function Checkout({
  params,
}: {
  params: Promise<{ cartId: string }>;
}) {
  const { cartId } = await params;
  return <HandoffEntry key={cartId} id={cartId} />;
}
