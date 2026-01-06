/**
 * Accounting Module - TypeScript Type Definitions
 * Generated from route and controller analysis
 * Modules: Account, Journal Entry, Bank Account, Bank Transaction, Bank Reconciliation
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  count?: number;
  page?: number;
  totalPages?: number;
  limit?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MongoId {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// ACCOUNT MODULE (7 endpoints)
// ============================================================================

// Enums
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export type AccountSubType =
  | 'Current Asset'
  | 'Fixed Asset'
  | 'Other Asset'
  | 'Current Liability'
  | 'Long-term Liability'
  | 'Other Liability'
  | "Owner's Equity"
  | 'Retained Earnings'
  | 'Operating Income'
  | 'Other Income'
  | 'Cost of Goods Sold'
  | 'Operating Expense'
  | 'Other Expense';

// DTOs
export interface AccountTypeOption {
  value: AccountType;
  label: string;
  labelAr: string;
}

export interface AccountSubTypeOption {
  value: AccountSubType;
  label: string;
  type: AccountType;
}

export interface AccountTypesResponse {
  success: boolean;
  data: {
    types: AccountTypeOption[];
    subTypes: AccountSubTypeOption[];
  };
}

export interface AccountBalance {
  debit: number;
  credit: number;
  balance: number;
}

export interface Account extends MongoId {
  code: string;
  name: string;
  nameAr?: string;
  type: AccountType;
  subType?: AccountSubType;
  parentAccountId?: string | Account;
  description?: string;
  descriptionAr?: string;
  isActive: boolean;
  isSystem: boolean;
  firmId?: string;
  lawyerId?: string;
  createdBy?: string;
  updatedBy?: string;
  children?: Account[];
  balance?: AccountBalance;
}

export interface AccountHierarchyNode extends Account {
  children: AccountHierarchyNode[];
  level: number;
}

// Request DTOs
export interface CreateAccountRequest {
  code: string;
  name: string;
  nameAr?: string;
  type: AccountType;
  subType?: AccountSubType;
  parentAccountId?: string;
  description?: string;
  descriptionAr?: string;
}

export interface UpdateAccountRequest {
  code?: string;
  name?: string;
  nameAr?: string;
  type?: AccountType;
  subType?: AccountSubType;
  parentAccountId?: string;
  description?: string;
  descriptionAr?: string;
  isActive?: boolean;
}

export interface GetAccountsQuery {
  type?: AccountType;
  isActive?: boolean;
  includeHierarchy?: boolean;
}

export interface GetAccountBalanceQuery {
  asOfDate?: string;
  caseId?: string;
}

// Response DTOs
export type GetAccountTypesResponse = AccountTypesResponse;

export interface GetAccountsResponse {
  success: boolean;
  count?: number;
  data: Account[] | AccountHierarchyNode[];
}

export interface GetAccountResponse {
  success: boolean;
  data: Account;
}

export interface CreateAccountResponse {
  success: boolean;
  data: Account;
}

export interface UpdateAccountResponse {
  success: boolean;
  data: Account;
}

export interface DeleteAccountResponse {
  success: boolean;
  data: {};
  message: string;
}

export interface GetAccountBalanceResponse {
  success: boolean;
  data: AccountBalance;
}

// ============================================================================
// JOURNAL ENTRY MODULE (8 endpoints)
// ============================================================================

// Enums
export type JournalEntryStatus = 'draft' | 'posted' | 'voided';

export type JournalEntryType =
  | 'general'
  | 'adjusting'
  | 'closing'
  | 'reversing'
  | 'opening'
  | 'other';

// DTOs
export interface JournalEntryLine {
  accountId: string | Account;
  debit?: number;
  credit?: number;
  description?: string;
  caseId?: string;
}

export interface JournalEntry extends MongoId {
  entryNumber?: string;
  date: string;
  description: string;
  descriptionAr?: string;
  entryType: JournalEntryType;
  status: JournalEntryStatus;
  lines: JournalEntryLine[];
  notes?: string;
  attachments?: string[];
  glEntries?: string[];
  firmId?: string;
  lawyerId?: string;
  createdBy?: string;
  updatedBy?: string;
  postedBy?: string;
  postedAt?: string;
  voidedBy?: string;
  voidedAt?: string;
  voidReason?: string;
  totalDebit?: number;
  totalCredit?: number;
  isBalanced?: boolean;
  difference?: number;
}

// Request DTOs
export interface CreateJournalEntryRequest {
  date: string;
  description: string;
  descriptionAr?: string;
  entryType?: JournalEntryType;
  lines: JournalEntryLine[];
  notes?: string;
  attachments?: string[];
}

export interface UpdateJournalEntryRequest {
  date?: string;
  description?: string;
  descriptionAr?: string;
  entryType?: JournalEntryType;
  lines?: JournalEntryLine[];
  notes?: string;
  attachments?: string[];
}

export interface CreateSimpleEntryRequest {
  date: string;
  description: string;
  descriptionAr?: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  caseId?: string;
  notes?: string;
  entryType?: JournalEntryType;
}

export interface VoidJournalEntryRequest {
  reason: string;
}

export interface GetJournalEntriesQuery {
  status?: JournalEntryStatus;
  startDate?: string;
  endDate?: string;
  entryType?: JournalEntryType;
  page?: number;
  limit?: number;
}

// Response DTOs
export interface GetJournalEntriesResponse extends PaginatedResponse<JournalEntry> {}

export interface GetJournalEntryResponse {
  success: boolean;
  data: JournalEntry;
}

export interface CreateJournalEntryResponse {
  success: boolean;
  data: JournalEntry;
}

export interface UpdateJournalEntryResponse {
  success: boolean;
  data: JournalEntry;
}

export interface PostJournalEntryResponse {
  success: boolean;
  data: JournalEntry;
  message: string;
}

export interface VoidJournalEntryResponse {
  success: boolean;
  data: JournalEntry;
  message: string;
}

export interface DeleteJournalEntryResponse {
  success: boolean;
  data: {};
  message: string;
}

export interface CreateSimpleEntryResponse {
  success: boolean;
  data: JournalEntry;
}

// ============================================================================
// BANK ACCOUNT MODULE (10 endpoints)
// ============================================================================

// Enums
export type BankAccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'money_market'
  | 'line_of_credit'
  | 'other';

export type BankAccountCurrency =
  | 'SAR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AED'
  | 'KWD'
  | 'BHD'
  | 'QAR'
  | 'OMR';

export type BankConnectionStatus = 'connected' | 'disconnected' | 'error';

// DTOs
export interface BankConnection {
  provider?: string;
  accountId?: string;
  accessToken?: string;
  refreshToken?: string;
  status: BankConnectionStatus;
  lastSyncedAt?: string;
  error?: string;
}

export interface BankAccount extends MongoId {
  name: string;
  nameAr?: string;
  type: BankAccountType;
  bankName?: string;
  accountNumber?: string;
  currency: BankAccountCurrency;
  openingBalance: number;
  balance: number;
  availableBalance: number;
  iban?: string;
  swiftCode?: string;
  routingNumber?: string;
  branchName?: string;
  branchCode?: string;
  accountHolder?: string;
  accountHolderAddress?: string;
  minBalance?: number;
  overdraftLimit?: number;
  interestRate?: number;
  description?: string;
  notes?: string;
  color?: string;
  icon?: string;
  isDefault: boolean;
  isActive: boolean;
  connection?: BankConnection;
  lastSyncedAt?: string;
  lawyerId: string;
  firmId?: string;
}

export interface BankAccountSummary {
  totalAccounts: number;
  totalBalance: number;
  totalAvailableBalance: number;
  byCurrency: {
    [currency: string]: {
      count: number;
      balance: number;
      availableBalance: number;
    };
  };
  byType: {
    [type: string]: {
      count: number;
      balance: number;
    };
  };
}

export interface BalanceHistoryPoint {
  date: string;
  balance: number;
  credits: number;
  debits: number;
}

// Request DTOs
export interface CreateBankAccountRequest {
  name: string;
  nameAr?: string;
  type: BankAccountType;
  bankName?: string;
  accountNumber?: string;
  currency?: BankAccountCurrency;
  openingBalance?: number;
  iban?: string;
  swiftCode?: string;
  routingNumber?: string;
  branchName?: string;
  branchCode?: string;
  accountHolder?: string;
  accountHolderAddress?: string;
  minBalance?: number;
  overdraftLimit?: number;
  interestRate?: number;
  description?: string;
  notes?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
}

export interface UpdateBankAccountRequest {
  name?: string;
  nameAr?: string;
  type?: BankAccountType;
  bankName?: string;
  accountNumber?: string;
  currency?: BankAccountCurrency;
  iban?: string;
  swiftCode?: string;
  routingNumber?: string;
  branchName?: string;
  branchCode?: string;
  accountHolder?: string;
  accountHolderAddress?: string;
  minBalance?: number;
  overdraftLimit?: number;
  interestRate?: number;
  description?: string;
  notes?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
}

export interface GetBankAccountsQuery {
  type?: BankAccountType;
  currency?: BankAccountCurrency;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetBalanceHistoryQuery {
  period?: 'week' | 'month' | 'quarter' | 'year';
}

// Response DTOs
export interface GetBankAccountsResponse {
  success: boolean;
  accounts: BankAccount[];
  total: number;
}

export interface GetBankAccountResponse {
  success: boolean;
  account: BankAccount;
}

export interface CreateBankAccountResponse {
  success: boolean;
  message: string;
  account: BankAccount;
}

export interface UpdateBankAccountResponse {
  success: boolean;
  message: string;
  account: BankAccount;
}

export interface DeleteBankAccountResponse {
  success: boolean;
  message: string;
}

export interface SetDefaultBankAccountResponse {
  success: boolean;
  message: string;
  account: BankAccount;
}

export interface GetBalanceHistoryResponse {
  success: boolean;
  data: BalanceHistoryPoint[];
}

export interface GetBankAccountSummaryResponse {
  success: boolean;
  summary: BankAccountSummary;
}

export interface SyncBankAccountResponse {
  success: boolean;
  message: string;
  synced: number;
  newTransactions: number;
  lastSyncedAt: string;
}

export interface DisconnectBankAccountResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// BANK TRANSACTION MODULE (6 endpoints)
// ============================================================================

// Enums
export type BankTransactionType = 'credit' | 'debit';
export type BankTransactionImportSource = 'manual' | 'csv' | 'ofx' | 'qif' | 'api';
export type BankTransactionMatchType = 'Invoice' | 'Expense' | 'Payment' | 'BankTransfer';

// DTOs
export interface BankTransactionMatch {
  type: BankTransactionMatchType;
  recordId: string;
  matchedAt: string;
  matchedBy: string;
}

export interface BankTransaction extends MongoId {
  transactionId: string;
  accountId: string | BankAccount;
  date: string;
  type: BankTransactionType;
  amount: number;
  balance: number;
  description?: string;
  reference?: string;
  category?: string;
  payee?: string;
  matched: boolean;
  matchDetails?: BankTransactionMatch;
  isReconciled: boolean;
  reconciliationId?: string;
  importSource: BankTransactionImportSource;
  importBatchId?: string;
  rawData?: any;
  lawyerId: string;
  firmId?: string;
}

export interface BankTransactionImportResult {
  imported: number;
  duplicates: number;
  errors: number;
}

// Request DTOs
export interface CreateBankTransactionRequest {
  accountId: string;
  date?: string;
  type: BankTransactionType;
  amount: number;
  description?: string;
  reference?: string;
  category?: string;
  payee?: string;
}

export interface MatchBankTransactionRequest {
  type: BankTransactionMatchType;
  recordId: string;
}

export interface GetBankTransactionsQuery {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  type?: BankTransactionType;
  matched?: boolean;
  isReconciled?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// Response DTOs
export interface GetBankTransactionsResponse {
  success: boolean;
  transactions: BankTransaction[];
  total: number;
}

export interface GetBankTransactionResponse {
  success: boolean;
  transaction: BankTransaction;
}

export interface CreateBankTransactionResponse {
  success: boolean;
  message: string;
  transaction: BankTransaction;
}

export interface ImportBankTransactionsResponse {
  success: boolean;
  message: string;
  imported: number;
  duplicates: number;
  errors: number;
}

export interface MatchBankTransactionResponse {
  success: boolean;
  message: string;
  transaction: BankTransaction;
}

export interface UnmatchBankTransactionResponse {
  success: boolean;
  message: string;
  transaction: BankTransaction;
}

// ============================================================================
// BANK RECONCILIATION MODULE (33 endpoints)
// ============================================================================

// Enums
export type ReconciliationStatus = 'in_progress' | 'completed' | 'cancelled';
export type BankFeedProvider = 'plaid' | 'yodlee' | 'teller' | 'finicity' | 'manual';
export type BankFeedStatus = 'active' | 'inactive' | 'error' | 'pending';
export type MatchStatus = 'suggested' | 'confirmed' | 'rejected';
export type MatchType = 'exact' | 'fuzzy' | 'manual' | 'rule' | 'split';

// DTOs
export interface ReconciliationTransaction {
  transactionId: string;
  isCleared: boolean;
  clearedBy?: string;
  clearedAt?: string;
}

export interface BankReconciliation extends MongoId {
  reconciliationNumber: string;
  accountId: string | BankAccount;
  status: ReconciliationStatus;
  startDate: string;
  endDate: string;
  openingBalance: number;
  statementBalance: number;
  closingBalance: number;
  difference: number;
  clearedCredits: number;
  clearedDebits: number;
  transactions: ReconciliationTransaction[];
  startedBy: string;
  startedAt: string;
  completedBy?: string;
  completedAt?: string;
  lawyerId: string;
  firmId?: string;
}

export interface BankFeed extends MongoId {
  name: string;
  bankAccountId: string | BankAccount;
  provider: BankFeedProvider;
  status: BankFeedStatus;
  credentials?: any;
  settings?: any;
  autoImport: boolean;
  importFrequency?: string;
  lastImportAt?: string;
  totalImported: number;
  lastError?: string;
  firmId?: string;
  lawyerId: string;
  createdBy: string;
}

export interface BankTransactionMatchSuggestion {
  bankTransaction: BankTransaction;
  suggestions: Array<{
    type: BankTransactionMatchType;
    record: any;
    score: number;
    reason: string;
  }>;
}

export interface BankTransactionMatchRecord extends MongoId {
  bankTransactionId: string | BankTransaction;
  matchType: MatchType;
  status: MatchStatus;
  matches: Array<{
    type: BankTransactionMatchType;
    recordId: string;
    amount: number;
    description?: string;
  }>;
  totalAmount: number;
  difference: number;
  confidence: number;
  matchedBy?: string;
  matchedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  ruleId?: string;
  lawyerId?: string;
  firmId?: string;
}

export interface BankMatchRuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between';
  value: any;
}

export interface BankMatchRuleAction {
  type: 'auto_match' | 'suggest_match' | 'categorize' | 'tag';
  category?: string;
  tags?: string[];
  matchType?: BankTransactionMatchType;
}

export interface BankMatchRule extends MongoId {
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  conditions: BankMatchRuleCondition[];
  action: BankMatchRuleAction;
  bankAccountIds: string[];
  applyToFutureTransactions: boolean;
  timesApplied: number;
  lastAppliedAt?: string;
  firmId?: string;
  lawyerId: string;
  createdBy: string;
  lastModifiedBy?: string;
}

export interface ExchangeRate extends MongoId {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: string;
  source: 'api' | 'manual';
  firmId?: string;
  setBy?: string;
  notes?: string;
}

export interface ReconciliationStatusInfo {
  hasInProgress: boolean;
  inProgressReconciliation?: BankReconciliation;
  lastReconciliation?: BankReconciliation;
  unreconciledTransactions: number;
  unmatchedTransactions: number;
}

export interface MatchStatistics {
  total: number;
  byStatus: {
    suggested: number;
    confirmed: number;
    rejected: number;
  };
  byType: {
    exact: number;
    fuzzy: number;
    manual: number;
    rule: number;
    split: number;
  };
  averageConfidence: number;
}

export interface RuleStatistics {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  totalApplications: number;
  topRules: Array<{
    rule: BankMatchRule;
    applications: number;
  }>;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalDigits: number;
}

// Request DTOs
export interface CreateReconciliationRequest {
  accountId: string;
  endDate: string;
  statementBalance: number;
  openingBalance?: number;
}

export interface ClearTransactionRequest {
  transactionId: string;
}

export interface UnclearTransactionRequest {
  transactionId: string;
}

export interface GetReconciliationsQuery {
  accountId?: string;
  status?: ReconciliationStatus;
  page?: number;
  limit?: number;
}

export interface ImportCSVRequest {
  bankAccountId: string;
  dateFormat?: string;
  delimiter?: string;
  hasHeader?: boolean;
  encoding?: string;
  skipRows?: number;
  columnMapping?: any;
  debitColumn?: string;
  creditColumn?: string;
}

export interface ImportOFXRequest {
  bankAccountId: string;
}

export interface GetMatchSuggestionsQuery {
  limit?: number;
}

export interface AutoMatchQuery {
  limit?: number;
  minScore?: number;
}

export interface RejectMatchRequest {
  reason?: string;
}

export interface CreateSplitMatchRequest {
  bankTransactionId: string;
  splits: Array<{
    type: BankTransactionMatchType;
    recordId: string;
    amount: number;
    description?: string;
  }>;
}

export interface CreateMatchRuleRequest {
  name: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
  conditions: BankMatchRuleCondition[];
  action: BankMatchRuleAction;
  bankAccountIds?: string[];
  applyToFutureTransactions?: boolean;
}

export interface UpdateMatchRuleRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
  conditions?: BankMatchRuleCondition[];
  action?: BankMatchRuleAction;
  bankAccountIds?: string[];
  applyToFutureTransactions?: boolean;
}

export interface GetMatchRulesQuery {
  isActive?: boolean;
  bankAccountId?: string;
}

export interface GetUnmatchedTransactionsQuery {
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: BankTransactionType;
  limit?: number;
  skip?: number;
}

export interface GetExchangeRatesQuery {
  baseCurrency?: string;
  firmId?: string;
}

export interface ConvertAmountRequest {
  amount: number;
  from: string;
  to: string;
  date?: string;
  firmId?: string;
}

export interface SetManualRateRequest {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  notes?: string;
}

export interface GetSupportedCurrenciesQuery {
  baseCurrency?: string;
  firmId?: string;
}

export interface UpdateRatesFromAPIRequest {
  baseCurrency?: string;
}

export interface GetMatchStatisticsQuery {
  startDate?: string;
  endDate?: string;
}

export interface CreateBankFeedRequest {
  name: string;
  bankAccountId: string;
  provider: BankFeedProvider;
  status?: BankFeedStatus;
  credentials?: any;
  settings?: any;
  autoImport?: boolean;
  importFrequency?: string;
  lastImportAt?: string;
}

export interface UpdateBankFeedRequest {
  name?: string;
  provider?: BankFeedProvider;
  status?: BankFeedStatus;
  credentials?: any;
  settings?: any;
  autoImport?: boolean;
  importFrequency?: string;
  lastImportAt?: string;
}

export interface GetBankFeedsQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: BankFeedStatus;
  provider?: BankFeedProvider;
  bankAccountId?: string;
}

// Response DTOs
export interface CreateReconciliationResponse {
  success: boolean;
  message: string;
  reconciliation: BankReconciliation;
}

export interface GetReconciliationsResponse {
  success: boolean;
  reconciliations: BankReconciliation[];
  total: number;
}

export interface GetReconciliationResponse {
  success: boolean;
  reconciliation: BankReconciliation;
}

export interface ClearTransactionResponse {
  success: boolean;
  message: string;
  reconciliation: {
    _id: string;
    closingBalance: number;
    difference: number;
    clearedCredits: number;
    clearedDebits: number;
  };
}

export interface UnclearTransactionResponse {
  success: boolean;
  message: string;
  reconciliation: {
    _id: string;
    closingBalance: number;
    difference: number;
    clearedCredits: number;
    clearedDebits: number;
  };
}

export interface CompleteReconciliationResponse {
  success: boolean;
  message: string;
  reconciliation: BankReconciliation;
}

export interface CancelReconciliationResponse {
  success: boolean;
  message: string;
  reconciliation: BankReconciliation;
}

export interface ImportCSVResponse {
  success: boolean;
  message: string;
  imported: number;
  duplicates: number;
  errors: number;
}

export interface ImportOFXResponse {
  success: boolean;
  message: string;
  imported: number;
  duplicates: number;
  errors: number;
}

export interface GetCSVTemplateResponse {
  // Returns CSV file
}

export interface GetMatchSuggestionsResponse {
  success: boolean;
  suggestions: BankTransactionMatchSuggestion[];
}

export interface AutoMatchResponse {
  success: boolean;
  message: string;
  processed: number;
  matched: number;
  suggested: number;
}

export interface ConfirmMatchResponse {
  success: boolean;
  message: string;
  match: BankTransactionMatchRecord;
}

export interface RejectMatchResponse {
  success: boolean;
  message: string;
  match: BankTransactionMatchRecord;
}

export interface CreateSplitMatchResponse {
  success: boolean;
  message: string;
  match: BankTransactionMatchRecord;
}

export interface UnmatchResponse {
  success: boolean;
  message: string;
}

export interface CreateMatchRuleResponse {
  success: boolean;
  message: string;
  rule: BankMatchRule;
}

export interface GetMatchRulesResponse {
  success: boolean;
  rules: BankMatchRule[];
}

export interface UpdateMatchRuleResponse {
  success: boolean;
  message: string;
  rule: BankMatchRule;
}

export interface DeleteMatchRuleResponse {
  success: boolean;
  message: string;
}

export interface GetReconciliationStatusResponse {
  success: boolean;
  hasInProgress: boolean;
  inProgressReconciliation?: BankReconciliation;
  lastReconciliation?: BankReconciliation;
  unreconciledTransactions: number;
  unmatchedTransactions: number;
}

export interface GetUnmatchedTransactionsResponse {
  success: boolean;
  transactions: BankTransaction[];
  total: number;
}

export interface GetMatchStatisticsResponse {
  success: boolean;
  statistics: MatchStatistics;
}

export interface GetRuleStatisticsResponse {
  success: boolean;
  statistics: RuleStatistics;
}

export interface GetExchangeRatesResponse {
  success: boolean;
  data: ExchangeRate[];
  baseCurrency: string;
  timestamp: string;
}

export interface ConvertAmountResponse {
  success: boolean;
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: string;
}

export interface SetManualRateResponse {
  success: boolean;
  message: string;
  exchangeRate: ExchangeRate;
}

export interface GetSupportedCurrenciesResponse {
  success: boolean;
  currencies: CurrencyInfo[];
}

export interface UpdateRatesFromAPIResponse {
  success: boolean;
  message: string;
  updated: number;
}

export interface GetBankFeedsResponse {
  success: boolean;
  data: BankFeed[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  sorting: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

export interface CreateBankFeedResponse {
  success: boolean;
  message: string;
  data: BankFeed;
}

export interface UpdateBankFeedResponse {
  success: boolean;
  message: string;
  data: BankFeed;
}

export interface DeleteBankFeedResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// API ENDPOINT INTERFACES
// ============================================================================

/**
 * Account API Endpoints (7 total)
 */
export interface AccountAPI {
  // GET /api/accounts/types
  getAccountTypes(): Promise<GetAccountTypesResponse>;

  // GET /api/accounts
  getAccounts(query?: GetAccountsQuery): Promise<GetAccountsResponse>;

  // GET /api/accounts/:id
  getAccount(id: string): Promise<GetAccountResponse>;

  // GET /api/accounts/:id/balance
  getAccountBalance(id: string, query?: GetAccountBalanceQuery): Promise<GetAccountBalanceResponse>;

  // POST /api/accounts
  createAccount(data: CreateAccountRequest): Promise<CreateAccountResponse>;

  // PATCH /api/accounts/:id
  updateAccount(id: string, data: UpdateAccountRequest): Promise<UpdateAccountResponse>;

  // DELETE /api/accounts/:id
  deleteAccount(id: string): Promise<DeleteAccountResponse>;
}

/**
 * Journal Entry API Endpoints (8 total)
 */
export interface JournalEntryAPI {
  // POST /api/journal-entries/simple
  createSimpleEntry(data: CreateSimpleEntryRequest): Promise<CreateSimpleEntryResponse>;

  // GET /api/journal-entries
  getEntries(query?: GetJournalEntriesQuery): Promise<GetJournalEntriesResponse>;

  // GET /api/journal-entries/:id
  getEntry(id: string): Promise<GetJournalEntryResponse>;

  // POST /api/journal-entries
  createEntry(data: CreateJournalEntryRequest): Promise<CreateJournalEntryResponse>;

  // PATCH /api/journal-entries/:id
  updateEntry(id: string, data: UpdateJournalEntryRequest): Promise<UpdateJournalEntryResponse>;

  // POST /api/journal-entries/:id/post
  postEntry(id: string): Promise<PostJournalEntryResponse>;

  // POST /api/journal-entries/:id/void
  voidEntry(id: string, data: VoidJournalEntryRequest): Promise<VoidJournalEntryResponse>;

  // DELETE /api/journal-entries/:id
  deleteEntry(id: string): Promise<DeleteJournalEntryResponse>;
}

/**
 * Bank Account API Endpoints (10 total)
 */
export interface BankAccountAPI {
  // POST /api/bank-accounts
  createBankAccount(data: CreateBankAccountRequest): Promise<CreateBankAccountResponse>;

  // GET /api/bank-accounts
  getBankAccounts(query?: GetBankAccountsQuery): Promise<GetBankAccountsResponse>;

  // GET /api/bank-accounts/summary
  getSummary(): Promise<GetBankAccountSummaryResponse>;

  // GET /api/bank-accounts/:id
  getBankAccount(id: string): Promise<GetBankAccountResponse>;

  // PUT /api/bank-accounts/:id
  updateBankAccount(id: string, data: UpdateBankAccountRequest): Promise<UpdateBankAccountResponse>;

  // DELETE /api/bank-accounts/:id
  deleteBankAccount(id: string): Promise<DeleteBankAccountResponse>;

  // POST /api/bank-accounts/:id/set-default
  setDefault(id: string): Promise<SetDefaultBankAccountResponse>;

  // GET /api/bank-accounts/:id/balance-history
  getBalanceHistory(id: string, query?: GetBalanceHistoryQuery): Promise<GetBalanceHistoryResponse>;

  // POST /api/bank-accounts/:id/sync
  syncAccount(id: string): Promise<SyncBankAccountResponse>;

  // POST /api/bank-accounts/:id/disconnect
  disconnectAccount(id: string): Promise<DisconnectBankAccountResponse>;
}

/**
 * Bank Transaction API Endpoints (6 total)
 */
export interface BankTransactionAPI {
  // POST /api/bank-transactions
  createTransaction(data: CreateBankTransactionRequest): Promise<CreateBankTransactionResponse>;

  // GET /api/bank-transactions
  getTransactions(query?: GetBankTransactionsQuery): Promise<GetBankTransactionsResponse>;

  // GET /api/bank-transactions/:id
  getTransaction(id: string): Promise<GetBankTransactionResponse>;

  // POST /api/bank-transactions/:transactionId/match
  matchTransaction(transactionId: string, data: MatchBankTransactionRequest): Promise<MatchBankTransactionResponse>;

  // POST /api/bank-transactions/:transactionId/unmatch
  unmatchTransaction(transactionId: string): Promise<UnmatchBankTransactionResponse>;

  // POST /api/bank-transactions/import/:accountId (multipart/form-data)
  importTransactions(accountId: string, file: File): Promise<ImportBankTransactionsResponse>;
}

/**
 * Bank Reconciliation API Endpoints (33 total)
 */
export interface BankReconciliationAPI {
  // ============ BANK FEEDS (4 endpoints) ============
  // GET /api/bank-reconciliation/feeds
  getBankFeeds(query?: GetBankFeedsQuery): Promise<GetBankFeedsResponse>;

  // POST /api/bank-reconciliation/feeds
  createBankFeed(data: CreateBankFeedRequest): Promise<CreateBankFeedResponse>;

  // PUT /api/bank-reconciliation/feeds/:id
  updateBankFeed(id: string, data: UpdateBankFeedRequest): Promise<UpdateBankFeedResponse>;

  // DELETE /api/bank-reconciliation/feeds/:id
  deleteBankFeed(id: string): Promise<DeleteBankFeedResponse>;

  // ============ IMPORT (3 endpoints) ============
  // POST /api/bank-reconciliation/import/csv (multipart/form-data)
  importCSV(file: File, data: ImportCSVRequest): Promise<ImportCSVResponse>;

  // POST /api/bank-reconciliation/import/ofx (multipart/form-data)
  importOFX(file: File, data: ImportOFXRequest): Promise<ImportOFXResponse>;

  // GET /api/bank-reconciliation/import/template
  getCSVTemplate(): Promise<GetCSVTemplateResponse>;

  // ============ MATCHING (6 endpoints) ============
  // GET /api/bank-reconciliation/suggestions/:accountId
  getMatchSuggestions(accountId: string, query?: GetMatchSuggestionsQuery): Promise<GetMatchSuggestionsResponse>;

  // POST /api/bank-reconciliation/auto-match/:accountId
  autoMatch(accountId: string, query?: AutoMatchQuery): Promise<AutoMatchResponse>;

  // POST /api/bank-reconciliation/match/confirm/:id
  confirmMatch(id: string): Promise<ConfirmMatchResponse>;

  // POST /api/bank-reconciliation/match/reject/:id
  rejectMatch(id: string, data?: RejectMatchRequest): Promise<RejectMatchResponse>;

  // POST /api/bank-reconciliation/match/split
  createSplitMatch(data: CreateSplitMatchRequest): Promise<CreateSplitMatchResponse>;

  // DELETE /api/bank-reconciliation/match/:id
  unmatch(id: string): Promise<UnmatchResponse>;

  // ============ MATCH RULES (4 endpoints) ============
  // POST /api/bank-reconciliation/rules
  createRule(data: CreateMatchRuleRequest): Promise<CreateMatchRuleResponse>;

  // GET /api/bank-reconciliation/rules
  getRules(query?: GetMatchRulesQuery): Promise<GetMatchRulesResponse>;

  // PUT /api/bank-reconciliation/rules/:id
  updateRule(id: string, data: UpdateMatchRuleRequest): Promise<UpdateMatchRuleResponse>;

  // DELETE /api/bank-reconciliation/rules/:id
  deleteRule(id: string): Promise<DeleteMatchRuleResponse>;

  // ============ RECONCILIATION (7 endpoints) ============
  // POST /api/bank-reconciliation
  createReconciliation(data: CreateReconciliationRequest): Promise<CreateReconciliationResponse>;

  // GET /api/bank-reconciliation
  getReconciliations(query?: GetReconciliationsQuery): Promise<GetReconciliationsResponse>;

  // GET /api/bank-reconciliation/:id
  getReconciliation(id: string): Promise<GetReconciliationResponse>;

  // POST /api/bank-reconciliation/:id/clear
  clearTransaction(id: string, data: ClearTransactionRequest): Promise<ClearTransactionResponse>;

  // POST /api/bank-reconciliation/:id/unclear
  unclearTransaction(id: string, data: UnclearTransactionRequest): Promise<UnclearTransactionResponse>;

  // POST /api/bank-reconciliation/:id/complete
  completeReconciliation(id: string): Promise<CompleteReconciliationResponse>;

  // POST /api/bank-reconciliation/:id/cancel
  cancelReconciliation(id: string): Promise<CancelReconciliationResponse>;

  // ============ STATUS & REPORTING (4 endpoints) ============
  // GET /api/bank-reconciliation/status/:accountId
  getReconciliationStatus(accountId: string): Promise<GetReconciliationStatusResponse>;

  // GET /api/bank-reconciliation/unmatched/:accountId
  getUnmatchedTransactions(accountId: string, query?: GetUnmatchedTransactionsQuery): Promise<GetUnmatchedTransactionsResponse>;

  // GET /api/bank-reconciliation/statistics/matches
  getMatchStatistics(query?: GetMatchStatisticsQuery): Promise<GetMatchStatisticsResponse>;

  // GET /api/bank-reconciliation/statistics/rules
  getRuleStatistics(): Promise<GetRuleStatisticsResponse>;

  // ============ CURRENCY (5 endpoints) ============
  // GET /api/bank-reconciliation/currency/rates
  getExchangeRates(query?: GetExchangeRatesQuery): Promise<GetExchangeRatesResponse>;

  // POST /api/bank-reconciliation/currency/convert
  convertAmount(data: ConvertAmountRequest): Promise<ConvertAmountResponse>;

  // POST /api/bank-reconciliation/currency/rates
  setManualRate(data: SetManualRateRequest): Promise<SetManualRateResponse>;

  // GET /api/bank-reconciliation/currency/supported
  getSupportedCurrencies(query?: GetSupportedCurrenciesQuery): Promise<GetSupportedCurrenciesResponse>;

  // POST /api/bank-reconciliation/currency/update
  updateRatesFromAPI(data?: UpdateRatesFromAPIRequest): Promise<UpdateRatesFromAPIResponse>;
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * TOTAL ENDPOINTS DOCUMENTED: 64
 *
 * Breakdown by module:
 * - Account: 7 endpoints
 * - Journal Entry: 8 endpoints
 * - Bank Account: 10 endpoints
 * - Bank Transaction: 6 endpoints
 * - Bank Reconciliation: 33 endpoints
 *   - Bank Feeds: 4
 *   - Import: 3
 *   - Matching: 6
 *   - Match Rules: 4
 *   - Reconciliation: 7
 *   - Status & Reporting: 4
 *   - Currency: 5
 */
