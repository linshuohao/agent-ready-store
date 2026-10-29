import {
  checkoutResultOutput,
  orderResultOutput,
  type CheckoutReview,
  type OrderResult,
  type Result,
} from '@store/contracts';
export type Call<T> =
  | { kind: 'success'; data: T }
  | { kind: 'failure'; code: string }
  | { kind: 'unknown' };
async function request<T>(
  id: string,
  suffix: string,
  schema: {
    safeParse: (
      value: unknown,
    ) => { success: true; data: Result<T> } | { success: false };
  },
  body?: unknown,
): Promise<Call<T>> {
  try {
    const response = await fetch(
      `/api/v1/carts/${encodeURIComponent(id)}/${suffix}`,
      {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers:
          body === undefined
            ? undefined
            : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      },
    );
    const result = schema.safeParse(await response.json());
    if (!result.success) return { kind: 'unknown' };
    if (result.data.ok && response.ok)
      return { kind: 'success', data: result.data.data };
    if (!result.data.ok && response.status < 500)
      return { kind: 'failure', code: result.data.error.code };
    return { kind: 'unknown' };
  } catch {
    return { kind: 'unknown' };
  }
}
export const reviewCheckout = (id: string) =>
  request<CheckoutReview>(id, 'checkout-review', checkoutResultOutput, {});
export const submitOrder = (id: string, confirmation: string) =>
  request<OrderResult>(id, 'orders', orderResultOutput, { confirmation });
export const readOrder = (id: string) =>
  request<OrderResult>(id, 'order', orderResultOutput);
export const pendingKey = (id: string) => `purchasePending:${id}`;
