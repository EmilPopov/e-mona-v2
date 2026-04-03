import { describe, it, expect } from 'vitest';
import { mapFirebaseError, mapZodError, AppErrorCode } from '@/types/errors';
import { ok, fail, isOk, isFail } from '@/types/result';

describe('Result helpers', () => {
  it('ok() creates a success result', () => {
    const result = ok('hello');
    expect(result.success).toBe(true);
    expect(isOk(result)).toBe(true);
    expect(isFail(result)).toBe(false);
    if (isOk(result)) {
      expect(result.data).toBe('hello');
    }
  });

  it('fail() creates a failure result', () => {
    const result = fail({ code: 'test/error', message: 'Something went wrong' });
    expect(result.success).toBe(false);
    expect(isFail(result)).toBe(true);
    expect(isOk(result)).toBe(false);
    if (isFail(result)) {
      expect(result.error.code).toBe('test/error');
      expect(result.error.message).toBe('Something went wrong');
    }
  });

  it('ok() works with different types', () => {
    expect(isOk(ok(42))).toBe(true);
    expect(isOk(ok(null))).toBe(true);
    expect(isOk(ok(undefined))).toBe(true);
    expect(isOk(ok([1, 2, 3]))).toBe(true);
    expect(isOk(ok({ key: 'value' }))).toBe(true);
  });
});

describe('mapFirebaseError', () => {
  it('maps known auth errors to user-friendly messages', () => {
    const error = { code: 'auth/email-already-in-use' };
    const result = mapFirebaseError(error);
    expect(result.code).toBe('auth/email-already-in-use');
    expect(result.message).toBe('This email is already registered.');
    expect(result.originalError).toBe(error);
  });

  it('maps auth/wrong-password', () => {
    const result = mapFirebaseError({ code: 'auth/wrong-password' });
    expect(result.message).toBe('Incorrect password.');
  });

  it('maps auth/user-not-found', () => {
    const result = mapFirebaseError({ code: 'auth/user-not-found' });
    expect(result.message).toBe('No account found with this email.');
  });

  it('maps auth/weak-password', () => {
    const result = mapFirebaseError({ code: 'auth/weak-password' });
    expect(result.message).toBe('Password must be at least 6 characters.');
  });

  it('maps permission-denied', () => {
    const result = mapFirebaseError({ code: 'permission-denied' });
    expect(result.message).toBe('You do not have permission for this action.');
  });

  it('maps not-found', () => {
    const result = mapFirebaseError({ code: 'not-found' });
    expect(result.message).toBe('The requested data was not found.');
  });

  it('returns unknown error for unrecognized codes', () => {
    const result = mapFirebaseError({ code: 'some/unknown-error' });
    expect(result.code).toBe(AppErrorCode.UNKNOWN);
    expect(result.message).toBe('An unexpected error occurred.');
  });

  it('handles non-object errors', () => {
    const result = mapFirebaseError('string error');
    expect(result.code).toBe(AppErrorCode.UNKNOWN);
  });

  it('handles null error', () => {
    const result = mapFirebaseError(null);
    expect(result.code).toBe(AppErrorCode.UNKNOWN);
  });

  it('handles undefined error', () => {
    const result = mapFirebaseError(undefined);
    expect(result.code).toBe(AppErrorCode.UNKNOWN);
  });

  it('preserves original error', () => {
    const original = new Error('boom');
    (original as unknown as { code: string }).code = 'auth/too-many-requests';
    const result = mapFirebaseError(original);
    expect(result.originalError).toBe(original);
    expect(result.message).toBe('Too many attempts. Please try again later.');
  });
});

describe('mapZodError', () => {
  it('formats first issue into AppError', () => {
    const zodError = {
      issues: [
        { path: ['name'], message: 'Required' },
        { path: ['email'], message: 'Invalid email' },
      ],
    };
    const result = mapZodError(zodError);
    expect(result.code).toBe(AppErrorCode.VALIDATION_ERROR);
    expect(result.message).toBe('Invalid name: Required');
  });

  it('joins nested paths with dots', () => {
    const zodError = {
      issues: [
        { path: ['members', 'alice', 'role'], message: 'Invalid enum value' },
      ],
    };
    const result = mapZodError(zodError);
    expect(result.message).toBe('Invalid members.alice.role: Invalid enum value');
  });

  it('handles empty path', () => {
    const zodError = {
      issues: [
        { path: [], message: 'Invalid input' },
      ],
    };
    const result = mapZodError(zodError);
    expect(result.message).toContain('unknown');
  });

  it('preserves original zod error', () => {
    const zodError = {
      issues: [{ path: ['x'], message: 'bad' }],
    };
    const result = mapZodError(zodError);
    expect(result.originalError).toBe(zodError);
  });
});
