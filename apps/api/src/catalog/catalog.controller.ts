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
  Body,
  UseGuards,
} from '@nestjs/common';
import { productInput } from '@store/contracts';
import { CatalogService } from './catalog.service.js';
import {
  HttpResultFilter,
  HttpResultInterceptor,
} from '../shared/http-result.js';
import { CatalogQueryPipe } from './http-query.js';
import { EmptyQueryGuard, JsonOriginGuard } from '../shared/request-guards.js';
import { ZodValidationPipe } from '../shared/zod-validation.pipe.js';
@UseInterceptors(HttpResultInterceptor)
@UseFilters(HttpResultFilter)
@Controller('api/v1')
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}
  @Get('catalog/categories') async categories(
    @Query(CatalogQueryPipe) query: Record<string, unknown>,
  ) {
    return this.catalog.categories(query);
  }
  @Get('products') async search(
    @Query(CatalogQueryPipe) query: Record<string, unknown>,
  ) {
    return this.catalog.search(query);
  }
  @HttpCode(200)
  @Post('products/search')
  @UseGuards(JsonOriginGuard, EmptyQueryGuard)
  async grouped(@Body() body: unknown) {
    return this.catalog.searchGrouped(body);
  }
  @Get('products/:id/reviews') async reviews(
    @Param('id') id: string,
    @Query(CatalogQueryPipe) query: Record<string, unknown>,
  ) {
    return this.catalog.reviews(id, query);
  }
  @Get('products/:id')
  @UseGuards(EmptyQueryGuard)
  async get(
    @Param('id', new ZodValidationPipe(productInput.shape.productId))
    id: string,
  ) {
    return this.catalog.get(id);
  }
}
