'use client';
import { useRuntime } from '../../runtime';
import { createContext, useContext, useState } from 'react';
import { OrderCommands } from './order-commands';
const Lifecycle = createContext<OrderCommands | null>(null);
export function useLifecycleOrders() {
  const value = useContext(Lifecycle);
  if (!value) throw Error('OrderMemory required');
  return value;
}
export function OrderMemory({ children }: { children: React.ReactNode }) {
  const { storage, transport } = useRuntime();
  const [commands] = useState(() => new OrderCommands(storage, transport));
  return <Lifecycle.Provider value={commands}>{children}</Lifecycle.Provider>;
}
