# Gold Standard Email Verification System - Requirements

## Overview

This specification addresses **CRITICAL** issues in the email verification system that currently prevent users from verifying their email if the initial verification email fails to send. The system has a **circular dependency** where users cannot request a new verification email because all resend endpoints require authentication, but authentication is blocked until email is verified.

**Current Score: 35/100 (Grade: F)**
**Target Score: 95/100 (Grade: A)**

---

## Scale Assessment

| Scale | **Complex** |
|-------|-------------|
| Files Affected | 10+ files |
| Estimated Effort | 1-2 days |
| Risk Level | HIGH (authentication flow changes) |

---

## 🧠 Reasoning (Thinking Out Loud)

### What I Searched
- Searched `src/services/emailVerification.service.js` → Uses `EmailService.sendEmail()` which defaults to queue
- Searched `src/services/notificationDelivery.service.js` → Has `sendEmailOTP()` that bypasses queue (WORKS)
- Searched `src/routes/auth.route.js` → Found `/resend-verification` REQUIRES `authenticate` middleware
- Searched `src/models/emailVerification.model.js` → Token stored in PLAINTEXT (security risk)
- Searched `src/configs/queue.js` → Queue returns mock if `DISABLE_QUEUES=true` or no Redis

### Root Cause Analysis

| Issue | Evidence | Impact |
|-------|----------|--------|
| Verification emails not sent | Uses `EmailService.sendEmail()` with `useQueue=true` (default) | **CRITICAL** - Users never receive email |
| Queue silently fails | `configs/queue.js:188-189` returns mock job, logs warning only | **CRITICAL** - No error thrown |
| Circular dependency | `/resend-verification` requires `authenticate` middleware | **CRITICAL** - Users permanently stuck |
| Tokens not hashed | `emailVerification.model.js:59` stores raw token | **HIGH** - Database leak exposes tokens |
| No brute-force protection | `verifyToken()` has no attempt tracking | **HIGH** - Token can be brute-forced |
| No IP logging | No IP/device info captured | **MEDIUM** - No audit trail |

### Decisions Made

| Decision | Why | Alternatives Considered |
|----------|-----|------------------------|
| Send verification emails DIRECTLY (bypass queue) | OTP emails work because they bypass queue | Fix queue (rejected: adds complexity) |
| Add PUBLIC `/auth/request-verification-email` endpoint | Breaks circular dependency | Allow login with banner (rejected: requires frontend changes + less secure for legal SaaS) |
| Hash tokens with SHA-256 before storage | Standard security practice (Google/Microsoft pattern) | Encrypt tokens (rejected: overkill, hash is sufficient) |
| Rate limit by IP + email combination | Prevents abuse while allowing legitimate retries | IP only (rejected: shared IPs would block legitimate users) |
| Auto-resend on login block (403) | Reduces friction, ensures email is sent | Require manual resend (rejected: bad UX) |

### What Could Break

| File | Risk | Likelihood | Mitigation |
|------|------|------------|------------|
| `auth.controller.js` | Login flow changes | Medium | Extensive testing, feature flag |
| `emailVerification.service.js` | Email sending changes | Low | Direct send is simpler than queue |
| `emailVerification.model.js` | Token storage format change | Medium | Migration for existing tokens |
| `auth.route.js` | New public endpoint | Low | Proper rate limiting |

---

## 🏆 Gold Standard Compliance

### Applicable Patterns

| Category | Pattern | How It Applies |
|----------|---------|----------------|
| Security | Token hashing | Hash verification tokens with SHA-256 before storage |
| Security | Timing-safe comparison | Use `crypto.timingSafeEqual()` for token verification |
| Security | User enumeration prevention | Same response regardless of email existence |
| Security | Brute-force protection | Rate limit verification attempts by IP |
| Security | IP logging | Log IP/device for all verification events |
| Reliability | Direct email send | Bypass queue for critical auth emails |
| Reliability | Auto-retry on failure | Auto-resend if initial email fails |
| Reliability | Non-blocking logging | Use QueueService for audit logs |

### Enterprise Patterns Applied

| Company | Pattern | Implementation |
|---------|---------|----------------|
| **Google** | Token expiry 24h, 5 resends/hour | Already implemented |
| **Microsoft** | Hash tokens before storage | To be implemented |
| **AWS** | Timing-safe comparison | To be implemented |
| **Auth0** | Rate limit by IP+email | To be implemented |
| **Okta** | Auto-resend on blocked login | To be implemented |

### Not Applicable (with justification)

| Pattern | Why N/A |
|---------|---------|
| Multi-tenant isolation | Email verification is user-scoped, not firm-scoped |
| OAuth state signing | No OAuth in email verification flow |
| Calendar sync | No calendar functionality |

---

## User Stories

### 1. Fix Verification Email Sending (CRITICAL)

As a new user, I want to receive a verification email when I register so that I can verify my account.

**Acceptance Criteria:**
1. WHEN user registers THE SYSTEM SHALL send verification email DIRECTLY via Resend API (bypass queue)
2. WHEN email sending fails THE SYSTEM SHALL log error and NOT fail registration
3. WHEN email is sent THE SYSTEM SHALL log success with message ID
4. WHEN queue is disabled THE SYSTEM SHALL still send verification emails

**Gold Standard Requirements:**
- THE SYSTEM SHALL use `NotificationDeliveryService.sendVerificationEmail()` (direct Resend call)
- THE SYSTEM SHALL NOT use `EmailService.sendEmail()` with default queue
- THE SYSTEM SHALL log email send attempts via QueueService (non-blocking)

---

### 2. Public Resend Verification Endpoint (CRITICAL)

As a user who didn't receive verification email, I want to request a new verification email WITHOUT logging in so that I can verify my account.

**Acceptance Criteria:**
1. WHEN POST `/auth/request-verification-email` is called THE SYSTEM SHALL NOT require authentication
2. WHEN email exists and is unverified THE SYSTEM SHALL send new verification email
3. WHEN email doesn't exist THE SYSTEM SHALL return SAME success response (prevent enumeration)
4. WHEN user is already verified THE SYSTEM SHALL return SAME success response (prevent enumeration)
5. WHEN rate limit exceeded THE SYSTEM SHALL return 429 with wait time
6. WHEN request made THE SYSTEM SHALL add timing-safe delay (150-400ms random)

**Gold Standard Requirements:**
- THE SYSTEM SHALL rate limit to 3 requests per email per hour
- THE SYSTEM SHALL rate limit to 10 requests per IP per hour
- THE SYSTEM SHALL use `crypto.randomInt()` for timing delay
- THE SYSTEM SHALL log attempt with IP address (non-blocking)
- THE SYSTEM SHALL return identical response shape for all cases

---

### 3. Hash Tokens Before Storage (HIGH)

As a security-conscious platform, I want verification tokens hashed before storage so that a database leak doesn't expose valid tokens.

**Acceptance Criteria:**
1. WHEN token is created THE SYSTEM SHALL store SHA-256 hash, NOT plaintext
2. WHEN token is verified THE SYSTEM SHALL hash input and compare to stored hash
3. WHEN comparing tokens THE SYSTEM SHALL use timing-safe comparison
4. WHEN migrating THE SYSTEM SHALL handle both old (plaintext) and new (hashed) formats

**Gold Standard Requirements:**
- THE SYSTEM SHALL use `crypto.createHash('sha256').update(token).digest('hex')`
- THE SYSTEM SHALL use `crypto.timingSafeEqual()` for comparison
- THE SYSTEM SHALL store `tokenHash` field, NOT `token` field (new tokens)

---

### 4. Brute-Force Protection on Verify Endpoint (HIGH)

As a security-conscious platform, I want to prevent attackers from brute-forcing verification tokens.

**Acceptance Criteria:**
1. WHEN verification attempt is made THE SYSTEM SHALL track by IP + token prefix
2. WHEN 10 failed attempts per IP per hour THE SYSTEM SHALL block further attempts
3. WHEN 5 failed attempts per token THE SYSTEM SHALL invalidate token
4. WHEN blocked THE SYSTEM SHALL return 429 with wait time
5. WHEN successful THE SYSTEM SHALL clear attempt counter for that IP+token

**Gold Standard Requirements:**
- THE SYSTEM SHALL use Redis for attempt tracking (with TTL auto-cleanup)
- THE SYSTEM SHALL log blocked attempts for security monitoring
- THE SYSTEM SHALL NOT reveal whether token exists (timing-safe)

---

### 5. Auto-Resend on Login Block (MEDIUM)

As a user with unverified email, I want a new verification email automatically sent when I'm blocked at login so that I can verify without extra steps.

**Acceptance Criteria:**
1. WHEN login returns 403 EMAIL_NOT_VERIFIED THE SYSTEM SHALL auto-send verification email
2. WHEN auto-send is triggered THE SYSTEM SHALL respect rate limits
3. WHEN auto-send succeeds THE SYSTEM SHALL include `verificationResent: true` in response
4. WHEN auto-send fails (rate limited) THE SYSTEM SHALL include `verificationResent: false`
5. WHEN responding THE SYSTEM SHALL include masked email (e.g., `m***@gmail.com`)

**Gold Standard Requirements:**
- THE SYSTEM SHALL NOT block on email send (fire-and-forget)
- THE SYSTEM SHALL log auto-resend attempts (non-blocking)

---

### 6. IP/Device Logging for Security Audit (MEDIUM)

As a security team, I want all verification events logged with IP and device info so that I can investigate suspicious activity.

**Acceptance Criteria:**
1. WHEN verification email is sent THE SYSTEM SHALL log IP, user-agent, timestamp
2. WHEN verification is attempted THE SYSTEM SHALL log IP, user-agent, success/failure
3. WHEN verification succeeds THE SYSTEM SHALL log IP, user-agent, token age
4. WHEN suspicious pattern detected THE SYSTEM SHALL flag for review

**Gold Standard Requirements:**
- THE SYSTEM SHALL use `QueueService.logAudit()` (non-blocking)
- THE SYSTEM SHALL NOT await audit logging (fire-and-forget)
- THE SYSTEM SHALL capture: IP, user-agent, geo (if available), timestamp

---

## API Requirements

### Endpoints

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| POST | `/auth/request-verification-email` | **NEW** Public resend | None | 3/email/hour, 10/IP/hour |
| POST | `/auth/verify-email` | Verify token | None | 10/IP/hour |
| POST | `/auth/resend-verification` | Authenticated resend | JWT | 5/user/hour |
| POST | `/auth/register` | Registration (auto-send) | None | Existing |
| POST | `/auth/login` | Login (auto-resend on block) | None | Existing |

### Request/Response Contracts

#### POST `/auth/request-verification-email` (NEW - PUBLIC)

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 - ALWAYS same shape):**
```json
{
  "success": true,
  "message": "If this email exists and needs verification, we've sent a link.",
  "messageAr": "إذا كان هذا البريد موجوداً ويحتاج تفعيل، تم إرسال الرابط."
}
```

**Response (429 - Rate Limited):**
```json
{
  "success": false,
  "code": "RATE_LIMITED",
  "message": "Too many requests. Please wait before trying again.",
  "messageAr": "طلبات كثيرة. يرجى الانتظار قبل المحاولة مرة أخرى.",
  "waitTime": 120
}
```

#### POST `/auth/verify-email`

**Request:**
```json
{
  "token": "abc123..."
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "messageAr": "تم تفعيل البريد الإلكتروني بنجاح",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "isEmailVerified": true,
    "emailVerifiedAt": "2026-01-10T..."
  }
}
```

**Response (400 - Invalid/Expired):**
```json
{
  "success": false,
  "code": "TOKEN_INVALID_OR_EXPIRED",
  "message": "Verification link is invalid or expired",
  "messageAr": "رابط التفعيل غير صالح أو منتهي الصلاحية"
}
```

**Response (429 - Brute Force Blocked):**
```json
{
  "success": false,
  "code": "TOO_MANY_ATTEMPTS",
  "message": "Too many verification attempts. Please request a new link.",
  "messageAr": "محاولات تحقق كثيرة. يرجى طلب رابط جديد.",
  "waitTime": 3600
}
```

#### POST `/auth/login` (MODIFIED - 403 Response)

**Response (403 - Email Not Verified):**
```json
{
  "error": true,
  "code": "EMAIL_NOT_VERIFIED",
  "message": "يرجى تفعيل بريدك الإلكتروني للمتابعة",
  "messageEn": "Please verify your email to continue",
  "email": "m***@gmail.com",
  "verificationResent": true
}
```

---

## Data Model Changes

### EmailVerification Model (MODIFIED)

```javascript
const emailVerificationSchema = new mongoose.Schema({
    // CHANGE: Store hash instead of plaintext token
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // KEEP for backwards compatibility during migration
    token: {
        type: String,
        index: true,
        sparse: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    usedAt: Date,
    sentCount: {
        type: Number,
        default: 1
    },
    lastSentAt: {
        type: Date,
        default: Date.now
    },
    // NEW: Security tracking
    createdFromIP: String,
    createdUserAgent: String,
    verifiedFromIP: String,
    verifiedUserAgent: String,
    // NEW: Brute force protection
    failedAttempts: {
        type: Number,
        default: 0
    },
    lastFailedAttempt: Date
}, {
    timestamps: true
});
```

### Rate Limiting (Redis Keys)

```
email_verification_resend:{email}:{hour} → count (TTL: 1 hour)
email_verification_resend_ip:{ip}:{hour} → count (TTL: 1 hour)
email_verification_attempts:{ip}:{hour} → count (TTL: 1 hour)
email_verification_attempts:{tokenPrefix} → count (TTL: 1 hour)
```

---

## Non-Functional Requirements

### Security (Gold Standard)

- WHEN storing tokens THE SYSTEM SHALL hash with SHA-256 before storage
- WHEN comparing tokens THE SYSTEM SHALL use `crypto.timingSafeEqual()`
- WHEN email doesn't exist THE SYSTEM SHALL return same response as success (enumeration prevention)
- WHEN responding THE SYSTEM SHALL add random delay 150-400ms (timing attack prevention)
- WHEN IP exceeds rate limit THE SYSTEM SHALL return 429 (brute force protection)
- WHEN token has 5 failed attempts THE SYSTEM SHALL invalidate token
- THE SYSTEM SHALL log all verification events with IP address

### Reliability (Gold Standard)

- WHEN sending verification email THE SYSTEM SHALL bypass queue (direct Resend API)
- WHEN email fails to send THE SYSTEM SHALL NOT fail registration
- WHEN logging audit events THE SYSTEM SHALL use QueueService (non-blocking)
- THE SYSTEM SHALL NOT await audit logging operations
- WHEN Redis unavailable THE SYSTEM SHALL fallback to in-memory rate limiting

### Performance

- THE SYSTEM SHALL respond to verification requests within 500ms (p95)
- THE SYSTEM SHALL NOT block on email sending operations
- THE SYSTEM SHALL use Redis for rate limiting (sub-millisecond lookups)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/emailVerification.service.js` | Use direct email send, add IP logging |
| `src/services/notificationDelivery.service.js` | Add `sendVerificationEmail()` method |
| `src/models/emailVerification.model.js` | Add `tokenHash`, security fields, brute-force tracking |
| `src/controllers/auth.controller.js` | Add public resend endpoint, auto-resend on login block |
| `src/routes/auth.route.js` | Add `/request-verification-email` route (public) |
| `src/middlewares/rateLimiter.middleware.js` | Add verification-specific rate limiters |
| `src/utils/securityUtils.js` | Add `hashToken()`, `verifyTokenHash()` functions |

---

## Migration Plan

### Phase 1: Immediate Fix (Day 1)
1. Fix email sending (bypass queue)
2. Add public resend endpoint
3. Auto-resend on login block

### Phase 2: Security Hardening (Day 1-2)
4. Hash new tokens before storage
5. Add brute-force protection
6. Add IP logging

### Phase 3: Cleanup (Day 2)
7. Migration script for existing plaintext tokens
8. Remove backwards compatibility after 30 days

---

## Out of Scope

- **Reminder emails** (3-day, 7-day reminders for unverified users) - Phase 2
- **Admin dashboard** for verification status - Phase 2
- **Allow login with banner approach** - Future consideration
- **CAPTCHA on public resend** - Not needed with proper rate limiting

---

## Open Questions

1. ~~Should we allow login with unverified email (banner approach)?~~ **Decision: Keep blocking, add public resend**
2. ~~How long to maintain backwards compatibility for plaintext tokens?~~ **Decision: 30 days**
3. Should we send reminder emails? **Deferred to Phase 2**

---

## Verification Plan

After implementation, verify:

- [ ] `node --check` passes on all modified files
- [ ] New user registration sends verification email (check logs)
- [ ] Queue disabled (`DISABLE_QUEUES=true`) still sends verification email
- [ ] Public resend endpoint works without authentication
- [ ] Same response returned for existing/non-existing emails
- [ ] Rate limiting works (3/email/hour, 10/IP/hour)
- [ ] Login block (403) auto-resends verification email
- [ ] Tokens are hashed before storage (check DB)
- [ ] Brute-force protection blocks after 10 attempts
- [ ] IP address logged for all verification events
- [ ] No timing differences reveal email existence
- [ ] **Manual test: Full flow from registration to verification**

---

## Approval Checkpoint

**Gold Standard Patterns Applied:**
- Token hashing (Microsoft/Google pattern)
- Timing-safe comparison (AWS pattern)
- User enumeration prevention (OWASP pattern)
- Brute-force protection (Auth0/Okta pattern)
- Auto-resend on block (Modern SaaS pattern)
- IP audit logging (Enterprise security pattern)
- Non-blocking logging (Netflix pattern)

**Do these requirements meet your needs?**

Once approved, proceed to `/implementation` to create the design document.
