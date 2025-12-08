# Security Implementation Guide

## Overview
This backend has been enhanced with comprehensive security measures including:
- Enhanced Helmet configuration with strict CSP, HSTS, and security headers
- CSRF protection via double-submit cookie pattern
- Origin validation for state-changing operations
- Content-Type validation
- Request sanitization
- No-cache headers for sensitive endpoints

## CSRF Protection - Frontend Integration

### How It Works
The backend uses a double-submit cookie pattern for CSRF protection:
1. Backend sets a `csrf-token` cookie automatically
2. Frontend must read this cookie and send it in the `X-CSRF-Token` header for POST/PUT/PATCH/DELETE requests

### Frontend Implementation Examples

#### Axios (Recommended)
```javascript
import axios from 'axios';

// Function to get cookie value
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Create axios instance with CSRF token interceptor
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
    withCredentials: true
});

// Add CSRF token to all requests
api.interceptors.request.use(config => {
    const csrfToken = getCookie('csrf-token');
    if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
});

export default api;
```

#### Fetch API
```javascript
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

fetch('/api/endpoint', {
    method: 'POST',
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrf-token')
    },
    body: JSON.stringify(data)
});
```

#### React Hook (Custom)
```javascript
import { useEffect, useState } from 'react';

export function useCsrfToken() {
    const [csrfToken, setCsrfToken] = useState(null);

    useEffect(() => {
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        };

        const token = getCookie('csrf-token');
        setCsrfToken(token);
    }, []);

    return csrfToken;
}

// Usage in component
function MyComponent() {
    const csrfToken = useCsrfToken();

    const handleSubmit = async (data) => {
        const response = await fetch('/api/endpoint', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify(data)
        });
    };
}
```

## Security Headers Applied

### Helmet Configuration
- **Content-Security-Policy**: Restricts resource loading to trusted sources
- **X-Frame-Options**: DENY (prevents clickjacking)
- **Strict-Transport-Security**: Forces HTTPS for 1 year including subdomains
- **X-Content-Type-Options**: nosniff (prevents MIME type sniffing)
- **Referrer-Policy**: strict-origin-when-cross-origin
- **X-XSS-Protection**: 1; mode=block (legacy browser protection)

### Applied Middlewares
1. **securityHeaders**: Additional headers not covered by Helmet
2. **sanitizeRequest**: Removes null bytes and limits string length
3. **validateContentType**: Ensures POST/PUT/PATCH have proper Content-Type
4. **setCsrfToken**: Generates and sets CSRF token cookie
5. **validateCsrfToken**: Validates CSRF token on state-changing requests
6. **originCheck**: Verifies Origin/Referer headers
7. **noCache**: Applied to sensitive endpoints (auth, payments, HR, banking)

## Sensitive Endpoints with No-Cache

The following endpoint categories have no-cache headers applied:
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User data
- `/api/dashboard` - Dashboard data
- `/api/notifications` - Real-time notifications
- `/api/invoices/*` - Financial data
- `/api/expenses/*`
- `/api/payments/*` - Payment processing
- `/api/retainers/*`
- `/api/statements/*`
- `/api/transactions/*`
- `/api/reports/*` - Financial reports
- `/api/data-export/*` - Data exports
- `/api/trust-accounts/*` - Trust account data
- `/api/bank-accounts/*` - Banking data
- `/api/bank-transfers/*`
- `/api/bank-transactions/*`
- `/api/bank-reconciliations/*`
- `/api/bills/*`
- `/api/bill-payments/*`
- `/api/hr/*` - All HR endpoints
- `/api/hr/payroll/*` - Payroll data
- `/api/team/*` - Team management
- `/api/audit/*` - Audit logs
- `/api/approvals/*`
- `/api/permissions/*`
- `/api/saudi-banking/*` - Saudi banking integration

## Testing the Implementation

### Test CSRF Protection
```bash
# This should fail (no CSRF token)
curl -X POST http://localhost:8080/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# This should succeed (with valid token)
# 1. First, get the CSRF token from a GET request
# 2. Then use it in subsequent requests
```

### Test Security Headers
```bash
curl -I http://localhost:8080/api/health
```

Expected headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Disabling CSRF for Specific Routes (If Needed)

If you need to disable CSRF validation for specific routes (e.g., webhooks):

```javascript
// In server.js, before the global validateCsrfToken middleware
app.post('/api/webhooks/stripe',
    express.raw({type: 'application/json'}),
    stripeWebhookHandler
);

// Then apply CSRF validation to all other routes
app.use('/api', validateCsrfToken);
```

## Environment Variables

No additional environment variables are required. The security middleware uses existing CORS configuration from:
- `process.env.CLIENT_URL`
- `process.env.DASHBOARD_URL`

## Production Checklist

- [ ] Verify HTTPS is enabled (required for secure cookies)
- [ ] Test CSRF token flow with frontend
- [ ] Verify Origin header validation works with production domains
- [ ] Monitor logs for blocked requests
- [ ] Test all sensitive endpoints have no-cache headers
- [ ] Verify security headers are present in responses

## Monitoring

Security events are logged via the structured logger:
- Origin validation failures
- CSRF token validation failures
- Invalid Content-Type headers
- Requests without Origin/Referer headers

Check logs for patterns like:
- `"Origin check failed"`
- `"CSRF token validation failed"`
- `"Invalid or missing Content-Type"`
