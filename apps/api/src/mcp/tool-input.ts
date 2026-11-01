import type { z } from 'zod';
import { AppError } from '../shared/app-error.js';

/** Keep the public validation error independent of the protocol SDK's parser. */
export function parseToolInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
  return parsed.data;
}
