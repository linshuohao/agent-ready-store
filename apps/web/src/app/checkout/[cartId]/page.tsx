import { AgentCheckoutPage } from '@/features/checkout/agent-checkout-page';
import { HandoffEntry } from '@/features/checkout/handoff-entry';
export default async function Checkout({
  params,
  searchParams,
}: {
  params: Promise<{ cartId: string }>;
  searchParams: Promise<{ reviewId?: string }>;
}) {
  const { cartId } = await params;
  const { reviewId } = await searchParams;
  if (reviewId)
    return (
      <AgentCheckoutPage
        key={`${cartId}:${reviewId}`}
        id={cartId}
        reviewId={reviewId}
      />
    );
  return <HandoffEntry key={cartId} id={cartId} />;
}
