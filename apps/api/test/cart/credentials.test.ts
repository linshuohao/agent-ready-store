import { it, expect } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  CartCredentials,
  cartAccessExpired,
} from '../../src/cart/credentials.js';
it('expires exactly at the fixed 24-hour boundary', () => {
  const created = new Date('2026-10-29T00:00:00.000Z');
  expect(cartAccessExpired(created, new Date('2026-10-29T23:59:59.999Z'))).toBe(
    false,
  );
  expect(cartAccessExpired(created, new Date('2026-10-30T00:00:00.000Z'))).toBe(
    true,
  );
  expect(cartAccessExpired(created, new Date('2026-10-30T00:00:00.001Z'))).toBe(
    true,
  );
});
it('recovers the same capability across restart and rejects wrong tokens and row substitution', () => {
  const key = randomBytes(32).toString('hex');
  const token = randomBytes(32).toString('base64url');
  const id = randomUUID();
  const credentials = new CartCredentials(key);
  const encrypted = credentials.encrypt(id, token);
  expect(encrypted).not.toContain(token);
  expect(new CartCredentials(key).matches(id, encrypted, token)).toBe(true);
  expect(
    credentials.matches(id, encrypted, randomBytes(32).toString('base64url')),
  ).toBe(false);
  expect(() => credentials.matches(randomUUID(), encrypted, token)).toThrow();
  expect(() =>
    new CartCredentials(randomBytes(32).toString('hex')).matches(
      id,
      encrypted,
      token,
    ),
  ).toThrow();
  expect(credentials.scope(token)).toBe(new CartCredentials(key).scope(token));
});
it('requires a stable 256-bit configured key', () => {
  expect(() => new CartCredentials('')).toThrow('CART_ENCRYPTION_KEY');
  expect(() => new CartCredentials('a'.repeat(63))).toThrow(
    'CART_ENCRYPTION_KEY',
  );
});
it('uses the first handoff deadline instead of the creation deadline', () => {
  const created = new Date('2026-10-29T00:00:00Z');
  const issued = new Date('2026-10-29T23:00:00Z');
  expect(
    cartAccessExpired(created, new Date('2026-10-30T00:00:00Z'), issued),
  ).toBe(false);
  expect(
    cartAccessExpired(created, new Date('2026-10-30T23:00:00Z'), issued),
  ).toBe(true);
});
it('recovers the original token and separates service creation scopes from browser scopes', () => {
  const credentials = new CartCredentials('ab'.repeat(32));
  const token = randomBytes(32).toString('base64url');
  const id = randomUUID();
  expect(credentials.recover(id, credentials.encrypt(id, token))).toBe(token);
  expect(credentials.principalScope(token)).not.toBe(credentials.scope(token));
  expect(credentials.principalScope('a')).not.toBe(
    credentials.principalScope('b'),
  );
});
