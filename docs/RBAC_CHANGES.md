# RBAC System Refactoring - Global Firm Isolation

This document describes the comprehensive refactoring of the Role-Based Access Control (RBAC) and multi-tenancy system.

## Overview

The system was refactored from a per-model/per-route approach to a **global approach** that makes it impossible to forget security measures.

### Before (Old Approach)
- Each model had to manually add `firmIsolation` plugin
- Each route had to manually add `firmFilter` middleware
- 188 models had `firmId` but no plugin (security gaps)
- 66 routes missing `firmFilter` middleware

### After (New Approach)
- Global plugin applied ONCE to ALL models automatically
- Global middleware applied ONCE to ALL /api routes
- Impossible to forget firm isolation
- Centralized permission management

## Key Changes

### 1. Global Firm Isolation Plugin
**File:** `src/plugins/globalFirmIsolation.plugin.js`

Applied once in `src/configs/db.js`, this plugin automatically:
- Adds `firmId`/`lawyerId` filter to all queries
- Skips system models (User, Firm, Session, etc.)
- Supports `bypassFirmFilter` option for admin operations

```javascript
// Usage: No action needed - it's automatic!
// To bypass for admin queries:
Model.find({}).setOptions({ bypassFirmFilter: true });
```

### 2. Global Firm Context Middleware
**File:** `src/middlewares/globalFirmContext.middleware.js`

Applied once in `src/server.js`, this middleware:
- Sets `req.firmId`, `req.firmQuery`, `req.permissions` on every request
- Handles solo lawyers vs firm members automatically
- Provides `req.hasPermission()` and `req.hasSpecialPermission()` helpers
- Handles departed employees with restricted access

```javascript
// In any controller:
const cases = await Case.find(req.firmQuery);
// req.firmQuery is automatically: { firmId: user.firmId } or { lawyerId: userId }
```

### 3. Firm Query Helper
**File:** `src/helpers/firmQuery.helper.js`

Helper functions for controllers:

```javascript
const { firmQuery, addFirmContext } = require('../helpers/firmQuery.helper');

// Querying with firm isolation
const cases = await Case.find(firmQuery(req, { status: 'active' }));

// Creating records with firm context
const newCase = await Case.create(addFirmContext(req, { title: 'New Case' }));
```

### 4. FirmMember Model
**File:** `src/models/firmMember.model.js`

Standalone model replacing embedded `firm.members[]` array:
- Faster queries (indexed lookups vs array search)
- Permission overrides (only store differences from role defaults)
- Resource-level permissions (per-case/per-client access)

### 5. Permission Resolver Service
**File:** `src/services/permissionResolver.service.js`

Centralized permission resolution:
- Combines role defaults with member overrides
- Resource-level permission checking
- Role hierarchy management

## Files Modified

### Models Cleaned (70 files)
Removed `firmIsolationPlugin` import and `.plugin()` call from all models in:
- `src/models/*.model.js`

### Routes Cleaned (111 files)
Removed `firmFilter` import and middleware usage from all routes in:
- `src/routes/*.route.js`
- `src/routes/*.routes.js`

### Core Files Modified
- `src/configs/db.js` - Added global plugin initialization
- `src/server.js` - Added global middleware

## Migration

### From firm.members[] to FirmMember Collection

Run the migration script:
```bash
node src/scripts/migrate.js run migrate-firm-members.js
```

This migrates embedded member data to the standalone FirmMember collection.

To revert:
```bash
node src/scripts/migrate.js down migrate-firm-members.js
```

## Permission System

### Roles (8 total)
1. `owner` - Full access to everything
2. `admin` - Full access except ownership transfer
3. `partner` - Full case/client access, limited finance
4. `lawyer` - Standard lawyer access
5. `paralegal` - Support role
6. `secretary` - Administrative role
7. `accountant` - Finance-focused role
8. `departed` - Read-only to own work

### Permission Levels
- `none` - No access
- `view` - Read only
- `edit` - Create and update
- `full` - Full access including delete

### Module Permissions
- clients, cases, leads, invoices, payments, expenses
- documents, tasks, events, timeTracking
- reports, settings, team, hr

### Special Permissions
- canApproveInvoices
- canManageRetainers
- canExportData
- canDeleteRecords
- canViewFinance
- canManageTeam
- canAccessHR

## Solo Lawyer Support

Solo lawyers (users without firmId):
- Filter by `lawyerId` instead of `firmId`
- Get full permissions automatically
- No firm membership required

## Departed Employee Handling

When an employee departs:
- Role changes to `departed`
- Get read-only access to their own cases/tasks
- No finance access
- Can be reinstated with previous role

## Security Features

### Row-Level Security
All queries automatically filtered by:
- `firmId` for firm members
- `lawyerId` for solo lawyers

### Bypass Protection
Only specific system models skip filtering:
- User, Firm, FirmInvitation
- Session, RefreshToken, APIKey
- Counter, Migration

### Query Logging
Slow queries (>100ms) logged for performance monitoring.

## Troubleshooting

### "Firm context not set" Error
Ensure route is under `/api` prefix and user is authenticated.

### Bypassing for Admin Operations
```javascript
// For system-level operations
Model.findById(id).setOptions({ bypassFirmFilter: true });
```

### Checking Permissions
```javascript
// In controller
if (!req.hasPermission('invoices', 'edit')) {
    return res.status(403).json({ error: 'Permission denied' });
}
```

## Performance Improvements

1. **Faster Queries**: Global plugin adds filters at query time, not post-filter
2. **Connection Pooling**: Optimized MongoDB connection settings
3. **Index Optimization**: FirmMember has indexes on userId, firmId, status
4. **Permission Caching**: Role defaults loaded once, overrides minimal

## Breaking Changes

1. `firmIsolationPlugin` is deprecated - remove from models
2. `firmFilter` middleware is deprecated - remove from routes
3. `firm.members[]` array deprecated - use FirmMember collection
4. Permission structure changed - use `permissionOverrides` for non-defaults
