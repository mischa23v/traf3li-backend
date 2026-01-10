# Gold Standard Email Verification Enforcement Plan

## Overview

Implement feature-based access control for unverified email users following Google, Microsoft, AWS, SAP patterns.

**Current State:** Login BLOCKED (403) for unverified users
**Target State:** Login ALLOWED, but feature access RESTRICTED until email verified

---

## Architecture Design

### User Flow

```
User registers → Email verification sent → User can log in immediately
                                          ↓
                              Dashboard loads with banner
                              "Verify your email for full access"
                                          ↓
                              ┌───────────────────────────────────┐
                              │     ALLOWED (Basic Features)      │
                              │ • Tasks                           │
                              │ • Reminders                       │
                              │ • Events                          │
                              │ • Gantt Chart                     │
                              │ • Calendar                        │
                              │ • Profile (view only)             │
                              │ • Notifications                   │
                              │ • Resend verification email       │
                              └───────────────────────────────────┘
                                          ↓
                              ┌───────────────────────────────────┐
                              │    BLOCKED (Sensitive Features)   │
                              │ • Cases (create/edit/delete)      │
                              │ • Clients (all operations)        │
                              │ • Billing/Invoices                │
                              │ • Documents                       │
                              │ • Integrations                    │
                              │ • Team Management                 │
                              │ • Reports/Analytics               │
                              │ • Settings (sensitive)            │
                              │ • HR/Payroll                      │
                              │ • CRM (except basic view)         │
                              └───────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Modify Login Flow (`auth.controller.js`)

**Change:** Remove 403 block, allow login, add `emailVerificationStatus` to response

```javascript
// BEFORE (blocks login)
if (!user.isEmailVerified && !isLegacyUser) {
    return response.status(403).json({ code: 'EMAIL_NOT_VERIFIED' });
}

// AFTER (allows login with flag)
// No 403 block - always allow login
// Add emailVerificationStatus to token claims and response
```

**Response includes:**
- `isEmailVerified: boolean` - Current verification status
- `requiresVerification: boolean` - Whether user should see banner
- `allowedFeatures: string[]` - List of features they can access

---

### Step 2: Create `emailVerificationRequired` Middleware

**Location:** `src/middlewares/emailVerificationRequired.middleware.js`

```javascript
/**
 * Middleware that blocks unverified email users from sensitive features
 *
 * Usage:
 * - Apply to routes that require verified email
 * - NOT applied to: tasks, reminders, events, gantt, calendar
 */
const emailVerificationRequired = (req, res, next) => {
    if (!req.user?.isEmailVerified && req.requiresEmailVerification) {
        return res.status(403).json({
            error: true,
            code: 'EMAIL_VERIFICATION_REQUIRED',
            message: 'يرجى تفعيل بريدك الإلكتروني للوصول إلى هذه الميزة',
            messageEn: 'Please verify your email to access this feature',
            redirectTo: '/verify-email'
        });
    }
    next();
};
```

---

### Step 3: Define Route Categories

#### ALLOWED ROUTES (Unverified users CAN access)

| Route | Reason |
|-------|--------|
| `/api/*/tasks/*` | Basic productivity |
| `/api/*/reminders/*` | Basic productivity |
| `/api/*/events/*` | Basic productivity |
| `/api/*/gantt/*` | Basic productivity |
| `/api/*/calendar/*` | Basic productivity |
| `/api/*/notifications/*` | System notifications |
| `/api/*/users/me` | View own profile |
| `/api/*/auth/*` | Auth operations including resend verification |

#### BLOCKED ROUTES (Require verified email)

| Route | Reason |
|-------|--------|
| `/api/*/cases/*` | Sensitive legal data |
| `/api/*/clients/*` | Sensitive client data |
| `/api/*/billing/*` | Financial operations |
| `/api/*/invoices/*` | Financial operations |
| `/api/*/documents/*` | Legal documents |
| `/api/*/integrations/*` | External connections |
| `/api/*/team/*` | Team management |
| `/api/*/hr/*` | HR/Payroll data |
| `/api/*/reports/*` | Business analytics |
| `/api/*/settings/*` (most) | Configuration |
| `/api/*/crm/*` (create/edit) | CRM operations |
| `/api/*/leads/*` | CRM operations |
| `/api/*/appointments/*` (create/edit) | Scheduling |

---

### Step 4: Update `authenticatedApi` Middleware

Add email verification context to request:

```javascript
// After authentication, before route handler
req.isEmailVerified = user.isEmailVerified || false;
req.emailVerifiedAt = user.emailVerifiedAt || null;
req.requiresEmailVerification = !user.isEmailVerified;
```

---

### Step 5: Response Headers

Add header for frontend to detect verification status:

```javascript
res.setHeader('X-Email-Verification-Required', req.requiresEmailVerification ? 'true' : 'false');
```

---

## Frontend Integration Summary

### Login Response (New Fields)

```json
{
  "success": true,
  "token": "jwt...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "isEmailVerified": false,
    "emailVerifiedAt": null
  },
  "emailVerification": {
    "isVerified": false,
    "requiresVerification": true,
    "verificationSentAt": "2025-01-10T...",
    "allowedFeatures": ["tasks", "reminders", "events", "gantt", "calendar"],
    "blockedFeatures": ["cases", "clients", "billing", ...]
  }
}
```

### API Error Response (403)

```json
{
  "error": true,
  "code": "EMAIL_VERIFICATION_REQUIRED",
  "message": "يرجى تفعيل بريدك الإلكتروني للوصول إلى هذه الميزة",
  "messageEn": "Please verify your email to access this feature",
  "redirectTo": "/verify-email"
}
```

### Response Header

```
X-Email-Verification-Required: true
```

---

## Security Considerations

1. **No Data Leakage:** Blocked routes return generic error, no data
2. **Audit Logging:** All blocked access attempts logged
3. **Rate Limiting:** Resend verification email rate limited
4. **Token Claims:** `isEmailVerified` included in JWT for stateless checks
5. **Grace Period:** Legacy users can optionally have different restrictions

---

## Files to Modify

| File | Change |
|------|--------|
| `src/controllers/auth.controller.js` | Remove 403 block, add verification status to response |
| `src/middlewares/authenticatedApi.middleware.js` | Add `req.isEmailVerified` context |
| `src/middlewares/emailVerificationRequired.middleware.js` | NEW - Feature blocking middleware |
| `src/routes/index.js` or individual routes | Apply middleware to sensitive routes |
| `.specs/email-verification-enforcement/FRONTEND_GUIDE.md` | NEW - Frontend documentation |

---

## Testing Checklist

- [ ] Unverified user can log in
- [ ] Unverified user can access tasks
- [ ] Unverified user can access reminders
- [ ] Unverified user can access events
- [ ] Unverified user can access gantt
- [ ] Unverified user can access calendar
- [ ] Unverified user CANNOT access cases
- [ ] Unverified user CANNOT access clients
- [ ] Unverified user CANNOT access billing
- [ ] Verified user can access all features
- [ ] Frontend receives correct response codes
- [ ] Response header is set correctly
- [ ] Audit logs capture blocked attempts
