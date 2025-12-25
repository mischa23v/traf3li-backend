# Custom JWT Claims - Supabase-style Implementation

This document describes the custom JWT claims feature implemented in the traf3li backend, following Supabase Auth patterns.

## Overview

Custom JWT claims allow you to add additional metadata, permissions, and context to JWT tokens. This enables:

- **Fine-grained authorization**: Include user permissions, roles, and access levels
- **Contextual information**: Add firm details, subscription tier, department, etc.
- **Dynamic claims**: Automatically computed claims based on user state
- **Conditional claims**: Claims that are only included when certain conditions are met

## Architecture

### Components

1. **Custom Claims Service** (`/src/services/customClaims.service.js`)
   - Generates custom claims for JWT tokens
   - Supports static, dynamic, and conditional claims
   - Validates claim structure and size

2. **User Model Updates** (`/src/models/user.model.js`)
   - `customClaims`: Object field for storing user-specific claims
   - `customClaimsUpdatedAt`: Timestamp of last update
   - `customClaimsUpdatedBy`: Admin who made the update

3. **Token Generation** (`/src/utils/generateToken.js`)
   - Updated to be async and include custom claims
   - Merges claims into JWT payload
   - Gracefully handles claim generation failures

4. **Admin Endpoints** (`/src/controllers/adminCustomClaims.controller.js`)
   - CRUD operations for managing custom claims
   - Claim validation and preview

## Claim Types

### 1. Standard Claims (Always Included)

These are core claims automatically generated for every user:

```javascript
{
  user_id: "64f9b8a1c2e3d4f5a6b7c8d9",
  email: "user@example.com",
  email_verified: true,
  role: "lawyer",
  firm_id: "64f9b8a1c2e3d4f5a6b7c8d0",
  firm_role: "partner",
  firm_status: "active",
  mfa_enabled: true,
  subscription_tier: "professional",
  subscription_status: "active"
}
```

### 2. User Custom Claims (Stored in DB)

Custom claims set by admins and stored in the `User.customClaims` field:

```javascript
{
  department: "Corporate Law",
  clearance_level: 3,
  special_permissions: ["approve_contracts", "sign_documents"],
  custom_metadata: {
    office_location: "Riyadh Branch",
    employee_id: "EMP-12345"
  }
}
```

### 3. Dynamic Claims (Computed at Token Generation)

Claims automatically computed based on user state:

```javascript
{
  account_age_days: 120,
  last_login_at: "2025-12-25T10:30:00.000Z",
  kyc_status: "verified",
  kyc_verified: true,
  lawyer_verified: true,
  lawyer_licensed: true,
  specializations: ["Corporate", "Commercial"],
  stripe_connected: true,
  stripe_payout_enabled: true
}
```

### 4. Conditional Claims (Based on Business Rules)

Claims only included when certain conditions are met:

```javascript
{
  is_admin: true,               // Only if role === 'admin'
  is_firm_owner: true,          // Only if user is firm owner
  is_solo_lawyer: true,         // Only if user is solo practitioner
  is_trial_user: true,          // Only if on trial subscription
  trial_ends_at: "2026-01-25",  // Only during trial
  is_departed: true,            // Only for departed employees
  access_level: "read_only",    // Only for departed employees
  password_expires_soon: true,  // Only if password expires within 7 days
  must_change_password: true    // Only if password change required
}
```

### 5. Firm-Level Claims

Claims derived from firm settings and membership:

```javascript
{
  firm_timezone: "Asia/Riyadh",
  firm_language: "ar",
  firm_department: "Legal Team",
  firm_title: "Senior Partner",
  data_region: "me-south-1",
  mfa_required: true,
  firm_permissions: {
    clients: "full",
    cases: "full",
    invoices: "edit",
    // ... other module permissions
  }
}
```

## API Endpoints

All endpoints require admin authentication.

### 1. Get User Claims

```http
GET /api/admin/users/:id/claims
```

Retrieves custom claims and preview of all claims in user's JWT token.

**Response:**
```json
{
  "error": false,
  "data": {
    "userId": "64f9b8a1c2e3d4f5a6b7c8d9",
    "userEmail": "user@example.com",
    "customClaims": {
      "department": "Legal",
      "clearance_level": 3
    },
    "tokenClaimsPreview": {
      "user_id": "64f9b8a1c2e3d4f5a6b7c8d9",
      "email": "user@example.com",
      "role": "lawyer",
      "department": "Legal",
      "clearance_level": 3,
      // ... all other claims
    },
    "metadata": {
      "updatedAt": "2025-12-25T10:30:00.000Z",
      "updatedBy": { /* admin user info */ }
    }
  }
}
```

### 2. Set/Update User Claims

```http
PUT /api/admin/users/:id/claims
```

Sets or updates custom claims for a user.

**Request Body:**
```json
{
  "claims": {
    "department": "Corporate Law",
    "clearance_level": 4,
    "special_permissions": ["approve_contracts"]
  },
  "merge": true  // true = merge with existing, false = replace
}
```

**Response:**
```json
{
  "error": false,
  "message": "Custom claims updated successfully",
  "data": {
    "userId": "64f9b8a1c2e3d4f5a6b7c8d9",
    "email": "user@example.com",
    "customClaims": { /* updated claims */ },
    "merge": true,
    "updatedAt": "2025-12-25T10:30:00.000Z",
    "updatedBy": "admin@example.com"
  }
}
```

### 3. Delete User Claims

```http
DELETE /api/admin/users/:id/claims
```

Deletes all or specific custom claims.

**Request Body (optional):**
```json
{
  "keys": ["department", "clearance_level"]  // Omit to delete all claims
}
```

### 4. Preview Token Claims

```http
GET /api/admin/users/:id/claims/preview
```

Shows complete breakdown of all claims that will be in user's next JWT token.

**Response:**
```json
{
  "error": false,
  "data": {
    "userId": "64f9b8a1c2e3d4f5a6b7c8d9",
    "userEmail": "user@example.com",
    "allClaims": { /* complete merged claims */ },
    "breakdown": {
      "standard": { /* standard claims */ },
      "userCustom": { /* user custom claims */ },
      "dynamic": { /* dynamic claims */ },
      "conditional": { /* conditional claims */ }
    },
    "metadata": {
      "claimCount": 25,
      "tokenSize": "1024 bytes"
    }
  }
}
```

### 5. Validate Claims

```http
POST /api/admin/users/:id/claims/validate
```

Validates custom claims without saving them.

**Request Body:**
```json
{
  "claims": {
    "department": "Legal",
    "clearance_level": 3
  }
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "valid": true,
    "errors": [],
    "claimCount": 2,
    "estimatedSize": "64 bytes"
  }
}
```

## Usage Examples

### Example 1: Setting Department and Clearance Level

```javascript
// Admin sets custom claims for a user
const response = await fetch('/api/admin/users/64f9b8a1c2e3d4f5a6b7c8d9/claims', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer <admin-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    claims: {
      department: "Corporate Law",
      clearance_level: 4,
      office_location: "Riyadh"
    },
    merge: true
  })
});
```

### Example 2: Setting Permissions Array

```javascript
const response = await fetch('/api/admin/users/64f9b8a1c2e3d4f5a6b7c8d9/claims', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer <admin-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    claims: {
      permissions: ["read:contracts", "write:contracts", "approve:contracts"],
      features: ["advanced_reporting", "api_access"]
    },
    merge: true
  })
});
```

### Example 3: Frontend Access to Claims

Once claims are set, they will be included in the user's JWT token and accessible in the frontend:

```javascript
// Decode JWT token to access claims
import jwt_decode from 'jwt-decode';

const token = localStorage.getItem('accessToken');
const decoded = jwt_decode(token);

console.log(decoded.department);        // "Corporate Law"
console.log(decoded.clearance_level);   // 4
console.log(decoded.permissions);       // ["read:contracts", ...]
console.log(decoded.firm_id);          // "64f9b8a1c2e3d4f5a6b7c8d0"
console.log(decoded.subscription_tier); // "professional"
```

### Example 4: Backend Middleware Using Claims

```javascript
// Middleware to check clearance level
const requireClearanceLevel = (minLevel) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt_decode(token);

    if (!decoded.clearance_level || decoded.clearance_level < minLevel) {
      return res.status(403).json({
        error: true,
        message: 'Insufficient clearance level'
      });
    }

    next();
  };
};

// Usage in routes
app.delete('/api/cases/:id',
  authenticate,
  requireClearanceLevel(4),
  deleteCase
);
```

## Claim Validation Rules

1. **Size Limit**: Claims object must be under 8KB when serialized
2. **Reserved Names**: Cannot use JWT reserved claims: `iss`, `sub`, `aud`, `exp`, `iat`, `nbf`, `jti`
3. **Serialization**: All claim values must be JSON-serializable (no circular references)
4. **No Undefined**: Claim values cannot be `undefined` (use `null` instead)

## Best Practices

1. **Keep Claims Lean**: Only include claims needed for authorization/context
2. **Avoid Sensitive Data**: Never include passwords, secrets, or PII in claims
3. **Use Descriptive Names**: Use clear, snake_case naming (e.g., `clearance_level`, not `cl`)
4. **Document Custom Claims**: Maintain documentation of what each custom claim means
5. **Test Token Size**: Large tokens can cause issues - keep under 8KB
6. **Validate Before Setting**: Use the validate endpoint before setting claims
7. **Use Merge Carefully**: Understand the difference between merge and replace

## Security Considerations

1. **Admin Only**: Only admins can modify custom claims
2. **Audit Logging**: All claim modifications are logged via `auditLog.service`
3. **Firm Isolation**: Admins can only modify claims for users in their firm
4. **Token Refresh**: Users need to refresh their token to get updated claims
5. **Claim Validation**: Claims are validated on set to prevent injection attacks

## Comparison with Supabase Auth

This implementation follows Supabase Auth patterns:

| Feature | Supabase | This Implementation |
|---------|----------|---------------------|
| Custom claims storage | `app_metadata` | `customClaims` field |
| Standard claims | `user_metadata` | Generated automatically |
| Claim types | Static only | Static, Dynamic, Conditional |
| Admin API | Yes | Yes |
| Validation | Basic | Comprehensive |
| Size limit | ~1KB | 8KB |
| Firm-level claims | No | Yes |

## Migration Notes

### Existing Token Generation

The token generation functions are now **async**. Update your code:

**Before:**
```javascript
const tokens = generateTokenPair(user);
```

**After:**
```javascript
const tokens = await generateTokenPair(user);
```

### Optional Context Parameter

You can pass additional context for richer claims:

```javascript
const tokens = await generateTokenPair(user, {
  firm: firmObject,  // Include firm data for firm-level claims
  permissions: customPermissions
});
```

## Troubleshooting

### Claims Not Appearing in Token

1. Check that claims are saved: `GET /api/admin/users/:id/claims`
2. User needs to get a new token (refresh or re-login)
3. Check token size - may be exceeding limits

### Validation Errors

1. Use the validate endpoint to check claims before setting
2. Ensure no reserved JWT claim names are used
3. Check that all values are JSON-serializable

### Performance Issues

1. Keep claims lean - remove unnecessary data
2. Cache firm data when generating many tokens
3. Monitor token generation time in logs

## Future Enhancements

- [ ] Claim templates for common scenarios
- [ ] Claim inheritance from groups/teams
- [ ] Time-based claim expiration
- [ ] Claim transformation rules in UI
- [ ] Bulk claim operations
- [ ] Claim usage analytics

## Support

For questions or issues:
- Review the source code in `/src/services/customClaims.service.js`
- Check audit logs for claim modification history
- Contact the development team

---

**Last Updated:** December 25, 2025
**Version:** 1.0.0
