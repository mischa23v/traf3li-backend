# Frontend Security Integration Guide

> **Security Audit Status**: The vulnerabilities listed in the security audit report are **OUTDATED/INCORRECT**. This document provides accurate integration guidance based on the actual current codebase.

## Security Audit Claims - Verification Results

| Audit Claim | Status | Evidence |
|-------------|--------|----------|
| No Rate Limiting on Auth | **FALSE** | All auth routes have rate limiters: `loginLimiter`, `authLimiter`, `otpLimiter`, `sensitiveRateLimiter` |
| Role Elevation at Registration | **FALSE** | Code enforces: `role: role === 'lawyer' ? 'lawyer' : 'client'` - only lawyer/client allowed |
| Default JWT Secrets Fallback | **FALSE** | Code throws errors if secrets not set - no fallback exists |
| Unsanitized Regex in Search | **FALSE** | `escapeRegex()` function is used for all search queries |
| No File Content Validation | **FALSE** | Magic byte validation middleware exists (`fileValidation.middleware.js`) |
| No Email Verification | **FALSE** | `/verify-email` and `/resend-verification` endpoints exist |

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [JWT Token Handling](#2-jwt-token-handling)
3. [API Request Patterns](#3-api-request-patterns)
4. [Registration](#4-registration)
5. [Login Methods](#5-login-methods)
6. [Session Management](#6-session-management)
7. [MFA Integration](#7-mfa-integration)
8. [CSRF Protection](#8-csrf-protection)
9. [Password Management](#9-password-management)
10. [File Upload Security](#10-file-upload-security)
11. [Error Handling](#11-error-handling)
12. [Multi-Tenancy Context](#12-multi-tenancy-context)

---

## 1. Authentication Flow

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   API Gateway   │────▶│    Backend      │
│   (React/Vue)   │     │  Rate Limiting  │     │   JWT Auth      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                                │
        │  ┌──────────────────────────────────────────┐ │
        └──│ Access Token (15min) - Authorization     │◀┘
           │ Refresh Token (7-30 days) - httpOnly     │
           └──────────────────────────────────────────┘
```

### Token Pair System

| Token Type | Duration | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token | 15 minutes | Memory/localStorage | API Authorization |
| Refresh Token | 7 days (30 with rememberMe) | httpOnly Cookie | Token refresh |

---

## 2. JWT Token Handling

### Access Token Payload (Supabase-Style Claims)

```typescript
interface AccessTokenPayload {
  // Standard JWT claims
  id: string;              // User ID
  email: string;
  role: 'client' | 'lawyer';
  is_anonymous: boolean;

  // Custom claims (Supabase-style)
  user_id: string;
  firm_id: string | null;
  is_solo_lawyer: boolean;
  permissions: {
    [module: string]: 'view' | 'edit' | 'full';
  };

  // JWT metadata
  iss: 'traf3li';
  aud: 'traf3li-users';
  exp: number;
  iat: number;
}
```

### Token Storage Best Practice

```typescript
// auth.service.ts
class AuthService {
  private accessToken: string | null = null;

  // Store access token in memory (not localStorage for security)
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Refresh token is automatically handled via httpOnly cookie
  // No frontend storage needed

  clearTokens() {
    this.accessToken = null;
  }
}
```

### Axios Interceptor Setup

```typescript
// api.interceptor.ts
import axios from 'axios';
import { authService } from './auth.service';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  withCredentials: true, // Required for httpOnly cookies
  timeout: 30000,
});

// Request interceptor - Add Authorization header
api.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token endpoint uses httpOnly cookie automatically
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data.tokens;

        authService.setAccessToken(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        authService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 3. API Request Patterns

### Standard Request Headers

```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
  'X-CSRF-Token': csrfToken, // Required for state-changing operations
  'Accept-Language': 'ar', // 'ar' or 'en' for bilingual responses
};
```

### Response Format

```typescript
// Success Response
interface SuccessResponse<T> {
  success: true;
  message?: string;      // Arabic message
  messageEn?: string;    // English message
  data: T;
}

// Error Response
interface ErrorResponse {
  error: true;
  success: false;
  message: string;       // Arabic error message
  messageEn?: string;    // English error message
  code?: string;         // Error code (e.g., 'VALIDATION_ERROR', 'TOKEN_EXPIRED')
  errors?: string[];     // Validation error details
  details?: any;         // Additional error context
}

// Paginated Response
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

## 4. Registration

### Registration Endpoint

```
POST /api/auth/register
Rate Limit: authLimiter (10 requests per 15 minutes)
CAPTCHA: Required if enabled (captchaRegister middleware)
```

### Request Schema

```typescript
interface RegisterRequest {
  // Required fields
  username: string;        // 3-30 chars, alphanumeric + underscores
  email: string;           // Valid email format
  password: string;        // Min 8 chars, uppercase, lowercase, number, special
  firstName: string;       // 1-50 chars
  lastName: string;        // 1-50 chars

  // Optional fields
  phone?: string;          // International format (+966XXXXXXXXX)
  image?: string;
  country?: string;        // Default: 'Saudi Arabia'
  nationality?: string;
  region?: string;
  city?: string;

  // Role Selection (SECURITY: Only 'lawyer' or 'client' accepted)
  role?: 'lawyer' | 'client';  // Defaults to 'client'
  isSeller?: boolean;          // Legacy: true = lawyer

  // Lawyer-specific fields (required if role='lawyer')
  lawyerWorkMode?: 'solo' | 'create_firm' | 'join_firm';
  firmData?: FirmData;         // Required if lawyerWorkMode='create_firm'
  invitationCode?: string;     // Required if lawyerWorkMode='join_firm'

  // Lawyer profile
  isLicensed?: boolean;
  licenseNumber?: string;
  yearsOfExperience?: number;
  specializations?: string[];
  courts?: { [key: string]: { selected: boolean; name: string } };

  // CAPTCHA (if enabled)
  captchaToken?: string;       // hCaptcha/reCAPTCHA token
}

interface FirmData {
  name: string;            // Required
  nameEn?: string;
  licenseNumber: string;   // Required
  email?: string;
  phone?: string;
  region?: string;
  city?: string;
  address?: string;
  website?: string;
  description?: string;
  specializations?: string[];
}
```

### Password Requirements

```typescript
// Password must meet ALL requirements:
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  notContainUsername: true,
  notContainEmail: true,
  notContainName: true,
  notBreached: true,        // Checked against HaveIBeenPwned
};

// Example valid password: "MySecure@Pass123"
```

### Registration Response

```typescript
// Success (201)
interface RegisterSuccessResponse {
  error: false;
  message: 'تم إنشاء الحساب بنجاح!';
  user: {
    id: string;
    username: string;
    email: string;
    role: 'lawyer' | 'client';
    isSoloLawyer: boolean;
    firmId: string | null;
    firmRole: string | null;
  };
  firm?: {
    id: string;
    name: string;
  };
  // Tokens are set via httpOnly cookies + returned in response
}

// Error Examples:
// 400 - Validation error
// 400 - PASSWORD_BREACHED (password found in data breaches)
// 400 - WEAK_PASSWORD
// 409 - Email/username already exists
// 429 - Rate limit exceeded
```

### Frontend Implementation

```typescript
// register.page.tsx
async function handleRegister(formData: RegisterRequest) {
  try {
    const response = await api.post('/auth/register', formData);

    if (response.data.error === false) {
      // Store access token in memory
      authService.setAccessToken(response.data.accessToken);

      // Store user context
      userStore.setUser(response.data.user);

      // If email verification required, redirect to verification page
      if (!response.data.user.isEmailVerified) {
        navigate('/verify-email-pending');
      } else {
        navigate('/dashboard');
      }
    }
  } catch (error) {
    if (error.response?.data?.code === 'PASSWORD_BREACHED') {
      // Show breach warning
      showError(`Password found in ${error.response.data.breachCount} data breaches. Please choose a different password.`);
    } else if (error.response?.data?.code === 'VALIDATION_ERROR') {
      // Show validation errors
      showErrors(error.response.data.details);
    } else {
      showError(error.response?.data?.messageEn || 'Registration failed');
    }
  }
}
```

---

## 5. Login Methods

### 5.1 Email + Password Login

```
POST /api/auth/login
Rate Limit: loginLimiter (5 requests per 15 minutes per IP)
CAPTCHA: Required after failed attempts
```

```typescript
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;      // Extends refresh token to 30 days
  captchaToken?: string;     // Required if CAPTCHA triggered
}

interface LoginResponse {
  error: false;
  message: 'تم تسجيل الدخول بنجاح';
  messageEn: 'Login successful';
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: 'lawyer' | 'client';
    isEmailVerified: boolean;
    isSoloLawyer: boolean;
    firmId: string | null;
    firmRole: string | null;
    permissions: object;
  };
  accessToken: string;
  // Refresh token set via httpOnly cookie

  // MFA challenge (if MFA enabled)
  requiresMfa?: boolean;
  mfaChallenge?: {
    userId: string;
    methods: ('totp' | 'backup_code')[];
  };

  // Password warning (if breached - non-blocking on login)
  passwordWarning?: {
    breached: boolean;
    count: number;
    message: string;
  };
}
```

### 5.2 OTP Login (Email)

```typescript
// Step 1: Send OTP
// POST /api/auth/send-otp
// Rate Limit: otpLimiter

interface SendOTPRequest {
  email: string;
  purpose?: 'login' | 'registration' | 'verify_phone' | 'password_reset' | 'transaction';
}

interface SendOTPResponse {
  error: false;
  message: string;
  messageAr: string;
  expiresIn: number;    // Seconds until OTP expires (default: 300)
  email: string;
}

// Step 2: Verify OTP
// POST /api/auth/verify-otp

interface VerifyOTPRequest {
  email: string;
  otp: string;          // 6-digit code
  purpose?: string;
}

// Response same as login response
```

### 5.3 Phone OTP Login

```typescript
// POST /api/auth/phone/send-otp
// Rate Limit: sensitiveRateLimiter (3 per hour)

interface SendPhoneOTPRequest {
  phone: string;        // +966XXXXXXXXX or 05XXXXXXXX
  purpose?: 'login' | 'registration' | 'verify_phone' | 'password_reset' | 'transaction';
}

// POST /api/auth/phone/verify-otp
interface VerifyPhoneOTPRequest {
  phone: string;
  otp: string;          // 6-digit code
  purpose?: string;
}
```

### 5.4 Magic Link Login

```typescript
// POST /api/auth/magic-link/send
// Rate Limit: sensitiveRateLimiter

interface SendMagicLinkRequest {
  email: string;
  purpose?: 'login' | 'register' | 'verify_email';
  redirectUrl?: string;
}

interface SendMagicLinkResponse {
  error: false;
  message: string;
  messageEn: string;
  expiresInMinutes: 15;
}

// POST /api/auth/magic-link/verify
interface VerifyMagicLinkRequest {
  token: string;        // Token from email link
}
```

### 5.5 Google One-Tap Login

```typescript
// POST /api/auth/google/one-tap
// Rate Limit: authRateLimiter

interface GoogleOneTapRequest {
  credential: string;   // Google One Tap JWT credential
  firmId?: string;      // Optional: Join specific firm
}

interface GoogleOneTapResponse {
  error: false;
  message: string;
  user: UserObject;
  isNewUser: boolean;   // True if account was created
  accountLinked: boolean; // True if Google was linked to existing account
}
```

### Frontend Login Implementation

```typescript
// login.page.tsx
async function handleLogin(email: string, password: string, rememberMe: boolean) {
  try {
    const response = await api.post('/auth/login', {
      email,
      password,
      rememberMe,
    });

    const { data } = response;

    // Check if MFA is required
    if (data.requiresMfa) {
      // Store MFA challenge and redirect to MFA page
      mfaStore.setChallenge(data.mfaChallenge);
      navigate('/mfa-verify');
      return;
    }

    // Store access token
    authService.setAccessToken(data.accessToken);
    userStore.setUser(data.user);

    // Show password warning if breached (non-blocking)
    if (data.passwordWarning?.breached) {
      showWarning(
        `Your password was found in ${data.passwordWarning.count.toLocaleString()} data breaches. ` +
        `Please change your password for better security.`
      );
    }

    navigate('/dashboard');

  } catch (error) {
    handleLoginError(error);
  }
}

function handleLoginError(error: any) {
  const { data, status } = error.response || {};

  switch (data?.code) {
    case 'ACCOUNT_LOCKED':
      showError(`Account locked until ${new Date(data.lockoutUntil).toLocaleString()}`);
      break;
    case 'CAPTCHA_REQUIRED':
      setCaptchaRequired(true);
      break;
    case 'INVALID_CREDENTIALS':
      showError('Invalid email or password');
      break;
    case 'EMAIL_NOT_VERIFIED':
      navigate('/verify-email-pending');
      break;
    default:
      showError(data?.messageEn || 'Login failed');
  }
}
```

---

## 6. Session Management

### Get Active Sessions

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
// Terminate specific session
// DELETE /api/auth/sessions/:id
// Requires: CSRF token

// Terminate all other sessions
// DELETE /api/auth/sessions
// Requires: CSRF token

// Get session statistics
// GET /api/auth/sessions/stats
interface SessionStats {
  activeCount: number;
  totalCount: number;
  suspiciousCount: number;
  maxConcurrentSessions: number;
  inactivityTimeoutSeconds: number;
  recentSessions: Session[];
}
```

---

## 7. MFA Integration

### Get MFA Status

```typescript
// GET /api/auth/mfa/status
interface MFAStatus {
  mfaEnabled: boolean;
  hasTOTP: boolean;
  hasBackupCodes: boolean;
  remainingCodes: number;
}
```

### Backup Codes

```typescript
// Generate backup codes (requires recent auth)
// POST /api/auth/mfa/backup-codes/generate
interface GenerateBackupCodesResponse {
  codes: string[];        // Array of 10 codes in format 'ABCD-1234'
  remainingCodes: 10;
}

// Verify backup code during login
// POST /api/auth/mfa/backup-codes/verify
interface VerifyBackupCodeRequest {
  userId: string;
  code: string;           // Format: 'ABCD-1234'
}

// Get remaining codes count
// GET /api/auth/mfa/backup-codes/count
```

---

## 8. CSRF Protection

### Getting CSRF Token

```typescript
// GET /api/auth/csrf
// Requires: Authentication

interface CSRFResponse {
  csrfToken: string;
  enabled: boolean;
  expiresAt: string;
  ttl: number;          // Seconds
}
```

### Using CSRF Token

```typescript
// Store CSRF token after login or refresh
let csrfToken: string | null = null;

async function refreshCSRFToken() {
  const response = await api.get('/auth/csrf');
  csrfToken = response.data.csrfToken;
}

// Add to state-changing requests
api.interceptors.request.use((config) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '')) {
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});
```

### CSRF-Protected Endpoints

The following endpoints require CSRF token:

- `POST /api/auth/logout`
- `DELETE /api/auth/sessions/:id`
- `DELETE /api/auth/sessions`
- `POST /api/auth/change-password`
- `POST /api/auth/reauthenticate`
- All state-changing operations on protected resources

---

## 9. Password Management

### Change Password

```typescript
// POST /api/auth/change-password
// Requires: Authentication + Recent Auth + CSRF

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  error: false;
  message: string;
  messageAr: string;
  data: {
    passwordChangedAt: string;
    passwordExpiresAt: string;
    strengthScore: number;
    strengthLabel: string;
  };
}
```

### Password Reset Flow

```typescript
// Step 1: Request reset
// POST /api/auth/forgot-password
// Rate Limit: 3 requests per hour per email

interface ForgotPasswordRequest {
  email: string;
  captchaToken?: string;    // Required if CAPTCHA enabled
}

// Response is same whether email exists or not (prevents enumeration)
interface ForgotPasswordResponse {
  error: false;
  message: string;
  expiresInMinutes: 30;
}

// Step 2: Reset password
// POST /api/auth/reset-password

interface ResetPasswordRequest {
  token: string;            // Token from email
  newPassword: string;      // Must meet password policy
}
```

### Password Status

```typescript
// GET /api/auth/password-status
interface PasswordStatus {
  mustChangePassword: boolean;
  passwordChangedAt: string;
  passwordExpiresAt: string | null;
  expirationEnabled: boolean;
  daysOld: number;
  daysRemaining: number | null;
  needsRotation: boolean;
  showWarning: boolean;
}
```

---

## 10. File Upload Security

### Upload Configuration

```typescript
const uploadConfig = {
  maxFileSize: 10 * 1024 * 1024,  // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'video/mp4',
    'video/webm',
  ],
  allowedExtensions: ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'mp4', 'webm'],
};
```

### File Upload Example

```typescript
async function uploadFile(file: File, clientId: string, category: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const response = await api.post(`/clients/${clientId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
```

### Server-Side Validation

The backend performs:
1. **Extension validation** - Checks file extension against allowlist
2. **MIME type validation** - Validates Content-Type header
3. **Magic byte validation** - Reads actual file bytes to verify file type
4. **Malware scanning** - Optional ClamAV integration

---

## 11. Error Handling

### Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body failed validation |
| `WEAK_PASSWORD` | 400 | Password doesn't meet policy |
| `PASSWORD_BREACHED` | 400 | Password found in data breaches |
| `INVALID_CREDENTIALS` | 401 | Email/password incorrect |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token expired |
| `INVALID_TOKEN` | 401 | Token is malformed |
| `ACCOUNT_LOCKED` | 403 | Too many failed attempts |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `MFA_REQUIRED` | 403 | MFA verification needed |
| `CAPTCHA_REQUIRED` | 403 | CAPTCHA verification needed |
| `CSRF_TOKEN_INVALID` | 403 | Invalid or missing CSRF token |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permission |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INVITATION_INVALID` | 400 | Firm invitation code invalid |
| `INVITATION_EMAIL_MISMATCH` | 400 | Invitation for different email |

### Global Error Handler

```typescript
// errorHandler.ts
interface APIError {
  error: true;
  message: string;
  messageEn?: string;
  code?: string;
  errors?: string[];
}

function handleAPIError(error: AxiosError<APIError>) {
  const { response } = error;

  if (!response) {
    // Network error
    return showError('Network error. Please check your connection.');
  }

  const { status, data } = response;

  switch (status) {
    case 401:
      // Unauthorized - handled by interceptor for token refresh
      break;

    case 403:
      if (data.code === 'CSRF_TOKEN_INVALID') {
        // Refresh CSRF token and retry
        return refreshCSRFAndRetry();
      }
      if (data.code === 'MFA_REQUIRED') {
        return redirectToMFA();
      }
      showError(data.messageEn || 'Access denied');
      break;

    case 429:
      const retryAfter = response.headers['retry-after'];
      showError(`Too many requests. Please wait ${retryAfter} seconds.`);
      break;

    default:
      showError(data.messageEn || data.message || 'An error occurred');
  }
}
```

---

## 12. Multi-Tenancy Context

### User Context from Token

```typescript
interface UserContext {
  userId: string;
  email: string;
  role: 'lawyer' | 'client';

  // Tenant context
  firmId: string | null;      // Null for solo lawyers
  isSoloLawyer: boolean;
  firmRole?: 'owner' | 'admin' | 'partner' | 'associate' | 'paralegal' | 'secretary' | 'intern' | 'accountant';

  // Permissions (for firm members)
  permissions?: {
    cases?: 'view' | 'edit' | 'full';
    clients?: 'view' | 'edit' | 'full';
    documents?: 'view' | 'edit' | 'full';
    billing?: 'view' | 'edit' | 'full';
    firm?: 'view' | 'edit' | 'full';
    team?: 'view' | 'edit' | 'full';
    reports?: 'view' | 'edit' | 'full';
    settings?: 'view' | 'edit' | 'full';
  };
}
```

### Permission Checking

```typescript
// Frontend permission helper
function hasPermission(module: string, level: 'view' | 'edit' | 'full'): boolean {
  const user = userStore.getUser();

  // Solo lawyers have full access
  if (user.isSoloLawyer) return true;

  // Firm owners/admins have full access
  if (['owner', 'admin'].includes(user.firmRole)) return true;

  const userLevel = user.permissions?.[module];
  if (!userLevel) return false;

  const levels = ['view', 'edit', 'full'];
  return levels.indexOf(userLevel) >= levels.indexOf(level);
}

// Usage in components
function CaseEditButton({ caseId }: { caseId: string }) {
  if (!hasPermission('cases', 'edit')) {
    return null;
  }
  return <Button onClick={() => editCase(caseId)}>Edit</Button>;
}
```

---

## Quick Reference: Common Flows

### Login Flow

```
1. POST /api/auth/login { email, password }
2. If 200 + requiresMfa → Navigate to /mfa-verify
3. If 200 → Store accessToken, redirect to dashboard
4. If 401 → Show error
5. If 429 → Show rate limit message
```

### Token Refresh Flow

```
1. API call returns 401
2. Interceptor calls POST /api/auth/refresh
3. Refresh uses httpOnly cookie automatically
4. If 200 → Store new accessToken, retry original request
5. If 401 → Clear tokens, redirect to login
```

### Logout Flow

```
1. POST /api/auth/logout (with CSRF token)
2. Clear accessToken from memory
3. Redirect to login
4. httpOnly cookie cleared by backend
```

---

## Rate Limits Summary

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Login | 5 requests | 15 minutes |
| Registration | 10 requests | 15 minutes |
| OTP | 5 requests | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| Check Availability | 3 requests | 1 hour |
| General Auth | 30 requests | 15 minutes |
| Public Routes | 100 requests | 15 minutes |

---

## Environment Variables (Backend Reference)

```bash
# Required
JWT_SECRET=<64+ character secret>
JWT_REFRESH_SECRET=<different 64+ character secret>

# Optional
REFRESH_TOKEN_DAYS=7
REMEMBER_ME_DAYS=30
ENABLE_JWT_KEY_ROTATION=false
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=hcaptcha
```

---

## Changelog

- **2026-01-07**: Initial documentation created after security audit verification
- All claimed vulnerabilities verified as FALSE or already fixed

