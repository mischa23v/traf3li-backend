/**
 * Finance & HR Extended API Contracts
 *
 * Additional finance and HR modules not covered in the base contracts.
 *
 * Modules:
 * - Corporate Cards (15 endpoints)
 * - Dunning (15 endpoints)
 * - Expense Policy (13 endpoints)
 * - Recurring Invoice (13 endpoints)
 * - Employee Loan (24 endpoints)
 * - Trust Account (17 endpoints)
 * - Invoice Approval (9 endpoints)
 * - Payout (10 endpoints)
 * - Grievance (27 endpoints)
 * - Organizational Unit (25 endpoints)
 * - Rate Card (8 endpoints)
 * - Rate Group (6 endpoints)
 * - Rate Limit (5 endpoints)
 * - Employee Advance (12 endpoints)
 * - Employee Benefit (10 endpoints)
 * - Compensation Reward (8 endpoints)
 * - Peer Review (10 endpoints)
 * - HR Analytics (8 endpoints)
 * - Income Tax Slab (6 endpoints)
 * - Finance Setup (10 endpoints)
 * - Invoice Template (8 endpoints)
 * - Payment Receipt (6 endpoints)
 * - Recurring Transaction (10 endpoints)
 *
 * Total: ~265 endpoints
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationResponse;
}

// ═══════════════════════════════════════════════════════════════
// CORPORATE CARDS
// Base route: /api/corporate-cards
// ═══════════════════════════════════════════════════════════════

export namespace CorporateCard {
  export type CardStatus = 'active' | 'blocked' | 'expired' | 'cancelled';
  export type TransactionStatus = 'pending' | 'matched' | 'unmatched' | 'disputed' | 'reconciled';

  export interface Card {
    _id: string;
    firmId: string;
    cardNumber: string;
    cardholderName: string;
    cardType: 'visa' | 'mastercard' | 'amex';
    expiryDate: string;
    spendingLimit: number;
    currentBalance: number;
    status: CardStatus;
    assignedTo?: string;
    department?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface Transaction {
    _id: string;
    cardId: string;
    amount: number;
    currency: string;
    merchantName: string;
    merchantCategory: string;
    transactionDate: string;
    status: TransactionStatus;
    matchedExpenseId?: string;
    description?: string;
    receipt?: string;
    disputed: boolean;
    disputeReason?: string;
  }

  export interface SpendingStats {
    totalSpent: number;
    byCategory: Record<string, number>;
    byCard: Record<string, number>;
    monthlyTrend: Array<{ month: string; amount: number }>;
  }

  // GET /api/corporate-cards
  export interface ListCardsQuery extends PaginationQuery {
    status?: CardStatus;
    assignedTo?: string;
    department?: string;
  }
  export type ListCardsResponse = ApiListResponse<Card>;

  // GET /api/corporate-cards/summary
  export interface SummaryResponse extends ApiResponse<{
    totalCards: number;
    activeCards: number;
    totalSpendingLimit: number;
    totalBalance: number;
    cardsByStatus: Record<CardStatus, number>;
  }> {}

  // GET /api/corporate-cards/spending-stats
  export interface SpendingStatsQuery {
    startDate?: string;
    endDate?: string;
    cardId?: string;
  }
  export type SpendingStatsResponse = ApiResponse<SpendingStats>;

  // GET /api/corporate-cards/:id
  export type GetCardResponse = ApiResponse<Card>;

  // GET /api/corporate-cards/:id/transactions
  export interface TransactionsQuery extends PaginationQuery {
    status?: TransactionStatus;
    startDate?: string;
    endDate?: string;
  }
  export type TransactionsResponse = ApiListResponse<Transaction>;

  // GET /api/corporate-cards/:id/transactions/unmatched
  export type UnmatchedTransactionsResponse = ApiListResponse<Transaction>;

  // POST /api/corporate-cards
  export interface CreateCardRequest {
    cardNumber: string;
    cardholderName: string;
    cardType: 'visa' | 'mastercard' | 'amex';
    expiryDate: string;
    spendingLimit: number;
    assignedTo?: string;
    department?: string;
  }
  export type CreateCardResponse = ApiResponse<Card>;

  // PUT /api/corporate-cards/:id
  export interface UpdateCardRequest {
    cardholderName?: string;
    spendingLimit?: number;
    assignedTo?: string;
    department?: string;
  }
  export type UpdateCardResponse = ApiResponse<Card>;

  // POST /api/corporate-cards/:id/block
  export type BlockCardResponse = ApiResponse<Card>;

  // POST /api/corporate-cards/:id/unblock
  export type UnblockCardResponse = ApiResponse<Card>;

  // POST /api/corporate-cards/:id/transactions/import
  export interface ImportTransactionsRequest {
    file: File; // CSV/Excel file
    format?: 'csv' | 'xlsx';
  }
  export interface ImportTransactionsResponse extends ApiResponse<{
    imported: number;
    failed: number;
    errors?: string[];
  }> {}

  // POST /api/corporate-cards/:id/transactions/:transactionId/reconcile
  export interface ReconcileTransactionRequest {
    expenseId: string;
  }
  export type ReconcileTransactionResponse = ApiResponse<Transaction>;

  // POST /api/corporate-cards/:id/transactions/:transactionId/dispute
  export interface DisputeTransactionRequest {
    reason: string;
    description?: string;
  }
  export type DisputeTransactionResponse = ApiResponse<Transaction>;

  // POST /api/corporate-cards/:id/transactions/:transactionId/categorize
  export interface CategorizeTransactionRequest {
    category: string;
    subcategory?: string;
  }
  export type CategorizeTransactionResponse = ApiResponse<Transaction>;

  // DELETE /api/corporate-cards/:id
  export type DeleteCardResponse = ApiResponse<{ deleted: boolean }>;
}

// ═══════════════════════════════════════════════════════════════
// DUNNING
// Base route: /api/dunning
// ═══════════════════════════════════════════════════════════════

export namespace Dunning {
  export type DunningAction = 'email' | 'sms' | 'call' | 'collection_agency';
  export type LateFeeType = 'fixed' | 'percentage';
  export type DaysOverdue = 7 | 14 | 30 | 60 | 90;

  export interface DunningStage {
    order: number;
    daysOverdue: DaysOverdue;
    action: DunningAction;
    template?: string;
    addLateFee: boolean;
    lateFeeAmount: number;
    lateFeeType: LateFeeType;
    escalateTo?: string;
  }

  export interface DunningPolicy {
    _id: string;
    firmId: string;
    name: string;
    stages: DunningStage[];
    pauseConditions: ('dispute_open' | 'payment_plan_active')[];
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface DunningHistory {
    _id: string;
    invoiceId: string;
    policyId: string;
    currentStage: number;
    isPaused: boolean;
    pauseReason?: string;
    actions: Array<{
      date: string;
      action: DunningAction;
      stage: number;
      notes?: string;
      performedBy?: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }

  // GET /api/dunning/dashboard
  export interface DashboardResponse extends ApiResponse<{
    totalOverdue: number;
    totalOverdueAmount: number;
    byStage: Record<number, { count: number; amount: number }>;
    pausedCount: number;
    collectionsRate: number;
  }> {}

  // GET /api/dunning/report
  export interface ReportQuery {
    startDate?: string;
    endDate?: string;
    stage?: number;
  }
  export interface ReportResponse extends ApiResponse<{
    collections: Array<{
      invoiceId: string;
      clientName: string;
      amount: number;
      daysOverdue: number;
      stage: number;
      lastAction?: string;
    }>;
    summary: {
      totalAttempted: number;
      totalCollected: number;
      successRate: number;
    };
  }> {}

  // GET /api/dunning/policies
  export type ListPoliciesResponse = ApiListResponse<DunningPolicy>;

  // POST /api/dunning/policies
  export interface CreatePolicyRequest {
    name: string;
    stages: DunningStage[];
    pauseConditions?: ('dispute_open' | 'payment_plan_active')[];
    isDefault?: boolean;
    isActive?: boolean;
  }
  export type CreatePolicyResponse = ApiResponse<DunningPolicy>;

  // GET /api/dunning/policies/:id
  export type GetPolicyResponse = ApiResponse<DunningPolicy>;

  // PUT /api/dunning/policies/:id
  export interface UpdatePolicyRequest {
    name?: string;
    stages?: DunningStage[];
    pauseConditions?: ('dispute_open' | 'payment_plan_active')[];
    isActive?: boolean;
  }
  export type UpdatePolicyResponse = ApiResponse<DunningPolicy>;

  // DELETE /api/dunning/policies/:id
  export type DeletePolicyResponse = ApiResponse<{ deleted: boolean }>;

  // POST /api/dunning/policies/:id/set-default
  export type SetDefaultResponse = ApiResponse<DunningPolicy>;

  // GET /api/dunning/history
  export interface HistoryQuery extends PaginationQuery {
    status?: 'active' | 'paused' | 'completed';
    stage?: number;
  }
  export type HistoryResponse = ApiListResponse<DunningHistory>;

  // GET /api/dunning/history/invoice/:invoiceId
  export type InvoiceHistoryResponse = ApiResponse<DunningHistory>;

  // POST /api/dunning/history/:invoiceId/pause
  export interface PauseRequest {
    reason: string;
  }
  export type PauseResponse = ApiResponse<DunningHistory>;

  // POST /api/dunning/history/:invoiceId/resume
  export type ResumeResponse = ApiResponse<DunningHistory>;

  // POST /api/dunning/history/:invoiceId/escalate
  export type EscalateResponse = ApiResponse<DunningHistory>;
}

// ═══════════════════════════════════════════════════════════════
// EXPENSE POLICY
// Base route: /api/expense-policies
// ═══════════════════════════════════════════════════════════════

export namespace ExpensePolicy {
  export interface CategoryLimit {
    category: string;
    maxAmount: number;
    requiresReceipt: boolean;
    requiresApproval: boolean;
    approvalThreshold?: number;
  }

  export interface Policy {
    _id: string;
    firmId: string;
    name: string;
    description?: string;
    categoryLimits: CategoryLimit[];
    dailyLimit?: number;
    monthlyLimit?: number;
    requiresReceipt: boolean;
    receiptThreshold: number;
    approvalWorkflow: {
      enabled: boolean;
      levels: Array<{
        threshold: number;
        approvers: string[];
      }>;
    };
    isDefault: boolean;
    isActive: boolean;
    appliesTo: {
      departments?: string[];
      roles?: string[];
      users?: string[];
    };
    createdAt: string;
    updatedAt: string;
  }

  export interface ComplianceResult {
    isCompliant: boolean;
    violations: Array<{
      rule: string;
      message: string;
      severity: 'warning' | 'error';
    }>;
    requiresApproval: boolean;
    approvers?: string[];
  }

  // GET /api/expense-policies
  export type ListPoliciesResponse = ApiListResponse<Policy>;

  // GET /api/expense-policies/default
  export type GetDefaultResponse = ApiResponse<Policy>;

  // GET /api/expense-policies/my-policy
  export type GetMyPolicyResponse = ApiResponse<Policy>;

  // POST /api/expense-policies/create-default
  export type CreateDefaultResponse = ApiResponse<Policy>;

  // GET /api/expense-policies/:id
  export type GetPolicyResponse = ApiResponse<Policy>;

  // POST /api/expense-policies
  export interface CreatePolicyRequest {
    name: string;
    description?: string;
    categoryLimits?: CategoryLimit[];
    dailyLimit?: number;
    monthlyLimit?: number;
    requiresReceipt?: boolean;
    receiptThreshold?: number;
    approvalWorkflow?: Policy['approvalWorkflow'];
    appliesTo?: Policy['appliesTo'];
  }
  export type CreatePolicyResponse = ApiResponse<Policy>;

  // PUT /api/expense-policies/:id
  export type UpdatePolicyRequest = Partial<CreatePolicyRequest>;
  export type UpdatePolicyResponse = ApiResponse<Policy>;

  // POST /api/expense-policies/:id/set-default
  export type SetDefaultResponse = ApiResponse<Policy>;

  // POST /api/expense-policies/:id/toggle-status
  export type ToggleStatusResponse = ApiResponse<Policy>;

  // POST /api/expense-policies/:id/duplicate
  export type DuplicateResponse = ApiResponse<Policy>;

  // POST /api/expense-policies/:policyId/check-compliance
  export interface CheckComplianceRequest {
    amount: number;
    category: string;
    hasReceipt: boolean;
    description?: string;
  }
  export type CheckComplianceResponse = ApiResponse<ComplianceResult>;

  // DELETE /api/expense-policies/:id
  export type DeletePolicyResponse = ApiResponse<{ deleted: boolean }>;
}

// ═══════════════════════════════════════════════════════════════
// RECURRING INVOICE
// Base route: /api/recurring-invoices
// ═══════════════════════════════════════════════════════════════

export namespace RecurringInvoice {
  export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  export type Status = 'draft' | 'active' | 'paused' | 'cancelled' | 'completed';

  export interface RecurringInvoice {
    _id: string;
    firmId: string;
    clientId: string;
    clientName: string;
    templateInvoice: {
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
      }>;
      subtotal: number;
      tax: number;
      total: number;
      notes?: string;
    };
    frequency: Frequency;
    startDate: string;
    endDate?: string;
    nextGenerationDate: string;
    lastGeneratedDate?: string;
    totalGenerated: number;
    status: Status;
    autoSend: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface GeneratedInvoice {
    _id: string;
    invoiceNumber: string;
    generatedDate: string;
    amount: number;
    status: string;
  }

  // GET /api/recurring-invoices
  export interface ListQuery extends PaginationQuery {
    status?: Status;
    clientId?: string;
  }
  export type ListResponse = ApiListResponse<RecurringInvoice>;

  // GET /api/recurring-invoices/stats
  export interface StatsResponse extends ApiResponse<{
    total: number;
    active: number;
    paused: number;
    totalMonthlyRevenue: number;
    byFrequency: Record<Frequency, number>;
  }> {}

  // GET /api/recurring-invoices/:id
  export type GetResponse = ApiResponse<RecurringInvoice>;

  // GET /api/recurring-invoices/:id/history
  export type HistoryResponse = ApiListResponse<GeneratedInvoice>;

  // GET /api/recurring-invoices/:id/preview
  export interface PreviewResponse extends ApiResponse<{
    previewInvoice: {
      items: RecurringInvoice['templateInvoice']['items'];
      subtotal: number;
      tax: number;
      total: number;
      dueDate: string;
    };
  }> {}

  // POST /api/recurring-invoices
  export interface CreateRequest {
    clientId: string;
    items: RecurringInvoice['templateInvoice']['items'];
    frequency: Frequency;
    startDate: string;
    endDate?: string;
    autoSend?: boolean;
    notes?: string;
  }
  export type CreateResponse = ApiResponse<RecurringInvoice>;

  // PUT /api/recurring-invoices/:id
  export type UpdateRequest = Partial<CreateRequest>;
  export type UpdateResponse = ApiResponse<RecurringInvoice>;

  // POST /api/recurring-invoices/:id/pause
  export type PauseResponse = ApiResponse<RecurringInvoice>;

  // POST /api/recurring-invoices/:id/resume
  export type ResumeResponse = ApiResponse<RecurringInvoice>;

  // POST /api/recurring-invoices/:id/cancel
  export type CancelResponse = ApiResponse<RecurringInvoice>;

  // POST /api/recurring-invoices/:id/generate
  export interface GenerateResponse extends ApiResponse<{
    generatedInvoice: GeneratedInvoice;
  }> {}

  // POST /api/recurring-invoices/:id/duplicate
  export type DuplicateResponse = ApiResponse<RecurringInvoice>;

  // DELETE /api/recurring-invoices/:id
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;
}

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE LOAN
// Base route: /api/hr/employee-loans
// ═══════════════════════════════════════════════════════════════

export namespace EmployeeLoan {
  export type LoanType = 'personal' | 'emergency' | 'education' | 'housing' | 'vehicle' | 'medical';
  export type LoanStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'disbursed' | 'active' | 'defaulted' | 'settled' | 'closed';
  export type RepaymentMethod = 'salary_deduction' | 'bank_transfer' | 'cash';

  export interface Loan {
    _id: string;
    firmId: string;
    employeeId: string;
    employeeName: string;
    loanType: LoanType;
    principalAmount: number;
    interestRate: number;
    tenure: number; // months
    monthlyInstallment: number;
    totalPayable: number;
    outstandingBalance: number;
    paidAmount: number;
    status: LoanStatus;
    repaymentMethod: RepaymentMethod;
    disbursementDate?: string;
    nextInstallmentDate?: string;
    approvedBy?: string;
    approvalDate?: string;
    rejectionReason?: string;
    documents: Array<{
      name: string;
      url: string;
      uploadedAt: string;
    }>;
    communications: Array<{
      date: string;
      type: string;
      message: string;
      sentBy: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }

  export interface LoanStats {
    totalLoans: number;
    totalDisbursed: number;
    totalOutstanding: number;
    byStatus: Record<LoanStatus, number>;
    byType: Record<LoanType, { count: number; amount: number }>;
  }

  // GET /api/hr/employee-loans
  export interface ListQuery extends PaginationQuery {
    status?: LoanStatus;
    loanType?: LoanType;
    employeeId?: string;
  }
  export type ListResponse = ApiListResponse<Loan>;

  // GET /api/hr/employee-loans/stats
  export type StatsResponse = ApiResponse<LoanStats>;

  // GET /api/hr/employee-loans/pending-approvals
  export type PendingApprovalsResponse = ApiListResponse<Loan>;

  // GET /api/hr/employee-loans/overdue-installments
  export interface OverdueInstallment {
    loanId: string;
    employeeId: string;
    employeeName: string;
    dueDate: string;
    amount: number;
    daysOverdue: number;
  }
  export type OverdueInstallmentsResponse = ApiListResponse<OverdueInstallment>;

  // POST /api/hr/employee-loans/check-eligibility
  export interface CheckEligibilityRequest {
    employeeId: string;
    loanType: LoanType;
    amount: number;
  }
  export interface CheckEligibilityResponse extends ApiResponse<{
    eligible: boolean;
    maxAmount: number;
    reasons?: string[];
    existingLoans: number;
  }> {}

  // POST /api/hr/employee-loans/bulk-delete
  export interface BulkDeleteRequest {
    loanIds: string[];
  }
  export type BulkDeleteResponse = ApiResponse<{ deleted: number }>;

  // GET /api/hr/employee-loans/by-employee/:employeeId
  export type ByEmployeeResponse = ApiListResponse<Loan>;

  // POST /api/hr/employee-loans
  export interface CreateRequest {
    employeeId: string;
    loanType: LoanType;
    principalAmount: number;
    interestRate: number;
    tenure: number;
    repaymentMethod: RepaymentMethod;
    reason?: string;
  }
  export type CreateResponse = ApiResponse<Loan>;

  // GET /api/hr/employee-loans/:loanId
  export type GetResponse = ApiResponse<Loan>;

  // PATCH /api/hr/employee-loans/:loanId
  export type UpdateRequest = Partial<CreateRequest>;
  export type UpdateResponse = ApiResponse<Loan>;

  // DELETE /api/hr/employee-loans/:loanId
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;

  // POST /api/hr/employee-loans/:loanId/submit
  export type SubmitResponse = ApiResponse<Loan>;

  // POST /api/hr/employee-loans/:loanId/approve
  export interface ApproveRequest {
    comments?: string;
  }
  export type ApproveResponse = ApiResponse<Loan>;

  // POST /api/hr/employee-loans/:loanId/reject
  export interface RejectRequest {
    reason: string;
  }
  export type RejectResponse = ApiResponse<Loan>;

  // POST /api/hr/employee-loans/:loanId/disburse
  export interface DisburseRequest {
    disbursementDate: string;
    bankAccount?: string;
    reference?: string;
  }
  export type DisburseResponse = ApiResponse<Loan>;

  // POST /api/hr/employee-loans/:loanId/payments
  export interface RecordPaymentRequest {
    amount: number;
    paymentDate: string;
    paymentMethod: RepaymentMethod;
    reference?: string;
  }
  export type RecordPaymentResponse = ApiResponse<Loan>;

  // POST /api/hr/employee-loans/:loanId/payroll-deduction
  export type PayrollDeductionResponse = ApiResponse<Loan>;

  // GET /api/hr/employee-loans/:loanId/early-settlement-calculation
  export interface EarlySettlementResponse extends ApiResponse<{
    outstandingPrincipal: number;
    accruedInterest: number;
    settlementAmount: number;
    savings: number;
  }> {}

  // POST /api/hr/employee-loans/:loanId/early-settlement
  export type ProcessEarlySettlementResponse = ApiResponse<Loan>;

  // POST /api/hr/employee-loans/:loanId/default
  export type MarkDefaultedResponse = ApiResponse<Loan>;

  // POST /api/hr/employee-loans/:loanId/restructure
  export interface RestructureRequest {
    newTenure: number;
    newInterestRate?: number;
    reason: string;
  }
  export type RestructureResponse = ApiResponse<Loan>;

  // POST /api/hr/employee-loans/:loanId/issue-clearance
  export interface ClearanceResponse extends ApiResponse<{
    clearanceLetter: {
      url: string;
      generatedAt: string;
    };
  }> {}

  // POST /api/hr/employee-loans/:loanId/documents
  export interface UploadDocumentRequest {
    file: File;
    name?: string;
  }
  export type UploadDocumentResponse = ApiResponse<Loan>;

  // POST /api/hr/employee-loans/:loanId/communications
  export interface AddCommunicationRequest {
    type: 'email' | 'sms' | 'call' | 'note';
    message: string;
  }
  export type AddCommunicationResponse = ApiResponse<Loan>;
}

// ═══════════════════════════════════════════════════════════════
// TRUST ACCOUNT
// Base route: /api/trust-accounts
// ═══════════════════════════════════════════════════════════════

export namespace TrustAccount {
  export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest' | 'disbursement';

  export interface Account {
    _id: string;
    firmId: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    currency: string;
    balance: number;
    isActive: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface Transaction {
    _id: string;
    accountId: string;
    clientId?: string;
    caseId?: string;
    type: TransactionType;
    amount: number;
    runningBalance: number;
    description: string;
    reference?: string;
    isVoided: boolean;
    voidReason?: string;
    voidedAt?: string;
    voidedBy?: string;
    createdBy: string;
    createdAt: string;
  }

  export interface ClientBalance {
    clientId: string;
    clientName: string;
    balance: number;
    lastTransaction?: string;
  }

  export interface Reconciliation {
    _id: string;
    accountId: string;
    statementDate: string;
    statementBalance: number;
    bookBalance: number;
    difference: number;
    isReconciled: boolean;
    reconciledBy?: string;
    reconciledAt?: string;
    notes?: string;
  }

  // GET /api/trust-accounts
  export type ListResponse = ApiListResponse<Account>;

  // POST /api/trust-accounts
  export interface CreateRequest {
    accountName: string;
    accountNumber: string;
    bankName: string;
    currency?: string;
    isDefault?: boolean;
  }
  export type CreateResponse = ApiResponse<Account>;

  // GET /api/trust-accounts/:id
  export type GetResponse = ApiResponse<Account>;

  // PATCH /api/trust-accounts/:id
  export type UpdateRequest = Partial<CreateRequest>;
  export type UpdateResponse = ApiResponse<Account>;

  // DELETE /api/trust-accounts/:id
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;

  // GET /api/trust-accounts/:id/summary
  export interface SummaryResponse extends ApiResponse<{
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    transactionCount: number;
    clientCount: number;
    lastReconciliation?: string;
  }> {}

  // GET /api/trust-accounts/:id/transactions
  export interface TransactionsQuery extends PaginationQuery {
    type?: TransactionType;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }
  export type TransactionsResponse = ApiListResponse<Transaction>;

  // POST /api/trust-accounts/:id/transactions
  export interface CreateTransactionRequest {
    type: TransactionType;
    amount: number;
    clientId?: string;
    caseId?: string;
    description: string;
    reference?: string;
  }
  export type CreateTransactionResponse = ApiResponse<Transaction>;

  // GET /api/trust-accounts/:id/transactions/:transactionId
  export type GetTransactionResponse = ApiResponse<Transaction>;

  // POST /api/trust-accounts/:id/transactions/:transactionId/void
  export interface VoidTransactionRequest {
    reason: string;
  }
  export type VoidTransactionResponse = ApiResponse<Transaction>;

  // GET /api/trust-accounts/:id/balances
  export type ClientBalancesResponse = ApiListResponse<ClientBalance>;

  // GET /api/trust-accounts/:id/balances/:clientId
  export type ClientBalanceResponse = ApiResponse<ClientBalance>;

  // POST /api/trust-accounts/:id/transfer
  export interface TransferRequest {
    fromClientId: string;
    toClientId: string;
    amount: number;
    description?: string;
  }
  export type TransferResponse = ApiResponse<{
    fromTransaction: Transaction;
    toTransaction: Transaction;
  }>;

  // GET /api/trust-accounts/:id/reconciliations
  export type ReconciliationsResponse = ApiListResponse<Reconciliation>;

  // POST /api/trust-accounts/:id/reconciliations
  export interface CreateReconciliationRequest {
    statementDate: string;
    statementBalance: number;
    notes?: string;
  }
  export type CreateReconciliationResponse = ApiResponse<Reconciliation>;

  // GET /api/trust-accounts/:id/three-way-reconciliations
  export type ThreeWayReconciliationsResponse = ApiListResponse<Reconciliation>;

  // POST /api/trust-accounts/:id/three-way-reconciliations
  export type CreateThreeWayReconciliationRequest = CreateReconciliationRequest;
  export type CreateThreeWayReconciliationResponse = ApiResponse<Reconciliation>;
}

// ═══════════════════════════════════════════════════════════════
// INVOICE APPROVAL
// Base route: /api/invoice-approvals
// ═══════════════════════════════════════════════════════════════

export namespace InvoiceApproval {
  export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';

  export interface Approval {
    _id: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    clientName: string;
    currentLevel: number;
    totalLevels: number;
    status: ApprovalStatus;
    approvers: Array<{
      level: number;
      userId: string;
      userName: string;
      status: ApprovalStatus;
      actionDate?: string;
      comments?: string;
    }>;
    requestedBy: string;
    requestedAt: string;
    deadline?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface ApprovalStats {
    pending: number;
    approved: number;
    rejected: number;
    averageApprovalTime: number; // hours
    needingEscalation: number;
  }

  // GET /api/invoice-approvals/pending
  export type PendingResponse = ApiListResponse<Approval>;

  // GET /api/invoice-approvals/stats
  export type StatsResponse = ApiResponse<ApprovalStats>;

  // GET /api/invoice-approvals/needing-escalation
  export type NeedingEscalationResponse = ApiListResponse<Approval>;

  // GET /api/invoice-approvals
  export interface ListQuery extends PaginationQuery {
    status?: ApprovalStatus;
    startDate?: string;
    endDate?: string;
  }
  export type ListResponse = ApiListResponse<Approval>;

  // GET /api/invoice-approvals/:id
  export type GetResponse = ApiResponse<Approval>;

  // POST /api/invoice-approvals/:id/approve
  export interface ApproveRequest {
    comments?: string;
  }
  export type ApproveResponse = ApiResponse<Approval>;

  // POST /api/invoice-approvals/:id/reject
  export interface RejectRequest {
    reason: string;
  }
  export type RejectResponse = ApiResponse<Approval>;

  // POST /api/invoice-approvals/:id/escalate
  export interface EscalateRequest {
    escalateTo: string;
    reason?: string;
  }
  export type EscalateResponse = ApiResponse<Approval>;

  // POST /api/invoice-approvals/:id/cancel
  export type CancelResponse = ApiResponse<Approval>;
}

// ═══════════════════════════════════════════════════════════════
// PAYOUT
// Base route: /api/lawyers
// ═══════════════════════════════════════════════════════════════

export namespace Payout {
  export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  export type ConnectStatus = 'not_started' | 'pending' | 'complete' | 'restricted';

  export interface PayoutRecord {
    _id: string;
    lawyerId: string;
    amount: number;
    currency: string;
    status: PayoutStatus;
    stripePayoutId?: string;
    failureReason?: string;
    requestedAt: string;
    processedAt?: string;
    completedAt?: string;
  }

  export interface ConnectAccount {
    status: ConnectStatus;
    accountId?: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirements?: {
      currentlyDue: string[];
      pastDue: string[];
    };
  }

  export interface PayoutStats {
    totalPaid: number;
    pendingAmount: number;
    lastPayoutDate?: string;
    payoutCount: number;
  }

  // POST /api/lawyers/stripe/connect
  export interface StartConnectResponse extends ApiResponse<{
    onboardingUrl: string;
  }> {}

  // GET /api/lawyers/stripe/callback
  export type CallbackResponse = ApiResponse<ConnectAccount>;

  // GET /api/lawyers/stripe/dashboard
  export interface DashboardResponse extends ApiResponse<{
    dashboardUrl: string;
  }> {}

  // GET /api/lawyers/stripe/account
  export type AccountStatusResponse = ApiResponse<ConnectAccount>;

  // GET /api/lawyers/payouts/stats
  export type StatsResponse = ApiResponse<PayoutStats>;

  // POST /api/lawyers/payouts/request
  export interface RequestPayoutRequest {
    amount: number;
  }
  export type RequestPayoutResponse = ApiResponse<PayoutRecord>;

  // GET /api/lawyers/payouts
  export interface ListQuery extends PaginationQuery {
    status?: PayoutStatus;
    startDate?: string;
    endDate?: string;
  }
  export type ListResponse = ApiListResponse<PayoutRecord>;

  // GET /api/lawyers/payouts/:id
  export type GetResponse = ApiResponse<PayoutRecord>;

  // POST /api/lawyers/payouts/:id/cancel
  export type CancelResponse = ApiResponse<PayoutRecord>;

  // POST /api/lawyers/payouts/:id/retry
  export type RetryResponse = ApiResponse<PayoutRecord>;
}

// ═══════════════════════════════════════════════════════════════
// GRIEVANCE
// Base route: /api/hr/grievances
// ═══════════════════════════════════════════════════════════════

export namespace Grievance {
  export type GrievanceType = 'harassment' | 'discrimination' | 'workplace_safety' | 'policy_violation' | 'compensation' | 'management' | 'other';
  export type GrievanceStatus = 'submitted' | 'acknowledged' | 'under_investigation' | 'resolved' | 'escalated' | 'withdrawn' | 'closed' | 'appealed' | 'labor_office';
  export type Priority = 'low' | 'medium' | 'high' | 'critical';

  export interface Grievance {
    _id: string;
    firmId: string;
    employeeId: string;
    employeeName: string;
    grievanceType: GrievanceType;
    subject: string;
    description: string;
    priority: Priority;
    status: GrievanceStatus;
    isAnonymous: boolean;
    againstPerson?: string;
    assignedTo?: string;
    investigator?: string;
    resolution?: string;
    timeline: Array<{
      date: string;
      action: string;
      performedBy: string;
      notes?: string;
    }>;
    witnesses: Array<{
      employeeId: string;
      name: string;
      statement?: string;
    }>;
    evidence: Array<{
      name: string;
      url: string;
      uploadedAt: string;
    }>;
    interviews: Array<{
      date: string;
      interviewee: string;
      interviewer: string;
      notes: string;
    }>;
    appeal?: {
      filedAt: string;
      reason: string;
      status: 'pending' | 'upheld' | 'overturned';
      decision?: string;
      decidedAt?: string;
    };
    laborOfficeEscalation?: {
      escalatedAt: string;
      caseNumber?: string;
      status: 'pending' | 'in_progress' | 'resolved';
    };
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface GrievanceStats {
    total: number;
    open: number;
    resolved: number;
    overdue: number;
    byType: Record<GrievanceType, number>;
    byStatus: Record<GrievanceStatus, number>;
    averageResolutionDays: number;
  }

  // GET /api/hr/grievances
  export interface ListQuery extends PaginationQuery {
    status?: GrievanceStatus;
    grievanceType?: GrievanceType;
    priority?: Priority;
    employeeId?: string;
  }
  export type ListResponse = ApiListResponse<Grievance>;

  // GET /api/hr/grievances/stats
  export type StatsResponse = ApiResponse<GrievanceStats>;

  // GET /api/hr/grievances/overdue
  export type OverdueResponse = ApiListResponse<Grievance>;

  // GET /api/hr/grievances/export
  export interface ExportQuery {
    format?: 'csv' | 'xlsx' | 'pdf';
    startDate?: string;
    endDate?: string;
  }
  export interface ExportResponse extends ApiResponse<{
    downloadUrl: string;
  }> {}

  // POST /api/hr/grievances
  export interface CreateRequest {
    grievanceType: GrievanceType;
    subject: string;
    description: string;
    priority?: Priority;
    isAnonymous?: boolean;
    againstPerson?: string;
  }
  export type CreateResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/bulk-delete
  export interface BulkDeleteRequest {
    grievanceIds: string[];
  }
  export type BulkDeleteResponse = ApiResponse<{ deleted: number }>;

  // GET /api/hr/grievances/employee/:employeeId
  export type EmployeeGrievancesResponse = ApiListResponse<Grievance>;

  // GET /api/hr/grievances/:id
  export type GetResponse = ApiResponse<Grievance>;

  // PATCH /api/hr/grievances/:id
  export type UpdateRequest = Partial<CreateRequest>;
  export type UpdateResponse = ApiResponse<Grievance>;

  // DELETE /api/hr/grievances/:id
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;

  // POST /api/hr/grievances/:id/acknowledge
  export type AcknowledgeResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/start-investigation
  export interface StartInvestigationRequest {
    investigator: string;
    dueDate?: string;
  }
  export type StartInvestigationResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/complete-investigation
  export interface CompleteInvestigationRequest {
    findings: string;
    recommendations?: string;
  }
  export type CompleteInvestigationResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/resolve
  export interface ResolveRequest {
    resolution: string;
    actions?: string[];
  }
  export type ResolveResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/escalate
  export interface EscalateRequest {
    escalateTo: string;
    reason: string;
  }
  export type EscalateResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/withdraw
  export interface WithdrawRequest {
    reason?: string;
  }
  export type WithdrawResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/close
  export type CloseResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/timeline
  export interface AddTimelineRequest {
    action: string;
    notes?: string;
  }
  export type AddTimelineResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/witnesses
  export interface AddWitnessRequest {
    employeeId: string;
    statement?: string;
  }
  export type AddWitnessResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/evidence
  export interface AddEvidenceRequest {
    file: File;
    name?: string;
  }
  export type AddEvidenceResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/interviews
  export interface AddInterviewRequest {
    interviewee: string;
    date: string;
    notes: string;
  }
  export type AddInterviewResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/appeal
  export interface FileAppealRequest {
    reason: string;
  }
  export type FileAppealResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/appeal/decide
  export interface DecideAppealRequest {
    decision: 'upheld' | 'overturned';
    reason: string;
  }
  export type DecideAppealResponse = ApiResponse<Grievance>;

  // POST /api/hr/grievances/:id/labor-office
  export type LaborOfficeResponse = ApiResponse<Grievance>;
}

// ═══════════════════════════════════════════════════════════════
// ORGANIZATIONAL UNIT
// Base route: /api/hr/organizational-units
// ═══════════════════════════════════════════════════════════════

export namespace OrganizationalUnit {
  export type UnitType = 'company' | 'division' | 'department' | 'team' | 'unit';
  export type UnitStatus = 'active' | 'inactive' | 'dissolved';

  export interface Unit {
    _id: string;
    firmId: string;
    name: string;
    nameAr?: string;
    code: string;
    type: UnitType;
    parentId?: string;
    path: string[];
    level: number;
    status: UnitStatus;
    headcount: {
      current: number;
      approved: number;
      vacant: number;
    };
    budget: {
      annual: number;
      spent: number;
      remaining: number;
    };
    leadership: Array<{
      _id: string;
      position: string;
      employeeId?: string;
      employeeName?: string;
      startDate?: string;
    }>;
    kpis: Array<{
      _id: string;
      name: string;
      target: number;
      actual: number;
      unit: string;
    }>;
    documents: Array<{
      name: string;
      url: string;
      uploadedAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }

  export interface UnitStats {
    total: number;
    byType: Record<UnitType, number>;
    byStatus: Record<UnitStatus, number>;
    totalHeadcount: number;
    totalBudget: number;
  }

  // GET /api/hr/organizational-units
  export interface ListQuery extends PaginationQuery {
    type?: UnitType;
    status?: UnitStatus;
    parentId?: string;
  }
  export type ListResponse = ApiListResponse<Unit>;

  // GET /api/hr/organizational-units/stats
  export type StatsResponse = ApiResponse<UnitStats>;

  // GET /api/hr/organizational-units/tree
  export interface TreeResponse extends ApiResponse<{
    tree: Array<Unit & { children?: Unit[] }>;
  }> {}

  // GET /api/hr/organizational-units/export
  export interface ExportQuery {
    format?: 'csv' | 'xlsx' | 'pdf';
  }
  export interface ExportResponse extends ApiResponse<{
    downloadUrl: string;
  }> {}

  // POST /api/hr/organizational-units
  export interface CreateRequest {
    name: string;
    nameAr?: string;
    code: string;
    type: UnitType;
    parentId?: string;
    headcount?: Unit['headcount'];
    budget?: Unit['budget'];
  }
  export type CreateResponse = ApiResponse<Unit>;

  // POST /api/hr/organizational-units/bulk-delete
  export interface BulkDeleteRequest {
    unitIds: string[];
  }
  export type BulkDeleteResponse = ApiResponse<{ deleted: number }>;

  // GET /api/hr/organizational-units/:id
  export type GetResponse = ApiResponse<Unit>;

  // PATCH /api/hr/organizational-units/:id
  export type UpdateRequest = Partial<CreateRequest>;
  export type UpdateResponse = ApiResponse<Unit>;

  // DELETE /api/hr/organizational-units/:id
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;

  // GET /api/hr/organizational-units/:id/children
  export type ChildrenResponse = ApiListResponse<Unit>;

  // GET /api/hr/organizational-units/:id/path
  export type PathResponse = ApiListResponse<Unit>;

  // POST /api/hr/organizational-units/:id/move
  export interface MoveRequest {
    newParentId: string;
  }
  export type MoveResponse = ApiResponse<Unit>;

  // POST /api/hr/organizational-units/:id/dissolve
  export interface DissolveRequest {
    transferTo?: string;
    reason?: string;
  }
  export type DissolveResponse = ApiResponse<Unit>;

  // POST /api/hr/organizational-units/:id/activate
  export type ActivateResponse = ApiResponse<Unit>;

  // POST /api/hr/organizational-units/:id/deactivate
  export type DeactivateResponse = ApiResponse<Unit>;

  // PATCH /api/hr/organizational-units/:id/headcount
  export interface UpdateHeadcountRequest {
    current?: number;
    approved?: number;
  }
  export type UpdateHeadcountResponse = ApiResponse<Unit>;

  // PATCH /api/hr/organizational-units/:id/budget
  export interface UpdateBudgetRequest {
    annual?: number;
    spent?: number;
  }
  export type UpdateBudgetResponse = ApiResponse<Unit>;

  // POST /api/hr/organizational-units/:id/kpis
  export interface AddKPIRequest {
    name: string;
    target: number;
    unit: string;
  }
  export type AddKPIResponse = ApiResponse<Unit>;

  // PATCH /api/hr/organizational-units/:id/kpis/:kpiId
  export interface UpdateKPIRequest {
    name?: string;
    target?: number;
    actual?: number;
    unit?: string;
  }
  export type UpdateKPIResponse = ApiResponse<Unit>;

  // DELETE /api/hr/organizational-units/:id/kpis/:kpiId
  export type DeleteKPIResponse = ApiResponse<Unit>;

  // POST /api/hr/organizational-units/:id/leadership
  export interface AddLeadershipRequest {
    position: string;
    employeeId?: string;
    startDate?: string;
  }
  export type AddLeadershipResponse = ApiResponse<Unit>;

  // PATCH /api/hr/organizational-units/:id/leadership/:positionId
  export type UpdateLeadershipRequest = Partial<AddLeadershipRequest>;
  export type UpdateLeadershipResponse = ApiResponse<Unit>;

  // DELETE /api/hr/organizational-units/:id/leadership/:positionId
  export type DeleteLeadershipResponse = ApiResponse<Unit>;

  // POST /api/hr/organizational-units/:id/documents
  export interface AddDocumentRequest {
    file: File;
    name?: string;
  }
  export type AddDocumentResponse = ApiResponse<Unit>;
}

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL MODULES (Simplified)
// ═══════════════════════════════════════════════════════════════

// Rate Card - /api/rate-cards
export namespace RateCard {
  export interface RateCard {
    _id: string;
    firmId: string;
    name: string;
    description?: string;
    rates: Array<{
      serviceType: string;
      rate: number;
      unit: 'hour' | 'fixed' | 'percentage';
    }>;
    effectiveFrom: string;
    effectiveTo?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export type ListResponse = ApiListResponse<RateCard>;
  export type GetResponse = ApiResponse<RateCard>;
  export interface CreateRequest { name: string; rates: RateCard['rates']; effectiveFrom: string; }
  export type CreateResponse = ApiResponse<RateCard>;
  export type UpdateResponse = ApiResponse<RateCard>;
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;
}

// Rate Group - /api/rate-groups
export namespace RateGroup {
  export interface RateGroup {
    _id: string;
    firmId: string;
    name: string;
    rateCards: string[];
    appliesTo: { clients?: string[]; caseTypes?: string[]; };
    isDefault: boolean;
    createdAt: string;
  }

  export type ListResponse = ApiListResponse<RateGroup>;
  export type GetResponse = ApiResponse<RateGroup>;
  export type CreateResponse = ApiResponse<RateGroup>;
  export type UpdateResponse = ApiResponse<RateGroup>;
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;
}

// Rate Limit - /api/rate-limits
export namespace RateLimit {
  export interface RateLimitConfig {
    _id: string;
    endpoint: string;
    limit: number;
    windowMs: number;
    isEnabled: boolean;
  }

  export type ListResponse = ApiListResponse<RateLimitConfig>;
  export type GetResponse = ApiResponse<RateLimitConfig>;
  export type UpdateResponse = ApiResponse<RateLimitConfig>;
}

// Employee Advance - /api/hr/employee-advances
export namespace EmployeeAdvance {
  export interface Advance {
    _id: string;
    firmId: string;
    employeeId: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'recovered';
    deductFromPayroll: boolean;
    deductionMonths: number;
    createdAt: string;
  }

  export type ListResponse = ApiListResponse<Advance>;
  export type GetResponse = ApiResponse<Advance>;
  export interface CreateRequest { employeeId: string; amount: number; reason: string; deductFromPayroll?: boolean; }
  export type CreateResponse = ApiResponse<Advance>;
  export type ApproveResponse = ApiResponse<Advance>;
  export type RejectResponse = ApiResponse<Advance>;
  export type DisburseResponse = ApiResponse<Advance>;
}

// Employee Benefit - /api/hr/employee-benefits
export namespace EmployeeBenefit {
  export interface Benefit {
    _id: string;
    firmId: string;
    name: string;
    type: 'health' | 'dental' | 'vision' | 'life' | 'retirement' | 'allowance' | 'other';
    amount: number;
    frequency: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
    eligibleEmployees: string[];
    isActive: boolean;
    createdAt: string;
  }

  export type ListResponse = ApiListResponse<Benefit>;
  export type GetResponse = ApiResponse<Benefit>;
  export type CreateResponse = ApiResponse<Benefit>;
  export type UpdateResponse = ApiResponse<Benefit>;
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;
}

// Compensation Reward - /api/hr/compensation-rewards
export namespace CompensationReward {
  export interface Reward {
    _id: string;
    firmId: string;
    employeeId: string;
    type: 'bonus' | 'commission' | 'award' | 'incentive';
    amount: number;
    reason: string;
    effectiveDate: string;
    status: 'pending' | 'approved' | 'paid';
    createdAt: string;
  }

  export type ListResponse = ApiListResponse<Reward>;
  export type GetResponse = ApiResponse<Reward>;
  export type CreateResponse = ApiResponse<Reward>;
  export type ApproveResponse = ApiResponse<Reward>;
  export type PayResponse = ApiResponse<Reward>;
}

// Peer Review - /api/hr/peer-reviews
export namespace PeerReview {
  export interface Review {
    _id: string;
    firmId: string;
    revieweeId: string;
    reviewerId: string;
    reviewPeriod: string;
    ratings: Record<string, number>;
    strengths: string[];
    improvements: string[];
    comments: string;
    status: 'draft' | 'submitted' | 'acknowledged';
    createdAt: string;
  }

  export type ListResponse = ApiListResponse<Review>;
  export type GetResponse = ApiResponse<Review>;
  export type CreateResponse = ApiResponse<Review>;
  export type UpdateResponse = ApiResponse<Review>;
  export type SubmitResponse = ApiResponse<Review>;
}

// HR Analytics - /api/hr/analytics
export namespace HRAnalytics {
  export interface AnalyticsDashboard {
    headcount: { total: number; byDepartment: Record<string, number>; };
    turnover: { rate: number; voluntary: number; involuntary: number; };
    attendance: { averageRate: number; absenteeism: number; };
    performance: { averageRating: number; distribution: Record<string, number>; };
  }

  export type DashboardResponse = ApiResponse<AnalyticsDashboard>;
  export type HeadcountResponse = ApiResponse<{ data: Array<{ date: string; count: number }> }>;
  export type TurnoverResponse = ApiResponse<{ data: Array<{ month: string; rate: number }> }>;
  export type AttendanceResponse = ApiResponse<{ data: Array<{ month: string; rate: number }> }>;
}

// Income Tax Slab - /api/hr/income-tax-slabs
export namespace IncomeTaxSlab {
  export interface TaxSlab {
    _id: string;
    firmId: string;
    country: string;
    fiscalYear: string;
    slabs: Array<{ from: number; to: number; rate: number; }>;
    exemptions: Array<{ name: string; amount: number; }>;
    isActive: boolean;
    createdAt: string;
  }

  export type ListResponse = ApiListResponse<TaxSlab>;
  export type GetResponse = ApiResponse<TaxSlab>;
  export type CreateResponse = ApiResponse<TaxSlab>;
  export type UpdateResponse = ApiResponse<TaxSlab>;
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;
}

// Finance Setup - /api/finance-setup
export namespace FinanceSetup {
  export interface FinanceConfig {
    _id: string;
    firmId: string;
    currency: string;
    fiscalYearStart: string;
    taxSettings: { vatEnabled: boolean; vatRate: number; };
    invoiceSettings: { prefix: string; nextNumber: number; defaultTerms: number; };
    paymentMethods: string[];
    bankAccounts: Array<{ name: string; accountNumber: string; isDefault: boolean; }>;
    createdAt: string;
  }

  export type GetConfigResponse = ApiResponse<FinanceConfig>;
  export type UpdateConfigResponse = ApiResponse<FinanceConfig>;
  export type GetCurrenciesResponse = ApiListResponse<{ code: string; name: string; symbol: string; }>;
}

// Invoice Template - /api/invoice-templates
export namespace InvoiceTemplate {
  export interface Template {
    _id: string;
    firmId: string;
    name: string;
    type: 'standard' | 'legal' | 'detailed' | 'simple';
    layout: object;
    styles: object;
    isDefault: boolean;
    createdAt: string;
  }

  export type ListResponse = ApiListResponse<Template>;
  export type GetResponse = ApiResponse<Template>;
  export type CreateResponse = ApiResponse<Template>;
  export type UpdateResponse = ApiResponse<Template>;
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;
  export type PreviewResponse = ApiResponse<{ previewUrl: string }>;
}

// Payment Receipt - /api/payment-receipts
export namespace PaymentReceipt {
  export interface Receipt {
    _id: string;
    firmId: string;
    receiptNumber: string;
    paymentId: string;
    clientId: string;
    amount: number;
    issuedAt: string;
    downloadUrl: string;
  }

  export type ListResponse = ApiListResponse<Receipt>;
  export type GetResponse = ApiResponse<Receipt>;
  export type GenerateResponse = ApiResponse<Receipt>;
  export type DownloadResponse = ApiResponse<{ downloadUrl: string }>;
}

// Recurring Transaction - /api/recurring-transactions
export namespace RecurringTransaction {
  export interface RecurringTransaction {
    _id: string;
    firmId: string;
    name: string;
    type: 'income' | 'expense';
    amount: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    accountId: string;
    category: string;
    nextDate: string;
    status: 'active' | 'paused' | 'cancelled';
    createdAt: string;
  }

  export type ListResponse = ApiListResponse<RecurringTransaction>;
  export type GetResponse = ApiResponse<RecurringTransaction>;
  export type CreateResponse = ApiResponse<RecurringTransaction>;
  export type UpdateResponse = ApiResponse<RecurringTransaction>;
  export type PauseResponse = ApiResponse<RecurringTransaction>;
  export type ResumeResponse = ApiResponse<RecurringTransaction>;
  export type CancelResponse = ApiResponse<RecurringTransaction>;
  export type DeleteResponse = ApiResponse<{ deleted: boolean }>;
}

// ═══════════════════════════════════════════════════════════════
// MODULE SUMMARY
// ═══════════════════════════════════════════════════════════════
/**
 * Total Endpoints: ~265
 *
 * Corporate Cards: 15 endpoints
 * Dunning: 15 endpoints
 * Expense Policy: 13 endpoints
 * Recurring Invoice: 13 endpoints
 * Employee Loan: 24 endpoints
 * Trust Account: 17 endpoints
 * Invoice Approval: 9 endpoints
 * Payout: 10 endpoints
 * Grievance: 27 endpoints
 * Organizational Unit: 25 endpoints
 * Rate Card: 8 endpoints
 * Rate Group: 6 endpoints
 * Rate Limit: 5 endpoints
 * Employee Advance: 12 endpoints
 * Employee Benefit: 10 endpoints
 * Compensation Reward: 8 endpoints
 * Peer Review: 10 endpoints
 * HR Analytics: 8 endpoints
 * Income Tax Slab: 6 endpoints
 * Finance Setup: 10 endpoints
 * Invoice Template: 8 endpoints
 * Payment Receipt: 6 endpoints
 * Recurring Transaction: 10 endpoints
 */
