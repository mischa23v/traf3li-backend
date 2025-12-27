# Security Centralization Plan

## Current State Analysis

### What You Already Have (EXCELLENT Infrastructure)

Your codebase already has a sophisticated centralized security system:

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXISTING INFRASTRUCTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. globalFirmIsolation.plugin.js (Applied to ALL models)       │
│     ├─ Enforces firmId/lawyerId on ALL queries                  │
│     ├─ Throws error if query lacks isolation filter             │
│     ├─ Bypass methods for system operations                     │
│     └─ Applied globally in db.js                                │
│                                                                  │
│  2. firmFilter.middleware.js (670 lines)                        │
│     ├─ Sets req.firmId, req.firmQuery, req.permissions          │
│     ├─ Handles solo lawyers vs firm members                     │
│     ├─ Casbin-style req.enforce()                               │
│     ├─ req.hasPermission(), req.hasSpecialPermission()          │
│     └─ checkFirmPermission, firmOwnerOnly, firmAdminOnly        │
│                                                                  │
│  3. permissions.config.js (950 lines)                           │
│     ├─ All roles with module permissions                        │
│     ├─ Permission levels: none, view, edit, full                │
│     ├─ Casbin-style enforce() function                          │
│     ├─ Role hierarchy with inheritance                          │
│     └─ enforceMiddleware() factory                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What's Missing (The Gaps)

```
┌─────────────────────────────────────────────────────────────────┐
│                         IDENTIFIED GAPS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. INCONSISTENT MIDDLEWARE USAGE                               │
│     ├─ Some routes don't use firmFilter                         │
│     ├─ Some use authenticate but not firmFilter                 │
│     └─ No single entry point enforcing the stack                │
│                                                                  │
│  2. SCATTERED IDOR PROTECTION                                   │
│     ├─ checkCaseAccess() in case.controller.js                  │
│     ├─ Manual ownership checks in each controller               │
│     ├─ Inconsistent - some controllers missing checks           │
│     └─ No centralized resource access middleware                │
│                                                                  │
│  3. MODELS MISSING firmId                                       │
│     ├─ Trust accounts (FIXED - batch 10)                        │
│     ├─ ~70+ other models identified in security audits          │
│     └─ globalFirmIsolation can't protect what's not there       │
│                                                                  │
│  4. NO ROUTE SECURITY REGISTRY                                  │
│     ├─ No central place defining which permissions each needs   │
│     ├─ Permission requirements scattered in route files         │
│     └─ Hard to audit/verify coverage                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Solution: Complete the Centralization

### Layer 1: Ensure All Models Have firmId

**Priority: CRITICAL**

The globalFirmIsolation.plugin.js ALREADY enforces isolation, but only for models that have firmId field. Models without firmId bypass the protection.

**Action:**
1. Run audit to find all models missing firmId
2. Add firmId to each model with required: true
3. Update indexes to include firmId
4. Create migration to backfill existing data

```javascript
// Example: Models that need firmId added
// Already fixed: trustAccount, trustTransaction, trustReconciliation, clientTrustBalance
// Need to fix: [audit required]
```

### Layer 2: Centralized Resource Access Control (IDOR Protection)

**Priority: HIGH**

Create ONE middleware that validates ownership/access for ANY resource based on route parameters.

```javascript
// src/middlewares/resourceAccess.middleware.js
const resourceAccessMiddleware = (options = {}) => async (req, res, next) => {
    // Automatically validate ownership for common params
    const paramChecks = {
        'caseId': { model: 'Case', field: '_id' },
        'clientId': { model: 'Client', field: '_id' },
        'invoiceId': { model: 'Invoice', field: '_id' },
        'documentId': { model: 'Document', field: '_id' },
        'id': { model: options.model, field: '_id' }  // From route config
    };

    for (const [param, config] of Object.entries(paramChecks)) {
        if (req.params[param]) {
            const valid = await validateOwnership(
                req.params[param],
                config.model,
                req.firmQuery  // Uses existing firm isolation
            );
            if (!valid) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'  // Don't reveal it exists
                });
            }
        }
    }
    next();
};
```

### Layer 3: Route Security Registry

**Priority: HIGH**

Create ONE file that defines security requirements for ALL routes. This makes it auditable and ensures nothing is missed.

```javascript
// src/config/routeSecurity.config.js
const ROUTE_SECURITY = {
    // Cases routes
    'GET /api/cases': {
        auth: true,
        firmFilter: true,
        permission: { module: 'cases', level: 'view' }
    },
    'POST /api/cases': {
        auth: true,
        firmFilter: true,
        permission: { module: 'cases', level: 'edit' },
        resourceAccess: null  // No existing resource to check
    },
    'GET /api/cases/:id': {
        auth: true,
        firmFilter: true,
        permission: { module: 'cases', level: 'view' },
        resourceAccess: { model: 'Case', param: 'id' }
    },
    'PUT /api/cases/:id': {
        auth: true,
        firmFilter: true,
        permission: { module: 'cases', level: 'edit' },
        resourceAccess: { model: 'Case', param: 'id' }
    },
    // ... all other routes

    // Public routes (no auth)
    'POST /api/kyc/webhook': {
        auth: false,
        webhookAuth: 'autoDetect'
    }
};
```

### Layer 4: Unified Security Middleware Stack

**Priority: HIGH**

Create ONE middleware that applies the entire security stack based on route configuration.

```javascript
// src/middlewares/security.middleware.js
const applySecurityStack = (routeConfig) => {
    const stack = [];

    // 1. Rate limiting (always first)
    stack.push(rateLimiter);

    // 2. Webhook auth (for webhook routes)
    if (routeConfig.webhookAuth) {
        stack.push(createWebhookAuth(routeConfig.webhookAuth));
        return stack;  // Webhooks don't need user auth
    }

    // 3. Authentication
    if (routeConfig.auth) {
        stack.push(authenticate);
    }

    // 4. Firm context (always after auth)
    if (routeConfig.firmFilter) {
        stack.push(firmFilter);
    }

    // 5. Permission check
    if (routeConfig.permission) {
        stack.push(enforceMiddleware(
            routeConfig.permission.module,
            routeConfig.permission.level
        ));
    }

    // 6. Resource access (IDOR)
    if (routeConfig.resourceAccess) {
        stack.push(resourceAccessMiddleware(routeConfig.resourceAccess));
    }

    // 7. Input validation
    if (routeConfig.validator) {
        stack.push(validate(routeConfig.validator));
    }

    return stack;
};
```

### Layer 5: Automatic Route Protection

**Priority: MEDIUM**

Modify the Express app setup to automatically apply security based on the registry.

```javascript
// src/app.js or routes/index.js
const ROUTE_SECURITY = require('../config/routeSecurity.config');

// Apply security to all registered routes
Object.entries(ROUTE_SECURITY).forEach(([route, config]) => {
    const [method, path] = route.split(' ');
    const securityStack = applySecurityStack(config);

    // Apply middleware stack before the route handler
    app[method.toLowerCase()](path, ...securityStack);
});
```

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. [ ] Audit ALL models for firmId - create list
2. [ ] Add firmId to all models missing it
3. [ ] Create resourceAccess.middleware.js
4. [ ] Create routeSecurity.config.js (start with most critical routes)

### Phase 2: Integration (Week 2)
1. [ ] Create security.middleware.js (unified stack)
2. [ ] Update route files to use registry
3. [ ] Remove redundant inline checks from controllers
4. [ ] Test all routes

### Phase 3: Cleanup (Week 3)
1. [ ] Remove scattered checkCaseAccess, checkClientAccess, etc.
2. [ ] Remove redundant firmId checks in controllers
3. [ ] The line-by-line fixes become "defense in depth"
4. [ ] Comprehensive security testing

---

## How Line-by-Line Fixes Integrate

The fixes we already made (batches 1-10) will work WITH the centralized system:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEFENSE IN DEPTH                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Route Security Registry                               │
│     └─ Defines what each route requires                         │
│                                                                  │
│  Layer 2: Security Middleware Stack                             │
│     └─ Enforces permissions before controller                   │
│                                                                  │
│  Layer 3: Resource Access Middleware                            │
│     └─ Validates ownership (IDOR protection)                    │
│                                                                  │
│  Layer 4: Controller Checks (our line-by-line fixes)            │
│     └─ Secondary validation - GOOD to have as backup            │
│                                                                  │
│  Layer 5: Mongoose Plugin (globalFirmIsolation)                 │
│     └─ Database-level enforcement - FINAL safety net            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

The line-by-line fixes are NOT wasted - they become an additional layer of protection. If someone bypasses middleware somehow, the controller check catches it. If the controller check is bypassed, the Mongoose plugin catches it.

---

## Files to Create/Modify

### New Files:
1. `src/middlewares/resourceAccess.middleware.js` - IDOR protection
2. `src/config/routeSecurity.config.js` - Route security registry
3. `src/middlewares/security.middleware.js` - Unified stack

### Files to Modify:
1. Add firmId to ~70 models (exact list from audit)
2. Update all route files to use security registry
3. Eventually remove redundant controller checks

---

## Success Criteria

When complete:
1. **Every route** is in the security registry
2. **Every model** with tenant data has firmId
3. **One place** to audit/update security requirements
4. **No scattered** IDOR checks needed in controllers
5. **Mongoose plugin** catches anything that slips through
6. **Dashboard and marketplace** can use same patterns

---

## Questions to Decide

1. Should we keep the line-by-line fixes as "defense in depth" or remove them?
   - Recommendation: Keep for now, remove later when confident

2. How to handle migration for existing data without firmId?
   - Need to backfill firmId based on lawyerId → user → firmId

3. Should the route security registry be in a single file or split by module?
   - Recommendation: Single file for auditability

4. How to handle the dashboard and marketplace codebases?
   - Same patterns, same middleware, shared config?
