# Complete Frontend Authentication API Guide

Comprehensive guide for all authentication endpoints including Login, Register, OTP, MFA, Sessions, and Password Management.

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Authentication Flow](#authentication-flow)
3. [Basic Auth Endpoints](#basic-auth-endpoints)
4. [OTP (Email)](#otp-email)
5. [Phone OTP (SMS)](#phone-otp-sms)
6. [Magic Link](#magic-link)
7. [Google One Tap](#google-one-tap)
8. [MFA / Authenticator App](#mfa--authenticator-app)
9. [Backup Codes](#backup-codes)
10. [Session Management](#session-management)
11. [Password Management](#password-management)
12. [CSRF Protection](#csrf-protection)
13. [Error Codes Reference](#error-codes-reference)
14. [TypeScript Types](#typescript-types)

---

## Quick Reference

### Base URL
```
https://dashboard.traf3li.com/api/auth
```

### All Endpoints at a Glance

| Category | Endpoint | Method | Auth Required | CAPTCHA |
|----------|----------|--------|---------------|---------|
| **Basic Auth** |
| | `/register` | POST | No | No |
| | `/login` | POST | No | After 3 failures |
| | `/logout` | POST | Yes | No |
| | `/logout-all` | POST | Yes | No |
| | `/refresh` | POST | No (refresh token) | No |
| | `/me` | GET | Yes | No |
| **OTP (Email)** |
| | `/send-otp` | POST | No | No |
| | `/verify-otp` | POST | No | No |
| | `/resend-otp` | POST | No | No |
| | `/otp-status` | GET | No | No |
| **Phone OTP** |
| | `/phone/send-otp` | POST | No | No |
| | `/phone/verify-otp` | POST | No | No |
| | `/phone/resend-otp` | POST | No | No |
| | `/phone/otp-status` | GET | No | No |
| **Magic Link** |
| | `/magic-link/send` | POST | No | No |
| | `/magic-link/verify` | POST | No | No |
| **Google** |
| | `/google/one-tap` | POST | No | No |
| **MFA Setup** |
| | `/mfa/setup` | POST | Yes | No |
| | `/mfa/verify-setup` | POST | Yes | No |
| | `/mfa/verify` | POST | No | No |
| | `/mfa/disable` | POST | Yes | No |
| | `/mfa/status` | GET | Yes | No |
| **Backup Codes** |
| | `/mfa/backup-codes/generate` | POST | Yes | No |
| | `/mfa/backup-codes/verify` | POST | No | No |
| | `/mfa/backup-codes/regenerate` | POST | Yes | No |
| | `/mfa/backup-codes/count` | GET | Yes | No |
| **Sessions** |
| | `/sessions` | GET | Yes | No |
| | `/sessions/current` | GET | Yes | No |
| | `/sessions/stats` | GET | Yes | No |
| | `/sessions/:id` | DELETE | Yes | No |
| | `/sessions` | DELETE | Yes | No |
| **Password** |
| | `/forgot-password` | POST | No | Always |
| | `/reset-password` | POST | No | No |
| | `/change-password` | POST | Yes | No |
| | `/password-status` | GET | Yes | No |
| **Email** |
| | `/verify-email` | POST | No | No |
| | `/resend-verification` | POST | Yes | No |
| **Other** |
| | `/csrf` | GET | Yes | No |
| | `/check-availability` | POST | No | No |

---

## Authentication Flow

### Standard Login Flow (Email/Password)
```
┌─────────────────────────────────────────────────────────────┐
│                    USER ENTERS CREDENTIALS                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              POST /api/auth/login                            │
│              { email, password }                             │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ SUCCESS  │    │ MFA_REQ  │    │ CAPTCHA  │
       │          │    │          │    │ REQUIRED │
       └──────────┘    └──────────┘    └──────────┘
              │               │               │
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │  Done!   │    │ Show MFA │    │  Show    │
       │ Redirect │    │  Input   │    │ Turnstile│
       └──────────┘    └──────────┘    └──────────┘
                              │               │
                              ▼               ▼
                       ┌──────────┐    ┌──────────┐
                       │ POST     │    │ Retry    │
                       │ /mfa/    │    │ Login    │
                       │ verify   │    │ + token  │
                       └──────────┘    └──────────┘
```

### MFA Login Flow
```
1. POST /login → Response: { requireMFA: true, userId: "..." }
2. Show TOTP input OR Backup code input
3. POST /mfa/verify { userId, token } OR POST /mfa/backup-codes/verify { userId, code }
4. Success → Tokens returned
```

---

## Basic Auth Endpoints

### 1. Register

**POST** `/api/auth/register`

```typescript
// Request
{
  email: string;          // Required
  password: string;       // Required, min 8 chars, uppercase, lowercase, number, special
  firstName?: string;
  lastName?: string;
  phone?: string;
  username?: string;
  role?: 'lawyer' | 'client';  // Default: 'client'
}

// Response (201)
{
  error: false,
  message: "تم إنشاء الحساب بنجاح",
  messageEn: "Account created successfully",
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: string,
    isEmailVerified: boolean
  }
}

// Error Response (409 - Email exists)
{
  error: true,
  message: "البريد الإلكتروني مستخدم بالفعل",
  messageEn: "Email already in use",
  code: "EMAIL_EXISTS"
}
```

---

### 2. Login

**POST** `/api/auth/login`

```typescript
// Request
{
  email: string;           // or username
  password: string;
  captchaToken?: string;   // Required after 3 failed attempts
  captchaProvider?: string; // 'turnstile'
}

// Success Response (200)
{
  error: false,
  message: "تم تسجيل الدخول بنجاح",
  messageEn: "Login successful",
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: string,
    firmId?: string,
    firmRole?: string,
    permissions?: object
  }
  // Tokens set in httpOnly cookies
}

// MFA Required Response (200)
{
  error: false,
  message: "يرجى إدخال رمز التحقق",
  messageEn: "Please enter verification code",
  requireMFA: true,
  mfaMethods: ['totp', 'backup_codes'],
  userId: string,  // Use this for MFA verification
  hasBackupCodes: boolean
}

// CAPTCHA Required Response (400)
{
  error: true,
  message: "التحقق من CAPTCHA مطلوب",
  messageEn: "CAPTCHA verification required",
  code: "CAPTCHA_REQUIRED",
  enabledProviders: ["turnstile"],
  defaultProvider: "turnstile"
}

// Invalid Credentials Response (401)
{
  error: true,
  message: "بيانات الاعتماد غير صحيحة",
  messageEn: "Invalid credentials",
  code: "INVALID_CREDENTIALS"
}

// Account Locked Response (423)
{
  error: true,
  message: "تم قفل الحساب بسبب محاولات تسجيل دخول فاشلة متعددة",
  messageEn: "Account locked due to multiple failed login attempts",
  code: "ACCOUNT_LOCKED",
  lockExpiresAt: "2024-01-15T10:30:00Z"
}
```

---

### 3. Logout

**POST** `/api/auth/logout`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  success: true,
  message: "تم تسجيل الخروج بنجاح",
  messageEn: "Logged out successfully"
}
```

---

### 4. Logout All Devices

**POST** `/api/auth/logout-all`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  message: "تم تسجيل الخروج من جميع الأجهزة",
  messageEn: "Successfully logged out from all devices",
  terminatedSessions: 3
}
```

---

### 5. Refresh Token

**POST** `/api/auth/refresh`

```typescript
// Request (token can be in body or httpOnly cookie)
{
  refreshToken?: string  // Optional if using cookies
}

// Response (200)
{
  error: false,
  message: "تم تجديد الجلسة",
  messageEn: "Session refreshed",
  tokens: {
    accessToken: string,
    refreshToken: string
  },
  user: { ... }
}

// Token Expired Response (401)
{
  error: true,
  message: "انتهت صلاحية الجلسة",
  messageEn: "Session expired",
  code: "TOKEN_EXPIRED"
}
```

---

### 6. Get Current User

**GET** `/api/auth/me`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  success: true,
  data: {
    id: string,
    email: string,
    username: string,
    firstName: string,
    lastName: string,
    phone: string,
    role: string,
    isEmailVerified: boolean,
    mfaEnabled: boolean,
    firmId?: string,
    firmRole?: string,
    firm?: {
      id: string,
      name: string,
      nameEnglish: string
    },
    permissions?: object,
    createdAt: string
  }
}
```

---

### 7. Check Availability

**POST** `/api/auth/check-availability`

```typescript
// Request
{
  email?: string,
  username?: string,
  phone?: string
}

// Response (200)
{
  available: boolean,
  field: "email" | "username" | "phone",
  message: string
}
```

---

## OTP (Email)

### 1. Send OTP

**POST** `/api/auth/send-otp`

```typescript
// Request
{
  email: string,
  purpose?: 'login' | 'registration' | 'password_reset' | 'email_verification' | 'transaction'
}

// Response (200)
{
  success: true,
  message: "تم إرسال رمز التحقق بنجاح",
  messageAr: "تم إرسال رمز التحقق بنجاح",
  expiresIn: 300,  // seconds
  email: "user@example.com"
}

// Rate Limited Response (429)
{
  success: false,
  error: "Please wait before requesting another OTP",
  errorAr: "يرجى الانتظار قبل طلب رمز جديد",
  waitTime: 60
}
```

---

### 2. Verify OTP

**POST** `/api/auth/verify-otp`

```typescript
// Request
{
  email: string,
  otp: string,  // 6-digit code
  purpose?: string
}

// Success Response (200)
{
  success: true,
  message: "تم التحقق بنجاح",
  messageAr: "تم التحقق بنجاح",
  user: { ... },
  // Tokens set in cookies for login purpose
}

// Invalid OTP Response (401)
{
  success: false,
  error: "Invalid or expired OTP",
  errorAr: "رمز التحقق غير صحيح أو منتهي الصلاحية",
  attemptsRemaining: 2
}
```

---

### 3. Resend OTP

**POST** `/api/auth/resend-otp`

```typescript
// Request
{
  email: string,
  purpose?: string
}

// Response (200)
{
  success: true,
  message: "تم إعادة إرسال رمز التحقق",
  messageAr: "تم إعادة إرسال رمز التحقق",
  expiresIn: 300
}
```

---

### 4. Check OTP Status

**GET** `/api/auth/otp-status`

```typescript
// Response (200)
{
  success: true,
  data: {
    attemptsRemaining: 3,
    resetTime: "2024-01-15T10:30:00Z"
  }
}
```

---

## Phone OTP (SMS)

### 1. Send Phone OTP

**POST** `/api/auth/phone/send-otp`

```typescript
// Request
{
  phone: string,  // International format: +966501234567
  purpose?: 'login' | 'registration' | 'verify_phone' | 'password_reset' | 'transaction'
}

// Response (200)
{
  success: true,
  message: "OTP sent successfully via SMS",
  messageAr: "تم إرسال رمز التحقق بنجاح",
  expiresIn: 300,
  phone: "+966501234567",
  provider: "twilio"  // or "msg91"
}
```

---

### 2. Verify Phone OTP

**POST** `/api/auth/phone/verify-otp`

```typescript
// Request
{
  phone: string,
  otp: string,
  purpose?: string
}

// Response (200)
{
  success: true,
  message: "Phone verified successfully",
  messageAr: "تم التحقق من رقم الهاتف بنجاح",
  user: { ... }  // For login purpose
}
```

---

### 3. Resend Phone OTP

**POST** `/api/auth/phone/resend-otp`

```typescript
// Request
{
  phone: string,
  purpose?: string
}

// Response (200)
{
  success: true,
  message: "OTP resent successfully",
  messageAr: "تم إعادة إرسال رمز التحقق"
}
```

---

### 4. Check Phone OTP Status

**GET** `/api/auth/phone/otp-status?phone=+966501234567&purpose=login`

```typescript
// Response (200)
{
  success: true,
  canRequest: true,
  waitTime: 0,
  message: "You can request a new OTP",
  messageAr: "يمكنك طلب رمز جديد"
}
```

---

## Magic Link

### 1. Send Magic Link

**POST** `/api/auth/magic-link/send`

```typescript
// Request
{
  email: string,
  purpose?: 'login' | 'register' | 'verify_email',
  redirectUrl?: string  // Where to redirect after verification
}

// Response (200)
{
  error: false,
  message: "تم إرسال رابط تسجيل الدخول",
  messageEn: "Magic link sent to your email",
  expiresInMinutes: 15
}
```

---

### 2. Verify Magic Link

**POST** `/api/auth/magic-link/verify`

```typescript
// Request
{
  token: string  // Token from email link
}

// Response (200)
{
  error: false,
  message: "تم التحقق بنجاح",
  messageEn: "Verification successful",
  user: { ... },
  redirectUrl: string
  // Tokens set in cookies
}
```

---

## Google One Tap

**POST** `/api/auth/google/one-tap`

```typescript
// Request
{
  credential: string,  // JWT from Google One Tap
  firmId?: string      // Optional: Join specific firm
}

// Response (200) - Existing User
{
  error: false,
  message: "تم تسجيل الدخول بنجاح",
  messageEn: "Login successful",
  user: { ... },
  isNewUser: false,
  accountLinked: false
}

// Response (200) - New User Created
{
  error: false,
  message: "تم إنشاء الحساب بنجاح",
  messageEn: "Account created successfully",
  user: { ... },
  isNewUser: true
}

// Response (200) - Account Linked
{
  error: false,
  message: "تم ربط حساب Google بنجاح",
  messageEn: "Google account linked successfully",
  user: { ... },
  accountLinked: true
}

// Error - Already Linked to Another Account (400)
{
  error: true,
  message: "حساب Google مرتبط بحساب آخر",
  messageEn: "Google account already linked to another user",
  code: "GOOGLE_ACCOUNT_ALREADY_LINKED"
}
```

---

## MFA / Authenticator App

### 1. Setup MFA (Get QR Code)

**POST** `/api/auth/mfa/setup`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  message: "امسح رمز QR بتطبيق المصادقة الخاص بك",
  messageEn: "Scan the QR code with your authenticator app",
  qrCode: "data:image/png;base64,...",  // QR code image
  setupKey: "JBSWY3DPEHPK3PXP",  // Manual entry key
  instructions: {
    ar: "افتح تطبيق المصادقة (Google Authenticator أو Authy) وامسح رمز QR",
    en: "Open your authenticator app (Google Authenticator or Authy) and scan the QR code"
  }
}

// Error - MFA Already Enabled (400)
{
  error: true,
  message: "المصادقة الثنائية مفعلة بالفعل",
  messageEn: "MFA is already enabled",
  code: "MFA_ALREADY_ENABLED"
}
```

---

### 2. Verify Setup & Enable MFA

**POST** `/api/auth/mfa/verify-setup`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Request
{
  token: string  // 6-digit code from authenticator app
}

// Response (200)
{
  error: false,
  message: "تم تفعيل المصادقة الثنائية بنجاح",
  messageEn: "MFA enabled successfully",
  enabled: true,
  backupCodes: [
    "ABCD-1234",
    "EFGH-5678",
    "IJKL-9012",
    // ... 10 codes total
  ],
  backupCodesWarning: {
    ar: "احفظ هذه الرموز الاحتياطية في مكان آمن",
    en: "Save these backup codes in a safe place"
  }
}

// Error - Invalid Token (400)
{
  error: true,
  message: "رمز التحقق غير صحيح",
  messageEn: "Invalid verification token",
  code: "INVALID_TOKEN"
}
```

---

### 3. Verify MFA During Login

**POST** `/api/auth/mfa/verify`

```typescript
// Request
{
  userId: string,  // From login response
  token: string    // 6-digit code from authenticator
}

// Response (200)
{
  error: false,
  message: "تم التحقق بنجاح",
  messageEn: "Verification successful",
  valid: true
  // Full login tokens now set in cookies
}

// Error - Invalid Token (401)
{
  error: true,
  message: "رمز التحقق غير صحيح",
  messageEn: "Invalid verification token",
  code: "INVALID_TOKEN",
  valid: false
}
```

---

### 4. Disable MFA

**POST** `/api/auth/mfa/disable`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Request
{
  password: string  // Current password for verification
}

// Response (200)
{
  error: false,
  message: "تم تعطيل المصادقة الثنائية بنجاح",
  messageEn: "MFA disabled successfully",
  disabled: true
}

// Error - Invalid Password (401)
{
  error: true,
  message: "كلمة المرور غير صحيحة",
  messageEn: "Invalid password",
  code: "INVALID_PASSWORD"
}
```

---

### 5. Get MFA Status

**GET** `/api/auth/mfa/status`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  mfaEnabled: true,
  hasTOTP: true,
  hasBackupCodes: true,
  remainingCodes: 8
}
```

---

## Backup Codes

### 1. Generate Backup Codes

**POST** `/api/auth/mfa/backup-codes/generate`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  message: "تم إنشاء رموز الاحتياطية بنجاح",
  messageEn: "Backup codes generated successfully",
  codes: [
    "ABCD-1234",
    "EFGH-5678",
    // ... 10 codes
  ],
  remainingCodes: 10,
  totalCodes: 10
}
```

---

### 2. Verify Backup Code (During Login)

**POST** `/api/auth/mfa/backup-codes/verify`

```typescript
// Request
{
  userId: string,    // From login response
  code: string       // Format: ABCD-1234
}

// Response (200)
{
  error: false,
  message: "تم التحقق من رمز الاحتياطي بنجاح",
  messageEn: "Backup code verified successfully",
  valid: true,
  remainingCodes: 7,
  warning: {  // Only if remainingCodes <= 2
    message: "عدد رموز الاحتياطية المتبقية قليل",
    messageEn: "Low backup codes remaining",
    remainingCodes: 2
  }
}

// Error - Invalid Code (401)
{
  error: true,
  message: "رمز الاحتياطي غير صحيح أو تم استخدامه",
  messageEn: "Invalid or already used backup code",
  code: "INVALID_CODE",
  remainingCodes: 5
}
```

---

### 3. Regenerate Backup Codes

**POST** `/api/auth/mfa/backup-codes/regenerate`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  message: "تم إعادة إنشاء رموز الاحتياطية. تم إلغاء الرموز القديمة",
  messageEn: "Backup codes regenerated. All old codes invalidated",
  codes: [ ... ],
  remainingCodes: 10
}
```

---

### 4. Get Backup Codes Count

**GET** `/api/auth/mfa/backup-codes/count`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  remainingCodes: 5,
  warning: null  // or warning object if remainingCodes <= 2
}
```

---

## Session Management

### 1. List All Sessions

**GET** `/api/auth/sessions`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  message: "تم جلب الجلسات النشطة",
  sessions: [
    {
      id: "session_id",
      device: "desktop",
      browser: "Chrome",
      os: "Windows",
      ip: "192.168.1.1",
      location: {
        country: "Saudi Arabia",
        city: "Riyadh",
        region: "Riyadh Region"
      },
      createdAt: "2024-01-15T08:00:00Z",
      lastActivityAt: "2024-01-15T10:30:00Z",
      expiresAt: "2024-01-22T08:00:00Z",
      isCurrent: true,
      isNewDevice: false,
      isSuspicious: false,
      suspiciousReasons: []
    }
  ],
  count: 3
}
```

---

### 2. Get Current Session

**GET** `/api/auth/sessions/current`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  message: "معلومات الجلسة الحالية",
  session: {
    id: "session_id",
    device: "desktop",
    browser: "Chrome",
    os: "Windows",
    ip: "192.168.1.1",
    location: { ... },
    createdAt: "2024-01-15T08:00:00Z",
    lastActivityAt: "2024-01-15T10:30:00Z",
    isCurrent: true,
    isSuspicious: false
  },
  securityWarnings: []  // Array of warnings if any
}
```

---

### 3. Get Session Stats

**GET** `/api/auth/sessions/stats`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  stats: {
    activeCount: 3,
    totalCount: 15,
    suspiciousCount: 0,
    maxConcurrentSessions: 5,
    inactivityTimeoutSeconds: 604800,
    recentSessions: [ ... ]
  }
}
```

---

### 4. Terminate Specific Session

**DELETE** `/api/auth/sessions/:id`

**Headers:** `Authorization: Bearer <accessToken>`, `X-CSRF-Token: <token>`

```typescript
// Response (200)
{
  error: false,
  message: "تم إنهاء الجلسة بنجاح",
  messageEn: "Session terminated successfully"
}
```

---

### 5. Terminate All Other Sessions

**DELETE** `/api/auth/sessions`

**Headers:** `Authorization: Bearer <accessToken>`, `X-CSRF-Token: <token>`

```typescript
// Response (200)
{
  error: false,
  message: "تم إنهاء جميع الجلسات الأخرى",
  messageEn: "All other sessions terminated",
  terminatedCount: 2
}
```

---

## Password Management

### 1. Forgot Password

**POST** `/api/auth/forgot-password`

**CAPTCHA Required: Always**

```typescript
// Request
{
  email: string,
  captchaToken: string,     // REQUIRED
  captchaProvider: string   // 'turnstile'
}

// Response (200) - Always returns success to prevent email enumeration
{
  error: false,
  message: "إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة التعيين",
  messageEn: "If the email is registered, you will receive a reset link",
  expiresInMinutes: 30
}
```

---

### 2. Reset Password

**POST** `/api/auth/reset-password`

```typescript
// Request
{
  token: string,       // From email link
  newPassword: string  // Must meet password policy
}

// Response (200)
{
  error: false,
  message: "تم إعادة تعيين كلمة المرور بنجاح",
  messageEn: "Password reset successfully"
}

// Error - Invalid/Expired Token (400)
{
  error: true,
  message: "رابط إعادة التعيين غير صالح أو منتهي",
  messageEn: "Invalid or expired reset link",
  code: "INVALID_TOKEN"
}

// Error - Weak Password (400)
{
  error: true,
  message: "كلمة المرور ضعيفة",
  messageEn: "Password does not meet requirements",
  code: "WEAK_PASSWORD",
  errors: [
    "Must be at least 8 characters",
    "Must contain uppercase letter",
    "Must contain number"
  ]
}
```

---

### 3. Change Password (Logged In)

**POST** `/api/auth/change-password`

**Headers:** `Authorization: Bearer <accessToken>`, `X-CSRF-Token: <token>`

```typescript
// Request
{
  currentPassword: string,
  newPassword: string
}

// Response (200)
{
  error: false,
  message: "تم تغيير كلمة المرور بنجاح",
  messageEn: "Password changed successfully",
  data: {
    passwordChangedAt: "2024-01-15T10:30:00Z",
    passwordExpiresAt: "2024-04-15T10:30:00Z",
    strengthScore: 4,
    strengthLabel: "Strong"
  }
}

// Error - Wrong Current Password (401)
{
  error: true,
  message: "كلمة المرور الحالية غير صحيحة",
  messageEn: "Current password is incorrect",
  code: "INVALID_PASSWORD"
}
```

---

### 4. Password Status

**GET** `/api/auth/password-status`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  data: {
    mustChangePassword: false,
    passwordChangedAt: "2024-01-01T00:00:00Z",
    passwordExpiresAt: "2024-04-01T00:00:00Z",
    expirationEnabled: true,
    daysOld: 15,
    daysRemaining: 75,
    needsRotation: false,
    showWarning: false
  }
}
```

---

## Email Verification

### 1. Verify Email

**POST** `/api/auth/verify-email`

```typescript
// Request
{
  token: string  // From email link
}

// Response (200)
{
  error: false,
  message: "تم التحقق من البريد الإلكتروني بنجاح",
  messageEn: "Email verified successfully",
  user: {
    id: string,
    email: string,
    isEmailVerified: true,
    emailVerifiedAt: "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Resend Verification Email

**POST** `/api/auth/resend-verification`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  message: "تم إرسال رابط التحقق",
  messageEn: "Verification email sent",
  expiresAt: "2024-01-15T11:30:00Z"
}

// Error - Already Verified (400)
{
  error: true,
  message: "البريد الإلكتروني محقق بالفعل",
  messageEn: "Email is already verified",
  code: "ALREADY_VERIFIED"
}
```

---

## CSRF Protection

### Get CSRF Token

**GET** `/api/auth/csrf`

**Headers:** `Authorization: Bearer <accessToken>`

```typescript
// Response (200)
{
  error: false,
  csrfToken: "a1b2c3d4e5f6...",
  enabled: true,
  expiresAt: "2024-01-15T11:30:00Z",
  ttl: 3600  // seconds
}
```

**Usage:**
```typescript
// Include in state-changing requests
headers: {
  'Authorization': 'Bearer <accessToken>',
  'X-CSRF-Token': '<csrfToken>'
}
```

---

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `ACCOUNT_LOCKED` | 423 | Too many failed attempts |
| `ACCOUNT_SUSPENDED` | 403 | Account suspended by admin |
| `TOKEN_EXPIRED` | 401 | Access/refresh token expired |
| `INVALID_TOKEN` | 400/401 | Invalid or malformed token |
| `MFA_REQUIRED` | 200 | MFA verification needed |
| `MFA_NOT_ENABLED` | 400 | MFA is not enabled |
| `MFA_ALREADY_ENABLED` | 400 | MFA is already enabled |
| `INVALID_PASSWORD` | 401 | Wrong password |
| `WEAK_PASSWORD` | 400 | Password doesn't meet requirements |
| `EMAIL_EXISTS` | 409 | Email already registered |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `CAPTCHA_REQUIRED` | 400 | CAPTCHA verification needed |
| `CAPTCHA_VERIFICATION_FAILED` | 400 | CAPTCHA token invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SESSION_NOT_FOUND` | 404 | Session doesn't exist |
| `CSRF_TOKEN_INVALID` | 403 | Invalid CSRF token |

---

## TypeScript Types

```typescript
// Auth Types
interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: 'admin' | 'lawyer' | 'client';
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  firmId?: string;
  firmRole?: 'owner' | 'admin' | 'lawyer' | 'secretary' | 'accountant';
  permissions?: Record<string, string>;
  createdAt: string;
}

interface LoginRequest {
  email: string;
  password: string;
  captchaToken?: string;
  captchaProvider?: 'turnstile' | 'recaptcha' | 'hcaptcha';
}

interface LoginResponse {
  error: boolean;
  message: string;
  messageEn: string;
  user?: User;
  requireMFA?: boolean;
  mfaMethods?: ('totp' | 'backup_codes')[];
  userId?: string;
  hasBackupCodes?: boolean;
}

interface MFAVerifyRequest {
  userId: string;
  token: string;  // 6-digit TOTP code
}

interface BackupCodeVerifyRequest {
  userId: string;
  code: string;  // Format: ABCD-1234
}

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
  suspiciousReasons: string[];
}

interface ApiError {
  error: true;
  message: string;
  messageEn: string;
  code: string;
  errors?: string[];
}

// CAPTCHA Types
interface CaptchaRequiredResponse {
  error: true;
  code: 'CAPTCHA_REQUIRED';
  enabledProviders: string[];
  defaultProvider: string;
}
```

---

## React Hook Example

```typescript
// useAuth.ts
import { useState, useCallback } from 'react';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requireMFA: boolean;
  mfaUserId: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    requireMFA: false,
    mfaUserId: null,
  });

  const login = useCallback(async (
    email: string,
    password: string,
    captchaToken?: string
  ) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
        ...(captchaToken && {
          captchaToken,
          captchaProvider: 'turnstile'
        })
      }),
    });

    const data = await res.json();

    if (data.requireMFA) {
      setState(prev => ({
        ...prev,
        requireMFA: true,
        mfaUserId: data.userId,
      }));
      return { requireMFA: true, mfaMethods: data.mfaMethods };
    }

    if (data.code === 'CAPTCHA_REQUIRED') {
      return { captchaRequired: true };
    }

    if (!res.ok) {
      throw new Error(data.messageEn || 'Login failed');
    }

    setState(prev => ({
      ...prev,
      user: data.user,
      isAuthenticated: true,
      requireMFA: false,
      mfaUserId: null,
    }));

    return { success: true };
  }, []);

  const verifyMFA = useCallback(async (token: string) => {
    if (!state.mfaUserId) throw new Error('No MFA session');

    const res = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        userId: state.mfaUserId,
        token,
      }),
    });

    const data = await res.json();

    if (!data.valid) {
      throw new Error(data.messageEn || 'Invalid code');
    }

    // Fetch user after successful MFA
    await fetchUser();
    return { success: true };
  }, [state.mfaUserId]);

  const verifyBackupCode = useCallback(async (code: string) => {
    if (!state.mfaUserId) throw new Error('No MFA session');

    const res = await fetch('/api/auth/mfa/backup-codes/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        userId: state.mfaUserId,
        code,
      }),
    });

    const data = await res.json();

    if (!data.valid) {
      throw new Error(data.messageEn || 'Invalid backup code');
    }

    await fetchUser();
    return { success: true, remainingCodes: data.remainingCodes };
  }, [state.mfaUserId]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!res.ok) {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }));
        return;
      }

      const data = await res.json();
      setState(prev => ({
        ...prev,
        user: data.data,
        isAuthenticated: true,
        isLoading: false,
        requireMFA: false,
        mfaUserId: null,
      }));
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      requireMFA: false,
      mfaUserId: null,
    });
  }, []);

  return {
    ...state,
    login,
    verifyMFA,
    verifyBackupCode,
    fetchUser,
    logout,
  };
}
```

---

## Password Requirements

When creating or changing passwords, ensure they meet:

- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

```typescript
const validatePassword = (password: string): string[] => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Must contain special character');
  }

  return errors;
};
```
