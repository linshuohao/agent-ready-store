import { Inject, Injectable, Logger } from '@nestjs/common';
import { CartService } from './cart.service.js';
import { AppError } from '../shared/app-error.js';

@Injectable()
export class OrderExpiryWorker {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private running: Promise<void> | undefined;
  private readonly logger = new Logger(OrderExpiryWorker.name);
  private readonly mode: 'worker' | 'request';

  constructor(@Inject(CartService) private readonly carts: CartService) {
    const mode = process.env.ORDER_EXPIRY_MODE ?? 'worker';
    if (mode !== 'worker' && mode !== 'request')
      throw new Error('ORDER_EXPIRY_MODE must be worker or request');
    this.mode = mode;
  }

  onModuleInit() {
    if (this.mode === 'worker') this.run();
  }

  // Await bounded maintenance inside the request lifetime. Concurrent requests
  // in one instance share work; cross-instance correctness uses DB row locks.
  beforeRequest(): Promise<void> {
    if (this.mode !== 'request') return Promise.resolve();
    if (!this.running)
      this.running = this.sweep()
        .catch((error: unknown) => {
          this.logger.error(
            'Request expiration scan failed; reservations remain conservative',
            error instanceof Error ? error.stack : String(error),
          );
          throw error;
        })
        .finally(() => {
          this.running = undefined;
        });
    return this.running;
  }

  private async sweep() {
    const { failed } = await this.carts.expireOrders();
    for (const { orderId, error } of failed)
      this.logger.error(
        `Order expiration failed for ${orderId}; reservation not changed`,
        error instanceof Error ? error.stack : String(error),
      );
    if (failed.length) throw new AppError('INVENTORY_INCONSISTENT', 503);
  }

  private run() {
    this.running = this.sweep()
      .catch((error: unknown) => {
        this.logger.error(
          'Order expiration scan failed; reservations remain conservative',
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        if (!this.stopped) {
          this.timer = setTimeout(() => this.run(), 1000);
          this.timer.unref();
        }
      });
  }

  async onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await this.running;
  }
}
