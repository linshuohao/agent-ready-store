import {
  cartResultOutput,
  type CartItem,
  type CartView,
} from '@store/contracts';
export type CartFailure = {
  code: string;
  issues?: { productId: string; code: string }[];
};
export type CartCall =
  | { kind: 'success'; cart: CartView }
  | { kind: 'failure'; error: CartFailure }
  | { kind: 'unknown' };
export type EditIntent = {
  cartId: string;
  expectedCartVersion: number;
  items: CartItem[];
};
export type EditResult = CartCall | { kind: 'conflict'; cart: CartView };
async function request(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<CartCall> {
  try {
    const response = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const parsed = cartResultOutput.safeParse(await response.json());
    if (!parsed.success) return { kind: 'unknown' };
    if (parsed.data.ok && response.ok)
      return { kind: 'success', cart: parsed.data.data };
    if (!parsed.data.ok && response.status < 500)
      return { kind: 'failure', error: parsed.data.error };
    return { kind: 'unknown' };
  } catch {
    return { kind: 'unknown' };
  }
}
export const getCart = (id: string) =>
  request(`/carts/${encodeURIComponent(id)}`);
export const createCart = (input: {
  createRequestId: string;
  cartToken: string;
  items: CartItem[];
}) => request('/carts', 'POST', input);
export const replaceCart = (intent: EditIntent) =>
  request(`/carts/${encodeURIComponent(intent.cartId)}/items`, 'PUT', {
    expectedCartVersion: intent.expectedCartVersion,
    items: intent.items,
  });
export function sameItems(a: CartItem[], b: CartItem[]) {
  const key = (items: CartItem[]) =>
    JSON.stringify(
      items
        .map(({ productId, quantity }) => ({ productId, quantity }))
        .sort((x, y) =>
          x.productId < y.productId ? -1 : x.productId > y.productId ? 1 : 0,
        ),
    );
  return key(a) === key(b);
}
export async function inspectEdit(intent: EditIntent): Promise<EditResult> {
  const result = await getCart(intent.cartId);
  if (result.kind !== 'success') return result;
  if (result.cart.cartVersion <= intent.expectedCartVersion)
    return { kind: 'unknown' };
  return sameItems(result.cart.items, intent.items)
    ? result
    : { kind: 'conflict', cart: result.cart };
}
export const failureText = (failure: CartFailure) => {
  if (failure.code === 'CREDENTIAL_EXPIRED')
    return '購物車已過期，請重新發起購物。';
  if (failure.code === 'FORBIDDEN')
    return '無法存取這個購物車，請確認原連結或重新發起購物。';
  if (failure.code === 'VALIDATION_ERROR')
    return '商品或數量格式有誤，請檢查輸入。';
  if (failure.code === 'CART_ITEMS_INVALID')
    return `部分商品或數量無法購買，請調整。${failure.issues?.map((issue) => issue.productId).join('、') ?? ''}`;
  return '暫時無法完成操作，請保留內容並重試。';
};
