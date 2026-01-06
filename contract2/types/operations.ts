/**
 * OPERATIONS MODULE API CONTRACTS
 *
 * This file contains TypeScript type definitions for ALL endpoints in the Operations modules:
 * - Vendor Management (6 endpoints)
 * - Bill Management (20 endpoints)
 * - Bill Payment (4 endpoints)
 * - Document Management (19 endpoints)
 * - Notification System (11 endpoints)
 *
 * Total: 60 endpoints documented
 *
 * Generated: 2026-01-06
 */

import { ObjectId, PaginationParams, PaginationResponse, StandardResponse } from './core';

// ============================================
// COMMON TYPES
// ============================================

export type Currency = 'SAR' | 'USD' | 'EUR' | 'GBP' | 'AED' | string;
export type CountryCode = 'SA' | 'AE' | 'US' | 'GB' | string;

// ============================================
// VENDOR MODULE (6 endpoints)
// ============================================

export interface VendorBase {
  name: string;
  nameAr?: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  country?: CountryCode;
  postalCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIban?: string;
  currency?: Currency;
  paymentTerms?: number; // Days, 0-365
  defaultCategory?: string;
  website?: string;
  contactPerson?: string;
  notes?: string;
  creditLimit?: number;
  openingBalance?: number;
  openingBalanceDate?: Date | string;
  defaultExpenseAccountId?: ObjectId;
  payableAccountId?: ObjectId;
}

export interface Vendor extends VendorBase {
  _id: ObjectId;
  lawyerId: ObjectId;
  firmId?: ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorSummary {
  vendor: Vendor;
  totalBills: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  overdueBills: number;
  overdueAmount: number;
  recentBills: Array<{
    _id: ObjectId;
    billNumber: string;
    billDate: Date;
    dueDate: Date;
    totalAmount: number;
    status: string;
  }>;
}

// POST /api/vendors - Create vendor
export interface CreateVendorRequest extends VendorBase {}
export interface CreateVendorResponse extends StandardResponse {
  vendor: Vendor;
}

// GET /api/vendors - Get all vendors
export interface GetVendorsQuery extends PaginationParams {
  search?: string;
  isActive?: 'true' | 'false';
  country?: CountryCode;
}
export interface GetVendorsResponse extends StandardResponse {
  vendors: Vendor[];
  total: number;
}

// GET /api/vendors/:id - Get single vendor
export interface GetVendorResponse extends StandardResponse {
  vendor: Vendor;
}

// PUT /api/vendors/:id - Update vendor
export interface UpdateVendorRequest extends Partial<VendorBase> {
  isActive?: boolean;
}
export interface UpdateVendorResponse extends StandardResponse {
  vendor: Vendor;
}

// DELETE /api/vendors/:id - Delete vendor
export type DeleteVendorResponse = StandardResponse;

// GET /api/vendors/:id/summary - Get vendor summary
export interface GetVendorSummaryResponse extends StandardResponse {
  summary: VendorSummary;
}

// ============================================
// BILL MODULE (23 endpoints)
// ============================================

export type BillStatus = 'draft' | 'received' | 'pending' | 'pending_approval' | 'approved' | 'partial' | 'paid' | 'cancelled' | 'void';
export type DiscountType = 'percentage' | 'fixed';
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface BillItem {
  description: string;
  quantity: number;
  amount: number;
  total?: number;
  accountId?: ObjectId;
}

export interface RecurringConfig {
  frequency: RecurringFrequency;
  interval: number;
  startDate: Date | string;
  endDate?: Date | string;
  nextBillDate?: Date | string;
  isActive: boolean;
  generatedCount?: number;
  maxOccurrences?: number;
}

export interface BillAttachment {
  _id: ObjectId;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt: Date;
}

export interface BillHistoryEntry {
  action: string;
  performedBy: ObjectId;
  performedAt: Date;
  details?: any;
  notes?: string;
}

export interface BillPaymentRecord {
  amount: number;
  paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'credit_card' | 'debit_card' | 'online';
  paymentDate: Date;
  reference?: string;
  notes?: string;
  bankAccountId?: ObjectId;
  recordedBy: ObjectId;
  recordedAt: Date;
}

export interface Bill {
  _id: ObjectId;
  billNumber: string;
  vendorId: ObjectId | { _id: ObjectId; name: string; vendorId?: string; email?: string; phone?: string; address?: string; };
  items: BillItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  totalAmount: number;
  amountPaid: number;
  paidAmount?: number;
  balanceDue: number;
  currency: Currency;
  billDate: Date;
  dueDate: Date;
  paidDate?: Date;
  paidAt?: Date;
  status: BillStatus;
  caseId?: ObjectId | { _id: ObjectId; title: string; caseNumber: string; };
  categoryId?: ObjectId;
  notes?: string;
  internalNotes?: string;
  reference?: string;
  attachments: BillAttachment[];
  isRecurring: boolean;
  recurringConfig?: RecurringConfig;
  parentBillId?: ObjectId;
  lawyerId: ObjectId;
  firmId?: ObjectId;
  history: BillHistoryEntry[];
  payments?: BillPaymentRecord[];
  approvedBy?: ObjectId;
  approvedAt?: Date;
  postedToGL?: boolean;
  postedToGLAt?: Date;
  postedToGLBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillsSummary {
  totalBills: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  overdueBills: number;
  overdueAmount: number;
  draftBills: number;
  pendingBills: number;
  paidBills: number;
  byStatus: Array<{ _id: BillStatus; count: number; total: number; }>;
  byVendor?: Array<{ _id: ObjectId; vendorName: string; count: number; total: number; }>;
}

export interface AgingReport {
  current: { count: number; amount: number; };
  days1to30: { count: number; amount: number; };
  days31to60: { count: number; amount: number; };
  days61to90: { count: number; amount: number; };
  days91Plus: { count: number; amount: number; };
  total: { count: number; amount: number; };
  bills?: Array<{
    _id: ObjectId;
    billNumber: string;
    vendorName: string;
    dueDate: Date;
    daysOverdue: number;
    amount: number;
    balanceDue: number;
  }>;
}

// POST /api/bills - Create bill
export interface CreateBillRequest {
  vendorId: ObjectId;
  items: BillItem[];
  billDate: Date | string;
  dueDate: Date | string;
  taxRate?: number;
  discountType?: DiscountType;
  discountValue?: number;
  caseId?: ObjectId;
  categoryId?: ObjectId;
  notes?: string;
  internalNotes?: string;
  reference?: string;
  isRecurring?: boolean;
  recurringConfig?: RecurringConfig;
}
export interface CreateBillResponse extends StandardResponse {
  bill: Bill;
}

// GET /api/bills - Get all bills
export interface GetBillsQuery extends PaginationParams {
  status?: BillStatus;
  vendorId?: ObjectId;
  caseId?: ObjectId;
  categoryId?: ObjectId;
  startDate?: string;
  endDate?: string;
  overdue?: 'true' | 'false';
  search?: string;
}
export interface GetBillsResponse extends StandardResponse {
  bills: Bill[];
  total: number;
}

// GET /api/bills/:id - Get single bill
export interface GetBillResponse extends StandardResponse {
  bill: Bill;
}

// PUT /api/bills/:id - Update bill
export interface UpdateBillRequest {
  vendorId?: ObjectId;
  items?: BillItem[];
  billDate?: Date | string;
  dueDate?: Date | string;
  taxRate?: number;
  discountType?: DiscountType;
  discountValue?: number;
  caseId?: ObjectId;
  categoryId?: ObjectId;
  notes?: string;
  internalNotes?: string;
  reference?: string;
  status?: BillStatus;
}
export interface UpdateBillResponse extends StandardResponse {
  bill: Bill;
}

// DELETE /api/bills/:id - Delete bill
export type DeleteBillResponse = StandardResponse;

// POST /api/bills/:id/receive - Mark bill as received
export interface ReceiveBillResponse extends StandardResponse {
  bill: Bill;
}

// POST /api/bills/:id/cancel - Cancel bill
export interface CancelBillRequest {
  reason?: string;
}
export interface CancelBillResponse extends StandardResponse {
  bill: Bill;
}

// POST /api/bills/:id/attachments - Upload attachment
export interface UploadBillAttachmentRequest {
  fileName?: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
}
export interface UploadBillAttachmentResponse extends StandardResponse {
  attachment: BillAttachment;
}

// DELETE /api/bills/:id/attachments/:attachmentId - Delete attachment
export type DeleteBillAttachmentResponse = StandardResponse;

// POST /api/bills/:id/duplicate - Duplicate bill
export interface DuplicateBillResponse extends StandardResponse {
  bill: Bill;
}

// GET /api/bills/overdue - Get overdue bills
export interface GetOverdueBillsResponse extends StandardResponse {
  bills: Bill[];
}

// GET /api/bills/summary - Get bills summary
export interface GetBillsSummaryQuery {
  startDate?: string;
  endDate?: string;
  vendorId?: ObjectId;
}
export interface GetBillsSummaryResponse extends StandardResponse {
  summary: BillsSummary;
}

// GET /api/bills/recurring - Get recurring bills
export interface GetRecurringBillsResponse extends StandardResponse {
  bills: Bill[];
}

// POST /api/bills/:id/stop-recurring - Stop recurring bill
export interface StopRecurringBillResponse extends StandardResponse {
  bill: Bill;
}

// POST /api/bills/:id/generate-next - Generate next recurring bill
export interface GenerateNextBillResponse extends StandardResponse {
  bill: Bill;
}

// GET /api/bills/reports/aging - Get aging report
export interface GetAgingReportQuery {
  vendorId?: ObjectId;
}
export interface GetAgingReportResponse extends StandardResponse {
  report: AgingReport;
}

// GET /api/bills/export - Export bills
export interface ExportBillsQuery {
  format?: 'csv' | 'json';
  status?: BillStatus;
  vendorId?: ObjectId;
  startDate?: string;
  endDate?: string;
}
export type ExportBillsResponse = string | StandardResponse; // CSV string or JSON

// POST /api/bills/:id/approve - Approve bill
export interface ApproveBillRequest {
  notes?: string;
}
export interface ApproveBillResponse extends StandardResponse {
  messageAr?: string;
  bill: Bill;
}

// POST /api/bills/:id/pay - Pay bill (record payment)
export interface PayBillRequest {
  amount?: number;
  paymentMethod?: 'bank_transfer' | 'cash' | 'check' | 'credit_card' | 'debit_card' | 'online';
  paymentDate?: Date | string;
  reference?: string;
  notes?: string;
  bankAccountId?: ObjectId;
}
export interface PayBillResponse extends StandardResponse {
  messageAr?: string;
  bill: Bill;
}

// POST /api/bills/:id/post-to-gl - Post bill to General Ledger
export interface PostBillToGLRequest {
  journalDate?: Date | string;
  notes?: string;
}
export interface PostBillToGLResponse extends StandardResponse {
  messageAr?: string;
  bill: Bill;
}

// ============================================
// BILL PAYMENT MODULE (4 endpoints)
// ============================================

export type PaymentStatus = 'completed' | 'cancelled' | 'pending' | 'failed';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'credit_card' | 'debit_card' | 'online';

export interface BillPayment {
  _id: ObjectId;
  paymentNumber: string;
  billId: ObjectId | { _id: ObjectId; billNumber: string; totalAmount: number; balanceDue?: number; status?: string; };
  vendorId: ObjectId | { _id: ObjectId; name: string; vendorId?: string; };
  amount: number;
  currency: Currency;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  bankAccountId?: ObjectId | { _id: ObjectId; name: string; bankName?: string; accountNumber?: string; };
  reference?: string;
  checkNumber?: string;
  notes?: string;
  status: PaymentStatus;
  createdBy: ObjectId | { _id: ObjectId; firstName: string; lastName: string; };
  lawyerId: ObjectId;
  firmId?: ObjectId;
  cancelledBy?: ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// POST /api/bill-payments - Create payment
export interface CreateBillPaymentRequest {
  billId: ObjectId;
  amount: number;
  paymentDate?: Date | string;
  paymentMethod: PaymentMethod;
  bankAccountId?: ObjectId;
  reference?: string;
  checkNumber?: string;
  notes?: string;
}
export interface CreateBillPaymentResponse extends StandardResponse {
  payment: BillPayment;
}

// GET /api/bill-payments - Get all payments
export interface GetBillPaymentsQuery extends PaginationParams {
  billId?: ObjectId;
  vendorId?: ObjectId;
  startDate?: string;
  endDate?: string;
}
export interface GetBillPaymentsResponse extends StandardResponse {
  payments: BillPayment[];
  total: number;
}

// GET /api/bill-payments/:id - Get single payment
export interface GetBillPaymentResponse extends StandardResponse {
  payment: BillPayment;
}

// POST /api/bill-payments/:id/cancel - Cancel payment
export interface CancelBillPaymentRequest {
  reason?: string;
}
export interface CancelBillPaymentResponse extends StandardResponse {
  payment: BillPayment;
}

// ============================================
// DOCUMENT MODULE (23 endpoints)
// ============================================

export type DocumentCategory =
  | 'contract' | 'agreement' | 'power_of_attorney' | 'court_filing' | 'evidence'
  | 'correspondence' | 'identification' | 'financial' | 'invoice' | 'receipt'
  | 'report' | 'memo' | 'research' | 'judgment' | 'other';

export type DocumentModule = 'crm' | 'finance' | 'hr' | 'judgments' | 'tasks' | 'documents' | 'general';

export interface DocumentBase {
  fileName: string;
  originalName?: string;
  fileType: string;
  fileSize: number;
  url?: string;
  fileKey: string;
  bucket?: string;
  module?: DocumentModule;
  category: DocumentCategory;
  caseId?: ObjectId;
  clientId?: ObjectId;
  description?: string;
  isConfidential?: boolean;
  tags?: string[];
}

export interface Document extends DocumentBase {
  _id: ObjectId;
  uploadedBy: ObjectId | { _id: ObjectId; firstName: string; lastName: string; };
  lawyerId: ObjectId;
  firmId?: ObjectId;
  accessCount: number;
  lastAccessedAt?: Date;
  shareToken?: string;
  shareExpiresAt?: Date;
  version: number;
  hasVersions: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersion {
  _id: ObjectId;
  documentId: ObjectId;
  version: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileKey: string;
  url?: string;
  mimeType: string;
  uploadedBy: ObjectId | { _id: ObjectId; firstName: string; lastName: string; };
  changeNote?: string;
  createdAt: Date;
}

export interface DocumentStats {
  totalDocuments: number;
  byCategory: Array<{ _id: DocumentCategory; count: number; totalSize: number; }>;
  totalSize: number;
  recentDocuments: Array<{
    _id: ObjectId;
    fileName: string;
    category: DocumentCategory;
    createdAt: Date;
  }>;
}

// POST /api/documents/upload - Get upload URL
export interface GetDocumentUploadUrlRequest {
  fileName: string;
  fileType: string;
  category: DocumentCategory;
  caseId?: ObjectId;
  clientId?: ObjectId;
  description?: string;
  isConfidential?: boolean;
  module?: DocumentModule;
}
export interface GetDocumentUploadUrlResponse extends StandardResponse {
  data: {
    uploadUrl: string;
    fileKey: string;
    bucket: string;
    module: string;
    expiresIn: number;
  };
}

// POST /api/documents/confirm - Confirm upload
export interface ConfirmDocumentUploadRequest extends DocumentBase {}
export interface ConfirmDocumentUploadResponse extends StandardResponse {
  data: Document;
}

// GET /api/documents - Get all documents
export interface GetDocumentsQuery extends PaginationParams {
  category?: DocumentCategory;
  caseId?: ObjectId;
  clientId?: ObjectId;
  search?: string;
}
export interface GetDocumentsResponse extends StandardResponse {
  data: Document[];
  pagination: PaginationResponse;
}

// GET /api/documents/:id - Get single document
export interface GetDocumentResponse extends StandardResponse {
  data: Document;
}

// PATCH /api/documents/:id - Update document
export interface UpdateDocumentRequest {
  fileName?: string;
  category?: DocumentCategory;
  description?: string;
  tags?: string[];
  isConfidential?: boolean;
  caseId?: ObjectId;
  clientId?: ObjectId;
}
export interface UpdateDocumentResponse extends StandardResponse {
  data: Document;
}

// DELETE /api/documents/:id - Delete document
export type DeleteDocumentResponse = StandardResponse;

// GET /api/documents/case/:caseId - Get documents by case
export interface GetDocumentsByCaseResponse extends StandardResponse {
  data: Document[];
}

// GET /api/documents/client/:clientId - Get documents by client
export interface GetDocumentsByClientResponse extends StandardResponse {
  data: Document[];
}

// GET /api/documents/stats - Get document statistics
export interface GetDocumentStatsResponse extends StandardResponse {
  data: DocumentStats;
}

// GET /api/documents/:id/download - Download document
export interface DownloadDocumentResponse extends StandardResponse {
  data: {
    downloadUrl: string;
    fileName: string;
    expiresIn: number;
  };
}

// POST /api/documents/:id/share - Generate share link
export interface GenerateShareLinkRequest {
  expiresInDays?: number; // 1-365
}
export interface GenerateShareLinkResponse extends StandardResponse {
  data: {
    shareToken: string;
    shareUrl: string;
    expiresAt: Date;
  };
}

// POST /api/documents/:id/revoke-share - Revoke share link
export type RevokeShareLinkResponse = StandardResponse;

// POST /api/documents/:id/versions - Upload new version
export interface UploadDocumentVersionRequest {
  fileName: string;
  originalName?: string;
  fileSize: number;
  url?: string;
  fileKey: string;
  changeNote?: string;
  mimeType?: string;
  fileType: string;
}
export interface UploadDocumentVersionResponse extends StandardResponse {
  error: boolean;
  data: Document;
}

// GET /api/documents/:id/versions - Get version history
export interface GetVersionHistoryResponse extends StandardResponse {
  error: boolean;
  data: DocumentVersion[];
}

// POST /api/documents/:id/versions/:versionId/restore - Restore version
export interface RestoreVersionResponse extends StandardResponse {
  error: boolean;
  data: Document;
}

// GET /api/documents/search - Search documents
export interface SearchDocumentsQuery {
  q: string; // Minimum 2 characters
}
export interface SearchDocumentsResponse extends StandardResponse {
  data: Document[];
  count: number;
}

// GET /api/documents/recent - Get recent documents
export interface GetRecentDocumentsQuery {
  limit?: number;
}
export interface GetRecentDocumentsResponse extends StandardResponse {
  data: Document[];
}

// POST /api/documents/bulk-delete - Bulk delete documents
export interface BulkDeleteDocumentsRequest {
  documentIds: ObjectId[];
}
export interface BulkDeleteDocumentsResponse extends StandardResponse {
  count: number;
}

// POST /api/documents/:id/move - Move document to case
export interface MoveDocumentRequest {
  caseId?: ObjectId | null;
}
export interface MoveDocumentResponse extends StandardResponse {
  data: Document;
}

// ============================================
// NOTIFICATION MODULE (14 endpoints)
// ============================================

export type NotificationType =
  | 'order' | 'proposal' | 'proposal_accepted' | 'task' | 'task_assigned'
  | 'message' | 'chatter' | 'hearing' | 'hearing_reminder' | 'deadline'
  | 'case' | 'case_update' | 'event' | 'review' | 'payment' | 'invoice'
  | 'invoice_approval_required' | 'invoice_approved' | 'invoice_rejected'
  | 'time_entry_submitted' | 'time_entry_approved' | 'time_entry_rejected'
  | 'expense_submitted' | 'expense_approved' | 'expense_rejected'
  | 'recurring_invoice' | 'credit_note' | 'debit_note' | 'system' | 'reminder' | 'alert';

export type NotificationEntityType =
  | 'invoice' | 'payment' | 'case' | 'task' | 'time_entry' | 'expense'
  | 'client' | 'document' | 'event' | 'order' | 'proposal';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface Notification {
  _id: ObjectId;
  firmId?: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  entityType?: NotificationEntityType;
  entityId?: ObjectId;
  link?: string;
  data?: any;
  icon?: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  read: boolean;
  readAt?: Date;
  expiresAt?: Date;
  actionRequired?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/notifications - Get all notifications
export interface GetNotificationsQuery extends PaginationParams {
  read?: 'true' | 'false';
  type?: NotificationType;
}
export interface GetNotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  page: number;
  limit: number;
}

// GET /api/notifications/:id - Get single notification
export interface GetNotificationResponse extends StandardResponse {
  data: Notification;
}

// PATCH /api/notifications/:id/read - Mark as read
export type MarkNotificationAsReadResponse = Notification;

// PATCH /api/notifications/mark-all-read - Mark all as read
export interface MarkAllNotificationsAsReadResponse {
  success: boolean;
  modifiedCount: number;
}

// PATCH /api/notifications/mark-multiple-read - Mark multiple as read
export interface MarkMultipleNotificationsAsReadRequest {
  ids: ObjectId[];
}
export interface MarkMultipleNotificationsAsReadResponse extends StandardResponse {
  modifiedCount: number;
  unreadCount: number;
}

// DELETE /api/notifications/:id - Delete notification
export type DeleteNotificationResponse = StandardResponse;

// DELETE /api/notifications/bulk-delete - Bulk delete notifications
export interface BulkDeleteNotificationsRequest {
  ids: ObjectId[];
}
export interface BulkDeleteNotificationsResponse extends StandardResponse {
  deletedCount: number;
  unreadCount: number;
}

// DELETE /api/notifications/clear-read - Clear read notifications
export interface ClearReadNotificationsResponse extends StandardResponse {
  deletedCount: number;
}

// GET /api/notifications/by-type/:type - Get notifications by type
export interface GetNotificationsByTypeQuery extends PaginationParams {
  read?: 'true' | 'false';
}
export interface GetNotificationsByTypeResponse extends StandardResponse {
  data: Notification[];
  pagination: PaginationResponse;
}

// GET /api/notifications/unread-count - Get unread count
export interface GetUnreadCountResponse {
  count: number;
}

// POST /api/notifications - Create notification (admin only)
export interface CreateNotificationRequest {
  firmId?: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  entityType?: NotificationEntityType;
  entityId?: ObjectId;
  link?: string;
  data?: any;
  icon?: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  expiresAt?: Date | string;
  actionRequired?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelAr?: string;
}
export interface CreateNotificationResponse extends StandardResponse {
  data: Notification;
}

// ============================================
// HELPER FUNCTIONS (not endpoints, but used internally)
// ============================================

// These are exported for documentation purposes but are not direct API endpoints
export interface CreateNotificationHelper {
  (notificationData: CreateNotificationRequest): Promise<Notification | null>;
}

export interface CreateBulkNotificationsHelper {
  (notifications: CreateNotificationRequest[]): Promise<Notification[]>;
}
