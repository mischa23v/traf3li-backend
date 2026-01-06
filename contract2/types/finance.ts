/**
 * TypeScript Type Definitions for Finance Modules
 * Auto-generated from traf3li-backend API
 *
 * Modules: Invoice, Expense, Payment, Retainer, TimeTracking
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES & ENUMS
// ═══════════════════════════════════════════════════════════════

export type ObjectId = string;
export type ISODateString = string;

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// INVOICE MODULE
// ═══════════════════════════════════════════════════════════════

// Enums
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'void';

export type PaymentTerms =
  | 'due_on_receipt'
  | 'net_7'
  | 'net_15'
  | 'net_30'
  | 'net_45'
  | 'net_60'
  | 'net_90'
  | 'eom';

export type DiscountType = 'percentage' | 'fixed' | 'none';
export type ClientType = 'individual' | 'business';

// Invoice Item
export interface InvoiceItem {
  type?: 'service' | 'product' | 'discount' | 'comment' | 'subtotal';
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
  taxable?: boolean;
  timeEntryId?: ObjectId;
  expenseId?: ObjectId;
}

// Invoice
export interface Invoice {
  _id: ObjectId;
  invoiceNumber: string;
  caseId?: ObjectId;
  contractId?: ObjectId;
  lawyerId: ObjectId;
  firmId?: ObjectId;
  clientId: ObjectId;
  clientType: ClientType;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid?: number;
  balanceDue: number;
  discountType?: DiscountType;
  discountValue?: number;
  status: InvoiceStatus;
  issueDate: ISODateString;
  dueDate: ISODateString;
  paidDate?: ISODateString;
  paymentTerms: PaymentTerms;
  notes?: string;
  customerNotes?: string;
  internalNotes?: string;
  responsibleAttorneyId?: ObjectId;
  billingArrangement?: string;
  departmentId?: ObjectId;
  locationId?: ObjectId;
  firmSize?: string;
  customerPONumber?: string;
  matterNumber?: string;
  termsTemplate?: string;
  termsAndConditions?: string;
  applyFromRetainer?: number;
  retainerTransactionId?: ObjectId;
  bankAccountId?: ObjectId;
  paymentInstructions?: string;
  enableOnlinePayment?: boolean;
  attachments?: Array<{ url: string; filename: string }>;
  createdBy: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// POST /api/invoices - Create invoice
export interface CreateInvoiceRequest {
  clientId?: ObjectId;
  caseId?: ObjectId;
  contractId?: ObjectId;
  items: InvoiceItem[];
  subtotal?: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount?: number;
  dueDate?: ISODateString;
  paymentTerms?: PaymentTerms;
  notes?: string;
  customerNotes?: string;
  internalNotes?: string;
  discountType?: DiscountType;
  discountValue?: number;
  clientType?: ClientType;
  responsibleAttorneyId?: ObjectId;
  billingArrangement?: string;
  departmentId?: ObjectId;
  locationId?: ObjectId;
  firmSize?: string;
  customerPONumber?: string;
  matterNumber?: string;
  termsTemplate?: string;
  termsAndConditions?: string;
  applyFromRetainer?: number;
  bankAccountId?: ObjectId;
  paymentInstructions?: string;
  enableOnlinePayment?: boolean;
  attachments?: Array<{ url: string; filename: string }>;
}

export interface CreateInvoiceResponse {
  success: true;
  message: string;
  message_en: string;
  data: Invoice;
}

// GET /api/invoices - Get all invoices
export interface GetInvoicesQuery extends PaginationQuery {
  status?: InvoiceStatus;
  clientId?: ObjectId;
  caseId?: ObjectId;
  startDate?: ISODateString;
  endDate?: ISODateString;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeStats?: 'true' | 'false';
}

export interface GetInvoicesResponse {
  success: true;
  data: Invoice[];
  pagination: PaginationResponse;
  stats?: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  };
}

// GET /api/invoices/:id - Get single invoice
export interface GetInvoiceResponse {
  success: true;
  data: Invoice;
}

// PATCH /api/invoices/:id - Update invoice
export interface UpdateInvoiceRequest {
  items?: InvoiceItem[];
  dueDate?: ISODateString;
  paymentTerms?: PaymentTerms;
  notes?: string;
  customerNotes?: string;
  internalNotes?: string;
  discountType?: DiscountType;
  discountValue?: number;
  attachments?: Array<{ url: string; filename: string }>;
}

export interface UpdateInvoiceResponse {
  success: true;
  message: string;
  data: Invoice;
}

// DELETE /api/invoices/:id - Delete invoice
export interface DeleteInvoiceResponse {
  success: true;
  message: string;
}

// POST /api/invoices/:id/send - Send invoice
export interface SendInvoiceRequest {
  email?: string;
  template?: string;
  customMessage?: string;
  ccRecipients?: string[];
}

export interface SendInvoiceResponse {
  success: true;
  message: string;
  data: Invoice;
}

// POST /api/invoices/:id/record-payment - Record payment
export interface RecordPaymentRequest {
  amount: number;
  paymentMethod?: string;
  paymentDate?: ISODateString;
  transactionId?: string;
  notes?: string;
}

export interface RecordPaymentResponse {
  success: true;
  message: string;
  invoice: Invoice;
  payment?: any;
}

// POST /api/invoices/:id/void - Void invoice
export interface VoidInvoiceRequest {
  reason: string;
}

export interface VoidInvoiceResponse {
  success: true;
  message: string;
  data: Invoice;
}

// POST /api/invoices/:id/duplicate - Duplicate invoice
export interface DuplicateInvoiceResponse {
  success: true;
  message: string;
  data: Invoice;
}

// POST /api/invoices/:id/send-reminder - Send reminder
export interface SendReminderRequest {
  template?: string;
  customMessage?: string;
  ccRecipients?: string[];
}

export interface SendReminderResponse {
  success: true;
  message: string;
}

// POST /api/invoices/:id/convert-to-credit-note - Convert to credit note
export interface ConvertToCreditNoteRequest {
  reason?: string;
  amount?: number;
}

export interface ConvertToCreditNoteResponse {
  success: true;
  message: string;
  data: Invoice;
}

// POST /api/invoices/:id/apply-retainer - Apply retainer
export interface ApplyRetainerRequest {
  amount: number;
  retainerId: ObjectId;
}

export interface ApplyRetainerResponse {
  success: true;
  message: string;
  invoice: Invoice;
  retainer?: any;
}

// POST /api/invoices/:id/submit-for-approval - Submit for approval
export interface SubmitForApprovalResponse {
  success: true;
  message: string;
  data: Invoice;
}

// POST /api/invoices/:id/approve - Approve invoice
export interface ApproveInvoiceRequest {
  notes?: string;
}

export interface ApproveInvoiceResponse {
  success: true;
  message: string;
  data: Invoice;
}

// POST /api/invoices/:id/reject - Reject invoice
export interface RejectInvoiceRequest {
  reason: string;
}

export interface RejectInvoiceResponse {
  success: true;
  message: string;
  data: Invoice;
}

// POST /api/invoices/:id/zatca/submit - Submit to ZATCA
export interface SubmitToZATCAResponse {
  success: true;
  message: string;
  data: {
    invoice: Invoice;
    zatcaResponse?: any;
  };
}

// GET /api/invoices/:id/zatca/status - Get ZATCA status
export interface GetZATCAStatusResponse {
  success: true;
  data: {
    status: string;
    submittedAt?: ISODateString;
    response?: any;
  };
}

// GET /api/invoices/stats - Get statistics
export interface GetInvoiceStatsQuery {
  period?: 'week' | 'month' | 'quarter' | 'year';
  startDate?: ISODateString;
  endDate?: ISODateString;
  clientId?: ObjectId;
  caseId?: ObjectId;
}

export interface GetInvoiceStatsResponse {
  success: true;
  data: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    cancelled: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    averageValue: number;
    collectionRate: number;
  };
}

// GET /api/invoices/overdue - Get overdue invoices
export interface GetOverdueInvoicesResponse {
  success: true;
  data: Invoice[];
  total: number;
}

// GET /api/invoices/billable-items - Get billable items
export interface GetBillableItemsQuery {
  clientId?: ObjectId;
  caseId?: ObjectId;
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface GetBillableItemsResponse {
  success: true;
  data: {
    timeEntries: any[];
    expenses: any[];
    tasks: any[];
  };
}

// GET /api/invoices/open/:clientId - Get open invoices for client
export interface GetOpenInvoicesResponse {
  success: true;
  data: Invoice[];
  totalOutstanding: number;
}

// POST /api/invoices/confirm-payment - Confirm payment (Stripe webhook)
export interface ConfirmPaymentRequest {
  // Raw Stripe event body
}

export interface ConfirmPaymentResponse {
  success: true;
  message: string;
}

// POST /api/invoices/bulk-delete - Bulk delete
export interface BulkDeleteInvoicesRequest {
  ids: ObjectId[];
}

export interface BulkDeleteInvoicesResponse {
  success: true;
  message: string;
  deletedCount: number;
}

// GET /api/invoices/:id/pdf - Generate PDF
// Returns: File download

// GET /api/invoices/:id/xml - Generate XML
// Returns: File download

// POST /api/invoices/:id/payment - Create payment intent
export interface CreatePaymentIntentResponse {
  success: true;
  clientSecret: string;
  paymentIntentId: string;
}

// ═══════════════════════════════════════════════════════════════
// EXPENSE MODULE
// ═══════════════════════════════════════════════════════════════

// Enums
export type ExpenseCategory =
  | 'court_fees'
  | 'filing_fees'
  | 'travel'
  | 'accommodation'
  | 'meals'
  | 'office_supplies'
  | 'research'
  | 'expert_witness'
  | 'translation'
  | 'courier'
  | 'printing'
  | 'postage'
  | 'telecommunications'
  | 'government_fees'
  | 'professional_services'
  | 'marketing'
  | 'training'
  | 'software'
  | 'equipment'
  | 'other';

export type ExpenseStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid';
export type ExpenseType = 'reimbursable' | 'non_reimbursable';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
export type MarkupType = 'none' | 'percentage' | 'fixed';

// Expense
export interface Expense {
  _id: ObjectId;
  expenseId: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  category: ExpenseCategory;
  date: ISODateString;
  paymentMethod: PaymentMethod;
  vendor?: string;
  receiptNumber?: string;
  currency: string;
  expenseType: ExpenseType;
  employeeId?: ObjectId;
  isBillable: boolean;
  clientId?: ObjectId;
  caseId?: ObjectId;
  markupType: MarkupType;
  markupValue: number;
  taxRate: number;
  taxReclaimable: boolean;
  vendorTaxNumber?: string;
  travelDetails?: any;
  governmentReference?: string;
  departmentId?: ObjectId;
  locationId?: ObjectId;
  projectId?: ObjectId;
  costCenterId?: ObjectId;
  firmId?: ObjectId;
  lawyerId: ObjectId;
  receipt?: { url: string; filename: string };
  attachments: Array<{ url: string; filename: string; type: string }>;
  hasReceipt: boolean;
  notes?: string;
  internalNotes?: string;
  status: ExpenseStatus;
  submittedBy?: ObjectId;
  submittedAt?: ISODateString;
  approvedBy?: ObjectId;
  approvedAt?: ISODateString;
  reimbursementStatus?: string;
  reimbursedAmount?: number;
  invoiceId?: ObjectId;
  billingStatus?: string;
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// POST /api/expenses - Create expense
export interface CreateExpenseRequest {
  description: string;
  amount: number;
  taxAmount?: number;
  category: ExpenseCategory;
  date: ISODateString;
  paymentMethod?: PaymentMethod;
  vendor?: string;
  receiptNumber?: string;
  currency?: string;
  expenseType?: ExpenseType;
  employeeId?: ObjectId;
  isBillable?: boolean;
  clientId?: ObjectId;
  caseId?: ObjectId;
  markupType?: MarkupType;
  markupValue?: number;
  taxRate?: number;
  taxReclaimable?: boolean;
  vendorTaxNumber?: string;
  travelDetails?: any;
  governmentReference?: string;
  departmentId?: ObjectId;
  locationId?: ObjectId;
  projectId?: ObjectId;
  costCenterId?: ObjectId;
  receipt?: { url: string; filename: string };
  attachments?: Array<{ url: string; filename: string; type: string }>;
  notes?: string;
  internalNotes?: string;
  submitForApproval?: boolean;
}

export interface CreateExpenseResponse {
  success: true;
  message: string;
  expense: Expense;
}

// GET /api/expenses - Get expenses
export interface GetExpensesQuery extends PaginationQuery {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  caseId?: ObjectId;
  clientId?: ObjectId;
  employeeId?: ObjectId;
  expenseType?: ExpenseType;
  isBillable?: boolean;
  billingStatus?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface GetExpensesResponse {
  success: true;
  expenses: Expense[];
  pagination: PaginationResponse;
}

// GET /api/expenses/:id - Get single expense
export interface GetExpenseResponse {
  success: true;
  expense: Expense;
}

// PUT /api/expenses/:id - Update expense
export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  category?: ExpenseCategory;
  date?: ISODateString;
  receiptUrl?: string;
  caseId?: ObjectId;
  clientId?: ObjectId;
  notes?: string;
}

export interface UpdateExpenseResponse {
  success: true;
  message: string;
  expense: Expense;
}

// DELETE /api/expenses/:id - Delete expense
export interface DeleteExpenseResponse {
  success: true;
  message: string;
}

// POST /api/expenses/:id/submit - Submit for approval
export interface SubmitExpenseResponse {
  success: true;
  message: string;
  expense: Expense;
}

// POST /api/expenses/:id/approve - Approve expense
export interface ApproveExpenseResponse {
  success: true;
  message: string;
  expense: Expense;
  glEntryId?: ObjectId;
}

// POST /api/expenses/:id/reject - Reject expense
export interface RejectExpenseRequest {
  reason: string;
}

export interface RejectExpenseResponse {
  success: true;
  message: string;
  expense: Expense;
}

// POST /api/expenses/:id/reimburse - Mark as reimbursed
export interface MarkAsReimbursedRequest {
  amount?: number;
}

export interface MarkAsReimbursedResponse {
  success: true;
  message: string;
  expense: Expense;
}

// GET /api/expenses/stats - Get statistics
export interface GetExpenseStatsQuery {
  caseId?: ObjectId;
  clientId?: ObjectId;
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface GetExpenseStatsResponse {
  success: true;
  stats: {
    totalCount: number;
    totalAmount: number;
    approvedAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
    billableAmount: number;
    byCategory: Record<string, number>;
    byMonth: Array<{ month: string; amount: number; count: number }>;
    pendingReimbursements: number;
  };
}

// GET /api/expenses/by-category - Get expenses by category
export interface GetExpensesByCategoryResponse {
  success: true;
  data: Array<{ category: string; total: number; count: number }>;
}

// POST /api/expenses/:id/receipt - Upload receipt
export interface UploadReceiptRequest {
  filename?: string;
  url: string;
  mimeType?: string;
  size?: number;
  type?: string;
}

export interface UploadReceiptResponse {
  success: true;
  message: string;
  attachment: { url: string; filename: string };
}

// POST /api/expenses/suggest-category - Smart categorization
export interface SuggestCategoryRequest {
  description?: string;
  descriptions?: string[];
}

export interface SuggestCategoryResponse {
  success: true;
  data: {
    category?: string;
    confidence?: number;
    categories?: string[];
  };
}

// GET /api/expenses/categories - Get all categories
export interface GetExpenseCategoriesResponse {
  success: true;
  data: {
    categories: string[];
    expenseCategories: ExpenseCategory[];
    paymentMethods: PaymentMethod[];
    tripPurposes: string[];
    governmentEntities: string[];
  };
}

// POST /api/expenses/bulk-approve - Bulk approve
export interface BulkApproveExpensesRequest {
  expenseIds: ObjectId[];
}

export interface BulkApproveExpensesResponse {
  success: true;
  message: string;
  results: {
    approved: ObjectId[];
    failed: Array<{ id: ObjectId; error: string }>;
  };
}

// GET /api/expenses/new - Get new expense defaults
export interface GetNewExpenseDefaultsResponse {
  success: true;
  data: {
    description: string;
    amount: number;
    taxAmount: number;
    taxRate: number;
    category: string;
    date: string;
    paymentMethod: string;
    expenseType: string;
    isBillable: boolean;
    markupType: string;
    markupValue: number;
    currency: string;
  };
  enums: {
    categories: ExpenseCategory[];
    paymentMethods: PaymentMethod[];
    tripPurposes: string[];
    governmentEntities: string[];
  };
}

// POST /api/expenses/bulk-delete - Bulk delete
export interface BulkDeleteExpensesRequest {
  ids: ObjectId[];
}

export interface BulkDeleteExpensesResponse {
  success: true;
  message: string;
  deletedCount: number;
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT MODULE
// ═══════════════════════════════════════════════════════════════

// Enums
export type PaymentType = 'customer_payment' | 'vendor_payment' | 'refund' | 'retainer' | 'advance';
export type PaymentMethodType =
  | 'cash'
  | 'check'
  | 'bank_transfer'
  | 'card'
  | 'wire_transfer'
  | 'online'
  | 'other';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reconciled' | 'refunded';
export type CheckStatus = 'received' | 'deposited' | 'cleared' | 'bounced';
export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

// Payment
export interface Payment {
  _id: ObjectId;
  paymentNumber: string;
  paymentType: PaymentType;
  paymentDate: ISODateString;
  referenceNumber?: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  customerId?: ObjectId;
  clientId?: ObjectId;
  vendorId?: ObjectId;
  lawyerId: ObjectId;
  firmId?: ObjectId;
  paymentMethod: PaymentMethodType;
  bankAccountId?: ObjectId;
  checkDetails?: {
    checkNumber: string;
    checkDate: ISODateString;
    bank: string;
    status: CheckStatus;
    depositDate?: ISODateString;
    clearanceDate?: ISODateString;
    bounceReason?: string;
  };
  checkNumber?: string;
  checkDate?: ISODateString;
  bankName?: string;
  cardDetails?: {
    last4: string;
    cardType: CardType;
    expiryMonth: number;
    expiryYear: number;
  };
  gatewayProvider?: string;
  transactionId?: string;
  gatewayResponse?: any;
  idempotencyKey?: string;
  invoiceApplications: Array<{
    invoiceId: ObjectId;
    amount: number;
    appliedAt: ISODateString;
  }>;
  allocations: Array<{
    invoiceId: ObjectId;
    amount: number;
  }>;
  totalApplied: number;
  unappliedAmount: number;
  invoiceId?: ObjectId;
  caseId?: ObjectId;
  fees: {
    bankFees: number;
    processingFees: number;
    otherFees: number;
    paidBy: 'client' | 'office';
  };
  departmentId?: ObjectId;
  locationId?: ObjectId;
  receivedBy?: ObjectId;
  customerNotes?: string;
  internalNotes?: string;
  memo?: string;
  notes?: string;
  attachments: Array<{ url: string; filename: string }>;
  status: PaymentStatus;
  processedBy?: ObjectId;
  failureReason?: string;
  failureDate?: ISODateString;
  retryCount?: number;
  isRefund: boolean;
  refundDetails?: {
    originalPaymentId: ObjectId;
    reason: string;
    method: string;
  };
  originalPaymentId?: ObjectId;
  refundReason?: string;
  refundDate?: ISODateString;
  reconciliation?: {
    isReconciled: boolean;
    reconciledAt?: ISODateString;
    reconciledBy?: ObjectId;
    bankStatementRef?: string;
  };
  receiptSent?: boolean;
  receiptSentAt?: ISODateString;
  receiptSentTo?: string;
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// POST /api/payments - Create payment
export interface CreatePaymentRequest {
  paymentType?: PaymentType;
  paymentDate?: ISODateString;
  referenceNumber?: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  customerId?: ObjectId;
  clientId?: ObjectId;
  vendorId?: ObjectId;
  paymentMethod: PaymentMethodType;
  bankAccountId?: ObjectId;
  checkDetails?: {
    checkNumber: string;
    checkDate?: ISODateString;
    bank?: string;
    status?: CheckStatus;
  };
  checkNumber?: string;
  checkDate?: ISODateString;
  bankName?: string;
  cardDetails?: {
    last4: string;
    cardType: CardType;
    expiryMonth: number;
    expiryYear: number;
  };
  gatewayProvider?: string;
  transactionId?: string;
  gatewayResponse?: any;
  invoiceApplications?: Array<{
    invoiceId: ObjectId;
    amount: number;
  }>;
  allocations?: Array<{
    invoiceId: ObjectId;
    amount: number;
  }>;
  invoiceId?: ObjectId;
  caseId?: ObjectId;
  fees?: {
    bankFees?: number;
    processingFees?: number;
    otherFees?: number;
    paidBy?: 'client' | 'office';
  };
  departmentId?: ObjectId;
  locationId?: ObjectId;
  receivedBy?: ObjectId;
  customerNotes?: string;
  internalNotes?: string;
  memo?: string;
  notes?: string;
  attachments?: Array<{ url: string; filename: string }>;
  idempotency_key?: string;
}

export interface CreatePaymentResponse {
  success: true;
  message: string;
  payment: Payment;
  isIdempotent?: boolean;
}

// GET /api/payments - Get payments
export interface GetPaymentsQuery extends PaginationQuery {
  status?: PaymentStatus;
  paymentType?: PaymentType;
  paymentMethod?: PaymentMethodType;
  customerId?: ObjectId;
  clientId?: ObjectId;
  vendorId?: ObjectId;
  invoiceId?: ObjectId;
  caseId?: ObjectId;
  isReconciled?: 'true' | 'false';
  startDate?: ISODateString;
  endDate?: ISODateString;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface GetPaymentsResponse {
  success: true;
  data: Payment[];
  pagination: PaginationResponse;
  summary: Array<{
    _id: PaymentStatus;
    count: number;
    totalAmount: number;
  }>;
}

// GET /api/payments/new - Get new payment defaults
export interface GetNewPaymentDefaultsResponse {
  success: true;
  data: {
    paymentType: PaymentType;
    customerId: null;
    invoiceId: null;
    caseId: null;
    amount: number;
    currency: string;
    exchangeRate: number;
    paymentMethod: PaymentMethodType;
    paymentDate: string;
    fees: {
      bankFees: number;
      processingFees: number;
      otherFees: number;
      paidBy: string;
    };
    invoiceApplications: any[];
    notes: string;
    internalNotes: string;
    customerNotes: string;
  };
  enums: {
    paymentTypes: PaymentType[];
    paymentMethods: PaymentMethodType[];
    paymentStatuses: PaymentStatus[];
    checkStatuses: CheckStatus[];
    refundReasons: string[];
    cardTypes: CardType[];
  };
}

// GET /api/payments/:id - Get single payment
export interface GetPaymentResponse {
  success: true;
  data: Payment;
}

// PUT /api/payments/:id - Update payment
export interface UpdatePaymentRequest {
  paymentType?: PaymentType;
  paymentDate?: ISODateString;
  referenceNumber?: string;
  amount?: number;
  currency?: string;
  exchangeRate?: number;
  paymentMethod?: PaymentMethodType;
  bankAccountId?: ObjectId;
  checkDetails?: any;
  checkNumber?: string;
  checkDate?: ISODateString;
  bankName?: string;
  cardDetails?: any;
  gatewayProvider?: string;
  transactionId?: string;
  gatewayResponse?: any;
  fees?: any;
  departmentId?: ObjectId;
  locationId?: ObjectId;
  receivedBy?: ObjectId;
  customerNotes?: string;
  internalNotes?: string;
  memo?: string;
  notes?: string;
  attachments?: Array<{ url: string; filename: string }>;
}

export interface UpdatePaymentResponse {
  success: true;
  message: string;
  payment: Payment;
}

// DELETE /api/payments/:id - Delete payment
export interface DeletePaymentResponse {
  success: true;
  message: string;
}

// POST /api/payments/:id/complete - Complete payment
export interface CompletePaymentRequest {
  invoiceApplications?: Array<{
    invoiceId: ObjectId;
    amount: number;
  }>;
}

export interface CompletePaymentResponse {
  success: true;
  message: string;
  payment: Payment;
  glEntryId?: ObjectId;
}

// POST /api/payments/:id/fail - Mark as failed
export interface FailPaymentRequest {
  reason?: string;
}

export interface FailPaymentResponse {
  success: true;
  message: string;
  payment: Payment;
}

// POST /api/payments/:id/refund - Create refund
export interface CreateRefundRequest {
  amount?: number;
  reason?: string;
  method?: string;
}

export interface CreateRefundResponse {
  success: true;
  message: string;
  refund: Payment;
}

// POST /api/payments/:id/reconcile - Reconcile payment
export interface ReconcilePaymentRequest {
  bankStatementRef?: string;
}

export interface ReconcilePaymentResponse {
  success: true;
  message: string;
  payment: Payment;
}

// PUT /api/payments/:id/apply - Apply to invoices
export interface ApplyPaymentToInvoicesRequest {
  invoiceApplications: Array<{
    invoiceId: ObjectId;
    amount: number;
  }>;
}

export interface ApplyPaymentToInvoicesResponse {
  success: true;
  message: string;
  payment: Payment;
}

// DELETE /api/payments/:id/unapply/:invoiceId - Unapply from invoice
export interface UnapplyPaymentResponse {
  success: true;
  message: string;
  payment: Payment;
}

// PUT /api/payments/:id/check-status - Update check status
export interface UpdateCheckStatusRequest {
  status: CheckStatus;
  bounceReason?: string;
  depositDate?: ISODateString;
  clearanceDate?: ISODateString;
}

export interface UpdateCheckStatusResponse {
  success: true;
  message: string;
  payment: Payment;
}

// POST /api/payments/:id/send-receipt - Send receipt
export interface SendReceiptRequest {
  email?: string;
  template?: string;
}

export interface SendReceiptResponse {
  success: true;
  message: string;
  payment: Payment;
}

// GET /api/payments/stats - Get statistics
export interface GetPaymentStatsQuery {
  startDate?: ISODateString;
  endDate?: ISODateString;
  customerId?: ObjectId;
  clientId?: ObjectId;
}

export interface GetPaymentStatsResponse {
  success: true;
  data: {
    overall: {
      totalCount: number;
      totalAmount: number;
      completedCount: number;
      completedAmount: number;
      pendingCount: number;
      pendingAmount: number;
    };
    byMethod: Array<{
      _id: PaymentMethodType;
      count: number;
      totalAmount: number;
    }>;
    unreconciledCount: number;
    unreconciledAmount: number;
    pendingChecksCount: number;
    pendingChecksAmount: number;
  };
}

// GET /api/payments/summary - Get summary
export interface GetPaymentsSummaryQuery {
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface GetPaymentsSummaryResponse {
  success: true;
  summary: {
    totalReceived: number;
    thisMonth: number;
    pending: number;
    byMethod: Record<string, number>;
  };
}

// GET /api/payments/unreconciled - Get unreconciled payments
export interface GetUnreconciledPaymentsQuery {
  paymentMethod?: PaymentMethodType;
}

export interface GetUnreconciledPaymentsResponse {
  success: true;
  data: Payment[];
  total: number;
  totalAmount: number;
}

// GET /api/payments/pending-checks - Get pending checks
export interface GetPendingChecksResponse {
  success: true;
  data: Payment[];
  total: number;
  totalAmount: number;
}

// POST /api/invoices/:invoiceId/payments - Record invoice payment
export interface RecordInvoicePaymentRequest {
  amount: number;
  paymentMethod?: PaymentMethodType;
  transactionId?: string;
  notes?: string;
  idempotency_key?: string;
}

export interface RecordInvoicePaymentResponse {
  success: true;
  message: string;
  payment: Payment;
  invoice: {
    _id: ObjectId;
    invoiceNumber: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    status: InvoiceStatus;
  };
  glEntryId?: ObjectId;
  isIdempotent?: boolean;
}

// DELETE /api/payments/bulk - Bulk delete
export interface BulkDeletePaymentsRequest {
  paymentIds: ObjectId[];
}

export interface BulkDeletePaymentsResponse {
  success: true;
  message: string;
  count: number;
}

// ═══════════════════════════════════════════════════════════════
// RETAINER MODULE
// ═══════════════════════════════════════════════════════════════

// Enums
export type RetainerType = 'general' | 'evergreen' | 'fixed_fee' | 'advance';
export type RetainerStatus = 'active' | 'depleted' | 'refunded' | 'expired';

// Retainer
export interface Retainer {
  _id: ObjectId;
  retainerNumber: string;
  clientId: ObjectId;
  lawyerId: ObjectId;
  caseId?: ObjectId;
  retainerType: RetainerType;
  initialAmount: number;
  currentBalance: number;
  minimumBalance: number;
  startDate: ISODateString;
  endDate?: ISODateString;
  status: RetainerStatus;
  autoReplenish: boolean;
  replenishThreshold?: number;
  replenishAmount?: number;
  agreementUrl?: string;
  agreementSignedDate?: ISODateString;
  notes?: string;
  termsAndConditions?: string;
  consumptions: Array<{
    date: ISODateString;
    amount: number;
    invoiceId?: ObjectId;
    description?: string;
  }>;
  deposits: Array<{
    date: ISODateString;
    amount: number;
    paymentId?: ObjectId;
  }>;
  lowBalanceAlertSent: boolean;
  createdBy: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// POST /api/retainers - Create retainer
export interface CreateRetainerRequest {
  clientId: ObjectId;
  caseId?: ObjectId;
  retainerType: RetainerType;
  initialAmount: number;
  minimumBalance?: number;
  startDate?: ISODateString;
  endDate?: ISODateString;
  autoReplenish?: boolean;
  replenishThreshold?: number;
  replenishAmount?: number;
  agreementUrl?: string;
  agreementSignedDate?: ISODateString;
  notes?: string;
  termsAndConditions?: string;
}

export interface CreateRetainerResponse {
  success: true;
  message: string;
  retainer: Retainer;
}

// GET /api/retainers - Get retainers
export interface GetRetainersQuery extends PaginationQuery {
  status?: RetainerStatus;
  retainerType?: RetainerType;
  clientId?: ObjectId;
  caseId?: ObjectId;
}

export interface GetRetainersResponse {
  success: true;
  data: Retainer[];
  pagination: PaginationResponse;
  summary: Array<{
    _id: RetainerStatus;
    count: number;
    totalInitialAmount: number;
    totalCurrentBalance: number;
  }>;
}

// GET /api/retainers/:id - Get single retainer
export interface GetRetainerResponse {
  success: true;
  data: Retainer;
}

// PUT /api/retainers/:id - Update retainer
export interface UpdateRetainerRequest {
  minimumBalance?: number;
  endDate?: ISODateString;
  autoReplenish?: boolean;
  replenishThreshold?: number;
  replenishAmount?: number;
  agreementUrl?: string;
  agreementSignedDate?: ISODateString;
  notes?: string;
  termsAndConditions?: string;
}

export interface UpdateRetainerResponse {
  success: true;
  message: string;
  retainer: Retainer;
}

// POST /api/retainers/:id/consume - Consume from retainer
export interface ConsumeRetainerRequest {
  amount: number;
  invoiceId?: ObjectId;
  description?: string;
}

export interface ConsumeRetainerResponse {
  success: true;
  message: string;
  retainer: Retainer;
  lowBalanceAlert: boolean;
}

// POST /api/retainers/:id/replenish - Replenish retainer
export interface ReplenishRetainerRequest {
  amount: number;
  paymentId?: ObjectId;
}

export interface ReplenishRetainerResponse {
  success: true;
  message: string;
  retainer: Retainer;
}

// POST /api/retainers/:id/refund - Refund retainer
export interface RefundRetainerRequest {
  reason?: string;
}

export interface RefundRetainerResponse {
  success: true;
  message: string;
  retainer: Retainer;
  refundAmount: number;
}

// GET /api/retainers/:id/history - Get retainer history
export interface GetRetainerHistoryResponse {
  success: true;
  data: {
    retainerNumber: string;
    currentBalance: number;
    initialAmount: number;
    history: Array<{
      type: 'consumption' | 'deposit';
      date: ISODateString;
      amount: number;
      invoiceId?: ObjectId;
      paymentId?: ObjectId;
      description?: string;
    }>;
  };
}

// GET /api/retainers/stats - Get retainer statistics
export interface GetRetainerStatsQuery {
  clientId?: ObjectId;
  startDate?: ISODateString;
  endDate?: ISODateString;
}

export interface GetRetainerStatsResponse {
  success: true;
  data: {
    byStatus: Array<{
      _id: RetainerStatus;
      count: number;
      totalInitialAmount: number;
      totalCurrentBalance: number;
    }>;
    needingReplenishment: number;
    lowBalanceAlerts: number;
  };
}

// GET /api/retainers/low-balance - Get low balance retainers
export interface GetLowBalanceRetainersResponse {
  success: true;
  data: Retainer[];
  count: number;
}

// ═══════════════════════════════════════════════════════════════
// TIME TRACKING MODULE
// ═══════════════════════════════════════════════════════════════

// Enums
export type TimeType = 'billable' | 'non_billable' | 'pro_bono' | 'internal';
export type TimeEntryStatus =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested';
export type BillStatus = 'draft' | 'unbilled' | 'billed' | 'invoiced';

// Time Entry
export interface TimeEntry {
  _id: ObjectId;
  firmId?: ObjectId;
  assigneeId: ObjectId;
  userId: ObjectId;
  lawyerId: ObjectId;
  clientId: ObjectId;
  caseId?: ObjectId;
  date: ISODateString;
  description: string;
  duration: number; // in minutes
  hourlyRate: number;
  baseAmount: number;
  finalAmount: number;
  activityCode?: string;
  timeType: TimeType;
  isBillable: boolean;
  startTime?: string; // HH:mm format
  endTime?: string;
  breakMinutes?: number;
  notes?: string;
  attachments: Array<{ url: string; filename: string }>;
  departmentId?: ObjectId;
  locationId?: ObjectId;
  practiceArea?: string;
  phase?: string;
  taskId?: ObjectId;
  wasTimerBased: boolean;
  timerStartedAt?: ISODateString;
  timerPausedDuration?: number;
  writeOff: boolean;
  writeOffReason?: string;
  writeOffBy?: ObjectId;
  writeOffAt?: ISODateString;
  writeDown: boolean;
  writeDownAmount?: number;
  writeDownReason?: string;
  writeDownBy?: ObjectId;
  writeDownAt?: ISODateString;
  billStatus: BillStatus;
  status: TimeEntryStatus;
  submittedBy?: ObjectId;
  submittedAt?: ISODateString;
  approvedBy?: ObjectId;
  approvedAt?: ISODateString;
  rejectedBy?: ObjectId;
  rejectedAt?: ISODateString;
  rejectionReason?: string;
  changesRequestedBy?: ObjectId;
  changesRequestedAt?: ISODateString;
  changesRequestedReason?: string;
  requestedChanges?: string[];
  invoiceId?: ObjectId;
  history: Array<{
    action: string;
    performedBy: ObjectId;
    timestamp: ISODateString;
    details: any;
  }>;
  editHistory: Array<{
    editedBy: ObjectId;
    editedAt: ISODateString;
    changes: any;
  }>;
  createdBy: ObjectId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// POST /api/time-tracking/timer/start - Start timer
export interface StartTimerRequest {
  caseId?: ObjectId;
  clientId?: ObjectId;
  activityCode?: string;
  description?: string;
}

export interface StartTimerResponse {
  success: true;
  message: string;
  timer: {
    startedAt: ISODateString;
    hourlyRate: number;
    description: string;
    caseId?: ObjectId;
    clientId?: ObjectId;
    activityCode?: string;
  };
}

// POST /api/time-tracking/timer/pause - Pause timer
export interface PauseTimerResponse {
  success: true;
  message: string;
  timer: {
    pausedAt: ISODateString;
    elapsedMinutes: number;
  };
}

// POST /api/time-tracking/timer/resume - Resume timer
export interface ResumeTimerResponse {
  success: true;
  message: string;
  timer: {
    elapsedMinutes: number;
    pausedDuration: number;
  };
}

// POST /api/time-tracking/timer/stop - Stop timer
export interface StopTimerRequest {
  notes?: string;
  isBillable?: boolean;
  timeType?: TimeType;
}

export interface StopTimerResponse {
  success: true;
  message: string;
  data: {
    timeEntry: TimeEntry;
  };
}

// GET /api/time-tracking/timer/status - Get timer status
export interface GetTimerStatusResponse {
  success: true;
  isRunning: boolean;
  timer: {
    startedAt: ISODateString;
    description: string;
    caseId?: ObjectId;
    clientId?: ObjectId;
    activityCode?: string;
    hourlyRate: number;
    isPaused: boolean;
    pausedAt?: ISODateString;
    elapsedMinutes: number;
    pausedDuration: number;
  } | null;
}

// POST /api/time-tracking/entries - Create time entry
export interface CreateTimeEntryRequest {
  clientId: ObjectId;
  caseId?: ObjectId;
  date: ISODateString;
  description: string;
  duration: number;
  hourlyRate: number;
  activityCode?: string;
  timeType?: TimeType;
  isBillable?: boolean;
  notes?: string;
  attachments?: Array<{ url: string; filename: string }>;
  assigneeId?: ObjectId;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  departmentId?: ObjectId;
  locationId?: ObjectId;
  practiceArea?: string;
  phase?: string;
  taskId?: ObjectId;
  writeOff?: boolean;
  writeOffReason?: string;
  writeDown?: boolean;
  writeDownAmount?: number;
  writeDownReason?: string;
  billStatus?: BillStatus;
}

export interface CreateTimeEntryResponse {
  success: true;
  message: string;
  data: {
    timeEntry: TimeEntry;
  };
}

// GET /api/time-tracking/entries - Get time entries
export interface GetTimeEntriesQuery extends PaginationQuery {
  status?: TimeEntryStatus;
  billStatus?: BillStatus;
  caseId?: ObjectId;
  clientId?: ObjectId;
  assigneeId?: ObjectId;
  startDate?: ISODateString;
  endDate?: ISODateString;
  isBillable?: 'true' | 'false';
  timeType?: TimeType;
  activityCode?: string;
}

export interface GetTimeEntriesResponse {
  success: true;
  data: {
    entries: TimeEntry[];
    total: number;
    page: number;
    totalPages: number;
    summary: {
      totalDuration: number;
      totalBillable: number;
      totalAmount: number;
      byTimeType: {
        billable: number;
        non_billable: number;
        pro_bono: number;
        internal: number;
      };
    };
  };
}

// GET /api/time-tracking/entries/:id - Get single time entry
export interface GetTimeEntryResponse {
  success: true;
  data: TimeEntry;
}

// PATCH /api/time-tracking/entries/:id - Update time entry
export interface UpdateTimeEntryRequest {
  description?: string;
  duration?: number;
  hourlyRate?: number;
  activityCode?: string;
  timeType?: TimeType;
  isBillable?: boolean;
  notes?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  date?: ISODateString;
  clientId?: ObjectId;
  caseId?: ObjectId;
  assigneeId?: ObjectId;
  departmentId?: ObjectId;
  locationId?: ObjectId;
  practiceArea?: string;
  phase?: string;
  taskId?: ObjectId;
}

export interface UpdateTimeEntryResponse {
  success: true;
  message: string;
  data: {
    timeEntry: TimeEntry;
  };
}

// DELETE /api/time-tracking/entries/:id - Delete time entry
export interface DeleteTimeEntryResponse {
  success: true;
  message: string;
}

// POST /api/time-tracking/entries/:id/write-off - Write off entry
export interface WriteOffTimeEntryRequest {
  reason: string;
}

export interface WriteOffTimeEntryResponse {
  success: true;
  message: string;
  data: {
    timeEntry: TimeEntry;
  };
}

// POST /api/time-tracking/entries/:id/write-down - Write down entry
export interface WriteDownTimeEntryRequest {
  amount: number;
  reason: string;
}

export interface WriteDownTimeEntryResponse {
  success: true;
  message: string;
  data: {
    timeEntry: TimeEntry;
  };
}

// POST /api/time-tracking/entries/:id/submit - Submit for approval
export interface SubmitTimeEntryResponse {
  success: true;
  message: string;
  data: {
    timeEntry: TimeEntry;
  };
}

// POST /api/time-tracking/entries/:id/request-changes - Request changes
export interface RequestChangesTimeEntryRequest {
  reason: string;
  requestedChanges?: string[];
}

export interface RequestChangesTimeEntryResponse {
  success: true;
  message: string;
  data: {
    timeEntry: TimeEntry;
  };
}

// POST /api/time-tracking/entries/:id/approve - Approve entry
export interface ApproveTimeEntryResponse {
  success: true;
  message: string;
  data: {
    timeEntry: TimeEntry;
  };
}

// POST /api/time-tracking/entries/:id/reject - Reject entry
export interface RejectTimeEntryRequest {
  reason: string;
}

export interface RejectTimeEntryResponse {
  success: true;
  message: string;
  data: {
    timeEntry: TimeEntry;
  };
}

// GET /api/time-tracking/stats - Get statistics
export interface GetTimeStatsQuery {
  startDate?: ISODateString;
  endDate?: ISODateString;
  caseId?: ObjectId;
  clientId?: ObjectId;
  assigneeId?: ObjectId;
  groupBy?: 'day' | 'week' | 'month';
}

export interface GetTimeStatsResponse {
  success: true;
  data: {
    overall: {
      totalEntries: number;
      totalDuration: number;
      totalAmount: number;
      billableDuration: number;
      billableAmount: number;
      avgHourlyRate: number;
    };
    byTimeType: Array<{
      _id: TimeType;
      count: number;
      totalDuration: number;
      totalAmount: number;
    }>;
    byActivity: Array<{
      _id: string;
      count: number;
      totalDuration: number;
      totalAmount: number;
    }>;
    byStatus: Array<{
      _id: TimeEntryStatus;
      count: number;
      totalAmount: number;
    }>;
    byBillStatus: Array<{
      _id: BillStatus;
      count: number;
      totalAmount: number;
    }>;
  };
}

// GET /api/time-tracking/weekly - Get weekly entries
export interface GetWeeklyEntriesQuery {
  weekStartDate?: ISODateString;
}

export interface GetWeeklyEntriesResponse {
  success: true;
  data: {
    weekStartDate: string;
    weekEndDate: string;
    projects: Array<{
      projectId: string;
      projectName: string;
      clientName: string;
      entries: Record<string, Array<{
        entryId: ObjectId;
        duration: number;
        description: string;
        isBillable: boolean;
        timeType: TimeType;
      }>>;
      totalHours: number;
    }>;
    dailyTotals: Record<string, number>;
    weeklyTotal: number;
  };
}

// GET /api/time-tracking/unbilled - Get unbilled entries
export interface GetUnbilledEntriesQuery {
  clientId?: ObjectId;
  caseId?: ObjectId;
}

export interface GetUnbilledEntriesResponse {
  success: true;
  data: {
    entries: TimeEntry[];
    count: number;
    totalAmount: number;
    totalDuration: number;
  };
}

// GET /api/time-tracking/activity-codes - Get activity codes
export interface GetActivityCodesResponse {
  success: true;
  data: {
    codes: Array<{
      code: string;
      name: string;
      nameAr: string;
      category: string;
    }>;
    grouped: Record<string, Array<{
      code: string;
      name: string;
      nameAr: string;
      category: string;
    }>>;
    timeTypes: Array<{
      value: TimeType;
      label: string;
      labelAr: string;
    }>;
  };
}

// DELETE /api/time-tracking/entries/bulk - Bulk delete
export interface BulkDeleteTimeEntriesRequest {
  entryIds: ObjectId[];
}

export interface BulkDeleteTimeEntriesResponse {
  success: true;
  message: string;
  count: number;
}

// GET /api/time-tracking/entries/pending-approval - Get pending approval entries
export interface GetPendingApprovalEntriesQuery extends PaginationQuery {
  assigneeId?: ObjectId;
  clientId?: ObjectId;
  caseId?: ObjectId;
}

export interface GetPendingApprovalEntriesResponse {
  success: true;
  data: {
    entries: TimeEntry[];
    total: number;
    page: number;
    totalPages: number;
    summary: {
      totalEntries: number;
      totalDuration: number;
      totalAmount: number;
    };
  };
}

// POST /api/time-tracking/entries/bulk-submit - Bulk submit
export interface BulkSubmitTimeEntriesRequest {
  entryIds: ObjectId[];
}

export interface BulkSubmitTimeEntriesResponse {
  success: true;
  message: string;
  count: number;
}

// POST /api/time-tracking/entries/bulk-reject - Bulk reject
export interface BulkRejectTimeEntriesRequest {
  entryIds: ObjectId[];
  reason: string;
}

export interface BulkRejectTimeEntriesResponse {
  success: true;
  message: string;
  count: number;
}

// POST /api/time-tracking/entries/bulk-approve - Bulk approve
export interface BulkApproveTimeEntriesRequest {
  entryIds: ObjectId[];
}

export interface BulkApproveTimeEntriesResponse {
  success: true;
  message: string;
  count: number;
}
