# Frontend CAPTCHA Integration Guide

Complete guide for integrating Cloudflare Turnstile CAPTCHA with the Traf3li API.

## Table of Contents
1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [API Endpoints](#api-endpoints)
5. [React Implementation](#react-implementation)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Overview

### CAPTCHA Behavior Summary

| Endpoint | CAPTCHA Required | When |
|----------|------------------|------|
| `POST /api/auth/register` | No | Disabled by default |
| `POST /api/auth/login` | Conditional | After 3 failed login attempts |
| `POST /api/auth/forgot-password` | Always | Every request |

### How It Works

1. **Login Flow**: User can login normally without CAPTCHA
2. **After 3 failures**: API returns `CAPTCHA_REQUIRED` error
3. **Frontend shows widget**: User completes Turnstile challenge
4. **Retry with token**: Frontend sends `captchaToken` + `captchaProvider`
5. **Success**: Login proceeds normally

---

## Installation

### Option 1: React Package (Recommended)
```bash
npm install @marsidev/react-turnstile
# or
yarn add @marsidev/react-turnstile
# or
pnpm add @marsidev/react-turnstile
```

### Option 2: Script Tag (Vanilla JS)
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

---

## Configuration

### Environment Variables

Create a `.env` file in your frontend project:

```env
# Cloudflare Turnstile Site Key (public, safe to expose)
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAxxxxxxxxxxxxxxxxxx
# or for Create React App:
REACT_APP_TURNSTILE_SITE_KEY=0x4AAAAAAxxxxxxxxxxxxxxxxxx
# or for Next.js:
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAxxxxxxxxxxxxxxxxxx
```

### Constants File

```typescript
// src/config/captcha.config.ts

export const CAPTCHA_CONFIG = {
  SITE_KEY: import.meta.env.VITE_TURNSTILE_SITE_KEY || '',
  PROVIDER: 'turnstile',

  // Error codes that indicate CAPTCHA is required
  CAPTCHA_REQUIRED_CODES: ['CAPTCHA_REQUIRED'],
  CAPTCHA_FAILED_CODES: ['CAPTCHA_VERIFICATION_FAILED'],
} as const;
```

---

## API Endpoints

### 1. Login Endpoint

**Endpoint:** `POST /api/auth/login`

**CAPTCHA Required:** After 3 failed attempts

#### Request WITHOUT CAPTCHA (normal login):
```typescript
// First attempt - no CAPTCHA needed
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});
```

#### Request WITH CAPTCHA (after failures):
```typescript
// After 3+ failed attempts - CAPTCHA required
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    captchaToken: 'XXXX.DUMMY.TOKEN.XXXX',  // From Turnstile widget
    captchaProvider: 'turnstile',            // Provider name
  }),
});
```

#### Success Response (200):
```json
{
  "error": false,
  "message": "تم تسجيل الدخول بنجاح",
  "messageEn": "Login successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### CAPTCHA Required Response (400):
```json
{
  "error": true,
  "message": "التحقق من CAPTCHA مطلوب",
  "messageEn": "CAPTCHA verification required",
  "code": "CAPTCHA_REQUIRED",
  "enabledProviders": ["turnstile"],
  "defaultProvider": "turnstile"
}
```

#### CAPTCHA Failed Response (400):
```json
{
  "error": true,
  "message": "فشل التحقق من CAPTCHA",
  "messageEn": "CAPTCHA verification failed",
  "code": "CAPTCHA_VERIFICATION_FAILED",
  "verified": false,
  "provider": "turnstile",
  "providerName": "Cloudflare Turnstile",
  "errorCodes": ["invalid-input-response"],
  "details": "Invalid or missing CAPTCHA token"
}
```

---

### 2. Register Endpoint

**Endpoint:** `POST /api/auth/register`

**CAPTCHA Required:** No (disabled by default)

#### Request:
```typescript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe',
    // Optional: Include CAPTCHA if you enable it later
    // captchaToken: 'XXXX.DUMMY.TOKEN.XXXX',
    // captchaProvider: 'turnstile',
  }),
});
```

---

### 3. Forgot Password Endpoint

**Endpoint:** `POST /api/auth/forgot-password`

**CAPTCHA Required:** Always

#### Request:
```typescript
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    captchaToken: 'XXXX.DUMMY.TOKEN.XXXX',  // REQUIRED
    captchaProvider: 'turnstile',            // REQUIRED
  }),
});
```

#### Success Response (200):
```json
{
  "error": false,
  "message": "تم إرسال رابط إعادة تعيين كلمة المرور",
  "messageEn": "Password reset link sent",
  "expiresInMinutes": 30
}
```

---

### Alternative: Using Headers

You can also send CAPTCHA data via headers instead of body:

```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Captcha-Token': captchaToken,
    'X-Captcha-Provider': 'turnstile',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});
```

---

## React Implementation

### 1. Turnstile Component Wrapper

```tsx
// src/components/TurnstileWidget.tsx

import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef, useImperativeHandle, forwardRef } from 'react';
import { CAPTCHA_CONFIG } from '../config/captcha.config';

export interface TurnstileWidgetRef {
  reset: () => void;
  getResponse: () => string | undefined;
}

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  ({ onSuccess, onError, onExpire, theme = 'auto', size = 'normal' }, ref) => {
    const turnstileRef = useRef<TurnstileInstance>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset();
      },
      getResponse: () => {
        return turnstileRef.current?.getResponse();
      },
    }));

    return (
      <Turnstile
        ref={turnstileRef}
        siteKey={CAPTCHA_CONFIG.SITE_KEY}
        onSuccess={onSuccess}
        onError={() => {
          console.error('Turnstile error');
          onError?.();
        }}
        onExpire={() => {
          console.warn('Turnstile token expired');
          onExpire?.();
        }}
        options={{
          theme,
          size,
        }}
      />
    );
  }
);

TurnstileWidget.displayName = 'TurnstileWidget';
```

---

### 2. CAPTCHA Hook

```tsx
// src/hooks/useCaptcha.ts

import { useState, useCallback } from 'react';
import { CAPTCHA_CONFIG } from '../config/captcha.config';

interface CaptchaState {
  isRequired: boolean;
  token: string | null;
  provider: string;
}

interface UseCaptchaReturn {
  captcha: CaptchaState;
  setCaptchaToken: (token: string | null) => void;
  setCaptchaRequired: (required: boolean) => void;
  resetCaptcha: () => void;
  isCaptchaError: (errorCode: string) => boolean;
  getCaptchaPayload: () => { captchaToken?: string; captchaProvider?: string };
}

export function useCaptcha(): UseCaptchaReturn {
  const [captcha, setCaptcha] = useState<CaptchaState>({
    isRequired: false,
    token: null,
    provider: CAPTCHA_CONFIG.PROVIDER,
  });

  const setCaptchaToken = useCallback((token: string | null) => {
    setCaptcha((prev) => ({ ...prev, token }));
  }, []);

  const setCaptchaRequired = useCallback((required: boolean) => {
    setCaptcha((prev) => ({ ...prev, isRequired: required, token: null }));
  }, []);

  const resetCaptcha = useCallback(() => {
    setCaptcha({
      isRequired: false,
      token: null,
      provider: CAPTCHA_CONFIG.PROVIDER,
    });
  }, []);

  const isCaptchaError = useCallback((errorCode: string) => {
    return (
      CAPTCHA_CONFIG.CAPTCHA_REQUIRED_CODES.includes(errorCode) ||
      CAPTCHA_CONFIG.CAPTCHA_FAILED_CODES.includes(errorCode)
    );
  }, []);

  const getCaptchaPayload = useCallback(() => {
    if (captcha.token) {
      return {
        captchaToken: captcha.token,
        captchaProvider: captcha.provider,
      };
    }
    return {};
  }, [captcha.token, captcha.provider]);

  return {
    captcha,
    setCaptchaToken,
    setCaptchaRequired,
    resetCaptcha,
    isCaptchaError,
    getCaptchaPayload,
  };
}
```

---

### 3. Login Form Component

```tsx
// src/components/LoginForm.tsx

import { useState, useRef } from 'react';
import { TurnstileWidget, TurnstileWidgetRef } from './TurnstileWidget';
import { useCaptcha } from '../hooks/useCaptcha';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const {
    captcha,
    setCaptchaToken,
    setCaptchaRequired,
    resetCaptcha,
    getCaptchaPayload,
  } = useCaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          ...getCaptchaPayload(), // Includes captchaToken & captchaProvider if available
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if CAPTCHA is required
        if (data.code === 'CAPTCHA_REQUIRED') {
          setCaptchaRequired(true);
          setError('Please complete the security check');
          return;
        }

        // Check if CAPTCHA verification failed
        if (data.code === 'CAPTCHA_VERIFICATION_FAILED') {
          // Reset the widget for retry
          turnstileRef.current?.reset();
          setCaptchaToken(null);
          setError('Security check failed. Please try again.');
          return;
        }

        // Other errors
        setError(data.messageEn || data.message || 'Login failed');
        return;
      }

      // Success! Reset CAPTCHA state
      resetCaptcha();

      // Handle successful login (redirect, store token, etc.)
      console.log('Login successful:', data.user);
      // window.location.href = '/dashboard';

    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptchaSuccess = (token: string) => {
    setCaptchaToken(token);
    setError(null); // Clear any previous error
  };

  const handleCaptchaError = () => {
    setCaptchaToken(null);
    setError('Security check failed to load. Please refresh the page.');
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
    setError('Security check expired. Please complete it again.');
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Login</h2>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          disabled={isLoading}
        />
      </div>

      {/* Show CAPTCHA only when required */}
      {captcha.isRequired && (
        <div className="captcha-container">
          <p className="captcha-message">
            Too many failed attempts. Please verify you're human.
          </p>
          <TurnstileWidget
            ref={turnstileRef}
            onSuccess={handleCaptchaSuccess}
            onError={handleCaptchaError}
            onExpire={handleCaptchaExpire}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || (captcha.isRequired && !captcha.token)}
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>

      <a href="/forgot-password">Forgot password?</a>
    </form>
  );
}
```

---

### 4. Forgot Password Form Component

```tsx
// src/components/ForgotPasswordForm.tsx

import { useState, useRef } from 'react';
import { TurnstileWidget, TurnstileWidgetRef } from './TurnstileWidget';
import { CAPTCHA_CONFIG } from '../config/captcha.config';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CAPTCHA is always required for forgot password
    if (!captchaToken) {
      setError('Please complete the security check');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          captchaToken,
          captchaProvider: CAPTCHA_CONFIG.PROVIDER,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Reset CAPTCHA on any error
        turnstileRef.current?.reset();
        setCaptchaToken(null);

        if (data.code === 'CAPTCHA_VERIFICATION_FAILED') {
          setError('Security check failed. Please try again.');
          return;
        }

        setError(data.messageEn || data.message || 'Request failed');
        return;
      }

      // Success
      setSuccess(true);

    } catch (err) {
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success-message">
        <h2>Check your email</h2>
        <p>
          If an account exists with that email, we've sent password reset
          instructions.
        </p>
        <a href="/login">Back to login</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="forgot-password-form">
      <h2>Forgot Password</h2>
      <p>Enter your email to receive a password reset link.</p>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {/* CAPTCHA is always shown for forgot password */}
      <div className="captcha-container">
        <TurnstileWidget
          ref={turnstileRef}
          onSuccess={(token) => {
            setCaptchaToken(token);
            setError(null);
          }}
          onError={() => {
            setCaptchaToken(null);
            setError('Security check failed to load');
          }}
          onExpire={() => {
            setCaptchaToken(null);
            setError('Security check expired');
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !captchaToken}
      >
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </button>

      <a href="/login">Back to login</a>
    </form>
  );
}
```

---

### 5. API Service Helper

```tsx
// src/services/api.ts

import { CAPTCHA_CONFIG } from '../config/captcha.config';

interface ApiOptions extends RequestInit {
  captchaToken?: string;
}

interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  captchaRequired: boolean;
}

interface ApiError {
  message: string;
  messageEn: string;
  code: string;
  errorCodes?: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { captchaToken, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add CAPTCHA headers if token provided
  if (captchaToken) {
    (headers as Record<string, string>)['X-Captcha-Token'] = captchaToken;
    (headers as Record<string, string>)['X-Captcha-Provider'] = CAPTCHA_CONFIG.PROVIDER;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      const captchaRequired =
        data.code === 'CAPTCHA_REQUIRED' ||
        data.code === 'CAPTCHA_VERIFICATION_FAILED';

      return {
        data: null,
        error: {
          message: data.message,
          messageEn: data.messageEn,
          code: data.code,
          errorCodes: data.errorCodes,
        },
        captchaRequired,
      };
    }

    return {
      data,
      error: null,
      captchaRequired: false,
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: 'Network error',
        messageEn: 'Network error',
        code: 'NETWORK_ERROR',
      },
      captchaRequired: false,
    };
  }
}

// Convenience methods
export const api = {
  post: <T>(endpoint: string, body: object, options?: ApiOptions) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),

  get: <T>(endpoint: string, options?: ApiOptions) =>
    apiRequest<T>(endpoint, {
      method: 'GET',
      ...options,
    }),
};
```

---

## Error Handling

### CAPTCHA Error Codes Reference

| Code | Meaning | Frontend Action |
|------|---------|-----------------|
| `CAPTCHA_REQUIRED` | CAPTCHA needed (e.g., after failed attempts) | Show Turnstile widget |
| `CAPTCHA_VERIFICATION_FAILED` | Token invalid or expired | Reset widget, ask user to retry |
| `CAPTCHA_PROVIDER_REQUIRED` | Provider not specified | Include `captchaProvider: 'turnstile'` |
| `CAPTCHA_ERROR` | Server error during verification | Show generic error, allow retry |

### Error Handler Utility

```tsx
// src/utils/captchaErrorHandler.ts

export interface CaptchaErrorResult {
  shouldShowCaptcha: boolean;
  shouldResetCaptcha: boolean;
  userMessage: string;
}

export function handleCaptchaError(errorCode: string): CaptchaErrorResult {
  switch (errorCode) {
    case 'CAPTCHA_REQUIRED':
      return {
        shouldShowCaptcha: true,
        shouldResetCaptcha: false,
        userMessage: 'Please complete the security verification',
      };

    case 'CAPTCHA_VERIFICATION_FAILED':
      return {
        shouldShowCaptcha: true,
        shouldResetCaptcha: true,
        userMessage: 'Security check failed. Please try again.',
      };

    case 'CAPTCHA_PROVIDER_REQUIRED':
      return {
        shouldShowCaptcha: true,
        shouldResetCaptcha: false,
        userMessage: 'Security configuration error. Please refresh.',
      };

    case 'CAPTCHA_ERROR':
      return {
        shouldShowCaptcha: true,
        shouldResetCaptcha: true,
        userMessage: 'Security check error. Please try again.',
      };

    default:
      return {
        shouldShowCaptcha: false,
        shouldResetCaptcha: false,
        userMessage: '',
      };
  }
}
```

---

## Best Practices

### 1. Don't Show CAPTCHA Unnecessarily
```tsx
// ❌ Bad: Always showing CAPTCHA on login
<TurnstileWidget onSuccess={setToken} />

// ✅ Good: Only show when required
{captchaRequired && <TurnstileWidget onSuccess={setToken} />}
```

### 2. Reset Widget on Failure
```tsx
// Always reset after verification failure
if (data.code === 'CAPTCHA_VERIFICATION_FAILED') {
  turnstileRef.current?.reset();
  setCaptchaToken(null);
}
```

### 3. Handle Token Expiration
```tsx
// Turnstile tokens expire after ~300 seconds
<TurnstileWidget
  onExpire={() => {
    setCaptchaToken(null);
    setError('Security check expired. Please complete it again.');
  }}
/>
```

### 4. Disable Submit Until Ready
```tsx
// Disable button when CAPTCHA required but not completed
<button
  type="submit"
  disabled={isLoading || (captchaRequired && !captchaToken)}
>
  Submit
</button>
```

### 5. Use Environment Variables
```tsx
// ❌ Bad: Hardcoded site key
const SITE_KEY = '0x4AAAAAAA...';

// ✅ Good: Environment variable
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
```

### 6. Handle Dark Mode
```tsx
<TurnstileWidget
  theme="auto" // Automatically matches system preference
  // or
  theme={isDarkMode ? 'dark' : 'light'}
/>
```

### 7. Accessible Error Messages
```tsx
{error && (
  <div className="error-message" role="alert" aria-live="polite">
    {error}
  </div>
)}
```

---

## Testing

### Test Site Keys (Development Only)

Cloudflare provides test keys for development:

| Key Type | Value | Behavior |
|----------|-------|----------|
| Always Pass | `1x00000000000000000000AA` | Always succeeds |
| Always Fail | `2x00000000000000000000AB` | Always fails |
| Force Interactive | `3x00000000000000000000FF` | Always shows challenge |

```tsx
// For development testing
const SITE_KEY = process.env.NODE_ENV === 'development'
  ? '1x00000000000000000000AA'  // Always pass
  : import.meta.env.VITE_TURNSTILE_SITE_KEY;
```

---

## Troubleshooting

### "CAPTCHA token expired"
- Turnstile tokens expire after ~5 minutes
- Reset widget and ask user to complete again

### "Invalid site key"
- Check your VITE_TURNSTILE_SITE_KEY matches Cloudflare dashboard
- Ensure domain is added in Cloudflare Turnstile settings

### Widget not loading
- Check if domain is whitelisted in Cloudflare
- Ensure `localhost` is added for development
- Check browser console for CSP errors

### Always getting CAPTCHA_REQUIRED on login
- Check `CAPTCHA_REQUIRED_ON_LOGIN` is set to `after_failures` in backend
- Clear failed login attempts by waiting or using different IP

---

## Quick Reference

### Minimum Required Code

```tsx
import { Turnstile } from '@marsidev/react-turnstile';

function LoginForm() {
  const [captchaToken, setCaptchaToken] = useState(null);
  const [showCaptcha, setShowCaptcha] = useState(false);

  const handleLogin = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, password,
        ...(captchaToken && { captchaToken, captchaProvider: 'turnstile' })
      })
    });
    const data = await res.json();

    if (data.code === 'CAPTCHA_REQUIRED') {
      setShowCaptcha(true);
    }
  };

  return (
    <form>
      {/* form fields */}
      {showCaptcha && (
        <Turnstile
          siteKey="YOUR_SITE_KEY"
          onSuccess={setCaptchaToken}
        />
      )}
      <button disabled={showCaptcha && !captchaToken}>Login</button>
    </form>
  );
}
```
