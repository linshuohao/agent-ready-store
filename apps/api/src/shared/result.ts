import { randomUUID } from 'node:crypto';
import { AppError } from './app-error.js';
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
