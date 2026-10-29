import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  controllers: [CatalogController],
  providers: [
    {
      provide: CatalogService,
      useFactory: async () => {
        const service = new CatalogService();
        await service.db.$connect();
        return service;
      },
    },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
