# Firm Isolation Issues Report

Generated: 2025-12-28T07:24:06.438Z

## Models Missing lawyerId Field

These models have `firmId` but are missing `lawyerId` for solo lawyer support:

_None found_

## Controllers with Isolation Issues

These controllers build their own queries instead of using `req.firmQuery`:

_None found_ ✅

## Services with Isolation Issues

_None found_ ✅

## Skipped Controllers

These controllers are intentionally skipped (admin/auth/logging contexts):

- `adminAudit.controller.js`
- `adminDashboard.controller.js`
- `adminUsers.controller.js`
- `adminFirms.controller.js`
- `adminCustomClaims.controller.js`
- `audit.controller.js`
- `auth.controller.js`
- `cspReport.controller.js`
- `cloudStorage.controller.js`
- `discord.controller.js`
- `fieldHistory.controller.js`
- `message.controller.js`
- `notification.controller.js`
- `permission.controller.js`
- `preparedReport.controller.js`
- `question.controller.js`
- `ssoConfig.controller.js`
- `ssoRouting.controller.js`
- `stepUpAuth.controller.js`
- `transaction.controller.js`

## How to Fix

### Models
Add `lawyerId` field to each model:
```javascript
// For solo lawyers (no firm) - enables row-level security
lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
},
```

### Controllers
Replace custom query building with `req.firmQuery`:
```javascript
// BEFORE (bad)
const baseQuery = firmId
    ? { firmId: new mongoose.Types.ObjectId(firmId) }
    : { $or: [{ assignedTo: userId }, { createdBy: userId }] };

// AFTER (good)
const baseQuery = { ...req.firmQuery }; // Already set by firmFilter middleware
```
