# Admin Tools - Comprehensive System Management

This documentation covers the comprehensive admin tooling created for system management, data operations, and diagnostics.

## Overview

The admin tools provide a complete suite of administrative operations organized into four main categories:

1. **Data Management** - Export, import, merge, and delete operations
2. **Data Fixes** - Recalculation, reindexing, cleanup, and validation
3. **System Tools** - Statistics, monitoring, diagnostics, and cache management
4. **User Management** - Password reset, impersonation, account lock/unlock, and login history

## Files Created

### 1. Service Layer
**File:** `/home/user/traf3li-backend/src/services/adminTools.service.js`

Class-based service implementing all administrative operations with comprehensive error handling and audit logging.

### 2. Controller Layer
**File:** `/home/user/traf3li-backend/src/controllers/adminTools.controller.js`

Controllers for all admin endpoints with:
- Admin role verification
- Input validation and sanitization
- Comprehensive audit logging
- Error handling

### 3. Routes
**File:** `/home/user/traf3li-backend/src/routes/adminTools.route.js`

RESTful API routes with:
- Admin-only authentication
- Rate limiting (sensitive and public)
- OpenAPI/Swagger documentation
- Proper HTTP methods

## API Endpoints

### Data Management

#### Get User Data (GDPR Export)
```
GET /api/admin/tools/users/:id/data?format=json&includeRelated=true
```
Exports all user data including related records (cases, clients, invoices, documents, audit logs).

#### Delete User Data (GDPR Right to Erasure)
```
DELETE /api/admin/tools/users/:id/data
Body: { "anonymize": true, "cascade": false }
```
Deletes or anonymizes user data with optional cascade deletion of related records.

#### Export Firm Data
```
GET /api/admin/tools/firms/:id/export?format=json
```
Exports complete firm data including users, cases, clients, invoices, and payments.

#### Import Firm Data
```
POST /api/admin/tools/firms/:id/import
Body: { "clients": [...], "cases": [...] }
```
Imports data into a firm with transaction safety.

#### Merge Users
```
POST /api/admin/tools/users/merge
Body: { "sourceUserId": "...", "targetUserId": "..." }
```
Merges duplicate users by updating all references and deleting the source user.

#### Merge Clients
```
POST /api/admin/tools/clients/merge
Body: { "sourceClientId": "...", "targetClientId": "..." }
```
Merges duplicate clients by updating all references and deleting the source client.

### Data Fixes

#### Recalculate Invoice Totals
```
POST /api/admin/tools/firms/:id/recalculate-invoices
```
Fixes invoice calculation issues by recalculating all totals.

#### Reindex Search Data
```
POST /api/admin/tools/firms/:id/reindex
```
Rebuilds search indexes for cases, clients, and invoices.

#### Cleanup Orphaned Records
```
POST /api/admin/tools/firms/:id/cleanup-orphaned
```
Finds and removes records with missing references (orphaned data).

#### Validate Data Integrity
```
GET /api/admin/tools/firms/:id/validate
```
Runs comprehensive data integrity checks and reports issues.

#### Fix Currency Conversions
```
POST /api/admin/tools/firms/:id/fix-currency
```
Validates and fixes currency conversion issues.

### System Tools

#### Get System Statistics
```
GET /api/admin/tools/stats
```
Returns system-wide statistics (users, firms, cases, clients, invoices, cache stats).

#### Get User Activity Report
```
GET /api/admin/tools/activity-report?startDate=2024-01-01&endDate=2024-12-31
```
Generates user activity report for a date range.

#### Get Storage Usage
```
GET /api/admin/tools/storage-usage?firmId=optional
```
Reports storage usage by firm or system-wide.

#### Clear Cache
```
POST /api/admin/tools/clear-cache
Body: { "pattern": "user:*" }
```
Clears cache entries matching a pattern.

#### Run Diagnostics
```
GET /api/admin/tools/diagnostics
```
Runs system diagnostics (database, cache, system health).

#### Get Slow Queries
```
GET /api/admin/tools/slow-queries?startDate=2024-01-01&endDate=2024-12-31
```
Reports slow database queries (placeholder for future implementation).

### User Management

#### Reset User Password
```
POST /api/admin/tools/users/:id/reset-password
```
Generates temporary password and sends email to user.

#### Impersonate User
```
POST /api/admin/tools/users/:id/impersonate
```
Creates an impersonation session for admin to act as user (1 hour expiry).

#### End Impersonation
```
POST /api/admin/tools/impersonation/:sessionId/end
```
Ends an active impersonation session.

#### Lock User Account
```
POST /api/admin/tools/users/:id/lock
Body: { "reason": "administrative_action" }
```
Locks user account and terminates all active sessions.

#### Unlock User Account
```
POST /api/admin/tools/users/:id/unlock
```
Unlocks a locked user account.

#### Get Login History
```
GET /api/admin/tools/users/:id/login-history?limit=50
```
Retrieves login history for a user from audit logs.

## Security Features

### Authentication & Authorization
- All endpoints require authentication via JWT token
- Admin role verification on every request
- Unauthorized access attempts are logged to audit trail

### Audit Logging
All administrative actions are logged with:
- Admin user ID and email
- Target resource ID
- Action performed
- IP address and user agent
- Severity level (low, medium, high, critical)
- Detailed context and results

### Rate Limiting
- **Sensitive operations**: 3 requests per hour (password reset, impersonation, account lock/unlock, data deletion)
- **Normal operations**: 100 requests per 15 minutes (viewing data, reports, statistics)

### Input Validation
- All user inputs are sanitized
- Object IDs are validated
- String inputs are sanitized for XSS prevention
- Request bodies are validated for required fields

### Data Protection
- User passwords are excluded from exports
- MFA secrets are never exposed
- Sensitive data is filtered from responses
- Proper error messages without data leakage

## Usage Examples

### Example 1: Export User Data (GDPR Request)
```bash
curl -X GET \
  'http://localhost:5000/api/admin/tools/users/507f1f77bcf86cd799439011/data?format=json&includeRelated=true' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN'
```

### Example 2: Merge Duplicate Users
```bash
curl -X POST \
  'http://localhost:5000/api/admin/tools/users/merge' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "sourceUserId": "507f1f77bcf86cd799439011",
    "targetUserId": "507f1f77bcf86cd799439012"
  }'
```

### Example 3: Run System Diagnostics
```bash
curl -X GET \
  'http://localhost:5000/api/admin/tools/diagnostics' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN'
```

### Example 4: Clear Cache
```bash
curl -X POST \
  'http://localhost:5000/api/admin/tools/clear-cache' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{ "pattern": "user:*" }'
```

## Error Handling

All endpoints return consistent error responses:

### Success Response
```json
{
  "error": false,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": true,
  "message": "Error description"
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not admin)
- `404` - Not Found
- `500` - Internal Server Error

## Audit Log Examples

All admin actions create detailed audit logs:

```javascript
{
  action: 'admin_merge_users',
  entityType: 'user',
  entityId: '507f1f77bcf86cd799439012',
  userId: '507f1f77bcf86cd799439000', // Admin user ID
  userEmail: 'admin@example.com',
  userRole: 'admin',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  severity: 'critical',
  details: {
    sourceUserId: '507f1f77bcf86cd799439011',
    targetUserId: '507f1f77bcf86cd799439012',
    mergedRecords: {
      cases: 5,
      clients: 3,
      invoices: 12,
      documents: 8
    }
  },
  timestamp: '2024-12-25T10:30:00.000Z'
}
```

## Best Practices

1. **Always review before deletion**: Use `getUserData` or `exportFirmData` before deletion
2. **Use anonymization**: Prefer `anonymize: true` over hard deletion for GDPR compliance
3. **Test in development**: Test all operations in development environment first
4. **Monitor audit logs**: Regularly review audit logs for admin actions
5. **Rate limit awareness**: Be mindful of rate limits on sensitive operations
6. **Transaction safety**: All merge and deletion operations use database transactions
7. **Backup first**: Create backups before running data fix operations

## Future Enhancements

Potential improvements for future versions:

1. **Slow Query Detection**: Implement actual MongoDB profiling integration
2. **Scheduled Maintenance**: Add cron job scheduling for routine maintenance
3. **Bulk Operations**: Add batch processing for multiple users/firms
4. **Data Migration Tools**: Enhanced tools for data migration between environments
5. **Performance Metrics**: Real-time performance monitoring and alerting
6. **Automated Cleanup**: Scheduled cleanup jobs for orphaned data
7. **Export Formats**: Additional export formats (CSV, Excel, XML)
8. **Rollback Capability**: Transaction rollback for critical operations

## Support

For issues or questions:
- Check audit logs for operation details
- Review error messages and status codes
- Ensure admin role is properly assigned
- Verify JWT token is valid and not expired
- Check rate limiting if operations are blocked

## Changelog

### Version 1.0.0 (2024-12-25)
- Initial release
- Complete data management suite
- Data integrity fixes
- System monitoring tools
- User management operations
- Comprehensive audit logging
- GDPR compliance features
