# Frontend Authentication Integration Guide

> **Last Updated**: December 29, 2025
> **Backend Version**: OAuth 2.0 Compliant

This document provides all the information frontend developers need to integrate with the Traf3li authentication system.

---

## Table of Contents

1. [Token Response Format](#token-response-format)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Token Storage Strategy](#token-storage-strategy)
4. [Token Refresh Flow](#token-refresh-flow)
5. [MFA Flow](#mfa-flow)
6. [Error Handling](#error-handling)
7. [TypeScript Interfaces](#typescript-interfaces)

---

## Token Response Format

All authentication endpoints return tokens in **OAuth 2.0 standard format** with backwards compatibility:

```json
{
  "error": false,
  "message": "Success message",
  "messageEn": "English message",

  // OAuth 2.0 Standard Format (snake_case) - USE THESE
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,

  // Backwards Compatibility (camelCase) - DEPRECATED
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",

  // User Data
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "lawyer",
    "firmId": "firm_id",
    "firmRole": "admin",
    "firm": { ... },
    "tenant": { ... },
    "permissions": { ... }
  }
}
```

### Token Lifetimes

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access Token | 15 minutes (900s) | Memory or httpOnly cookie |
| Refresh Token | 7 days | httpOnly cookie (automatic) |

---

## Authentication Endpoints

### 1. Password Login

```http
POST /api/auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200/202):**
```json
{
  "error": false,
  "message": "Success!",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { ... },
  "csrfToken": "csrf_token_if_enabled"
}
```

**MFA Required Response (200):**
```json
{
  "error": false,
  "mfaRequired": true,
  "message": "Please enter your MFA code",
  "messageEn": "Please enter your MFA code",
  "userId": "user_id",
  "code": "MFA_REQUIRED"
}
```

---

### 2. Login with MFA Code

```http
POST /api/auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "mfaCode": "123456"
}
```

**Success Response (202):** Same as password login success

**Invalid MFA Code Response (401):**
```json
{
  "error": true,
  "message": "Invalid MFA code",
  "code": "INVALID_MFA_CODE",
  "mfaRequired": true,
  "userId": "user_id"
}
```

---

### 3. User Registration

```http
POST /api/auth/register
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongP@ss123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+966501234567",
  "role": "lawyer",
  "lawyerWorkMode": "solo"
}
```

**Success Response (201):**
```json
{
  "error": false,
  "message": "Registration successful",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": { ... }
}
```

---

### 4. Email OTP Login

#### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "purpose": "login"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "purpose": "login"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { ... }
}
```

---

### 5. Phone OTP Login

#### Send OTP
```http
POST /api/auth/phone/send-otp
Content-Type: application/json
```

**Request:**
```json
{
  "phone": "+966501234567",
  "purpose": "login"
}
```

#### Verify OTP
```http
POST /api/auth/phone/verify-otp
Content-Type: application/json
```

**Request:**
```json
{
  "phone": "+966501234567",
  "otp": "123456",
  "purpose": "login"
}
```

**Success Response (200):** Same format as Email OTP verify

---

### 6. Magic Link Login

#### Send Magic Link
```http
POST /api/auth/magic-link/send
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "redirectUrl": "/dashboard"
}
```

#### Verify Magic Link
```http
POST /api/auth/magic-link/verify
Content-Type: application/json
```

**Request:**
```json
{
  "token": "magic_link_token_from_url"
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "Login successful",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { ... },
  "redirectUrl": "/dashboard"
}
```

---

### 7. Google One Tap / OAuth

```http
POST /api/auth/google/one-tap
Content-Type: application/json
```

**Request:**
```json
{
  "credential": "google_jwt_credential",
  "firmId": "optional_firm_id"
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "Login successful",
  "messageEn": "Login successful",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { ... },
  "isNewUser": false,
  "accountLinked": false
}
```

---

### 8. OAuth/SSO Callback (Google, Microsoft, etc.)

```http
POST /api/auth/sso/callback
Content-Type: application/json
```

**Request:**
```json
{
  "code": "oauth_authorization_code",
  "state": "state_from_oauth_flow",
  "provider": "google"
}
```

**Existing User Response (200):**
```json
{
  "error": false,
  "message": "Authentication successful",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { ... },
  "isNewUser": false,
  "registrationRequired": false
}
```

**New User Response (200):**
```json
{
  "error": false,
  "message": "New user detected, please complete registration",
  "access_token": null,
  "refresh_token": null,
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "image": "https://..."
  },
  "isNewUser": true,
  "registrationRequired": true
}
```

---

### 9. WebAuthn/Passkey Login

#### Start Authentication
```http
POST /api/auth/webauthn/authenticate/start
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

#### Finish Authentication
```http
POST /api/auth/webauthn/authenticate/finish
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "response": { /* WebAuthn credential response */ }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "data": {
    "token": "eyJ...",
    "user": { ... },
    "credential": { ... }
  }
}
```

---

### 10. LDAP/Active Directory Login

```http
POST /api/auth/ldap/login
Content-Type: application/json
```

**Request:**
```json
{
  "firmId": "firm_id",
  "username": "john.doe",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "Authentication successful",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { ... }
}
```

---

### 11. Token Refresh

```http
POST /api/auth/refresh
Content-Type: application/json
```

**Request (token in cookie is automatic, or in body):**
```json
{
  "refreshToken": "eyJ..."
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "Token refreshed successfully",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { ... }
}
```

---

### 12. Logout

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "Logged out successfully"
}
```

---

### 13. Get Current User

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "error": false,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "lawyer",
    "firmId": "firm_id",
    "firmRole": "admin",
    "firm": { ... },
    "tenant": { ... },
    "permissions": { ... }
  }
}
```

---

### 14. Password Reset

#### Request Reset
```http
POST /api/auth/forgot-password
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "error": false,
  "message": "Password reset email sent"
}
```

#### Complete Reset
```http
POST /api/auth/reset-password
Content-Type: application/json
```

**Request:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewStrongP@ss123"
}
```

**Response (200):**
```json
{
  "error": false,
  "message": "Password reset successful"
}
```

---

## Token Storage Strategy

### Recommended: Hybrid Approach

```typescript
// auth.service.ts

class AuthService {
  private accessToken: string | null = null;

  // Store access token in memory (XSS protection)
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  // Get access token for API calls
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Refresh token is stored in httpOnly cookie automatically
  // No need to manage it manually

  // Handle login response
  handleAuthResponse(response: AuthResponse) {
    // Use OAuth 2.0 format (preferred)
    this.setAccessToken(response.access_token);

    // Schedule token refresh before expiry
    this.scheduleRefresh(response.expires_in);

    return response.user;
  }

  // Schedule token refresh
  private scheduleRefresh(expiresIn: number) {
    // Refresh 1 minute before expiry
    const refreshTime = (expiresIn - 60) * 1000;

    setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }

  // Refresh the access token
  async refreshToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include' // Include cookies
      });

      const data = await response.json();

      if (data.access_token) {
        this.setAccessToken(data.access_token);
        this.scheduleRefresh(data.expires_in);
      }
    } catch (error) {
      // Handle refresh failure (redirect to login)
      this.logout();
    }
  }
}
```

---

## Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Token Refresh Flow                           │
└─────────────────────────────────────────────────────────────────┘

1. User logs in
   └── Backend returns: access_token (15min), refresh_token (7 days)
       └── refresh_token stored in httpOnly cookie automatically

2. Frontend stores access_token in memory
   └── Schedules refresh at 14 minutes (1 min before expiry)

3. Before access_token expires:
   └── POST /api/auth/refresh (credentials: include)
       └── Backend reads refresh_token from cookie
           └── Returns new access_token + rotated refresh_token
               └── Both tokens updated automatically

4. If refresh fails (token expired/revoked):
   └── Redirect to login page
```

---

## MFA Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         MFA Login Flow                           │
└─────────────────────────────────────────────────────────────────┘

Step 1: POST /api/auth/login
        Body: { email, password }

        Response if MFA enabled:
        {
          "mfaRequired": true,
          "userId": "...",
          "code": "MFA_REQUIRED"
        }

Step 2: Show MFA input screen to user

Step 3: POST /api/auth/login (same endpoint!)
        Body: { email, password, mfaCode: "123456" }

        Response:
        {
          "access_token": "...",
          "refresh_token": "...",
          "user": {...}
        }
```

### Frontend Implementation

```typescript
async function login(email: string, password: string, mfaCode?: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, mfaCode })
  });

  const data = await response.json();

  if (data.mfaRequired) {
    // Show MFA input screen
    return { requiresMfa: true, userId: data.userId };
  }

  if (data.access_token) {
    // Login successful
    authService.handleAuthResponse(data);
    return { success: true, user: data.user };
  }

  // Handle error
  return { error: data.message };
}
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | No authentication token provided |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `INVALID_TOKEN` | 401 | Token is invalid or malformed |
| `REFRESH_TOKEN_REQUIRED` | 401 | Refresh token missing |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token has expired |
| `REFRESH_TOKEN_REVOKED` | 401 | Token was revoked (logout/security) |
| `MFA_REQUIRED` | 200 | User has MFA enabled, need code |
| `INVALID_MFA_CODE` | 401 | MFA code is incorrect |
| `ACCOUNT_LOCKED` | 423 | Too many failed attempts |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `USER_NOT_FOUND` | 404 | No user with this email |

### Error Response Format

```json
{
  "error": true,
  "message": "Arabic message",
  "messageEn": "English message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

---

## TypeScript Interfaces

```typescript
// types/auth.ts

interface AuthResponse {
  error: boolean;
  message: string;
  messageEn?: string;

  // OAuth 2.0 Standard (use these)
  access_token: string | null;
  refresh_token: string | null;
  token_type: 'Bearer';
  expires_in: number;

  // Backwards compatibility (deprecated)
  accessToken?: string;
  refreshToken?: string;

  // User data
  user: User;

  // Additional flags
  isNewUser?: boolean;
  registrationRequired?: boolean;
  accountLinked?: boolean;
  mfaRequired?: boolean;
  userId?: string;
  csrfToken?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  role: 'lawyer' | 'client' | 'admin';
  image?: string;
  phone?: string;
  isEmailVerified: boolean;
  isSoloLawyer: boolean;
  lawyerWorkMode?: 'solo' | 'firm';

  // Firm context
  firmId?: string;
  firmRole?: 'owner' | 'admin' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant';
  firmStatus?: 'active' | 'departed' | 'pending';
  firm?: FirmInfo;
  tenant?: TenantInfo;
  permissions?: Permissions;

  // SSO
  ssoProvider?: 'google' | 'microsoft' | 'apple';
  ssoExternalId?: string;
}

interface FirmInfo {
  id: string;
  name: string;
  nameEn: string;
  status: 'active' | 'suspended' | 'inactive';
}

interface TenantInfo {
  id: string;
  name: string;
  nameEn: string;
  status: string;
  subscription: {
    plan: 'free' | 'basic' | 'professional' | 'enterprise';
    status: 'trial' | 'active' | 'expired' | 'cancelled';
  };
}

interface Permissions {
  cases?: 'view' | 'edit' | 'full';
  clients?: 'view' | 'edit' | 'full';
  documents?: 'view' | 'edit' | 'full';
  invoices?: 'view' | 'edit' | 'full';
  reports?: 'view' | 'edit' | 'full';
  settings?: 'view' | 'edit' | 'full';
}

interface MfaRequiredResponse {
  error: false;
  mfaRequired: true;
  message: string;
  messageEn: string;
  userId: string;
  code: 'MFA_REQUIRED';
}

interface ErrorResponse {
  error: true;
  message: string;
  messageEn?: string;
  code: string;
  details?: Record<string, any>;
}
```

---

## API Request Helper

```typescript
// utils/api.ts

class ApiClient {
  private baseUrl = '/api';
  private authService: AuthService;

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth header if we have a token
    const token = this.authService.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Always include cookies
    });

    // Handle 401 - try to refresh token
    if (response.status === 401) {
      const refreshed = await this.authService.refreshToken();
      if (refreshed) {
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${this.authService.getAccessToken()}`;
        const retryResponse = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
        return retryResponse.json();
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    return response.json();
  }

  // Convenience methods
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
```

---

## Quick Reference

### Login Methods Available

| Method | Endpoint | Tokens Returned |
|--------|----------|-----------------|
| Email + Password | `POST /auth/login` | Yes |
| Email + Password + MFA | `POST /auth/login` | Yes |
| Email OTP | `POST /auth/verify-otp` | Yes |
| Phone OTP | `POST /auth/phone/verify-otp` | Yes |
| Magic Link | `POST /auth/magic-link/verify` | Yes |
| Google One Tap | `POST /auth/google/one-tap` | Yes |
| OAuth SSO | `POST /auth/sso/callback` | Yes* |
| WebAuthn/Passkey | `POST /auth/webauthn/authenticate/finish` | Yes |
| LDAP/AD | `POST /auth/ldap/login` | Yes |
| SAML | Redirect flow | Cookies only |

*OAuth SSO returns null tokens for new users (registration required)

---

## Migration Checklist

- [ ] Update token extraction to use `access_token` instead of `accessToken`
- [ ] Update refresh token extraction to use `refresh_token`
- [ ] Ensure `credentials: 'include'` on all auth requests
- [ ] Implement token refresh scheduling
- [ ] Handle `mfaRequired` response in login flow
- [ ] Handle `isNewUser` / `registrationRequired` for OAuth
- [ ] Update TypeScript interfaces
- [ ] Test all login methods
