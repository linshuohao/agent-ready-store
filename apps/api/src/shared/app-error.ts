import type { CartIssue, ConstraintViolation } from '@store/contracts';
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly details?: {
      issues?: CartIssue[];
      constraintViolations?: ConstraintViolation[];
      pendingOrderIds?: string[];
      pendingOrders?: { orderId: string; orderUrl: string }[];
      currentCartVersion?: number;
    },
  ) {
    super(code);
  }
}
