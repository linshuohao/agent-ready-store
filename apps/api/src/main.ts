import type { NestExpressApplication } from '@nestjs/platform-express';
import { attachMcp } from './mcp/mcp.adapter.js';
import { CatalogService } from './catalog/catalog.service.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { json, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bodyParser: false,
});
app.enableShutdownHooks();
app.use(['/api/v1/carts', '/api/v1/handoffs'], json({ limit: '64kb' }));
app.useBodyParser('json', { limit: '100kb' });
app.use(
  (
    error: { type?: string },
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (
      error.type !== 'entity.too.large' &&
      error.type !== 'entity.parse.failed'
    )
      return next(error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        retryable: false,
      },
      requestId: randomUUID(),
    });
  },
);
attachMcp(app.getHttpAdapter().getInstance(), app.get(CatalogService));
await app.listen(
  Number(process.env.PORT ?? 3001),
  process.env.HOST ?? '127.0.0.1',
);
