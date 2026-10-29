'use client';
import { Button } from '@/components/ui/button';
import { useCartOperations } from './provider';
export function AddButton({
  productId,
  canPurchase,
}: {
  productId: string;
  canPurchase: boolean;
}) {
  const { add, busy } = useCartOperations();
  return (
    <Button
      type="button"
      data-add-cart
      data-product-id={productId}
      disabled={busy || !canPurchase}
      onClick={() => {
        void add(productId);
      }}
    >
      {busy ? '處理中…' : '加入購物車'}
    </Button>
  );
}
