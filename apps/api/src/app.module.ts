import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { CatalogService } from './catalog.service.js';
@Module({
  controllers: [AppController],
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
})
export class AppModule {}
