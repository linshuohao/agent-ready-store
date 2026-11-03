import {
  All,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  HttpCode,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { orderTargetInput } from '@store/contracts';
import { CartService } from './cart.service.js';
import { AppError } from '../shared/app-error.js';
import {
  HttpResultFilter,
  HttpResultInterceptor,
} from '../shared/http-result.js';

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
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
  return parsed.data;
}

@UseInterceptors(HttpResultInterceptor)
@UseFilters(HttpResultFilter)
@Controller('api/v1')
export class CartController {
  constructor(@Inject(CartService) private readonly carts: CartService) {}

  private checkRequest(req: Request, write: boolean, query = false) {
    if (
      (!query && Object.keys(req.query).length) ||
      req.headers['x-cart-token']
    )
      throw new AppError('VALIDATION_ERROR', 400);
    if (
      write &&
      (req.get('origin') !== process.env.WEB_ORIGIN ||
        !req.is('application/json'))
    )
      throw new AppError('FORBIDDEN', 403);
  }

  @Get('shopping/request-result')
  async requestResult(@Req() req: Request) {
    this.checkRequest(req, false, true);
    return this.carts.requestResult(req.query);
  }

  @HttpCode(200)
  @Post('shopping/carts/add')
  async add(@Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.add(req.body, 'WEB');
  }

  @HttpCode(200)
  @Post('shopping/webmcp/carts/add')
  async addWebMcp(@Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.add(req.body, 'WEBMCP');
  }

  @HttpCode(200)
  @Post('shopping/carts')
  async initialize(@Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.getOrCreate(req.body, 'WEB');
  }

  @HttpCode(200)
  @Post('shopping/webmcp/carts')
  async initializeWebMcp(@Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.getOrCreate(req.body, 'WEBMCP');
  }

  @HttpCode(200)
  @Post('shopping/webmcp/carts/:id/orders')
  async createWebMcpOrder(@Param('id') id: string, @Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.createOrder(id, req.body, 'WEBMCP');
  }

  @Get('shopping/carts/:id')
  async get(@Param('id') id: string, @Req() req: Request) {
    this.checkRequest(req, false);
    return this.carts.get(id);
  }

  @HttpCode(200)
  @Post('shopping/carts/:id/operations')
  async operate(@Param('id') id: string, @Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.operate(id, req.body);
  }

  @HttpCode(200)
  @Post('shopping/carts/:id/quote')
  async quote(@Param('id') id: string, @Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.quoteSelection(id, req.body, 'WEB');
  }

  @HttpCode(200)
  @Post('shopping/carts/:id/orders')
  async createOrder(@Param('id') id: string, @Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.createOrder(id, req.body, 'WEB');
  }

  @Get('shopping/carts/:id/orders')
  async listOrders(@Param('id') id: string, @Req() req: Request) {
    this.checkRequest(req, false, true);
    return this.carts.listOrders(id, parse(listQuery, req.query));
  }

  @Get('shopping/orders/:id')
  async getOrder(@Param('id') id: string, @Req() req: Request) {
    this.checkRequest(req, false, true);
    return this.carts.getOrder(id, parse(orderContext, req.query).cartId);
  }

  // UI interaction only; never registered as an Agent tool. Origin is not human identity proof.
  @HttpCode(200)
  @Post('shopping/orders/:id/pay')
  async payOrder(@Param('id') id: string, @Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.payOrder(id, parse(orderContext, req.body).cartId);
  }

  @HttpCode(200)
  @Post('shopping/orders/:id/cancel')
  async cancelOrder(@Param('id') id: string, @Req() req: Request) {
    this.checkRequest(req, true);
    return this.carts.cancelOrder(id, parse(orderContext, req.body).cartId);
  }

  // Separate namespace: old clients cannot execute a legacy purchase on the new model.
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
