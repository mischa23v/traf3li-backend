# Claude Code Instructions for traf3li-backend

## IMPORTANT: Read Security Rules First

Before writing ANY code, read:
- `.claude/SECURITY_RULES.md` - Quick reference (MUST READ)
- `SECURITY_GUIDELINES.md` - Detailed patterns and templates

## Project Overview

This is a multi-tenant legal practice management SaaS application. Every database operation MUST enforce tenant isolation.

## Critical Security Requirements

### 1. Multi-Tenancy
- Every model has `firmId` and/or `lawyerId`
- NEVER use `findById()` - always use `findOne({ _id, firmId })`
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
```

### 4. Services Must Accept firmId
```javascript
async function serviceFn(resourceId, firmId) {
    return Model.findOne({ _id: resourceId, firmId });
}
```

## Technology Stack
- Node.js + Express
- MongoDB + Mongoose
- Firebase Auth
- Multi-tenant architecture (firmId isolation)

## Key Directories
- `/src/controllers/` - Request handlers
- `/src/services/` - Business logic
- `/src/models/` - Mongoose schemas
- `/src/routes/` - API routes
- `/src/middlewares/` - Auth, firm isolation
- `/src/plugins/` - Mongoose plugins (including globalFirmIsolation)

## Before Creating Any File
1. Check if similar file exists
2. Follow the templates in SECURITY_GUIDELINES.md
3. Include firmId in all queries
4. Use pickAllowedFields for req.body
5. Use sanitizeObjectId for all IDs
6. Use escapeRegex for search queries
