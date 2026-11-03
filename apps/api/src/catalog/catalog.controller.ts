import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  HttpCode,
  UseFilters,
  UseInterceptors,
  Post,
  Req,
} from '@nestjs/common';
import { productInput } from '@store/contracts';
import { AppError } from '../shared/app-error.js';
import type { Request } from 'express';
import { CatalogService } from './catalog.service.js';
import {
  HttpResultFilter,
  HttpResultInterceptor,
} from '../shared/http-result.js';
import { decodeQuery } from './http-query.js';
@UseInterceptors(HttpResultInterceptor)
@UseFilters(HttpResultFilter)
@Controller('api/v1')
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}
  @Get('catalog/categories') async categories(
    @Query() query: Record<string, unknown>,
  ) {
    return this.catalog.categories(decodeQuery(query));
  }
  @Get('products') async search(@Query() query: Record<string, unknown>) {
    return this.catalog.search(decodeQuery(query));
  }
  @HttpCode(200)
  @Post('products/search')
  async grouped(@Req() req: Request) {
    if (
      req.get('origin') !== process.env.WEB_ORIGIN ||
      !req.is('application/json')
    )
      throw new AppError('FORBIDDEN', 403);
    if (Object.keys(req.query).length)
      throw new AppError('VALIDATION_ERROR', 400);
    return this.catalog.searchGrouped(req.body);
  }
  @Get('products/:id/reviews') async reviews(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.catalog.reviews(id, decodeQuery(query));
  }
  @Get('products/:id') async get(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ) {
    const parsed = productInput.safeParse({ ...query, productId: id });
    if (Object.hasOwn(query, 'productId') || !parsed.success)
      throw new AppError('VALIDATION_ERROR', 400);
    return this.catalog.get(parsed.data.productId);
  }
}
