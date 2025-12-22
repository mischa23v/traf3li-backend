# Frontend Security Implementation Guide

This document provides security implementation requirements for the traf3li frontend application. These instructions complement the backend security fixes and are essential for comprehensive application security.

## Table of Contents

1. [Critical Security Tasks](#critical-security-tasks)
2. [Authentication & Session Management](#authentication--session-management)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [Content Security Policy](#content-security-policy)
5. [Secure Data Handling](#secure-data-handling)
6. [API Security](#api-security)
7. [File Upload Security](#file-upload-security)
8. [Environment Configuration](#environment-configuration)

---

## Critical Security Tasks

### 1. CSRF Token Implementation

The backend now generates and validates CSRF tokens. Frontend must:

```javascript
// On app initialization, fetch CSRF token
const fetchCsrfToken = async () => {
  const response = await fetch('/api/csrf-token', { credentials: 'include' });
  const { csrfToken } = await response.json();
  localStorage.setItem('csrf-token', csrfToken);
};

// Include CSRF token in all state-changing requests
const secureRequest = async (url, options = {}) => {
  const csrfToken = localStorage.getItem('csrf-token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
};
```

### 2. Remove Role from Registration Form

**CRITICAL**: The registration form must NOT send `role` field to the backend.

```javascript
// WRONG - Do NOT do this:
const registerUser = {
  username: 'john',
  email: 'john@example.com',
  password: 'password',
  role: 'admin', // NEVER send this
};

// CORRECT:
const registerUser = {
  username: 'john',
  email: 'john@example.com',
  password: 'password',
  isSeller: true, // This determines if lawyer or client
};
```

### 3. Stripe Webhook Endpoint Configuration

Update payment handling to use secure webhook flow:

```javascript
// Frontend should NOT call confirm-payment directly
// Instead, use Stripe.js for client-side payment confirmation

import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const handlePayment = async (clientSecret) => {
  const stripe = await stripePromise;
  const { error, paymentIntent } = await stripe.confirmPayment({
    clientSecret,
    confirmParams: {
      return_url: `${window.location.origin}/payment-success`,
    },
  });

  if (error) {
    // Handle error
  }
  // Backend will receive webhook confirmation automatically
};
```

---

## Authentication & Session Management

### 1. Secure Token Storage

```javascript
// Store tokens in httpOnly cookies (set by backend)
// Never store sensitive tokens in localStorage

// For CSRF token only (not auth tokens):
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf-token='))
  ?.split('=')[1];
```

### 2. Session Timeout Handling

```javascript
// Implement automatic logout on session timeout
let sessionTimer;

const resetSessionTimer = () => {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    // Warn user 5 minutes before session expires
    showSessionWarning();
  }, 25 * 60 * 1000); // 25 minutes (if 30 min session)
};

// Reset timer on user activity
document.addEventListener('click', resetSessionTimer);
document.addEventListener('keypress', resetSessionTimer);
```

### 3. Logout on All Devices

```javascript
// Provide option to logout from all devices
const logoutAllDevices = async () => {
  await secureRequest('/api/auth/logout-all', { method: 'POST' });
  // Clear local state and redirect
};
```

---

## Input Validation & Sanitization

### 1. Client-Side Validation (with backend as source of truth)

```javascript
import Joi from 'joi';

// Validation schemas matching backend
const schemas = {
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  saudiIBAN: Joi.string().pattern(/^SA\d{22}$/),
};

const validateInput = (field, value) => {
  const { error } = schemas[field].validate(value);
  return error ? error.message : null;
};
```

### 2. XSS Prevention

```javascript
// Use DOMPurify for any user-generated content
import DOMPurify from 'dompurify';

// When displaying user content
const SafeContent = ({ html }) => (
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
);

// For text-only display, use textContent
const displayUserText = (text) => {
  const element = document.createElement('div');
  element.textContent = text; // Auto-escapes HTML
  return element.innerHTML;
};
```

### 3. File Name Sanitization

```javascript
const sanitizeFileName = (fileName) => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Remove special chars
    .replace(/\.{2,}/g, '.')            // Remove double dots
    .replace(/^\.+|\.+$/g, '')          // Remove leading/trailing dots
    .slice(0, 255);                      // Limit length
};
```

---

## Content Security Policy

### 1. Report CSP Violations

```javascript
// Set up CSP violation reporting
document.addEventListener('securitypolicyviolation', (e) => {
  fetch('/api/csp-report', {
    method: 'POST',
    body: JSON.stringify({
      documentUri: e.documentURI,
      violatedDirective: e.violatedDirective,
      blockedUri: e.blockedURI,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
    }),
  });
});
```

### 2. Nonce-based Script Loading

```javascript
// Get nonce from meta tag (set by backend)
const getNonce = () => {
  return document.querySelector('meta[name="csp-nonce"]')?.content;
};

// For dynamically loaded scripts
const loadScript = (src) => {
  const script = document.createElement('script');
  script.src = src;
  script.nonce = getNonce();
  document.body.appendChild(script);
};
```

---

## Secure Data Handling

### 1. Sensitive Data Masking

```javascript
// Mask sensitive data in display
const maskIBAN = (iban) => iban ? `SA****${iban.slice(-4)}` : '';
const maskPhone = (phone) => phone ? `****${phone.slice(-4)}` : '';
const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
};
```

### 2. Secure Form Handling

```javascript
// Clear sensitive fields on component unmount
useEffect(() => {
  return () => {
    // Clear password fields
    document.querySelectorAll('input[type="password"]').forEach(input => {
      input.value = '';
    });
  };
}, []);

// Disable autocomplete for sensitive fields
<input type="password" autoComplete="new-password" />
<input type="text" autoComplete="off" name="credit-card" />
```

### 3. Clipboard Security

```javascript
// Clear clipboard after copying sensitive data
const secureCopy = async (text) => {
  await navigator.clipboard.writeText(text);

  // Auto-clear after 30 seconds
  setTimeout(() => {
    navigator.clipboard.writeText('');
  }, 30000);

  showNotification('Copied! Will be cleared in 30 seconds.');
};
```

---

## API Security

### 1. Request Rate Limiting (Client-Side)

```javascript
// Implement client-side request throttling
import { throttle } from 'lodash';

const throttledSearch = throttle(async (query) => {
  return fetch(`/api/search?q=${encodeURIComponent(query)}`);
}, 300);
```

### 2. Error Handling (Don't Expose Details)

```javascript
// Generic error messages for users
const handleApiError = (error) => {
  // Log detailed error for debugging
  console.error('API Error:', error);

  // Show generic message to user
  if (error.status === 401) {
    return 'Please log in to continue.';
  } else if (error.status === 403) {
    return 'You do not have permission for this action.';
  } else if (error.status === 429) {
    return 'Too many requests. Please wait a moment.';
  } else {
    return 'An error occurred. Please try again.';
  }
};
```

### 3. Secure API Calls

```javascript
// Centralized API client with security features
class SecureApiClient {
  async request(url, options = {}) {
    const csrfToken = localStorage.getItem('csrf-token');

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers,
      },
    });

    // Handle token refresh
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request(url, options);
      }
      // Redirect to login
      window.location.href = '/login';
    }

    return response;
  }
}
```

---

## File Upload Security

### 1. Client-Side Validation

```javascript
const ALLOWED_TYPES = {
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file, category = 'document') => {
  const errors = [];

  // Check file type
  if (!ALLOWED_TYPES[category]?.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${ALLOWED_TYPES[category].join(', ')}`);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Check file name
  if (file.name.length > 255) {
    errors.push('File name too long');
  }

  return errors;
};
```

### 2. Secure File Upload

```javascript
const uploadFile = async (file, endpoint) => {
  const errors = validateFile(file);
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  const formData = new FormData();
  formData.append('file', file, sanitizeFileName(file.name));

  return fetch(endpoint, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      'X-CSRF-Token': localStorage.getItem('csrf-token'),
    },
  });
};
```

---

## Environment Configuration

### 1. Required Environment Variables

```env
# .env.local (frontend)
REACT_APP_API_URL=https://api.traf3li.com
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_xxxxx
REACT_APP_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# NEVER include in frontend:
# - API secrets
# - Database credentials
# - JWT secrets
# - Encryption keys
```

### 2. Environment Validation

```javascript
// Validate required env vars on app start
const requiredEnvVars = [
  'REACT_APP_API_URL',
  'REACT_APP_STRIPE_PUBLIC_KEY',
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter(
    key => !process.env[key]
  );

  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    throw new Error('Application configuration incomplete');
  }
};

// Call on app initialization
validateEnv();
```

---

## Security Checklist

Before deploying, ensure:

- [ ] CSRF tokens are included in all state-changing requests
- [ ] Registration form does NOT send `role` field
- [ ] Stripe payments use client-side SDK with webhook confirmation
- [ ] All user input is validated before sending to backend
- [ ] XSS protection using DOMPurify for user content
- [ ] Sensitive data is masked in UI
- [ ] Session timeout handling is implemented
- [ ] File uploads are validated client-side
- [ ] API errors show generic messages to users
- [ ] No sensitive data in console logs
- [ ] Environment variables are properly configured
- [ ] CSP violation reporting is set up

---

## Resources

- [OWASP Frontend Security](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Stripe.js Documentation](https://stripe.com/docs/js)
- [DOMPurify](https://github.com/cure53/DOMPurify)

---

*Generated: December 22, 2025*
*Backend Security Fixes Applied: This document*
