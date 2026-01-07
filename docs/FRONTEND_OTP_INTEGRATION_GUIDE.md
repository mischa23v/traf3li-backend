# Frontend OTP Integration Guide

> **Complete Technical Reference for Email & Phone OTP Implementation**
>
> This guide provides everything the frontend team needs to integrate OTP functionality, including all endpoints, schemas, error codes, rate limits, and implementation examples.

---

## Table of Contents

1. [OTP System Overview](#otp-system-overview)
2. [Email OTP Endpoints](#email-otp-endpoints)
3. [Phone OTP Endpoints](#phone-otp-endpoints)
4. [Data Schemas](#data-schemas)
5. [Rate Limiting & Brute Force Protection](#rate-limiting--brute-force-protection)
6. [Error Codes Reference](#error-codes-reference)
7. [Frontend Implementation Examples](#frontend-implementation-examples)
8. [Testing Guide](#testing-guide)

---

## OTP System Overview

### OTP Format
- **Length**: 6 digits
- **Type**: Numeric only (0-9)
- **Example**: `847293`

### OTP Lifecycle
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Send OTP   │────▶│  User Gets  │────▶│  Verify OTP │
│  (Backend)  │     │  6-digit    │     │  (Frontend) │
└─────────────┘     │  code       │     └─────────────┘
                    └─────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Expiry: 5 minutes    │
              │  Max attempts: 3      │
              │  Cooldown: 1 minute   │
              └───────────────────────┘
```

### Supported Purposes
| Purpose | Description | On Success Returns |
|---------|-------------|-------------------|
| `login` | Passwordless login | JWT tokens (accessToken + refreshToken) |
| `registration` | Email verification during signup | `{ verified: true }` |
| `password_reset` | Reset password flow | `{ resetToken: "..." }` |
| `email_change` | Verify new email address | `{ verified: true }` |
| `verification` | General email verification | `{ verified: true }` |
| `two_factor` | 2FA authentication | `{ verified: true }` |

---

## Email OTP Endpoints

### 1. Send Email OTP

**Endpoint**: `POST /api/auth/send-otp`

**Rate Limit**: 5 requests per minute per email

**Request**:
```typescript
interface SendOTPRequest {
  email: string;      // Required - valid email format
  purpose: string;    // Required - one of the supported purposes
}
```

**Request Example**:
```json
{
  "email": "user@example.com",
  "purpose": "login"
}
```

**Success Response** (200):
```typescript
interface SendOTPResponse {
  success: true;
  message: string;                    // "OTP sent successfully" / "تم إرسال رمز التحقق بنجاح"
  data: {
    email: string;                    // Masked email: "u***r@example.com"
    expiresIn: number;                // Seconds until expiry (300 = 5 min)
    canResendIn: number;              // Seconds until can resend (60 = 1 min)
    remainingAttempts: number;        // OTPs remaining this hour (max 5)
  }
}
```

**Success Response Example**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "email": "u***r@example.com",
    "expiresIn": 300,
    "canResendIn": 60,
    "remainingAttempts": 4
  }
}
```

**Error Responses**:

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | `VALIDATION_ERROR` | "Email is required" | Missing email field |
| 400 | `VALIDATION_ERROR` | "Invalid email format" | Email regex failed |
| 400 | `VALIDATION_ERROR` | "Purpose is required" | Missing purpose field |
| 400 | `VALIDATION_ERROR` | "Invalid purpose" | Purpose not in allowed list |
| 429 | `RATE_LIMITED` | "OTP rate limit exceeded. Please wait X minutes" | 5 OTPs/hour exceeded |
| 429 | `COOLDOWN_ACTIVE` | "Please wait X seconds before requesting another OTP" | 1-min cooldown active |
| 404 | `USER_NOT_FOUND` | "User not found" | For login/password_reset, user doesn't exist |

---

### 2. Verify Email OTP

**Endpoint**: `POST /api/auth/verify-otp`

**Rate Limit**: 10 requests per minute per IP

**Request**:
```typescript
interface VerifyOTPRequest {
  email: string;      // Required - same email used to send OTP
  otp: string;        // Required - 6-digit code (can be string or number)
  purpose: string;    // Required - must match the send purpose
}
```

**Request Example**:
```json
{
  "email": "user@example.com",
  "otp": "847293",
  "purpose": "login"
}
```

**Success Responses by Purpose**:

#### For `login` purpose (200):
```typescript
interface LoginVerifyResponse {
  success: true;
  message: string;
  data: {
    user: {
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      firmId?: string;
      // ... other user fields
    };
    accessToken: string;          // JWT - 15 min expiry
    refreshToken: string;         // JWT - 7-30 days expiry
    expiresIn: number;            // Access token expiry in seconds
  }
}
```

#### For `password_reset` purpose (200):
```typescript
interface PasswordResetVerifyResponse {
  success: true;
  message: string;
  data: {
    resetToken: string;           // Use this to call reset-password endpoint
    expiresIn: number;            // Token expiry in seconds (typically 900 = 15 min)
  }
}
```

#### For `registration`, `email_change`, `verification`, `two_factor` (200):
```typescript
interface GenericVerifyResponse {
  success: true;
  message: string;
  data: {
    verified: true;
    email: string;
  }
}
```

**Error Responses**:

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | `VALIDATION_ERROR` | "Email is required" | Missing email |
| 400 | `VALIDATION_ERROR` | "OTP is required" | Missing OTP |
| 400 | `VALIDATION_ERROR` | "OTP must be 6 digits" | Invalid OTP format |
| 400 | `INVALID_OTP` | "Invalid or expired OTP" | Wrong code or expired |
| 400 | `OTP_EXPIRED` | "OTP has expired" | Past 5-minute window |
| 400 | `MAX_ATTEMPTS_EXCEEDED` | "Maximum verification attempts exceeded" | 3 wrong attempts |
| 429 | `IP_BLOCKED` | "Too many failed attempts. Please try again in X minutes" | Brute force protection |
| 404 | `OTP_NOT_FOUND` | "No OTP found for this email" | No pending OTP exists |

---

### 3. Resend Email OTP

**Endpoint**: `POST /api/auth/resend-otp`

**Rate Limit**: 3 requests per minute per email

**Request**:
```typescript
interface ResendOTPRequest {
  email: string;      // Required
  purpose: string;    // Required - same as original
}
```

**Request Example**:
```json
{
  "email": "user@example.com",
  "purpose": "login"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "OTP resent successfully",
  "data": {
    "email": "u***r@example.com",
    "expiresIn": 300,
    "canResendIn": 60,
    "remainingAttempts": 3
  }
}
```

**Error Responses**:

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | `NO_PENDING_OTP` | "No pending OTP to resend" | Must send OTP first |
| 429 | `COOLDOWN_ACTIVE` | "Please wait X seconds before resending" | 1-min cooldown |
| 429 | `RATE_LIMITED` | "OTP rate limit exceeded" | 5 OTPs/hour exceeded |

---

### 4. Check Email OTP Status

**Endpoint**: `GET /api/auth/otp-status`

**Query Parameters**:
```typescript
interface OTPStatusQuery {
  email: string;      // Required
  purpose: string;    // Required
}
```

**Request Example**:
```
GET /api/auth/otp-status?email=user@example.com&purpose=login
```

**Success Response** (200):
```typescript
interface OTPStatusResponse {
  success: true;
  data: {
    hasPendingOTP: boolean;       // true if unexpired OTP exists
    canResendIn: number | null;   // Seconds until can resend, null if can resend now
    remainingAttempts: number;    // OTPs remaining this hour
    expiresIn: number | null;     // Seconds until current OTP expires
  }
}
```

**Response Example** (has pending OTP):
```json
{
  "success": true,
  "data": {
    "hasPendingOTP": true,
    "canResendIn": 45,
    "remainingAttempts": 3,
    "expiresIn": 180
  }
}
```

**Response Example** (no pending OTP):
```json
{
  "success": true,
  "data": {
    "hasPendingOTP": false,
    "canResendIn": null,
    "remainingAttempts": 5,
    "expiresIn": null
  }
}
```

---

## Phone OTP Endpoints

> **Note**: Phone OTP has stricter rate limits (3/hour vs 5/hour) due to SMS costs.

### 1. Send Phone OTP

**Endpoint**: `POST /api/auth/phone/send-otp`

**Rate Limit**: 3 requests per minute per phone number

**Request**:
```typescript
interface SendPhoneOTPRequest {
  phone: string;      // Required - with country code (e.g., "+966501234567")
  purpose: string;    // Required
}
```

**Request Example**:
```json
{
  "phone": "+966501234567",
  "purpose": "login"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "+966*****4567",
    "expiresIn": 300,
    "canResendIn": 60,
    "remainingAttempts": 2
  }
}
```

**Error Responses**:

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | `VALIDATION_ERROR` | "Phone number is required" | Missing phone |
| 400 | `VALIDATION_ERROR` | "Invalid phone number format" | Must include country code |
| 429 | `RATE_LIMITED` | "SMS rate limit exceeded. Please wait X minutes" | 3 OTPs/hour exceeded |
| 429 | `COOLDOWN_ACTIVE` | "Please wait X seconds before requesting another OTP" | 1-min cooldown |

---

### 2. Verify Phone OTP

**Endpoint**: `POST /api/auth/phone/verify-otp`

**Rate Limit**: 10 requests per minute per IP

**Request**:
```typescript
interface VerifyPhoneOTPRequest {
  phone: string;      // Required - same phone used to send
  otp: string;        // Required - 6-digit code
  purpose: string;    // Required - must match send purpose
}
```

**Request Example**:
```json
{
  "phone": "+966501234567",
  "otp": "847293",
  "purpose": "login"
}
```

**Success Response** - Same structure as Email OTP verify responses based on purpose.

**Error Responses** - Same as Email OTP verify errors.

---

### 3. Resend Phone OTP

**Endpoint**: `POST /api/auth/phone/resend-otp`

**Rate Limit**: 2 requests per minute per phone

**Request**:
```json
{
  "phone": "+966501234567",
  "purpose": "login"
}
```

**Response** - Same structure as Email OTP resend.

---

### 4. Check Phone OTP Status

**Endpoint**: `GET /api/auth/phone/otp-status`

**Query Parameters**:
```
GET /api/auth/phone/otp-status?phone=+966501234567&purpose=login
```

**Response** - Same structure as Email OTP status.

---

## Data Schemas

### Email OTP Model Schema

```typescript
interface EmailOTP {
  // Core fields
  email: string;                  // Indexed, lowercase normalized
  otpHash: string;                // SHA256 hash of OTP (never stored plain)
  salt: string;                   // Random salt for hashing
  purpose: OTPPurpose;            // login, registration, password_reset, etc.

  // Expiration & Attempts
  expiresAt: Date;                // 5 minutes from creation
  attempts: number;               // Failed verification attempts (max 3)
  verified: boolean;              // true after successful verification

  // Rate Limiting
  createdAt: Date;                // For hourly rate limit calculation
  lastAttemptAt: Date;            // For cooldown calculation

  // Security
  ipAddress?: string;             // IP that requested OTP
  userAgent?: string;             // Browser/device info
}

type OTPPurpose =
  | 'login'
  | 'registration'
  | 'password_reset'
  | 'email_change'
  | 'verification'
  | 'two_factor';
```

### Phone OTP Model Schema

```typescript
interface PhoneOTP {
  phone: string;                  // E.164 format with country code
  otpHash: string;                // SHA256 hash
  salt: string;
  purpose: OTPPurpose;
  expiresAt: Date;                // 5 minutes
  attempts: number;               // Max 3
  verified: boolean;
  createdAt: Date;
  lastAttemptAt: Date;
  ipAddress?: string;
  userAgent?: string;
}
```

---

## Rate Limiting & Brute Force Protection

### Email OTP Limits

| Protection | Limit | Window | Reset |
|------------|-------|--------|-------|
| OTPs per email | 5 | 1 hour | Rolling window |
| Resend cooldown | 1 | 1 minute | After each send |
| Verification attempts per OTP | 3 | Until OTP expires | New OTP needed |
| Failed verifications per IP | 10 | 5 minutes | Auto-reset |
| Total requests per IP | 20 | 15 minutes | Auto-reset |

### Phone OTP Limits (Stricter due to SMS costs)

| Protection | Limit | Window | Reset |
|------------|-------|--------|-------|
| OTPs per phone | 3 | 1 hour | Rolling window |
| Resend cooldown | 1 | 1 minute | After each send |
| Verification attempts per OTP | 3 | Until OTP expires | New OTP needed |
| Failed verifications per IP | 10 | 5 minutes | Auto-reset |
| Total requests per IP | 20 | 15 minutes | Auto-reset |

### How Rate Limits Work

```
User requests OTP
       │
       ▼
┌──────────────────┐
│ Check hourly     │──── Exceeded ──── Return 429 RATE_LIMITED
│ limit (5 email/  │                   with waitTime
│ 3 phone)         │
└────────┬─────────┘
         │ OK
         ▼
┌──────────────────┐
│ Check 1-min      │──── Active ────── Return 429 COOLDOWN_ACTIVE
│ cooldown         │                   with remaining seconds
└────────┬─────────┘
         │ OK
         ▼
┌──────────────────┐
│ Generate & Send  │
│ OTP              │
└──────────────────┘
```

### Brute Force Response

When IP is blocked due to too many failed attempts:

```json
{
  "success": false,
  "error": {
    "code": "IP_BLOCKED",
    "message": "Too many failed attempts. Please try again in 5 minutes.",
    "messageAr": "محاولات فاشلة كثيرة. يرجى المحاولة بعد 5 دقائق.",
    "retryAfter": 300
  }
}
```

---

## Error Codes Reference

### Complete Error Code List

```typescript
type OTPErrorCode =
  // Validation Errors (400)
  | 'VALIDATION_ERROR'        // Missing or invalid field
  | 'INVALID_EMAIL'           // Email format invalid
  | 'INVALID_PHONE'           // Phone format invalid
  | 'INVALID_PURPOSE'         // Purpose not in allowed list
  | 'INVALID_OTP_FORMAT'      // OTP not 6 digits

  // OTP State Errors (400)
  | 'INVALID_OTP'             // Wrong OTP code
  | 'OTP_EXPIRED'             // Past 5-minute window
  | 'OTP_NOT_FOUND'           // No pending OTP for email/phone
  | 'NO_PENDING_OTP'          // For resend - nothing to resend
  | 'MAX_ATTEMPTS_EXCEEDED'   // 3 wrong attempts
  | 'OTP_ALREADY_VERIFIED'    // OTP already used

  // Rate Limit Errors (429)
  | 'RATE_LIMITED'            // Hourly limit exceeded
  | 'COOLDOWN_ACTIVE'         // 1-minute cooldown
  | 'IP_BLOCKED'              // Brute force protection

  // User Errors (404)
  | 'USER_NOT_FOUND'          // For login/password_reset purposes

  // Server Errors (500)
  | 'OTP_SEND_FAILED'         // Email/SMS provider error
  | 'INTERNAL_ERROR';         // Unexpected error
```

### Error Response Format

```typescript
interface OTPErrorResponse {
  success: false;
  error: {
    code: OTPErrorCode;
    message: string;          // English message
    messageAr?: string;       // Arabic message (when available)
    field?: string;           // Which field caused error (for validation)
    retryAfter?: number;      // Seconds to wait (for rate limits)
    remainingAttempts?: number; // Attempts left (for verification)
  }
}
```

---

## Frontend Implementation Examples

### React/TypeScript OTP Service

```typescript
// services/otpService.ts

import api from './api'; // Your axios instance

export interface SendOTPParams {
  email?: string;
  phone?: string;
  purpose: 'login' | 'registration' | 'password_reset' | 'email_change' | 'verification' | 'two_factor';
}

export interface VerifyOTPParams extends SendOTPParams {
  otp: string;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  data?: {
    email?: string;
    phone?: string;
    expiresIn: number;
    canResendIn: number;
    remainingAttempts: number;
  };
  error?: {
    code: string;
    message: string;
    messageAr?: string;
    retryAfter?: number;
  };
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  data?: {
    // For login purpose
    user?: any;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    // For password_reset purpose
    resetToken?: string;
    // For other purposes
    verified?: boolean;
  };
  error?: {
    code: string;
    message: string;
    remainingAttempts?: number;
  };
}

class OTPService {
  // Send Email OTP
  async sendEmailOTP(email: string, purpose: string): Promise<OTPResponse> {
    const response = await api.post('/auth/send-otp', { email, purpose });
    return response.data;
  }

  // Send Phone OTP
  async sendPhoneOTP(phone: string, purpose: string): Promise<OTPResponse> {
    const response = await api.post('/auth/phone/send-otp', { phone, purpose });
    return response.data;
  }

  // Verify Email OTP
  async verifyEmailOTP(email: string, otp: string, purpose: string): Promise<VerifyOTPResponse> {
    const response = await api.post('/auth/verify-otp', { email, otp, purpose });
    return response.data;
  }

  // Verify Phone OTP
  async verifyPhoneOTP(phone: string, otp: string, purpose: string): Promise<VerifyOTPResponse> {
    const response = await api.post('/auth/phone/verify-otp', { phone, otp, purpose });
    return response.data;
  }

  // Resend Email OTP
  async resendEmailOTP(email: string, purpose: string): Promise<OTPResponse> {
    const response = await api.post('/auth/resend-otp', { email, purpose });
    return response.data;
  }

  // Resend Phone OTP
  async resendPhoneOTP(phone: string, purpose: string): Promise<OTPResponse> {
    const response = await api.post('/auth/phone/resend-otp', { phone, purpose });
    return response.data;
  }

  // Check Email OTP Status
  async getEmailOTPStatus(email: string, purpose: string): Promise<OTPResponse> {
    const response = await api.get('/auth/otp-status', {
      params: { email, purpose }
    });
    return response.data;
  }

  // Check Phone OTP Status
  async getPhoneOTPStatus(phone: string, purpose: string): Promise<OTPResponse> {
    const response = await api.get('/auth/phone/otp-status', {
      params: { phone, purpose }
    });
    return response.data;
  }
}

export const otpService = new OTPService();
```

### React OTP Input Component

```tsx
// components/OTPInput.tsx

import React, { useState, useRef, useEffect } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  disabled = false,
  error,
  autoFocus = true,
}) => {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, value: string) => {
    // Only allow numeric input
    if (!/^\d*$/.test(value)) return;

    const newValues = [...values];

    // Handle paste of full OTP
    if (value.length > 1) {
      const digits = value.slice(0, length).split('');
      digits.forEach((digit, i) => {
        if (index + i < length) {
          newValues[index + i] = digit;
        }
      });
      setValues(newValues);

      // Focus last filled input or next empty
      const lastIndex = Math.min(index + digits.length - 1, length - 1);
      inputRefs.current[lastIndex]?.focus();

      // Check if complete
      if (newValues.every(v => v !== '')) {
        onComplete(newValues.join(''));
      }
      return;
    }

    newValues[index] = value;
    setValues(newValues);

    // Auto-advance to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newValues.every(v => v !== '')) {
      onComplete(newValues.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pastedData) {
      handleChange(0, pastedData);
    }
  };

  return (
    <div className="otp-input-container">
      <div className="otp-inputs">
        {values.map((value, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={length} // Allow paste
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`otp-input ${error ? 'otp-input-error' : ''}`}
            aria-label={`Digit ${index + 1} of ${length}`}
          />
        ))}
      </div>
      {error && <p className="otp-error">{error}</p>}
    </div>
  );
};
```

### React OTP Verification Flow Component

```tsx
// components/OTPVerification.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { otpService, OTPResponse, VerifyOTPResponse } from '../services/otpService';
import { OTPInput } from './OTPInput';

interface OTPVerificationProps {
  email?: string;
  phone?: string;
  purpose: 'login' | 'registration' | 'password_reset' | 'email_change' | 'verification' | 'two_factor';
  onSuccess: (response: VerifyOTPResponse) => void;
  onError?: (error: any) => void;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  phone,
  purpose,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResendIn, setCanResendIn] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [expiresIn, setExpiresIn] = useState(300);
  const [verificationAttempts, setVerificationAttempts] = useState(3);

  const isEmail = !!email;
  const identifier = email || phone || '';

  // Countdown timer for resend
  useEffect(() => {
    if (canResendIn > 0) {
      const timer = setTimeout(() => setCanResendIn(canResendIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [canResendIn]);

  // Countdown timer for expiry
  useEffect(() => {
    if (expiresIn > 0) {
      const timer = setTimeout(() => setExpiresIn(expiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiresIn]);

  // Send OTP on mount
  useEffect(() => {
    sendOTP();
  }, []);

  const sendOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: OTPResponse = isEmail
        ? await otpService.sendEmailOTP(identifier, purpose)
        : await otpService.sendPhoneOTP(identifier, purpose);

      if (response.success && response.data) {
        setCanResendIn(response.data.canResendIn);
        setRemainingAttempts(response.data.remainingAttempts);
        setExpiresIn(response.data.expiresIn);
        setVerificationAttempts(3); // Reset verification attempts
      } else if (response.error) {
        setError(response.error.message);
        if (response.error.retryAfter) {
          setCanResendIn(response.error.retryAfter);
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to send OTP';
      setError(errorMsg);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (canResendIn > 0 || loading) return;

    setLoading(true);
    setError(null);
    try {
      const response: OTPResponse = isEmail
        ? await otpService.resendEmailOTP(identifier, purpose)
        : await otpService.resendPhoneOTP(identifier, purpose);

      if (response.success && response.data) {
        setCanResendIn(response.data.canResendIn);
        setRemainingAttempts(response.data.remainingAttempts);
        setExpiresIn(response.data.expiresIn);
        setVerificationAttempts(3);
        setError(null);
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (otp: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: VerifyOTPResponse = isEmail
        ? await otpService.verifyEmailOTP(identifier, otp, purpose)
        : await otpService.verifyPhoneOTP(identifier, otp, purpose);

      if (response.success) {
        onSuccess(response);
      } else if (response.error) {
        setError(response.error.message);
        if (response.error.remainingAttempts !== undefined) {
          setVerificationAttempts(response.error.remainingAttempts);
        }
      }
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      setError(errorData?.message || 'Verification failed');
      if (errorData?.remainingAttempts !== undefined) {
        setVerificationAttempts(errorData.remainingAttempts);
      }
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="otp-verification">
      <h2>Enter Verification Code</h2>
      <p className="otp-subtitle">
        We sent a 6-digit code to {isEmail ? email : phone}
      </p>

      <OTPInput
        onComplete={handleVerify}
        disabled={loading || verificationAttempts === 0}
        error={error || undefined}
      />

      {/* Timer and attempts info */}
      <div className="otp-info">
        {expiresIn > 0 ? (
          <p>Code expires in {formatTime(expiresIn)}</p>
        ) : (
          <p className="otp-expired">Code expired. Please request a new one.</p>
        )}

        {verificationAttempts < 3 && (
          <p className="otp-attempts">
            {verificationAttempts} attempt{verificationAttempts !== 1 ? 's' : ''} remaining
          </p>
        )}
      </div>

      {/* Resend button */}
      <div className="otp-resend">
        {canResendIn > 0 ? (
          <p>Resend code in {canResendIn}s</p>
        ) : (
          <button
            onClick={handleResend}
            disabled={loading || remainingAttempts === 0}
            className="resend-button"
          >
            Resend Code
          </button>
        )}

        {remainingAttempts <= 2 && (
          <p className="rate-limit-warning">
            {remainingAttempts} resend{remainingAttempts !== 1 ? 's' : ''} remaining this hour
          </p>
        )}
      </div>

      {loading && <div className="otp-loading">Processing...</div>}
    </div>
  );
};
```

### Complete Login with OTP Flow

```tsx
// pages/LoginWithOTP.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OTPVerification } from '../components/OTPVerification';
import { VerifyOTPResponse } from '../services/otpService';
import { useAuth } from '../hooks/useAuth';

export const LoginWithOTP: React.FC = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuth();

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setStep('otp');
  };

  const handleOTPSuccess = (response: VerifyOTPResponse) => {
    if (response.data?.accessToken && response.data?.refreshToken) {
      // Store tokens
      setTokens(response.data.accessToken, response.data.refreshToken);

      // Store user data
      if (response.data.user) {
        setUser(response.data.user);
      }

      // Redirect to dashboard
      navigate('/dashboard');
    }
  };

  const handleOTPError = (error: any) => {
    console.error('OTP verification failed:', error);
    // Handle specific errors
    if (error.response?.data?.error?.code === 'USER_NOT_FOUND') {
      setError('No account found with this email. Please sign up first.');
      setStep('email');
    }
  };

  if (step === 'otp') {
    return (
      <div className="login-container">
        <button onClick={() => setStep('email')} className="back-button">
          ← Back
        </button>
        <OTPVerification
          email={email}
          purpose="login"
          onSuccess={handleOTPSuccess}
          onError={handleOTPError}
        />
      </div>
    );
  }

  return (
    <div className="login-container">
      <h1>Sign In with Email</h1>
      <form onSubmit={handleEmailSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="submit-button">
          Continue with OTP
        </button>
      </form>
    </div>
  );
};
```

### Password Reset with OTP Flow

```tsx
// pages/PasswordReset.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OTPVerification } from '../components/OTPVerification';
import { VerifyOTPResponse } from '../services/otpService';
import api from '../services/api';

export const PasswordReset: React.FC = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setStep('otp');
  };

  const handleOTPSuccess = (response: VerifyOTPResponse) => {
    if (response.data?.resetToken) {
      setResetToken(response.data.resetToken);
      setStep('newPassword');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/reset-password', {
        resetToken,
        newPassword,
      });

      // Success - redirect to login
      navigate('/login', {
        state: { message: 'Password reset successful. Please log in.' }
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Email input
  if (step === 'email') {
    return (
      <div className="reset-container">
        <h1>Reset Password</h1>
        <form onSubmit={handleEmailSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit">Send Reset Code</button>
        </form>
      </div>
    );
  }

  // Step 2: OTP verification
  if (step === 'otp') {
    return (
      <div className="reset-container">
        <button onClick={() => setStep('email')}>← Back</button>
        <OTPVerification
          email={email}
          purpose="password_reset"
          onSuccess={handleOTPSuccess}
        />
      </div>
    );
  }

  // Step 3: New password
  return (
    <div className="reset-container">
      <h1>Create New Password</h1>
      <form onSubmit={handlePasswordSubmit}>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          minLength={8}
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};
```

---

## Testing Guide

### Test Scenarios Checklist

#### Send OTP Tests
- [ ] Valid email sends OTP successfully
- [ ] Invalid email format returns 400
- [ ] Missing email returns 400
- [ ] Missing purpose returns 400
- [ ] Invalid purpose returns 400
- [ ] 6th OTP in same hour returns 429 RATE_LIMITED
- [ ] Request within 1 minute returns 429 COOLDOWN_ACTIVE
- [ ] Non-existent user for login purpose returns 404

#### Verify OTP Tests
- [ ] Correct OTP verifies successfully
- [ ] Wrong OTP returns 400 INVALID_OTP
- [ ] Expired OTP returns 400 OTP_EXPIRED
- [ ] 4th wrong attempt returns 400 MAX_ATTEMPTS_EXCEEDED
- [ ] Brute force (11 failures in 5 min) returns 429 IP_BLOCKED
- [ ] Login purpose returns tokens
- [ ] Password reset purpose returns resetToken
- [ ] Registration purpose returns verified: true

#### Resend OTP Tests
- [ ] Resend works after cooldown
- [ ] Resend within cooldown returns 429
- [ ] Resend without pending OTP returns 400

#### Status Check Tests
- [ ] Returns correct hasPendingOTP flag
- [ ] Returns correct canResendIn countdown
- [ ] Returns correct remainingAttempts

### Test Data

```javascript
// Test OTPs (for dev/staging environments with OTP bypass)
const TEST_OTPS = {
  bypass: '000000',  // Always works in dev (if enabled)
  valid: '123456',   // Set this in test setup
};

// Test emails
const TEST_EMAILS = {
  existing: 'test@example.com',
  nonExistent: 'nobody@example.com',
  rateLimit: 'ratelimit@example.com',
};
```

### Postman Collection Structure

```
📁 OTP
├── 📁 Email OTP
│   ├── POST Send OTP
│   ├── POST Verify OTP
│   ├── POST Resend OTP
│   └── GET Check Status
├── 📁 Phone OTP
│   ├── POST Send OTP
│   ├── POST Verify OTP
│   ├── POST Resend OTP
│   └── GET Check Status
└── 📁 Error Cases
    ├── Invalid Email Format
    ├── Rate Limit Exceeded
    ├── Wrong OTP
    └── Expired OTP
```

---

## Common Integration Issues & Solutions

### Issue 1: "OTP not being sent"

**Possible Causes**:
1. Rate limit exceeded (check `remainingAttempts` in response)
2. Cooldown active (check `canResendIn` in response)
3. Invalid email format
4. Email service down (check for 500 error)

**Solution**: Always check the response `data` object for rate limit info.

### Issue 2: "Invalid OTP" error for correct code

**Possible Causes**:
1. OTP expired (5-minute window)
2. OTP already verified
3. Purpose mismatch (sent for `login`, verifying for `registration`)
4. Leading zeros stripped (sending `847293` as number `847293` is fine, but `047293` might become `47293`)

**Solution**: Always send OTP as string, ensure purpose matches.

### Issue 3: Rate limit confusion

**Frontend should track**:
- `canResendIn`: Seconds until can request new OTP
- `remainingAttempts`: OTPs left in current hour
- `expiresIn`: Seconds until current OTP expires

**Display to user**: "You can request a new code in X seconds" (canResendIn), not "OTP expires in X seconds" (expiresIn).

### Issue 4: Tokens not received on login OTP verify

**Cause**: Verifying with wrong purpose (not `login`)

**Solution**: Ensure `purpose: "login"` is sent in verify request.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    OTP QUICK REFERENCE                          │
├─────────────────────────────────────────────────────────────────┤
│ OTP Format:    6 numeric digits                                 │
│ OTP Expiry:    5 minutes                                        │
│ Max Attempts:  3 per OTP                                        │
│ Cooldown:      1 minute between sends                           │
│ Hourly Limit:  5 (email) / 3 (phone)                           │
├─────────────────────────────────────────────────────────────────┤
│                     ENDPOINTS                                   │
├─────────────────────────────────────────────────────────────────┤
│ Email Send:    POST /api/auth/send-otp                          │
│ Email Verify:  POST /api/auth/verify-otp                        │
│ Email Resend:  POST /api/auth/resend-otp                        │
│ Email Status:  GET  /api/auth/otp-status?email=X&purpose=Y      │
│                                                                 │
│ Phone Send:    POST /api/auth/phone/send-otp                    │
│ Phone Verify:  POST /api/auth/phone/verify-otp                  │
│ Phone Resend:  POST /api/auth/phone/resend-otp                  │
│ Phone Status:  GET  /api/auth/phone/otp-status?phone=X&purpose=Y│
├─────────────────────────────────────────────────────────────────┤
│                   PURPOSE → RESPONSE                            │
├─────────────────────────────────────────────────────────────────┤
│ login          → { accessToken, refreshToken, user }            │
│ password_reset → { resetToken }                                 │
│ registration   → { verified: true }                             │
│ email_change   → { verified: true }                             │
│ verification   → { verified: true }                             │
│ two_factor     → { verified: true }                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-07 | Initial comprehensive OTP documentation |

---

*This document is automatically generated from the backend codebase. For updates, regenerate from source.*
