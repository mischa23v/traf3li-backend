/**
 * Traf3li Auth SDK - Error Classes
 *
 * Custom error classes for comprehensive error handling
 */

/**
 * Base error class for all Traf3li Auth errors
 */
export class TrafAuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isAuthError = true;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'TrafAuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the prototype explicitly to fix instanceof checks
    Object.setPrototypeOf(this, TrafAuthError.prototype);
  }

  /**
   * Convert error to JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    };
  }

  /**
   * Check if an error is a TrafAuthError
   */
  static isTrafAuthError(error: any): error is TrafAuthError {
    return error?.isAuthError === true;
  }
}

/**
 * Invalid credentials error (401)
 */
export class InvalidCredentialsError extends TrafAuthError {
  constructor(message: string = 'Invalid email or password', details?: any) {
    super(message, 'INVALID_CREDENTIALS', 401, details);
    this.name = 'InvalidCredentialsError';
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

/**
 * Token expired error (401)
 */
export class TokenExpiredError extends TrafAuthError {
  constructor(message: string = 'Token has expired', details?: any) {
    super(message, 'TOKEN_EXPIRED', 401, details);
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

/**
 * Invalid token error (401)
 */
export class InvalidTokenError extends TrafAuthError {
  constructor(message: string = 'Invalid token', details?: any) {
    super(message, 'INVALID_TOKEN', 401, details);
    this.name = 'InvalidTokenError';
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

/**
 * MFA required error (403)
 */
export class MFARequiredError extends TrafAuthError {
  public readonly mfaToken?: string;

  constructor(message: string = 'Multi-factor authentication required', mfaToken?: string, details?: any) {
    super(message, 'MFA_REQUIRED', 403, details);
    this.name = 'MFARequiredError';
    this.mfaToken = mfaToken;
    Object.setPrototypeOf(this, MFARequiredError.prototype);
  }
}

/**
 * MFA invalid error (401)
 */
export class MFAInvalidError extends TrafAuthError {
  constructor(message: string = 'Invalid MFA code', details?: any) {
    super(message, 'MFA_INVALID', 401, details);
    this.name = 'MFAInvalidError';
    Object.setPrototypeOf(this, MFAInvalidError.prototype);
  }
}

/**
 * Email not verified error (403)
 */
export class EmailNotVerifiedError extends TrafAuthError {
  constructor(message: string = 'Email address not verified', details?: any) {
    super(message, 'EMAIL_NOT_VERIFIED', 403, details);
    this.name = 'EmailNotVerifiedError';
    Object.setPrototypeOf(this, EmailNotVerifiedError.prototype);
  }
}

/**
 * Account locked error (423)
 */
export class AccountLockedError extends TrafAuthError {
  public readonly lockedUntil?: string;

  constructor(message: string = 'Account is locked', lockedUntil?: string, details?: any) {
    super(message, 'ACCOUNT_LOCKED', 423, details);
    this.name = 'AccountLockedError';
    this.lockedUntil = lockedUntil;
    Object.setPrototypeOf(this, AccountLockedError.prototype);
  }
}

/**
 * Account disabled error (403)
 */
export class AccountDisabledError extends TrafAuthError {
  constructor(message: string = 'Account has been disabled', details?: any) {
    super(message, 'ACCOUNT_DISABLED', 403, details);
    this.name = 'AccountDisabledError';
    Object.setPrototypeOf(this, AccountDisabledError.prototype);
  }
}

/**
 * User not found error (404)
 */
export class UserNotFoundError extends TrafAuthError {
  constructor(message: string = 'User not found', details?: any) {
    super(message, 'USER_NOT_FOUND', 404, details);
    this.name = 'UserNotFoundError';
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

/**
 * User already exists error (409)
 */
export class UserExistsError extends TrafAuthError {
  public readonly field?: string;

  constructor(message: string = 'User already exists', field?: string, details?: any) {
    super(message, 'USER_EXISTS', 409, details);
    this.name = 'UserExistsError';
    this.field = field;
    Object.setPrototypeOf(this, UserExistsError.prototype);
  }
}

/**
 * Validation error (422)
 */
export class ValidationError extends TrafAuthError {
  public readonly errors?: Record<string, string[]>;

  constructor(message: string = 'Validation failed', errors?: Record<string, string[]>, details?: any) {
    super(message, 'VALIDATION_ERROR', 422, details);
    this.name = 'ValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Weak password error (422)
 */
export class WeakPasswordError extends TrafAuthError {
  constructor(message: string = 'Password does not meet security requirements', details?: any) {
    super(message, 'WEAK_PASSWORD', 422, details);
    this.name = 'WeakPasswordError';
    Object.setPrototypeOf(this, WeakPasswordError.prototype);
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends TrafAuthError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number, details?: any) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Network error
 */
export class NetworkError extends TrafAuthError {
  public readonly originalError?: Error;

  constructor(message: string = 'Network request failed', originalError?: Error, details?: any) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends TrafAuthError {
  constructor(message: string = 'Request timeout', details?: any) {
    super(message, 'TIMEOUT', 408, details);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends TrafAuthError {
  constructor(message: string = 'Invalid configuration', details?: any) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * OAuth error
 */
export class OAuthError extends TrafAuthError {
  public readonly provider?: string;

  constructor(message: string = 'OAuth authentication failed', provider?: string, details?: any) {
    super(message, 'OAUTH_ERROR', 401, details);
    this.name = 'OAuthError';
    this.provider = provider;
    Object.setPrototypeOf(this, OAuthError.prototype);
  }
}

/**
 * Session expired error (401)
 */
export class SessionExpiredError extends TrafAuthError {
  constructor(message: string = 'Session has expired', details?: any) {
    super(message, 'SESSION_EXPIRED', 401, details);
    this.name = 'SessionExpiredError';
    Object.setPrototypeOf(this, SessionExpiredError.prototype);
  }
}

/**
 * Session not found error (404)
 */
export class SessionNotFoundError extends TrafAuthError {
  constructor(message: string = 'Session not found', details?: any) {
    super(message, 'SESSION_NOT_FOUND', 404, details);
    this.name = 'SessionNotFoundError';
    Object.setPrototypeOf(this, SessionNotFoundError.prototype);
  }
}

/**
 * Permission denied error (403)
 */
export class PermissionDeniedError extends TrafAuthError {
  public readonly requiredPermission?: string;

  constructor(message: string = 'Permission denied', requiredPermission?: string, details?: any) {
    super(message, 'PERMISSION_DENIED', 403, details);
    this.name = 'PermissionDeniedError';
    this.requiredPermission = requiredPermission;
    Object.setPrototypeOf(this, PermissionDeniedError.prototype);
  }
}

/**
 * CSRF token error (403)
 */
export class CSRFError extends TrafAuthError {
  constructor(message: string = 'Invalid CSRF token', details?: any) {
    super(message, 'CSRF_ERROR', 403, details);
    this.name = 'CSRFError';
    Object.setPrototypeOf(this, CSRFError.prototype);
  }
}

/**
 * Storage error
 */
export class StorageError extends TrafAuthError {
  constructor(message: string = 'Storage operation failed', details?: any) {
    super(message, 'STORAGE_ERROR', 500, details);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Parse error response and create appropriate error instance
 */
export function parseErrorResponse(error: any): TrafAuthError {
  // If it's already a TrafAuthError, return it
  if (TrafAuthError.isTrafAuthError(error)) {
    return error;
  }

  // Handle network errors
  if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
    return new NetworkError('Network request failed', error);
  }

  // Handle timeout errors
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return new TimeoutError('Request timeout');
  }

  // Extract error details from response
  const statusCode = error.statusCode || error.status || 500;
  const message = error.messageEn || error.message || 'An error occurred';
  const code = error.code || 'UNKNOWN_ERROR';
  const details = error.details || error;

  // Map common error codes to specific error classes
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return new InvalidCredentialsError(message, details);

    case 'TOKEN_EXPIRED':
    case 'ACCESS_TOKEN_EXPIRED':
    case 'REFRESH_TOKEN_EXPIRED':
      return new TokenExpiredError(message, details);

    case 'INVALID_TOKEN':
    case 'MALFORMED_TOKEN':
      return new InvalidTokenError(message, details);

    case 'MFA_REQUIRED':
      return new MFARequiredError(message, error.mfaToken, details);

    case 'MFA_INVALID':
    case 'INVALID_MFA_CODE':
      return new MFAInvalidError(message, details);

    case 'EMAIL_NOT_VERIFIED':
      return new EmailNotVerifiedError(message, details);

    case 'ACCOUNT_LOCKED':
      return new AccountLockedError(message, error.lockedUntil, details);

    case 'ACCOUNT_DISABLED':
      return new AccountDisabledError(message, details);

    case 'USER_NOT_FOUND':
      return new UserNotFoundError(message, details);

    case 'USER_EXISTS':
    case 'EMAIL_EXISTS':
    case 'USERNAME_EXISTS':
    case 'PHONE_EXISTS':
      return new UserExistsError(message, error.field, details);

    case 'VALIDATION_ERROR':
    case 'INVALID_INPUT':
      return new ValidationError(message, error.errors, details);

    case 'WEAK_PASSWORD':
    case 'PASSWORD_TOO_WEAK':
      return new WeakPasswordError(message, details);

    case 'RATE_LIMIT_EXCEEDED':
    case 'TOO_MANY_REQUESTS':
      return new RateLimitError(message, error.retryAfter, details);

    case 'OAUTH_ERROR':
      return new OAuthError(message, error.provider, details);

    case 'SESSION_EXPIRED':
      return new SessionExpiredError(message, details);

    case 'SESSION_NOT_FOUND':
      return new SessionNotFoundError(message, details);

    case 'PERMISSION_DENIED':
    case 'FORBIDDEN':
      return new PermissionDeniedError(message, error.requiredPermission, details);

    case 'CSRF_ERROR':
    case 'INVALID_CSRF_TOKEN':
      return new CSRFError(message, details);

    default:
      // Map by status code if no specific code match
      if (statusCode === 401) {
        return new InvalidCredentialsError(message, details);
      } else if (statusCode === 403) {
        return new PermissionDeniedError(message, undefined, details);
      } else if (statusCode === 404) {
        return new UserNotFoundError(message, details);
      } else if (statusCode === 409) {
        return new UserExistsError(message, undefined, details);
      } else if (statusCode === 422) {
        return new ValidationError(message, error.errors, details);
      } else if (statusCode === 423) {
        return new AccountLockedError(message, undefined, details);
      } else if (statusCode === 429) {
        return new RateLimitError(message, undefined, details);
      }

      return new TrafAuthError(message, code, statusCode, details);
  }
}
