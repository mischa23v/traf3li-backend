# BFF Pattern Implementation - Frontend Contract

## Overview

This backend implements a **BFF (Backend for Frontend) pattern** for authentication security.
All access and refresh tokens are stored in **httpOnly cookies ONLY** - never in response bodies.

This follows the security patterns used by:
- Auth0 (recommended approach for SPAs)
- Netflix (BFF for each client)
- Spotify (BFF pattern for web app)
- AWS, Google, Microsoft (httpOnly cookie patterns)

## Security Benefits

| Attack Vector | Protection |
|---------------|------------|
| **XSS Token Theft (Memory)** | ❌ Impossible - No tokens in JavaScript |
| **XSS Token Theft (Cookie)** | ❌ Impossible - httpOnly flag blocks JS access |
| **CSRF Attacks** | ❌ Protected - SameSite + CSRF tokens |
| **Token Interception** | ❌ Protected - Secure flag (HTTPS only) |

## Frontend Implementation Requirements

### 1. All API Calls Must Include Credentials

```javascript
// REQUIRED: credentials: 'include' to auto-attach httpOnly cookies
fetch('/api/users/me', {
    method: 'GET',
    credentials: 'include',  // CRITICAL - cookies auto-attached
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken  // If CSRF is enabled
    }
});

// With Axios
axios.defaults.withCredentials = true;

// With fetch wrapper
const api = {
    get: (url) => fetch(url, { credentials: 'include' }),
    post: (url, body) => fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
};
```

### 2. Login Response (No Tokens in Body)

```javascript
// Login request
const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});

// Response body - NO TOKENS!
{
    "error": false,
    "message": "Success!",
    "expiresIn": 900,     // Token expires in 15 minutes
    "user": { ... }       // User data for UI
}

// Tokens are set as httpOnly cookies automatically:
// - accessToken (httpOnly, Secure, SameSite)
// - refresh_token (httpOnly, Secure, SameSite, Path=/api/auth)
```

### 3. Token Refresh (Silent Background Refresh)

```javascript
// Option A: Proactive refresh before token expires
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes (1 min before expiry)

setInterval(async () => {
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            // Redirect to login
            window.location.href = '/login';
        }

        const data = await response.json();
        console.log('Token refreshed, expires in:', data.expiresIn, 'seconds');
    } catch (error) {
        console.error('Token refresh failed:', error);
    }
}, TOKEN_REFRESH_INTERVAL);

// Option B: Refresh on 401 response (reactive)
const fetchWithRefresh = async (url, options = {}) => {
    let response = await fetch(url, { ...options, credentials: 'include' });

    if (response.status === 401) {
        // Try to refresh
        const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (refreshResponse.ok) {
            // Retry original request
            response = await fetch(url, { ...options, credentials: 'include' });
        } else {
            // Redirect to login
            window.location.href = '/login';
        }
    }

    return response;
};
```

### 4. Logout

```javascript
const logout = async () => {
    await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    });

    // Cookies are cleared by the server
    // Redirect to login
    window.location.href = '/login';
};
```

### 5. Check Authentication Status

```javascript
// Don't rely on tokens in localStorage - check with backend
const checkAuth = async () => {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        }

        return null;
    } catch (error) {
        return null;
    }
};

// Use in React
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth().then(userData => {
            setUser(userData?.user || null);
            setLoading(false);
        });
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
```

## API Response Changes

### Authentication Endpoints

| Endpoint | Before | After |
|----------|--------|-------|
| `POST /auth/login` | `{ accessToken, refreshToken, user }` | `{ expiresIn, user }` |
| `POST /auth/register` | `{ access_token, refresh_token, user }` | `{ expiresIn, token_type, user }` |
| `POST /auth/refresh` | `{ accessToken, expiresIn }` | `{ expiresIn, refreshedAt }` |
| `POST /auth/sso/callback` | `{ access_token, refresh_token, user }` | `{ expires_in, authenticated, user }` |
| `POST /auth/google/one-tap` | `{ accessToken, refreshToken, user }` | `{ expires_in, user }` |
| `POST /auth/otp/verify` | `{ accessToken, refreshToken, user }` | `{ expires_in, user }` |
| `POST /auth/phone/verify-otp` | `{ accessToken, refreshToken, user }` | `{ expires_in, user }` |
| `POST /auth/webauthn/authenticate/finish` | `{ accessToken, refreshToken, data }` | `{ expires_in, data }` |
| `POST /auth/ldap/login` | `{ accessToken, refreshToken, user }` | `{ expires_in, user }` |
| `POST /firms/switch` | `{ access_token, data }` | `{ expires_in, data }` |

## Cookie Configuration

| Cookie | HttpOnly | Secure | SameSite | Path | Max-Age |
|--------|----------|--------|----------|------|---------|
| `accessToken` | ✅ Yes | ✅ Prod | auto | / | 15 min |
| `refresh_token` | ✅ Yes | ✅ Prod | auto | /api/auth | 7-30 days |
| `csrfToken` | ❌ No* | ✅ Prod | auto | / | 1 hour |

*CSRF token needs JavaScript access for double-submit pattern

## Migration Guide for Frontend

### Step 1: Remove localStorage Token Storage

```javascript
// BEFORE - Remove all of this
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);

const token = localStorage.getItem('accessToken');
headers.Authorization = `Bearer ${token}`;

// AFTER - No token storage needed
// Cookies are automatically attached with credentials: 'include'
```

### Step 2: Update API Client

```javascript
// BEFORE
const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    }
});

// AFTER
const apiClient = axios.create({
    baseURL: '/api',
    withCredentials: true  // This is all you need!
});
```

### Step 3: Update Auth State Management

```javascript
// BEFORE - Token-based auth check
const isAuthenticated = () => !!localStorage.getItem('accessToken');

// AFTER - Server-based auth check
const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
        .then(res => setIsAuthenticated(res.ok))
        .catch(() => setIsAuthenticated(false));
}, []);
```

### Step 4: Remove Token Refresh Interceptors

```javascript
// BEFORE - Complex interceptor with token in localStorage
axios.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401) {
            const refreshToken = localStorage.getItem('refreshToken');
            const { data } = await axios.post('/auth/refresh', { refreshToken });
            localStorage.setItem('accessToken', data.accessToken);
            // Retry...
        }
    }
);

// AFTER - Simple interceptor (cookies handled automatically)
axios.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401 && !error.config._retry) {
            error.config._retry = true;

            // Just call refresh - cookies are automatic
            const refreshResponse = await axios.post('/auth/refresh');

            if (refreshResponse.status === 200) {
                return axios(error.config);  // Retry
            }

            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
```

## Security Notes

1. **Never log tokens** - There are no tokens to log in the response body
2. **XSS cannot steal tokens** - Tokens are httpOnly, JavaScript cannot access
3. **CSRF protection** - Use the `csrfToken` cookie value in `X-CSRF-Token` header for state-changing requests
4. **Token refresh** - Call `/api/auth/refresh` endpoint; cookies are rotated automatically
5. **Logout** - Call `/api/auth/logout` endpoint; server clears all cookies

## Troubleshooting

### "401 Unauthorized" after login
- Check that `credentials: 'include'` is set on all requests
- Verify cookies are being set (check browser DevTools → Application → Cookies)

### Cookies not being sent
- For cross-origin requests, ensure `SameSite=None; Secure` is set
- Check CORS configuration allows credentials

### CSRF token issues
- Read `csrfToken` cookie with JavaScript
- Include in `X-CSRF-Token` header on POST/PUT/DELETE requests

---

## Advanced Security Features

### Logout All Sessions (Back-Channel Logout)

Logout from all devices at once:

```javascript
// Logout current session only
await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
});

// Logout ALL sessions (all devices)
await fetch('/api/auth/logout-all', {
    method: 'POST',
    credentials: 'include'
});
```

This revokes:
- All refresh tokens for the user
- All active sessions
- All access tokens (added to blacklist)

### Duende-Style Custom Header Protection (Optional)

For extra CSRF protection, enable mandatory custom header:

```bash
# Environment variable
CSRF_REQUIRE_CUSTOM_HEADER=true
CSRF_CUSTOM_HEADER_NAME=x-csrf  # default
CSRF_CUSTOM_HEADER_VALUE=1      # default
```

When enabled, ALL state-changing requests must include:

```javascript
fetch('/api/resource', {
    method: 'POST',
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
        'x-csrf': '1'  // Required when CSRF_REQUIRE_CUSTOM_HEADER=true
    }
});
```

This provides CSRF protection without token state management.

---

## SameSite Cookie Policy Explained

### Why We Use `auto` Instead of `strict`

| Policy | Behavior | Use Case |
|--------|----------|----------|
| `strict` | Cookie only sent on same-site requests | Maximum security, but breaks OAuth redirects |
| `lax` | Cookie sent on same-site + top-level navigations | Good balance, recommended default |
| `none` | Cookie always sent (requires Secure flag) | Required for cross-origin API |
| `auto` | **Our default** - Adaptive based on request origin | Best flexibility for multi-subdomain apps |

### Why Not `strict`?

`SameSite=Strict` would break these flows:

1. **OAuth/SSO Redirects**
   ```
   User clicks "Login with Google"
   → Redirected to Google
   → Google redirects back to /auth/callback
   → Cookie NOT sent (cross-site navigation)
   → Login fails!
   ```

2. **Magic Links from Email**
   ```
   User clicks magic link in email
   → Browser navigates to /auth/magic-link/verify
   → Cookie NOT sent (cross-site navigation)
   → Verification fails!
   ```

3. **Cross-Subdomain API**
   ```
   Frontend: dashboard.traf3li.com
   API: api.traf3li.com
   → Different subdomains = cross-origin
   → SameSite=Strict blocks cookies
   ```

### How `auto` Mode Works

```javascript
// In cookieConfig.js
if (sameSiteConfig === 'auto') {
    if (isSameOriginProxy) {
        return 'lax';    // Same-origin: use secure default
    } else if (isProduction) {
        return 'none';   // Cross-origin production: allow with Secure
    } else {
        return 'lax';    // Development: use secure default
    }
}
```

### Security Is NOT Compromised

Even with `SameSite=Lax/None`, we have multiple protection layers:

1. **httpOnly** - JavaScript cannot read cookies
2. **Secure** - HTTPS only in production
3. **CSRF tokens** - Double-submit cookie pattern
4. **Origin validation** - Requests must come from allowed origins
5. **Token rotation** - Refresh tokens rotated on each use
6. **Token reuse detection** - Entire family revoked if reuse detected

---

## Token Security Features

### Token Rotation

Every time you refresh, you get NEW tokens:

```
Refresh #1: token_abc → token_def (abc revoked)
Refresh #2: token_def → token_ghi (def revoked)
Refresh #3: token_ghi → token_jkl (ghi revoked)
```

### Token Family Tracking

All tokens from a login session share a family ID:

```
Login → family: "fam_123"
  ├── refresh_token_1 (family: fam_123)
  ├── refresh_token_2 (family: fam_123, rotated from 1)
  └── refresh_token_3 (family: fam_123, rotated from 2)
```

### Token Reuse Detection

If an attacker steals `refresh_token_1` and tries to use it:

```
Attacker uses: refresh_token_1 (already rotated to token_2)
Server detects: "Token reuse! This token was already rotated"
Server action: REVOKE ENTIRE FAMILY (fam_123)
Result: Attacker AND legitimate user both logged out
User notified: "Security alert - please login again"
```

This is the **gold standard** pattern used by Auth0 and Okta.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REFRESH_TOKEN_SAMESITE` | `auto` | Cookie SameSite policy (strict/lax/none/auto) |
| `REFRESH_TOKEN_PATH` | `/api/auth` | Path restriction for refresh token cookie |
| `REFRESH_TOKEN_DAYS` | `7` | Refresh token expiry (days) |
| `REMEMBER_ME_DAYS` | `30` | Refresh token expiry with "Remember Me" |
| `CSRF_REQUIRE_CUSTOM_HEADER` | `false` | Enable Duende-style x-csrf header |
| `CSRF_CUSTOM_HEADER_NAME` | `x-csrf` | Custom header name |
| `CSRF_CUSTOM_HEADER_VALUE` | `1` | Expected header value |

---

## Comparison with Industry Standards

| Feature | Our Implementation | Auth0 | Duende BFF | Okta |
|---------|-------------------|-------|------------|------|
| httpOnly cookies | ✅ | ✅ | ✅ | ✅ |
| Token rotation | ✅ | ✅ | ✅ | ✅ |
| Token reuse detection | ✅ | ✅ | ✅ | ✅ |
| Family-based revocation | ✅ | ✅ | N/A | ✅ |
| CSRF protection | ✅ | ✅ | ✅ | ✅ |
| Custom header option | ✅ | ❌ | ✅ | ❌ |
| Device fingerprinting | ✅ | ❌ | ❌ | ❌ |
| Session anomaly detection | ✅ | ❌ | ❌ | ❌ |
| Logout all sessions | ✅ | ✅ | ✅ | ✅ |
