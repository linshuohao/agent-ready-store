import { randomUUID } from 'node:crypto';
import { AppError } from './app-error.js';
import type { Result } from '@store/contracts';
export async function result<T>(
  work: () => T | Promise<T>,
  operation = 'service',
): Promise<Result<T>> {
  const requestId = randomUUID();
  try {
    return { ok: true, data: await work(), requestId };
  } catch (error) {
    const known = error instanceof AppError;
    if (!known) {
      // Error messages, stacks and causes can contain credentials or SQL values.
      // Emit only bounded internal context and a standard error category.
      const category =
        error instanceof TypeError
          ? 'TypeError'
          : error instanceof RangeError
            ? 'RangeError'
            : 'UnknownError';
      try {
        console.error({
          event: 'service_failure',
          requestId,
          operation: /^[a-zA-Z][a-zA-Z0-9_.:-]{0,63}$/.test(operation)
            ? operation
            : 'service',
          category,
        });
      } catch {
        // A failed diagnostic sink must not replace the original result.
      }
    }
    return {
      ok: false,
      error: {
        code: known ? error.code : 'TEMPORARY_UNAVAILABLE',
        message: known ? error.code : 'Service temporarily unavailable',
        retryable: !known,
        ...(known ? error.details : {}),
      },
      requestId,
    };
  }
}
