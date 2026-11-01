import { afterEach, expect, it, vi } from 'vitest';
import { result } from '../../src/shared/result.js';
import { AppError } from '../../src/shared/app-error.js';
afterEach(() => vi.restoreAllMocks());
it('correlates unknown errors without logging their secret payload', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const value = await result(() => {
    throw new TypeError('secret-token');
  }, 'cart.read');
  expect(value.ok).toBe(false);
  expect(log).toHaveBeenCalledExactlyOnceWith({
    event: 'service_failure',
    requestId: value.requestId,
    operation: 'cart.read',
    category: 'TypeError',
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain('secret-token');
});
it('keeps known failures quiet and preserves their contract', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const value = await result(() => {
    throw new AppError('VALIDATION_ERROR', 400);
  });
  expect(value).toMatchObject({
    ok: false,
    error: { code: 'VALIDATION_ERROR', retryable: false },
  });
  expect(log).not.toHaveBeenCalled();
});
it('does not let a failed diagnostic sink replace the original failure', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {
    throw new Error('sink');
  });
  await expect(
    result(() => {
      throw new Error('original');
    }),
  ).resolves.toMatchObject({
    ok: false,
    error: { code: 'TEMPORARY_UNAVAILABLE' },
  });
});
