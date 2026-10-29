import { randomUUID } from 'node:crypto';
import { AppError } from './catalog.js';
import type { Result } from '@store/contracts';
export async function result<T>(
  work: () => T | Promise<T>,
): Promise<Result<T>> {
  const requestId = randomUUID();
  try {
    return { ok: true, data: await work(), requestId };
  } catch (error) {
    const known = error instanceof AppError;
    return {
      ok: false,
      error: {
        code: known ? error.code : 'TEMPORARY_UNAVAILABLE',
        message: known ? error.code : 'Service temporarily unavailable',
        retryable: !known,
      },
      requestId,
    };
  }
}
export function decodeQuery(query: Record<string, unknown>) {
  const decoded = { ...query };
  for (const key of ['offset', 'limit', 'minPrice', 'maxPrice']) {
    const v = decoded[key];
    if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v))
      decoded[key] = Number(v);
  }
  if (decoded.purchasableOnly === 'true') decoded.purchasableOnly = true;
  if (decoded.purchasableOnly === 'false') decoded.purchasableOnly = false;
  return decoded;
}
export const httpStatus: Record<string, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CATALOG_CHANGED: 409,
  TEMPORARY_UNAVAILABLE: 503,
};
