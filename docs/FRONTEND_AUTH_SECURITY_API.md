# Authentication & Security API Documentation

> **Last Updated:** 2025-12-26
> **Total Endpoints:** 159+

## CRITICAL NOTES FOR FRONTEND

### Versioned vs Non-Versioned Endpoints

| Endpoint Type | Path Pattern | Example |
|---------------|--------------|---------|
| **Auth endpoints** | `/api/auth/...` | `/api/auth/login` |
| **SSO endpoints** | `/api/auth/sso/...` | `/api/auth/sso/providers` |
| **Security endpoints** | `/api/security/...` | `/api/security/csp-report` |
| **Versioned endpoints** | `/api/v1/...` | `/api/v1/tasks` |

**DO NOT** use `/api/v1/auth/...` - auth endpoints are NOT versioned!

### Common Mistakes

```javascript
// WRONG - Will return 404
fetch('/api/v1/auth/sso/enabled-providers')

// CORRECT
fetch('/api/auth/sso/providers')
```

---

## 1. BASIC AUTHENTICATION

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/register` | No | Heavy | Register new user (CAPTCHA required in production) |
| `POST` | `/login` | No | Heavy | Login with email/password |
| `POST` | `/logout` | Yes | Normal | Logout current session |
| `POST` | `/logout-all` | Yes | Normal | Logout from all devices |
| `GET` | `/me` | Yes | Normal | Get current user profile |
| `POST` | `/refresh` | No | Normal | Refresh access token |
| `POST` | `/check-availability` | No | Heavy | Check email/username availability |

### Request/Response Examples

#### POST /api/auth/register
```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "captchaToken": "..." // Required in production
}

// Response
{
  "error": false,
  "message": "Registration successful",
  "user": { ... },
  "token": "eyJhbGciOiJI..."
}
```

#### POST /api/auth/login
```json
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "captchaToken": "..." // Required after failed attempts
}

// Response (Success)
{
  "error": false,
  "token": "eyJhbGciOiJI...",
  "refreshToken": "...",
  "user": { ... }
}

// Response (MFA Required)
{
  "error": false,
  "mfaRequired": true,
  "mfaToken": "temp_token_for_mfa_verification"
}
```

---

## 2. ANONYMOUS/GUEST AUTHENTICATION

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/anonymous` | No | Create anonymous/guest session |
| `POST` | `/anonymous/convert` | Yes | Convert guest to full account |

---

## 3. GOOGLE ONE TAP

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/google/one-tap` | No | Authenticate via Google One Tap credential |

```json
// Request
{
  "credential": "google_id_token_from_one_tap"
}
```

---

## 4. OTP AUTHENTICATION (Email & Phone)

**Base Path:** `/api/auth`

### Email OTP
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/send-otp` | No | Send OTP to email |
| `POST` | `/verify-otp` | No | Verify OTP and login |
| `POST` | `/resend-otp` | No | Resend OTP |
| `GET` | `/otp-status` | No | Check rate limit status |

### Phone OTP
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/phone/send-otp` | No | Send OTP via SMS |
| `POST` | `/phone/verify-otp` | No | Verify phone OTP |
| `POST` | `/phone/resend-otp` | No | Resend SMS OTP |
| `GET` | `/phone/otp-status` | No | Check SMS rate limit |

---

## 5. MAGIC LINK (Passwordless)

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/magic-link/send` | No | Send magic link to email |
| `POST` | `/magic-link/verify` | No | Verify token and authenticate |

---

## 6. MULTI-FACTOR AUTHENTICATION (MFA/TOTP)

**Base Path:** `/api/auth/mfa`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/setup` | Yes | Start MFA setup, get QR code |
| `POST` | `/verify-setup` | Yes | Verify TOTP and enable MFA |
| `POST` | `/verify` | No* | Verify TOTP during login |
| `POST` | `/disable` | Yes | Disable MFA |
| `GET` | `/status` | Yes | Get MFA status |
| `POST` | `/backup-codes/generate` | Yes | Generate backup codes |
| `POST` | `/backup-codes/verify` | No* | Use backup code for login |
| `POST` | `/backup-codes/regenerate` | Yes | Regenerate backup codes |
| `GET` | `/backup-codes/count` | Yes | Get remaining backup codes count |

*Uses MFA token from login response

### MFA Flow
```
1. User logs in with email/password
2. If MFA enabled, receive { mfaRequired: true, mfaToken: "..." }
3. POST /api/auth/mfa/verify with { mfaToken, code: "123456" }
4. Receive final auth tokens
```

---

## 7. WEBAUTHN/FIDO2 (Hardware Keys & Biometric)

**Base Path:** `/api/auth/webauthn`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register/start` | Yes | Get registration options |
| `POST` | `/register/finish` | Yes | Complete registration |
| `POST` | `/authenticate/start` | No | Get authentication challenge |
| `POST` | `/authenticate/finish` | No | Complete authentication |
| `GET` | `/credentials` | Yes | List registered credentials |
| `PATCH` | `/credentials/:id` | Yes | Update credential name |
| `DELETE` | `/credentials/:id` | Yes | Delete credential |

---

## 8. PASSWORD MANAGEMENT

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/change-password` | Yes | Change password (step-up required) |
| `GET` | `/password-status` | Yes | Get password expiry info |
| `POST` | `/forgot-password` | No | Request password reset email |
| `POST` | `/reset-password` | No | Reset password with token |

---

## 9. EMAIL VERIFICATION

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/verify-email` | No | Verify email with token |
| `POST` | `/resend-verification` | Yes | Resend verification email |

---

## 10. SESSION MANAGEMENT

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/sessions` | Yes | List all active sessions |
| `GET` | `/sessions/current` | Yes | Get current session details |
| `GET` | `/sessions/stats` | Yes | Get session statistics |
| `DELETE` | `/sessions/:id` | Yes | Terminate specific session |
| `DELETE` | `/sessions` | Yes | Terminate all other sessions |

---

## 11. STEP-UP/RE-AUTHENTICATION

**Base Path:** `/api/auth`

Required for sensitive operations (password change, MFA changes, etc.)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/reauthenticate` | Yes | Perform step-up auth |
| `POST` | `/reauthenticate/challenge` | Yes | Create challenge |
| `POST` | `/reauthenticate/verify` | Yes | Verify challenge |
| `GET` | `/reauthenticate/status` | Yes | Check if step-up needed |

---

## 12. OAUTH SSO

**Base Path:** `/api/auth/sso`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/providers` | No | Get enabled OAuth providers |
| `GET` | `/:providerType/authorize` | No | Start OAuth flow |
| `GET` | `/:providerType/callback` | No | OAuth callback |
| `POST` | `/link` | Yes | Link OAuth to account |
| `DELETE` | `/unlink/:providerType` | Yes | Unlink OAuth |
| `GET` | `/linked` | Yes | Get linked accounts |

### SSO Domain Detection
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/detect` | No | Detect SSO for email domain |
| `GET` | `/domain/:domain` | Yes | Get domain SSO config |
| `POST` | `/domain/:domain/verify/generate` | Yes | Generate verification token |
| `POST` | `/domain/:domain/verify` | Yes | Verify domain |
| `POST` | `/domain/:domain/verify/manual` | Yes | Manual verification |
| `POST` | `/domain/:domain/cache/invalidate` | Yes | Clear cache |

### OAuth Flow Example
```javascript
// 1. Get available providers
const { providers } = await fetch('/api/auth/sso/providers').then(r => r.json());

// 2. Start OAuth flow (redirects to provider)
window.location.href = `/api/auth/sso/google/authorize?returnUrl=/dashboard`;

// 3. After OAuth callback, user is authenticated
```

---

## 13. SAML SSO (Enterprise)

**Base Path:** `/api/auth/saml`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/metadata/:firmId` | No | Get SP metadata XML |
| `GET` | `/login/:firmId` | No | Initiate SAML login |
| `POST` | `/acs/:firmId` | No | Assertion Consumer Service |
| `GET` | `/logout/:firmId` | No | Initiate logout |
| `POST` | `/sls/:firmId` | No | Single Logout Service |
| `GET` | `/config` | Yes | Get SAML config (admin) |
| `PUT` | `/config` | Yes | Update SAML config (admin) |
| `POST` | `/config/test` | Yes | Test SAML config |

---

## 14. SSO CONFIGURATION (Admin)

**Base Path:** `/api/firms/:firmId/sso`

| Method | Endpoint | Auth | Feature Required | Description |
|--------|----------|------|------------------|-------------|
| `GET` | `/` | Yes | `sso` | Get SSO config |
| `PUT` | `/` | Yes | `sso` | Update SSO config |
| `POST` | `/test` | Yes | `sso` | Test connection |
| `POST` | `/upload-metadata` | Yes | `sso` | Upload IdP metadata |
| `DELETE` | `/` | Yes | `sso` | Disable SSO |

---

## 15. CAPTCHA VERIFICATION

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/verify-captcha` | No | Verify CAPTCHA token |
| `GET` | `/captcha/providers` | No | Get enabled providers |
| `GET` | `/captcha/status/:provider` | No | Get provider status |

Supported providers: `recaptcha`, `hcaptcha`, `turnstile`

---

## 16. API KEY MANAGEMENT

**Base Path:** `/api/keys`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | Yes | List API keys |
| `GET` | `/stats` | Yes | Get usage stats |
| `GET` | `/:id` | Yes | Get specific key |
| `POST` | `/` | Yes | Create API key |
| `PATCH` | `/:id` | Yes | Update API key |
| `DELETE` | `/:id` | Yes | Revoke API key |
| `POST` | `/:id/regenerate` | Yes | Regenerate key |

---

## 17. SECURITY ENDPOINTS

**Base Path:** `/api/security`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/dashboard` | Yes (Admin) | Security dashboard |
| `GET` | `/incidents` | Yes (Admin) | List incidents |
| `GET` | `/incidents/:id` | Yes (Admin) | Get incident details |
| `POST` | `/incidents/report` | Yes | Report incident |
| `PATCH` | `/incidents/:id/status` | Yes (Admin) | Update incident |
| `GET` | `/incidents/stats` | Yes (Admin) | Incident statistics |
| `POST` | `/vulnerability/report` | No | Report vulnerability |
| `POST` | `/csp-report` | No | CSP violation report |
| `GET` | `/csp-violations` | Yes (Admin) | Get CSP violations |
| `DELETE` | `/csp-violations` | Yes (Admin) | Clear violations |

---

## 18. CONSENT MANAGEMENT (PDPL)

**Base Path:** `/api/consent`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | Yes | Get consent status |
| `POST` | `/` | Yes | Update all consents |
| `PUT` | `/:category` | Yes | Update specific consent |
| `DELETE` | `/` | Yes | Withdraw all & request deletion |
| `POST` | `/export` | Yes | Request data export |
| `GET` | `/history` | Yes | Get consent history |

---

## 19. VERIFICATION SERVICES (Saudi APIs)

### Yakeen (National ID)
**Base Path:** `/verify/yakeen`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/` | Yes | Verify National ID |
| `POST` | `/address` | Yes | Get citizen address |
| `GET` | `/status` | Yes | Service status |

### Wathq (Business Registry)
**Base Path:** `/verify/wathq`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/:crNumber` | Yes | Get company info |
| `GET` | `/:crNumber/basic` | Yes | Basic company info |
| `GET` | `/:crNumber/status` | Yes | Company status |
| `GET` | `/:crNumber/managers` | Yes | Company managers |
| `GET` | `/:crNumber/owners` | Yes | Company owners |
| `GET` | `/:crNumber/capital` | Yes | Capital info |
| `GET` | `/:crNumber/branches` | Yes | Company branches |
| `GET` | `/config/status` | Yes | Service status |

### MOJ (Ministry of Justice)
**Base Path:** `/verify/moj`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/attorney/:attorneyId` | Yes | Get attorney info |
| `POST` | `/attorney` | Yes | Verify attorney |
| `GET` | `/license/:licenseNumber` | Yes | Get license info |
| `GET` | `/poa/:poaNumber` | Yes | Get power of attorney |
| `POST` | `/poa` | Yes | Verify POA |
| `GET` | `/poa/list/:idNumber` | Yes | List POAs for ID |
| `GET` | `/status` | Yes | Service status |

---

## AUTHENTICATION HEADERS

### Bearer Token
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Key
```http
X-API-Key: traf3li_live_abc123...
```

### CSRF Token (for cookie-based auth)
```http
X-CSRF-Token: csrf_token_value
```

---

## ERROR RESPONSES

All endpoints return consistent error format:

```json
{
  "error": true,
  "message": "Error message in English",
  "messageAr": "رسالة الخطأ بالعربية",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `MFA_REQUIRED` | 200 | MFA verification needed |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `RATE_LIMITED` | 429 | Too many requests |
| `CAPTCHA_REQUIRED` | 400 | CAPTCHA verification needed |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `ACCOUNT_LOCKED` | 423 | Account temporarily locked |
| `SESSION_EXPIRED` | 401 | Session has expired |

---

## RATE LIMITING

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Login/Register | 5 requests | 15 minutes |
| OTP Send | 3 requests | 5 minutes |
| Password Reset | 3 requests | 1 hour |
| General Auth | 100 requests | 15 minutes |
| API (Authenticated) | Based on plan | 1 minute |

Rate limit headers returned:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703577600
```

---

## SECURITY BEST PRACTICES

1. **Always use HTTPS** in production
2. **Store tokens securely** - use httpOnly cookies or secure storage
3. **Implement token refresh** before expiry
4. **Handle MFA flow** properly
5. **Implement CAPTCHA** on sensitive forms
6. **Use CSRF tokens** for state-changing operations
7. **Log out properly** - call `/logout` to invalidate tokens

---

## QUICK REFERENCE

### Most Common Endpoints

```javascript
// Login
POST /api/auth/login

// Get current user
GET /api/auth/me

// Logout
POST /api/auth/logout

// Refresh token
POST /api/auth/refresh

// Get SSO providers (NOT /api/v1/auth/sso/enabled-providers!)
GET /api/auth/sso/providers

// MFA verify
POST /api/auth/mfa/verify
```
