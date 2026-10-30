import {
  purchaseResultOutput,
  purchaseMaterialsResultOutput,
  orderResultOutput,
  type PurchaseStatus,
  type PurchaseMaterials,
  type OrderResult,
  type Result,
} from '@store/contracts';
import type { Call } from './commands';
type Output<T> = {
  safeParse(
    value: unknown,
  ): { success: true; data: Result<T> } | { success: false };
};
async function request<T>(
  path: string,
  output: Output<T>,
  body?: unknown,
): Promise<Call<T>> {
  try {
    const response = await fetch(`/api/v1/webmcp${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const result = output.safeParse(await response.json());
    if (!result.success) return { kind: 'unknown' };
    if (response.ok && result.data.ok)
      return { kind: 'success', data: result.data.data };
    if (!result.data.ok && response.status < 500)
      return { kind: 'failure', code: result.data.error.code };
    return { kind: 'unknown' };
  } catch {
    return { kind: 'unknown' };
  }
}
const path = (id: string, reviewId?: string) =>
  `/carts/${encodeURIComponent(id)}/purchases${reviewId ? `/${encodeURIComponent(reviewId)}` : ''}`;
export async function preparePurchase(
  id: string,
  input: { prepareRequestId: string; expectedCartVersion: number },
  current: () => boolean,
): Promise<Call<PurchaseStatus>> {
  try {
    const response = await fetch('/api/v1/webmcp/checkout-session', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(10000),
    });
    if (!current()) return { kind: 'failure', code: 'STALE_CONTEXT' };
    const result = await response.json();
    if (!current()) return { kind: 'failure', code: 'STALE_CONTEXT' };
    if (!response.ok || result?.ok !== true || result?.data?.ready !== true)
      return { kind: 'failure', code: 'CHECKOUT_SESSION_UNAVAILABLE' };
  } catch {
    return { kind: 'unknown' };
  }
  // The preparation request sends the HttpOnly cookie back to the server.
  const result = await request<PurchaseStatus>(
    path(id),
    purchaseResultOutput,
    input,
  );
  return current() ? result : { kind: 'failure', code: 'STALE_CONTEXT' };
}
export const readPurchase = (id: string, reviewId: string) =>
  request<PurchaseStatus>(path(id, reviewId), purchaseResultOutput);
export const readPurchaseMaterials = (id: string, reviewId: string) =>
  request<PurchaseMaterials>(
    `${path(id, reviewId)}/materials`,
    purchaseMaterialsResultOutput,
    {},
  );
export const payPurchase = (id: string, reviewId: string, payToken: string) =>
  request<OrderResult>(`${path(id, reviewId)}/pay`, orderResultOutput, {
    payToken,
  });
export const cancelPurchase = (
  id: string,
  reviewId: string,
  cancelToken: string,
) =>
  request<PurchaseStatus>(
    `${path(id, reviewId)}/cancel`,
    purchaseResultOutput,
    { cancelToken },
  );

export async function orderDetailsRequest(
  orderId: string,
  orderReadToken?: string,
): Promise<Call<OrderResult>> {
  try {
    const response = await fetch(
      orderReadToken === undefined
        ? `/api/v1/orders/${encodeURIComponent(orderId)}/read`
        : '/api/v1/order-links/exchange',
      {
        method: orderReadToken === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers:
          orderReadToken === undefined
            ? undefined
            : { 'Content-Type': 'application/json' },
        body:
          orderReadToken === undefined
            ? undefined
            : JSON.stringify({ orderId, orderReadToken }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const result = orderResultOutput.safeParse(await response.json());
    if (result.success && result.data.ok && response.ok)
      return { kind: 'success', data: result.data.data };
    if (result.success && !result.data.ok && response.status < 500)
      return { kind: 'failure', code: result.data.error.code };
    return { kind: 'unknown' };
  } catch {
    return { kind: 'unknown' };
  }
}
