/**
 * Traf3li Auth SDK - TypeScript Type Definitions
 *
 * Comprehensive type definitions for the Traf3li Auth SDK
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Storage adapter type
 */
export type StorageType = 'localStorage' | 'sessionStorage' | 'cookie' | 'memory' | 'custom';

/**
 * OAuth provider types
 */
export type OAuthProvider =
  | 'google'
  | 'microsoft'
  | 'facebook'
  | 'apple'
  | 'okta'
  | 'azure'
  | 'auth0'
  | 'github'
  | 'twitter'
  | 'linkedin'
  | 'custom';

/**
 * Custom storage adapter interface
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
  clear?(): Promise<void> | void;
}

/**
 * SDK Configuration
 */
export interface TrafAuthConfig {
  /** API base URL (e.g., 'https://api.traf3li.com' or 'http://localhost:5000') */
  apiUrl: string;

  /** Storage type for tokens (default: 'localStorage') */
  storageType?: StorageType;

  /** Custom storage adapter (required if storageType is 'custom') */
  storageAdapter?: StorageAdapter;

  /** Storage key prefix (default: 'traf3li_') */
  storageKeyPrefix?: string;

  /** Auto-refresh tokens before expiry (default: true) */
  autoRefreshToken?: boolean;

  /** Token refresh threshold in seconds (default: 60) */
  refreshThreshold?: number;

  /** Persist session across page refreshes (default: true) */
  persistSession?: boolean;

  /** Redirect URL for OAuth callbacks */
  redirectUrl?: string;

  /** Enable debug logging (default: false) */
  debug?: boolean;

  /** Custom headers to include in all requests */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Retry failed requests (default: true) */
  retry?: boolean;

  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;

  /** Enable CSRF protection (default: true) */
  csrfProtection?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// USER & SESSION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * User role
 */
export type UserRole = 'admin' | 'lawyer' | 'client' | 'seller' | 'employee' | 'accountant';

/**
 * Lawyer work mode
 */
export type LawyerWorkMode = 'solo' | 'create_firm' | 'join_firm';

/**
 * User object
 */
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  image?: string;
  description?: string;

  // Location
  country?: string;
  nationality?: string;
  region?: string;
  city?: string;

  // Role & Type
  role: UserRole;
  isSeller?: boolean;
  isAnonymous?: boolean;

  // Lawyer specific
  lawyerMode?: boolean;
  lawyerWorkMode?: LawyerWorkMode;
  isLicensed?: boolean;
  licenseNumber?: string;
  barAssociation?: string;
  yearsOfExperience?: number;
  specializations?: string[];

  // Firm
  firmId?: string;
  firmName?: string;

  // Security
  emailVerified: boolean;
  phoneVerified?: boolean;
  mfaEnabled: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;

  // Custom claims
  customClaims?: Record<string, any>;

  // Permissions
  permissions?: string[];
}

/**
 * Session object
 */
export interface Session {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    browser?: string;
    os?: string;
    device?: string;
    isMobile?: boolean;
  };
  location?: {
    ip: string;
    country?: string;
    city?: string;
    timezone?: string;
  };
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  isCurrent: boolean;
}

/**
 * Authentication result
 */
export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: string;
  tokenType: 'Bearer';
  session?: Session;
  requiresMFA?: boolean;
  mfaToken?: string;
}

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  captchaToken?: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  // Required fields
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;

  // Optional fields
  phone?: string;
  image?: string;
  description?: string;

  // Location
  country?: string;
  nationality?: string;
  region?: string;
  city?: string;

  // Role & Type
  role?: UserRole;
  isSeller?: boolean;

  // Lawyer specific
  lawyerMode?: boolean;
  lawyerWorkMode?: LawyerWorkMode;
  firmData?: FirmData;
  invitationCode?: string;
  isLicensed?: boolean;
  licenseNumber?: string;
  barAssociation?: string;
  yearsOfExperience?: number;
  specializations?: string[];

  // Additional
  captchaToken?: string;
}

/**
 * Firm data for registration
 */
export interface FirmData {
  name: string;
  type?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
}

/**
 * Password change data
 */
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Password reset data
 */
export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

// ═══════════════════════════════════════════════════════════════
// MFA TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * MFA setup result
 */
export interface MFASetupResult {
  secret: string;
  qrCode: string;
  setupKey: string;
  backupCodes?: string[];
}

/**
 * MFA verification data
 */
export interface MFAVerifyData {
  code: string;
  mfaToken?: string;
}

/**
 * MFA status
 */
export interface MFAStatus {
  enabled: boolean;
  backupCodesCount?: number;
  lastUsed?: string;
}

/**
 * Backup codes
 */
export interface BackupCodes {
  codes: string[];
  createdAt: string;
  count: number;
}

// ═══════════════════════════════════════════════════════════════
// PASSWORDLESS TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Magic link data
 */
export interface MagicLinkData {
  email: string;
  redirectUrl?: string;
}

/**
 * OTP data
 */
export interface OTPData {
  email: string;
  purpose?: 'login' | 'verify' | 'passwordless';
}

/**
 * OTP verification data
 */
export interface OTPVerifyData {
  email: string;
  code: string;
}

/**
 * OTP status
 */
export interface OTPStatus {
  sent: boolean;
  expiresAt?: string;
  attemptsRemaining?: number;
}

// ═══════════════════════════════════════════════════════════════
// OAUTH TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * OAuth options
 */
export interface OAuthOptions {
  provider: OAuthProvider;
  redirectUrl?: string;
  scopes?: string[];
  state?: string;
  prompt?: 'none' | 'consent' | 'select_account';
}

/**
 * OAuth callback data
 */
export interface OAuthCallbackData {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * Google One Tap options
 */
export interface GoogleOneTapOptions {
  clientId: string;
  autoSelect?: boolean;
  cancelOnTapOutside?: boolean;
  context?: 'signin' | 'signup' | 'use';
}

// ═══════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Auth state change event
 */
export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'SESSION_EXPIRED' | 'MFA_REQUIRED';

/**
 * Auth state change callback
 */
export type AuthChangeCallback = (event: AuthChangeEvent, session: Session | null) => void;

/**
 * Error callback
 */
export type ErrorCallback = (error: Error) => void;

// ═══════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * API error response
 */
export interface APIError {
  error: boolean;
  message: string;
  messageEn: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

/**
 * API success response
 */
export interface APIResponse<T = any> {
  error: boolean;
  message?: string;
  messageEn?: string;
  data?: T;
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Token storage structure
 */
export interface TokenStorage {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

/**
 * Request options
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  skipAuth?: boolean;
  skipRefresh?: boolean;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Availability check data
 */
export interface AvailabilityCheck {
  field: 'email' | 'username' | 'phone';
  value: string;
}

/**
 * Availability result
 */
export interface AvailabilityResult {
  available: boolean;
  field: string;
  value: string;
  suggestions?: string[];
}

/**
 * Email verification data
 */
export interface EmailVerificationData {
  token: string;
}

/**
 * Onboarding status
 */
export interface OnboardingStatus {
  completed: boolean;
  steps: {
    profile: boolean;
    firm: boolean;
    subscription: boolean;
    preferences: boolean;
  };
  currentStep?: string;
  nextStep?: string;
}

/**
 * Account lockout status
 */
export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil?: string;
  attemptsRemaining?: number;
  maxAttempts: number;
}

/**
 * CSRF token
 */
export interface CSRFToken {
  token: string;
  expiresAt: string;
}

/**
 * Step-up auth challenge
 */
export interface StepUpChallenge {
  challengeId: string;
  method: 'password' | 'mfa' | 'biometric';
  expiresAt: string;
}

/**
 * Step-up auth verification
 */
export interface StepUpVerification {
  challengeId: string;
  credential: string;
}

/**
 * Anonymous user conversion data
 */
export interface AnonymousConversionData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}
