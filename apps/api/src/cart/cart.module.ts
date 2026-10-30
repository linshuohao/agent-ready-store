import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { OrderExpiryWorker } from './order-expiry.worker.js';
@Module({
  imports: [CatalogModule],
  controllers: [CartController],
  exports: [CartService],
  providers: [
    OrderExpiryWorker,
    {
      provide: CartService,
      inject: [CatalogService],
      useFactory: (catalog: CatalogService) =>
        new CartService(catalog.catalog, catalog.db),
    },
  ],
})
export class CartModule {}
