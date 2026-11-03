import {
  All,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { z } from 'zod';
import { orderTargetInput } from '@store/contracts';
import { CartService } from './cart.service.js';
import { AppError } from '../shared/app-error.js';
import {
  HttpResultFilter,
  HttpResultInterceptor,
} from '../shared/http-result.js';

import {
  CartRequestGuard,
  CartRequestPolicy,
} from '../shared/request-guards.js';
import { ZodValidationPipe } from '../shared/zod-validation.pipe.js';

const orderContext = orderTargetInput.omit({ orderId: true });
const listQuery = z
  .object({
    offset: z
      .string()
      .regex(/^(0|[1-9]\d*)$/)
      .transform(Number)
      .optional(),
    limit: z
      .string()
      .regex(/^[1-9]\d*$/)
      .transform(Number)
      .optional(),
    pendingOnly: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .strict();
@UseInterceptors(HttpResultInterceptor)
@UseFilters(HttpResultFilter)
@UseGuards(CartRequestGuard)
@Controller('api/v1')
export class CartController {
  constructor(@Inject(CartService) private readonly carts: CartService) {}

  @CartRequestPolicy({ allowQuery: true })
  @Get('shopping/request-result')
  async requestResult(@Query() query: Record<string, unknown>) {
    return this.carts.requestResult(query);
  }

  @HttpCode(200)
  @Post('shopping/carts/add')
  async add(@Body() body: unknown) {
    return this.carts.add(body, 'WEB');
  }

  @HttpCode(200)
  @Post('shopping/webmcp/carts/add')
  async addWebMcp(@Body() body: unknown) {
    return this.carts.add(body, 'WEBMCP');
  }

  @HttpCode(200)
  @Post('shopping/carts')
  async initialize(@Body() body: unknown) {
    return this.carts.getOrCreate(body, 'WEB');
  }

  @HttpCode(200)
  @Post('shopping/webmcp/carts')
  async initializeWebMcp(@Body() body: unknown) {
    return this.carts.getOrCreate(body, 'WEBMCP');
  }

  @HttpCode(200)
  @Post('shopping/webmcp/carts/:id/orders')
  async createWebMcpOrder(@Param('id') id: string, @Body() body: unknown) {
    return this.carts.createOrder(id, body, 'WEBMCP');
  }

  @Get('shopping/carts/:id')
  async get(@Param('id') id: string) {
    return this.carts.get(id);
  }

  @HttpCode(200)
  @Post('shopping/carts/:id/operations')
  async operate(@Param('id') id: string, @Body() body: unknown) {
    return this.carts.operate(id, body);
  }

  @HttpCode(200)
  @Post('shopping/carts/:id/quote')
  async quote(@Param('id') id: string, @Body() body: unknown) {
    return this.carts.quoteSelection(id, body, 'WEB');
  }

  @HttpCode(200)
  @Post('shopping/carts/:id/orders')
  async createOrder(@Param('id') id: string, @Body() body: unknown) {
    return this.carts.createOrder(id, body, 'WEB');
  }

  @CartRequestPolicy({ allowQuery: true })
  @Get('shopping/carts/:id/orders')
  async listOrders(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(listQuery)) query: z.output<typeof listQuery>,
  ) {
    return this.carts.listOrders(id, query);
  }

  @CartRequestPolicy({ allowQuery: true })
  @Get('shopping/orders/:id')
  async getOrder(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(orderContext))
    query: z.output<typeof orderContext>,
  ) {
    return this.carts.getOrder(id, query.cartId);
  }

  // UI interaction only; never registered as an Agent tool. Origin is not human identity proof.
  @HttpCode(200)
  @Post('shopping/orders/:id/pay')
  async payOrder(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(orderContext))
    body: z.output<typeof orderContext>,
  ) {
    return this.carts.payOrder(id, body.cartId);
  }

  @HttpCode(200)
  @Post('shopping/orders/:id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(orderContext))
    body: z.output<typeof orderContext>,
  ) {
    return this.carts.cancelOrder(id, body.cartId);
  }

  // Separate namespace: old clients cannot execute a legacy purchase on the new model.
  @CartRequestPolicy({ retired: true })
  @All([
    'carts',
    'carts/*path',
    'handoffs/*path',
    'orders/*path',
    'order-details/*path',
    'webmcp/*path',
    'order-links/*path',
  ])
  async retired() {
    throw new AppError('CHECKOUT_FLOW_REPLACED', 410);
  }
}
