import { httpTransport, type Transport } from '../../transport';
import { orderViewOutput, type OrderView } from '@store/contracts';
import { shoppingRequest } from '../cart/lifecycle-commands';
export const orderPendingKey = (id: string) => `store.order.pending.${id}`;
export const readLifecycleOrder = (
  id: string,
  transport: Transport = httpTransport,
) =>
  shoppingRequest(
    `/orders/${encodeURIComponent(id)}`,
    orderViewOutput.refine((o) => o.orderId === id),
    undefined,
    transport,
  );
export const changeOrder = (
  id: string,
  action: 'pay' | 'cancel',
  transport: Transport = httpTransport,
) =>
  shoppingRequest(
    `/orders/${encodeURIComponent(id)}/${action}`,
    orderViewOutput.refine((o) => o.orderId === id),
    {},
    transport,
  );
export const committed = (order: OrderView) =>
  order.status === 'PAID' || order.closedAt !== null;

type Storage = import('../cart/lifecycle-commands').Storage;
type Action = 'pay' | 'cancel';
type OrderState = {
  order: OrderView | null;
  pendingAction: Action | 'invalid' | null;
  busy: boolean;
  loading: boolean;
  missing: boolean;
  conflict: boolean;
  message: string;
};
const empty: OrderState = {
  order: null,
  pendingAction: null,
  busy: false,
  loading: true,
  missing: false,
  conflict: false,
  message: '',
};
// One browser provider owns these per-order copies. No module-global server/user state.
export class OrderCommands {
  private records = new Map<string, OrderState>();
  private reads = new Map<string, number>();
  private listeners = new Map<string, Set<() => void>>();
  constructor(
    private storage: Storage,
    private transport: Transport = httpTransport,
  ) {}
  hasBusy() {
    return [...this.records.values()].some((record) => record.busy);
  }
  snapshot(id: string): OrderState {
    return this.records.get(id) ?? empty;
  }
  subscribe(id: string, listener: () => void) {
    let set = this.listeners.get(id);
    if (!set) {
      set = new Set();
      this.listeners.set(id, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }
  private update(id: string, patch: Partial<OrderState>) {
    this.records.set(id, { ...this.snapshot(id), ...patch });
    this.listeners.get(id)?.forEach((l) => l());
  }
  private pending(id: string): OrderState['pendingAction'] {
    const raw = this.storage.getItem(orderPendingKey(id));
    if (!raw) return null;
    try {
      const p = JSON.parse(raw);
      return p?.orderId === id && ['pay', 'cancel'].includes(p?.action)
        ? p.action
        : 'invalid';
    } catch {
      return 'invalid';
    }
  }
  private accept(id: string, incoming: OrderView, fromRead: boolean) {
    const state = this.snapshot(id),
      known = state.order;
    if (incoming.orderId !== id) return;
    if (known && committed(known)) {
      if (!committed(incoming)) return;
      if (
        known.status !== incoming.status ||
        known.closeReason !== incoming.closeReason
      ) {
        this.update(id, {
          conflict: true,
          message: '訂單結果不一致，已保留確認的結果並停用操作，請重新查詢。',
        });
        if (!state.conflict) void this.read(id);
        return;
      }
    }
    this.update(id, {
      order: incoming,
      missing: false,
      message: '',
      conflict: fromRead ? false : state.conflict,
    });
    if (committed(incoming)) {
      this.update(id, { pendingAction: null });
      try {
        this.storage.removeItem(orderPendingKey(id));
      } catch {
        /* Server terminal remains visible; refreshing only reads. */
      }
    }
  }
  async read(id: string) {
    const sequence = (this.reads.get(id) ?? 0) + 1;
    this.reads.set(id, sequence);
    try {
      if (!this.snapshot(id).busy)
        this.update(id, { pendingAction: this.pending(id) });
    } catch {
      this.update(id, {
        message: '無法讀取本機恢復資料，請檢查瀏覽器儲存設定。',
      });
    }
    this.update(id, { loading: true });
    const result = await readLifecycleOrder(id, this.transport);
    if (this.reads.get(id) !== sequence) return;
    this.update(id, { loading: false });
    if (result.kind === 'success') this.accept(id, result.data, true);
    else if (
      result.kind === 'failure' &&
      ['ORDER_NOT_FOUND', 'VALIDATION_ERROR'].includes(result.error.code)
    ) {
      if (this.snapshot(id).order)
        this.update(id, {
          message: '暫時無法讀取原單，已保留確認的訂單內容，請重新查詢。',
        });
      else this.update(id, { missing: true });
    } else
      this.update(id, {
        message: '暫時無法確認訂單結果。請重新查詢原單，不要重新購買。',
      });
  }
  async act(id: string, action: Action) {
    const state = this.snapshot(id),
      known = state.order;
    if (
      state.busy ||
      state.loading ||
      state.conflict ||
      !known ||
      committed(known) ||
      (state.pendingAction !== null && state.pendingAction !== action) ||
      !known.allowedActions[action === 'pay' ? 'canPay' : 'canCancel'] ||
      Date.now() >= Date.parse(known.reservationExpiresAt)
    )
      return;
    try {
      const pending = this.pending(id);
      if (pending && pending !== action) {
        this.update(id, { pendingAction: pending });
        return;
      }
      this.storage.setItem(
        orderPendingKey(id),
        JSON.stringify({ orderId: id, action }),
      );
    } catch {
      this.update(id, {
        message: '無法保存操作狀態，本次未送出。請允許本機儲存後重試。',
      });
      return;
    }
    this.reads.set(id, (this.reads.get(id) ?? 0) + 1);
    this.update(id, {
      busy: true,
      loading: false,
      pendingAction: action,
      message: '',
    });
    const result = await changeOrder(id, action, this.transport);
    this.update(id, { busy: false });
    // Action results belong to their original order even after a page unmounts or later reads begin.
    if (result.kind === 'success') this.accept(id, result.data, false);
    else {
      this.update(id, {
        message: '操作結果未知，請查詢原訂單；不會自動再次支付或建立新單。',
      });
      await this.read(id);
    }
  }
}
