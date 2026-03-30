export interface AppError {
  code: string;
  message: string;
  originalError?: unknown;
}

export const AppErrorCode = {
  // Auth
  AUTH_EMAIL_IN_USE: 'auth/email-already-in-use',
  AUTH_WRONG_PASSWORD: 'auth/wrong-password',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  AUTH_WEAK_PASSWORD: 'auth/weak-password',
  AUTH_INVALID_EMAIL: 'auth/invalid-email',
  AUTH_TOO_MANY_REQUESTS: 'auth/too-many-requests',
  AUTH_REQUIRES_LOGIN: 'auth/requires-recent-login',
  AUTH_NETWORK_ERROR: 'auth/network-request-failed',

  // Firestore
  FIRESTORE_PERMISSION_DENIED: 'firestore/permission-denied',
  FIRESTORE_NOT_FOUND: 'firestore/not-found',
  FIRESTORE_ALREADY_EXISTS: 'firestore/already-exists',
  FIRESTORE_UNAVAILABLE: 'firestore/unavailable',

  // Validation
  VALIDATION_ERROR: 'validation/error',

  // Network
  NETWORK_OFFLINE: 'network/offline',

  // Unknown
  UNKNOWN: 'unknown/error',
} as const;

const firebaseErrorMessages: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Invalid email address.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/requires-recent-login': 'Please log in again to continue.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'permission-denied': 'You do not have permission for this action.',
  'not-found': 'The requested data was not found.',
  'already-exists': 'This record already exists.',
  'unavailable': 'Service temporarily unavailable. Try again.',
};

function getFirebaseErrorCode(error: unknown): string | null {
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

export function mapZodError(zodError: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> }): AppError {
  const firstIssue = zodError.issues[0];
  const field = firstIssue?.path.map(String).join('.') || 'unknown';
  return {
    code: AppErrorCode.VALIDATION_ERROR,
    message: `Invalid ${field}: ${firstIssue?.message ?? 'validation failed'}`,
    originalError: zodError,
  };
}

export function mapFirebaseError(error: unknown): AppError {
  const code = getFirebaseErrorCode(error);

  if (code && code in firebaseErrorMessages) {
    return {
      code,
      message: firebaseErrorMessages[code],
      originalError: error,
    };
  }

  return {
    code: AppErrorCode.UNKNOWN,
    message: 'An unexpected error occurred.',
    originalError: error,
  };
}
