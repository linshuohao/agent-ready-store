import { AppError } from '../shared/app-error.js';

/** A tool-selected recovery hint; protocol serialization preserves the original failure. */
export class ToolError extends AppError {
  constructor(
    error: AppError,
    public readonly recovery: string,
  ) {
    super(error.code, error.status, error.details);
  }
}
