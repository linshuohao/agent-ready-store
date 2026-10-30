import { All, Controller, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '../shared/app-error.js';
import { result } from '../shared/result.js';

// Task 5 replaces these endpoints. Old clients must never execute a legacy purchase on the new model.
@Controller('api/v1')
export class CartController {
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
