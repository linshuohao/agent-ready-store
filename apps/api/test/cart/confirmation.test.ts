import { CheckoutConfirmation } from '../../src/cart/confirmation.js';
import { it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';

it('binds confirmation to browser and rejects tampering and expiry without a separate five-minute TTL', async () => {
  const signing = new CheckoutConfirmation(randomBytes(32).toString('hex'));
  const session = randomBytes(32).toString('base64url');
  const payload = {
    cartId: 'a',
    cartVersion: 1,
    purchaseHash: 'b',
    checkoutEpoch: '1',
    issuedAt: 1000,
    expiresAt: 86401000,
  };
  const value = signing.sign(payload, session);
  expect(signing.verify(value, session, 1000 + 6 * 60 * 1000)).toEqual(payload);
  expect(() =>
    signing.verify(value, randomBytes(32).toString('base64url'), 2000),
  ).toThrow('CONFIRMATION_INVALID');
  expect(() => signing.verify(value + 'x', session, 2000)).toThrow(
    'CONFIRMATION_INVALID',
  );
  expect(() => signing.verify(value, session, payload.expiresAt)).toThrow(
    'CREDENTIAL_EXPIRED',
  );
});
