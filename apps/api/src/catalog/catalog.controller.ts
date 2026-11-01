import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Res,
  Post,
  Req,
} from '@nestjs/common';
import { productInput } from '@store/contracts';
import { AppError } from '../shared/app-error.js';
import type { Request, Response } from 'express';
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
  @Get('catalog/categories') async categories(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    await this.send(res, () => this.catalog.categories(decodeQuery(query)));
  }
  @Get('products') async search(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    await this.send(res, () => this.catalog.search(decodeQuery(query)));
  }
  @Post('products/search') async grouped(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, () => {
      if (
        req.get('origin') !== process.env.WEB_ORIGIN ||
        !req.is('application/json')
      )
        throw new AppError('FORBIDDEN', 403);
      if (Object.keys(req.query).length)
        throw new AppError('VALIDATION_ERROR', 400);
      return this.catalog.searchGrouped(req.body);
    });
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
