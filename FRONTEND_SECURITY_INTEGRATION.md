# Frontend Security Integration Guide

This document outlines the frontend changes required after the comprehensive backend security audit fixes. Follow these instructions to ensure your frontend works correctly with the new security measures.

## Table of Contents

1. [CSRF Protection (REQUIRED)](#1-csrf-protection-required)
2. [Rate Limiting Handling](#2-rate-limiting-handling)
3. [Session Timeout Handling](#3-session-timeout-handling)
4. [Error Response Handling](#4-error-response-handling)
5. [Environment Variables](#5-environment-variables)
6. [Quick Checklist](#6-quick-checklist)

---

## 1. CSRF Protection (REQUIRED)

The backend now uses **Double-Submit Cookie Pattern** for CSRF protection. Your frontend **MUST** implement this to make POST/PUT/PATCH/DELETE requests work.

### How It Works

1. Backend sets a `csrf-token` cookie (readable by JavaScript)
2. Frontend reads this cookie and sends it in the `X-CSRF-Token` header
3. Backend validates that cookie and header match

### Implementation

#### Option A: Axios Interceptor (Recommended)

```javascript
// src/utils/api.js or src/lib/axios.js

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.traf3li.com',
  withCredentials: true, // REQUIRED for cookies
});

// Add CSRF token to all state-changing requests
api.interceptors.request.use((config) => {
  // Only add CSRF token for state-changing methods
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    // Read csrf-token from cookie
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf-token='))
      ?.split('=')[1];

    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

export default api;
```

#### Option B: Fetch Wrapper

```javascript
// src/utils/fetchWithCSRF.js

function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];
}

export async function fetchWithCSRF(url, options = {}) {
  const csrfToken = getCsrfToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // REQUIRED for cookies
  });
}
```

#### Option C: React Query / TanStack Query

```javascript
// src/lib/queryClient.js

import { QueryClient } from '@tanstack/react-query';
import api from './axios'; // Use the axios instance from Option A

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const { data } = await api.get(queryKey[0]);
        return data;
      },
    },
    mutations: {
      mutationFn: async ({ url, method = 'POST', body }) => {
        const { data } = await api({ url, method, data: body });
        return data;
      },
    },
  },
});
```

### Exempt Routes (No CSRF Token Needed)

These public authentication routes don't require CSRF tokens:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/resend-otp`
- `POST /api/auth/check-availability`
- `POST /api/auth/logout`

---

## 2. Rate Limiting Handling

The backend now has centralized rate limiting. Handle 429 responses gracefully.

### Rate Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication (`/api/auth/*`) | 15 requests | 15 minutes |
| MFA/Security (`/api/v1/mfa/*`) | 3 requests | 1 hour |
| Payments (`/api/payments/*`, `/api/v1/billing/*`) | 10 requests | 1 hour |
| File Uploads | 50 uploads | 1 hour |
| Search | 30 requests | 1 minute |
| General API (authenticated) | 400 requests | 1 minute |
| General API (unauthenticated) | 30 requests | 1 minute |

### Response Headers

The backend returns these headers with every response:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1703347200
```

### Handling 429 Responses

```javascript
// src/utils/api.js

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;

      // Show user-friendly message (Arabic + English from response)
      const message = error.response.data?.error_en || 'Too many requests. Please try again later.';
      const messageAr = error.response.data?.error || 'طلبات كثيرة جداً - حاول مرة أخرى لاحقاً';

      // Use your toast/notification system
      toast.error(getCurrentLanguage() === 'ar' ? messageAr : message);

      // Optional: Auto-retry after delay for specific requests
      // await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      // return api.request(error.config);
    }

    return Promise.reject(error);
  }
);
```

### UI Best Practices

1. **Debounce search inputs** (300-500ms delay)
2. **Disable buttons** after submission until response
3. **Show countdown** when rate limited
4. **Cache responses** where possible

```javascript
// Example: Debounced search
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback((query) => {
  api.get(`/api/v1/search?q=${query}`);
}, 300);
```

---

## 3. Session Timeout Handling

The backend enforces:
- **Idle Timeout**: 30 minutes of inactivity
- **Absolute Timeout**: 24 hours maximum session

### Handling Session Expiry

```javascript
// src/utils/api.js

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const errorCode = error.response.data?.code;

      if (errorCode === 'SESSION_EXPIRED' || errorCode === 'SESSION_TIMEOUT') {
        // Clear local auth state
        localStorage.removeItem('user');

        // Redirect to login with message
        window.location.href = '/login?session=expired';
      } else if (errorCode === 'TOKEN_EXPIRED') {
        // Try to refresh token
        try {
          await api.post('/api/auth/refresh-token');
          // Retry original request
          return api.request(error.config);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          window.location.href = '/login?session=expired';
        }
      }
    }

    return Promise.reject(error);
  }
);
```

### Keep-Alive for Active Users

If you want to extend session for active users:

```javascript
// src/hooks/useSessionKeepAlive.js

import { useEffect } from 'react';
import api from '../utils/api';

export function useSessionKeepAlive() {
  useEffect(() => {
    // Ping backend every 10 minutes to keep session alive
    const interval = setInterval(() => {
      api.get('/api/auth/me').catch(() => {
        // Session expired, will be handled by interceptor
      });
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);
}
```

---

## 4. Error Response Handling

All errors now follow a consistent format:

### Error Response Format

```json
{
  "success": false,
  "error": "رسالة الخطأ بالعربية",
  "error_en": "Error message in English",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AUTH_RATE_LIMIT_EXCEEDED` | 429 | Too many login attempts |
| `CSRF_TOKEN_MISSING` | 403 | CSRF token not provided |
| `CSRF_TOKEN_INVALID` | 403 | CSRF token mismatch |
| `SESSION_EXPIRED` | 401 | Session timed out |
| `TOKEN_EXPIRED` | 401 | JWT token expired |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not authorized for action |
| `VALIDATION_ERROR` | 400 | Input validation failed |

### Comprehensive Error Handler

```javascript
// src/utils/errorHandler.js

export function handleApiError(error, t) {
  const status = error.response?.status;
  const data = error.response?.data;
  const code = data?.code;

  // Get localized message
  const message = t?.locale === 'ar' ? data?.error : data?.error_en;

  switch (status) {
    case 400:
      return { type: 'validation', message: message || 'Invalid input' };

    case 401:
      if (code === 'SESSION_EXPIRED' || code === 'TOKEN_EXPIRED') {
        return { type: 'session', message: 'Session expired. Please log in again.' };
      }
      return { type: 'auth', message: message || 'Please log in' };

    case 403:
      if (code?.includes('CSRF')) {
        return { type: 'csrf', message: 'Security error. Please refresh the page.' };
      }
      return { type: 'forbidden', message: message || 'Not authorized' };

    case 429:
      return { type: 'rateLimit', message: message || 'Too many requests. Please wait.' };

    case 500:
      return { type: 'server', message: 'Server error. Please try again later.' };

    default:
      return { type: 'unknown', message: message || 'An error occurred' };
  }
}
```

---

## 5. Environment Variables

### Backend (.env) - No Changes Required

All existing environment variables work as before. No new variables needed.

### Frontend (.env)

Ensure these are set:

```bash
# API URL
VITE_API_URL=https://api.traf3li.com

# For development
VITE_API_URL=http://localhost:5000
```

---

## 6. Quick Checklist

### Required Changes

- [ ] **Add CSRF token to headers** for POST/PUT/PATCH/DELETE requests
- [ ] **Set `credentials: 'include'`** (axios: `withCredentials: true`) for all requests
- [ ] **Handle 429 responses** with user-friendly rate limit messages
- [ ] **Handle 401 responses** for session expiry

### Recommended Improvements

- [ ] Debounce search inputs (300-500ms)
- [ ] Disable submit buttons during API calls
- [ ] Add loading states to prevent double submissions
- [ ] Cache GET responses where appropriate
- [ ] Show session expiry warnings before timeout

### Testing Checklist

1. **CSRF Protection**
   - [ ] Login works (exempt from CSRF)
   - [ ] Creating/updating resources works (CSRF token sent)
   - [ ] Requests fail with 403 if CSRF token removed

2. **Rate Limiting**
   - [ ] 429 response shows user-friendly message
   - [ ] Rate limit headers visible in dev tools
   - [ ] Search debouncing prevents rapid requests

3. **Session Handling**
   - [ ] User redirected to login after session expires
   - [ ] Token refresh works automatically
   - [ ] "Session expired" message shows appropriately

---

## Example: Complete Axios Setup

```javascript
// src/lib/api.js

import axios from 'axios';
import { toast } from 'your-toast-library';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add CSRF token
api.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf-token='))
      ?.split('=')[1];

    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Rate limiting
    if (status === 429) {
      toast.error(data?.error_en || 'Too many requests. Please slow down.');
      return Promise.reject(error);
    }

    // Session expired
    if (status === 401) {
      const code = data?.code;
      if (code === 'SESSION_EXPIRED' || code === 'TOKEN_EXPIRED') {
        // Try refresh first
        if (code === 'TOKEN_EXPIRED' && !error.config._retry) {
          error.config._retry = true;
          try {
            await api.post('/api/auth/refresh-token');
            return api.request(error.config);
          } catch {
            // Refresh failed
          }
        }

        localStorage.removeItem('user');
        window.location.href = '/login?session=expired';
        return Promise.reject(error);
      }
    }

    // CSRF error
    if (status === 403 && data?.code?.includes('CSRF')) {
      toast.error('Security error. Please refresh the page.');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## Questions?

If you encounter issues with the security integration, check:

1. **Browser DevTools > Network tab**: Verify cookies and headers
2. **Console**: Check for CORS or CSRF errors
3. **Response headers**: Verify rate limit headers

For backend issues, check the server logs for detailed error messages.
