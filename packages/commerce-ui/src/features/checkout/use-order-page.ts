'use client';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useLifecycleOrders } from './order-memory';
import { committed } from './order-commands';
export function useOrderPage(id: string) {
  const commands = useLifecycleOrders();
  const subscribe = useCallback(
    (listener: () => void) => commands.subscribe(id, listener),
    [commands, id],
  );
  const snapshot = useCallback(() => commands.snapshot(id), [commands, id]);
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  const [now, setNow] = useState(0);
  const load = useCallback(() => commands.read(id), [commands, id]);
  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      if (live) {
        setNow(Date.now());
        void load();
      }
    });
    const returned = () => {
      if (document.visibilityState !== 'hidden')
        void commands.read(id, { background: true });
    };
    const timer = setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener('focus', returned);
    document.addEventListener('visibilitychange', returned);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener('focus', returned);
      document.removeEventListener('visibilitychange', returned);
    };
  }, [load, commands, id]);
  const expired = Boolean(
    state.order && now >= Date.parse(state.order.reservationExpiresAt),
  );
  useEffect(() => {
    if (expired && !committed(commands.snapshot(id).order!)) void load();
  }, [expired, commands, id, load]);
  return {
    ...state,
    unknown: state.pendingAction !== null,
    expired,
    now,
    load,
    act: (action: 'pay' | 'cancel') => commands.act(id, action),
  };
}
