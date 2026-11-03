import {
  Catch,
  Inject,
  Injectable,
  type ArgumentsHost,
  type CallHandler,
  type ExceptionFilter,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { mergeMap } from 'rxjs';
import { AppError } from './app-error.js';
import { result } from './result.js';

/** HTTP presentation only; shared services retain transport-independent results. */
@Injectable()
export class HttpResultInterceptor implements NestInterceptor {
  constructor(
    @Inject(HttpAdapterHost) private readonly adapter: HttpAdapterHost,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    this.adapter.httpAdapter.setHeader(
      context.switchToHttp().getResponse(),
      'Cache-Control',
      'no-store',
    );
    return next.handle().pipe(mergeMap((data: unknown) => result(() => data)));
  }
}

@Catch()
export class HttpResultFilter implements ExceptionFilter {
  constructor(
    @Inject(HttpAdapterHost) private readonly adapter: HttpAdapterHost,
  ) {}

  async catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const body = await result(() => {
      throw error;
    });
    this.adapter.httpAdapter.setHeader(response, 'Cache-Control', 'no-store');
    this.adapter.httpAdapter.reply(
      response,
      body,
      error instanceof AppError ? error.status : 503,
    );
  }
}
