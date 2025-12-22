# Frontend API Integration Guide

## CRITICAL: What Your Documentation Got Wrong

Your original documentation had several fundamental errors. This guide corrects them all.

---

## 🚨 CRITICAL CORRECTIONS

### 1. Database Technology
| ❌ Your Doc Said | ✅ Reality |
|------------------|-----------|
| PostgreSQL with SQL schemas | **MongoDB with Mongoose ODM** |
| UUID primary keys | **MongoDB ObjectId** |
| SQL CREATE TABLE statements | **Mongoose schemas** |
| Sequelize ORM | **Mongoose ODM** |

### 2. Multi-Tenancy Naming
| ❌ Your Doc Said | ✅ Reality |
|------------------|-----------|
| `company_id` | **`firmId`** |
| `companies` table | **`Firm` model** |
| `X-Company-Id` header | **JWT contains `firmId`** |
| `/api/companies/*` | **`/api/firms/*`** |

### 3. Authentication
| ❌ Your Doc Said | ✅ Reality |
|------------------|-----------|
| `X-Company-Id` header for context | **`firmId` in JWT token** |
| Separate company switch endpoint | **`POST /api/firms/switch`** |

---

## 📋 COMPLETE API ENDPOINT REFERENCE

### 1. Multi-Company (Firm) Support

**Base Path:** `/api/firms`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/firms` | List user's firms |
| POST | `/api/firms` | Create new firm |
| GET | `/api/firms/:id` | Get firm details |
| PUT | `/api/firms/:id` | Update firm |
| DELETE | `/api/firms/:id` | Deactivate firm |
| POST | `/api/firms/switch` | **Switch active firm** ⭐ NEW |
| GET | `/api/firms/:id/members` | Get firm members |
| POST | `/api/firms/:id/members` | Add member to firm |
| DELETE | `/api/firms/:id/members/:userId` | Remove member |

#### Switch Firm Request/Response
```typescript
// POST /api/firms/switch
// Request
{
  "firmId": "507f1f77bcf86cd799439011"
}

// Response
{
  "success": true,
  "data": {
    "activeFirm": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Acme Law Firm",
      "nameArabic": "شركة أكمي للمحاماة",
      "logo": "/uploads/logos/acme.png",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // New JWT with updated firmId
  }
}
```

**Important:** After switching firms, store the new JWT token and use it for subsequent requests.

---

### 2. Chatter Communication System

**Base Path:** `/api/chatter-followers` and `/api/thread-messages`

#### Messages (Thread Messages)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/thread-messages/:model/:recordId` | Get messages for record |
| POST | `/api/thread-messages/:model/:recordId` | Post new message |
| PUT | `/api/thread-messages/:id` | Edit message |
| DELETE | `/api/thread-messages/:id` | Delete message |

#### Followers ⭐ NEW

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chatter-followers/:model/:recordId/followers` | Get followers |
| POST | `/api/chatter-followers/:model/:recordId/followers` | Add follower |
| POST | `/api/chatter-followers/:model/:recordId/followers/bulk` | Add multiple followers |
| DELETE | `/api/chatter-followers/:model/:recordId/followers/:userId` | Remove follower |
| PATCH | `/api/chatter-followers/:model/:recordId/followers/:userId/preferences` | Update notification pref |
| POST | `/api/chatter-followers/:model/:recordId/toggle-follow` | Toggle follow |
| GET | `/api/chatter-followers/my-followed` | Get user's followed records |

#### Chatter Request/Response Examples

```typescript
// POST /api/thread-messages/Case/507f1f77bcf86cd799439011
// Request
{
  "body": "Updated the contract terms as discussed with @john.doe",
  "message_type": "comment",
  "partner_ids": ["507f1f77bcf86cd799439012"], // Mentioned user IDs
  "attachment_ids": ["507f1f77bcf86cd799439013"],
  "is_internal": false
}

// Response
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "res_model": "Case",
    "res_id": "507f1f77bcf86cd799439011",
    "body": "Updated the contract terms as discussed with @john.doe",
    "author_id": {
      "_id": "507f1f77bcf86cd799439015",
      "firstName": "Jane",
      "lastName": "Smith",
      "avatar": "/avatars/jane.jpg"
    },
    "message_type": "comment",
    "partner_ids": [...],
    "attachment_ids": [...],
    "is_internal": false,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

```typescript
// POST /api/chatter-followers/Case/507f1f77bcf86cd799439011/followers
// Request
{
  "user_id": "507f1f77bcf86cd799439012",
  "notification_type": "all" // 'all', 'mentions', 'none'
}

// Response
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "res_model": "Case",
    "res_id": "507f1f77bcf86cd799439011",
    "user_id": {...},
    "notification_type": "all",
    "follow_type": "manual",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

---

### 3. Activities System

**Base Path:** `/api/activities`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activities/:model/:recordId` | Get activities for record |
| POST | `/api/activities/:model/:recordId` | Schedule activity |
| PUT | `/api/activities/:id` | Update activity |
| POST | `/api/activities/:id/done` | Mark as done |
| DELETE | `/api/activities/:id` | Delete activity |
| GET | `/api/activities/my` | Get user's pending activities |
| GET | `/api/activities/overdue` | Get overdue activities |

```typescript
// POST /api/activities/Case/507f1f77bcf86cd799439011
// Request
{
  "activity_type_id": "507f1f77bcf86cd799439020",
  "summary": "Follow up on contract discussion",
  "note": "Ask about budget approval",
  "date_deadline": "2025-01-20",
  "user_id": "507f1f77bcf86cd799439012"
}
```

---

### 4. Smart Buttons ⭐ NEW

**Base Path:** `/api/smart-buttons`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/smart-buttons/:model/:recordId/counts` | Get related record counts |
| POST | `/api/smart-buttons/:model/batch-counts` | Get counts for multiple records |

```typescript
// GET /api/smart-buttons/client/507f1f77bcf86cd799439011/counts
// Response
{
  "success": true,
  "data": {
    "cases": 12,
    "invoices": 8,
    "documents": 45,
    "contacts": 3,
    "tasks": 7,
    "payments": 6,
    "timeEntries": 24,
    "expenses": 5,
    "activities": 10,
    "events": 3
  }
}

// POST /api/smart-buttons/client/batch-counts
// Request
{
  "recordIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
// Response
{
  "success": true,
  "data": {
    "507f1f77bcf86cd799439011": { "cases": 12, "invoices": 8, ... },
    "507f1f77bcf86cd799439012": { "cases": 5, "invoices": 3, ... }
  }
}
```

**Supported Models:** `client`, `case`, `contact`, `invoice`, `lead`, `task`, `expense`, `payment`, `document`, `timeEntry`, `event`

---

### 5. Authentication & Security

#### 5.1 Rate Limiting

Rate limiting is handled server-side. The response headers include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642291200
```

On rate limit exceeded (429 status):
```typescript
{
  "error": "Too many requests",
  "retryAfter": 900 // seconds
}
```

#### 5.2 CAPTCHA Verification ⭐ NEW

**Base Path:** `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/verify-captcha` | Verify CAPTCHA token |
| GET | `/api/auth/captcha/providers` | Get enabled providers |
| GET | `/api/auth/captcha/status/:provider` | Check provider status |

```typescript
// POST /api/auth/verify-captcha
// Request
{
  "provider": "recaptcha", // 'recaptcha', 'hcaptcha', 'turnstile'
  "token": "03AGdBq24PBCbwiDRaS_MJ7Z..."
}

// Response
{
  "success": true,
  "score": 0.9, // reCAPTCHA v3 only
  "errorCodes": []
}
```

#### 5.3 OAuth 2.0 SSO ⭐ NEW

**Base Path:** `/api/auth/sso`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/sso/providers` | Get enabled OAuth providers |
| GET | `/api/auth/sso/:providerType/authorize` | Start OAuth flow (redirect) |
| GET | `/api/auth/sso/:providerType/callback` | OAuth callback (handled by backend) |
| POST | `/api/auth/sso/link` | Link OAuth to existing account |
| DELETE | `/api/auth/sso/unlink/:providerType` | Unlink OAuth from account |
| GET | `/api/auth/sso/linked` | Get user's linked OAuth accounts |

```typescript
// GET /api/auth/sso/providers
// Response
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439030",
      "name": "Google Workspace",
      "providerType": "google",
      "icon": "google"
    },
    {
      "id": "507f1f77bcf86cd799439031",
      "name": "Microsoft 365",
      "providerType": "microsoft",
      "icon": "microsoft"
    }
  ]
}

// Start OAuth (redirect user to this URL)
// GET /api/auth/sso/google/authorize?returnUrl=/dashboard
// Redirects to Google OAuth, then back to callback, then to returnUrl with token
```

#### 5.4 LDAP Authentication ⭐ NEW

**Base Path:** `/api/auth/ldap` (public) and `/api/admin/ldap` (admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/ldap/login` | LDAP login |
| GET | `/api/admin/ldap/config` | Get LDAP config (admin) |
| POST | `/api/admin/ldap/config` | Save LDAP config (admin) |
| POST | `/api/admin/ldap/test` | Test LDAP connection |
| POST | `/api/admin/ldap/test-auth` | Test user authentication |
| POST | `/api/admin/ldap/sync` | Sync users from LDAP |

```typescript
// POST /api/auth/ldap/login
// Request
{
  "username": "jdoe",
  "password": "password123"
}

// Response
{
  "success": true,
  "data": {
    "user": {...},
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 5.5 API Keys

**Base Path:** `/api/api-keys`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/api-keys` | List user's API keys |
| POST | `/api/api-keys` | Create new API key |
| PUT | `/api/api-keys/:id` | Update key (name, scopes) |
| DELETE | `/api/api-keys/:id` | Revoke API key |

```typescript
// POST /api/api-keys
// Request
{
  "name": "Production Integration",
  "scopes": ["read:cases", "write:cases", "read:clients"],
  "expiresAt": "2026-01-15T00:00:00Z" // optional
}

// Response (key shown ONLY on creation)
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439040",
    "name": "Production Integration",
    "key": "traf_abc123def456...", // SAVE THIS - shown only once!
    "keyPrefix": "traf_abc123d",
    "scopes": ["read:cases", "write:cases", "read:clients"],
    "expiresAt": "2026-01-15T00:00:00Z",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Using API Keys:**
```typescript
// Include in Authorization header
headers: {
  'Authorization': 'Bearer traf_abc123def456...'
}
```

---

### 6. Setup Wizard (App Onboarding) ⭐ NEW

**Base Path:** `/api/setup`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/setup/status` | Get full setup status |
| GET | `/api/setup/sections` | Get all sections with tasks |
| POST | `/api/setup/tasks/:taskId/complete` | Complete a task |
| POST | `/api/setup/tasks/:taskId/skip` | Skip a task |
| GET | `/api/setup/next-task` | Get next task to complete |
| GET | `/api/setup/progress-percentage` | Get progress stats |
| POST | `/api/setup/reset` | Reset progress (admin only) |

```typescript
// GET /api/setup/status
// Response
{
  "success": true,
  "data": {
    "sections": [
      {
        "sectionId": "company",
        "name": "Company Setup",
        "nameAr": "إعداد الشركة",
        "icon": "building",
        "isRequired": true,
        "tasks": [
          {
            "taskId": "company_profile",
            "name": "Complete Company Profile",
            "nameAr": "استكمال ملف الشركة",
            "isRequired": true,
            "actionUrl": "/settings/company",
            "estimatedMinutes": 5,
            "isCompleted": false,
            "skipped": false
          },
          // ... more tasks
        ],
        "completedCount": 2,
        "totalCount": 6,
        "percentage": 33
      }
    ],
    "overall": {
      "completedTasks": 5,
      "totalTasks": 35,
      "requiredCompleted": 3,
      "requiredTotal": 10,
      "percentage": 14,
      "isComplete": false
    }
  }
}
```

---

### 7. Settings APIs

#### 7.1 Webhooks

**Base Path:** `/api/webhooks`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Create webhook |
| GET | `/api/webhooks/:id` | Get webhook details |
| PUT | `/api/webhooks/:id` | Update webhook |
| DELETE | `/api/webhooks/:id` | Delete webhook |
| POST | `/api/webhooks/:id/test` | Send test event |
| GET | `/api/webhooks/:id/deliveries` | Get delivery history |

```typescript
// POST /api/webhooks
// Request
{
  "name": "Case Updates",
  "url": "https://your-app.com/webhooks/cases",
  "events": ["case.created", "case.updated", "case.status_changed"],
  "secret": "whsec_abc123...", // For signature verification
  "headers": {
    "X-Custom-Header": "value"
  },
  "retryPolicy": {
    "maxAttempts": 3,
    "retryIntervals": [5, 15, 60] // minutes
  }
}
```

**Available Events:**
- Client: `client.created`, `client.updated`, `client.deleted`
- Case: `case.created`, `case.updated`, `case.status_changed`, `case.closed`, `case.deleted`
- Invoice: `invoice.created`, `invoice.updated`, `invoice.sent`, `invoice.paid`, `invoice.voided`, `invoice.overdue`
- Payment: `payment.received`, `payment.failed`, `payment.refunded`
- Lead: `lead.created`, `lead.updated`, `lead.converted`, `lead.deleted`

#### 7.2 Email/SMTP Configuration ⭐ NEW

**Base Path:** `/api/settings/email`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/email/smtp` | Get SMTP config |
| PUT | `/api/settings/email/smtp` | Update SMTP config |
| POST | `/api/settings/email/smtp/test` | Test SMTP connection |
| GET | `/api/settings/email/templates` | List email templates |
| POST | `/api/settings/email/templates` | Create template |
| PUT | `/api/settings/email/templates/:id` | Update template |
| DELETE | `/api/settings/email/templates/:id` | Delete template |
| POST | `/api/settings/email/templates/:id/preview` | Preview with data |
| GET | `/api/settings/email/signatures` | List user's signatures |
| POST | `/api/settings/email/signatures` | Create signature |
| PUT | `/api/settings/email/signatures/:id` | Update signature |
| DELETE | `/api/settings/email/signatures/:id` | Delete signature |
| PUT | `/api/settings/email/signatures/:id/default` | Set as default |

```typescript
// PUT /api/settings/email/smtp
// Request
{
  "host": "smtp.example.com",
  "port": 587,
  "username": "noreply@example.com",
  "password": "secretpassword",
  "encryption": "tls", // 'none', 'ssl', 'tls'
  "fromEmail": "noreply@example.com",
  "fromName": "Traf3li System",
  "replyTo": "support@example.com"
}
```

#### 7.3 Billing & Subscription ⭐ NEW

**Base Path:** `/api/billing`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/plans` | Get available plans (public) |
| GET | `/api/billing/subscription` | Get current subscription |
| POST | `/api/billing/subscription` | Create subscription |
| PUT | `/api/billing/subscription` | Change plan |
| DELETE | `/api/billing/subscription` | Cancel subscription |
| POST | `/api/billing/subscription/reactivate` | Reactivate |
| GET | `/api/billing/payment-methods` | List payment methods |
| POST | `/api/billing/payment-methods` | Add payment method |
| DELETE | `/api/billing/payment-methods/:id` | Remove payment method |
| PUT | `/api/billing/payment-methods/:id/default` | Set default |
| POST | `/api/billing/setup-intent` | Create Stripe setup intent |
| GET | `/api/billing/invoices` | List billing invoices |
| GET | `/api/billing/invoices/:id` | Get invoice details |
| GET | `/api/billing/invoices/:id/pdf` | Download PDF |
| GET | `/api/billing/usage` | Get current usage |

```typescript
// GET /api/billing/plans
// Response
{
  "success": true,
  "data": [
    {
      "planId": "free",
      "name": "Free",
      "priceMonthly": 0,
      "priceYearly": 0,
      "currency": "USD",
      "limits": { "users": 1, "cases": 10, "storageGB": 1 },
      "features": [...]
    },
    {
      "planId": "professional",
      "name": "Professional",
      "priceMonthly": 49.99,
      "priceYearly": 499.99,
      "currency": "USD",
      "limits": { "users": 10, "cases": -1, "storageGB": 50 },
      "features": [...]
    }
  ]
}

// GET /api/billing/usage
// Response
{
  "success": true,
  "data": {
    "plan": "professional",
    "usage": {
      "users": { "current": 5, "limit": 10, "percentage": 50 },
      "cases": { "current": 45, "limit": -1, "percentage": 0 },
      "storageGB": { "current": 12.5, "limit": 50, "percentage": 25 },
      "apiCallsThisMonth": { "current": 500, "limit": 10000, "percentage": 5 }
    }
  }
}
```

---

### 8. Document Versioning

**Base Path:** `/api/documents/:id/versions`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/:id/versions` | List all versions |
| POST | `/api/documents/:id/versions` | Upload new version |
| GET | `/api/documents/:id/versions/:version` | Get specific version |
| DELETE | `/api/documents/:id/versions/:version` | Delete version |
| POST | `/api/documents/:id/versions/:version/restore` | Restore as current |
| GET | `/api/documents/:id/versions/:version/download` | Download version |

---

### 9. Kanban/Pipeline Workflow

**Base Path:** `/api/pipelines`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pipelines` | Get pipelines |
| POST | `/api/pipelines` | Create pipeline |
| GET | `/api/pipelines/:id` | Get pipeline with stages |
| PUT | `/api/pipelines/:id` | Update pipeline |
| DELETE | `/api/pipelines/:id` | Delete pipeline |
| POST | `/api/pipelines/:id/stages` | Add stage |
| PUT | `/api/pipelines/:id/stages/:stageId` | Update stage |
| DELETE | `/api/pipelines/:id/stages/:stageId` | Remove stage |
| PUT | `/api/pipelines/:id/stages/reorder` | Reorder stages |

---

### 10. Inter-Company Transactions ⭐ NEW

**Base Path:** `/api/inter-company`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inter-company/transactions` | List transactions |
| POST | `/api/inter-company/transactions` | Create transaction |
| GET | `/api/inter-company/transactions/:id` | Get transaction |
| PUT | `/api/inter-company/transactions/:id` | Update transaction |
| POST | `/api/inter-company/transactions/:id/confirm` | Confirm |
| POST | `/api/inter-company/transactions/:id/cancel` | Cancel |
| GET | `/api/inter-company/balances` | Get balance matrix |
| GET | `/api/inter-company/balances/:firmId` | Get balance with firm |
| GET | `/api/inter-company/reconciliation` | Get items to reconcile |
| POST | `/api/inter-company/reconciliation` | Reconcile transactions |

```typescript
// POST /api/inter-company/transactions
// Request
{
  "targetFirmId": "507f1f77bcf86cd799439050",
  "transactionType": "sale", // 'sale', 'purchase', 'transfer', 'loan', 'reimbursement'
  "amount": 50000,
  "currency": "SAR",
  "transactionDate": "2025-01-15",
  "description": "Legal services rendered",
  "reference": "INV-2025-001"
}

// GET /api/inter-company/balances
// Response
{
  "success": true,
  "data": {
    "currentFirm": { "id": "...", "name": "Main Firm" },
    "balances": [
      {
        "firmId": "507f1f77bcf86cd799439050",
        "firmName": "Subsidiary Inc",
        "balance": 150000, // Positive = receivable, Negative = payable
        "direction": "receivable",
        "currency": "SAR",
        "transactionCount": 12,
        "lastTransactionDate": "2025-01-15"
      }
    ],
    "totalReceivable": 150000,
    "totalPayable": 0,
    "netPosition": 150000
  }
}
```

---

### 11. Consolidated Reporting ⭐ NEW

**Base Path:** `/api/reports/consolidated`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/consolidated/profit-loss` | Consolidated P&L |
| GET | `/api/reports/consolidated/balance-sheet` | Consolidated Balance Sheet |
| GET | `/api/reports/consolidated/cash-flow` | Consolidated Cash Flow |
| GET | `/api/reports/consolidated/comparison` | Company comparison |
| GET | `/api/reports/consolidated/eliminations` | View elimination entries |
| POST | `/api/reports/consolidated/eliminations` | Create manual elimination |

**Query Parameters:**
- `firmIds[]` - Array of firm IDs to include
- `startDate` / `endDate` - Date range
- `asOfDate` - For balance sheet
- `includeEliminations` - Include intercompany eliminations
- `currency` - Report currency

```typescript
// GET /api/reports/consolidated/profit-loss?startDate=2025-01-01&endDate=2025-12-31&includeEliminations=true
// Response
{
  "success": true,
  "report": "consolidated-profit-loss",
  "period": { "startDate": "2025-01-01", "endDate": "2025-12-31" },
  "currency": "SAR",
  "firms": [
    {
      "firmId": "...",
      "firmName": "Main Firm",
      "income": 1000000,
      "expenses": 600000,
      "netProfit": 400000,
      "profitMargin": "40.00%"
    }
  ],
  "eliminations": {
    "incomeEliminations": 50000,
    "expenseEliminations": 50000
  },
  "summary": {
    "totalIncome": 1950000,
    "totalExpenses": 1150000,
    "netProfit": 800000,
    "profitMargin": "41.03%",
    "firmCount": 3
  }
}
```

---

### 12. Lock Dates (Fiscal Period Management)

**Base Path:** `/api/lock-dates`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lock-dates` | Get lock date configuration |
| PUT | `/api/lock-dates` | Update lock dates |
| POST | `/api/lock-dates/check` | Check if date is locked |
| POST | `/api/lock-dates/period/lock` | Lock a fiscal period |
| POST | `/api/lock-dates/period/reopen` | Reopen a period |

---

### 13. Automated Actions

**Base Path:** `/api/automated-actions`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/automated-actions` | List automated actions |
| POST | `/api/automated-actions` | Create action |
| PUT | `/api/automated-actions/:id` | Update action |
| DELETE | `/api/automated-actions/:id` | Delete action |
| POST | `/api/automated-actions/:id/toggle` | Enable/disable |
| POST | `/api/automated-actions/:id/test` | Test with sample record |

---

## 🔑 Authentication

### JWT Token

All authenticated requests must include the JWT token:

```typescript
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
}
```

### Token Structure

The JWT token contains:
```typescript
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "firmId": "507f1f77bcf86cd799439012",
  "firmRole": "admin",
  "iat": 1642291200,
  "exp": 1642896000
}
```

**Note:** After calling `/api/firms/switch`, you'll receive a new token with the updated `firmId`. Always use the latest token.

---

## 📝 Common Response Formats

### Success Response
```typescript
{
  "success": true,
  "message": "Operation completed successfully", // optional
  "data": { ... }
}
```

### Paginated Response
```typescript
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

### Error Response
```typescript
{
  "success": false,
  "error": "Error message",
  "errorCode": "VALIDATION_ERROR", // optional
  "details": { ... } // optional
}
```

---

## 🔧 Environment Variables (For Reference)

The backend requires these environment variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/traf3li

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# CAPTCHA (optional)
RECAPTCHA_SECRET_KEY=xxx
HCAPTCHA_SECRET_KEY=xxx
TURNSTILE_SECRET_KEY=xxx

# Email
EMAIL_FROM=noreply@example.com
EMAIL_FROM_NAME=Traf3li

# URLs
FRONTEND_URL=https://app.traf3li.com
BACKEND_URL=https://api.traf3li.com
```

---

## ✅ Implementation Checklist for Frontend

### Phase 1 - Core
- [ ] Update all `companyId` references to `firmId`
- [ ] Update all `/api/companies/*` calls to `/api/firms/*`
- [ ] Implement firm switch with token refresh
- [ ] Store new JWT after firm switch

### Phase 2 - Communication
- [ ] Integrate chatter followers system
- [ ] Update message posting to use `res_model` and `res_id`
- [ ] Implement toggle follow functionality

### Phase 3 - Smart Features
- [ ] Integrate smart buttons for record counts
- [ ] Implement setup wizard flow
- [ ] Add activity scheduling

### Phase 4 - Settings
- [ ] Add SMTP configuration UI
- [ ] Add webhook management UI
- [ ] Implement billing/subscription UI

### Phase 5 - Authentication
- [ ] Add OAuth login buttons
- [ ] Integrate CAPTCHA on login/register
- [ ] Add LDAP login option (if enabled)

### Phase 6 - Enterprise
- [ ] Add inter-company transaction UI
- [ ] Implement consolidated reporting views
- [ ] Add lock date management

---

## 📞 Support

For questions about the API:
1. Check this documentation first
2. Review the API response for error details
3. Contact the backend team with the request/response details

---

*Document Version: 2.0*
*Last Updated: December 2025*
*Compatible with Backend Version: 2.x*
