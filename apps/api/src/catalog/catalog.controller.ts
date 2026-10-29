import { Controller, Get, Inject, Param, Query, Res } from '@nestjs/common';
import { productInput } from '@store/contracts';
import { AppError } from '../shared/app-error.js';
import type { Response } from 'express';
import { CatalogService } from './catalog.service.js';
import { result } from '../shared/result.js';
import { decodeQuery, httpStatus } from './http-query.js';
@Controller('api/v1')
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}
  private async send(res: Response, work: () => unknown) {
    const r = await result(work);
    res.setHeader('Cache-Control', 'no-store');
    res.status(r.ok ? 200 : (httpStatus[r.error.code] ?? 503)).json(r);
  }
  @Get('products') async search(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    await this.send(res, () => this.catalog.search(decodeQuery(query)));
  }
  @Get('products/:id/reviews') async reviews(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    await this.send(res, () => this.catalog.reviews(id, decodeQuery(query)));
  }
  @Get('products/:id') async get(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    await this.send(res, () => {
      const parsed = productInput.safeParse({ ...query, productId: id });
      if (Object.hasOwn(query, 'productId') || !parsed.success)
        throw new AppError('VALIDATION_ERROR', 400);
      return this.catalog.get(parsed.data.productId);
    });
  }
}
