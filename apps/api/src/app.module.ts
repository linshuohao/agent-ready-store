import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { CatalogModule } from './catalog/catalog.module.js';
@Module({
  controllers: [AppController],
  imports: [CatalogModule],
})
export class AppModule {}
