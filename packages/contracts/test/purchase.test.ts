import { describe, it, expect } from 'vitest';
import * as contracts from '../src/index.js';
const id = '00000000-0000-4000-8000-000000000001';
describe('UI purchase contracts', () => {
  it('accepts only preparation identity/version, never model supplied authority', () => {
    expect(contracts.purchasePrepareInput).toBeDefined();
    const input = { prepareRequestId: id, expectedCartVersion: 1 };
    expect(contracts.purchasePrepareInput.safeParse(input).success).toBe(true);
    for (const field of ['channel', 'actorScope', 'approved', 'price'])
      expect(
        contracts.purchasePrepareInput.safeParse({ ...input, [field]: true })
          .success,
      ).toBe(false);
  });
  it('separates pay and cancellation materials', () => {
    expect(contracts.purchasePayInput).toBeDefined();
    expect(
      contracts.purchasePayInput.safeParse({ payToken: 'signed' }).success,
    ).toBe(true);
    expect(
      contracts.purchasePayInput.safeParse({ cancelToken: 'signed' }).success,
    ).toBe(false);
    expect(
      contracts.purchaseCancelInput.safeParse({ payToken: 'signed' }).success,
    ).toBe(false);
  });
});
