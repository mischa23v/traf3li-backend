# Frontend Integration Guide - Complete Authentication System

This guide provides detailed instructions for integrating all authentication features into your frontend application.

---

## Table of Contents

1. [Setup & Configuration](#1-setup--configuration)
2. [Basic Authentication (Email/Password)](#2-basic-authentication)
3. [Social Login (OAuth Providers)](#3-social-login-oauth)
4. [Phone/SMS OTP Authentication](#4-phonesms-otp-authentication)
5. [Magic Link (Passwordless)](#5-magic-link-passwordless)
6. [Multi-Factor Authentication (MFA)](#6-multi-factor-authentication)
7. [CAPTCHA Integration](#7-captcha-integration)
8. [CSRF Token Handling](#8-csrf-token-handling)
9. [Session Management](#9-session-management)
10. [Step-Up Authentication](#10-step-up-authentication)
11. [Anonymous/Guest Authentication](#11-anonymousguest-authentication)
12. [Password Management](#12-password-management)
13. [Error Handling](#13-error-handling)
14. [React Components Examples](#14-react-components-examples)
15. [Security Best Practices](#15-security-best-practices)

---

## 1. Setup & Configuration

### API Base URL

```javascript
// config/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.traf3li.com';

export const api = {
  auth: `${API_BASE_URL}/api/auth`,
  mfa: `${API_BASE_URL}/api/auth/mfa`,
  sessions: `${API_BASE_URL}/api/auth/sessions`,
};
```

### Axios Instance with Interceptors

```javascript
// services/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://api.traf3li.com',
  withCredentials: true, // IMPORTANT: Required for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store CSRF token
let csrfToken = null;

// Request interceptor - add CSRF token
apiClient.interceptors.request.use((config) => {
  if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Update CSRF token if returned
    if (response.data?.csrfToken) {
      csrfToken = response.data.csrfToken;
    }
    return response;
  },
  (error) => {
    const { response } = error;

    if (response?.status === 401) {
      // Handle unauthorized - redirect to login
      if (response.data?.code === 'REAUTHENTICATION_REQUIRED') {
        // Show reauthentication modal instead of redirecting
        window.dispatchEvent(new CustomEvent('reauth-required', {
          detail: response.data
        }));
      } else {
        // Token expired or invalid
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const setCSRFToken = (token) => {
  csrfToken = token;
};

export const getCSRFToken = () => csrfToken;

export default apiClient;
```

### Auth Context (React)

```javascript
// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { setCSRFToken } from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaPendingUserId, setMfaPendingUserId] = useState(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      setUser(response.data.user);
      if (response.data.csrfToken) {
        setCSRFToken(response.data.csrfToken);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, captchaToken = null) => {
    const payload = { email, password };
    if (captchaToken) {
      payload.captchaToken = captchaToken;
      payload.captchaProvider = 'recaptcha';
    }

    const response = await apiClient.post('/api/auth/login', payload);

    if (response.data.mfaRequired) {
      setMfaRequired(true);
      setMfaPendingUserId(response.data.userId);
      return { mfaRequired: true, mfaMethods: response.data.mfaMethods };
    }

    setUser(response.data.user);
    setCSRFToken(response.data.csrfToken);
    return { success: true, user: response.data.user };
  };

  const verifyMFA = async (code, method = 'totp') => {
    const response = await apiClient.post('/api/auth/mfa/verify', {
      userId: mfaPendingUserId,
      code,
      method,
    });

    setUser(response.data.user);
    setCSRFToken(response.data.csrfToken);
    setMfaRequired(false);
    setMfaPendingUserId(null);
    return response.data;
  };

  const logout = async () => {
    await apiClient.post('/api/auth/logout');
    setUser(null);
  };

  const value = {
    user,
    loading,
    mfaRequired,
    login,
    verifyMFA,
    logout,
    checkAuthStatus,
    isAuthenticated: !!user,
    isAnonymous: user?.isAnonymous || false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## 2. Basic Authentication

### Login

```javascript
// services/authService.js

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} captchaToken - Optional CAPTCHA token (required after failed attempts)
 * @returns {Promise<Object>} - User data or MFA requirement
 */
export const login = async (email, password, captchaToken = null) => {
  const payload = {
    email,
    password,
  };

  // Add CAPTCHA if provided
  if (captchaToken) {
    payload.captchaToken = captchaToken;
    payload.captchaProvider = 'recaptcha'; // or 'hcaptcha' or 'turnstile'
  }

  const response = await apiClient.post('/api/auth/login', payload);

  // Handle different response scenarios
  if (response.data.mfaRequired) {
    return {
      success: false,
      mfaRequired: true,
      userId: response.data.userId,
      mfaMethods: response.data.mfaMethods, // ['totp', 'backup_code', 'webauthn']
    };
  }

  // Store CSRF token
  if (response.data.csrfToken) {
    setCSRFToken(response.data.csrfToken);
  }

  return {
    success: true,
    user: response.data.user,
  };
};
```

### Register

```javascript
/**
 * Register a new user
 * @param {Object} userData - Registration data
 * @returns {Promise<Object>} - Created user data
 */
export const register = async ({
  email,
  password,
  username,
  firstName,
  lastName,
  phone,
  captchaToken,
}) => {
  const response = await apiClient.post('/api/auth/register', {
    email,
    password,
    username,
    firstName,
    lastName,
    phone,
    captchaToken,
    captchaProvider: 'recaptcha',
  });

  return response.data;
};
```

### Logout

```javascript
/**
 * Logout current user
 * Requires CSRF token in header
 */
export const logout = async () => {
  await apiClient.post('/api/auth/logout');
  // Clear local state
  window.location.href = '/login';
};

/**
 * Logout from all devices
 */
export const logoutAll = async () => {
  await apiClient.post('/api/auth/logout-all');
  window.location.href = '/login';
};
```

---

## 3. Social Login (OAuth)

### Available Providers

| Provider | Endpoint | Notes |
|----------|----------|-------|
| Google | `/api/auth/sso/google/authorize` | Most common |
| Facebook | `/api/auth/sso/facebook/authorize` | Requires app review |
| Apple | `/api/auth/sso/apple/authorize` | iOS apps required |
| Twitter | `/api/auth/sso/twitter/authorize` | Requires PKCE |
| LinkedIn | `/api/auth/sso/linkedin/authorize` | Professional |
| GitHub | `/api/auth/sso/github/authorize` | Developer auth |
| Microsoft | `/api/auth/sso/microsoft/authorize` | Enterprise |

### Web Implementation

```javascript
// services/oauthService.js

/**
 * Start OAuth flow for web
 * @param {string} provider - OAuth provider name
 * @param {string} returnUrl - URL to redirect after auth
 */
export const startOAuth = async (provider, returnUrl = '/dashboard') => {
  const response = await apiClient.get(`/api/auth/sso/${provider}/authorize`, {
    params: { returnUrl },
  });

  // Redirect to provider's login page
  window.location.href = response.data.authUrl;
};

/**
 * Handle OAuth callback (call this on your callback page)
 * The backend handles the callback and sets cookies
 * This function just checks the auth status
 */
export const handleOAuthCallback = async () => {
  // After OAuth redirect, check if user is authenticated
  const response = await apiClient.get('/api/auth/me');
  return response.data;
};
```

### Mobile Implementation (with PKCE)

```javascript
// services/oauthService.js

/**
 * Start OAuth flow for mobile apps with PKCE
 * @param {string} provider - OAuth provider name
 * @param {string} returnUrl - Deep link URL (e.g., myapp://auth/callback)
 */
export const startOAuthMobile = async (provider, returnUrl) => {
  const response = await apiClient.get(`/api/auth/sso/${provider}/authorize`, {
    params: {
      returnUrl,
      use_pkce: true, // Enable PKCE for mobile
    },
  });

  return {
    authUrl: response.data.authUrl,
    pkceEnabled: response.data.pkceEnabled,
  };
};
```

### React Native Example

```javascript
// screens/LoginScreen.js (React Native)
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const LoginScreen = () => {
  const handleSocialLogin = async (provider) => {
    try {
      // Get auth URL with PKCE
      const { authUrl } = await startOAuthMobile(
        provider,
        'myapp://auth/callback'
      );

      // Open in-app browser
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'myapp://auth/callback'
      );

      if (result.type === 'success') {
        // Handle successful auth
        await handleOAuthCallback();
      }
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={() => handleSocialLogin('google')}>
        <Text>Continue with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleSocialLogin('apple')}>
        <Text>Continue with Apple</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Social Login Buttons Component

```jsx
// components/SocialLoginButtons.jsx
import React from 'react';

const SocialLoginButtons = ({ onLogin, loading }) => {
  const providers = [
    { id: 'google', name: 'Google', icon: '🔵', color: '#4285F4' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877F2' },
    { id: 'apple', name: 'Apple', icon: '🍎', color: '#000000' },
    { id: 'twitter', name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
    { id: 'github', name: 'GitHub', icon: '🐙', color: '#333333' },
  ];

  return (
    <div className="social-login-buttons">
      <div className="divider">
        <span>أو تسجيل الدخول عبر</span>
      </div>

      <div className="providers-grid">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onLogin(provider.id)}
            disabled={loading}
            className="social-button"
            style={{ '--provider-color': provider.color }}
          >
            <span className="icon">{provider.icon}</span>
            <span className="name">{provider.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SocialLoginButtons;
```

---

## 4. Phone/SMS OTP Authentication

### Send OTP

```javascript
// services/phoneAuthService.js

/**
 * Send OTP to phone number
 * @param {string} phone - Phone number with country code (e.g., +966501234567)
 * @param {string} purpose - 'login' | 'registration' | 'verify_phone'
 */
export const sendPhoneOTP = async (phone, purpose = 'login') => {
  const response = await apiClient.post('/api/auth/phone/send-otp', {
    phone,
    purpose,
  });

  return {
    success: true,
    expiresIn: response.data.expiresIn, // seconds
    message: response.data.message,
  };
};

/**
 * Verify OTP and authenticate
 * @param {string} phone - Phone number
 * @param {string} otp - 6-digit OTP code
 * @param {string} purpose - 'login' | 'registration' | 'verify_phone'
 */
export const verifyPhoneOTP = async (phone, otp, purpose = 'login') => {
  const response = await apiClient.post('/api/auth/phone/verify-otp', {
    phone,
    otp,
    purpose,
  });

  if (response.data.csrfToken) {
    setCSRFToken(response.data.csrfToken);
  }

  return {
    success: true,
    user: response.data.user,
  };
};

/**
 * Resend OTP (with rate limiting)
 */
export const resendPhoneOTP = async (phone, purpose = 'login') => {
  const response = await apiClient.post('/api/auth/phone/resend-otp', {
    phone,
    purpose,
  });

  return response.data;
};

/**
 * Check if can request new OTP
 */
export const checkOTPStatus = async (phone, purpose = 'login') => {
  const response = await apiClient.get('/api/auth/phone/otp-status', {
    params: { phone, purpose },
  });

  return {
    canRequest: response.data.canRequest,
    waitTime: response.data.waitTime, // seconds to wait
  };
};
```

### Phone OTP Component

```jsx
// components/PhoneOTPLogin.jsx
import React, { useState, useEffect } from 'react';
import { sendPhoneOTP, verifyPhoneOTP, checkOTPStatus } from '../services/phoneAuthService';

const PhoneOTPLogin = ({ onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Format phone number
      let formattedPhone = phone;
      if (!phone.startsWith('+')) {
        formattedPhone = '+966' + phone.replace(/^0/, '');
      }

      const result = await sendPhoneOTP(formattedPhone, 'login');
      setPhone(formattedPhone);
      setStep('otp');
      setCountdown(60); // 60 seconds cooldown
    } catch (err) {
      setError(err.response?.data?.messageAr || 'حدث خطأ في إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await verifyPhoneOTP(phone, otp, 'login');
      onSuccess(result.user);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setLoading(true);
    try {
      await sendPhoneOTP(phone, 'login');
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-otp-login">
      {step === 'phone' ? (
        <form onSubmit={handleSendOTP}>
          <h2>تسجيل الدخول برقم الجوال</h2>

          <div className="input-group">
            <label>رقم الجوال</label>
            <div className="phone-input">
              <span className="country-code">+966</span>
              <input
                type="tel"
                value={phone.replace('+966', '')}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="5XXXXXXXX"
                maxLength={9}
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading || phone.length < 9}>
            {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP}>
          <h2>أدخل رمز التحقق</h2>
          <p className="subtitle">تم إرسال رمز مكون من 6 أرقام إلى {phone}</p>

          <div className="otp-input-group">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="otp-input"
              autoComplete="one-time-code"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading || otp.length !== 6}>
            {loading ? 'جاري التحقق...' : 'تأكيد'}
          </button>

          <div className="resend-section">
            {countdown > 0 ? (
              <span>إعادة الإرسال بعد {countdown} ثانية</span>
            ) : (
              <button type="button" onClick={handleResend} disabled={loading}>
                إعادة إرسال الرمز
              </button>
            )}
          </div>

          <button type="button" onClick={() => setStep('phone')} className="back-button">
            تغيير رقم الجوال
          </button>
        </form>
      )}
    </div>
  );
};

export default PhoneOTPLogin;
```

---

## 5. Magic Link (Passwordless)

### Send Magic Link

```javascript
// services/magicLinkService.js

/**
 * Send magic link to email
 * @param {string} email - User email
 * @param {string} purpose - 'login' | 'register' | 'verify_email'
 */
export const sendMagicLink = async (email, purpose = 'login') => {
  const response = await apiClient.post('/api/auth/magic-link/send', {
    email,
    purpose,
  });

  return {
    success: true,
    message: response.data.message,
  };
};

/**
 * Verify magic link token (call this on the callback page)
 * @param {string} token - Token from URL
 */
export const verifyMagicLink = async (token) => {
  const response = await apiClient.post('/api/auth/magic-link/verify', {
    token,
  });

  if (response.data.csrfToken) {
    setCSRFToken(response.data.csrfToken);
  }

  return {
    success: true,
    user: response.data.user,
  };
};
```

### Magic Link Callback Page

```jsx
// pages/MagicLinkCallback.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyMagicLink } from '../services/magicLinkService';

const MagicLinkCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('رابط غير صالح');
      return;
    }

    verifyMagicLink(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      })
      .catch((err) => {
        setStatus('error');
        setError(err.response?.data?.messageAr || 'انتهت صلاحية الرابط');
      });
  }, [searchParams, navigate]);

  return (
    <div className="magic-link-callback">
      {status === 'verifying' && (
        <div className="loading">
          <span className="spinner"></span>
          <p>جاري التحقق...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="success">
          <span className="icon">✓</span>
          <p>تم تسجيل الدخول بنجاح</p>
          <p className="subtitle">جاري التحويل...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="error">
          <span className="icon">✗</span>
          <p>{error}</p>
          <button onClick={() => navigate('/login')}>
            العودة لتسجيل الدخول
          </button>
        </div>
      )}
    </div>
  );
};

export default MagicLinkCallback;
```

---

## 6. Multi-Factor Authentication (MFA)

### MFA Setup

```javascript
// services/mfaService.js

/**
 * Get MFA status for current user
 */
export const getMFAStatus = async () => {
  const response = await apiClient.get('/api/auth/mfa/status');
  return {
    enabled: response.data.enabled,
    methods: response.data.methods, // ['totp', 'backup_codes', 'webauthn']
    backupCodesCount: response.data.backupCodesCount,
  };
};

/**
 * Start TOTP setup - get QR code
 */
export const setupTOTP = async () => {
  const response = await apiClient.post('/api/auth/mfa/setup');
  return {
    qrCode: response.data.qrCode, // Base64 QR code image
    secret: response.data.secret, // Manual entry secret
    backupCodes: response.data.backupCodes, // Array of backup codes
  };
};

/**
 * Verify TOTP setup with a code from authenticator app
 * @param {string} code - 6-digit code
 */
export const verifyTOTPSetup = async (code) => {
  const response = await apiClient.post('/api/auth/mfa/verify-setup', {
    code,
  });
  return response.data;
};

/**
 * Verify MFA during login
 * @param {string} userId - User ID from login response
 * @param {string} code - MFA code
 * @param {string} method - 'totp' | 'backup_code' | 'webauthn'
 */
export const verifyMFA = async (userId, code, method = 'totp') => {
  const response = await apiClient.post('/api/auth/mfa/verify', {
    userId,
    code,
    method,
  });

  if (response.data.csrfToken) {
    setCSRFToken(response.data.csrfToken);
  }

  return {
    success: true,
    user: response.data.user,
  };
};

/**
 * Disable MFA (requires reauthentication)
 * @param {string} password - Current password
 */
export const disableMFA = async (password) => {
  const response = await apiClient.post('/api/auth/mfa/disable', {
    password,
  });
  return response.data;
};

/**
 * Regenerate backup codes
 */
export const regenerateBackupCodes = async () => {
  const response = await apiClient.post('/api/auth/mfa/backup-codes/regenerate');
  return {
    backupCodes: response.data.backupCodes,
  };
};
```

### MFA Verification Component

```jsx
// components/MFAVerification.jsx
import React, { useState } from 'react';
import { verifyMFA } from '../services/mfaService';

const MFAVerification = ({ userId, mfaMethods, onSuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [method, setMethod] = useState('totp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await verifyMFA(userId, code, method);
      onSuccess(result.user);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mfa-verification">
      <h2>التحقق بخطوتين</h2>

      {mfaMethods.length > 1 && (
        <div className="method-selector">
          <label>طريقة التحقق:</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {mfaMethods.includes('totp') && (
              <option value="totp">تطبيق المصادقة</option>
            )}
            {mfaMethods.includes('backup_code') && (
              <option value="backup_code">رمز احتياطي</option>
            )}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>
            {method === 'totp'
              ? 'أدخل الرمز من تطبيق المصادقة'
              : 'أدخل رمز احتياطي'}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder={method === 'totp' ? '000000' : '00000000'}
            maxLength={method === 'totp' ? 6 : 8}
            autoComplete="one-time-code"
            className="otp-input"
            required
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="button-group">
          <button type="submit" disabled={loading}>
            {loading ? 'جاري التحقق...' : 'تأكيد'}
          </button>
          <button type="button" onClick={onCancel} className="secondary">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
};

export default MFAVerification;
```

### MFA Setup Component

```jsx
// components/MFASetup.jsx
import React, { useState, useEffect } from 'react';
import { setupTOTP, verifyTOTPSetup, getMFAStatus } from '../services/mfaService';

const MFASetup = ({ onComplete }) => {
  const [step, setStep] = useState('loading'); // loading | setup | verify | backup | done
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    const status = await getMFAStatus();
    if (status.enabled) {
      setStep('done');
    } else {
      startSetup();
    }
  };

  const startSetup = async () => {
    setLoading(true);
    try {
      const data = await setupTOTP();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('setup');
    } catch (err) {
      setError('حدث خطأ في إعداد المصادقة');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await verifyTOTPSetup(verifyCode);
      setStep('backup');
    } catch (err) {
      setError(err.response?.data?.messageAr || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'traf3li-backup-codes.txt';
    a.click();
  };

  return (
    <div className="mfa-setup">
      {step === 'loading' && <div className="loading">جاري التحميل...</div>}

      {step === 'setup' && (
        <div className="setup-step">
          <h2>إعداد المصادقة الثنائية</h2>
          <p>امسح رمز QR باستخدام تطبيق المصادقة</p>

          <div className="qr-container">
            <img src={qrCode} alt="QR Code" />
          </div>

          <div className="manual-entry">
            <p>أو أدخل هذا الرمز يدوياً:</p>
            <code>{secret}</code>
          </div>

          <button onClick={() => setStep('verify')}>التالي</button>
        </div>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className="verify-step">
          <h2>تأكيد الإعداد</h2>
          <p>أدخل الرمز الظاهر في تطبيق المصادقة</p>

          <input
            type="text"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            maxLength={6}
            className="otp-input"
          />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading || verifyCode.length !== 6}>
            {loading ? 'جاري التحقق...' : 'تأكيد'}
          </button>
        </form>
      )}

      {step === 'backup' && (
        <div className="backup-step">
          <h2>احفظ الرموز الاحتياطية</h2>
          <p className="warning">
            ⚠️ احفظ هذه الرموز في مكان آمن. ستحتاجها إذا فقدت الوصول لتطبيق المصادقة.
          </p>

          <div className="backup-codes-grid">
            {backupCodes.map((code, index) => (
              <div key={index} className="backup-code">{code}</div>
            ))}
          </div>

          <div className="button-group">
            <button onClick={downloadBackupCodes} className="secondary">
              تحميل الرموز
            </button>
            <button onClick={() => { setStep('done'); onComplete?.(); }}>
              تم الحفظ
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="done-step">
          <span className="icon">✓</span>
          <h2>تم تفعيل المصادقة الثنائية</h2>
          <p>حسابك الآن محمي بشكل أفضل</p>
        </div>
      )}
    </div>
  );
};

export default MFASetup;
```

---

## 7. CAPTCHA Integration

### Supported Providers

| Provider | Site Key Env Variable | Secret Key (Backend) |
|----------|----------------------|---------------------|
| reCAPTCHA v2 | `REACT_APP_RECAPTCHA_SITE_KEY` | `RECAPTCHA_SECRET_KEY` |
| reCAPTCHA v3 | `REACT_APP_RECAPTCHA_V3_SITE_KEY` | `RECAPTCHA_SECRET_KEY` |
| hCaptcha | `REACT_APP_HCAPTCHA_SITE_KEY` | `HCAPTCHA_SECRET_KEY` |
| Turnstile | `REACT_APP_TURNSTILE_SITE_KEY` | `TURNSTILE_SECRET_KEY` |

### reCAPTCHA v2 Integration

```jsx
// components/CaptchaWidget.jsx
import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const CaptchaWidget = ({ onVerify, onExpire }) => {
  return (
    <div className="captcha-widget">
      <ReCAPTCHA
        sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
        onChange={onVerify}
        onExpired={onExpire}
        hl="ar" // Arabic language
      />
    </div>
  );
};

export default CaptchaWidget;
```

### reCAPTCHA v3 (Invisible)

```jsx
// hooks/useRecaptcha.js
import { useCallback } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export const useRecaptcha = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const getToken = useCallback(async (action = 'login') => {
    if (!executeRecaptcha) {
      console.warn('reCAPTCHA not ready');
      return null;
    }

    const token = await executeRecaptcha(action);
    return token;
  }, [executeRecaptcha]);

  return { getToken };
};

// Usage in component
const LoginForm = () => {
  const { getToken } = useRecaptcha();

  const handleLogin = async (email, password) => {
    const captchaToken = await getToken('login');

    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
      captchaToken,
      captchaProvider: 'recaptcha',
    });
  };
};
```

### hCaptcha Integration

```jsx
// components/HCaptchaWidget.jsx
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useRef } from 'react';

const HCaptchaWidget = ({ onVerify }) => {
  const captchaRef = useRef(null);

  const handleVerify = (token) => {
    onVerify(token, 'hcaptcha');
  };

  const reset = () => {
    captchaRef.current?.resetCaptcha();
  };

  return (
    <HCaptcha
      ref={captchaRef}
      sitekey={process.env.REACT_APP_HCAPTCHA_SITE_KEY}
      onVerify={handleVerify}
      languageOverride="ar"
    />
  );
};

export default HCaptchaWidget;
```

### Cloudflare Turnstile

```jsx
// components/TurnstileWidget.jsx
import { Turnstile } from '@marsidev/react-turnstile';

const TurnstileWidget = ({ onVerify }) => {
  return (
    <Turnstile
      siteKey={process.env.REACT_APP_TURNSTILE_SITE_KEY}
      onSuccess={(token) => onVerify(token, 'turnstile')}
      options={{
        language: 'ar',
        theme: 'light',
      }}
    />
  );
};

export default TurnstileWidget;
```

---

## 8. CSRF Token Handling

### Automatic CSRF Handling

The CSRF token is automatically:
1. Returned in login response (`response.data.csrfToken`)
2. Stored and included in subsequent requests via Axios interceptor
3. Sent in `X-CSRF-Token` header

### Manual CSRF Token Refresh

```javascript
// services/csrfService.js

/**
 * Get a fresh CSRF token
 * Call this if your token expires or becomes invalid
 */
export const refreshCSRFToken = async () => {
  const response = await apiClient.get('/api/auth/csrf');
  setCSRFToken(response.data.csrfToken);
  return response.data.csrfToken;
};
```

### Protected Form Example

```jsx
// components/ProtectedForm.jsx
import React, { useState } from 'react';
import { getCSRFToken } from '../services/apiClient';

const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // CSRF token is automatically included via interceptor
      await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      alert('تم تغيير كلمة المرور بنجاح');
    } catch (error) {
      if (error.response?.status === 403) {
        // CSRF token invalid - refresh and retry
        await refreshCSRFToken();
        // Retry the request
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="كلمة المرور الحالية"
        required
      />
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="كلمة المرور الجديدة"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
      </button>
    </form>
  );
};
```

---

## 9. Session Management

### Session Service

```javascript
// services/sessionService.js

/**
 * Get all active sessions for current user
 */
export const getSessions = async () => {
  const response = await apiClient.get('/api/auth/sessions');
  return response.data.sessions.map(session => ({
    id: session.id,
    device: session.device,
    browser: session.browser,
    os: session.os,
    ip: session.ip,
    location: session.location, // { country, city }
    createdAt: new Date(session.createdAt),
    lastActivityAt: new Date(session.lastActivityAt),
    isCurrent: session.isCurrent,
    isSuspicious: session.isSuspicious,
    suspiciousReasons: session.suspiciousReasons,
  }));
};

/**
 * Get current session details
 */
export const getCurrentSession = async () => {
  const response = await apiClient.get('/api/auth/sessions/current');
  return response.data;
};

/**
 * Terminate a specific session
 * @param {string} sessionId - Session ID to terminate
 */
export const terminateSession = async (sessionId) => {
  await apiClient.delete(`/api/auth/sessions/${sessionId}`);
};

/**
 * Terminate all sessions except current
 */
export const terminateAllOtherSessions = async () => {
  await apiClient.delete('/api/auth/sessions');
};

/**
 * Get session statistics
 */
export const getSessionStats = async () => {
  const response = await apiClient.get('/api/auth/sessions/stats');
  return response.data;
};
```

### Sessions Management Component

```jsx
// components/SessionsManager.jsx
import React, { useState, useEffect } from 'react';
import { getSessions, terminateSession, terminateAllOtherSessions } from '../services/sessionService';

const SessionsManager = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async (sessionId) => {
    if (!confirm('هل تريد إنهاء هذه الجلسة؟')) return;

    await terminateSession(sessionId);
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  const handleTerminateAll = async () => {
    if (!confirm('هل تريد إنهاء جميع الجلسات الأخرى؟')) return;

    await terminateAllOtherSessions();
    setSessions(sessions.filter(s => s.isCurrent));
  };

  const getDeviceIcon = (device) => {
    switch (device) {
      case 'desktop': return '💻';
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      default: return '🖥️';
    }
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="sessions-manager">
      <div className="header">
        <h2>الجلسات النشطة</h2>
        <button onClick={handleTerminateAll} className="danger">
          إنهاء جميع الجلسات الأخرى
        </button>
      </div>

      <div className="sessions-list">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`session-card ${session.isCurrent ? 'current' : ''} ${session.isSuspicious ? 'suspicious' : ''}`}
          >
            <div className="device-icon">{getDeviceIcon(session.device)}</div>

            <div className="session-info">
              <div className="primary">
                <span className="browser">{session.browser}</span>
                <span className="os">{session.os}</span>
                {session.isCurrent && <span className="current-badge">الجلسة الحالية</span>}
                {session.isSuspicious && <span className="suspicious-badge">⚠️ مشبوه</span>}
              </div>
              <div className="secondary">
                <span className="location">
                  📍 {session.location?.city}, {session.location?.country}
                </span>
                <span className="ip">{session.ip}</span>
              </div>
              <div className="timestamps">
                <span>آخر نشاط: {formatDate(session.lastActivityAt)}</span>
              </div>
              {session.isSuspicious && (
                <div className="suspicious-reasons">
                  {session.suspiciousReasons?.map((reason, i) => (
                    <span key={i} className="reason">{reason}</span>
                  ))}
                </div>
              )}
            </div>

            {!session.isCurrent && (
              <button
                onClick={() => handleTerminate(session.id)}
                className="terminate-btn"
              >
                إنهاء
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionsManager;
```

---

## 10. Step-Up Authentication

### Step-Up Service

```javascript
// services/stepUpAuthService.js

/**
 * Check reauthentication status
 */
export const checkReauthStatus = async () => {
  const response = await apiClient.get('/api/auth/reauthenticate/status');
  return {
    isRecent: response.data.isRecent,
    lastAuthAt: response.data.lastAuthAt ? new Date(response.data.lastAuthAt) : null,
    expiresAt: response.data.expiresAt ? new Date(response.data.expiresAt) : null,
  };
};

/**
 * Reauthenticate with password
 * @param {string} password - Current password
 */
export const reauthenticateWithPassword = async (password) => {
  const response = await apiClient.post('/api/auth/reauthenticate', {
    method: 'password',
    password,
  });
  return response.data;
};

/**
 * Reauthenticate with TOTP
 * @param {string} code - TOTP code
 */
export const reauthenticateWithTOTP = async (code) => {
  const response = await apiClient.post('/api/auth/reauthenticate', {
    method: 'totp',
    code,
  });
  return response.data;
};

/**
 * Request OTP for reauthentication
 * @param {string} method - 'email' | 'sms'
 * @param {string} purpose - Purpose of reauthentication
 */
export const requestReauthOTP = async (method = 'email', purpose) => {
  const response = await apiClient.post('/api/auth/reauthenticate/challenge', {
    method,
    purpose,
  });
  return response.data;
};

/**
 * Verify reauthentication OTP
 * @param {string} code - OTP code
 */
export const verifyReauthOTP = async (code) => {
  const response = await apiClient.post('/api/auth/reauthenticate/verify', {
    code,
  });
  return response.data;
};
```

### Reauthentication Modal

```jsx
// components/ReauthModal.jsx
import React, { useState } from 'react';
import {
  reauthenticateWithPassword,
  reauthenticateWithTOTP,
  requestReauthOTP,
  verifyReauthOTP
} from '../services/stepUpAuthService';

const ReauthModal = ({ isOpen, onClose, onSuccess, purpose }) => {
  const [method, setMethod] = useState('password');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await reauthenticateWithPassword(password);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.messageAr || 'كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  const handleTOTPAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await reauthenticateWithTOTP(code);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.messageAr || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    try {
      await requestReauthOTP('email', purpose);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.messageAr || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await verifyReauthOTP(code);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.messageAr || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal reauth-modal">
        <button className="close-btn" onClick={onClose}>×</button>

        <h2>تأكيد الهوية</h2>
        <p>لإتمام هذا الإجراء، يرجى تأكيد هويتك</p>

        <div className="method-tabs">
          <button
            className={method === 'password' ? 'active' : ''}
            onClick={() => setMethod('password')}
          >
            كلمة المرور
          </button>
          <button
            className={method === 'totp' ? 'active' : ''}
            onClick={() => setMethod('totp')}
          >
            تطبيق المصادقة
          </button>
          <button
            className={method === 'email' ? 'active' : ''}
            onClick={() => setMethod('email')}
          >
            رمز البريد
          </button>
        </div>

        {method === 'password' && (
          <form onSubmit={handlePasswordAuth}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              autoFocus
              required
            />
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'جاري التحقق...' : 'تأكيد'}
            </button>
          </form>
        )}

        {method === 'totp' && (
          <form onSubmit={handleTOTPAuth}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="أدخل رمز المصادقة"
              maxLength={6}
              autoFocus
              required
            />
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={loading || code.length !== 6}>
              {loading ? 'جاري التحقق...' : 'تأكيد'}
            </button>
          </form>
        )}

        {method === 'email' && (
          <div>
            {!otpSent ? (
              <button onClick={handleRequestOTP} disabled={loading}>
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <p>تم إرسال رمز التحقق إلى بريدك الإلكتروني</p>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="أدخل الرمز"
                  maxLength={6}
                  autoFocus
                  required
                />
                {error && <div className="error">{error}</div>}
                <button type="submit" disabled={loading || code.length !== 6}>
                  {loading ? 'جاري التحقق...' : 'تأكيد'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReauthModal;
```

### Using Step-Up Authentication

```jsx
// hooks/useStepUpAuth.js
import { useState, useCallback } from 'react';

export const useStepUpAuth = () => {
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const executeWithReauth = useCallback(async (action, purpose = 'sensitive_operation') => {
    try {
      return await action();
    } catch (error) {
      if (error.response?.data?.code === 'REAUTHENTICATION_REQUIRED') {
        // Store the action to retry after reauth
        setPendingAction(() => action);
        setShowReauthModal(true);
        return null;
      }
      throw error;
    }
  }, []);

  const handleReauthSuccess = useCallback(async () => {
    setShowReauthModal(false);
    if (pendingAction) {
      const result = await pendingAction();
      setPendingAction(null);
      return result;
    }
  }, [pendingAction]);

  return {
    showReauthModal,
    setShowReauthModal,
    executeWithReauth,
    handleReauthSuccess,
  };
};

// Usage in component
const SecuritySettings = () => {
  const { showReauthModal, setShowReauthModal, executeWithReauth, handleReauthSuccess } = useStepUpAuth();

  const handleDisableMFA = async () => {
    await executeWithReauth(async () => {
      await apiClient.post('/api/auth/mfa/disable');
      alert('تم تعطيل المصادقة الثنائية');
    }, 'mfa_disable');
  };

  return (
    <div>
      <button onClick={handleDisableMFA}>تعطيل المصادقة الثنائية</button>

      <ReauthModal
        isOpen={showReauthModal}
        onClose={() => setShowReauthModal(false)}
        onSuccess={handleReauthSuccess}
        purpose="mfa_disable"
      />
    </div>
  );
};
```

---

## 11. Anonymous/Guest Authentication

### Anonymous Auth Service

```javascript
// services/anonymousAuthService.js

/**
 * Create anonymous/guest session
 */
export const loginAsGuest = async () => {
  const response = await apiClient.post('/api/auth/anonymous');

  if (response.data.csrfToken) {
    setCSRFToken(response.data.csrfToken);
  }

  return {
    user: response.data.user,
    isAnonymous: true,
  };
};

/**
 * Convert anonymous account to full account
 * @param {Object} data - Registration data
 */
export const convertToFullAccount = async ({
  email,
  password,
  firstName,
  lastName,
  username,
}) => {
  const response = await apiClient.post('/api/auth/anonymous/convert', {
    email,
    password,
    firstName,
    lastName,
    username,
  });

  return {
    user: response.data.user,
    isAnonymous: false,
  };
};
```

### Guest Banner Component

```jsx
// components/GuestBanner.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConvertAccountModal from './ConvertAccountModal';

const GuestBanner = () => {
  const { user, isAnonymous } = useAuth();
  const [showConvertModal, setShowConvertModal] = useState(false);

  if (!isAnonymous) return null;

  return (
    <>
      <div className="guest-banner">
        <span className="icon">👤</span>
        <span className="text">
          أنت تستخدم حساب ضيف. بياناتك ستحذف بعد 30 يوماً.
        </span>
        <button onClick={() => setShowConvertModal(true)}>
          إنشاء حساب كامل
        </button>
      </div>

      <ConvertAccountModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
      />
    </>
  );
};

export default GuestBanner;
```

### Convert Account Modal

```jsx
// components/ConvertAccountModal.jsx
import React, { useState } from 'react';
import { convertToFullAccount } from '../services/anonymousAuthService';
import { useAuth } from '../contexts/AuthContext';

const ConvertAccountModal = ({ isOpen, onClose }) => {
  const { checkAuthStatus } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await convertToFullAccount({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      await checkAuthStatus();
      onClose();
      alert('تم إنشاء حسابك بنجاح!');
    } catch (err) {
      setError(err.response?.data?.messageAr || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal convert-modal">
        <button className="close-btn" onClick={onClose}>×</button>

        <h2>إنشاء حساب كامل</h2>
        <p>احتفظ ببياناتك عن طريق إنشاء حساب كامل</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="الاسم الأول"
              required
            />
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="اسم العائلة"
              required
            />
          </div>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="البريد الإلكتروني"
            required
          />

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="كلمة المرور"
            minLength={8}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="تأكيد كلمة المرور"
            required
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConvertAccountModal;
```

---

## 12. Password Management

### Password Service

```javascript
// services/passwordService.js

/**
 * Request password reset email
 * @param {string} email - User email
 * @param {string} captchaToken - CAPTCHA token
 */
export const forgotPassword = async (email, captchaToken) => {
  const response = await apiClient.post('/api/auth/forgot-password', {
    email,
    captchaToken,
    captchaProvider: 'recaptcha',
  });
  return response.data;
};

/**
 * Reset password with token
 * @param {string} token - Reset token from email
 * @param {string} newPassword - New password
 */
export const resetPassword = async (token, newPassword) => {
  const response = await apiClient.post('/api/auth/reset-password', {
    token,
    password: newPassword,
  });
  return response.data;
};

/**
 * Change password (requires authentication)
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 */
export const changePassword = async (currentPassword, newPassword) => {
  const response = await apiClient.post('/api/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return response.data;
};

/**
 * Get password status (expiration, strength requirements)
 */
export const getPasswordStatus = async () => {
  const response = await apiClient.get('/api/auth/password/status');
  return response.data;
};
```

### Password Strength Indicator

```jsx
// components/PasswordStrengthIndicator.jsx
import React, { useMemo } from 'react';

const PasswordStrengthIndicator = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;

    // Length
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Uppercase
    if (/[A-Z]/.test(password)) score += 15;

    // Lowercase
    if (/[a-z]/.test(password)) score += 15;

    // Numbers
    if (/\d/.test(password)) score += 15;

    // Special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;

    let label, color;
    if (score < 30) {
      label = 'ضعيفة جداً';
      color = '#ff4444';
    } else if (score < 50) {
      label = 'ضعيفة';
      color = '#ff8800';
    } else if (score < 70) {
      label = 'متوسطة';
      color = '#ffcc00';
    } else if (score < 90) {
      label = 'قوية';
      color = '#88cc00';
    } else {
      label = 'قوية جداً';
      color = '#00cc44';
    }

    return { score, label, color };
  }, [password]);

  if (!password) return null;

  return (
    <div className="password-strength">
      <div className="strength-bar">
        <div
          className="strength-fill"
          style={{
            width: `${strength.score}%`,
            backgroundColor: strength.color
          }}
        />
      </div>
      <span className="strength-label" style={{ color: strength.color }}>
        {strength.label}
      </span>
    </div>
  );
};

export default PasswordStrengthIndicator;
```

---

## 13. Error Handling

### Error Types

```javascript
// utils/authErrors.js

export const AUTH_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // MFA errors
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID_CODE: 'MFA_INVALID_CODE',

  // Session errors
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  REAUTHENTICATION_REQUIRED: 'REAUTHENTICATION_REQUIRED',

  // CAPTCHA errors
  CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
  CAPTCHA_INVALID: 'CAPTCHA_INVALID',

  // Password errors
  PASSWORD_BREACHED: 'PASSWORD_BREACHED',
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
  PASSWORD_RECENTLY_USED: 'PASSWORD_RECENTLY_USED',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // CSRF
  CSRF_INVALID: 'CSRF_INVALID',
};

export const getErrorMessage = (code, data = {}) => {
  const messages = {
    INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    ACCOUNT_LOCKED: `الحساب مقفل. حاول مرة أخرى بعد ${data.retryAfter || 15} دقيقة`,
    ACCOUNT_DISABLED: 'تم تعطيل هذا الحساب. تواصل مع الدعم',
    EMAIL_NOT_VERIFIED: 'يرجى تأكيد بريدك الإلكتروني أولاً',
    MFA_REQUIRED: 'يرجى إدخال رمز المصادقة الثنائية',
    MFA_INVALID_CODE: 'رمز التحقق غير صحيح',
    SESSION_EXPIRED: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى',
    REAUTHENTICATION_REQUIRED: 'يرجى تأكيد هويتك للمتابعة',
    CAPTCHA_REQUIRED: 'يرجى إكمال التحقق من أنك لست روبوت',
    CAPTCHA_INVALID: 'فشل التحقق. يرجى المحاولة مرة أخرى',
    PASSWORD_BREACHED: `كلمة المرور هذه موجودة في ${data.breachCount || ''} تسريب بيانات. اختر كلمة مرور أخرى`,
    PASSWORD_TOO_WEAK: 'كلمة المرور ضعيفة جداً',
    PASSWORD_RECENTLY_USED: 'لا يمكن استخدام كلمة مرور سابقة',
    RATE_LIMITED: `تم تجاوز الحد المسموح. حاول بعد ${data.retryAfter || 60} ثانية`,
    TOO_MANY_REQUESTS: 'طلبات كثيرة جداً. يرجى الانتظار',
    CSRF_INVALID: 'انتهت صلاحية الجلسة. يرجى تحديث الصفحة',
  };

  return messages[code] || 'حدث خطأ غير متوقع';
};
```

### Global Error Handler

```jsx
// components/AuthErrorBoundary.jsx
import React from 'react';
import { getErrorMessage } from '../utils/authErrors';

class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Auth Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-error-boundary">
          <h2>حدث خطأ</h2>
          <p>{this.state.error?.message || 'يرجى تحديث الصفحة'}</p>
          <button onClick={() => window.location.reload()}>
            تحديث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;
```

---

## 14. React Components Examples

### Complete Login Page

```jsx
// pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SocialLoginButtons from '../components/SocialLoginButtons';
import PhoneOTPLogin from '../components/PhoneOTPLogin';
import MFAVerification from '../components/MFAVerification';
import CaptchaWidget from '../components/CaptchaWidget';
import { startOAuth } from '../services/oauthService';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, verifyMFA } = useAuth();

  const [tab, setTab] = useState('email'); // email | phone | magic
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaData, setMfaData] = useState(null);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password, captchaToken);

      if (result.mfaRequired) {
        setMfaRequired(true);
        setMfaData(result);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errorData = err.response?.data;

      if (errorData?.code === 'CAPTCHA_REQUIRED') {
        setShowCaptcha(true);
      }

      setError(errorData?.messageAr || 'حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = (user) => {
    navigate('/dashboard');
  };

  const handleSocialLogin = (provider) => {
    startOAuth(provider, '/dashboard');
  };

  const handlePhoneSuccess = (user) => {
    navigate('/dashboard');
  };

  if (mfaRequired) {
    return (
      <MFAVerification
        userId={mfaData.userId}
        mfaMethods={mfaData.mfaMethods}
        onSuccess={handleMFASuccess}
        onCancel={() => setMfaRequired(false)}
      />
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>تسجيل الدخول</h1>

        <div className="login-tabs">
          <button
            className={tab === 'email' ? 'active' : ''}
            onClick={() => setTab('email')}
          >
            البريد الإلكتروني
          </button>
          <button
            className={tab === 'phone' ? 'active' : ''}
            onClick={() => setTab('phone')}
          >
            رقم الجوال
          </button>
        </div>

        {tab === 'email' && (
          <form onSubmit={handleEmailLogin}>
            <div className="input-group">
              <label>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>

            <div className="input-group">
              <label>كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {showCaptcha && (
              <CaptchaWidget
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
              />
            )}

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading}>
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>

            <div className="links">
              <a href="/forgot-password">نسيت كلمة المرور؟</a>
              <a href="/register">إنشاء حساب جديد</a>
            </div>
          </form>
        )}

        {tab === 'phone' && (
          <PhoneOTPLogin onSuccess={handlePhoneSuccess} />
        )}

        <SocialLoginButtons
          onLogin={handleSocialLogin}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default LoginPage;
```

---

## 15. Security Best Practices

### Frontend Security Checklist

```markdown
## Security Checklist

### Authentication
- [ ] Always use HTTPS
- [ ] Store tokens in HttpOnly cookies (handled by backend)
- [ ] Include CSRF token in all state-changing requests
- [ ] Implement session timeout handling
- [ ] Clear sensitive data on logout

### Input Validation
- [ ] Validate email format before submission
- [ ] Enforce password strength requirements
- [ ] Sanitize all user inputs
- [ ] Limit input lengths

### Error Handling
- [ ] Never expose sensitive error details
- [ ] Use generic error messages for auth failures
- [ ] Log errors for debugging (not in production)
- [ ] Handle network errors gracefully

### CAPTCHA
- [ ] Use CAPTCHA on registration
- [ ] Use CAPTCHA after failed login attempts
- [ ] Use CAPTCHA on password reset

### Session Management
- [ ] Show active sessions to users
- [ ] Allow users to terminate sessions
- [ ] Warn on suspicious sessions
- [ ] Implement session timeout

### XSS Prevention
- [ ] Use React's built-in escaping
- [ ] Avoid dangerouslySetInnerHTML
- [ ] Sanitize any HTML content
- [ ] Use Content-Security-Policy headers
```

### Secure Storage

```javascript
// utils/secureStorage.js

// NEVER store sensitive tokens in localStorage
// The backend handles token storage in HttpOnly cookies

// For non-sensitive user preferences only
export const storage = {
  get: (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },

  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove: (key) => {
    localStorage.removeItem(key);
  },

  clear: () => {
    localStorage.clear();
  },
};

// Clear on logout
export const clearAuthData = () => {
  storage.remove('user_preferences');
  // Tokens are cleared by backend via cookie expiration
};
```

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Email/password login |
| `/api/auth/register` | POST | Create new account |
| `/api/auth/logout` | POST | Logout (requires CSRF) |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/refresh` | POST | Refresh tokens |
| `/api/auth/sso/{provider}/authorize` | GET | Start OAuth flow |
| `/api/auth/phone/send-otp` | POST | Send SMS OTP |
| `/api/auth/phone/verify-otp` | POST | Verify SMS OTP |
| `/api/auth/magic-link/send` | POST | Send magic link |
| `/api/auth/magic-link/verify` | POST | Verify magic link |
| `/api/auth/mfa/setup` | POST | Start MFA setup |
| `/api/auth/mfa/verify` | POST | Verify MFA code |
| `/api/auth/sessions` | GET | List sessions |
| `/api/auth/sessions/{id}` | DELETE | Terminate session |
| `/api/auth/reauthenticate` | POST | Step-up auth |
| `/api/auth/anonymous` | POST | Guest login |
| `/api/auth/anonymous/convert` | POST | Convert to full account |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password |
| `/api/auth/change-password` | POST | Change password |
| `/api/auth/csrf` | GET | Get CSRF token |

---

## Need Help?

- **API Documentation**: Check Swagger at `/api-docs`
- **Backend Code**: See controller files in `src/controllers/`
- **Issues**: Report at https://github.com/mischa23v/traf3li-backend/issues
