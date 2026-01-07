# Traf3li Frontend Security & API Integration - Complete Guide

> **Generated from live codebase scan on 2026-01-07**
> This is the authoritative, comprehensive guide for frontend integration.

---

## Table of Contents

1. [Authentication Architecture](#1-authentication-architecture)
2. [JWT Token System](#2-jwt-token-system)
3. [Cookie Configuration](#3-cookie-configuration)
4. [CSRF Protection](#4-csrf-protection)
5. [All Login Methods (8 Types)](#5-all-login-methods-8-types)
6. [Session Management](#6-session-management)
7. [MFA/2FA Integration](#7-mfa2fa-integration)
8. [Password Security](#8-password-security)
9. [OAuth/SSO Integration](#9-oauthsso-integration)
10. [Rate Limiting](#10-rate-limiting)
11. [Roles & Permissions](#11-roles--permissions)
12. [Multi-Tenancy (firmId/lawyerId)](#12-multi-tenancy)
13. [Input Validation & Sanitization](#13-input-validation--sanitization)
14. [File Upload Security](#14-file-upload-security)
15. [Error Handling](#15-error-handling)
16. [Complete API Contracts](#16-complete-api-contracts)
17. [Axios Setup (Production-Ready)](#17-axios-setup-production-ready)

---

## 1. Authentication Architecture

### System Overview

```
┌─────────────────┐
│    Frontend     │
│   React/Next    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Rate Limiters  │────▶│  JWT Verify +   │
│  (Redis-backed) │     │  CSRF Validate  │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ authenticatedApi │
                        │   middleware     │
                        └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Firm Context   │     │   Permission    │     │   Controller    │
│  (firmQuery)    │     │    Check        │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Token System

| Token | Storage | Duration | Purpose |
|-------|---------|----------|---------|
| **Access Token** | Memory/Header | 15 min (24h anon) | API Authorization |
| **Refresh Token** | httpOnly Cookie | 7 days (30 rememberMe) | Token Refresh |
| **CSRF Token** | Readable Cookie + Header | 1 hour | State Change Protection |

### 8 Authentication Methods

| Method | Endpoint | Rate Limit | Description |
|--------|----------|------------|-------------|
| Email + Password | `POST /api/auth/login` | 5/15min | Standard login |
| Google One-Tap | `POST /api/auth/google/one-tap` | 15/15min | Social login |
| Email OTP | `POST /api/auth/send-otp` → `verify-otp` | 5/hour | Passwordless |
| Phone OTP | `POST /api/auth/phone/send-otp` → `verify-otp` | 3/hour | SMS-based |
| Magic Link | `POST /api/auth/magic-link/send` → `verify` | 3/hour | Email link |
| OAuth/SSO | `POST /api/auth/sso/initiate` → `callback` | 15/15min | Enterprise |
| WebAuthn | `POST /api/auth/webauthn/authenticate/*` | 15/15min | Hardware keys |
| Anonymous | `POST /api/auth/anonymous` | 300/15min | Guest access |

---

## 2. JWT Token System

### Access Token Payload (Supabase-Style Claims)

```typescript
interface AccessTokenPayload {
  // Core Identity
  id: string;                    // User ObjectId
  email: string;
  role: 'client' | 'lawyer' | 'admin';
  is_anonymous: boolean;

  // Tenant Context
  user_id: string;
  firm_id: string | null;        // null for solo lawyers
  firm_role: 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' |
             'secretary' | 'accountant' | 'departed' | null;
  firm_status: 'active' | 'pending' | 'suspended' | 'departed';
  is_solo_lawyer: boolean;
  is_departed: boolean;

  // Security
  mfa_enabled: boolean;
  email_verified: boolean;

  // Subscription
  subscription_tier: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled';

  // JWT Standard
  iss: 'traf3li';
  aud: 'traf3li-users';
  iat: number;
  exp: number;
}
```

### Token Expiration Matrix

| Token | User Type | Duration |
|-------|-----------|----------|
| Access | Normal | **15 minutes** |
| Access | Anonymous | **24 hours** |
| Refresh | Normal | **7 days** |
| Refresh | Remember Me | **30 days** |
| CSRF | All | **1 hour** |

### Token Storage Best Practice

```typescript
// auth.store.ts

class AuthStore {
  // Access token in memory (NOT localStorage - XSS protection)
  private accessToken: string | null = null;
  private user: User | null = null;

  setAuth(accessToken: string, user: User): void {
    this.accessToken = accessToken;
    this.user = user;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getUser(): User | null {
    return this.user;
  }

  clear(): void {
    this.accessToken = null;
    this.user = null;
  }

  // Refresh token is automatic via httpOnly cookie
  // CSRF token readable from cookie
}

export const authStore = new AuthStore();
```

---

## 3. Cookie Configuration

### Cookie Settings

| Cookie | Name | HttpOnly | Secure | SameSite | Path | Max-Age |
|--------|------|----------|--------|----------|------|---------|
| Access | `accessToken` | ✅ | ✅ Prod | `lax` | `/` | 15 min |
| Refresh | `refresh_token` | ✅ | ✅ Prod | `strict` | `/api/auth` | 7-30d |
| CSRF | `csrfToken` | ❌ | ✅ Prod | `lax` | `/` | 1 hour |

### Cross-Origin Setup

```typescript
// For cross-origin (app.traf3li.com → api.traf3li.com)
axios.defaults.withCredentials = true;

// Cookies scoped to .traf3li.com work across:
// - app.traf3li.com
// - dashboard.traf3li.com
// - api.traf3li.com
```

---

## 4. CSRF Protection

### How It Works

```
1. Login → Server sets csrfToken cookie (JS-readable)
2. Frontend reads cookie value
3. State-changing request → Send X-CSRF-Token header
4. Server validates: cookie value === header value
5. Server rotates token → New token in X-CSRF-Token response header
6. Frontend updates stored token
```

### CSRF Service

```typescript
// csrf.service.ts

class CSRFService {
  private token: string | null = null;

  initialize(): void {
    this.token = this.getCookie('csrfToken');
  }

  getToken(): string | null {
    return this.token;
  }

  updateFromResponse(headers: Record<string, string>): void {
    const newToken = headers['x-csrf-token'];
    if (newToken) {
      this.token = newToken;
    }
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }
}

export const csrfService = new CSRFService();
```

### CSRF-Protected Endpoints

All `POST`, `PUT`, `PATCH`, `DELETE` except:
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/send-otp`
- `/api/auth/verify-otp`
- `/api/auth/sso/*` callbacks
- `/api/webhooks/*`

### Get Fresh CSRF Token

```typescript
// GET /api/auth/csrf (requires auth)

interface CSRFResponse {
  csrfToken: string;
  enabled: boolean;
  expiresAt: string;
  ttl: number; // seconds
}
```

---

## 5. All Login Methods (8 Types)

### 5.1 Email + Password

```typescript
// POST /api/auth/login
// Rate: 5 failed attempts / 15 min

interface LoginRequest {
  email?: string;
  username?: string;     // Either email or username
  password: string;
  rememberMe?: boolean;  // Default: false
}

interface LoginResponse {
  error: false;
  message: string;
  messageEn: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
    isSoloLawyer: boolean;
    firmId: string | null;
    firmRole: string | null;
    permissions: Record<string, string>;
  };
  accessToken: string;

  // MFA Challenge (if MFA enabled)
  requiresMfa?: boolean;
  mfaChallenge?: {
    userId: string;
    methods: ('totp' | 'backup_code' | 'webauthn')[];
  };

  // Password Warning (non-blocking - login succeeds)
  warning?: {
    type: 'PASSWORD_COMPROMISED';
    message: string;
    breachCount: number;
    requirePasswordChange: boolean;
  };
}
```

### 5.2 Google One-Tap

```typescript
// POST /api/auth/google/one-tap
// Rate: 15/15min

interface GoogleOneTapRequest {
  credential: string;    // JWT from Google
  firmId?: string;       // Optional firm to join
}

interface GoogleOneTapResponse {
  error: false;
  user: User;
  accessToken: string;
  isNewUser: boolean;
  accountLinked: boolean;
}
```

### 5.3 Email OTP

```typescript
// Step 1: POST /api/auth/send-otp
// Rate: 5/hour + 1-min cooldown

interface SendOTPRequest {
  email: string;
  purpose?: 'login' | 'registration' | 'password_reset' |
            'email_verification' | 'transaction';
}

interface SendOTPResponse {
  error: false;
  message: string;
  expiresIn: 300; // 5 minutes
}

// Step 2: POST /api/auth/verify-otp
interface VerifyOTPRequest {
  email: string;
  otp: string;   // 6 digits
  purpose?: string;
}
// Returns LoginResponse
```

### 5.4 Phone OTP (SMS)

```typescript
// POST /api/auth/phone/send-otp
// Rate: 3/hour (sensitiveRateLimiter)

interface SendPhoneOTPRequest {
  phone: string;  // +966XXXXXXXXX or 05XXXXXXXX
  purpose?: string;
}

// POST /api/auth/phone/verify-otp
interface VerifyPhoneOTPRequest {
  phone: string;
  otp: string;   // 6 digits
}
// Returns LoginResponse
```

### 5.5 Magic Link

```typescript
// POST /api/auth/magic-link/send
// Rate: 3/hour

interface SendMagicLinkRequest {
  email: string;
  purpose?: 'login' | 'register' | 'verify_email';
  redirectUrl?: string;
}

interface SendMagicLinkResponse {
  error: false;
  message: string;
  expiresInMinutes: 15;
}

// POST /api/auth/magic-link/verify
interface VerifyMagicLinkRequest {
  token: string;  // 64-char hex from email
}
// Returns LoginResponse
```

### 5.6 OAuth/SSO

```typescript
// Supported: google, microsoft, facebook, apple, github, linkedin, twitter

// Step 1: POST /api/auth/sso/initiate
interface SSOInitiateRequest {
  provider: string;
  returnUrl: string;
  firmId?: string;
  usePKCE?: boolean;  // For mobile
}

interface SSOInitiateResponse {
  authorizationUrl: string;  // Redirect here
  state: string;             // HMAC-signed
  codeVerifier?: string;     // PKCE
}

// Step 2: POST /api/auth/sso/callback
interface SSOCallbackRequest {
  code: string;
  state: string;
  provider: string;
  codeVerifier?: string;
}
// Returns LoginResponse
```

### 5.7 WebAuthn/FIDO2

```typescript
// Step 1: POST /api/auth/webauthn/authenticate/start
interface WebAuthnStartRequest {
  email?: string;
  username?: string;
}

interface WebAuthnStartResponse {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials: Array<{
    id: string;
    type: 'public-key';
    transports: string[];
  }>;
}

// Step 2: POST /api/auth/webauthn/authenticate/finish
interface WebAuthnFinishRequest {
  id: string;
  rawId: string;
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
  };
  type: 'public-key';
}
// Returns LoginResponse
```

### 5.8 Anonymous/Guest

```typescript
// POST /api/auth/anonymous
// Rate: 300/15min

// No request body needed

interface AnonymousResponse {
  error: false;
  user: {
    id: string;
    role: 'client';
    isAnonymous: true;
  };
  accessToken: string;  // 24-hour expiry
}

// Convert later: POST /api/auth/anonymous/convert
interface ConvertRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
```

---

## 6. Session Management

### List Active Sessions

```typescript
// GET /api/auth/sessions

interface Session {
  id: string;
  device: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: {
    country: string;
    city: string;
    region: string;
    timezone: string;
  };
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
  isNewDevice: boolean;
  isSuspicious: boolean;
  suspiciousReasons?: (
    | 'ip_mismatch'
    | 'user_agent_mismatch'
    | 'impossible_travel'
    | 'location_change'
    | 'multiple_locations'
    | 'abnormal_activity_pattern'
  )[];
}
```

### Session Operations

```typescript
// GET /api/auth/sessions/current
// GET /api/auth/sessions/stats
interface SessionStats {
  activeCount: number;
  suspiciousCount: number;
  maxConcurrentSessions: 5;
  inactivityTimeoutSeconds: 604800; // 7 days
}

// DELETE /api/auth/sessions/:id (requires CSRF)
// DELETE /api/auth/sessions (terminates all except current, requires CSRF)
```

---

## 7. MFA/2FA Integration

### MFA Status

```typescript
// GET /api/auth/mfa/status

interface MFAStatus {
  mfaEnabled: boolean;
  hasTOTP: boolean;
  hasBackupCodes: boolean;
  hasWebAuthn: boolean;
  remainingBackupCodes: number;
}
```

### TOTP Setup

```typescript
// POST /api/auth/mfa/setup (requires recent auth)
interface SetupResponse {
  secret: string;        // Base32
  qrCodeUrl: string;     // Data URL
  backupUri: string;     // otpauth://
}

// POST /api/auth/mfa/verify-setup (requires CSRF)
interface VerifySetupRequest {
  token: string;  // 6-digit TOTP
}

interface VerifySetupResponse {
  success: true;
  backupCodes: string[];  // 10 codes: ABCD-1234
}
```

### MFA During Login

```typescript
// POST /api/auth/mfa/verify
interface VerifyMFARequest {
  userId: string;  // From mfaChallenge
  token: string;   // 6-digit TOTP
}
// Returns LoginResponse
```

### Backup Codes

```typescript
// POST /api/auth/mfa/backup-codes/generate
// Returns: { codes: string[], remainingCodes: 10 }

// POST /api/auth/mfa/backup-codes/verify
// Request: { userId: string, code: string }

// GET /api/auth/mfa/backup-codes/count
// Returns: { remainingCodes: number }
```

---

## 8. Password Security

### Password Requirements

```typescript
const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,  // NIST 800-63B
  commonPasswordCheck: true,  // Top 100 blocked
  userInfoCheck: true,        // No email/name in password
  breachCheck: true,          // HaveIBeenPwned API
  minStrengthScore: 50,       // 0-100 scale
};

// Strength Labels: weak (0-24), fair (25-49), good (50-74), strong (75-100)
```

### Account Lockout

```typescript
const LOCKOUT_POLICY = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000,  // 15 minutes
  attemptWindow: 30 * 60 * 1000,    // 30 min to reset counter
};
```

### Change Password

```typescript
// POST /api/auth/change-password
// Requires: Auth + Recent Auth (1 hour) + CSRF

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  success: true;
  data: {
    passwordChangedAt: string;
    passwordExpiresAt: string | null;
    strengthScore: number;
    strengthLabel: string;
  };
}

// Side effects:
// - All refresh tokens revoked
// - All sessions terminated
// - Email notification sent
```

### Password Reset

```typescript
// Step 1: POST /api/auth/forgot-password (Rate: 3/hour)
interface ForgotPasswordRequest {
  email: string;
}
// Always returns 200 (prevents enumeration)

// Step 2: POST /api/auth/reset-password
interface ResetPasswordRequest {
  token: string;      // 64-char hex, 30-min expiry
  newPassword: string;
}
```

### Password Status

```typescript
// GET /api/auth/password-status

interface PasswordStatus {
  mustChangePassword: boolean;
  passwordChangedAt: string;
  passwordExpiresAt: string | null;
  daysOld: number;
  daysRemaining: number | null;
  needsRotation: boolean;
  showWarning: boolean;  // < 7 days remaining
  isBreached: boolean;
}
```

---

## 9. OAuth/SSO Integration

### Supported Providers

| Provider | Protocol | PKCE |
|----------|----------|------|
| Google | OpenID Connect | ✅ |
| Microsoft | Azure AD | ✅ |
| Facebook | OAuth 2.0 | ❌ |
| Apple | Sign in with Apple | ✅ |
| GitHub | OAuth 2.0 | ✅ |
| LinkedIn | OAuth 2.0 | ❌ |
| Twitter/X | OAuth 2.0 | ✅ |

### Get Enabled Providers

```typescript
// GET /api/auth/sso/providers
interface ProvidersResponse {
  providers: Array<{
    type: string;
    name: string;
    enabled: boolean;
  }>;
}
```

### Link/Unlink OAuth

```typescript
// POST /api/auth/sso/link
interface LinkRequest {
  provider: string;
  code: string;
  redirectUri: string;
}

// DELETE /api/auth/sso/unlink/:provider

// GET /api/auth/sso/linked
interface LinkedResponse {
  accounts: Array<{
    provider: string;
    email: string;
    linkedAt: string;
  }>;
}
```

---

## 10. Rate Limiting

### Rate Limiters

| Endpoint | Limiter | Limit | Window |
|----------|---------|-------|--------|
| `/auth/login` | loginLimiter | 5 failures | 15 min |
| `/auth/register` | authLimiter | 10 | 15 min |
| `/auth/check-availability` | sensitiveRateLimiter | 3 | 1 hour |
| `/auth/forgot-password` | passwordResetLimiter | 3 | 1 hour |
| `/auth/send-otp` | otpLimiter | 5 + 1min cooldown | 1 hour |
| `/auth/phone/send-otp` | sensitiveRateLimiter | 3 | 1 hour |
| General auth | authRateLimiter | 15 failures | 15 min |
| Public endpoints | publicRateLimiter | 300 | 15 min |
| Search endpoints | searchRateLimiter | 120 | 1 min |
| File uploads | uploadRateLimiter | 50 | 1 hour |

### Response Headers

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1704672000
Retry-After: 60 (only on 429)
```

### 429 Error Response

```typescript
interface RateLimitError {
  success: false;
  error: string;
  code: 'LOGIN_RATE_LIMIT_EXCEEDED';
  retryAfter: number;
  resetAt: string;
}
```

---

## 11. Roles & Permissions

### Role Hierarchy (Highest to Lowest)

| Level | Role | Description |
|-------|------|-------------|
| 7 | `owner` | Firm owner |
| 6 | `admin` | Administrator |
| 5 | `partner` | Senior lawyer |
| 4 | `lawyer` | Standard employee |
| 3 | `accountant` | Financial |
| 2 | `paralegal` | Legal support |
| 1 | `secretary` | Administrative |
| 0 | `departed` | Ex-employee |
| - | `client` | External |
| - | `solo_lawyer` | Independent |

### Permission Levels

| Level | Meaning |
|-------|---------|
| `none` | No access |
| `view` | Read-only |
| `edit` | Create + update |
| `full` | Create + update + delete |

### 15 Modules

```typescript
type Module =
  | 'clients' | 'cases' | 'leads'
  | 'invoices' | 'payments' | 'expenses'
  | 'documents' | 'tasks' | 'events'
  | 'appointments' | 'timeTracking' | 'reports'
  | 'settings' | 'team' | 'hr';
```

### Permission Check

```typescript
function hasPermission(module: Module, required: 'view' | 'edit' | 'full'): boolean {
  const user = authStore.getUser();

  if (user.isSoloLawyer) return true;
  if (['owner', 'admin'].includes(user.firmRole)) return true;

  const levels = { none: 0, view: 1, edit: 2, full: 3 };
  const userLevel = levels[user.permissions?.modules?.[module] || 'none'];
  return userLevel >= levels[required];
}
```

---

## 12. Multi-Tenancy

### User Types

| Type | firm_id | is_solo_lawyer | Data Filter |
|------|---------|----------------|-------------|
| Firm Member | ObjectId | false | `{ firmId: X }` |
| Solo Lawyer | null | true | `{ lawyerId: Y }` |
| Departed | ObjectId | false | Read-only, own items |
| Client | null | false | Shared items only |

### Important Rules

1. **Never send firmId** - Server determines from JWT
2. **Server handles isolation** - Frontend just displays
3. **Departed = read-only** - Cannot create/edit
4. **Solo lawyers = own data** - No firm context

---

## 13. Input Validation & Sanitization

### Common Patterns

```typescript
// ObjectId (MongoDB)
const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// Email
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Phone (Saudi)
const isValidPhone = (phone: string) => /^\+?[0-9]{10,15}$/.test(phone);

// National ID (Saudi)
const isValidNationalId = (id: string) => /^[12]\d{9}$/.test(id);

// Commercial Registration
const isValidCRNumber = (cr: string) => /^\d{10}$/.test(cr);
```

### Validation Error Response

```typescript
interface ValidationError {
  success: false;
  message: string;
  errors: Array<{
    field: string;
    message: string;  // Bilingual: "الحقل مطلوب / Field required"
  }>;
}
```

---

## 14. File Upload Security

### Configuration

```typescript
const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024,  // 10MB
  allowedExtensions: ['pdf', 'doc', 'docx', 'xlsx', 'jpg', 'png', 'gif', 'mp4', 'zip'],
};
```

### Server Validation Layers

1. **Extension check** - Allowlist
2. **MIME type check** - Content-Type
3. **Magic byte check** - File signature
4. **Malware scan** - ClamAV (optional)

### Upload Error Response

```typescript
interface UploadError {
  success: false;
  code: 'SIGNATURE_MISMATCH' | 'TYPE_NOT_ALLOWED' | 'MALWARE_DETECTED';
  details?: {
    filename: string;
    claimed: { extension: string; mimeType: string };
    actual: { extension: string; mimeType: string };
  };
}
```

---

## 15. Error Handling

### Error Response Format

```typescript
interface APIError {
  success: false;
  error: true;
  message: string;      // Arabic
  messageEn?: string;   // English
  code?: string;        // For handling
  errors?: string[];    // Validation details
}
```

### Error Code Reference

| Code | HTTP | Action |
|------|------|--------|
| `TOKEN_EXPIRED` | 401 | Auto-refresh |
| `REFRESH_TOKEN_EXPIRED` | 401 | Redirect login |
| `INVALID_TOKEN` | 401 | Clear tokens, login |
| `ACCOUNT_LOCKED` | 403 | Show lockout time |
| `MFA_REQUIRED` | 403 | Show MFA form |
| `REAUTHENTICATION_REQUIRED` | 403 | Password prompt |
| `INSUFFICIENT_PERMISSIONS` | 403 | Show error |
| `CSRF_TOKEN_INVALID` | 403 | Refresh CSRF |
| `PASSWORD_EXPIRED` | 403 | Force change |
| `VALIDATION_ERROR` | 400 | Show field errors |
| `PASSWORD_BREACHED` | 400 | New password |
| `TOO_MANY_REQUESTS` | 429 | Show wait time |

---

## 16. Complete API Contracts

### Registration

```typescript
interface RegisterRequest {
  // Required
  email: string;
  password: string;     // 8-128 chars, complexity
  username: string;     // 3-30 chars, alphanumeric
  firstName: string;
  lastName: string;

  // Optional
  phone?: string;
  country?: string;
  role?: 'client' | 'lawyer';

  // Lawyer-specific
  lawyerWorkMode?: 'solo' | 'create_firm' | 'join_firm';
  firmData?: {
    name: string;
    licenseNumber: string;
  };
  invitationCode?: string;
}
```

### Pagination

```typescript
interface PaginationQuery {
  page?: number;      // Min 1
  limit?: number;     // 1-100, default 20
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

---

## 17. Axios Setup (Production-Ready)

### Complete Configuration

```typescript
// api.ts

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

let accessToken: string | null = null;
let csrfToken: string | null = null;

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

csrfToken = getCookie('csrfToken');

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Language': 'ar',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    const newCsrf = response.headers['x-csrf-token'];
    if (newCsrf) csrfToken = newCsrf;
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await api.post('/auth/refresh');
        accessToken = response.data.accessToken;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        accessToken = null;
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // 403 - CSRF invalid
    if (error.response?.status === 403 &&
        (error.response.data as any)?.code === 'CSRF_TOKEN_INVALID') {
      try {
        const response = await api.get('/auth/csrf');
        csrfToken = response.data.csrfToken;
        if (originalRequest.headers) {
          originalRequest.headers['X-CSRF-Token'] = csrfToken;
        }
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const setAccessToken = (token: string) => { accessToken = token; };
export const clearTokens = () => { accessToken = null; };

export default api;
```

### Usage Examples

```typescript
// Login
const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  setAccessToken(response.data.accessToken);
  return response.data;
};

// Logout
const logout = async () => {
  await api.post('/auth/logout');
  clearTokens();
};

// Protected request
const getCases = async () => {
  const response = await api.get('/cases');
  return response.data;
};

// File upload
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
```

---

## Quick Reference Checklist

### Security Checklist

- [ ] Store access token in memory (NOT localStorage)
- [ ] Use `withCredentials: true` for all requests
- [ ] Send `X-CSRF-Token` for POST/PUT/DELETE
- [ ] Update CSRF from response headers
- [ ] Handle 401 with auto-refresh
- [ ] Handle 403 CSRF with token refresh
- [ ] Validate ObjectIds before sending
- [ ] Show password breach warnings
- [ ] Handle MFA challenges
- [ ] Check permissions before UI elements

### Token Lifecycle

```
Login → Access (15m) + Refresh (7d) + CSRF (1h)
API Call → Access header + CSRF header (state-changing)
Access Expired → Auto-refresh via interceptor
CSRF Rotated → Update from response header
Refresh Expired → Redirect to login
Logout → Clear all, server invalidates
```

---

*Generated from live codebase scan. Last updated: 2026-01-07*
