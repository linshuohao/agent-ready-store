import type { NestExpressApplication } from '@nestjs/platform-express';
import { attachMcp } from './mcp.js';
import { CatalogService } from './catalog.service.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.enableShutdownHooks();
app.useBodyParser('json', { limit: '100kb' });
attachMcp(app.getHttpAdapter().getInstance(), app.get(CatalogService));
await app.listen(
  Number(process.env.PORT ?? 3001),
  process.env.HOST ?? '127.0.0.1',
);
