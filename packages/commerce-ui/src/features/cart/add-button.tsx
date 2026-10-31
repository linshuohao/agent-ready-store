'use client';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { useCartOperations } from './provider';
export function AddButton({
  productId,
  canPurchase,
}: {
  productId: string;
  canPurchase: boolean;
}) {
  const { add, busy } = useCartOperations();
  const [adding, setAdding] = useState(false);
  return (
    <Button
      type="button"
      data-add-cart
      data-product-id={productId}
      disabled={busy || !canPurchase}
      aria-busy={adding}
      className={canPurchase && !adding ? 'disabled:opacity-100' : undefined}
      onClick={async () => {
        setAdding(true);
        try {
          await add(productId);
        } finally {
          setAdding(false);
        }
      }}
    >
      {adding ? '處理中…' : '加入購物車'}
    </Button>
  );
}
