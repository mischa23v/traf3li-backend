# Comprehensive Security Audit Report

**Date:** 2025-12-27
**Auditor:** Claude Security Audit
**Scope:** Full backend + SDK security analysis

---

## EXECUTIVE SUMMARY

### Overall Assessment: GOOD FOUNDATION, NEEDS CENTRALIZATION

Your codebase has **strong security fundamentals** but security enforcement is **scattered across 800+ files** instead of being centralized. This is exactly what you suspected - you've been adding firmId checks to every line of code when big companies use **centralized enforcement**.

### Key Statistics
| Metric | Value |
|--------|-------|
| Total Models | 333 |
| Models with firmId | 316 (95%) |
| Models without firmId (correctly) | 17 |
| Controllers | 237 |
| Services | 116+ |
| Routes | 2,500+ |
| Security batches completed | 17 |

---

## PART 1: IS IDOR PROTECTION CENTRALIZED?

### Answer: YES, BUT NOT FULLY ENFORCED

You have **two centralized protection layers** that SHOULD protect everything:

### Layer 1: Global Firm Isolation Plugin
**File:** `src/plugins/globalFirmIsolation.plugin.js`
- Applied to ALL models globally via `mongoose.plugin()`
- **ENFORCES** that every query MUST include `firmId` or `lawyerId`
- Throws `FIRM_ISOLATION_VIOLATION` error if missing
- Protects: find, findOne, update, delete, aggregate

### Layer 2: Global Firm Context Middleware
**File:** `src/middlewares/globalFirmContext.middleware.js`
- Applied to ALL `/api` routes
- Sets `req.firmId`, `req.firmQuery`, `req.permissions` automatically
- Provides `req.hasPermission()`, `req.enforce()` helpers

### THE PROBLEM: Inconsistent Usage
Despite centralized infrastructure:
- **87% of controllers** don't use `req.firmQuery`
- **300+ service methods** use `findById()` without firmId
- Controllers manually check firmId instead of trusting middleware
- Permission checks scattered in controllers, not middleware

---

## PART 2: WHAT BIG COMPANIES DO DIFFERENTLY

### Industry Standard Architecture (Stripe, AWS, Google, Salesforce)

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: API Gateway (centralized auth + tenant validation)    │
│ Layer 2: Middleware Stack (auth → firm → permission → IDOR)    │
│ Layer 3: Query Layer (automatic firmId injection)              │
│ Layer 4: Database RLS (PostgreSQL row-level security)          │
│ Layer 5: Audit Logging (every action logged automatically)     │
└─────────────────────────────────────────────────────────────────┘
```

### What They Do That You Don't:

| Company | What They Do | Your Gap |
|---------|--------------|----------|
| **Stripe** | Automatic tenant_id on every query | Your queries require manual `req.firmQuery` |
| **Stripe** | Required idempotency keys on mutations | Your idempotency is optional |
| **Stripe** | ID prefixes (cus_, inv_, pay_) | Your IDs are plain ObjectIds |
| **AWS** | Centralized policy engine | Your permissions checked in controllers |
| **AWS** | Explicit deny always wins | Your denyOverride is configurable |
| **Salesforce** | Database-level RLS | Your RLS is application-level (bypassable) |
| **Salesforce** | Field-level security | You only have UI visibility (not data filtering) |
| **Google** | Unified middleware pipeline | Your security checks are scattered |

---

## PART 3: ALL VULNERABILITIES FOUND

### CRITICAL (Fix Immediately)

#### 1. Service Layer IDOR - 300+ Vulnerable Methods
**Files:** All service files in `src/services/`
```
Pattern: Model.findById(id) without firmId check
```
- `caseNotion.service.js` - 47 vulnerable queries
- `emailMarketing.service.js` - 20 vulnerable queries
- `approval.service.js` - 28 vulnerable queries
- `activity.service.js` - 12 vulnerable queries
- `sloMonitoring.service.js` - 5 vulnerable queries
- `adminTools.service.js` - 15 vulnerable queries
- `threadMessage.service.js` - 2 vulnerable queries
- `quickbooks.service.js` - 20+ vulnerable queries
- ... and 40+ more service files

#### 2. Race Conditions in Financial Operations
**Files:** `payment.controller.js`, `invoice.controller.js`, `retainer.model.js`
- No MongoDB transactions for payment recording
- Concurrent payments can corrupt invoice balance
- Refunds can exceed original amount
- TOCTOU vulnerabilities in status checks

#### 3. Hardcoded Secrets
**Files:** Multiple
- `aiSettings.service.js:14` - Default encryption key
- `otp.utils.js:34` - Default OTP salt
- `phoneOtp.model.js:92` - Default OTP salt
- `emailOtp.model.js:92` - Default OTP salt
- VAPID keys exposed in documentation

#### 4. Public File Storage Without Auth
**File:** `server.js:803-824`
- `/uploads` directory served publicly
- No authentication on uploaded files
- Files cached by CDNs with public headers

### HIGH Priority

#### 5. Missing Permission Middleware - 96% of Routes
- Only 10 out of 239 route files use permission middleware
- Route security registry exists but NOT enforced
- Controllers manually check permissions (inconsistently)

#### 6. NoSQL Injection Vulnerabilities
- `adminAudit.controller.js:114` - Unvalidated sort field
- `corporateCard.controller.js:219` - Regex injection
- `brokers.controller.js:126,450` - Unescaped regex
- `tradingAccounts.controller.js:126,461` - Unescaped regex

#### 7. XSS Vulnerabilities
- `gmail.service.js:837` - Unsanitized HTML from emails
- Content-Disposition header injection in 6 files
- SDK uses `Math.random()` for OAuth state (weak)

#### 8. Webhook Security Gaps
- Idempotency keys generated but NOT validated
- No deduplication cache for replay prevention
- Webhook secrets exposed via API endpoint

#### 9. Missing Database Indexes
Models with firmId but NO index:
- approvalRule, bill, crmSettings, event
- hrSettings, hrSetupWizard, refreshToken
- relationTuple, ssoUserLink

### MEDIUM Priority

#### 10. Information Disclosure - 762+ Instances
- `error.message` returned directly to clients
- Stack traces in development mode
- Database errors expose schema structure

#### 11. File Upload Vulnerabilities
- Malware scanning disabled by default
- Inconsistent file size limits (10MB vs 100MB)
- Path traversal validation incomplete

#### 12. Authentication Issues
- LDAP certificate verification can be disabled
- Magic link tokens valid for 7 days (too long)
- Anonymous users get full JWT tokens

#### 13. Frontend SDK Vulnerabilities
- Tokens stored in localStorage (XSS vulnerable)
- Open redirect in AuthGuard component
- Weak random fallback to Math.random()

---

## PART 4: WHAT NEEDS TO BE DONE

### Phase 1: Centralize Security (1-2 weeks)

1. **Create Unified Security Middleware Stack**
```javascript
// Apply in order to ALL routes:
1. authenticate()          // Verify JWT
2. firmContext()           // Set req.firmId, req.firmQuery
3. permissionCheck()       // Verify permissions from registry
4. resourceAccess()        // IDOR protection for :id params
5. auditLog()              // Log all actions
```

2. **Enforce Route Security Registry**
- Complete `routeSecurity.config.js` for all 2,500+ routes
- Create middleware that validates against registry
- Reject routes not in registry (fail secure)

3. **Create Query Layer with Auto-FirmId**
```javascript
// Instead of: Model.findById(id)
// Use: Model.findByIdWithFirm(id, req.firmId)

// Or better - create BaseRepository:
class BaseRepository {
  async findOne(filter, req) {
    return Model.findOne({ ...filter, firmId: req.firmId });
  }
}
```

### Phase 2: Fix Critical Vulnerabilities (1 week)

4. **Add MongoDB Transactions to Financial Operations**
```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  await Payment.create([paymentData], { session });
  await Invoice.updateOne({...}, {...}, { session });
  await session.commitTransaction();
} finally {
  session.endSession();
}
```

5. **Remove All Hardcoded Secrets**
- Remove default encryption keys
- Fail fast if env vars not set
- Rotate compromised VAPID keys

6. **Fix Service Layer IDOR**
- Replace all `findById()` with firm-scoped queries
- Or apply firmIsolation plugin to ALL models

### Phase 3: Strengthen Defenses (1 week)

7. **Require Idempotency on Mutations**
```javascript
router.post('/payments', requiredIdempotency, createPayment);
```

8. **Add Permission Middleware to All Routes**
```javascript
// Instead of checking in controller:
if (!req.hasPermission('cases', 'edit')) throw Error();

// Use middleware:
router.post('/cases', requirePermission('cases', 'edit'), createCase);
```

9. **Implement Field-Level Security**
- Filter response fields based on user role
- Don't return sensitive fields to unauthorized users

10. **Add Missing Database Indexes**
```javascript
// Add to all models with firmId:
firmId: { type: ObjectId, ref: 'Firm', index: true }
```

### Phase 4: Harden (Ongoing)

11. **Sanitize All Error Responses**
- Never return `error.message` to clients
- Log full errors server-side
- Return generic error codes to clients

12. **Secure File Uploads**
- Enable malware scanning by default
- Add authentication to `/uploads` endpoint
- Standardize file size limits

13. **Fix Frontend SDK**
- Use httpOnly cookies instead of localStorage
- Validate redirect URLs before use
- Remove Math.random() fallback

---

## PART 5: CENTRALIZATION PLAN

### Current State (What You Have)
```
Controllers → Manual firmId checks → Models → Database
     ↓
  (scattered 800+ places)
```

### Target State (What Big Companies Do)
```
Request → Auth Middleware → Firm Middleware → Permission Middleware → IDOR Middleware
                                    ↓
                          Query Layer (auto firmId)
                                    ↓
                          Database (RLS plugin)
                                    ↓
                          Audit Service (automatic)
```

### Implementation Steps

#### Step 1: Create SecurityStack Middleware
```javascript
// src/middlewares/securityStack.middleware.js
const securityStack = (config) => [
  authenticate,
  firmContext,
  config.permission ? requirePermission(config.permission) : null,
  config.resource ? resourceAccess(config.resource) : null,
  auditLog(config.action)
].filter(Boolean);

// Usage in routes:
router.get('/cases/:id',
  ...securityStack({ permission: 'cases:view', resource: 'Case' }),
  getCase
);
```

#### Step 2: Create Query Repository Layer
```javascript
// src/repositories/base.repository.js
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id, req) {
    return this.model.findOne({
      _id: id,
      ...req.firmQuery
    });
  }

  async find(filter, req) {
    return this.model.find({
      ...filter,
      ...req.firmQuery
    });
  }
}

// src/repositories/case.repository.js
class CaseRepository extends BaseRepository {
  constructor() {
    super(Case);
  }
}
```

#### Step 3: Enforce firmIsolation Plugin Globally
```javascript
// src/configs/db.js - Already done, but verify all models included
mongoose.plugin(globalFirmIsolationPlugin);

// Ensure NO models use bypass unless explicitly needed
```

#### Step 4: Complete Route Security Registry
```javascript
// src/config/routeSecurity.config.js
// Add ALL routes with their security requirements
const ROUTE_SECURITY = {
  'GET /api/cases': { permission: 'cases:view' },
  'POST /api/cases': { permission: 'cases:edit' },
  'DELETE /api/cases/:id': { permission: 'cases:full', resource: 'Case' },
  // ... all 2,500+ routes
};
```

#### Step 5: Create Enforcement Middleware
```javascript
// src/middlewares/routeEnforcement.middleware.js
const enforceRouteSecurity = (req, res, next) => {
  const routeKey = `${req.method} ${req.route.path}`;
  const config = ROUTE_SECURITY[routeKey];

  if (!config) {
    logger.error(`Unregistered route: ${routeKey}`);
    return res.status(500).json({ error: 'Route not configured' });
  }

  // Apply security from registry
  next();
};
```

---

## SUMMARY

### What You Did Wrong (Wasted Time)
- Added firmId checks to 800+ individual files
- Checked permissions in every controller manually
- Validated input in every endpoint separately

### What Big Companies Do (Centralized)
- One middleware stack enforces everything
- One query layer adds firmId automatically
- One permission engine evaluates all requests
- One audit service logs everything

### Time Saved with Centralization
- **Current approach**: Check firmId in 800+ places = weeks of work
- **Centralized approach**: Configure once, enforce everywhere = days of work

### Priority Order
1. Create unified security middleware stack
2. Fix service layer IDOR (300+ methods)
3. Add MongoDB transactions to payments
4. Remove hardcoded secrets
5. Complete route security registry
6. Enforce permissions via middleware
7. Add field-level security
8. Sanitize error responses

---

## APPENDIX: Files Requiring Changes

### Critical Files (IDOR in Services)
- `src/services/caseNotion.service.js` - 47 queries
- `src/services/approval.service.js` - 28 queries
- `src/services/emailMarketing.service.js` - 20 queries
- `src/services/quickbooks.service.js` - 20 queries
- `src/services/adminTools.service.js` - 15 queries
- `src/services/activity.service.js` - 12 queries
- `src/services/sloMonitoring.service.js` - 5 queries
... (50+ more service files)

### Files with Hardcoded Secrets
- `src/services/aiSettings.service.js:14`
- `src/utils/otp.utils.js:34`
- `src/models/phoneOtp.model.js:92`
- `src/models/emailOtp.model.js:92`
- `docs/NOTIFICATION_SYSTEM.md:29-30`

### Files with Race Conditions
- `src/controllers/payment.controller.js:1000-1018`
- `src/controllers/invoice.controller.js:945-982`
- `src/models/payment.model.js:685-733`
- `src/models/retainer.model.js:214`

### Files with NoSQL Injection
- `src/controllers/adminAudit.controller.js:114`
- `src/controllers/corporateCard.controller.js:219`
- `src/controllers/brokers.controller.js:126,450`
- `src/controllers/tradingAccounts.controller.js:126,461`

---

*Report generated from comprehensive codebase analysis using 20+ parallel security agents.*
