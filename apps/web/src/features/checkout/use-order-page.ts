'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { orderTargetInput, type OrderView } from '@store/contracts';
import {
  changeOrder,
  committed,
  orderPendingKey,
  readLifecycleOrder,
} from './order-commands';

export function useOrderPage(id: string) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [message, setMessage] = useState('');
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'pay' | 'cancel' | 'invalid' | null
  >(null);
  const [conflict, setConflict] = useState(false);
  const [now, setNow] = useState(0);
  const current = useRef<OrderView | null>(null);
  const live = useRef(false),
    writing = useRef(false),
    sequence = useRef(0);
  const accept = useCallback(
    (incoming: OrderView) => {
      if (incoming.orderId !== id) return false;
      const known = current.current;
      if (known && committed(known)) {
        if (!committed(incoming)) return false;
        if (
          known.status !== incoming.status ||
          known.closeReason !== incoming.closeReason
        ) {
          setConflict(true);
          setMessage(
            '訂單結果不一致，已保留確認的結果並停用操作，請重新查詢。',
          );
          return false;
        }
      }
      current.current = incoming;
      setOrder(incoming);
      if (committed(incoming)) {
        setPendingAction(null);
        try {
          localStorage.removeItem(orderPendingKey(id));
        } catch {
          /* Known result remains visible; reload only reads. */
        }
      }
      return true;
    },
    [id],
  );
  const load = useCallback(async () => {
    const request = ++sequence.current;
    if (!orderTargetInput.safeParse({ orderId: id }).success) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await readLifecycleOrder(id);
    if (!live.current || request !== sequence.current) return;
    setLoading(false);
    if (result.kind === 'success') {
      if (accept(result.data)) setMessage('');
      setMissing(false);
    } else if (
      result.kind === 'failure' &&
      ['ORDER_NOT_FOUND', 'VALIDATION_ERROR'].includes(result.error.code)
    ) {
      if (current.current)
        setMessage('暫時無法讀取原單，已保留確認的訂單內容，請重新查詢。');
      else setMissing(true);
    } else setMessage('暫時無法確認訂單結果。請重新查詢原單，不要重新購買。');
  }, [id, accept]);
  useEffect(() => {
    live.current = true;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem(orderPendingKey(id));
        if (raw) {
          let pending;
          try {
            pending = JSON.parse(raw);
          } catch {
            pending = null;
          }
          setPendingAction(
            pending?.orderId === id &&
              ['pay', 'cancel'].includes(pending?.action)
              ? pending.action
              : 'invalid',
          );
        }
      } catch {
        setMessage('瀏覽器無法保存操作，請允許本機儲存後再支付。');
      }
      setNow(Date.now());
      void load();
    });
    const returned = () => {
      if (document.visibilityState !== 'hidden') void load();
    };
    window.addEventListener('focus', returned);
    document.addEventListener('visibilitychange', returned);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      live.current = false;
      // Invalidate outstanding reads when this page lifetime ends.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sequence.current++;
      window.clearInterval(timer);
      window.removeEventListener('focus', returned);
      document.removeEventListener('visibilitychange', returned);
    };
  }, [id, load]);
  const expired = Boolean(
    order && now >= Date.parse(order.reservationExpiresAt),
  );
  useEffect(() => {
    if (expired && current.current && !committed(current.current)) void load();
  }, [expired, load]);
  async function act(action: 'pay' | 'cancel') {
    const known = current.current;
    if (
      writing.current ||
      (pendingAction !== null && pendingAction !== action) ||
      !known ||
      conflict ||
      committed(known) ||
      !known.allowedActions[action === 'pay' ? 'canPay' : 'canCancel'] ||
      Date.now() >= Date.parse(known.reservationExpiresAt)
    )
      return;
    try {
      localStorage.setItem(
        orderPendingKey(id),
        JSON.stringify({ orderId: id, action }),
      );
    } catch {
      setMessage('無法保存操作狀態，本次未送出。請允許本機儲存後重試。');
      return;
    }
    writing.current = true;
    setBusy(true);
    setPendingAction(action);
    setMessage('');
    ++sequence.current;
    const result = await changeOrder(id, action);
    writing.current = false;
    if (!live.current) return;
    setBusy(false);
    if (result.kind === 'success') {
      if (accept(result.data)) setMessage('');
    } else {
      setMessage(
        result.kind === 'failure'
          ? '操作未完成，請查詢原訂單確認目前狀態。'
          : '操作結果未知，請查詢原訂單；不會自動再次支付或建立新單。',
      );
      void load();
    }
  }
  return {
    order,
    message,
    missing,
    loading,
    busy,
    unknown: pendingAction !== null,
    pendingAction,
    conflict,
    expired,
    now,
    load,
    act,
  };
}
