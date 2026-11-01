'use client';
import { useState, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { useCartOperations } from './provider';
import { cartFailure } from './lifecycle-commands';
export function AddButton({
  productId,
  canPurchase,
}: {
  productId: string;
  canPurchase: boolean;
}) {
  const { add } = useCartOperations();
  const [adding, setAdding] = useState(false);
  const active = useRef(false);
  const [error, setError] = useState('');
  return (
    <>
      <Button
        type="button"
        data-add-cart
        data-product-id={productId}
        disabled={adding || !canPurchase}
        aria-busy={adding}
        className={canPurchase ? 'disabled:opacity-100' : undefined}
        onClick={async () => {
          if (active.current) return;
          active.current = true;
          setAdding(true);
          setError('');
          try {
            const result = await add(productId);
            if (result.kind !== 'success')
              setError(
                result.kind === 'unknown'
                  ? '加購結果未確認，請查詢原操作。'
                  : cartFailure(result.error.code),
              );
          } finally {
            active.current = false;
            setAdding(false);
          }
        }}
      >
        {adding ? '處理中…' : '加入購物車'}
      </Button>
      {error && <p role="status">{error}</p>}
    </>
  );
}
