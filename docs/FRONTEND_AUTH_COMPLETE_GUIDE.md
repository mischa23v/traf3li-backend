# Frontend Authentication Complete Guide

> **Production-Ready Authentication Implementation**
>
> This guide covers all authentication flows, API contracts, schemas, and implementation details.

---

## Table of Contents

1. [Authentication Flow Overview](#authentication-flow-overview)
2. [Password Login with Email OTP](#password-login-with-email-otp)
3. [OTP Verification](#otp-verification)
4. [Google One-Tap (No OTP)](#google-one-tap-no-otp)
5. [SSO/OAuth (No OTP)](#ssooauth-no-otp)
6. [Password Reset Flow](#password-reset-flow)
7. [Password Change (Breach Handling)](#password-change-breach-handling)
8. [Complete API Reference](#complete-api-reference)
9. [TypeScript Interfaces](#typescript-interfaces)
10. [Frontend Implementation](#frontend-implementation)

---

## Authentication Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION METHODS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  PASSWORD LOGIN  │    │  GOOGLE ONE-TAP  │    │    SSO/OAUTH     │  │
│  │  (Email + Pass)  │    │   (Credential)   │    │  (Provider Auth) │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│           │                       │                       │            │
│           ▼                       │                       │            │
│  ┌──────────────────┐             │                       │            │
│  │  MANDATORY OTP   │             │                       │            │
│  │  (6-digit email) │             │                       │            │
│  └────────┬─────────┘             │                       │            │
│           │                       │                       │            │
│           ▼                       ▼                       ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     TOKENS ISSUED                                │   │
│  │  • accessToken (15 min)                                         │   │
│  │  • refreshToken (7-30 days)                                     │   │
│  │  • Set as httpOnly cookies                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Method Comparison

| Method | OTP Required | Password | Provider Verification |
|--------|--------------|----------|----------------------|
| Password Login | **YES** (Email OTP) | YES | N/A |
| Google One-Tap | NO | NO | Google verifies |
| SSO/SAML | NO | NO | IdP verifies |
| OAuth (Google/Microsoft) | NO | NO | Provider verifies |

---

## Password Login with Email OTP

### Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   /sign-in  │────▶│ POST /login │────▶│   /otp      │────▶│ POST        │
│  Enter email│     │ Returns:    │     │ Enter code  │     │ /verify-otp │
│  + password │     │ requiresOtp │     │ from email  │     │ + token     │
│             │     │ email       │     │             │     │ Returns     │
│             │     │ LOGIN       │     │             │     │ tokens      │
│             │     │ SESSION     │     │             │     │             │
│             │     │ TOKEN ←─────│─────│─────────────│─────│→ REQUIRED   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Security: Login Session Token

The login response includes a `loginSessionToken` which **MUST** be passed to `/verify-otp`.

**Why?** This cryptographically proves that:
1. The password was actually verified (prevents OTP-only bypass attacks)
2. The same client that verified password is verifying OTP
3. IP/device binding for session continuity

**Without this token, OTP verification will FAIL.**

### Step 1: POST /api/auth/login

**Request:**
```typescript
interface LoginRequest {
  email: string;      // or username
  password: string;
  rememberMe?: boolean;
}
```

**Request Example:**
```json
{
  "email": "user@example.com",
  "password": "MySecureP@ss123",
  "rememberMe": true
}
```

**Success Response (200) - OTP Required:**
```typescript
interface LoginOTPResponse {
  error: false;
  requiresOtp: true;              // Key field - redirect to /otp
  code: 'OTP_REQUIRED';
  message: string;                // Arabic
  messageEn: string;              // English
  email: string;                  // Masked: "u***r@example.com"
  expiresIn: number;              // OTP expiry in seconds (300 = 5 min)
  // CRITICAL: Store this and pass to /verify-otp
  loginSessionToken: string;      // Cryptographic proof of password verification
  loginSessionExpiresIn: number;  // Session expiry in seconds (600 = 10 min)
  securityWarning?: {             // Only if password is breached
    type: 'PASSWORD_COMPROMISED';
    message: string;
    messageEn: string;
    breachCount: number;
    requirePasswordChange: true;
  };
}
```

**Success Response Example:**
```json
{
  "error": false,
  "requiresOtp": true,
  "code": "OTP_REQUIRED",
  "message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
  "messageEn": "Verification code sent to your email",
  "email": "u***r@example.com",
  "expiresIn": 300,
  "loginSessionToken": "eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLC...",
  "loginSessionExpiresIn": 600
}
```

**With Breach Warning:**
```json
{
  "error": false,
  "requiresOtp": true,
  "code": "OTP_REQUIRED",
  "message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
  "messageEn": "Verification code sent to your email",
  "email": "u***r@example.com",
  "expiresIn": 300,
  "loginSessionToken": "eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLC...",
  "loginSessionExpiresIn": 600,
  "securityWarning": {
    "type": "PASSWORD_COMPROMISED",
    "message": "تحذير أمني: كلمة المرور الخاصة بك موجودة في قاعدة بيانات التسريبات.",
    "messageEn": "Security Warning: Your password was found in data breach databases.",
    "breachCount": 15234,
    "requirePasswordChange": true
  }
}
```

**Error Responses:**

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | `VALIDATION_ERROR` | Various | Invalid email/password format |
| 401 | `INVALID_CREDENTIALS` | "Invalid credentials" | Wrong email/password |
| 429 | `OTP_RATE_LIMITED` | "OTP rate limit exceeded" | 5 OTPs/hour limit |
| 500 | `OTP_SEND_FAILED` | "Failed to send OTP" | Email service error |

---

## OTP Verification

### Step 2: POST /api/auth/verify-otp

**Request:**
```typescript
interface VerifyOTPRequest {
  email: string;              // Full email (not masked)
  otp: string;                // 6-digit code
  purpose: 'login';           // Must be 'login' for password login flow
  loginSessionToken: string;  // REQUIRED - from login response (proves password was verified)
}
```

**Request Example:**
```json
{
  "email": "user@example.com",
  "otp": "847293",
  "purpose": "login",
  "loginSessionToken": "eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLC..."
}
```

> **CRITICAL**: The `loginSessionToken` is REQUIRED for `purpose: "login"`. Without it, verification will fail with `LOGIN_SESSION_TOKEN_REQUIRED` error. This prevents attackers from bypassing password verification.

**Success Response (200):**
```typescript
interface LoginSuccessResponse {
  success: true;
  message: string;
  messageAr: string;

  // OAuth 2.0 standard (snake_case)
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;           // 900 seconds (15 min)

  // Backwards compatible (camelCase)
  accessToken: string;
  refreshToken: string;

  user: {
    _id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    image?: string;
    phone?: string;
    isSeller?: boolean;
    lawyerMode?: string;
    firmId?: string;
    // Security flags
    mustChangePassword: boolean;    // If true, redirect to password change
    passwordBreached: boolean;       // If true, show warning
  };

  // Only present if password is breached
  securityWarning?: {
    type: 'PASSWORD_COMPROMISED';
    message: string;
    messageEn: string;
    requirePasswordChange: true;
    redirectTo: string;             // '/dashboard/settings/security?action=change-password&reason=breach'
  };
}
```

**Success Response Example:**
```json
{
  "success": true,
  "message": "Login successful",
  "messageAr": "تم تسجيل الدخول بنجاح",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "lawyer",
    "firmId": "507f1f77bcf86cd799439012",
    "mustChangePassword": false,
    "passwordBreached": false
  }
}
```

**With Breach Warning (Redirect Required):**
```json
{
  "success": true,
  "message": "Login successful",
  "messageAr": "تم تسجيل الدخول بنجاح",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "mustChangePassword": true,
    "passwordBreached": true
  },
  "securityWarning": {
    "type": "PASSWORD_COMPROMISED",
    "message": "تحذير أمني: كلمة المرور الخاصة بك موجودة في قاعدة بيانات التسريبات.",
    "messageEn": "Security Warning: Your password was found in data breach databases.",
    "requirePasswordChange": true,
    "redirectTo": "/dashboard/settings/security?action=change-password&reason=breach"
  }
}
```

**Error Responses:**

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | `INVALID_OTP` | "Invalid or expired OTP" | Wrong code |
| 400 | `OTP_EXPIRED` | "OTP has expired" | Past 5-minute window |
| 400 | `MAX_ATTEMPTS_EXCEEDED` | "Maximum attempts exceeded" | 3 wrong attempts |
| 429 | `IP_BLOCKED` | "Too many failed attempts" | Brute force protection |
| 404 | `USER_NOT_FOUND` | "User not found" | User doesn't exist |

---

## Google One-Tap (No OTP)

### POST /api/auth/google/one-tap

Google One-Tap does NOT require OTP - Google verifies the user.

**Request:**
```typescript
interface GoogleOneTapRequest {
  credential: string;   // JWT from Google
  firmId?: string;      // Optional for multi-tenancy
}
```

**Success Response (200):**
```typescript
interface GoogleOneTapResponse {
  error: false;
  message: string;
  messageEn: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;           // true if account just created
  accountLinked: boolean;       // true if linked to existing account
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    image?: string;
    firmId?: string;
    isSoloLawyer?: boolean;
  };
}
```

**Frontend Implementation:**
```tsx
// No OTP redirect needed - direct login
const handleGoogleOneTap = async (credential: string) => {
  const response = await api.post('/auth/google/one-tap', { credential });

  if (response.data.accessToken) {
    // Store tokens and user
    setAuth(response.data);
    // Go directly to dashboard
    navigate('/dashboard');
  }
};
```

---

## SSO/OAuth (No OTP)

SSO and OAuth flows use provider authentication and do NOT require OTP.

### OAuth Flow

1. **GET /api/auth/oauth/authorize?provider=google**
   - Redirects to Google OAuth consent screen

2. **GET /api/auth/oauth/callback?code=...&state=...**
   - Exchanges code for tokens
   - Returns user with access/refresh tokens

---

## Password Reset Flow

### Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  /forgot-pass   │────▶│ POST            │────▶│   /otp          │────▶│ POST            │
│  Enter email    │     │ /send-otp       │     │ Enter code      │     │ /verify-otp     │
│                 │     │ purpose:        │     │                 │     │ Returns         │
│                 │     │ password_reset  │     │                 │     │ resetToken      │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                                                  │
                        ┌─────────────────┐     ┌─────────────────┐              │
                        │   Success!      │◀────│ POST            │◀─────────────┘
                        │  Redirect to    │     │ /reset-password │
                        │  /sign-in       │     │ newPassword +   │
                        │                 │     │ resetToken      │
                        └─────────────────┘     └─────────────────┘
```

### Step 1: Send OTP for Password Reset

**POST /api/auth/send-otp**
```json
{
  "email": "user@example.com",
  "purpose": "password_reset"
}
```

### Step 2: Verify OTP

**POST /api/auth/verify-otp**
```json
{
  "email": "user@example.com",
  "otp": "847293",
  "purpose": "password_reset"
}
```

**Response (different from login):**
```json
{
  "success": true,
  "verified": true,
  "message": "OTP verified. You can now reset your password.",
  "messageAr": "تم التحقق من الرمز. يمكنك الآن إعادة تعيين كلمة المرور.",
  "resetToken": "a1b2c3d4e5f6...",
  "expiresInMinutes": 30
}
```

### Step 3: Reset Password

**POST /api/auth/reset-password**
```typescript
interface ResetPasswordRequest {
  token: string;        // resetToken from verify-otp
  newPassword: string;  // Must pass validation
}
```

**Request:**
```json
{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "NewSecureP@ss456"
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "تم إعادة تعيين كلمة المرور بنجاح",
  "messageEn": "Password has been reset successfully"
}
```

**Error Responses:**

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | `INVALID_TOKEN` | "Invalid or expired reset token" | Token expired or invalid |
| 400 | `WEAK_PASSWORD` | Various | Doesn't meet policy |
| 400 | `PASSWORD_BREACHED` | "Password found in breaches" | HIBP check failed |

---

## Password Change (Breach Handling)

When a user logs in with a breached password, they're redirected to change it.

### POST /api/auth/change-password

**Request:**
```typescript
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
```

**Request:**
```json
{
  "currentPassword": "OldBreachedPass123",
  "newPassword": "NewSecureP@ss789!"
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "Password changed successfully",
  "messageAr": "تم تغيير كلمة المرور بنجاح",
  "data": {
    "passwordChangedAt": "2025-01-07T12:00:00.000Z",
    "passwordExpiresAt": "2025-04-07T12:00:00.000Z",
    "strengthScore": 85,
    "strengthLabel": "strong"
  }
}
```

**Error Responses:**

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | Various | "Password does not meet policy" | Weak password |
| 400 | `PASSWORD_BREACHED` | "Password found in breaches" | New password is also breached |
| 400 | `SAME_PASSWORD` | "Must be different" | Same as current |
| 400 | `PASSWORD_HISTORY` | "Previously used" | In last 12 passwords |
| 401 | `INVALID_PASSWORD` | "Current password incorrect" | Wrong current password |

### Password Policy Requirements

```typescript
interface PasswordPolicy {
  minLength: 8;
  maxLength: 128;
  requireUppercase: true;
  requireLowercase: true;
  requireNumber: true;
  requireSpecial: true;
  checkBreach: true;          // HaveIBeenPwned API
  historyCount: 12;           // Can't reuse last 12
  minStrengthScore: 50;       // zxcvbn score
}
```

---

## Complete API Reference

### Authentication Endpoints

| Endpoint | Method | Description | OTP Required |
|----------|--------|-------------|--------------|
| `/api/auth/login` | POST | Password login | YES (sends OTP) |
| `/api/auth/verify-otp` | POST | Verify OTP | N/A |
| `/api/auth/send-otp` | POST | Send/resend OTP | N/A |
| `/api/auth/resend-otp` | POST | Resend OTP | N/A |
| `/api/auth/otp-status` | GET | Check OTP status | N/A |
| `/api/auth/google/one-tap` | POST | Google One-Tap | NO |
| `/api/auth/oauth/authorize` | GET | Start OAuth flow | NO |
| `/api/auth/forgot-password` | POST | Request reset email | N/A |
| `/api/auth/reset-password` | POST | Reset password | N/A |
| `/api/auth/change-password` | POST | Change password | N/A |
| `/api/auth/refresh` | POST | Refresh tokens | N/A |
| `/api/auth/logout` | POST | Logout | N/A |
| `/api/auth/logout-all` | POST | Logout all devices | N/A |

---

## TypeScript Interfaces

### Complete Type Definitions

```typescript
// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

type OTPPurpose =
  | 'login'
  | 'registration'
  | 'password_reset'
  | 'email_change'
  | 'verification'
  | 'two_factor';

type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'OTP_REQUIRED'
  | 'OTP_RATE_LIMITED'
  | 'OTP_SEND_FAILED'
  | 'OTP_ERROR'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'MAX_ATTEMPTS_EXCEEDED'
  | 'IP_BLOCKED'
  | 'USER_NOT_FOUND'
  | 'INVALID_TOKEN'
  | 'WEAK_PASSWORD'
  | 'PASSWORD_BREACHED'
  | 'PASSWORD_HISTORY'
  | 'ACCOUNT_LOCKED';

type UserRole =
  | 'lawyer'
  | 'client'
  | 'admin'
  | 'paralegal'
  | 'secretary'
  | 'accountant';

// ═══════════════════════════════════════════════════════════════
// REQUEST INTERFACES
// ═══════════════════════════════════════════════════════════════

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface VerifyOTPRequest {
  email: string;
  otp: string;
  purpose: OTPPurpose;
}

interface SendOTPRequest {
  email: string;
  purpose: OTPPurpose;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface GoogleOneTapRequest {
  credential: string;
  firmId?: string;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE INTERFACES
// ═══════════════════════════════════════════════════════════════

interface SecurityWarning {
  type: 'PASSWORD_COMPROMISED';
  message: string;
  messageEn: string;
  breachCount?: number;
  requirePasswordChange: boolean;
  redirectTo?: string;
}

interface User {
  _id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  image?: string;
  phone?: string;
  firmId?: string;
  isSeller?: boolean;
  isSoloLawyer?: boolean;
  lawyerMode?: string;
  mustChangePassword: boolean;
  passwordBreached: boolean;
}

// Login Step 1 Response
interface LoginOTPResponse {
  error: false;
  requiresOtp: true;
  code: 'OTP_REQUIRED';
  message: string;
  messageEn: string;
  email: string;                  // Masked
  expiresIn: number;
  securityWarning?: SecurityWarning;
}

// Login Step 2 Response (OTP verified)
interface LoginSuccessResponse {
  success: true;
  message: string;
  messageAr: string;
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  accessToken: string;
  refreshToken: string;
  user: User;
  securityWarning?: SecurityWarning;
}

// Password Reset OTP Response
interface PasswordResetOTPResponse {
  success: true;
  verified: true;
  message: string;
  messageAr: string;
  resetToken: string;
  expiresInMinutes: number;
}

// Generic Error Response
interface ErrorResponse {
  error: true;
  success?: false;
  message: string;
  messageEn?: string;
  code: AuthErrorCode;
  retryAfter?: number;
  attemptsLeft?: number;
}

// ═══════════════════════════════════════════════════════════════
// API SERVICE
// ═══════════════════════════════════════════════════════════════

interface AuthService {
  // Password login (returns OTP required)
  login(request: LoginRequest): Promise<LoginOTPResponse | ErrorResponse>;

  // Verify OTP (returns tokens for login, resetToken for password_reset)
  verifyOTP(request: VerifyOTPRequest): Promise<LoginSuccessResponse | PasswordResetOTPResponse | ErrorResponse>;

  // Send OTP
  sendOTP(request: SendOTPRequest): Promise<{ success: true; email: string; expiresIn: number }>;

  // Resend OTP
  resendOTP(request: SendOTPRequest): Promise<{ success: true; email: string; expiresIn: number }>;

  // Reset password
  resetPassword(request: ResetPasswordRequest): Promise<{ error: false; message: string }>;

  // Change password
  changePassword(request: ChangePasswordRequest): Promise<{ error: false; data: { strengthScore: number } }>;

  // Google One-Tap (direct login, no OTP)
  googleOneTap(credential: string, firmId?: string): Promise<LoginSuccessResponse>;

  // Refresh tokens
  refreshToken(): Promise<{ accessToken: string; expiresIn: number }>;

  // Logout
  logout(): Promise<void>;
}
```

---

## Frontend Implementation

### Complete Sign-In Page

```tsx
// pages/SignIn.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';

type LoginStep = 'credentials' | 'otp';

export const SignIn = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [securityWarning, setSecurityWarning] = useState<SecurityWarning | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Submit credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });

      if ('requiresOtp' in response && response.requiresOtp) {
        // OTP required - move to OTP step
        setMaskedEmail(response.email);
        setSecurityWarning(response.securityWarning || null);
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.response?.data?.messageEn || err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleOTPVerified = async (response: LoginSuccessResponse) => {
    // Store auth
    setAuth({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });

    // Check if password change is required (breach)
    if (response.user.mustChangePassword || response.securityWarning?.requirePasswordChange) {
      navigate(response.securityWarning?.redirectTo || '/dashboard/settings/security?action=change-password&reason=breach');
    } else {
      navigate('/dashboard');
    }
  };

  // Google One-Tap handler (no OTP needed)
  const handleGoogleOneTap = async (credential: string) => {
    try {
      const response = await authService.googleOneTap(credential);
      setAuth({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
      navigate('/dashboard');
    } catch (err) {
      setError('Google sign-in failed');
    }
  };

  if (step === 'otp') {
    return (
      <OTPVerification
        email={email}
        maskedEmail={maskedEmail}
        purpose="login"
        securityWarning={securityWarning}
        onSuccess={handleOTPVerified}
        onBack={() => setStep('credentials')}
      />
    );
  }

  return (
    <div className="sign-in-container">
      <h1>Sign In</h1>

      {/* Google One-Tap */}
      <GoogleOneTapButton onCredential={handleGoogleOneTap} />

      <div className="divider">or</div>

      {/* Credentials Form */}
      <form onSubmit={handleCredentialsSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Continue'}
        </button>
      </form>

      <a href="/forgot-password">Forgot password?</a>
    </div>
  );
};
```

### OTP Verification Component

```tsx
// components/OTPVerification.tsx
import { useState, useEffect } from 'react';
import { authService } from '@/services/auth';

interface OTPVerificationProps {
  email: string;
  maskedEmail: string;
  purpose: 'login' | 'password_reset' | 'registration';
  securityWarning?: SecurityWarning | null;
  onSuccess: (response: any) => void;
  onBack: () => void;
}

export const OTPVerification = ({
  email,
  maskedEmail,
  purpose,
  securityWarning,
  onSuccess,
  onBack,
}: OTPVerificationProps) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.verifyOTP({
        email,
        otp,
        purpose,
      });

      if (response.success) {
        onSuccess(response);
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.messageEn || errorData?.error || 'Verification failed');

      if (errorData?.attemptsLeft !== undefined) {
        setError(`Invalid code. ${errorData.attemptsLeft} attempts remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      await authService.resendOTP({ email, purpose });
      setCanResend(false);
      setCountdown(60);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.messageEn || 'Failed to resend');
    }
  };

  return (
    <div className="otp-verification">
      <button onClick={onBack} className="back-btn">← Back</button>

      <h2>Enter Verification Code</h2>
      <p>We sent a 6-digit code to {maskedEmail}</p>

      {/* Security Warning Banner */}
      {securityWarning && (
        <div className="security-warning">
          <strong>⚠️ {securityWarning.messageEn}</strong>
          <p>You will be asked to change your password after login.</p>
        </div>
      )}

      <form onSubmit={handleVerify}>
        <OTPInput
          length={6}
          value={otp}
          onChange={setOtp}
          disabled={loading}
        />

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      <div className="resend-section">
        {canResend ? (
          <button onClick={handleResend} className="resend-btn">
            Resend Code
          </button>
        ) : (
          <span>Resend code in {countdown}s</span>
        )}
      </div>
    </div>
  );
};
```

### Auth Service

```typescript
// services/auth.ts
import api from './api';

export const authService = {
  // Password login - returns OTP required response
  async login(data: LoginRequest): Promise<LoginOTPResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Verify OTP - returns tokens for login
  async verifyOTP(data: VerifyOTPRequest): Promise<LoginSuccessResponse | PasswordResetOTPResponse> {
    const response = await api.post('/auth/verify-otp', data);
    return response.data;
  },

  // Send OTP
  async sendOTP(data: SendOTPRequest) {
    const response = await api.post('/auth/send-otp', data);
    return response.data;
  },

  // Resend OTP
  async resendOTP(data: SendOTPRequest) {
    const response = await api.post('/auth/resend-otp', data);
    return response.data;
  },

  // Google One-Tap (direct login, no OTP)
  async googleOneTap(credential: string, firmId?: string): Promise<LoginSuccessResponse> {
    const response = await api.post('/auth/google/one-tap', { credential, firmId });
    return response.data;
  },

  // Reset password
  async resetPassword(data: ResetPasswordRequest) {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  // Change password
  async changePassword(data: ChangePasswordRequest) {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  // Logout
  async logout() {
    await api.post('/auth/logout');
  },
};
```

### Handling Breach Redirect

```tsx
// hooks/useAuthRedirect.ts
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if password change is required
      if (user.mustChangePassword || user.passwordBreached) {
        navigate('/dashboard/settings/security?action=change-password&reason=breach');
      }
    }
  }, [isAuthenticated, user, navigate]);
};
```

---

## Quick Reference

### Login Flow Decision Tree

```
User clicks "Sign In"
        │
        ├── Enters email + password
        │   │
        │   └── POST /api/auth/login
        │       │
        │       └── Response: requiresOtp: true
        │           │
        │           └── Redirect to /otp
        │               │
        │               └── User enters 6-digit code
        │                   │
        │                   └── POST /api/auth/verify-otp
        │                       │
        │                       ├── user.mustChangePassword: true
        │                       │   └── Redirect to /settings/security?reason=breach
        │                       │
        │                       └── user.mustChangePassword: false
        │                           └── Redirect to /dashboard
        │
        └── Clicks Google One-Tap
            │
            └── POST /api/auth/google/one-tap
                │
                └── Response: accessToken, user
                    │
                    └── Redirect to /dashboard (no OTP needed)
```

---

*Last updated: 2025-01-07*
