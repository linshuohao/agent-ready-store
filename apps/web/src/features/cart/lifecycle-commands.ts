import { z } from 'zod';
import {
  shoppingCartViewOutput,
  getOrCreateCartInput,
  persistentCartOperationInput,
  orderSummaryOutput,
  orderViewOutput,
  createOrderInput,
  type ShoppingCartView,
} from '@store/contracts';
export type Call<T> =
  | { kind: 'success'; data: T }
  | {
      kind: 'failure';
      error: { code: string; issues?: { productId: string; code: string }[] };
    }
  | { kind: 'unknown' };
export type Storage = Pick<
  globalThis.Storage,
  'getItem' | 'setItem' | 'removeItem'
>;
export const currentCartKey = 'store.currentCartId';
export const pendingCartKey = (id?: string) =>
  id ? `store.cart.pending.${id}` : 'store.cart.initialize';
const fail = (code: string) => ({ kind: 'failure' as const, error: { code } });
export async function shoppingRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
): Promise<Call<T>> {
  try {
    const response = await fetch(`/api/v1/shopping${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const raw: unknown = await response.json();
    const parsed = z
      .discriminatedUnion('ok', [
        z.object({ ok: z.literal(true), data: schema }),
        z.object({
          ok: z.literal(false),
          error: z.object({
            code: z.string(),
            issues: z
              .array(z.object({ productId: z.string(), code: z.string() }))
              .optional(),
          }),
        }),
      ])
      .safeParse(raw);
    if (parsed.success) {
      if (parsed.data.ok && response.ok)
        return { kind: 'success', data: parsed.data.data };
      if (!parsed.data.ok && response.status < 500)
        return { kind: 'failure', error: parsed.data.error };
    }
    return { kind: 'unknown' };
  } catch {
    return { kind: 'unknown' };
  }
}
export const readCart = (id: string) =>
  shoppingRequest(
    `/carts/${encodeURIComponent(id)}`,
    shoppingCartViewOutput.refine((c) => c.cartId === id),
  );
export const quoteCart = (
  id: string,
  selectedItems: { productId: string; expectedQuantity: number }[],
) =>
  shoppingRequest(
    `/carts/${encodeURIComponent(id)}/quote`,
    orderSummaryOutput,
    { selectedItems, constraints: { currency: 'TWD' } },
  );
export const readOrders = (id: string, offset = 0) =>
  shoppingRequest(
    `/carts/${encodeURIComponent(id)}/orders?offset=${offset}`,
    z.object({
      items: z.array(orderViewOutput.refine((o) => o.cartId === id)),
      nextOffset: z.number().int().nonnegative().nullable(),
    }),
  );
export function acceptCart(
  current: ShoppingCartView | null,
  incoming: ShoppingCartView,
  id: string,
): ShoppingCartView | null {
  if (
    incoming.cartId !== id ||
    (current?.cartId === id && current.cartVersion > incoming.cartVersion)
  )
    return current;
  return incoming;
}
const initialization = getOrCreateCartInput.options[1];
const pending = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('initialize'), input: initialization }).strict(),
  z
    .object({
      kind: z.literal('operate'),
      cartId: z.uuid(),
      input: persistentCartOperationInput,
    })
    .strict(),
]);
// Cart-only request persistence. Provider owns navigation, drafts and UI lifecycle.
export class CartCommands {
  private active = new Set<string>();
  constructor(private storage: Storage) {}
  hasPending(id?: string) {
    return this.storage.getItem(pendingCartKey(id)) !== null;
  }
  async initialize(input: z.infer<typeof initialization>) {
    return this.start({ kind: 'initialize', input });
  }
  async operate(
    cartId: string,
    input: z.infer<typeof persistentCartOperationInput>,
  ) {
    return this.start({ kind: 'operate', cartId, input });
  }
  private async start(
    request: z.infer<typeof pending>,
  ): Promise<Call<ShoppingCartView>> {
    const id = request.kind === 'operate' ? request.cartId : undefined;
    try {
      if (this.hasPending(id)) return fail('CART_RECOVERY_REQUIRED');
      this.storage.setItem(pendingCartKey(id), JSON.stringify(request));
    } catch {
      return fail('LOCAL_STORAGE_UNAVAILABLE');
    }
    return this.retry(id);
  }
  async retry(id?: string): Promise<Call<ShoppingCartView>> {
    const key = pendingCartKey(id);
    if (this.active.has(key)) return fail('CART_BUSY');
    let request: z.infer<typeof pending>;
    try {
      const raw = this.storage.getItem(key);
      if (!raw) return fail('NO_PENDING_REQUEST');
      const parsed = pending.safeParse(JSON.parse(raw));
      if (
        !parsed.success ||
        (id
          ? parsed.data.kind !== 'operate' || parsed.data.cartId !== id
          : parsed.data.kind !== 'initialize')
      )
        return fail('LOCAL_RECOVERY_INVALID');
      request = parsed.data;
    } catch {
      return fail('LOCAL_STORAGE_UNAVAILABLE');
    }
    this.active.add(key);
    try {
      const response = await shoppingRequest(
        request.kind === 'initialize'
          ? '/carts'
          : `/carts/${encodeURIComponent(request.cartId)}/operations`,
        shoppingCartViewOutput.refine(
          (c) => request.kind === 'initialize' || c.cartId === request.cartId,
        ),
        request.input,
      );
      if (response.kind !== 'unknown') {
        // Persist the recovered ID before clearing initialization; storage failure preserves the original key.
        try {
          if (
            request.kind === 'initialize' &&
            response.kind === 'success' &&
            !this.storage.getItem(currentCartKey)
          )
            this.storage.setItem(currentCartKey, response.data.cartId);
          this.storage.removeItem(key);
        } catch {
          return fail('LOCAL_STORAGE_UNAVAILABLE');
        }
      }
      return response;
    } finally {
      this.active.delete(key);
    }
  }
}
export const pendingOrderKey = (id: string) => `store.order.create.${id}`;
export async function createCartOrder(
  storage: Storage,
  id: string,
  input?: z.infer<typeof createOrderInput>,
) {
  const key = pendingOrderKey(id);
  let body: z.infer<typeof createOrderInput>;
  try {
    const stored = storage.getItem(key);
    if (input && stored) return fail('ORDER_RECOVERY_REQUIRED');
    const parsed = createOrderInput.safeParse(
      input ?? (stored ? JSON.parse(stored) : null),
    );
    if (!parsed.success) return fail('LOCAL_RECOVERY_INVALID');
    body = parsed.data;
    if (input) storage.setItem(key, JSON.stringify(body));
  } catch {
    return fail('LOCAL_STORAGE_UNAVAILABLE');
  }
  const response = await shoppingRequest(
    `/carts/${encodeURIComponent(id)}/orders`,
    z.object({
      order: orderViewOutput.refine((o) => o.cartId === id),
      cart: shoppingCartViewOutput.refine((c) => c.cartId === id),
    }),
    body,
  );
  if (response.kind !== 'unknown')
    try {
      storage.removeItem(key);
    } catch {
      return fail('LOCAL_STORAGE_UNAVAILABLE');
    }
  return response;
}
export function cartFailure(code: string) {
  const messages: Record<string, string> = {
    CART_VERSION_CONFLICT: '購物車已更新，請重新載入並核對內容。',
    CART_NOT_FOUND: '找不到原購物車；請核對保存的連結，不會自動另建車。',
    CART_ITEMS_INVALID: '商品或數量目前無法購買，請調整問題商品。',
    VALIDATION_ERROR: '請輸入有效的商品與正整數數量。',
    CART_RECOVERY_REQUIRED: '上次保存結果未確認，請重試原請求。',
    ORDER_RECOVERY_REQUIRED: '上次建立訂單結果未確認，請恢復原請求。',
    LOCAL_STORAGE_UNAVAILABLE: '無法保存恢復資料，請檢查瀏覽器儲存設定後重試。',
    LOCAL_RECOVERY_INVALID:
      '恢復資料無法讀取，請保留原連結並核對，未建立新請求。',
    UNSAVED_DRAFT: '請先儲存或放棄數量草稿。',
    STALE_CONTEXT: '目前購物車已改變，請重新開啟原車。',
    PENDING_ORDER_LIMIT: '待支付訂單已達上限，請先處理原訂單。',
    CART_BUSY: '購物車正在保存，請稍候。',
  };
  return messages[code] ?? '操作未完成，請核對內容後重試。';
}
