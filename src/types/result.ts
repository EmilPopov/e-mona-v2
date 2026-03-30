import type { AppError } from './errors';

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function fail(error: AppError): Result<never> {
  return { success: false, error };
}

export function isOk<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true;
}

export function isFail<T>(result: Result<T>): result is { success: false; error: AppError } {
  return result.success === false;
}
