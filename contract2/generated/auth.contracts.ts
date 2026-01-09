/**
 * Auth API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Auth } from './models';

// Standard Response Types
export type AuthResponse = ApiResponse<Auth>;
export type AuthListResponse = PaginatedResponse<Auth>;

// From: loginSchema
export interface LoginRequest {
  email: string;
  username: string;
  password: string;
  rememberMe?: boolean;
}

// From: registerSchema
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
}

// From: sendOTPSchema
export interface SendOTPRequest {
  email: string;
  purpose: string;
}

// From: verifyOTPSchema
export interface VerifyOTPRequest {
  email: string;
  otp: string;
  purpose: string;
}

// From: sendPhoneOTPSchema
export interface SendPhoneOTPRequest {
  phone: string;
  purpose: string;
}

// From: verifyPhoneOTPSchema
export interface VerifyPhoneOTPRequest {
  phone: string;
  otp: string;
  purpose: string;
}

// From: checkAvailabilitySchema
export interface CheckAvailabilityRequest {
  email: string;
  username: string;
  phone: string;
}

// From: sendMagicLinkSchema
export interface SendMagicLinkRequest {
  email: string;
  purpose: string;
  redirectUrl?: string;
}

// From: verifyMagicLinkSchema
export interface VerifyMagicLinkRequest {
  token: string;
}

// From: forgotPasswordSchema
export interface ForgotPasswordRequest {
  email: string;
}

// From: resetPasswordSchema
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// From: googleOneTapSchema
export interface GoogleOneTapRequest {
  credential: string;
  firmId?: string;
}
