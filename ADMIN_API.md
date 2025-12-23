# Admin API Documentation

Comprehensive Admin API endpoints for integration with low-code platforms like **Appsmith** and **Budibase**.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Rate Limiting](#rate-limiting)
- [Security Features](#security-features)
- [API Endpoints](#api-endpoints)
  - [Dashboard](#dashboard-endpoints)
  - [Users](#user-management-endpoints)
  - [Audit](#audit-and-compliance-endpoints)
  - [Firms](#firm-management-endpoints)
- [Integration Examples](#integration-examples)
  - [Appsmith Integration](#appsmith-integration)
  - [Budibase Integration](#budibase-integration)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

The Admin API provides comprehensive endpoints for building admin dashboards and management panels. It's designed to integrate seamlessly with low-code platforms while maintaining enterprise-grade security and audit trails.

**Key Features:**
- Real-time dashboard metrics
- User management with role-based access
- Complete audit logging
- Firm/organization management
- Data export (CSV/JSON)
- Multi-tenancy support
- IP whitelisting
- Comprehensive security

---

## Authentication

All Admin API endpoints require authentication via JWT Bearer token.

### Getting an Access Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "...",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

### Using the Token

Include the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Base URL

```
https://your-domain.com/api/admin-api
```

All endpoints described in this document are relative to this base URL.

---

## Rate Limiting

Admin API endpoints have generous rate limits:

- **Standard endpoints**: 500 requests per 15 minutes
- **Sensitive operations**: 3 requests per hour
- **Rate limit headers**: Included in all responses

**Response when rate limited:**
```json
{
  "error": true,
  "message": "Too many admin requests - Please slow down",
  "code": "ADMIN_RATE_LIMIT_EXCEEDED"
}
```

---

## Security Features

### 1. Admin Role Verification
All endpoints verify that the authenticated user has the `admin` role.

### 2. Audit Logging
Every admin action is logged with:
- User ID and email
- IP address and user agent
- Action performed
- Timestamp
- Result (success/failure)

### 3. Multi-Tenancy
Firm admins can only access data from their own firm. Super admins (no firm association) can access all data.

### 4. IP Whitelisting (Optional)
Configure `ADMIN_IP_WHITELIST` environment variable:
```
ADMIN_IP_WHITELIST=192.168.1.100,203.0.113.45,198.51.100.0/24
```

### 5. Sensitive Operations
High-risk operations (user suspension, password reset) have additional rate limiting and require explicit confirmation.

---

## API Endpoints

### Dashboard Endpoints

#### Get Dashboard Summary
```http
GET /dashboard/summary
```

Returns comprehensive overview statistics.

**Response:**
```json
{
  "error": false,
  "data": {
    "users": {
      "total": 1250,
      "activeToday": 342,
      "activeThisMonth": 890,
      "newThisMonth": 45,
      "growthRate": 12.5
    },
    "firms": {
      "total": 25,
      "active": 23
    },
    "cases": {
      "total": 3450,
      "active": 1200,
      "closed": 2250
    },
    "revenue": {
      "total": 450000,
      "thisMonth": 45000,
      "lastMonth": 42000,
      "growthRate": 7.14
    }
  }
}
```

#### Get Revenue Metrics
```http
GET /dashboard/revenue?months=12
```

Returns financial analytics and revenue breakdown.

**Query Parameters:**
- `months` (optional): Number of months to include (default: 12)

**Response:**
```json
{
  "error": false,
  "data": {
    "summary": {
      "totalRevenue": 450000,
      "avgMonthlyRevenue": 37500,
      "periodMonths": 12
    },
    "byMonth": [
      {
        "_id": { "year": 2025, "month": 1 },
        "revenue": 45000,
        "count": 120
      }
    ],
    "byPaymentMethod": [
      {
        "_id": "credit_card",
        "revenue": 350000,
        "count": 850
      }
    ],
    "topClients": [
      {
        "userId": "...",
        "name": "John Doe",
        "email": "john@example.com",
        "totalPaid": 15000,
        "paymentCount": 12
      }
    ]
  }
}
```

#### Get Active Users
```http
GET /dashboard/active-users
```

Returns user activity metrics.

**Response:**
```json
{
  "error": false,
  "data": {
    "activeUsers": {
      "last24Hours": 342,
      "last7Days": 890,
      "last30Days": 1100
    },
    "byRole": [
      { "_id": "lawyer", "count": 450, "active": 320 },
      { "_id": "client", "count": 750, "active": 520 }
    ],
    "recentlyActive": [
      {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "role": "lawyer",
        "lastLogin": "2025-12-23T10:30:00Z"
      }
    ]
  }
}
```

#### Get System Health
```http
GET /dashboard/system-health
```

Returns system status and performance metrics.

**Response:**
```json
{
  "error": false,
  "data": {
    "database": {
      "status": "connected",
      "healthy": true,
      "collections": 85,
      "dataSize": "2450.50 MB",
      "indexes": 120
    },
    "server": {
      "uptime": "168.25 hours",
      "nodeVersion": "v18.19.0",
      "memory": {
        "rss": "245.50",
        "heapUsed": "180.25"
      }
    },
    "errors": {
      "last24Hours": 3
    },
    "security": {
      "incidentsLast7Days": 0
    }
  }
}
```

#### Get Pending Approvals
```http
GET /dashboard/pending-approvals?limit=20&skip=0
```

Returns items requiring admin attention.

**Query Parameters:**
- `limit`: Number of results (default: 20)
- `skip`: Pagination offset (default: 0)

#### Get Recent Activity
```http
GET /dashboard/recent-activity?limit=50&skip=0
```

Returns recent audit log entries.

---

### User Management Endpoints

#### List Users
```http
GET /users?limit=20&skip=0&role=lawyer&status=active&search=john
```

Returns paginated user list with filtering.

**Query Parameters:**
- `limit`: Results per page (max: 100, default: 20)
- `skip`: Pagination offset
- `role`: Filter by role (`admin`, `lawyer`, `client`, `staff`)
- `status`: Filter by status (`active`, `suspended`, `banned`, `deleted`)
- `verified`: Filter by verification (`true`, `false`)
- `search`: Search by name or email
- `sortBy`: Sort field (`createdAt`, `lastLogin`, `firstName`, `email`)
- `sortOrder`: Sort direction (`asc`, `desc`)
- `createdFrom`: Filter by creation date (ISO 8601)
- `createdTo`: Filter by creation date (ISO 8601)

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "lawyer",
      "status": "active",
      "isVerified": true,
      "createdAt": "2025-01-15T10:00:00Z",
      "lastLogin": "2025-12-23T09:30:00Z",
      "firmId": {
        "_id": "...",
        "name": "Law Firm Inc"
      }
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 20,
    "skip": 0,
    "page": 1,
    "pages": 63
  }
}
```

#### Get User Details
```http
GET /users/{userId}
```

Returns comprehensive user information with activity.

**Response:**
```json
{
  "error": false,
  "data": {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "lawyer",
    "status": "active",
    "activity": {
      "cases": 45,
      "invoices": 120,
      "totalPayments": 35000,
      "recentActions": [
        {
          "action": "create_case",
          "resourceType": "case",
          "status": "SUCCESS",
          "createdAt": "2025-12-23T09:00:00Z"
        }
      ]
    },
    "firmId": {
      "_id": "...",
      "name": "Law Firm Inc"
    }
  }
}
```

#### Update User Status
```http
PATCH /users/{userId}/status
Content-Type: application/json

{
  "status": "suspended",
  "reason": "Policy violation"
}
```

**Request Body:**
- `status` (required): `active`, `suspended`, `banned`, `deleted`
- `reason` (optional): Reason for status change

**Response:**
```json
{
  "error": false,
  "message": "User status updated to suspended",
  "data": {
    "userId": "...",
    "email": "john@example.com",
    "oldStatus": "active",
    "newStatus": "suspended"
  }
}
```

#### Revoke User Tokens
```http
POST /users/{userId}/revoke-tokens
Content-Type: application/json

{
  "reason": "security_incident",
  "notes": "Suspicious activity detected"
}
```

Logs out user from all devices.

**Request Body:**
- `reason` (optional): `admin_revoke`, `security_incident`, `account_suspended`, `account_deleted`
- `notes` (optional): Additional context

#### Reset User Password
```http
POST /users/{userId}/reset-password
Content-Type: application/json

{
  "newPassword": "TempPass123!",
  "sendEmail": true
}
```

**Request Body:**
- `newPassword` (optional): If not provided, random password is generated
- `sendEmail` (optional): Send email notification (default: true)

**Response:**
```json
{
  "error": false,
  "message": "Password reset successfully",
  "data": {
    "userId": "...",
    "email": "john@example.com",
    "temporaryPassword": "RandomPass123!",
    "mustChangePassword": true
  }
}
```

#### Export Users
```http
GET /users/export?format=csv
```

Export users to CSV or JSON.

**Query Parameters:**
- `format`: `csv` or `json` (default: json)

**Response (CSV):**
```csv
First Name,Last Name,Email,Role,Status,Verified,Created At,Last Login
John,Doe,john@example.com,lawyer,active,Yes,2025-01-15T10:00:00Z,2025-12-23T09:30:00Z
```

---

### Audit and Compliance Endpoints

#### Get Audit Logs
```http
GET /audit/logs?limit=100&action=login&status=FAILED&severity=high
```

Returns audit logs with filtering.

**Query Parameters:**
- `limit`: Results per page (max: 1000, default: 100)
- `skip`: Pagination offset
- `action`: Filter by action
- `resourceType`: Filter by resource type
- `status`: `SUCCESS` or `FAILED`
- `severity`: `low`, `medium`, `high`, `critical`
- `userId`: Filter by user
- `userEmail`: Filter by email
- `ipAddress`: Filter by IP
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "_id": "...",
      "action": "admin_update_user_status",
      "resourceType": "user",
      "resourceId": "...",
      "status": "SUCCESS",
      "userId": "...",
      "userEmail": "admin@example.com",
      "createdAt": "2025-12-23T10:00:00Z",
      "details": {
        "severity": "high",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "oldStatus": "active",
        "newStatus": "suspended"
      }
    }
  ],
  "pagination": {
    "total": 5420,
    "limit": 100,
    "skip": 0,
    "page": 1,
    "pages": 55
  }
}
```

#### Get Security Events
```http
GET /audit/security-events?limit=50&startDate=2025-12-01
```

Returns high-severity security events.

#### Get Compliance Report
```http
GET /audit/compliance-report?startDate=2025-11-01&endDate=2025-12-31
```

Generates comprehensive compliance report.

**Response:**
```json
{
  "error": false,
  "data": {
    "period": {
      "startDate": "2025-11-01T00:00:00Z",
      "endDate": "2025-12-31T23:59:59Z",
      "days": 61
    },
    "summary": {
      "totalActions": 15420,
      "failedActions": 245,
      "successRate": "98.41",
      "securityIncidents": 2,
      "adminActions": 1250,
      "dataExports": 45,
      "userModifications": 89,
      "passwordResets": 156,
      "loginAttempts": 8900
    },
    "breakdown": {
      "byAction": [...],
      "bySeverity": [...],
      "topUsers": [...]
    }
  }
}
```

#### Export Audit Logs
```http
GET /audit/export?format=csv&startDate=2025-12-01&endDate=2025-12-31
```

Export audit logs for compliance.

**Query Parameters:**
- `format`: `csv` or `json` (required)
- `startDate`: Start date (required)
- `endDate`: End date (required)

#### Get Login History
```http
GET /audit/login-history?userId=...&limit=100
```

Returns user login/logout history.

---

### Firm Management Endpoints

> **Note:** Most firm endpoints require **Super Admin** access (admin users without a firmId).

#### List Firms
```http
GET /firms?limit=20&skip=0&status=active&search=law
```

Returns all firms with statistics (Super Admin only).

**Query Parameters:**
- `limit`: Results per page (max: 100, default: 20)
- `skip`: Pagination offset
- `status`: Filter by status (`active`, `suspended`, `trial`, `cancelled`)
- `search`: Search by name or email
- `sortBy`: Sort field
- `sortOrder`: `asc` or `desc`
- `createdFrom`: Creation date filter
- `createdTo`: Creation date filter

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "_id": "...",
      "name": "Law Firm Inc",
      "email": "info@lawfirm.com",
      "status": "active",
      "createdAt": "2025-01-01T00:00:00Z",
      "stats": {
        "users": 45,
        "cases": 320,
        "activeCases": 120,
        "invoices": 890,
        "revenue": 145000
      },
      "subscription": {
        "plan": "professional",
        "status": "active"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "skip": 0,
    "page": 1,
    "pages": 2
  }
}
```

#### Get Firm Details
```http
GET /firms/{firmId}
```

Returns comprehensive firm information.

**Response:**
```json
{
  "error": false,
  "data": {
    "_id": "...",
    "name": "Law Firm Inc",
    "email": "info@lawfirm.com",
    "status": "active",
    "stats": {
      "users": 45,
      "usersByRole": [...],
      "cases": 320,
      "activeCases": 120,
      "invoices": 890,
      "totalRevenue": 145000,
      "revenueByMonth": [...]
    },
    "users": [...],
    "subscription": {
      "plan": "professional",
      "status": "active"
    }
  }
}
```

#### Get Firm Usage
```http
GET /firms/{firmId}/usage?days=30
```

Returns usage metrics for a firm.

**Query Parameters:**
- `days`: Number of days to include (default: 30)

#### Update Firm Plan
```http
PATCH /firms/{firmId}/plan
Content-Type: application/json

{
  "plan": "enterprise",
  "status": "active",
  "notes": "Upgraded for growth"
}
```

**Request Body:**
- `plan` (required): `free`, `basic`, `professional`, `enterprise`
- `status` (optional): `active`, `cancelled`, `trial`
- `notes` (optional): Reason for change

#### Suspend Firm
```http
PATCH /firms/{firmId}/suspend
Content-Type: application/json

{
  "suspend": true,
  "reason": "Non-payment"
}
```

Suspends or unsuspends a firm and all its users.

**Request Body:**
- `suspend` (required): `true` to suspend, `false` to activate
- `reason` (optional): Reason for action

---

## Integration Examples

### Appsmith Integration

#### Setting Up Authentication

1. **Create API Data Source:**
   - Name: `Admin API`
   - URL: `https://your-domain.com/api/admin-api`
   - Headers:
     ```
     Authorization: Bearer {{appsmith.store.accessToken}}
     Content-Type: application/json
     ```

2. **Create Login Query:**
```javascript
// API: POST /api/auth/login
{
  "email": "{{emailInput.text}}",
  "password": "{{passwordInput.text}}"
}

// On Success:
storeValue('accessToken', response.data.accessToken);
storeValue('adminUser', response.data.user);
navigateTo('Dashboard');
```

#### Dashboard Widget

```javascript
// Query: getDashboardSummary
// API: GET /dashboard/summary
// Run on page load: Yes

// Display in Chart Widget:
{{getDashboardSummary.data.users.total}}
{{getDashboardSummary.data.revenue.thisMonth}}

// Revenue Chart Data:
{
  "x": getRevenueMetrics.data.byMonth.map(m => `${m._id.year}-${m._id.month}`),
  "y": getRevenueMetrics.data.byMonth.map(m => m.revenue)
}
```

#### User Management Table

```javascript
// Query: getUsers
// API: GET /users
// Params:
{
  "limit": {{Table1.pageSize}},
  "skip": {{Table1.pageOffset}},
  "search": {{searchInput.text}},
  "role": {{roleFilter.selectedOptionValue}},
  "status": {{statusFilter.selectedOptionValue}}
}

// Table Configuration:
// - Data: {{getUsers.data}}
// - Server Side Pagination: Yes
// - Total Records: {{getUsers.pagination.total}}
```

#### User Actions

```javascript
// Suspend User Button
// Query: suspendUser
// API: PATCH /users/{{Table1.selectedRow._id}}/status
{
  "status": "suspended",
  "reason": "{{reasonInput.text}}"
}

// On Success:
showAlert('User suspended successfully', 'success');
getUsers.run();
```

---

### Budibase Integration

#### Creating REST Data Source

1. **Add REST API Data Source:**
   - Name: `Admin API`
   - Base URL: `https://your-domain.com/api/admin-api`
   - Default Headers:
     ```json
     {
       "Authorization": "Bearer {{ user.accessToken }}",
       "Content-Type": "application/json"
     }
     ```

#### Dashboard Queries

```javascript
// Query Name: Dashboard Summary
// Method: GET
// URL: /dashboard/summary

// Binding to Components:
{{ data.users.total }}
{{ data.revenue.thisMonth }}
```

#### User List with Filters

```javascript
// Query Name: List Users
// Method: GET
// URL: /users
// Query Params:
{
  "limit": 20,
  "skip": {{ table.pageNumber * 20 }},
  "search": {{ searchBox.value }},
  "role": {{ roleDropdown.value }}
}

// Bind to Table:
// Data Provider: List Users Query
// Columns: firstName, lastName, email, role, status
```

#### User Management Actions

```javascript
// Update User Status
// Query Name: Update User Status
// Method: PATCH
// URL: /users/{{ selectedUserId }}/status
// Body:
{
  "status": {{ statusDropdown.value }},
  "reason": {{ reasonTextArea.value }}
}

// On Success Binding:
{{ notifications.success("User status updated") }}
{{ listUsers.refresh() }}
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": true,
  "message": "Error message in primary language",
  "messageEn": "Error message in English",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Authentication required
- `ADMIN_ONLY` (403): Admin access required
- `SUPER_ADMIN_ONLY` (403): Super admin access required
- `FIRM_ACCESS_DENIED` (403): Cannot access different firm's data
- `NOT_FOUND` (404): Resource not found
- `INVALID_INPUT` (400): Invalid request parameters
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `ADMIN_RATE_LIMIT_EXCEEDED` (429): Admin rate limit exceeded
- `SENSITIVE_RATE_LIMIT_EXCEEDED` (429): Sensitive operation limit exceeded

### Example Error Response

```json
{
  "error": true,
  "message": "Admin access required",
  "code": "ADMIN_ONLY"
}
```

---

## Best Practices

### 1. Security

- **Always use HTTPS** in production
- **Store tokens securely** (never in localStorage if possible)
- **Implement token refresh** to maintain sessions
- **Configure IP whitelist** for additional security
- **Monitor audit logs** regularly
- **Use environment variables** for sensitive configuration

### 2. Performance

- **Implement pagination** for all list endpoints
- **Cache dashboard metrics** when appropriate
- **Use filters** to reduce data transfer
- **Batch operations** when possible
- **Monitor rate limits** to avoid throttling

### 3. User Experience

- **Show loading states** during API calls
- **Display friendly error messages** from API responses
- **Implement retry logic** for failed requests
- **Provide search and filters** for large data sets
- **Add confirmation dialogs** for destructive actions

### 4. Audit Trail

- **Review audit logs** regularly
- **Export logs** for compliance
- **Monitor security events** for suspicious activity
- **Document all admin actions** with proper reasons
- **Implement alerts** for critical events

### 5. Multi-Tenancy

- **Respect firm boundaries** in queries
- **Filter data by firmId** for firm admins
- **Use super admin carefully** for cross-firm operations
- **Validate firm access** before operations
- **Test with different admin types** (super admin vs firm admin)

---

## Support

For questions or issues:
- **Technical Support**: support@your-domain.com
- **Security Issues**: security@your-domain.com
- **API Status**: https://status.your-domain.com

---

## Changelog

### Version 1.0.0 (2025-12-23)
- Initial release
- Dashboard endpoints
- User management endpoints
- Audit and compliance endpoints
- Firm management endpoints
- Complete OpenAPI documentation
- Appsmith and Budibase integration examples

---

**Last Updated:** 2025-12-23
