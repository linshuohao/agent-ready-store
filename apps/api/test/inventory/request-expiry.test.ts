import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderExpiryWorker } from '../../src/cart/order-expiry.worker.js';
import type { CartService } from '../../src/cart/cart.service.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('request-triggered expiry', () => {
  it('does not scan at startup and coalesces concurrent requests, then scans again', async () => {
    vi.stubEnv('ORDER_EXPIRY_MODE', 'request');
    let finish!: (value: { failed: never[] }) => void;
    const expireOrders = vi.fn(
      () =>
        new Promise<{ failed: never[] }>((resolve) => {
          finish = resolve;
        }),
    );
    const worker = new OrderExpiryWorker({
      expireOrders,
    } as unknown as CartService);
    worker.onModuleInit();
    expect(expireOrders).not.toHaveBeenCalled();
    const first = worker.beforeRequest();
    expect(worker.beforeRequest()).toBe(first);
    finish({ failed: [] });
    await first;
    expect(expireOrders).toHaveBeenCalledTimes(1);
    const next = worker.beforeRequest();
    finish({ failed: [] });
    await next;
    expect(expireOrders).toHaveBeenCalledTimes(2);
    await worker.onModuleDestroy();
  });

  it('propagates scan errors and retries on the next request', async () => {
    vi.stubEnv('ORDER_EXPIRY_MODE', 'request');
    const log = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const expireOrders = vi
      .fn()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValue({ failed: [] });
    const worker = new OrderExpiryWorker({
      expireOrders,
    } as unknown as CartService);
    await expect(worker.beforeRequest()).rejects.toThrow(
      'database unavailable',
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Request expiration scan failed'),
      expect.any(String),
    );
    await expect(worker.beforeRequest()).resolves.toBeUndefined();
  });

  it('does not scan on requests in the default worker mode', async () => {
    vi.stubEnv('ORDER_EXPIRY_MODE', 'worker');
    const expireOrders = vi.fn();
    const worker = new OrderExpiryWorker({
      expireOrders,
    } as unknown as CartService);
    await worker.beforeRequest();
    expect(expireOrders).not.toHaveBeenCalled();
  });

  it('rejects unknown modes instead of silently disabling cleanup', () => {
    vi.stubEnv('ORDER_EXPIRY_MODE', 'typo');
    expect(() => new OrderExpiryWorker({} as CartService)).toThrow(
      'ORDER_EXPIRY_MODE',
    );
  });
});
