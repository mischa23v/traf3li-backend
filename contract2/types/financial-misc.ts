/**
 * Financial Miscellaneous Modules API Contracts
 * Billing-Rate, Journal-Entry, Account, Statement, AR-Aging, Bank-Transaction,
 * Bank-Transfer, Bill-Payment, Consolidated-Reports, Payment-Terms, Currency, Vendor, Refund
 */

// ============================================================================
// BILLING-RATE MODULE - 8 endpoints
// ============================================================================

export namespace BillingRateContract {
  // Enums
  export enum RateType {
    HOURLY = 'hourly',
    FLAT = 'flat',
    CONTINGENCY = 'contingency',
    RETAINER = 'retainer',
    BLENDED = 'blended'
  }

  export enum RateStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending'
  }

  // Interfaces
  export interface BillingRate {
    _id: string;
    firmId: string;
    name: string;
    type: RateType;
    amount: number;
    currency: string;
    effectiveDate: Date;
    expiryDate?: Date;
    applicableTo?: {
      lawyers?: string[];
      caseTypes?: string[];
      clients?: string[];
    };
    status: RateStatus;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/billing-rate
   * @description Create billing rate
   */
  export type CreateRate = (data: Partial<BillingRate>) => Promise<{ success: boolean; data: BillingRate }>;

  /**
   * @endpoint GET /api/billing-rate
   * @description Get all billing rates
   */
  export type GetRates = (params?: { type?: RateType; status?: RateStatus; page?: number; limit?: number }) => Promise<{ success: boolean; data: BillingRate[]; pagination: any }>;

  /**
   * @endpoint GET /api/billing-rate/stats
   * @description Get billing rate statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalRates: number; byType: any; averageRate: number } }>;

  /**
   * @endpoint GET /api/billing-rate/:id
   * @description Get single billing rate
   */
  export type GetRate = (id: string) => Promise<{ success: boolean; data: BillingRate }>;

  /**
   * @endpoint PUT /api/billing-rate/:id
   * @description Update billing rate
   */
  export type UpdateRate = (id: string, data: Partial<BillingRate>) => Promise<{ success: boolean; data: BillingRate }>;

  /**
   * @endpoint DELETE /api/billing-rate/:id
   * @description Delete billing rate
   */
  export type DeleteRate = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/billing-rate/effective
   * @description Get effective rates for context
   */
  export type GetEffectiveRates = (params: { lawyerId?: string; caseType?: string; clientId?: string }) => Promise<{ success: boolean; data: BillingRate[] }>;

  /**
   * @endpoint POST /api/billing-rate/calculate
   * @description Calculate amount based on rate
   */
  export type CalculateAmount = (data: { rateId: string; hours?: number; units?: number }) => Promise<{ success: boolean; data: { amount: number; breakdown: any } }>;
}

// ============================================================================
// JOURNAL-ENTRY MODULE - 8 endpoints
// ============================================================================

export namespace JournalEntryContract {
  // Enums
  export enum EntryType {
    STANDARD = 'standard',
    ADJUSTING = 'adjusting',
    CLOSING = 'closing',
    REVERSING = 'reversing'
  }

  export enum EntryStatus {
    DRAFT = 'draft',
    POSTED = 'posted',
    REVERSED = 'reversed'
  }

  // Interfaces
  export interface JournalEntry {
    _id: string;
    firmId: string;
    entryNumber: string;
    type: EntryType;
    date: Date;
    description: string;
    lines: JournalLine[];
    totalDebit: number;
    totalCredit: number;
    status: EntryStatus;
    reference?: string;
    attachments?: string[];
    postedBy?: string;
    postedAt?: Date;
    reversedBy?: string;
    reversedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface JournalLine {
    accountId: string;
    accountName: string;
    description?: string;
    debit: number;
    credit: number;
    taxCode?: string;
  }

  /**
   * @endpoint POST /api/journal-entry/simple
   * @description Create simple journal entry
   */
  export type CreateSimple = (data: { description: string; debitAccountId: string; creditAccountId: string; amount: number; date: string }) => Promise<{ success: boolean; data: JournalEntry }>;

  /**
   * @endpoint GET /api/journal-entry
   * @description Get all journal entries
   */
  export type GetEntries = (params?: { type?: EntryType; status?: EntryStatus; startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: JournalEntry[]; pagination: any }>;

  /**
   * @endpoint GET /api/journal-entry/:id
   * @description Get single journal entry
   */
  export type GetEntry = (id: string) => Promise<{ success: boolean; data: JournalEntry }>;

  /**
   * @endpoint POST /api/journal-entry
   * @description Create journal entry
   */
  export type CreateEntry = (data: Partial<JournalEntry>) => Promise<{ success: boolean; data: JournalEntry }>;

  /**
   * @endpoint PUT /api/journal-entry/:id
   * @description Update journal entry (draft only)
   */
  export type UpdateEntry = (id: string, data: Partial<JournalEntry>) => Promise<{ success: boolean; data: JournalEntry }>;

  /**
   * @endpoint POST /api/journal-entry/:id/post
   * @description Post journal entry
   */
  export type PostEntry = (id: string) => Promise<{ success: boolean; data: JournalEntry }>;

  /**
   * @endpoint POST /api/journal-entry/:id/reverse
   * @description Reverse journal entry
   */
  export type ReverseEntry = (id: string, reason?: string) => Promise<{ success: boolean; data: { original: JournalEntry; reversal: JournalEntry } }>;

  /**
   * @endpoint DELETE /api/journal-entry/:id
   * @description Delete journal entry (draft only)
   */
  export type DeleteEntry = (id: string) => Promise<{ success: boolean; message: string }>;
}

// ============================================================================
// ACCOUNT MODULE - 7 endpoints
// ============================================================================

export namespace AccountContract {
  // Enums
  export enum AccountType {
    ASSET = 'asset',
    LIABILITY = 'liability',
    EQUITY = 'equity',
    REVENUE = 'revenue',
    EXPENSE = 'expense'
  }

  export enum AccountStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    FROZEN = 'frozen'
  }

  // Interfaces
  export interface ChartOfAccount {
    _id: string;
    firmId: string;
    code: string;
    name: string;
    type: AccountType;
    parentId?: string;
    description?: string;
    currency: string;
    balance: number;
    status: AccountStatus;
    isBankAccount: boolean;
    isSystemAccount: boolean;
    taxCode?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint GET /api/account/types
   * @description Get account types
   */
  export type GetTypes = () => Promise<{ success: boolean; data: Array<{ type: AccountType; name: string; normalBalance: 'debit' | 'credit' }> }>;

  /**
   * @endpoint GET /api/account
   * @description Get chart of accounts
   */
  export type GetAccounts = (params?: { type?: AccountType; status?: AccountStatus; search?: string }) => Promise<{ success: boolean; data: ChartOfAccount[] }>;

  /**
   * @endpoint GET /api/account/:id
   * @description Get single account
   */
  export type GetAccount = (id: string) => Promise<{ success: boolean; data: ChartOfAccount }>;

  /**
   * @endpoint POST /api/account
   * @description Create account
   */
  export type CreateAccount = (data: Partial<ChartOfAccount>) => Promise<{ success: boolean; data: ChartOfAccount }>;

  /**
   * @endpoint PUT /api/account/:id
   * @description Update account
   */
  export type UpdateAccount = (id: string, data: Partial<ChartOfAccount>) => Promise<{ success: boolean; data: ChartOfAccount }>;

  /**
   * @endpoint DELETE /api/account/:id
   * @description Delete account
   */
  export type DeleteAccount = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/account/:id/transactions
   * @description Get account transactions
   */
  export type GetTransactions = (id: string, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: any[]; pagination: any }>;
}

// ============================================================================
// STATEMENT MODULE - 7 endpoints
// ============================================================================

export namespace StatementContract {
  // Enums
  export enum StatementType {
    CLIENT = 'client',
    VENDOR = 'vendor',
    BANK = 'bank',
    ACCOUNT = 'account'
  }

  // Interfaces
  export interface Statement {
    _id: string;
    firmId: string;
    type: StatementType;
    entityId: string;
    entityName: string;
    startDate: Date;
    endDate: Date;
    openingBalance: number;
    closingBalance: number;
    totalDebits: number;
    totalCredits: number;
    transactions: StatementTransaction[];
    generatedAt: Date;
    generatedBy: string;
  }

  export interface StatementTransaction {
    date: Date;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    documentType?: string;
    documentId?: string;
  }

  /**
   * @endpoint POST /api/statement
   * @description Generate statement
   */
  export type Generate = (data: { type: StatementType; entityId: string; startDate: string; endDate: string }) => Promise<{ success: boolean; data: Statement }>;

  /**
   * @endpoint GET /api/statement
   * @description Get generated statements
   */
  export type GetStatements = (params?: { type?: StatementType; page?: number; limit?: number }) => Promise<{ success: boolean; data: Statement[]; pagination: any }>;

  /**
   * @endpoint GET /api/statement/:id
   * @description Get single statement
   */
  export type GetStatement = (id: string) => Promise<{ success: boolean; data: Statement }>;

  /**
   * @endpoint GET /api/statement/:id/pdf
   * @description Download statement as PDF
   */
  export type DownloadPDF = (id: string) => Promise<{ success: boolean; data: Buffer }>;

  /**
   * @endpoint POST /api/statement/:id/send
   * @description Send statement via email
   */
  export type SendEmail = (id: string, email?: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint DELETE /api/statement/:id
   * @description Delete statement
   */
  export type DeleteStatement = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/statement/client/:clientId
   * @description Get client statement
   */
  export type GetClientStatement = (clientId: string, params: { startDate: string; endDate: string }) => Promise<{ success: boolean; data: Statement }>;
}

// ============================================================================
// AR-AGING MODULE - 6 endpoints
// ============================================================================

export namespace ARAgingContract {
  // Interfaces
  export interface AgingReport {
    asOfDate: Date;
    currency: string;
    totalOutstanding: number;
    buckets: AgingBucket[];
    clients: ClientAging[];
  }

  export interface AgingBucket {
    name: string;
    daysFrom: number;
    daysTo: number;
    amount: number;
    count: number;
    percentage: number;
  }

  export interface ClientAging {
    clientId: string;
    clientName: string;
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    total: number;
    invoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      date: Date;
      dueDate: Date;
      amount: number;
      balance: number;
      daysOverdue: number;
    }>;
  }

  /**
   * @endpoint GET /api/ar-aging/report
   * @description Get AR aging report
   */
  export type GetReport = (params?: { asOfDate?: string }) => Promise<{ success: boolean; data: AgingReport }>;

  /**
   * @endpoint GET /api/ar-aging/summary
   * @description Get AR aging summary
   */
  export type GetSummary = () => Promise<{ success: boolean; data: { totalOutstanding: number; buckets: AgingBucket[] } }>;

  /**
   * @endpoint GET /api/ar-aging/client/:clientId
   * @description Get client aging detail
   */
  export type GetClientAging = (clientId: string) => Promise<{ success: boolean; data: ClientAging }>;

  /**
   * @endpoint GET /api/ar-aging/export
   * @description Export AR aging report
   */
  export type ExportReport = (format: 'csv' | 'xlsx' | 'pdf') => Promise<{ success: boolean; data: Buffer }>;

  /**
   * @endpoint POST /api/ar-aging/send-reminders
   * @description Send aging reminders
   */
  export type SendReminders = (params: { bucket?: string; clientIds?: string[] }) => Promise<{ success: boolean; sent: number }>;

  /**
   * @endpoint GET /api/ar-aging/trends
   * @description Get AR aging trends
   */
  export type GetTrends = (params: { startDate: string; endDate: string }) => Promise<{ success: boolean; data: Array<{ date: string; buckets: AgingBucket[] }> }>;
}

// ============================================================================
// BANK-TRANSACTION MODULE - 6 endpoints
// ============================================================================

export namespace BankTransactionContract {
  // Enums
  export enum TransactionType {
    DEPOSIT = 'deposit',
    WITHDRAWAL = 'withdrawal',
    TRANSFER = 'transfer',
    FEE = 'fee',
    INTEREST = 'interest'
  }

  export enum ReconciliationStatus {
    UNMATCHED = 'unmatched',
    MATCHED = 'matched',
    RECONCILED = 'reconciled',
    EXCLUDED = 'excluded'
  }

  // Interfaces
  export interface BankTransaction {
    _id: string;
    firmId: string;
    bankAccountId: string;
    date: Date;
    type: TransactionType;
    description: string;
    reference?: string;
    amount: number;
    balance?: number;
    reconciliationStatus: ReconciliationStatus;
    matchedDocumentType?: string;
    matchedDocumentId?: string;
    importBatchId?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/bank-transaction
   * @description Create bank transaction
   */
  export type CreateTransaction = (data: Partial<BankTransaction>) => Promise<{ success: boolean; data: BankTransaction }>;

  /**
   * @endpoint GET /api/bank-transaction
   * @description Get bank transactions
   */
  export type GetTransactions = (params?: { bankAccountId?: string; type?: TransactionType; reconciliationStatus?: ReconciliationStatus; startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: BankTransaction[]; pagination: any }>;

  /**
   * @endpoint GET /api/bank-transaction/:id
   * @description Get single transaction
   */
  export type GetTransaction = (id: string) => Promise<{ success: boolean; data: BankTransaction }>;

  /**
   * @endpoint PUT /api/bank-transaction/:id
   * @description Update transaction
   */
  export type UpdateTransaction = (id: string, data: Partial<BankTransaction>) => Promise<{ success: boolean; data: BankTransaction }>;

  /**
   * @endpoint POST /api/bank-transaction/:id/match
   * @description Match transaction to document
   */
  export type MatchTransaction = (id: string, data: { documentType: string; documentId: string }) => Promise<{ success: boolean; data: BankTransaction }>;

  /**
   * @endpoint POST /api/bank-transaction/import
   * @description Import bank transactions
   */
  export type ImportTransactions = (bankAccountId: string, transactions: Partial<BankTransaction>[]) => Promise<{ success: boolean; imported: number; duplicates: number }>;
}

// ============================================================================
// BANK-TRANSFER MODULE - 4 endpoints
// ============================================================================

export namespace BankTransferContract {
  // Enums
  export enum TransferStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
  }

  // Interfaces
  export interface BankTransfer {
    _id: string;
    firmId: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    currency: string;
    exchangeRate?: number;
    date: Date;
    reference: string;
    description?: string;
    status: TransferStatus;
    fees?: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/bank-transfer
   * @description Create bank transfer
   */
  export type CreateTransfer = (data: Partial<BankTransfer>) => Promise<{ success: boolean; data: BankTransfer }>;

  /**
   * @endpoint GET /api/bank-transfer
   * @description Get bank transfers
   */
  export type GetTransfers = (params?: { status?: TransferStatus; startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: BankTransfer[]; pagination: any }>;

  /**
   * @endpoint GET /api/bank-transfer/:id
   * @description Get single transfer
   */
  export type GetTransfer = (id: string) => Promise<{ success: boolean; data: BankTransfer }>;

  /**
   * @endpoint POST /api/bank-transfer/:id/cancel
   * @description Cancel transfer
   */
  export type CancelTransfer = (id: string, reason?: string) => Promise<{ success: boolean; data: BankTransfer }>;
}

// ============================================================================
// BILL-PAYMENT MODULE - 4 endpoints
// ============================================================================

export namespace BillPaymentContract {
  // Enums
  export enum PaymentMethod {
    BANK_TRANSFER = 'bank_transfer',
    CASH = 'cash',
    CHECK = 'check',
    CREDIT_CARD = 'credit_card'
  }

  // Interfaces
  export interface BillPayment {
    _id: string;
    firmId: string;
    billId: string;
    vendorId: string;
    amount: number;
    currency: string;
    paymentDate: Date;
    paymentMethod: PaymentMethod;
    reference?: string;
    bankAccountId?: string;
    notes?: string;
    createdBy: string;
    createdAt: Date;
  }

  /**
   * @endpoint POST /api/bill-payment
   * @description Create bill payment
   */
  export type CreatePayment = (data: Partial<BillPayment>) => Promise<{ success: boolean; data: BillPayment }>;

  /**
   * @endpoint GET /api/bill-payment
   * @description Get bill payments
   */
  export type GetPayments = (params?: { billId?: string; vendorId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: BillPayment[]; pagination: any }>;

  /**
   * @endpoint GET /api/bill-payment/:id
   * @description Get single payment
   */
  export type GetPayment = (id: string) => Promise<{ success: boolean; data: BillPayment }>;

  /**
   * @endpoint DELETE /api/bill-payment/:id
   * @description Delete payment
   */
  export type DeletePayment = (id: string) => Promise<{ success: boolean; message: string }>;
}

// ============================================================================
// CONSOLIDATED-REPORTS MODULE - 8 endpoints
// ============================================================================

export namespace ConsolidatedReportsContract {
  // Interfaces
  export interface ConsolidatedReport {
    reportType: string;
    period: { start: Date; end: Date };
    currency: string;
    entities: string[];
    consolidationMethod: 'full' | 'proportional' | 'equity';
    data: any;
    generatedAt: Date;
  }

  export interface ProfitLossReport {
    revenue: { items: any[]; total: number };
    costOfSales: { items: any[]; total: number };
    grossProfit: number;
    operatingExpenses: { items: any[]; total: number };
    operatingIncome: number;
    otherIncome: { items: any[]; total: number };
    otherExpenses: { items: any[]; total: number };
    netIncome: number;
  }

  export interface BalanceSheetReport {
    assets: {
      current: { items: any[]; total: number };
      nonCurrent: { items: any[]; total: number };
      total: number;
    };
    liabilities: {
      current: { items: any[]; total: number };
      nonCurrent: { items: any[]; total: number };
      total: number;
    };
    equity: { items: any[]; total: number };
  }

  /**
   * @endpoint GET /api/consolidated-reports/profit-loss
   * @description Get consolidated profit & loss
   */
  export type GetProfitLoss = (params: { startDate: string; endDate: string; entities?: string[] }) => Promise<{ success: boolean; data: ProfitLossReport }>;

  /**
   * @endpoint GET /api/consolidated-reports/balance-sheet
   * @description Get consolidated balance sheet
   */
  export type GetBalanceSheet = (params: { asOfDate: string; entities?: string[] }) => Promise<{ success: boolean; data: BalanceSheetReport }>;

  /**
   * @endpoint GET /api/consolidated-reports/cash-flow
   * @description Get consolidated cash flow
   */
  export type GetCashFlow = (params: { startDate: string; endDate: string; entities?: string[] }) => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint GET /api/consolidated-reports/trial-balance
   * @description Get consolidated trial balance
   */
  export type GetTrialBalance = (params: { asOfDate: string; entities?: string[] }) => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint GET /api/consolidated-reports/intercompany
   * @description Get intercompany eliminations
   */
  export type GetIntercompany = (params: { startDate: string; endDate: string }) => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint POST /api/consolidated-reports/generate
   * @description Generate consolidated report
   */
  export type GenerateReport = (data: { reportType: string; startDate: string; endDate: string; entities: string[]; options?: any }) => Promise<{ success: boolean; data: ConsolidatedReport }>;

  /**
   * @endpoint GET /api/consolidated-reports/entities
   * @description Get consolidation entities
   */
  export type GetEntities = () => Promise<{ success: boolean; data: Array<{ id: string; name: string; type: string; ownership: number }> }>;

  /**
   * @endpoint GET /api/consolidated-reports/export
   * @description Export consolidated report
   */
  export type ExportReport = (params: { reportType: string; startDate: string; endDate: string; format: 'csv' | 'xlsx' | 'pdf' }) => Promise<{ success: boolean; data: Buffer }>;
}

// ============================================================================
// PAYMENT-TERMS MODULE - 10 endpoints
// ============================================================================

export namespace PaymentTermsContract {
  // Interfaces
  export interface PaymentTerm {
    _id: string;
    firmId: string;
    name: string;
    code: string;
    daysDue: number;
    discountPercent?: number;
    discountDays?: number;
    description?: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint GET /api/payment-terms
   * @description Get all payment terms
   */
  export type GetTerms = () => Promise<{ success: boolean; data: PaymentTerm[] }>;

  /**
   * @endpoint GET /api/payment-terms/default
   * @description Get default payment terms
   */
  export type GetDefault = () => Promise<{ success: boolean; data: PaymentTerm }>;

  /**
   * @endpoint POST /api/payment-terms/initialize
   * @description Initialize default payment terms
   */
  export type Initialize = () => Promise<{ success: boolean; data: PaymentTerm[] }>;

  /**
   * @endpoint GET /api/payment-terms/:id
   * @description Get single payment term
   */
  export type GetTerm = (id: string) => Promise<{ success: boolean; data: PaymentTerm }>;

  /**
   * @endpoint POST /api/payment-terms
   * @description Create payment term
   */
  export type CreateTerm = (data: Partial<PaymentTerm>) => Promise<{ success: boolean; data: PaymentTerm }>;

  /**
   * @endpoint PUT /api/payment-terms/:id
   * @description Update payment term
   */
  export type UpdateTerm = (id: string, data: Partial<PaymentTerm>) => Promise<{ success: boolean; data: PaymentTerm }>;

  /**
   * @endpoint DELETE /api/payment-terms/:id
   * @description Delete payment term
   */
  export type DeleteTerm = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/payment-terms/:id/set-default
   * @description Set as default term
   */
  export type SetDefault = (id: string) => Promise<{ success: boolean; data: PaymentTerm }>;

  /**
   * @endpoint POST /api/payment-terms/calculate-due-date
   * @description Calculate due date
   */
  export type CalculateDueDate = (data: { termId: string; invoiceDate: string }) => Promise<{ success: boolean; data: { dueDate: string; discountDate?: string; discountAmount?: number } }>;

  /**
   * @endpoint GET /api/payment-terms/active
   * @description Get active payment terms
   */
  export type GetActive = () => Promise<{ success: boolean; data: PaymentTerm[] }>;
}

// ============================================================================
// CURRENCY MODULE - 6 endpoints
// ============================================================================

export namespace CurrencyContract {
  // Interfaces
  export interface CurrencySettings {
    baseCurrency: string;
    enableMultiCurrency: boolean;
    enabledCurrencies: string[];
    exchangeRateSource: 'manual' | 'api';
    autoUpdateRates: boolean;
  }

  export interface ExchangeRate {
    _id: string;
    firmId: string;
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveDate: Date;
    source: 'manual' | 'api';
    createdAt: Date;
  }

  /**
   * @endpoint GET /api/currency/settings
   * @description Get currency settings
   */
  export type GetSettings = () => Promise<{ success: boolean; data: CurrencySettings }>;

  /**
   * @endpoint GET /api/currency/rates
   * @description Get exchange rates
   */
  export type GetRates = (params?: { fromCurrency?: string; date?: string }) => Promise<{ success: boolean; data: ExchangeRate[] }>;

  /**
   * @endpoint POST /api/currency/convert
   * @description Convert amount between currencies
   */
  export type Convert = (data: { amount: number; fromCurrency: string; toCurrency: string; date?: string }) => Promise<{ success: boolean; data: { amount: number; rate: number } }>;

  /**
   * @endpoint PUT /api/currency/settings
   * @description Update currency settings
   */
  export type UpdateSettings = (data: Partial<CurrencySettings>) => Promise<{ success: boolean; data: CurrencySettings }>;

  /**
   * @endpoint POST /api/currency/rates
   * @description Add exchange rate
   */
  export type AddRate = (data: Partial<ExchangeRate>) => Promise<{ success: boolean; data: ExchangeRate }>;

  /**
   * @endpoint POST /api/currency/rates/refresh
   * @description Refresh exchange rates from API
   */
  export type RefreshRates = () => Promise<{ success: boolean; updated: number }>;
}

// ============================================================================
// VENDOR MODULE - 6 endpoints
// ============================================================================

export namespace VendorContract {
  // Enums
  export enum VendorStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    BLOCKED = 'blocked'
  }

  // Interfaces
  export interface Vendor {
    _id: string;
    firmId: string;
    name: string;
    code?: string;
    email?: string;
    phone?: string;
    taxId?: string;
    address?: {
      street: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
    };
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      iban?: string;
      swiftCode?: string;
    };
    paymentTermsId?: string;
    status: VendorStatus;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint POST /api/vendor
   * @description Create vendor
   */
  export type CreateVendor = (data: Partial<Vendor>) => Promise<{ success: boolean; data: Vendor }>;

  /**
   * @endpoint GET /api/vendor
   * @description Get all vendors
   */
  export type GetVendors = (params?: { status?: VendorStatus; search?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: Vendor[]; pagination: any }>;

  /**
   * @endpoint GET /api/vendor/:id
   * @description Get single vendor
   */
  export type GetVendor = (id: string) => Promise<{ success: boolean; data: Vendor }>;

  /**
   * @endpoint PUT /api/vendor/:id
   * @description Update vendor
   */
  export type UpdateVendor = (id: string, data: Partial<Vendor>) => Promise<{ success: boolean; data: Vendor }>;

  /**
   * @endpoint DELETE /api/vendor/:id
   * @description Delete vendor
   */
  export type DeleteVendor = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/vendor/:id/transactions
   * @description Get vendor transactions
   */
  export type GetTransactions = (id: string, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: any[]; pagination: any }>;
}

// ============================================================================
// REFUND MODULE - 11 endpoints
// ============================================================================

export namespace RefundContract {
  // Enums
  export enum RefundStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled'
  }

  export enum RefundMethod {
    ORIGINAL = 'original',
    BANK_TRANSFER = 'bank_transfer',
    CREDIT = 'credit',
    CHECK = 'check'
  }

  // Interfaces
  export interface Refund {
    _id: string;
    firmId: string;
    paymentId: string;
    invoiceId?: string;
    clientId: string;
    amount: number;
    currency: string;
    reason: string;
    status: RefundStatus;
    method: RefundMethod;
    processedAt?: Date;
    processedBy?: string;
    notes?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint GET /api/refund/eligibility/:paymentId
   * @description Check refund eligibility
   */
  export type CheckEligibility = (paymentId: string) => Promise<{ success: boolean; data: { eligible: boolean; maxAmount: number; reason?: string } }>;

  /**
   * @endpoint POST /api/refund/request
   * @description Request refund
   */
  export type RequestRefund = (data: { paymentId: string; amount: number; reason: string; method?: RefundMethod }) => Promise<{ success: boolean; data: Refund }>;

  /**
   * @endpoint GET /api/refund/history
   * @description Get refund history
   */
  export type GetHistory = (params?: { status?: RefundStatus; clientId?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: Refund[]; pagination: any }>;

  /**
   * @endpoint GET /api/refund/:id
   * @description Get single refund
   */
  export type GetRefund = (id: string) => Promise<{ success: boolean; data: Refund }>;

  /**
   * @endpoint POST /api/refund/:id/approve
   * @description Approve refund
   */
  export type ApproveRefund = (id: string) => Promise<{ success: boolean; data: Refund }>;

  /**
   * @endpoint POST /api/refund/:id/reject
   * @description Reject refund
   */
  export type RejectRefund = (id: string, reason?: string) => Promise<{ success: boolean; data: Refund }>;

  /**
   * @endpoint POST /api/refund/:id/process
   * @description Process approved refund
   */
  export type ProcessRefund = (id: string) => Promise<{ success: boolean; data: Refund }>;

  /**
   * @endpoint POST /api/refund/:id/cancel
   * @description Cancel refund request
   */
  export type CancelRefund = (id: string) => Promise<{ success: boolean; data: Refund }>;

  /**
   * @endpoint GET /api/refund/stats
   * @description Get refund statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { total: number; pending: number; totalAmount: number; byStatus: any } }>;

  /**
   * @endpoint GET /api/refund/pending-approval
   * @description Get pending approval refunds
   */
  export type GetPendingApproval = () => Promise<{ success: boolean; data: Refund[] }>;

  /**
   * @endpoint GET /api/refund/client/:clientId
   * @description Get client refunds
   */
  export type GetClientRefunds = (clientId: string) => Promise<{ success: boolean; data: Refund[] }>;
}

// Export all contracts
export {
  BillingRateContract,
  JournalEntryContract,
  AccountContract,
  StatementContract,
  ARAgingContract,
  BankTransactionContract,
  BankTransferContract,
  BillPaymentContract,
  ConsolidatedReportsContract,
  PaymentTermsContract,
  CurrencyContract,
  VendorContract,
  RefundContract
};
