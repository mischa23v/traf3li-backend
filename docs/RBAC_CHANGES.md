# RBAC System Refactoring - Global Firm Isolation

This document describes the refactoring of the Role-Based Access Control (RBAC) and multi-tenancy system.

## Overview

The system was refactored to add **global firm isolation** that makes it impossible to forget security measures on new models.

### What Changed
- Added global plugin applied ONCE to ALL models automatically
- Added global middleware applied ONCE to ALL /api routes
- Removed per-model `firmIsolation` plugin calls (70 models)
- Removed per-route `firmFilter` middleware calls (111 routes)

### What Stayed the Same
- `firm.members[]` embedded array for member data
- `Staff` model for detailed employee profiles
- `firmFilter.middleware.js` utility functions (firmAdminOnly, etc.)
- Existing permission structure

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

## Models Still in Use

### User Model
- Stores login credentials, profile
- Has `firmId`, `firmRole`, `isSoloLawyer` fields

### Firm Model (with embedded members)
- `firm.members[]` array stores membership info
- Each member has: userId, role, permissions, status

### Staff Model
- Detailed employee profile (HR data, qualifications)
- Used by team management endpoints

## Files Modified

### Models Cleaned (70 files)
Removed `firmIsolationPlugin` import and `.plugin()` call:
- The global plugin now handles this automatically
- Per-model plugin calls are no longer needed

### Routes Cleaned (111 files)
Removed `firmFilter` import and middleware from routes:
- Global middleware now sets context automatically
- Utility middlewares (firmAdminOnly, etc.) still available from `firmFilter.middleware.js`

### Core Files Modified
- `src/configs/db.js` - Added global plugin initialization
- `src/server.js` - Added global middleware

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
- Cannot access team management endpoints
- Can create a firm to become firm owner

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

## Using Utility Middlewares

The following middlewares are still available from `firmFilter.middleware.js`:

```javascript
const {
    firmAdminOnly,      // Only owner/admin
    firmOwnerOnly,      // Only owner
    checkFirmPermission, // Check module permission
    checkSpecialPermission, // Check special permission
    blockDeparted,      // Block departed users
    financeAccessOnly,  // Require canViewFinance
    teamManagementOnly  // Require canManageTeam
} = require('../middlewares/firmFilter.middleware');

// Usage in routes:
router.post('/invite', userMiddleware, firmAdminOnly, inviteTeamMember);
```
