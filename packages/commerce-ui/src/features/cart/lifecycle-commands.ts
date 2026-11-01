import { httpTransport, type Transport } from '../../transport';
import { z } from 'zod';
import {
  shoppingCartViewOutput,
  addCartItemInput,
  requestResultOutput,
  persistentCartOperationInput,
  selectionQuoteOutput,
  orderViewOutput,
  createOrderInput,
  type ShoppingCartView,
} from '@store/contracts';
export type Call<T> =
  | { kind: 'success'; data: T; recoveryWarning?: boolean }
  | {
      kind: 'failure';
      error: {
        code: string;
        details?: { cartId?: string; initializationId?: string };
        issues?: { productId: string; code: string }[];
      };
    }
  | { kind: 'unknown' };
export type { Storage } from '../../transport';
import type { Storage } from '../../transport';
import type { PurchaseSelection } from './purchase-selection';
export const currentCartKey = 'store.currentCartId';
export const pendingCartKey = (id?: string) =>
  id ? `store.cart.pending.${id}` : 'store.cart.initialize';
const fail = (code: string) => ({ kind: 'failure' as const, error: { code } });
export async function shoppingRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  transport: Transport = httpTransport,
): Promise<Call<T>> {
  try {
    const response = await transport(`/api/v1/shopping${path}`, body);
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
export const readCart = (id: string, transport: Transport = httpTransport) =>
  shoppingRequest(
    `/carts/${encodeURIComponent(id)}`,
    shoppingCartViewOutput.refine((c) => c.cartId === id),
    undefined,
    transport,
  );
export const quoteCart = (
  id: string,
  selectedItems: { productId: string; quantity: number }[],
  transport: Transport = httpTransport,
) =>
  shoppingRequest(
    `/carts/${encodeURIComponent(id)}/quote`,
    selectionQuoteOutput,
    { selectedItems, constraints: { currency: 'TWD' } },
    transport,
  );
export const readOrders = (
  id: string,
  offset = 0,
  limit = 20,
  pendingOnly = false,
  transport: Transport = httpTransport,
) =>
  shoppingRequest(
    `/carts/${encodeURIComponent(id)}/orders?offset=${offset}&limit=${limit}&pendingOnly=${pendingOnly}`,
    z.object({
      items: z.array(orderViewOutput.refine((o) => o.cartId === id)),
      nextOffset: z.number().int().nonnegative().nullable(),
    }),
    undefined,
    transport,
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
export const initializationKey = 'store.cart.initializationId';
const requestPrefix = 'store.request.v2.';
export const requestKey = (id: string) => requestPrefix + id;
export const lastCreatedOrderKey = (id: string) => `store.order.created.${id}`;
// Legacy keys are read only. Never replay these payloads after the cutover.
export const pendingOrderKey = (id: string) => `store.order.create.${id}`;
export type RecoveryRequest = {
  requestId: string;
  kind: 'cart' | 'order' | 'initialize';
  cartId?: string;
  initializationId?: string;
  path?: string;
  body?: unknown;
  legacy?: boolean;
  completed?: boolean;
  selectionOwnership?: PurchaseSelection;
  draftOwnership?: Record<string, string>;
};
export function pendingRequests(storage: Storage): RecoveryRequest[] {
  if (!storage.keys) throw Error('LOCAL_STORAGE_UNAVAILABLE');
  const result: RecoveryRequest[] = [];
  for (const key of storage.keys()) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    if (key.startsWith(requestPrefix)) {
      const r = JSON.parse(raw) as RecoveryRequest;
      if (!r.completed) result.push(r);
    } else if (key === pendingCartKey()) {
      const r = JSON.parse(raw);
      result.push({
        kind: 'initialize',
        requestId: r.input.requestId,
        legacy: true,
      });
    } else if (key.startsWith('store.cart.pending.')) {
      const r = JSON.parse(raw);
      result.push({
        kind: 'cart',
        cartId: r.cartId,
        requestId: r.input.operationRequestId,
        legacy: true,
      });
    } else if (key.startsWith('store.order.create.')) {
      const r = JSON.parse(raw);
      result.push({
        kind: 'order',
        cartId: key.slice('store.order.create.'.length),
        requestId: (r.input ?? r).requestId,
        legacy: true,
      });
    }
  }
  return result;
}
export async function addIdentity(
  storage: Storage,
  requested?: { cartId: string } | { initializationId: string },
): Promise<{ cartId: string } | { initializationId: string }> {
  if (!storage.withLock) throw Error('INITIALIZATION_LOCK_UNAVAILABLE');
  return storage.withLock('store.cart.identity', () => {
    const cartId = storage.getItem(currentCartKey);
    const initializationId = storage.getItem(initializationKey);
    if (requested) {
      if ('cartId' in requested) {
        if (cartId !== requested.cartId) throw Error('STALE_CONTEXT');
        return requested;
      }
      if (cartId) throw Error('STALE_CONTEXT');
      if (initializationId === requested.initializationId) return requested;
      if (cartId || initializationId) throw Error('STALE_CONTEXT');
    }
    if (cartId) return { cartId };
    if (storage.getItem(pendingCartKey()))
      throw Error('LEGACY_RECOVERY_REQUIRED');
    if (initializationId) return { initializationId };
    const created =
      requested && 'initializationId' in requested
        ? requested.initializationId
        : crypto.randomUUID();
    storage.setItem(initializationKey, created);
    return { initializationId: created };
  });
}
const knownResults = new WeakMap<
  Storage,
  Map<string, z.infer<typeof requestResultOutput>>
>();
function rememberResult(
  storage: Storage,
  requestId: string,
  result: z.infer<typeof requestResultOutput>,
) {
  let results = knownResults.get(storage);
  if (!results) {
    results = new Map();
    knownResults.set(storage, results);
  }
  results.set(requestId, result);
}
export async function queryRequest(
  storage: Storage,
  request: RecoveryRequest,
  transport: Transport = httpTransport,
) {
  const params = new URLSearchParams({
    kind: request.kind,
    requestId: request.requestId,
  });
  if (request.cartId) params.set('cartId', request.cartId);
  if (request.initializationId)
    params.set('initializationId', request.initializationId);
  let recoveryWarning = false;
  const result = await shoppingRequest(
    `/request-result?${params}`,
    requestResultOutput.refine(
      (r) =>
        r.kind === request.kind &&
        (r.status !== 'found' ||
          !request.cartId ||
          ('order' in r ? r.order.cartId : r.cart.cartId) === request.cartId),
    ),
    undefined,
    transport,
  );
  // A late not_found must never erase a success already observed by another query/write.
  if (result.kind === 'success' && result.data.status === 'found') {
    rememberResult(storage, request.requestId, result.data);
    try {
      if ('order' in result.data)
        storage.setItem(
          lastCreatedOrderKey(result.data.order.cartId),
          result.data.order.orderId,
        );
      else await adoptInitialization(storage, request, result.data.cart);
      completeRequest(storage, request);
    } catch {
      recoveryWarning = true;
    }
  }
  const known = knownResults.get(storage)?.get(request.requestId);
  return known
    ? { kind: 'success' as const, data: known, recoveryWarning }
    : result;
}
function completeRequest(storage: Storage, request: RecoveryRequest) {
  storage.setItem(
    requestKey(request.requestId),
    JSON.stringify({ ...request, completed: true }),
  );
  if (request.legacy)
    storage.removeItem(
      request.kind === 'initialize'
        ? pendingCartKey()
        : request.kind === 'order'
          ? pendingOrderKey(request.cartId!)
          : pendingCartKey(request.cartId),
    );
}
async function adoptInitialization(
  storage: Storage,
  request: RecoveryRequest,
  cart: ShoppingCartView,
) {
  if (request.cartId || !storage.withLock) return;
  await storage.withLock('store.cart.identity', () => {
    // Compare the original identity before adopting; a late response cannot switch carts.
    if (
      !storage.getItem(currentCartKey) &&
      (request.legacy ||
        storage.getItem(initializationKey) === request.initializationId)
    )
      storage.setItem(currentCartKey, cart.cartId);
  });
}
function persistRequest(storage: Storage, request: RecoveryRequest) {
  if (!storage.keys) throw Error('LOCAL_STORAGE_UNAVAILABLE');
  const old = storage.getItem(requestKey(request.requestId));
  if (
    old &&
    JSON.stringify({ ...JSON.parse(old), completed: undefined }) !==
      JSON.stringify(request)
  )
    throw Error('LOCAL_RECOVERY_INVALID');
  storage.setItem(requestKey(request.requestId), JSON.stringify(request));
}
// Each request owns its own durable slot. No cart-wide busy flag or recovery queue.
export class CartCommands {
  private active = new Set<string>();
  constructor(
    private storage: Storage,
    private transport: Transport = httpTransport,
  ) {}
  list() {
    return pendingRequests(this.storage).filter((r) => r.kind !== 'order');
  }
  hasPending(id?: string) {
    return this.list().some((r) => !id || r.cartId === id);
  }
  async add(input: z.infer<typeof addCartItemInput>, entrance?: 'webmcp') {
    const parsed = addCartItemInput.safeParse(input);
    if (!parsed.success) return fail('VALIDATION_ERROR');
    return this.start({
      kind: 'cart',
      requestId: input.operationRequestId,
      ...('cartId' in input
        ? { cartId: input.cartId }
        : { initializationId: input.initializationId }),
      path: `${entrance ? '/webmcp' : ''}/carts/add`,
      body: parsed.data,
    });
  }
  async operate(
    cartId: string,
    input: z.infer<typeof persistentCartOperationInput>,
  ) {
    const parsed = persistentCartOperationInput.safeParse(input);
    if (!parsed.success) return fail('VALIDATION_ERROR');
    return this.start({
      kind: 'cart',
      cartId,
      requestId: input.operationRequestId,
      path: `/carts/${encodeURIComponent(cartId)}/operations`,
      body: parsed.data,
    });
  }
  private async start(
    request: RecoveryRequest,
  ): Promise<Call<ShoppingCartView>> {
    try {
      persistRequest(this.storage, request);
    } catch {
      return fail('LOCAL_STORAGE_UNAVAILABLE');
    }
    return this.retry(request.requestId);
  }
  async query(requestId: string) {
    const request = this.list().find((r) => r.requestId === requestId);
    if (!request) return fail('NO_PENDING_REQUEST');
    return queryRequest(this.storage, request, this.transport);
  }
  async retry(requestId: string): Promise<Call<ShoppingCartView>> {
    if (this.active.has(requestId)) return fail('REQUEST_BUSY');
    let request: RecoveryRequest;
    try {
      const found = this.list().find((r) => r.requestId === requestId);
      if (!found) return fail('NO_PENDING_REQUEST');
      if (found.legacy || !found.path) return fail('LEGACY_RECOVERY_REQUIRED');
      request = found;
    } catch {
      return fail('LOCAL_STORAGE_UNAVAILABLE');
    }
    this.active.add(requestId);
    try {
      const result = await shoppingRequest(
        request.path!,
        shoppingCartViewOutput.refine(
          (c) => !request.cartId || c.cartId === request.cartId,
        ),
        request.body,
        this.transport,
      );
      if (result.kind !== 'unknown') {
        try {
          if (result.kind === 'success') {
            rememberResult(this.storage, request.requestId, {
              status: 'found',
              kind: 'cart',
              cart: result.data,
            });
            await adoptInitialization(this.storage, request, result.data);
          }
          completeRequest(this.storage, request);
        } catch {
          if (result.kind === 'success')
            return { ...result, recoveryWarning: true };
        }
      }
      return result;
    } finally {
      this.active.delete(requestId);
    }
  }
}
export async function createCartOrder(
  storage: Storage,
  id: string,
  input?: z.infer<typeof createOrderInput>,
  entrance?: 'webmcp',
  transport: Transport = httpTransport,
  requestId?: string,
  selectionOwnership?: PurchaseSelection,
  draftOwnership?: Record<string, string>,
) {
  let request: RecoveryRequest;
  try {
    if (input) {
      const parsed = createOrderInput.safeParse(input);
      if (!parsed.success) return fail('VALIDATION_ERROR');
      request = {
        kind: 'order',
        cartId: id,
        requestId: input.requestId,
        ...(selectionOwnership ? { selectionOwnership } : {}),
        ...(draftOwnership ? { draftOwnership } : {}),
        body: parsed.data,
        path: `${entrance === 'webmcp' ? '/webmcp' : ''}/carts/${encodeURIComponent(id)}/orders`,
      };
      persistRequest(storage, request);
    } else {
      const found = pendingRequests(storage).find(
        (r) =>
          r.kind === 'order' &&
          r.cartId === id &&
          (!requestId || r.requestId === requestId),
      );
      if (!found) return fail('NO_PENDING_REQUEST');
      if (found.legacy || !found.path) return fail('LEGACY_RECOVERY_REQUIRED');
      request = found;
    }
  } catch {
    return fail('LOCAL_STORAGE_UNAVAILABLE');
  }
  const response = await shoppingRequest(
    request.path!,
    z.object({
      order: orderViewOutput.refine((o) => o.cartId === id),
      cart: shoppingCartViewOutput.refine((c) => c.cartId === id),
    }),
    request.body,
    transport,
  );
  if (response.kind === 'success')
    rememberResult(storage, request.requestId, {
      status: 'found',
      kind: 'order',
      order: response.data.order,
    });
  if (response.kind !== 'unknown') {
    try {
      if (response.kind === 'success')
        storage.setItem(lastCreatedOrderKey(id), response.data.order.orderId);
      completeRequest(storage, request);
    } catch {
      if (response.kind === 'success')
        return { ...response, recoveryWarning: true };
    }
  }
  return response;
}
export function cartFailure(code: string) {
  const messages: Record<string, string> = {
    CART_VERSION_CONFLICT: '購物車已更新，請重新載入並核對內容。',
    CART_NOT_FOUND: '找不到原購物車；請核對保存的連結，不會自動另建車。',
    CART_ITEMS_INVALID: '商品或數量目前無法購買，請調整問題商品。',
    VALIDATION_ERROR: '請輸入有效的商品與正整數數量。',
    CART_RECOVERY_REQUIRED: '上次保存結果未確認，請先查詢結果。',
    LEGACY_RECOVERY_REQUIRED: '舊請求僅支援查詢結果，不會重新執行。',
    INITIALIZATION_LOCK_UNAVAILABLE:
      '此環境不支援安全建立購物車，請使用支援 Web Locks 的瀏覽器。',
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
