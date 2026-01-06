# Miscellaneous Modules API Summary

This document summarizes all API endpoints documented in `/contract2/types/misc.ts`.

## Overview

**Total Endpoints Documented: 82**

## Module Breakdown

### 1. Support Module (16 endpoints)
Comprehensive ticket and SLA management system for customer support operations.

#### Statistics & Settings (3)
- `GET /api/support/stats` - Get support statistics
- `GET /api/support/settings` - Get support settings
- `PUT /api/support/settings` - Update support settings

#### Tickets (8)
- `GET /api/support/tickets` - Get all tickets (with filters: status, priority, type, assignedTo, raisedBy, clientId, search, pagination)
- `POST /api/support/tickets` - Create new ticket
- `GET /api/support/tickets/:id` - Get single ticket
- `PUT /api/support/tickets/:id` - Update ticket
- `DELETE /api/support/tickets/:id` - Delete ticket
- `POST /api/support/tickets/:id/reply` - Reply to ticket
- `POST /api/support/tickets/:id/resolve` - Resolve ticket
- `POST /api/support/tickets/:id/close` - Close ticket

#### SLAs (5)
- `GET /api/support/slas` - Get all SLAs
- `POST /api/support/slas` - Create new SLA
- `GET /api/support/slas/:id` - Get single SLA
- `PUT /api/support/slas/:id` - Update SLA
- `DELETE /api/support/slas/:id` - Delete SLA

---

### 2. Audit Log Module (33 endpoints)
Enterprise-grade compliance and security audit trail system with archiving, analytics, and compliance reporting.

#### Basic Queries (11)
- `GET /api/audit-logs` - List all audit logs with filters
- `GET /api/audit-logs/entity/:type/:id` - Get audit trail for specific entity
- `GET /api/audit-logs/user/:id` - Get activity for specific user
- `GET /api/audit-logs/security` - Get security events (failed logins, permission changes)
- `GET /api/audit-logs/export` - Export audit logs to CSV or JSON
- `GET /api/audit-logs/failed-logins` - Get recent failed login attempts
- `GET /api/audit-logs/suspicious` - Get suspicious activity
- `POST /api/audit-logs/check-brute-force` - Check for brute force attempts
- `GET /api/audit-logs/summary` - Get daily/weekly/monthly audit summary
- `GET /api/audit-logs/security-events` - Get security-related events (enhanced)
- `GET /api/audit-logs/compliance-report` - Generate compliance report

#### Archiving (5)
- `GET /api/audit-logs/archiving/stats` - Get archiving statistics
- `GET /api/audit-logs/archiving/summary` - Get archive summary with statistics
- `POST /api/audit-logs/archiving/run` - Manually trigger audit log archiving
- `POST /api/audit-logs/archiving/verify` - Verify archive integrity
- `POST /api/audit-logs/archiving/restore` - Restore archived logs back to main collection

#### Enhanced Logging (3)
- `POST /api/audit-logs/log-with-diff` - Log with automatic diff calculation
- `POST /api/audit-logs/log-bulk-action` - Log bulk action
- `POST /api/audit-logs/log-security-event` - Log security event

#### Search & Query (3)
- `GET /api/audit-logs/search` - Full-text search across audit logs
- `GET /api/audit-logs/by-action/:action` - Get logs by action type
- `GET /api/audit-logs/by-date-range` - Get logs within a date range

#### Analytics (4)
- `GET /api/audit-logs/analytics/activity-summary` - Get activity summary
- `GET /api/audit-logs/analytics/top-users` - Get most active users
- `GET /api/audit-logs/analytics/top-actions` - Get most common actions
- `GET /api/audit-logs/analytics/anomalies` - Detect anomalies

#### Compliance (4)
- `POST /api/audit-logs/compliance/generate-report` - Generate compliance report
- `POST /api/audit-logs/compliance/verify-integrity` - Verify log integrity
- `POST /api/audit-logs/compliance/export-for-audit` - Export for external auditors
- `GET /api/audit-logs/compliance/retention-status` - Get retention status

#### Archive Management (3)
- `GET /api/audit-logs/archive/stats` - Get archive statistics
- `POST /api/audit-logs/archive/run` - Trigger archiving
- `POST /api/audit-logs/archive/verify` - Verify archive integrity

---

### 3. Approval Module (8 endpoints)
Multi-level approval workflow system with backward compatibility for old approval system.

#### Approval Rules (Old System) (2)
- `GET /api/approvals/rules` - Get approval rules for the firm
- `PUT /api/approvals/rules` - Update all approval rules

#### Pending Approvals (2)
- `GET /api/approvals/pending` - Get pending approvals for current user
- `GET /api/approvals/history` - Get approval history

#### Individual Approval Requests (4)
- `GET /api/approvals/:id` - Get approval request details
- `POST /api/approvals/:id/approve` - Approve a request
- `POST /api/approvals/:id/reject` - Reject a request
- `POST /api/approvals/:id/cancel` - Cancel a request (by requester)

**Note:** The controller also contains endpoints for a new workflow system (workflows CRUD, initiate approval, record decision, delegate approval) but these are not yet exposed in the routes file.

---

### 4. Health Module (9 endpoints)
Comprehensive system health monitoring with multiple probe types for Kubernetes compatibility.

#### Basic Health Checks (6)
- `GET /health` - Basic health check for load balancers
- `GET /health/live` - Kubernetes liveness probe
- `GET /health/ready` - Kubernetes readiness probe (checks database & cache)
- `GET /health/detailed` - Comprehensive health check (requires auth)
- `GET /health/deep` - Deep health check with all service checks (requires auth)
- `GET /health/ping` - Simple ping endpoint

#### Monitoring (3)
- `GET /health/circuits` - Circuit breaker status for external services (requires auth)
- `GET /health/cache` - Cache performance stats (requires auth)
- `GET /health/debug-auth` - Debug endpoint for auth/cookie issues (requires auth)

---

### 5. Webhook Module (16 endpoints)
Event notification system for third-party integrations with signature verification, retry logic, and delivery tracking.

#### Informational (2)
- `GET /api/webhooks/stats` - Get webhook statistics
- `GET /api/webhooks/events` - Get available webhook events

#### CRUD Operations (6)
- `POST /api/webhooks` - Register a new webhook
- `GET /api/webhooks` - Get all webhooks for the firm
- `GET /api/webhooks/:id` - Get single webhook by ID
- `PUT /api/webhooks/:id` - Update webhook
- `PATCH /api/webhooks/:id` - Update webhook (partial update)
- `DELETE /api/webhooks/:id` - Delete webhook

#### Webhook Actions (5)
- `POST /api/webhooks/:id/test` - Test webhook - send test event
- `POST /api/webhooks/:id/enable` - Enable webhook
- `POST /api/webhooks/:id/disable` - Disable webhook
- `GET /api/webhooks/:id/secret` - Get webhook secret (admin only)
- `POST /api/webhooks/:id/regenerate-secret` - Regenerate webhook secret

#### Delivery Management (3)
- `GET /api/webhooks/:id/deliveries` - Get webhook deliveries (history)
- `GET /api/webhooks/:id/deliveries/:deliveryId` - Get single delivery details
- `POST /api/webhooks/:id/deliveries/:deliveryId/retry` - Retry failed delivery

---

## Type Definitions

The TypeScript definitions include:

### Common Types
- `ApiResponse<T>` - Standard API response wrapper
- `PaginatedResponse<T>` - Paginated response with metadata
- `ObjectId` - MongoDB ObjectId type (string)

### Support Module Types
- **Enums:** `TicketStatus`, `TicketPriority`, `TicketType`, `SLAStatus`
- **Main Types:** `SupportTicket`, `SupportSLA`, `SupportStats`, `SupportSettings`
- **Request Types:** `CreateTicketRequest`, `UpdateTicketRequest`, `CreateSLARequest`, `UpdateSLARequest`, `ReplyToTicketRequest`, `UpdateSettingsRequest`
- **Query Types:** `GetTicketsQuery`

### Audit Log Module Types
- **Enums:** `AuditLogStatus`, `AuditLogSeverity`, `AuditLogAction`, `ComplianceStandard`
- **Main Types:** `AuditLog`, `AuditSummary`, `ComplianceReport`, `ArchivingStats`, `ArchiveSummary`
- **Request Types:** `LogWithDiffRequest`, `LogBulkActionRequest`, `LogSecurityEventRequest`, `GenerateComplianceReportRequest`, `VerifyLogIntegrityRequest`, `ExportForAuditRequest`, `RunArchivingRequest`, `VerifyArchiveIntegrityRequest`, `RestoreArchivedLogsRequest`, `CheckBruteForceRequest`
- **Query Types:** `GetAuditLogsQuery`, `GetEntityAuditTrailQuery`, `GetUserActivityQuery`, `GetSecurityEventsQuery`, `ExportAuditLogsQuery`, `GetFailedLoginsQuery`, `GetAuditSummaryQuery`, `SearchLogsQuery`, etc.

### Approval Module Types
- **Enums:** `ApprovalStatus`, `ApprovalDecision`, `ApprovalEntityType`
- **Main Types:** `ApprovalRule`, `ApprovalRequest`, `ApprovalWorkflow`, `ApprovalInstance`
- **Request Types:** `UpdateApprovalRulesRequest`, `ApproveRequestRequest`, `RejectRequestRequest`, `CreateWorkflowRequest`, `UpdateWorkflowRequest`, `InitiateApprovalRequest`, `RecordDecisionRequest`, `CancelApprovalRequest`, `DelegateApprovalRequest`
- **Query Types:** `ListWorkflowsQuery`, `GetPendingApprovalsQuery`, `GetApprovalHistoryQuery`

### Health Module Types
- **Main Types:** `BasicHealthResponse`, `LivenessProbeResponse`, `ReadinessProbeResponse`, `DetailedHealthResponse`, `DeepHealthResponse`, `ServiceHealth`, `SystemInfo`, `PingResponse`, `CircuitBreakerStatus`, `CacheStats`, `DebugAuthResponse`

### Webhook Module Types
- **Enums:** `WebhookEvent`, `WebhookStatus`, `DeliveryStatus`
- **Main Types:** `Webhook`, `WebhookDelivery`, `WebhookStats`, `AvailableEventsResponse`, `GetWebhookSecretResponse`, `RegenerateSecretResponse`
- **Request Types:** `RegisterWebhookRequest`, `UpdateWebhookRequest`, `TestWebhookRequest`, `DisableWebhookRequest`
- **Query Types:** `GetWebhooksQuery`, `GetWebhookDeliveriesQuery`

---

## API Endpoint Type Maps

The file includes complete API endpoint type maps for each module:
- `SupportAPI` - Maps all 16 support endpoints to their request/response types
- `AuditLogAPI` - Maps all 33 audit log endpoints to their request/response types
- `ApprovalAPI` - Maps all 8 approval endpoints to their request/response types
- `HealthAPI` - Maps all 9 health endpoints to their request/response types
- `WebhookAPI` - Maps all 16 webhook endpoints to their request/response types

These type maps provide complete end-to-end type safety for API consumers.

---

## File Information

**Location:** `/home/user/traf3li-backend/contract2/types/misc.ts`
**Lines of Code:** 1,684 lines
**Total Endpoints:** 82

## Usage Example

```typescript
import type {
  SupportAPI,
  AuditLogAPI,
  ApprovalAPI,
  HealthAPI,
  WebhookAPI,
  CreateTicketRequest,
  SupportTicket,
  AuditLog,
  WebhookEvent
} from './contract2/types/misc';

// Type-safe API calls
const createTicket = async (data: CreateTicketRequest): Promise<SupportTicket> => {
  const response = await api.post<SupportAPI['POST /api/support/tickets']['response']>(
    '/api/support/tickets',
    data
  );
  return response.data!;
};
```

---

## Notes

- All endpoints require authentication (via `userMiddleware` or `authenticate` middleware)
- Audit Log and Health endpoints have additional permission requirements (admin or specific permissions)
- Webhook secret endpoints are restricted to admins only
- All ObjectIds are sanitized for IDOR protection
- Mass assignment protection is applied to all request bodies
- Pagination is standardized across all list endpoints
