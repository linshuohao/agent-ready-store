import { Inject, Injectable, Logger } from '@nestjs/common';
import { CartService } from './cart.service.js';
@Injectable()
export class OrderExpiryWorker {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private running: Promise<void> | undefined;
  private readonly logger = new Logger(OrderExpiryWorker.name);
  constructor(@Inject(CartService) private readonly carts: CartService) {}
  onModuleInit() {
    this.run();
  }
  private run() {
    this.running = this.carts
      .expireOrders()
      .then(
        ({ failed }) => {
          for (const { orderId, error } of failed)
            this.logger.error(
              `Order expiration failed for ${orderId}; reservation not changed`,
              error instanceof Error ? error.stack : String(error),
            );
        },
        (error: unknown) => {
          this.logger.error(
            'Order expiration scan failed; reservations remain conservative',
            error instanceof Error ? error.stack : String(error),
          );
        },
      )
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
