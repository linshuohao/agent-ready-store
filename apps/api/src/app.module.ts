import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { CartModule } from './cart/cart.module.js';
@Module({
  controllers: [AppController],
  imports: [CatalogModule, CartModule],
})
export class AppModule {}
