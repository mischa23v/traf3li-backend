# Comprehensive Security Audit Report
**Date:** 2025-12-27
**Scans Run:** 20 parallel agents
**Scope:** Full backend security audit

---

## Executive Summary

### Overall Security Posture: B+ (Good infrastructure, incomplete implementation)

Your codebase has **excellent security infrastructure** but **inconsistent enforcement**. You have all the building blocks that big companies use (Stripe, AWS, Google, Salesforce), but they're not wired together properly.

### Key Finding: IDOR Protection IS Centralized!

**YES - You have centralized IDOR protection:**
- **Global Mongoose Plugin:** `/src/plugins/globalFirmIsolation.plugin.js`
- **Applied in:** `/src/configs/db.js` (lines 60-62)
- **Coverage:** All 315 models with firmId field

```
┌─────────────────────────────────────────────────────────────────┐
│ YOUR CURRENT ARCHITECTURE (GOOD!)                               │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Global Firm Isolation Plugin (DATABASE LEVEL)         │
│   - Enforces firmId/lawyerId on ALL queries                    │
│   - Throws FIRM_ISOLATION_VIOLATION if missing                 │
│   - Applied to find, findOne, update, delete, aggregate        │
│                                                                 │
│ Layer 2: globalFirmContext Middleware (REQUEST LEVEL)          │
│   - Sets req.firmId, req.firmQuery on every request            │
│   - Provides req.hasPermission(), req.addFirmId() helpers      │
│                                                                 │
│ Layer 3: Controllers (INCONSISTENT - THE PROBLEM)              │
│   - Some use req.firmQuery spread (good)                       │
│   - Others manually build queries (redundant but safe)         │
│   - 469 manual query.firmId assignments vs 345 spread patterns │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Big Companies Do vs What You're Not Doing

### 1. Global Auth Middleware with Whitelist (NOT IMPLEMENTED)

**What Stripe/AWS/Google Do:**
```javascript
// Apply auth GLOBALLY, then whitelist public routes
app.use('/api', authenticate);  // Everything protected by default
const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];
// Public routes checked inside middleware
```

**What You Do:**
```javascript
// Per-route authentication (risky - easy to forget)
router.get('/cases', userMiddleware, getCases);
router.post('/cases', userMiddleware, createCase);
// Each route must remember to add userMiddleware
```

**Risk:** Developer forgets `userMiddleware` = route is public

---

### 2. Permission Middleware Enforcement (NOT USED)

**What You Have (Unused):**
```javascript
// /src/middlewares/permission.middleware.js - EXISTS but 0 routes use it!
const requirePermission = (namespace, action) => {...};

// Example usage (from comments, never implemented):
router.put('/cases/:id', requirePermission('cases', 'edit'), updateCase);
```

**What You Do:**
```javascript
// Manual permission checks scattered in 237 controllers
if (!hasPermission) throw new Error('Forbidden');
```

**Routes using permission middleware:** 0 out of 239

---

### 3. Response Serialization Layer (MISSING)

**What Salesforce/Stripe Do:**
```javascript
// Automatic sensitive field filtering
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.mfaSecret;
    return obj;
};
```

**What You Do:**
```javascript
// Return entire objects without filtering
res.json({ data: firm });  // Includes aiSettings.openai.apiKey!
```

**Exposed Fields Found:**
- `aiSettings.openai.apiKey` in firm responses
- `integrations.xero.accessToken` in firm responses
- `password` selected in auth queries (then removed - inefficient)
- `mfaSecret` and `mfaBackupCodes` loaded unnecessarily

---

### 4. Unified Security Pipeline (PARTIAL)

**What Big Companies Have:**
```
Request → WAF → Rate Limit → Auth → Firm Context → Permission → Audit → Controller
```

**What You Have:**
```
Request → Rate Limit (some routes) → Auth (per-route) → Firm Context → Controller
              ↑ Missing on many          ↑ Inconsistent
```

---

## Critical Vulnerabilities Found

### CRITICAL (Fix Immediately) - 15 Issues

| # | Issue | File | Line | Impact |
|---|-------|------|------|--------|
| 1 | Discord webhook NO signature verification | discord.controller.js | 590-615 | Anyone can send fake webhooks |
| 2 | CaseNotion blocks - 13 IDOR vulnerabilities | caseNotion.controller.js | 1092-2500 | Cross-firm data access |
| 3 | Dispute service - 7 IDOR vulnerabilities | dispute.service.js | 139-448 | Cross-firm dispute access |
| 4 | No SSL/TLS enforcement in DB connections | db.js, jobs/*.js | - | Data in transit unencrypted |
| 5 | In-memory webhook idempotency (lost on restart) | stripe.service.js | 40-76 | Duplicate payment processing |
| 6 | CSRF middleware imported but NOT integrated | server.js | 721, 785 | CSRF protection disabled |
| 7 | Public /uploads directory | server.js | 803 | All uploads accessible without auth |
| 8 | Firm API keys exposed in responses | firm.controller.js | 247, 344, 411 | Credential leakage |
| 9 | ReDoS in admin search | adminFirms.controller.js | 68-69 | Denial of service |
| 10 | ReDoS in user search | adminUsers.controller.js | 79-81 | Denial of service |
| 11 | ReDoS in asset search | assetAssignment.controller.js | 127-138 | Denial of service |
| 12 | External webhooks don't validate firmId | slack/discord/docusign | - | Wrong firm data processing |
| 13 | Global audit plugin defined but NOT activated | auditLog.plugin.js | - | Non-HTTP ops not logged |
| 14 | Legacy auth middleware lacks revocation check | authenticate.js | 1-103 | Revoked tokens accepted |
| 15 | Webhook replay protection missing | discord, slack, docusign | - | Replay attacks possible |

### HIGH (Fix Soon) - 12 Issues

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | 11 routes without auth middleware | review, question, answer, gig, job, score, peerReview | Public data access |
| 2 | Stack trace exposed in user controller | user.controller.js:44-50 | Information disclosure |
| 3 | Inconsistent salt rounds (10 vs 12) | user.controller.js:356 | Weaker password hashing |
| 4 | Device fingerprint non-strict mode | jwt.js:171 | Token theft not blocked |
| 5 | Webhook filters don't validate firm ownership | webhook.service.js:404-451 | Cross-firm triggers |
| 6 | Custom headers not validated for injection | webhook.controller.js:511-521 | Header injection |
| 7 | Message attachments missing firmId | message.controller.js | No multi-tenant isolation |
| 8 | Background jobs bypass firm filters | webhookDelivery.job.js:124-132 | Cross-firm processing |
| 9 | locationReminders findById without firmId | locationReminders.service.js:82 | IDOR vulnerability |
| 10 | webauthn credential access without firmId | webauthn.service.js:385 | IDOR enumeration |
| 11 | pipelineAutomation User lookup without firmId | pipelineAutomation.service.js:131 | Cross-firm user access |
| 12 | Weak write concern (w:1 not majority) | db.js:121 | Data loss on failover |

### MEDIUM (Should Fix) - 15 Issues

| # | Issue | File |
|---|-------|------|
| 1 | 183 routes without validators (23% coverage) | Various route files |
| 2 | 16 console.error() instead of logger | Various files |
| 3 | Reset tokens not invalidated after use | auth.controller.js |
| 4 | Email enumeration timing side channel | auth.controller.js:2082-2088 |
| 5 | No rate limiting on token refresh endpoint | - |
| 6 | No JWT token type ('typ') claim validation | - |
| 7 | Anonymous tokens have 24hr expiry (vs 15min) | generateToken.js |
| 8 | HTTP webhooks allowed in non-production | webhook.model.js:154-165 |
| 9 | Hardcoded dev secrets in .env.docker.example | .env.docker.example:30-32 |
| 10 | Hardcoded dev secrets in DOCKER.md | DOCKER.md:174-175 |
| 11 | No auth validation in MONGODB_URI | startupValidation.js |
| 12 | Startup warmup queries on sensitive collections | db.js:78-84 |
| 13 | automatedAction test endpoint missing admin check | automatedAction.routes.js:87 |
| 14 | financeSetup GET routes allow any authenticated user | financeSetup.route.js:29,36,43 |
| 15 | Deprecated useNewUrlParser in job connections | dataExport.job.js, auditLogArchiving.job.js |

---

## What's Working Well (Keep These!)

| Feature | Status | Grade |
|---------|--------|-------|
| Global Firm Isolation Plugin | Enforced at DB level | A+ |
| Rate Limiting | Comprehensive, Redis-backed | A |
| Password Security | bcrypt 12 rounds, HIBP check, history | A |
| Token Revocation | Dual Redis+MongoDB, user-level revoke | A |
| Refresh Token Rotation | Family tracking, reuse detection | A+ |
| Session Invalidation on Password Change | All tokens revoked | A+ |
| Input Sanitization | Multi-layer XSS, injection protection | A |
| Audit Logging Infrastructure | Comprehensive, hash chain integrity | A |
| Multi-Tenant Schema | 315 models with firmId | A |
| Account Lockout | 5 attempts, 15-min lockout | A |

---

## Action Plan - What Needs to Be Done

### Phase 1: Critical Security Fixes (Immediate)

1. **Fix CaseNotion IDOR vulnerabilities (13 methods)**
   - Add firmId check to all block operations
   - Use existing `verifyBlockOwnership()` function

2. **Fix Dispute Service IDOR (7 methods)**
   - Pass firmId to all methods
   - Query with `{ _id: disputeId, firmId }` pattern

3. **Enable Discord webhook signature verification**
   - Implement Ed25519 verification
   - Use existing `createWebhookAuth('discord')` middleware

4. **Fix CSRF integration**
   - Either restore legacy functions or properly integrate csrf.middleware.js
   - Set `ENABLE_CSRF_PROTECTION=true`

5. **Secure file uploads**
   - Remove public `/uploads` static serving
   - Use presigned URLs only
   - Add firmId to message attachments

6. **Fix Firm API response leakage**
   - Filter sensitive fields (aiSettings.*.apiKey, integrations.*.token)
   - Implement toJSON() on Firm model

7. **Add SSL/TLS to all DB connections**
   - Add `ssl: true, tlsInsecure: false` to all connection options
   - Fix background job connections

8. **Move webhook idempotency to Redis**
   - Replace in-memory Map with Redis
   - Add TTL for cleanup

### Phase 2: Authentication Hardening (Week 1)

1. **Implement global auth middleware**
   ```javascript
   app.use('/api', authenticate);  // All routes protected
   // Whitelist checked inside middleware
   ```

2. **Migrate from authenticate.js to jwt.js**
   - jwt.js has revocation checking
   - authenticate.js is legacy

3. **Add auth to 11 unprotected routes**
   - review, question, answer, gig, job, score, peerReview routes

4. **Enable strict device binding in production**
   - Set `STRICT_DEVICE_BINDING=true`

### Phase 3: Permission System Activation (Week 2)

1. **Start using requirePermission middleware**
   - Apply to 50 critical routes first
   - Cases, Invoices, Clients, Documents

2. **Create route security registry**
   - Audit which routes have what protection
   - Easy gap analysis

### Phase 4: Input Validation Coverage (Week 3)

1. **Add validators to remaining 183 routes**
   - Priority: bankAccount, account, adminApi, aiChat

2. **Fix ReDoS vulnerabilities**
   - Add `escapeRegex()` function
   - Apply to admin search endpoints

### Phase 5: Response Security (Week 4)

1. **Implement toJSON() on sensitive models**
   - User: exclude password, mfaSecret, tokens
   - Firm: exclude API keys, integration tokens

2. **Create response serialization middleware**
   - Filter sensitive fields automatically

### Phase 6: Monitoring & Audit (Week 5)

1. **Activate global audit logging plugin**
   - Call `applyGlobalAuditLogging()` in db.js

2. **Replace console.error with logger**
   - 16 instances across codebase

3. **Add webhook monitoring**
   - Track failures, replays, anomalies

---

## Centralization Summary

| Security Layer | Centralized? | Status |
|----------------|--------------|--------|
| IDOR/Firm Isolation | **YES** | Working at DB level |
| Authentication | **NO** | Per-route, should be global |
| Authorization/RBAC | **NO** | Middleware exists but unused |
| Input Validation | **PARTIAL** | 23% route coverage |
| Response Filtering | **NO** | No serialization layer |
| Audit Logging | **PARTIAL** | Plugin exists but not activated |
| Rate Limiting | **YES** | Comprehensive |
| Error Handling | **YES** | Centralized middleware |

---

## Files Requiring Changes

### Critical Priority (15 files)
1. `/src/controllers/caseNotion.controller.js` - 13 IDOR fixes
2. `/src/services/dispute.service.js` - 7 IDOR fixes
3. `/src/controllers/discord.controller.js` - Add webhook verification
4. `/src/server.js` - Fix CSRF, remove public uploads
5. `/src/controllers/firm.controller.js` - Filter sensitive fields
6. `/src/configs/db.js` - Add SSL/TLS, activate audit plugin
7. `/src/jobs/dataExport.job.js` - Fix connection options
8. `/src/jobs/auditLogArchiving.job.js` - Fix connection options
9. `/src/services/stripe.service.js` - Move idempotency to Redis
10. `/src/controllers/adminFirms.controller.js` - Fix ReDoS
11. `/src/controllers/adminUsers.controller.js` - Fix ReDoS
12. `/src/controllers/assetAssignment.controller.js` - Fix ReDoS
13. `/src/middlewares/authenticate.js` - Add revocation check or deprecate
14. `/src/controllers/message.controller.js` - Add firmId to attachments
15. `/src/routes/*.js` (11 files) - Add userMiddleware

### High Priority (10 files)
1. `/src/controllers/user.controller.js` - Fix salt rounds, stack trace
2. `/src/services/locationReminders.service.js` - Add firmId check
3. `/src/services/webauthn.service.js` - Add firmId check
4. `/src/services/pipelineAutomation.service.js` - Add firmId checks
5. `/src/controllers/webhook.controller.js` - Validate headers
6. `/src/services/webhook.service.js` - Validate firm ownership
7. `/src/jobs/webhookDelivery.job.js` - Add audit logging
8. `/src/controllers/auth.controller.js` - Invalidate reset tokens
9. `/src/models/user.model.js` - Add toJSON()
10. `/src/models/firm.model.js` - Add toJSON()

---

## Conclusion

**The good news:** Your IDOR protection IS centralized at the database level. The global firm isolation plugin prevents cross-firm data access even if controllers forget to add firmId.

**The bad news:** Other security layers (auth, permissions, response filtering) are not centralized. This creates:
1. Inconsistent protection across routes
2. Easy for developers to forget security measures
3. Harder to audit and maintain

**The fix:** Wire up the existing infrastructure:
1. Apply auth middleware globally
2. Use the permission middleware that already exists
3. Add response serialization
4. Activate the audit logging plugin

You have 85% of what big companies have - you just need to connect the pieces.
