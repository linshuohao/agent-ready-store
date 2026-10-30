import { orderViewOutput, type OrderView } from '@store/contracts';
import { shoppingRequest } from '@/features/cart/lifecycle-commands';
export const orderPendingKey = (id: string) => `store.order.pending.${id}`;
export const readLifecycleOrder = (id: string) =>
  shoppingRequest(
    `/orders/${encodeURIComponent(id)}`,
    orderViewOutput.refine((o) => o.orderId === id),
  );
export const changeOrder = (id: string, action: 'pay' | 'cancel') =>
  shoppingRequest(
    `/orders/${encodeURIComponent(id)}/${action}`,
    orderViewOutput.refine((o) => o.orderId === id),
    {},
  );
export const committed = (order: OrderView) =>
  order.status === 'PAID' || order.closedAt !== null;
