import { it, expect } from 'vitest';
import { multiplyMoney } from '../src/lib/money';
it('multiplies validated prices in exact cents including large amounts', () => {
  expect(multiplyMoney('1290.00', 2)).toBe('2580.00');
  expect(multiplyMoney('19.99', 3)).toBe('59.97');
  expect(multiplyMoney('0.10', 3)).toBe('0.30');
  expect(multiplyMoney('90071992547409.91', 3)).toBe('270215977642229.73');
});
