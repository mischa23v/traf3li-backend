# Claude Code Instructions for traf3li-backend

## IMPORTANT: Read Security Rules First

Before writing ANY code, read:
- `.claude/SECURITY_RULES.md` - Quick reference (MUST READ)
- `SECURITY_GUIDELINES.md` - Detailed patterns and templates

## Project Overview

This is a multi-tenant legal practice management SaaS application. Every database operation MUST enforce tenant isolation.

## Authentication & Authorization Architecture

### Global Middleware (Enterprise Gold Standard)

The `authenticatedApi` middleware in `src/middlewares/authenticatedApi.middleware.js` handles ALL authentication and tenant context globally. It is applied to all `/api` routes in `server.js`.

**DO NOT add `userMiddleware` or `firmFilter` to individual routes - they are handled globally.**

### How It Works

```
Request → authenticatedApi middleware → Controller
                    │
                    ├── 1. Verifies JWT token (sets req.userID)
                    ├── 2. Sets tenant context:
                    │       • Firm members: req.firmQuery = { firmId: X }
                    │       • Solo lawyers: req.firmQuery = { lawyerId: Y }
                    ├── 3. Sets permissions: req.hasPermission(module, level)
                    └── 4. Sets helper: req.addFirmId(data)
```

### Tenant Isolation

| User Type | req.firmQuery | Can Access |
|-----------|---------------|------------|
| Firm Member | `{ firmId: X }` | Only data with matching firmId |
| Solo Lawyer | `{ lawyerId: Y }` | Only their own data |
| Departed | `{ firmId: X }` + restrictions | Read-only, own assignments |

### Permission Levels

Firm owners/admins set member permissions in `firm.members[].permissions`:
- `modules.cases`: view / edit / full
- `modules.clients`: view / edit / full
- `modules.documents`: view / edit / full
- etc.

Check permissions in controllers:
```javascript
if (!req.hasPermission('cases', 'edit')) {
    throw CustomException('Permission denied', 403);
}
```

## What IS vs IS NOT Centralized

### Centralized (Middleware handles automatically)
| What | Where | Notes |
|------|-------|-------|
| `req.firmQuery` | authenticatedApi.middleware.js | Set ONCE per request |
| `req.hasPermission()` | authenticatedApi.middleware.js | Permission checker function |
| `req.addFirmId()` | authenticatedApi.middleware.js | Helper for creating records |
| Route validation | authenticatedApi.middleware.js | Path normalization for v1/v2 |

### NOT Centralized (Must do in EVERY controller)
| What | Why | Example |
|------|-----|---------|
| Using `...req.firmQuery` in queries | Each model has different schema | `Case.find({ ...req.firmQuery })` |
| Additional filters | Business logic varies | `{ ...req.firmQuery, status: 'active' }` |
| Permission checks | Different endpoints need different permissions | `req.hasPermission('cases', 'edit')` |

### FIRM_ISOLATION_VIOLATION Errors

The `globalFirmIsolation` Mongoose plugin throws `FIRM_ISOLATION_VIOLATION` (500 error) when a query lacks tenant filters. This is a **safety net**.

**When you see this error:**
1. Find the controller making the query
2. Add `...req.firmQuery` to the query
3. For model static methods (like `Model.getStats()`), pass `req.firmQuery` or `firmId`/`lawyerId` as parameter

**Common patterns that cause this error:**
```javascript
// BAD - missing tenant filter
const items = await Model.find({ status: 'active' });

// GOOD - includes tenant filter
const items = await Model.find({ ...req.firmQuery, status: 'active' });

// BAD - model method ignores firmId
static async getStats(userId) {
    return this.aggregate([{ $match: { createdBy: userId } }]);
}

// GOOD - model method uses firmId
static async getStats(userId, filters = {}) {
    const match = {};
    if (filters.firmId) match.firmId = new ObjectId(filters.firmId);
    return this.aggregate([{ $match: match }]);
}
```

## Critical Security Requirements

### 1. Multi-Tenancy
- Every model has `firmId` and/or `lawyerId`
- NEVER use `findById()` - always use `findOne({ _id, ...req.firmQuery })`
- Controllers receive `req.firmQuery` from middleware - ALWAYS use it

### 2. Required Imports for Controllers
```javascript
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

### 3. Required Pattern for ALL CRUD Operations
```javascript
// READ
const item = await Model.findOne({ _id: sanitizedId, ...req.firmQuery });

// UPDATE
await Model.findOneAndUpdate({ _id: id, ...req.firmQuery }, { $set: data });

// DELETE
await Model.findOneAndDelete({ _id: id, ...req.firmQuery });

// CREATE - use req.addFirmId() to add tenant context
const newItem = await Model.create(req.addFirmId(data));
```

### 4. Services Must Accept firmId/firmQuery
```javascript
async function serviceFn(resourceId, firmQuery) {
    return Model.findOne({ _id: resourceId, ...firmQuery });
}
```

### 5. Route Files - Keep It Simple
Routes should NOT have `userMiddleware` or `firmFilter` - these are global:
```javascript
// CORRECT - clean routes
app.get('/', getItems);
app.post('/', createItem);
app.get('/:id', getItem);

// WRONG - redundant middleware
app.get('/', userMiddleware, firmFilter, getItems);  // DON'T DO THIS
```

## Technology Stack
- Node.js + Express
- MongoDB + Mongoose
- Firebase Auth + JWT
- Multi-tenant architecture (firmId/lawyerId isolation)

## Key Directories
- `/src/controllers/` - Request handlers
- `/src/services/` - Business logic
- `/src/models/` - Mongoose schemas
- `/src/routes/` - API routes (no auth middleware needed)
- `/src/middlewares/` - Global auth via authenticatedApi.middleware.js
- `/src/plugins/` - Mongoose plugins (including globalFirmIsolation)

## Before Creating Any File
1. Check if similar file exists
2. Follow the templates in SECURITY_GUIDELINES.md
3. Include `...req.firmQuery` in all queries
4. Use `req.addFirmId(data)` when creating records
5. Use `pickAllowedFields` for req.body
6. Use `sanitizeObjectId` for all IDs
7. Use `escapeRegex` for search queries
8. Check `req.hasPermission()` for restricted operations
