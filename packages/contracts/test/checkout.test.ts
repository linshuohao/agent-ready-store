import { describe, it, expect } from 'vitest';
import { orderSubmitInput } from '../src/index.js';

describe('Checkout boundary DTOs', () => {
  it('accepts only an independent confirmation, never client price or approval assertions', () => {
    const schema = orderSubmitInput;
    expect(schema, 'order submission schema must exist').toBeDefined();
    expect(schema.safeParse({ confirmation: 'signed-material' }).success).toBe(
      true,
    );
    for (const input of [
      { userApproved: true },
      { confirmation: 'x', price: '1.00' },
      { confirmation: '' },
    ]) {
      expect(schema.safeParse(input).success).toBe(false);
    }
  });
});
