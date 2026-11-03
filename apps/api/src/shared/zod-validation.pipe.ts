import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { AppError } from './app-error.js';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}
  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    return parsed.data;
  }
}
