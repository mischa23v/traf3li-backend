/**
 * Finance Full API Contracts
 *
 * Finance modules: invoice, expense, expense-claim, billing, payment, bill,
 * credit-note, quote, transaction, bank-account, AR aging, journal, fiscal-period, etc.
 *
 * Total: ~230 endpoints
 * @module FinanceFull
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE MODULE (34 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Invoice {
  export type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'void' | 'cancelled';
  export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'check' | 'online';

  export interface InvoiceRecord {
    _id: string;
    invoiceNumber: string;
    clientId: string;
    caseId?: string;
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
    lineItems: LineItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount?: { type: 'percentage' | 'fixed'; value: number };
    discountAmount: number;
    total: number;
    amountPaid: number;
    amountDue: number;
    currency: string;
    notes?: string;
    termsAndConditions?: string;
    payments: PaymentRecord[];
    zatcaStatus?: ZATCAStatus;
    sentAt?: string;
    viewedAt?: string;
    paidAt?: string;
    voidedAt?: string;
    voidReason?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    firmId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface LineItem {
    _id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxable: boolean;
    category?: string;
    timeEntryId?: string;
    expenseId?: string;
  }

  export interface PaymentRecord {
    _id: string;
    amount: number;
    method: PaymentMethod;
    date: string;
    reference?: string;
    notes?: string;
    recordedBy: string;
  }

  export interface ZATCAStatus {
    submitted: boolean;
    submittedAt?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'cleared';
    invoiceHash?: string;
    qrCode?: string;
    clearanceId?: string;
    errors?: string[];
  }

  export interface InvoiceStats {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    totalRevenue: number;
    totalOutstanding: number;
    averagePaymentDays: number;
  }

  export interface BillableItem {
    type: 'time_entry' | 'expense' | 'task';
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    date: string;
    caseId?: string;
    clientId: string;
  }

  export interface CreateInvoiceRequest {
    clientId: string;
    caseId?: string;
    dueDate: string;
    lineItems: Omit<LineItem, '_id' | 'amount'>[];
    taxRate?: number;
    discount?: { type: 'percentage' | 'fixed'; value: number };
    notes?: string;
    termsAndConditions?: string;
    currency?: string;
  }

  export interface RecordPaymentRequest {
    amount: number;
    method: PaymentMethod;
    date: string;
    reference?: string;
    notes?: string;
  }

  export interface SendInvoiceRequest {
    to: string[];
    cc?: string[];
    subject?: string;
    message?: string;
    attachPdf?: boolean;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }
  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: { page: number; limit: number; total: number; totalPages: number; };
  }

  // API ENDPOINTS (34)
  /** GET /api/invoice/stats */
  /** GET /api/invoice/overdue */
  /** GET /api/invoice/billable-items */
  /** GET /api/invoice/open/:clientId */
  /** POST /api/invoice/confirm-payment (Stripe webhook) */
  /** POST /api/invoice/bulk-delete */
  /** POST /api/invoice */
  /** GET /api/invoice */
  /** GET /api/invoice/:id */
  /** PATCH /api/invoice/:id */
  /** PUT /api/invoice/:id */
  /** DELETE /api/invoice/:id */
  /** POST /api/invoice/:id/send */
  /** POST /api/invoice/:id/record-payment */
  /** POST /api/invoice/:id/payments */
  /** POST /api/invoice/:id/void */
  /** POST /api/invoice/:id/duplicate */
  /** POST /api/invoice/:id/send-reminder */
  /** POST /api/invoice/:id/convert-to-credit-note */
  /** POST /api/invoice/:id/apply-retainer */
  /** POST /api/invoice/:id/submit-for-approval */
  /** POST /api/invoice/:id/approve */
  /** POST /api/invoice/:id/reject */
  /** POST /api/invoice/:id/zatca/submit */
  /** GET /api/invoice/:id/zatca/status */
  /** GET /api/invoice/:id/pdf */
  /** GET /api/invoice/:id/xml */
  /** POST /api/invoice/:id/payment */
}


// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSE MODULE (17 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Expense {
  export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'reimbursed';

  export interface ExpenseRecord {
    _id: string;
    description: string;
    amount: number;
    currency: string;
    category: string;
    date: string;
    caseId?: string;
    clientId?: string;
    isBillable: boolean;
    status: ExpenseStatus;
    receipt?: Receipt;
    vendor?: string;
    paymentMethod?: string;
    notes?: string;
    approvedBy?: string;
    approvedAt?: string;
    reimbursedAt?: string;
    firmId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface Receipt {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }

  export interface ExpenseCategory {
    _id: string;
    name: string;
    nameAr?: string;
    description?: string;
    isDefault: boolean;
    isActive: boolean;
    firmId?: string;
  }

  export interface CreateExpenseRequest {
    description: string;
    amount: number;
    currency?: string;
    category: string;
    date: string;
    caseId?: string;
    clientId?: string;
    isBillable?: boolean;
    vendor?: string;
    paymentMethod?: string;
    notes?: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (17)
  /** GET /api/expense/new */
  /** POST /api/expense/suggest-category */
  /** GET /api/expense/categories */
  /** POST /api/expense/categories */
  /** PUT /api/expense/categories/:id */
  /** DELETE /api/expense/categories/:id */
  /** GET /api/expense/stats */
  /** GET /api/expense */
  /** POST /api/expense */
  /** GET /api/expense/:id */
  /** PUT /api/expense/:id */
  /** DELETE /api/expense/:id */
  /** POST /api/expense/:id/receipt */
  /** DELETE /api/expense/:id/receipt */
  /** POST /api/expense/:id/approve */
  /** POST /api/expense/:id/reject */
  /** POST /api/expense/bulk-delete */
}


// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSE CLAIM MODULE (32 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace ExpenseClaim {
  export type ClaimStatus = 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'processing' | 'paid';

  export interface ExpenseClaimRecord {
    _id: string;
    claimNumber: string;
    employeeId: string;
    title: string;
    description?: string;
    expenses: ClaimExpense[];
    totalAmount: number;
    status: ClaimStatus;
    submittedAt?: string;
    approvalChain: ApprovalStep[];
    currentApprover?: string;
    paymentStatus?: 'pending' | 'processing' | 'paid';
    paidAt?: string;
    paidAmount?: number;
    paymentReference?: string;
    firmId?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface ClaimExpense {
    _id: string;
    expenseId?: string;
    description: string;
    category: string;
    amount: number;
    date: string;
    receiptUrl?: string;
    isBillable: boolean;
    clientId?: string;
    caseId?: string;
  }

  export interface ApprovalStep {
    approverId: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    actionAt?: string;
  }

  export interface ExpenseClaimStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalAmountPending: number;
    totalAmountApproved: number;
    averageProcessingDays: number;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (32)
  /** GET /api/expense-claim/stats */
  /** GET /api/expense-claim/pending-approvals */
  /** GET /api/expense-claim/pending-payments */
  /** GET /api/expense-claim/my-claims */
  /** GET /api/expense-claim/to-approve */
  /** POST /api/expense-claim */
  /** GET /api/expense-claim */
  /** GET /api/expense-claim/:id */
  /** PUT /api/expense-claim/:id */
  /** DELETE /api/expense-claim/:id */
  /** POST /api/expense-claim/:id/submit */
  /** POST /api/expense-claim/:id/approve */
  /** POST /api/expense-claim/:id/reject */
  /** POST /api/expense-claim/:id/return */
  /** POST /api/expense-claim/:id/process-payment */
  /** POST /api/expense-claim/:id/mark-paid */
  /** POST /api/expense-claim/:id/expenses */
  /** PUT /api/expense-claim/:id/expenses/:expenseId */
  /** DELETE /api/expense-claim/:id/expenses/:expenseId */
  /** POST /api/expense-claim/:id/expenses/:expenseId/receipt */
  /** GET /api/expense-claim/report/by-category */
  /** GET /api/expense-claim/report/by-employee */
  /** GET /api/expense-claim/report/by-client */
  /** GET /api/expense-claim/export */
  /** POST /api/expense-claim/bulk-approve */
  /** POST /api/expense-claim/bulk-reject */
  /** POST /api/expense-claim/bulk-delete */
}


// ═══════════════════════════════════════════════════════════════════════════════
// BILLING MODULE (16 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Billing {
  export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise';
  export type BillingCycle = 'monthly' | 'yearly';
  export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

  export interface Plan {
    _id: string;
    name: string;
    tier: PlanTier;
    price: { monthly: number; yearly: number };
    currency: string;
    features: PlanFeature[];
    limits: PlanLimits;
    isActive: boolean;
  }

  export interface PlanFeature {
    name: string;
    included: boolean;
    limit?: number;
  }

  export interface PlanLimits {
    users: number;
    cases: number;
    storage: number;
    integrations: number;
  }

  export interface Subscription {
    _id: string;
    firmId: string;
    planId: string;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEnd?: string;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  }

  export interface UsageRecord {
    firmId: string;
    period: string;
    users: { current: number; limit: number };
    cases: { current: number; limit: number };
    storage: { current: number; limit: number };
    apiCalls: number;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (16)
  /** GET /api/billing/plans */
  /** GET /api/billing/subscription */
  /** POST /api/billing/subscription */
  /** PATCH /api/billing/subscription */
  /** DELETE /api/billing/subscription */
  /** POST /api/billing/subscription/cancel */
  /** POST /api/billing/subscription/resume */
  /** GET /api/billing/usage */
  /** GET /api/billing/invoices */
  /** GET /api/billing/invoices/:id */
  /** GET /api/billing/invoices/:id/pdf */
  /** POST /api/billing/payment-method */
  /** GET /api/billing/payment-methods */
  /** DELETE /api/billing/payment-methods/:id */
  /** POST /api/billing/payment-methods/:id/default */
  /** GET /api/billing/upcoming-invoice */
}


// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT MODULE (20 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Payment {
  export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  export type PaymentType = 'invoice' | 'retainer' | 'trust' | 'refund';

  export interface PaymentRecord {
    _id: string;
    paymentNumber: string;
    clientId: string;
    invoiceId?: string;
    type: PaymentType;
    amount: number;
    currency: string;
    method: string;
    status: PaymentStatus;
    reference?: string;
    date: string;
    notes?: string;
    receiptUrl?: string;
    stripePaymentId?: string;
    refundedAmount?: number;
    firmId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface PaymentStats {
    totalReceived: number;
    pendingAmount: number;
    refundedAmount: number;
    byMethod: Record<string, number>;
    byMonth: { month: string; amount: number }[];
    averagePaymentAmount: number;
  }

  export interface CreatePaymentRequest {
    clientId: string;
    invoiceId?: string;
    type?: PaymentType;
    amount: number;
    currency?: string;
    method: string;
    date?: string;
    reference?: string;
    notes?: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (20)
  /** GET /api/payment/new */
  /** GET /api/payment/stats */
  /** GET /api/payment/summary */
  /** GET /api/payment/methods */
  /** GET /api/payment/recent */
  /** GET /api/payment/by-client/:clientId */
  /** GET /api/payment/by-invoice/:invoiceId */
  /** POST /api/payment */
  /** GET /api/payment */
  /** GET /api/payment/:id */
  /** PUT /api/payment/:id */
  /** DELETE /api/payment/:id */
  /** POST /api/payment/:id/refund */
  /** GET /api/payment/:id/receipt */
  /** POST /api/payment/:id/send-receipt */
  /** GET /api/payment/report/monthly */
  /** GET /api/payment/report/by-method */
  /** GET /api/payment/export */
  /** POST /api/payment/bulk-delete */
}


// ═══════════════════════════════════════════════════════════════════════════════
// BILL MODULE (20 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Bill {
  export type BillStatus = 'draft' | 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';

  export interface BillRecord {
    _id: string;
    billNumber: string;
    vendorId: string;
    vendorName: string;
    status: BillStatus;
    issueDate: string;
    dueDate: string;
    lineItems: BillLineItem[];
    subtotal: number;
    taxAmount: number;
    total: number;
    amountPaid: number;
    amountDue: number;
    currency: string;
    reference?: string;
    notes?: string;
    attachments?: string[];
    payments: BillPayment[];
    caseId?: string;
    firmId?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface BillLineItem {
    _id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    category?: string;
  }

  export interface BillPayment {
    _id: string;
    amount: number;
    date: string;
    method: string;
    reference?: string;
    recordedBy: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (20)
  /** POST /api/bill */
  /** GET /api/bill */
  /** GET /api/bill/overdue */
  /** GET /api/bill/stats */
  /** GET /api/bill/by-vendor/:vendorId */
  /** GET /api/bill/:id */
  /** PUT /api/bill/:id */
  /** DELETE /api/bill/:id */
  /** POST /api/bill/:id/pay */
  /** POST /api/bill/:id/record-payment */
  /** POST /api/bill/:id/void */
  /** POST /api/bill/:id/duplicate */
  /** POST /api/bill/:id/attachment */
  /** DELETE /api/bill/:id/attachment/:attachmentId */
  /** GET /api/bill/report/by-vendor */
  /** GET /api/bill/report/by-category */
  /** GET /api/bill/export */
  /** POST /api/bill/bulk-delete */
  /** POST /api/bill/bulk-pay */
}


// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL FINANCE MODULES (Condensed)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace CreditNote {
  export interface CreditNoteRecord {
    _id: string;
    creditNoteNumber: string;
    clientId: string;
    invoiceId?: string;
    amount: number;
    reason: string;
    status: 'draft' | 'issued' | 'applied' | 'void';
    appliedToInvoices?: { invoiceId: string; amount: number }[];
    firmId?: string;
    createdAt: string;
  }
  // 10 endpoints: CRUD, stats, apply to invoice
}

export namespace Quote {
  export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  export interface QuoteRecord {
    _id: string;
    quoteNumber: string;
    clientId: string;
    status: QuoteStatus;
    validUntil: string;
    lineItems: { description: string; quantity: number; unitPrice: number; amount: number }[];
    total: number;
    convertedInvoiceId?: string;
    firmId?: string;
    createdAt: string;
  }
  // 15 endpoints: CRUD, send, accept, convert to invoice
}

export namespace Transaction {
  export type TransactionType = 'income' | 'expense' | 'transfer';
  export interface TransactionRecord {
    _id: string;
    type: TransactionType;
    accountId: string;
    amount: number;
    date: string;
    description: string;
    category?: string;
    reference?: string;
    firmId?: string;
    createdAt: string;
  }
  // 10 endpoints: CRUD, balance
}

export namespace BankAccount {
  export interface BankAccountRecord {
    _id: string;
    name: string;
    bankName: string;
    accountNumber: string;
    iban?: string;
    currency: string;
    balance: number;
    isDefault: boolean;
    firmId?: string;
    createdAt: string;
  }
  // 10 endpoints: CRUD, summary
}

export namespace BankTransaction {
  export interface BankTransactionRecord {
    _id: string;
    accountId: string;
    type: 'deposit' | 'withdrawal' | 'transfer';
    amount: number;
    date: string;
    description: string;
    reference?: string;
    reconciled: boolean;
    firmId?: string;
  }
  // 6 endpoints: CRUD
}

export namespace BankTransfer {
  export interface BankTransferRecord {
    _id: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    reference?: string;
    firmId?: string;
  }
  // 4 endpoints: CRUD
}

export namespace BillPayment {
  export interface BillPaymentRecord {
    _id: string;
    billId: string;
    amount: number;
    date: string;
    method: string;
    reference?: string;
    firmId?: string;
  }
  // 4 endpoints: CRUD
}

export namespace ARaging {
  export interface AgingReport {
    clientId: string;
    clientName: string;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  }
  // 6 endpoints: report, summary, by-client
}

export namespace JournalEntry {
  export interface JournalEntryRecord {
    _id: string;
    entryNumber: string;
    date: string;
    description: string;
    lines: { accountId: string; debit: number; credit: number; description?: string }[];
    status: 'draft' | 'posted' | 'void';
    firmId?: string;
    createdAt: string;
  }
  // 8 endpoints: create simple, CRUD
}

export namespace FiscalPeriod {
  export interface FiscalPeriodRecord {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'open' | 'closed' | 'locked';
    isCurrent: boolean;
    firmId?: string;
  }
  // 12 endpoints: CRUD, current, can-post, close, reopen
}

export namespace GeneralLedger {
  export interface LedgerEntry {
    accountId: string;
    accountName: string;
    debit: number;
    credit: number;
    balance: number;
    date: string;
    description: string;
  }
  // 12 endpoints: stats, summary, trial-balance, by-account
}

export namespace Account {
  export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  export interface AccountRecord {
    _id: string;
    code: string;
    name: string;
    type: AccountType;
    parentId?: string;
    balance: number;
    isActive: boolean;
    firmId?: string;
  }
  // 7 endpoints: types, CRUD
}

export namespace Currency {
  export interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    date: string;
  }
  // 6 endpoints: settings, rates, convert
}

export namespace Statement {
  export interface ClientStatement {
    clientId: string;
    clientName: string;
    periodStart: string;
    periodEnd: string;
    openingBalance: number;
    transactions: StatementTransaction[];
    closingBalance: number;
  }
  export interface StatementTransaction {
    date: string;
    type: 'invoice' | 'payment' | 'credit';
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }
  // 7 endpoints: generate, list, by-client
}

export namespace BillingRate {
  export interface BillingRateRecord {
    _id: string;
    name: string;
    rate: number;
    currency: string;
    type: 'hourly' | 'fixed' | 'contingency';
    isDefault: boolean;
    userId?: string;
    caseTypeId?: string;
    firmId?: string;
  }
  // 8 endpoints: CRUD, stats
}

export namespace Retainer {
  export interface RetainerRecord {
    _id: string;
    clientId: string;
    amount: number;
    balance: number;
    currency: string;
    status: 'active' | 'depleted' | 'closed';
    replenishmentThreshold?: number;
    autoReplenish: boolean;
    transactions: RetainerTransaction[];
    firmId?: string;
    createdAt: string;
  }
  export interface RetainerTransaction {
    _id: string;
    type: 'deposit' | 'withdrawal' | 'refund';
    amount: number;
    date: string;
    invoiceId?: string;
    description?: string;
  }
  // 10 endpoints: CRUD, stats, replenish, apply, refund
}

export namespace Report {
  export interface ProfitLossReport {
    periodStart: string;
    periodEnd: string;
    revenue: { category: string; amount: number }[];
    totalRevenue: number;
    expenses: { category: string; amount: number }[];
    totalExpenses: number;
    netProfit: number;
  }
  export interface BalanceSheet {
    asOf: string;
    assets: { category: string; accounts: { name: string; balance: number }[] }[];
    totalAssets: number;
    liabilities: { category: string; accounts: { name: string; balance: number }[] }[];
    totalLiabilities: number;
    equity: { category: string; accounts: { name: string; balance: number }[] }[];
    totalEquity: number;
  }
  // 31 endpoints: profit-loss, balance-sheet, case-profitability, time-reports, etc.
}


/**
 * FINANCE FULL API CONTRACTS SUMMARY
 *
 * Total Modules: 22
 * Total Endpoints: ~230
 *
 * Breakdown:
 * - Invoice: 34 endpoints
 * - ExpenseClaim: 32 endpoints
 * - Report: 31 endpoints
 * - Payment: 20 endpoints
 * - Bill: 20 endpoints
 * - Expense: 17 endpoints
 * - Billing: 16 endpoints
 * - Quote: 15 endpoints
 * - FiscalPeriod: 12 endpoints
 * - GeneralLedger: 12 endpoints
 * - CreditNote: 10 endpoints
 * - Transaction: 10 endpoints
 * - BankAccount: 10 endpoints
 * - Retainer: 10 endpoints
 * - JournalEntry: 8 endpoints
 * - BillingRate: 8 endpoints
 * - Account: 7 endpoints
 * - Statement: 7 endpoints
 * - BankTransaction: 6 endpoints
 * - ARaging: 6 endpoints
 * - Currency: 6 endpoints
 * - BankTransfer: 4 endpoints
 * - BillPayment: 4 endpoints
 */
