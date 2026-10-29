import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { CartCredentials } from './credentials.js';
@Module({
  imports: [CatalogModule],
  controllers: [CartController],
  exports: [CartService],
  providers: [
    {
      provide: CartService,
      inject: [CatalogService],
      useFactory: (catalog: CatalogService) =>
        new CartService(
          catalog.catalog,
          catalog.db,
          new CartCredentials(process.env.CART_ENCRYPTION_KEY ?? ''),
        ),
    },
  ],
})
export class CartModule {}
