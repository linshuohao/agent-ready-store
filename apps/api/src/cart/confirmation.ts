import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../shared/app-error.js';
const payloadSchema = z
  .object({
    cartId: z.string(),
    cartVersion: z.number().int().positive(),
    purchaseHash: z.string(),
    checkoutEpoch: z.string().regex(/^\d+$/),
    issuedAt: z.number().int(),
    expiresAt: z.number().int(),
  })
  .strict();
export type ConfirmationPayload = z.infer<typeof payloadSchema>;
export class CheckoutConfirmation {
  private readonly key: Buffer;
  constructor(key: string) {
    if (!/^[a-f0-9]{64}$/i.test(key))
      throw new Error('Stable CART_ENCRYPTION_KEY required');
    this.key = createHmac('sha256', Buffer.from(key, 'hex'))
      .update('checkout-confirmation-v1')
      .digest();
  }
  private mac(body: string, session: string) {
    return createHmac('sha256', this.key)
      .update(JSON.stringify([body, session]))
      .digest();
  }
  sign(payload: ConfirmationPayload, session: string) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${this.mac(body, session).toString('base64url')}`;
  }
  verify(value: string, session: string, now: number): ConfirmationPayload {
    const parts = value.split('.');
    if (
      parts.length !== 2 ||
      value.length > 4096 ||
      !/^[A-Za-z0-9_-]{43}$/.test(session) ||
      !/^[A-Za-z0-9_-]{43}$/.test(parts[1])
    )
      throw new AppError('CONFIRMATION_INVALID', 403);
    const actual = Buffer.from(parts[1], 'base64url'),
      expected = this.mac(parts[0], session);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new AppError('CONFIRMATION_INVALID', 403);
    let data: unknown;
    try {
      data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    } catch {
      throw new AppError('CONFIRMATION_INVALID', 403);
    }
    const parsed = payloadSchema.safeParse(data);
    if (!parsed.success) throw new AppError('CONFIRMATION_INVALID', 403);
    if (now >= parsed.data.expiresAt)
      throw new AppError('CONFIRMATION_EXPIRED', 409);
    return parsed.data;
  }
}
