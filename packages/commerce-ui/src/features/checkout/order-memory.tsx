'use client';
import { useRuntime } from '../../runtime';
import { createContext, useContext, useState } from 'react';
import { OrderCommands } from './order-commands';
import type { OrderResult } from '@store/contracts';
const Memory = createContext<{
  order: OrderResult | null;
  remember: (order: OrderResult | null) => void;
} | null>(null);
const Lifecycle = createContext<OrderCommands | null>(null);
export function useLifecycleOrders() {
  const value = useContext(Lifecycle);
  if (!value) throw Error('OrderMemory required');
  return value;
}
export function OrderMemory({ children }: { children: React.ReactNode }) {
  const { storage, transport } = useRuntime();
  const [commands] = useState(() => new OrderCommands(storage, transport));
  const [order, remember] = useState<OrderResult | null>(null);
  return (
    <Lifecycle.Provider value={commands}>
      <Memory.Provider value={{ order, remember }}>{children}</Memory.Provider>
    </Lifecycle.Provider>
  );
}
export function useOrderMemory() {
  const value = useContext(Memory);
  if (!value) throw Error('OrderMemory required');
  return value;
}
