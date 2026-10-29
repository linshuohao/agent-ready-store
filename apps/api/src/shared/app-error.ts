import type { CartIssue } from '@store/contracts';
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly details?: {
      issues?: CartIssue[];
      currentCartVersion?: number;
    },
  ) {
    super(code);
  }
}
