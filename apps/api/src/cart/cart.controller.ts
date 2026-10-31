import {
  All,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { orderTargetInput } from '@store/contracts';
import { CartService } from './cart.service.js';
import { AppError } from '../shared/app-error.js';
import { result } from '../shared/result.js';

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

  private async send(res: Response, work: () => Promise<unknown>) {
    let status = 200;
    const response = await result(async () => {
      try {
        return await work();
      } catch (error) {
        status = error instanceof AppError ? error.status : 503;
        throw error;
      }
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(status).json(response);
  }

  @Post('shopping/carts')
  async initialize(@Req() req: Request, @Res() res: Response) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      return this.carts.getOrCreate(req.body, 'WEB');
    });
  }

  @Post('shopping/webmcp/carts')
  async initializeWebMcp(@Req() req: Request, @Res() res: Response) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      return this.carts.getOrCreate(req.body, 'WEBMCP');
    });
  }

  @Post('shopping/webmcp/carts/:id/orders')
  async createWebMcpOrder(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      return this.carts.createOrder(id, req.body, 'WEBMCP');
    });
  }

  @Get('shopping/carts/:id')
  async get(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, false);
      return this.carts.get(id);
    });
  }

  @Post('shopping/carts/:id/operations')
  async operate(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      return this.carts.operate(id, req.body);
    });
  }

  @Post('shopping/carts/:id/quote')
  async quote(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      return this.carts.quoteSelection(id, req.body, 'WEB');
    });
  }

  @Post('shopping/carts/:id/orders')
  async createOrder(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      return this.carts.createOrder(id, req.body, 'WEB');
    });
  }

  @Get('shopping/carts/:id/orders')
  async listOrders(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, false, true);
      return this.carts.listOrders(id, parse(listQuery, req.query));
    });
  }

  @Get('shopping/orders/:id')
  async getOrder(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, false, true);
      return this.carts.getOrder(id, parse(orderContext, req.query).cartId);
    });
  }

  // UI interaction only; never registered as an Agent tool. Origin is not human identity proof.
  @Post('shopping/orders/:id/pay')
  async payOrder(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      return this.carts.payOrder(id, parse(orderContext, req.body).cartId);
    });
  }

  @Post('shopping/orders/:id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      return this.carts.cancelOrder(id, parse(orderContext, req.body).cartId);
    });
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
  async retired(@Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(410).json(
      await result(() => {
        throw new AppError('CHECKOUT_FLOW_REPLACED', 410);
      }),
    );
  }
}
