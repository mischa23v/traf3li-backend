/**
 * Type definitions for Traf3li Auth React UI Components
 */

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isMfaEnabled?: boolean;
  isAnonymous?: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
  isNewDevice?: boolean;
  isSuspicious?: boolean;
  suspiciousReasons?: string[];
  suspiciousDetectedAt?: string;
}

export interface MFAStatus {
  mfaEnabled: boolean;
  hasTOTP: boolean;
  hasBackupCodes: boolean;
  remainingCodes?: number;
}

export interface BackupCodes {
  codes: string[];
  remainingCodes: number;
}

export interface PasswordStrengthResult {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export interface ApiError {
  error: boolean;
  message: string;
  messageEn?: string;
  messageAr?: string;
  code?: string;
  errors?: string[];
}

export interface ApiResponse<T = any> {
  error: boolean;
  message?: string;
  messageEn?: string;
  messageAr?: string;
  data?: T;
}

export type OAuthProvider = 'google' | 'microsoft' | 'apple' | 'github' | 'facebook';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export type InputType = 'text' | 'email' | 'password' | 'tel' | 'number';

export interface ComponentStyles {
  container?: React.CSSProperties;
  input?: React.CSSProperties;
  button?: React.CSSProperties;
  label?: React.CSSProperties;
  error?: React.CSSProperties;
  link?: React.CSSProperties;
}
