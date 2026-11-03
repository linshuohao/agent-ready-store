import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from './app-error.js';

function requireJsonOrigin(req: Request) {
  if (
    req.get('origin') !== process.env.WEB_ORIGIN ||
    !req.is('application/json')
  )
    throw new AppError('FORBIDDEN', 403);
}

@Injectable()
export class JsonOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    requireJsonOrigin(context.switchToHttp().getRequest<Request>());
    return true;
  }
}

@Injectable()
export class EmptyQueryGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (Object.keys(context.switchToHttp().getRequest<Request>().query).length)
      throw new AppError('VALIDATION_ERROR', 400);
    return true;
  }
}

export const CartRequestPolicy = Reflector.createDecorator<{
  allowQuery?: boolean;
  retired?: boolean;
}>();

@Injectable()
export class CartRequestGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const policy = this.reflector.get(CartRequestPolicy, context.getHandler());
    // Retired routes must keep their unconditional 410 response.
    if (policy?.retired) return true;
    const req = context.switchToHttp().getRequest<Request>();
    if (
      (!policy?.allowQuery && Object.keys(req.query).length) ||
      req.headers['x-cart-token']
    )
      throw new AppError('VALIDATION_ERROR', 400);
    // Preserve the existing shape-before-Origin rejection order for cart routes.
    if (req.method !== 'GET' && req.method !== 'HEAD') requireJsonOrigin(req);
    return true;
  }
}
