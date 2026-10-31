import { describe, it, expect } from 'vitest';
import { mcpResult } from '../../src/mcp/result-guidance.js';
import { result } from '../../src/shared/result.js';
import { AppError } from '../../src/shared/app-error.js';
import { lifecycleErrorOutput } from '@store/contracts';

describe('MCP simulation and recovery contract', () => {
  it('labels successful orders without changing order identity or state', () => {
    const data = { order: { orderId: 'original', status: 'CHECKOUT' } };
    const output = mcpResult({ ok: true, data, requestId: 'trace' });
    expect(output).toMatchObject({
      ok: true,
      environment: {
        mode: 'simulation',
        realPayment: false,
        fulfillment: false,
      },
      data,
    });
    if (!output.ok) throw Error('Expected success');
    expect(output.data).toBe(data);
  });
  it.each([
    'SPEC_MISMATCH',
    'BUDGET_EXCEEDED',
    'CART_VERSION_CONFLICT',
    'REQUEST_CONFLICT',
  ])('preserves known failure %s with a recovery instruction', async (code) => {
    const value = await result(() => {
      throw new AppError(code, 409);
    });
    const output = mcpResult(value);
    expect(output).toMatchObject({
      ok: false,
      error: { code, retryable: false },
      recovery: expect.any(String),
    });
  });
  it('keeps unknown writes uncertain and instructs original-key recovery', async () => {
    const output = mcpResult(
      await result(() => {
        throw Error('private database detail');
      }),
    );
    expect(output).toMatchObject({
      ok: false,
      error: { code: 'TEMPORARY_UNAVAILABLE', retryable: true },
    });
    expect(JSON.stringify(output)).not.toContain('private database detail');
    if (output.ok) throw Error('Expected failure');
    expect(output.recovery).toContain('原请求键及原载荷');
  });
  it('accepts old errors and the additive public constraint detail', () => {
    const old = {
      code: 'SPEC_MISMATCH',
      message: 'SPEC_MISMATCH',
      retryable: false,
    };
    expect(lifecycleErrorOutput.safeParse(old).success).toBe(true);
    expect(
      lifecycleErrorOutput.parse({
        ...old,
        constraintViolations: [
          {
            productId: 'P001',
            field: '连接',
            expected: '蓝牙 5.3',
            actual: null,
          },
        ],
      }).constraintViolations,
    ).toHaveLength(1);
  });
});
