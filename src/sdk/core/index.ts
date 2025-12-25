/**
 * Traf3li Auth SDK - Core
 *
 * Production-ready authentication SDK for Traf3li
 *
 * @packageDocumentation
 */

// ═══════════════════════════════════════════════════════════════
// MAIN CLIENT
// ═══════════════════════════════════════════════════════════════

export { TrafAuthClient } from './client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type {
  // Configuration
  TrafAuthConfig,
  StorageType,
  StorageAdapter,
  OAuthProvider,

  // User & Session
  User,
  UserRole,
  Session,
  LawyerWorkMode,

  // Authentication
  AuthResult,
  LoginCredentials,
  RegisterData,
  FirmData,
  ChangePasswordData,
  ResetPasswordData,

  // MFA
  MFASetupResult,
  MFAVerifyData,
  MFAStatus,
  BackupCodes,

  // Passwordless
  MagicLinkData,
  OTPData,
  OTPVerifyData,
  OTPStatus,

  // OAuth
  OAuthOptions,
  OAuthCallbackData,
  GoogleOneTapOptions,

  // Events
  AuthChangeEvent,
  AuthChangeCallback,
  ErrorCallback,

  // API
  APIError,
  APIResponse,

  // Utility
  TokenStorage,
  RequestOptions,
  AvailabilityCheck,
  AvailabilityResult,
  EmailVerificationData,
  OnboardingStatus,
  LockoutStatus,
  CSRFToken,
  StepUpChallenge,
  StepUpVerification,
  AnonymousConversionData,
} from './types';

// ═══════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════

export {
  TrafAuthError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  MFARequiredError,
  MFAInvalidError,
  EmailNotVerifiedError,
  AccountLockedError,
  AccountDisabledError,
  UserNotFoundError,
  UserExistsError,
  ValidationError,
  WeakPasswordError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ConfigurationError,
  OAuthError,
  SessionExpiredError,
  SessionNotFoundError,
  PermissionDeniedError,
  CSRFError,
  StorageError,
  parseErrorResponse,
} from './errors';

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

export {
  BaseStorage,
  LocalStorageAdapter,
  SessionStorageAdapter,
  CookieAdapter,
  MemoryAdapter,
  CustomAdapter,
  StorageFactory,
  STORAGE_KEYS,
} from './storage';

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════

export {
  AuthEventEmitter,
  AuthStateHandler,
  createAuthEvents,
} from './events';

// ═══════════════════════════════════════════════════════════════
// HTTP CLIENT
// ═══════════════════════════════════════════════════════════════

export {
  HTTPClient,
  createHTTPClient,
} from './fetch';

export type {
  HTTPClientConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from './fetch';

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

export {
  isBrowser,
  isNode,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  areCookiesAvailable,
  parseJWT,
  isTokenExpired,
  getTokenExpiration,
  getTimeUntilExpiration,
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
  generateRandomString,
  generateUUID,
  deepClone,
  debounce,
  throttle,
  sleep,
  retry,
  formatError,
  safeJSONParse,
  safeJSONStringify,
  buildURL,
  parseQueryString,
  getQueryParam,
  removeQueryParam,
  sanitizeUser,
  isPlainObject,
  deepMerge,
  createTimeoutController,
  log,
  logError,
  base64URLEncode,
  base64URLDecode,
} from './utils';

// ═══════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════

export const VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════

export default TrafAuthClient;
