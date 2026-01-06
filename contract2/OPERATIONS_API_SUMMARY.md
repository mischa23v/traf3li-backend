# Operations Module API Summary

**File:** `/home/user/traf3li-backend/contract2/types/operations.ts`
**Generated:** 2026-01-06
**Total Endpoints:** 60
**File Size:** 24KB (881 lines)

---

## Module Breakdown

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Vendor** | 6 | Vendor/supplier management |
| **Bill** | 20 | Bill/invoice processing for accounts payable |
| **Bill Payment** | 4 | Payment recording and tracking |
| **Document** | 19 | Document upload, storage, and versioning |
| **Notification** | 11 | In-app notification system |

---

## 1. Vendor Management (6 endpoints)

| Method | Endpoint | Controller | Request Type | Response Type |
|--------|----------|------------|--------------|---------------|
| POST | `/api/vendors` | createVendor | `CreateVendorRequest` | `CreateVendorResponse` |
| GET | `/api/vendors` | getVendors | `GetVendorsQuery` | `GetVendorsResponse` |
| GET | `/api/vendors/:id` | getVendor | - | `GetVendorResponse` |
| PUT | `/api/vendors/:id` | updateVendor | `UpdateVendorRequest` | `UpdateVendorResponse` |
| DELETE | `/api/vendors/:id` | deleteVendor | - | `DeleteVendorResponse` |
| GET | `/api/vendors/:id/summary` | getVendorSummary | - | `GetVendorSummaryResponse` |

### Key Features:
- Multi-currency support (SAR, USD, EUR, etc.)
- IBAN validation with bank account details
- Payment terms configuration (0-365 days)
- Credit limit tracking
- Opening balance management
- Integration with accounting (expense/payable accounts)

---

## 2. Bill Management (20 endpoints)

| Method | Endpoint | Controller | Request Type | Response Type |
|--------|----------|------------|--------------|---------------|
| POST | `/api/bills` | createBill | `CreateBillRequest` | `CreateBillResponse` |
| GET | `/api/bills` | getBills | `GetBillsQuery` | `GetBillsResponse` |
| GET | `/api/bills/overdue` | getOverdueBills | - | `GetOverdueBillsResponse` |
| GET | `/api/bills/summary` | getSummary | `GetBillsSummaryQuery` | `GetBillsSummaryResponse` |
| GET | `/api/bills/recurring` | getRecurringBills | - | `GetRecurringBillsResponse` |
| GET | `/api/bills/reports/aging` | getAgingReport | `GetAgingReportQuery` | `GetAgingReportResponse` |
| GET | `/api/bills/export` | exportBills | `ExportBillsQuery` | CSV/JSON |
| GET | `/api/bills/:id` | getBill | - | `GetBillResponse` |
| PUT | `/api/bills/:id` | updateBill | `UpdateBillRequest` | `UpdateBillResponse` |
| DELETE | `/api/bills/:id` | deleteBill | - | `DeleteBillResponse` |
| POST | `/api/bills/:id/receive` | receiveBill | - | `ReceiveBillResponse` |
| POST | `/api/bills/:id/cancel` | cancelBill | `CancelBillRequest` | `CancelBillResponse` |
| POST | `/api/bills/:id/duplicate` | duplicateBill | - | `DuplicateBillResponse` |
| POST | `/api/bills/:id/stop-recurring` | stopRecurring | - | `StopRecurringBillResponse` |
| POST | `/api/bills/:id/generate-next` | generateNextBill | - | `GenerateNextBillResponse` |
| POST | `/api/bills/:id/approve` | approveBill | `ApproveBillRequest` | `ApproveBillResponse` |
| POST | `/api/bills/:id/pay` | payBill | `PayBillRequest` | `PayBillResponse` |
| POST | `/api/bills/:id/post-to-gl` | postToGL | `PostBillToGLRequest` | `PostBillToGLResponse` |
| POST | `/api/bills/:id/attachments` | uploadAttachment | `UploadBillAttachmentRequest` | `UploadBillAttachmentResponse` |
| DELETE | `/api/bills/:id/attachments/:attachmentId` | deleteAttachment | - | `DeleteBillAttachmentResponse` |

### Bill Statuses:
- `draft` - Initial state
- `received` - Bill received from vendor
- `pending` - Awaiting payment
- `pending_approval` - Awaiting approval
- `approved` - Approved for payment
- `partial` - Partially paid
- `paid` - Fully paid
- `cancelled` - Cancelled
- `void` - Voided

### Key Features:
- Line item management with tax/discount calculations
- Recurring bill automation (daily, weekly, monthly, etc.)
- Approval workflow
- Payment recording with multiple methods
- Attachment management
- Case/matter linking
- General Ledger posting
- Aging report (current, 1-30, 31-60, 61-90, 90+ days)
- CSV export
- Idempotency protection on critical operations

---

## 3. Bill Payment (4 endpoints)

| Method | Endpoint | Controller | Request Type | Response Type |
|--------|----------|------------|--------------|---------------|
| POST | `/api/bill-payments` | createPayment | `CreateBillPaymentRequest` | `CreateBillPaymentResponse` |
| GET | `/api/bill-payments` | getPayments | `GetBillPaymentsQuery` | `GetBillPaymentsResponse` |
| GET | `/api/bill-payments/:id` | getPayment | - | `GetBillPaymentResponse` |
| POST | `/api/bill-payments/:id/cancel` | cancelPayment | `CancelBillPaymentRequest` | `CancelBillPaymentResponse` |

### Payment Methods:
- `bank_transfer`
- `cash`
- `check`
- `credit_card`
- `debit_card`
- `online`

### Key Features:
- Atomic transaction support (MongoDB sessions)
- Overpayment prevention
- Bank account balance tracking
- Insufficient funds validation
- Rate limiting on payment endpoints
- Payment cancellation with reason tracking
- Auto-updates bill status (partial/paid)

---

## 4. Document Management (19 endpoints)

| Method | Endpoint | Controller | Request Type | Response Type |
|--------|----------|------------|--------------|---------------|
| POST | `/api/documents/upload` | getUploadUrl | `GetDocumentUploadUrlRequest` | `GetDocumentUploadUrlResponse` |
| POST | `/api/documents/confirm` | confirmUpload | `ConfirmDocumentUploadRequest` | `ConfirmDocumentUploadResponse` |
| GET | `/api/documents/search` | searchDocuments | `SearchDocumentsQuery` | `SearchDocumentsResponse` |
| GET | `/api/documents/stats` | getDocumentStats | - | `GetDocumentStatsResponse` |
| GET | `/api/documents/recent` | getRecentDocuments | `GetRecentDocumentsQuery` | `GetRecentDocumentsResponse` |
| GET | `/api/documents/case/:caseId` | getDocumentsByCase | - | `GetDocumentsByCaseResponse` |
| GET | `/api/documents/client/:clientId` | getDocumentsByClient | - | `GetDocumentsByClientResponse` |
| POST | `/api/documents/bulk-delete` | bulkDeleteDocuments | `BulkDeleteDocumentsRequest` | `BulkDeleteDocumentsResponse` |
| GET | `/api/documents` | getDocuments | `GetDocumentsQuery` | `GetDocumentsResponse` |
| GET | `/api/documents/:id` | getDocument | - | `GetDocumentResponse` |
| PATCH | `/api/documents/:id` | updateDocument | `UpdateDocumentRequest` | `UpdateDocumentResponse` |
| DELETE | `/api/documents/:id` | deleteDocument | - | `DeleteDocumentResponse` |
| GET | `/api/documents/:id/download` | downloadDocument | - | `DownloadDocumentResponse` |
| GET | `/api/documents/:id/versions` | getVersionHistory | - | `GetVersionHistoryResponse` |
| POST | `/api/documents/:id/versions` | uploadVersion | `UploadDocumentVersionRequest` | `UploadDocumentVersionResponse` |
| POST | `/api/documents/:id/versions/:versionId/restore` | restoreVersion | - | `RestoreVersionResponse` |
| POST | `/api/documents/:id/share` | generateShareLink | `GenerateShareLinkRequest` | `GenerateShareLinkResponse` |
| POST | `/api/documents/:id/revoke-share` | revokeShareLink | - | `RevokeShareLinkResponse` |
| POST | `/api/documents/:id/move` | moveDocument | `MoveDocumentRequest` | `MoveDocumentResponse` |

### Document Categories:
- `contract`, `agreement`, `power_of_attorney`
- `court_filing`, `evidence`, `correspondence`
- `identification`, `financial`, `invoice`, `receipt`
- `report`, `memo`, `research`, `judgment`, `other`

### Module-Based Storage:
- `crm` - CRM documents
- `finance` - Financial documents
- `hr` - HR documents
- `judgments` - Court judgments
- `tasks` - Task attachments
- `documents` - General documents
- `general` - Fallback bucket

### Key Features:
- AWS S3 presigned URL upload (secure, direct to S3)
- Multi-bucket routing based on module
- File type validation (PDF, Office, images, archives)
- Max file size: 100MB
- Path traversal protection
- Version control with change notes
- Document sharing with expiration (1-365 days)
- Confidential document marking
- Access count tracking
- Firm storage quota tracking
- Full-text search
- Audit logging for sensitive operations
- Rate limiting on uploads

---

## 5. Notification System (11 endpoints)

| Method | Endpoint | Controller | Request Type | Response Type |
|--------|----------|------------|--------------|---------------|
| GET | `/api/notifications` | getNotifications | `GetNotificationsQuery` | `GetNotificationsResponse` |
| GET | `/api/notifications/unread-count` | getUnreadCount | - | `GetUnreadCountResponse` |
| PATCH | `/api/notifications/mark-all-read` | markAllAsRead | - | `MarkAllNotificationsAsReadResponse` |
| PATCH | `/api/notifications/mark-multiple-read` | markMultipleAsRead | `MarkMultipleNotificationsAsReadRequest` | `MarkMultipleNotificationsAsReadResponse` |
| DELETE | `/api/notifications/bulk-delete` | bulkDeleteNotifications | `BulkDeleteNotificationsRequest` | `BulkDeleteNotificationsResponse` |
| DELETE | `/api/notifications/clear-read` | clearReadNotifications | - | `ClearReadNotificationsResponse` |
| GET | `/api/notifications/by-type/:type` | getNotificationsByType | `GetNotificationsByTypeQuery` | `GetNotificationsByTypeResponse` |
| POST | `/api/notifications` | createNotificationEndpoint | `CreateNotificationRequest` | `CreateNotificationResponse` |
| GET | `/api/notifications/:id` | getNotification | - | `GetNotificationResponse` |
| PATCH | `/api/notifications/:id/read` | markAsRead | - | `MarkNotificationAsReadResponse` |
| DELETE | `/api/notifications/:id` | deleteNotification | - | `DeleteNotificationResponse` |

### Notification Types (27 types):
**Orders & Proposals:**
- `order`, `proposal`, `proposal_accepted`

**Tasks:**
- `task`, `task_assigned`

**Communication:**
- `message`, `chatter`

**Legal Events:**
- `hearing`, `hearing_reminder`, `deadline`
- `case`, `case_update`, `event`, `review`

**Finance:**
- `payment`, `invoice`, `invoice_approval_required`, `invoice_approved`, `invoice_rejected`
- `recurring_invoice`, `credit_note`, `debit_note`

**Time & Expenses:**
- `time_entry_submitted`, `time_entry_approved`, `time_entry_rejected`
- `expense_submitted`, `expense_approved`, `expense_rejected`

**System:**
- `system`, `reminder`, `alert`

### Priority Levels:
- `low` - Informational
- `normal` - Standard (default)
- `high` - Important
- `urgent` - Critical, requires immediate attention

### Notification Channels:
- `in_app` - In-application notification center
- `email` - Email notification
- `sms` - SMS notification
- `push` - Push notification

### Key Features:
- Real-time Socket.io integration
- Bilingual support (English + Arabic)
- Read/unread tracking
- Priority-based sorting
- Filtering by type and read status
- Bulk operations (mark read, delete)
- Action buttons with URLs
- Expiration support
- Entity linking (case, task, invoice, etc.)
- Firm isolation for multi-tenancy
- Helper functions for programmatic creation
- Bulk notification creation (up to 1000)

---

## Security Features (Applied Across All Modules)

### Authentication & Authorization:
- ✅ JWT token validation via `authenticatedApi` middleware
- ✅ Multi-tenant isolation (`req.firmQuery` for firm members, `lawyerId` for solo lawyers)
- ✅ Permission-based access control (`req.hasPermission()`)
- ✅ Admin-only endpoints (e.g., notification creation)

### Input Validation:
- ✅ Joi schema validation (Vendor, Bill)
- ✅ ObjectId sanitization (`sanitizeObjectId`)
- ✅ Mass assignment protection (`pickAllowedFields`)
- ✅ Regex injection prevention (`escapeRegex`)
- ✅ File type whitelisting (Documents)
- ✅ Path traversal protection (Documents)
- ✅ Enum validation (status, types, priorities)

### Data Protection:
- ✅ IDOR prevention (firm/lawyer isolation on all queries)
- ✅ Race condition protection (MongoDB transactions)
- ✅ Overpayment prevention (balance validation)
- ✅ Idempotency keys on financial operations
- ✅ Rate limiting (payments, uploads)

### Audit & Logging:
- ✅ Activity logging via QueueService (non-blocking)
- ✅ Action history tracking (bill actions, payment cancellations)
- ✅ Audit middleware on sensitive document operations
- ✅ IP address and user agent capture

---

## Common Patterns

### Pagination:
```typescript
interface PaginationParams {
  page?: number;    // Default: 1
  limit?: number;   // Default: 20-50 (max: 100)
}

interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
```

### Standard Response:
```typescript
interface StandardResponse {
  success: boolean;
  message: string;
  messageAr?: string;  // Arabic translation
}
```

### Date Handling:
- Input: ISO 8601 string or Date object
- Output: Date object in JSON responses
- Storage: MongoDB Date type

### Currency:
- Amounts: Stored as integers (smallest unit, e.g., halalas for SAR)
- Display: Divide by 100 for SAR/USD
- Default: `SAR` (Saudi Riyal)

---

## Integration Points

### With Other Modules:
- **Case Management**: Bill linking, document linking
- **Client Management**: Document linking
- **Financial Management**: GL posting, bank accounts
- **Task Management**: Notifications for task assignments
- **Calendar**: Hearing reminders

### External Services:
- **AWS S3**: Document storage (multi-bucket)
- **Socket.io**: Real-time notifications
- **Queue System**: Background activity logging
- **Email Service**: Notification delivery

---

## Error Handling

All endpoints use consistent error responses:

```typescript
{
  success: false,
  error: true,
  message: "Error description",
  status: 400 | 401 | 403 | 404 | 500
}
```

Common error codes:
- `400` - Validation errors, invalid input
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions, IDOR)
- `404` - Resource not found
- `500` - Server error

---

## TypeScript Usage

Import types in your frontend:

```typescript
import {
  // Vendor
  CreateVendorRequest,
  GetVendorsResponse,
  Vendor,

  // Bill
  CreateBillRequest,
  Bill,
  BillStatus,

  // Bill Payment
  CreateBillPaymentRequest,
  BillPayment,

  // Document
  GetDocumentUploadUrlRequest,
  Document,
  DocumentCategory,

  // Notification
  Notification,
  NotificationType,
  NotificationPriority
} from '@/types/operations';
```

---

## Next Steps

1. **Frontend Integration**: Use these types in React/Vue/Angular components
2. **API Client**: Generate typed API client (e.g., using these types with Axios)
3. **Validation**: Share validation rules between frontend and backend
4. **Testing**: Use types for comprehensive test coverage
5. **Documentation**: Generate API docs from these types (e.g., using TypeDoc)

---

**Generated with ❤️ by Claude Code**
**Repository:** traf3li-backend
**Date:** 2026-01-06
