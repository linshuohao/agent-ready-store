import { it, expect } from 'vitest';
import { pendingOrderLimit } from '../../src/cart/cart.service.js';
it('rejects unsafe, fractional and nonpositive pending quotas', () => {
  for (const value of [
    '0',
    '-1',
    '1.5',
    '',
    'Infinity',
    '1e2',
    '9007199254740992',
  ])
    expect(() => pendingOrderLimit(value)).toThrow();
  expect(pendingOrderLimit('10')).toBe(10);
});
