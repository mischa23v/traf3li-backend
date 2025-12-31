# Claude Code Instructions for traf3li-backend

## ⛔ MANDATORY: Read These Files BEFORE Writing ANY Code

**STOP. You MUST read these files first. Do not proceed without understanding them.**

| File | Purpose | Priority |
|------|---------|----------|
| `CLAUDE.md` | This file - project overview & architecture | 🔴 Critical |
| `.claude/SECURITY_RULES.md` | Security patterns quick reference | 🔴 Critical |
| `.claude/FIRM_ISOLATION.md` | Tenant isolation patterns (firmId/lawyerId) | 🔴 Critical |
| `SECURITY_GUIDELINES.md` | Detailed templates for controllers/services | 🟡 Reference |

---

## Gold Standard Compliance (AWS, Google, Microsoft, Apple, SAP)

This codebase follows enterprise-grade patterns from:
- **AWS** - IAM-style scope validation, retry with exponential backoff
- **Google** - OAuth 2.0 with HMAC-signed state, Calendar API patterns
- **Microsoft** - Graph API patterns, PKCE OAuth, token auto-refresh
- **Apple** - RFC 5545 ICS compliance, privacy-first data handling
- **SAP/Salesforce** - Pre-save hooks for calculated fields, audit trails

### Why This Matters

This is a **multi-tenant legal SaaS** handling sensitive client data. Incorrect patterns cause:
- **Data leaks** between law firms
- **FIRM_ISOLATION_VIOLATION** errors (500s in production)
- **Security vulnerabilities** (IDOR, injection, etc.)

### Key Rules Summary

1. **NEVER** check `if (!req.firmId)` - solo lawyers don't have firmId
2. **ALWAYS** use `...req.firmQuery` in queries - middleware sets this
3. **ALWAYS** use `req.addFirmId(data)` when creating records
4. **NEVER** use `findById()` - use `findOne({ _id, ...req.firmQuery })`
5. **NEVER** add bandaid validation - the Mongoose plugin catches issues
6. **PASS** `req.firmQuery` to services, not `req.firmId`

## Project Overview

This is a multi-tenant legal practice management SaaS application. Every database operation MUST enforce tenant isolation.

## CRITICAL: API Contract Rules (Gold Standard)

**Follow what Google, AWS, Microsoft, Amazon, Apple do - NO BANDAIDS.**

When there is a mismatch between frontend and backend:
1. **DO NOT auto-fix backend** to accommodate bad frontend requests
2. **Identify which side violates the gold standard**
3. **Ask the violating side to change**
4. **Return clear error messages** explaining what's wrong

### Examples

**BAD - Bandaid fix:**
```javascript
// Frontend sends lawyerId="current" instead of ObjectId
if (lawyerId === 'current') {
    lawyerId = req.userID;  // DON'T DO THIS
}
```

**GOOD - Enforce correct contract:**
```javascript
// Validate ObjectId format, return clear error
if (!/^[0-9a-fA-F]{24}$/.test(lawyerId)) {
    return res.status(400).json({
        success: false,
        message: 'lawyerId must be a valid ObjectId. Send user._id from auth context.'
    });
}
```

### API Contract Standards

| Parameter | Must Be | Not Acceptable |
|-----------|---------|----------------|
| IDs (userId, caseId, etc.) | Valid 24-char ObjectId | "current", "me", "self", null |
| Dates | ISO 8601 format | Unix timestamps, relative strings |
| Booleans | true/false | "true", "false", 1, 0 |

**Frontend has auth context with user._id - they must send it.**

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

---

## OAuth & External Integration Patterns (Critical)

### OAuth State Security (CSRF Protection)

**Gold Standard: HMAC-SHA256 signed state (AWS, Google, Microsoft pattern)**

```javascript
// ✅ CORRECT - Sign state with HMAC-SHA256
signState(stateData) {
    const payload = JSON.stringify(stateData);
    const signature = crypto
        .createHmac('sha256', this.getStateSigningSecret())
        .update(payload)
        .digest('hex');
    return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

// ✅ CORRECT - Verify with timing-safe comparison
verifyState(signedState) {
    const [encodedPayload, providedSignature] = signedState.split('.');
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    if (!crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    )) {
        throw CustomException('Invalid state signature', 400);
    }
}

// ❌ WRONG - Base64 encoding is forgeable
const state = Buffer.from(JSON.stringify(data)).toString('base64');
```

### Scope Validation Before Operations

**Gold Standard: AWS IAM / Azure AD pattern - validate permissions BEFORE action**

```javascript
// ✅ CORRECT - Validate scopes before proceeding
const scopeValidation = this.validateScopes(integration.scope, 'write');
if (!scopeValidation.valid) {
    throw CustomException(
        `Insufficient permissions. Missing: ${scopeValidation.missing.join(', ')}`,
        403
    );
}

// ❌ WRONG - No scope check, will fail mid-operation
await calendar.events.insert(...);  // Might fail with cryptic error
```

### Token Auto-Refresh (Proactive)

**Gold Standard: Refresh tokens 5 minutes BEFORE expiry, not after failure**

```javascript
// ✅ CORRECT - Proactive refresh with buffer
const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
if (expiresAt <= fiveMinutesFromNow) {
    await this.refreshToken(userId, firmId);
}

// ❌ WRONG - Reactive refresh after failure
try {
    await api.call();
} catch (e) {
    if (e.code === 'TOKEN_EXPIRED') {
        await refresh();  // User already saw an error!
    }
}
```

### Background Token Refresh Job

Location: `src/jobs/googleCalendarTokenRefresh.job.js`

- Runs hourly, refreshes tokens expiring within 24 hours
- Auto-disconnects integrations with invalid refresh tokens
- Logs statistics for monitoring

---

## Calendar Integration Patterns (Critical)

### Calendar Sync is Non-Blocking

**Gold Standard: Calendar failures NEVER break core appointment operations**

```javascript
// ✅ CORRECT - Non-blocking sync with error capture
let calendarSync = null;
try {
    calendarSync = await syncAppointmentToCalendars(
        appointment,
        appointment.assignedTo,
        req.firmId,
        'create'
    );
} catch (syncError) {
    logger.warn('Calendar sync failed (non-blocking):', syncError.message);
    // Continue - appointment was created successfully
}

// Save calendar event IDs if sync succeeded
if (calendarSync?.google?.eventId) {
    appointment.calendarEventId = calendarSync.google.eventId;
}

// ❌ WRONG - Sync failure breaks the appointment flow
await syncAppointmentToCalendars(...);  // If this throws, appointment creation fails
```

### All Appointment Operations Must Sync

| Operation | Sync Action | Non-Blocking? |
|-----------|-------------|---------------|
| create | 'create' | ✅ Yes |
| update | 'update' | ✅ Yes |
| reschedule | 'update' | ✅ Yes |
| confirm | 'update' | ✅ Yes |
| complete | 'update' | ✅ Yes |
| markNoShow | 'update' | ✅ Yes |
| cancel | 'cancel' | ✅ Yes |
| publicBook | 'create' | ✅ Yes |

### ICS Generator - RFC 5545 Compliance

**Required Properties (Apple, Google, Outlook compatibility):**

```javascript
// ✅ CORRECT - Full RFC 5545 compliance
const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Traf3li//Appointments//EN',
    'BEGIN:VEVENT',
    `DTSTAMP:${formatICSDate(now)}`,
    `CREATED:${formatICSDate(created)}`,           // Required
    `LAST-MODIFIED:${formatICSDate(lastModified)}`, // Required
    `TRANSP:${showAsBusy ? 'OPAQUE' : 'TRANSPARENT'}`, // Busy/Free
    `CLASS:${visibility}`,                          // PUBLIC/PRIVATE
    // CN must be quoted if contains special chars
    `ORGANIZER;CN=${quoteParamValue(name)}:mailto:${email}`,
    'END:VEVENT',
    'END:VCALENDAR'
];

// ❌ WRONG - Missing required properties
const lines = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    'END:VEVENT',
    'END:VCALENDAR'
];
```

### ICS Data Sanitization (Privacy)

```javascript
// ✅ CORRECT - Sanitize sensitive data before export
function sanitizeDescription(text) {
    return text
        .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD REDACTED]')
        .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[ID REDACTED]')
        .substring(0, 500);
}

// ❌ WRONG - Exposes all notes including sensitive data
description: notes
```

---

## External API Patterns (Critical)

### Retry with Exponential Backoff

**Location:** `src/utils/retryWithBackoff.js`

**Pre-configured Service Configs:**

| Service | Max Retries | Base Delay | Max Delay | Use For |
|---------|-------------|------------|-----------|---------|
| `calendar` | 3 | 1000ms | 15000ms | Google/Microsoft Calendar |
| `oauth` | 2 | 500ms | 5000ms | Token refresh |
| `government` | 4 | 2000ms | 60000ms | NAFATH, NAJIZ |
| `payment` | 2 | 1000ms | 10000ms | Payment gateways |

```javascript
// ✅ CORRECT - Use pre-configured retry
const { wrapExternalCall } = require('../utils/externalServiceWrapper');

await wrapExternalCall(
    () => googleCalendar.events.insert(...),
    'calendar'
);

// ❌ WRONG - No retry, single failure = complete failure
await googleCalendar.events.insert(...);
```

### Conflict Detection (Events)

**Check ALL ways a user can be associated with an event:**

```javascript
// ✅ CORRECT - Check organizer, attendees, AND creator
const eventQuery = {
    ...firmQuery,
    status: { $nin: ['canceled', 'cancelled'] },
    $or: [
        { organizer: assignedTo },           // Primary owner
        { 'attendees.userId': assignedTo },  // Invited participant
        { createdBy: assignedTo }            // Creator
    ],
    // Time overlap check...
};

// ❌ WRONG - Missing organizer check
$or: [
    { 'attendees.userId': assignedTo },
    { createdBy: assignedTo }
]
```

---

## Update Operations - Use .save() for Hooks

**Gold Standard: SAP/Salesforce pattern - calculated fields via pre-save hooks**

```javascript
// ✅ CORRECT - .save() triggers pre-save hooks (endTime recalculation)
const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });
Object.assign(appointment, safeData);
await appointment.save();  // Pre-save hook recalculates endTime

// ❌ WRONG - findOneAndUpdate bypasses pre-save hooks
await Appointment.findOneAndUpdate(
    { _id: id, ...req.firmQuery },
    { $set: { duration: 60 } }  // endTime NOT recalculated!
);
```

---

## Background Jobs

### Key Jobs Location: `src/jobs/`

| Job | Schedule | Purpose |
|-----|----------|---------|
| `googleCalendarTokenRefresh.job.js` | Hourly (min 30) | Proactive token refresh 24h before expiry |
| `sessionCleanup.job.js` | Hourly (min 0) | Clean expired sessions |
| `dataRetention.job.js` | Daily | Archive/delete old data |

### Job Pattern

```javascript
// Standard job structure
async function runJob() {
    logger.info('[JobName] Starting...');
    try {
        const results = await doWork();
        logger.info('[JobName] Completed', results);
    } catch (error) {
        logger.error('[JobName] Failed:', error.message);
    }
}

function scheduleJob() {
    cron.schedule('30 * * * *', runJob);  // Every hour at :30
}
```
