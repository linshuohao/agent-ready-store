'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cartCapabilityInput, cartResultOutput } from '@store/contracts';
import { Button } from '@/components/ui/button';
import { useCartOperations } from '@/features/cart/provider';
import { CheckoutPage } from './checkout-page';

type Phase = 'loading' | 'ready' | 'invalid' | 'expired' | 'unknown';
export function HandoffEntry({ id }: { id: string }) {
  const { selectCart } = useCartOperations();
  const [phase, setPhase] = useState<Phase>('loading');
  const [attempt, setAttempt] = useState(0);
  const captured = useRef(false),
    material = useRef<{ cartId: string; cartAccessToken: string } | null>(null),
    generation = useRef(0);
  useEffect(() => {
    let active = true;
    async function redeem(fromHash = false) {
      const owner = ++generation.current;
      const hash = window.location.hash;
      if (window.location.search) {
        history.replaceState(history.state, '', window.location.pathname);
        captured.current = true;
        material.current = null;
        if (active) setPhase('invalid');
        return;
      }
      if (hash || fromHash) {
        history.replaceState(
          history.state,
          '',
          window.location.pathname + window.location.search,
        );
        captured.current = true;
        material.current = null;
        const params = new URLSearchParams(hash.slice(1));
        const parsed = cartCapabilityInput.safeParse({
          cartId: id,
          cartAccessToken: params.get('handoff'),
        });
        if (
          !parsed.success ||
          [...params.keys()].length !== 1 ||
          !params.has('handoff')
        ) {
          if (active) setPhase('invalid');
          return;
        }
        material.current = parsed.data;
      } else if (!captured.current) {
        captured.current = true;
        if (active) setPhase('ready');
        return;
      }
      const input = material.current;
      if (!input) return;
      if (active) setPhase('loading');
      try {
        const response = await fetch('/api/v1/handoffs/exchange', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(10000),
        });
        const parsed = cartResultOutput.safeParse(await response.json());
        if (!active || owner !== generation.current) return;
        if (
          parsed.success &&
          parsed.data.ok &&
          response.ok &&
          parsed.data.data.cartId === id
        ) {
          material.current = null;
          selectCart(id);
          setPhase('ready');
        } else if (parsed.success && !parsed.data.ok && response.status < 500) {
          setPhase(
            parsed.data.error.code === 'CREDENTIAL_EXPIRED'
              ? 'expired'
              : 'invalid',
          );
        } else setPhase('unknown');
      } catch {
        if (active && owner === generation.current) setPhase('unknown');
      }
    }
    const onHash = () => {
      void redeem(true);
    };
    // Keep captured material in a ref across development effect replays; never persist it.
    void Promise.resolve().then(() => {
      if (active) void redeem();
    });
    window.addEventListener('hashchange', onHash);
    return () => {
      active = false;
      window.removeEventListener('hashchange', onHash);
    };
  }, [id, attempt, selectCart]);
  if (phase === 'ready') return <CheckoutPage key={id} id={id} />;
  return (
    <main id="main" tabIndex={-1} className="commerce-page checkout-page">
      <h1>交接購物車</h1>
      <p role="status">
        {phase === 'loading'
          ? '正在接手購物車…'
          : phase === 'expired'
            ? '交接連結已過期，請重新發起購物。'
            : phase === 'unknown'
              ? '交接結果尚未確認，請重試；若重新整理後無法存取，請重新開啟原有效連結。'
              : '交接連結格式有誤，請重新開啟原有效連結。'}
      </p>
      {phase === 'unknown' && (
        <Button onClick={() => setAttempt((n) => n + 1)}>重試交接</Button>
      )}
      {phase !== 'loading' && (
        <p>
          <Link href="/">返回商品列表</Link>
        </p>
      )}
    </main>
  );
}
