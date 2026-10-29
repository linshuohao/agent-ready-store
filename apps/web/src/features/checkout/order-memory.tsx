'use client';
import { createContext, useContext, useState } from 'react';
import type { OrderResult } from '@store/contracts';
const Memory = createContext<{
  order: OrderResult | null;
  remember: (order: OrderResult | null) => void;
} | null>(null);
export function OrderMemory({ children }: { children: React.ReactNode }) {
  const [order, remember] = useState<OrderResult | null>(null);
  return (
    <Memory.Provider value={{ order, remember }}>{children}</Memory.Provider>
  );
}
export function useOrderMemory() {
  const value = useContext(Memory);
  if (!value) throw Error('OrderMemory required');
  return value;
}
