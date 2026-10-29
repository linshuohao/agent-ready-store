import { CheckoutConfirmation } from './confirmation.js';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const cartLifetime = 24 * 60 * 60 * 1000;
export const cartExpiresAt = (createdAt: Date, handoffIssuedAt?: Date | null) =>
  new Date((handoffIssuedAt ?? createdAt).getTime() + cartLifetime);
export const cartAccessExpired = (
  createdAt: Date,
  now: Date,
  handoffIssuedAt?: Date | null,
) => now.getTime() >= cartExpiresAt(createdAt, handoffIssuedAt).getTime();

export class CartCredentials {
  readonly confirmation: CheckoutConfirmation;
  private readonly key: Buffer;
  private readonly scopeKey: Buffer;
  constructor(key: string) {
    if (!/^[a-f0-9]{64}$/i.test(key))
      throw new Error('CART_ENCRYPTION_KEY must be a stable 32-byte hex key');
    this.confirmation = new CheckoutConfirmation(key);
    this.key = Buffer.from(key, 'hex');
    this.scopeKey = createHmac('sha256', this.key)
      .update('cart-creation-scope-v1')
      .digest();
  }
  scope(token: string) {
    return createHmac('sha256', this.scopeKey).update(token).digest('hex');
  }
  principalScope(principal: string) {
    return createHmac('sha256', this.scopeKey)
      .update(JSON.stringify(['mcp-principal-v1', principal]))
      .digest('hex');
  }
  encrypt(cartId: string, token: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(Buffer.from(cartId));
    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);
    return [
      'v1',
      nonce.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }
  recover(cartId: string, encrypted: string) {
    const [version, iv, tag, data] = encrypted.split('.');
    if (version !== 'v1' || !iv || !tag || !data)
      throw new Error('Invalid encrypted cart capability');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAAD(Buffer.from(cartId));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    const expected = Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]);
    return expected.toString('utf8');
  }
  matches(cartId: string, encrypted: string, token: string) {
    const expected = Buffer.from(this.recover(cartId, encrypted));
    const presented = Buffer.from(token);
    return (
      expected.length === presented.length &&
      timingSafeEqual(expected, presented)
    );
  }
}
