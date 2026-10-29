import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Req,
  Res,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CartService } from './cart.service.js';
import { AppError } from '../shared/app-error.js';
import { result } from '../shared/result.js';

@Controller('api/v1/carts')
export class CartController {
  constructor(@Inject(CartService) private readonly carts: CartService) {}
  private checkRequest(req: Request, write: boolean) {
    if (Object.keys(req.query).length || req.headers['x-cart-token'])
      throw new AppError('VALIDATION_ERROR', 400);
    if (
      write &&
      (req.get('origin') !== process.env.WEB_ORIGIN ||
        !req.is('application/json'))
    )
      throw new AppError('FORBIDDEN', 403);
  }
  private cookie(req: Request, id: string) {
    const matches = (req.headers.cookie ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.startsWith(`cart_${id}=`));
    if (matches.length !== 1) throw new AppError('FORBIDDEN', 403);
    return matches[0].slice(`cart_${id}=`.length);
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
    res
      .status(res.statusCode === 201 && response.ok ? 201 : status)
      .json(response);
  }
  @Post() async create(@Req() req: Request, @Res() res: Response) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      const created = await this.carts.create(req.body);
      const origin = new URL(process.env.WEB_ORIGIN!);
      const local =
        origin.protocol === 'http:' &&
        ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname);
      res.cookie(`cart_${created.cart.cartId}`, req.body.cartToken, {
        httpOnly: true,
        sameSite: 'strict',
        path: '/api/v1',
        secure: !(local && process.env.CART_COOKIE_SECURE === 'false'),
        expires: new Date(created.cart.expiresAt),
      });
      res.status(created.replayed ? 200 : 201);
      return created.cart;
    });
  }
  @Get(':id') async get(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, false);
      if (req.body && Object.keys(req.body).length)
        throw new AppError('VALIDATION_ERROR', 400);
      return this.carts.get(id, this.cookie(req, id));
    });
  }
  @Put(':id/items') async replace(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.send(res, async () => {
      this.checkRequest(req, true);
      return this.carts.replace(id, this.cookie(req, id), req.body);
    });
  }
}
