/**
 * Report API Type Definitions
 * Auto-generated from /home/user/traf3li-backend/src/routes/report.route.js
 * and /home/user/traf3li-backend/src/controllers/report.controller.js
 * and /home/user/traf3li-backend/src/controllers/accountingReports.controller.js
 * and /home/user/traf3li-backend/src/controllers/chartReports.controller.js
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════

export interface BaseResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ReportType = 'table' | 'chart' | 'pivot' | 'funnel' | 'cohort' | 'dashboard';
export type ReportScope = 'personal' | 'team' | 'global';
export type ExportFormat = 'csv' | 'excel' | 'xlsx' | 'pdf';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

// ═══════════════════════════════════════════════════════════════
// REPORT BUILDER TYPES
// ═══════════════════════════════════════════════════════════════

export interface DataSource {
  collection: string;
  alias?: string;
  joins?: Array<{
    collection: string;
    localField: string;
    foreignField: string;
    as: string;
  }>;
}

export interface ReportColumn {
  field: string;
  label: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  aggregation?: AggregationType;
  width?: number;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
  label?: string;
}

export interface ReportGroupBy {
  field: string;
  label?: string;
  aggregations?: Array<{
    field: string;
    operation: AggregationType;
  }>;
}

export interface ReportVisualization {
  chartType: ChartType;
  xAxis: string;
  yAxis: string | string[];
  options?: Record<string, any>;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  recipients: string[];
  format: ExportFormat;
  nextRun?: Date;
}

export interface ReportDefinition {
  _id: string;
  name: string;
  description?: string;
  type: ReportType;
  dataSources: DataSource[];
  columns: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: ReportGroupBy;
  visualization?: ReportVisualization;
  schedule?: ReportSchedule;
  scope: ReportScope;
  isPublic: boolean;
  ownerId: string;
  firmId?: string;
  lawyerId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports
// ═══════════════════════════════════════════════════════════════

export interface ListReportsQuery {
  type?: ReportType;
  scope?: ReportScope;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'lastExecutedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListReportsResponse extends BaseResponse {
  data: ReportDefinition[];
  pagination: Pagination;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reports
// ═══════════════════════════════════════════════════════════════

export interface CreateReportRequest {
  name: string;
  description?: string;
  type: ReportType;
  dataSources: DataSource[];
  columns: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: ReportGroupBy;
  visualization?: ReportVisualization;
  schedule?: Partial<ReportSchedule>;
  isPublic?: boolean;
  scope?: ReportScope;
}

export interface CreateReportResponse extends BaseResponse {
  data: ReportDefinition;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/:id
// ═══════════════════════════════════════════════════════════════

export interface GetReportResponse extends BaseResponse {
  data: ReportDefinition;
}

// ═══════════════════════════════════════════════════════════════
// PUT /api/reports/:id
// ═══════════════════════════════════════════════════════════════

export interface UpdateReportRequest {
  name?: string;
  description?: string;
  type?: ReportType;
  dataSources?: DataSource[];
  columns?: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: ReportGroupBy;
  visualization?: ReportVisualization;
  isPublic?: boolean;
  scope?: ReportScope;
}

export interface UpdateReportResponse extends BaseResponse {
  data: ReportDefinition;
}

// ═══════════════════════════════════════════════════════════════
// DELETE /api/reports/:id
// ═══════════════════════════════════════════════════════════════

export interface DeleteReportResponse extends BaseResponse {}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/:id/execute
// ═══════════════════════════════════════════════════════════════

export interface ExecuteReportQuery {
  _limit?: number;
  [key: string]: any; // Dynamic filter parameters
}

export interface ExecuteReportResponse extends BaseResponse {
  data: {
    reportId: string;
    reportName: string;
    executedAt: Date;
    rows: any[];
    columns: ReportColumn[];
    summary?: Record<string, number>;
    rowCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/:id/export/:format
// ═══════════════════════════════════════════════════════════════

export interface ExportReportQuery {
  [key: string]: any; // Dynamic filter parameters
}

// Returns file buffer (handled by res.send())

// ═══════════════════════════════════════════════════════════════
// POST /api/reports/:id/clone
// ═══════════════════════════════════════════════════════════════

export interface CloneReportRequest {
  name?: string;
}

export interface CloneReportResponse extends BaseResponse {
  data: ReportDefinition;
}

// ═══════════════════════════════════════════════════════════════
// PUT /api/reports/:id/schedule
// ═══════════════════════════════════════════════════════════════

export interface UpdateScheduleRequest {
  enabled: boolean;
  frequency?: ScheduleFrequency;
  recipients?: string[];
  format?: ExportFormat;
}

export interface UpdateScheduleResponse extends BaseResponse {
  data: ReportDefinition;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/reports/validate
// ═══════════════════════════════════════════════════════════════

export interface ValidateReportRequest {
  name: string;
  description?: string;
  type: ReportType;
  dataSources: DataSource[];
  columns: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: ReportGroupBy;
  visualization?: ReportVisualization;
}

export interface ValidateReportResponse extends BaseResponse {
  data: {
    valid: boolean;
    errors: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNTING REPORTS
// ═══════════════════════════════════════════════════════════════

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  balance: number;
  balanceSAR: string;
  subType?: string;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/profit-loss
// ═══════════════════════════════════════════════════════════════

export interface ProfitLossQuery {
  startDate: string; // ISO date
  endDate: string; // ISO date
  caseId?: string;
}

export interface ProfitLossResponse extends BaseResponse {
  report: 'profit-loss';
  period: { startDate: string; endDate: string };
  caseId: string | null;
  generatedAt: Date;
  data: {
    income: {
      accounts: AccountBalance[];
      total: number;
      totalSAR: string;
    };
    expenses: {
      accounts: AccountBalance[];
      total: number;
      totalSAR: string;
    };
    summary: {
      totalIncome: number;
      totalIncomeSAR: string;
      totalExpenses: number;
      totalExpensesSAR: string;
      netProfit: number;
      netProfitSAR: string;
      profitMargin: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/balance-sheet
// ═══════════════════════════════════════════════════════════════

export interface BalanceSheetQuery {
  asOfDate?: string; // ISO date
}

export interface BalanceSheetResponse extends BaseResponse {
  report: 'balance-sheet';
  asOfDate: Date;
  generatedAt: Date;
  data: {
    assets: {
      accounts: AccountBalance[];
      total: number;
      totalSAR: string;
    };
    liabilities: {
      accounts: AccountBalance[];
      total: number;
      totalSAR: string;
    };
    equity: {
      accounts: AccountBalance[];
      total: number;
      totalSAR: string;
    };
    summary: {
      totalAssets: number;
      totalAssetsSAR: string;
      totalLiabilities: number;
      totalLiabilitiesSAR: string;
      totalEquity: number;
      totalEquitySAR: string;
      totalLiabilitiesAndEquity: number;
      totalLiabilitiesAndEquitySAR: string;
      isBalanced: boolean;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/case-profitability
// ═══════════════════════════════════════════════════════════════

export interface CaseProfitabilityQuery {
  startDate?: string;
  endDate?: string;
  caseId?: string;
}

export interface CaseProfitability {
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  revenue: number;
  revenueSAR: string;
  expenses: number;
  expensesSAR: string;
  profit: number;
  profitSAR: string;
  profitMargin: string;
}

export interface CaseProfitabilityResponse extends BaseResponse {
  report: 'case-profitability';
  period: { startDate?: string; endDate?: string };
  generatedAt: Date;
  data: {
    cases: CaseProfitability[];
    summary: {
      caseCount: number;
      totalRevenue: number;
      totalRevenueSAR: string;
      totalExpenses: number;
      totalExpensesSAR: string;
      totalProfit: number;
      totalProfitSAR: string;
      averageProfitMargin: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/ar-aging
// ═══════════════════════════════════════════════════════════════

export interface ARAgingQuery {
  asOfDate?: string;
}

export interface AgingBucket {
  count: number;
  amount: number;
  amountSAR: string;
}

export interface ClientAging {
  clientId: string;
  clientName: string;
  email?: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90Plus: number;
  total: number;
  currentSAR: string;
  days1to30SAR: string;
  days31to60SAR: string;
  days61to90SAR: string;
  days90PlusSAR: string;
  totalSAR: string;
}

export interface ARAgingResponse extends BaseResponse {
  report: 'ar-aging';
  asOfDate: Date;
  generatedAt: Date;
  data: {
    summary: {
      current: AgingBucket;
      days1to30: AgingBucket;
      days31to60: AgingBucket;
      days61to90: AgingBucket;
      days90Plus: AgingBucket;
      total: { amount: number; amountSAR: string };
    };
    byClient: ClientAging[];
    details: Record<string, { count: number; amount: number; invoices: any[] }>;
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/trial-balance
// ═══════════════════════════════════════════════════════════════

export interface TrialBalanceQuery {
  asOfDate?: string;
}

export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  debit: number;
  credit: number;
  debitSAR: string;
  creditSAR: string;
}

export interface TrialBalanceResponse extends BaseResponse {
  report: 'trial-balance';
  asOfDate: Date;
  generatedAt: Date;
  data: {
    balances: TrialBalanceEntry[];
    totals: {
      totalDebits: number;
      totalDebitsSAR: string;
      totalCredits: number;
      totalCreditsSAR: string;
      isBalanced: boolean;
      difference: number;
      differenceSAR: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/budget-variance
// ═══════════════════════════════════════════════════════════════

export interface BudgetVarianceQuery {
  fiscalYear: string;
  period: string; // 'year' | 'quarter-1' to 'quarter-4' | 'month-1' to 'month-12'
  departmentId?: string;
}

export interface VarianceEntry {
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  budgetedAmount: number;
  budgetedAmountSAR: string;
  actualAmount: number;
  actualAmountSAR: string;
  variance: number;
  varianceSAR: string;
  variancePercent: string;
  status: 'on-track' | 'over' | 'under';
  favorability: 'favorable' | 'unfavorable';
}

export interface BudgetVarianceResponse extends BaseResponse {
  report: 'budget-variance';
  fiscalYear: number;
  period: string;
  periodDates: { startDate: Date; endDate: Date };
  generatedAt: Date;
  data: {
    income: {
      accounts: VarianceEntry[];
      totalBudgeted: number;
      totalActual: number;
      totalVariance: number;
    };
    expenses: {
      accounts: VarianceEntry[];
      totalBudgeted: number;
      totalActual: number;
      totalVariance: number;
    };
    summary: {
      budgetedNetProfit: number;
      budgetedNetProfitSAR: string;
      actualNetProfit: number;
      actualNetProfitSAR: string;
      netProfitVariance: number;
      netProfitVarianceSAR: string;
      favorability: 'favorable' | 'unfavorable';
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/ap-aging
// ═══════════════════════════════════════════════════════════════

export interface APAgingQuery {
  asOfDate?: string;
  vendorId?: string;
}

export interface VendorAging {
  vendorId: string;
  vendorName: string;
  vendorNameAr?: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90Plus: number;
  total: number;
  currentSAR: string;
  days1to30SAR: string;
  days31to60SAR: string;
  days61to90SAR: string;
  days90PlusSAR: string;
  totalSAR: string;
}

export interface APAgingResponse extends BaseResponse {
  report: 'ap-aging';
  asOfDate: Date;
  generatedAt: Date;
  data: {
    summary: {
      current: AgingBucket;
      days1to30: AgingBucket;
      days31to60: AgingBucket;
      days61to90: AgingBucket;
      days90Plus: AgingBucket;
      total: { amount: number; amountSAR: string };
    };
    byVendor: VendorAging[];
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/client-statement
// ═══════════════════════════════════════════════════════════════

export interface ClientStatementQuery {
  clientId: string;
  startDate: string;
  endDate: string;
}

export interface StatementTransaction {
  date: Date;
  type: 'invoice' | 'payment';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  debitSAR: string;
  creditSAR: string;
  balanceSAR: string;
}

export interface ClientStatementResponse extends BaseResponse {
  report: 'client-statement';
  period: { startDate: Date; endDate: Date };
  generatedAt: Date;
  clientInfo: {
    clientId: string;
    name: string;
    email?: string;
  };
  openingBalance: {
    amount: number;
    amountSAR: string;
  };
  transactions: StatementTransaction[];
  closingBalance: {
    amount: number;
    amountSAR: string;
  };
  summary: {
    totalInvoiced: number;
    totalInvoicedSAR: string;
    totalPayments: number;
    totalPaymentsSAR: string;
    netChange: number;
    netChangeSAR: string;
    transactionCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/vendor-ledger
// ═══════════════════════════════════════════════════════════════

export interface VendorLedgerQuery {
  vendorId: string;
  startDate?: string;
  endDate?: string;
}

export interface LedgerTransaction {
  date: Date;
  type: 'bill' | 'payment';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  debitSAR: string;
  creditSAR: string;
  balanceSAR: string;
  dueDate?: Date;
  status?: string;
  paymentMethod?: string;
}

export interface VendorLedgerResponse extends BaseResponse {
  report: 'vendor-ledger';
  vendorId: string;
  period: { startDate: Date; endDate: Date };
  generatedAt: Date;
  vendorInfo: {
    vendorId: string;
    name: string;
    nameAr?: string;
    email?: string;
    paymentTerms?: string;
  };
  ledger: {
    openingBalance: number;
    openingBalanceSAR: string;
    transactions: LedgerTransaction[];
    closingBalance: number;
    closingBalanceSAR: string;
  };
  summary: {
    totalBilled: number;
    totalBilledSAR: string;
    totalPayments: number;
    totalPaymentsSAR: string;
    outstandingBalance: number;
    outstandingBalanceSAR: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/gross-profit
// ═══════════════════════════════════════════════════════════════

export interface GrossProfitQuery {
  startDate: string;
  endDate: string;
  groupBy?: 'client' | 'case' | 'month' | 'service';
  marginThreshold?: number;
}

export interface GrossProfitItem {
  itemId: string;
  itemName: string;
  revenue: number;
  revenueSAR: string;
  directCosts: number;
  directCostsSAR: string;
  grossProfit: number;
  grossProfitSAR: string;
  grossMarginPercent: string;
  grossMarginValue: number;
  invoiceCount: number;
  belowThreshold: boolean;
}

export interface GrossProfitResponse extends BaseResponse {
  report: 'gross-profit';
  period: { startDate: string; endDate: string };
  groupBy: string;
  generatedAt: Date;
  data: {
    items: GrossProfitItem[];
    summary: {
      totalRevenue: number;
      totalRevenueSAR: string;
      totalDirectCosts: number;
      totalDirectCostsSAR: string;
      totalGrossProfit: number;
      totalGrossProfitSAR: string;
      overallGrossMarginPercent: string;
      itemCount: number;
    };
    analysis: {
      targetMargin: string;
      itemsBelowTarget: {
        count: number;
        items: string[];
      };
      topPerformers: GrossProfitItem[];
      bottomPerformers: GrossProfitItem[];
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/cost-center
// ═══════════════════════════════════════════════════════════════

export interface CostCenterQuery {
  startDate: string;
  endDate: string;
  costCenterId?: string;
}

export interface CostCenter {
  costCenterId: string;
  costCenterName: string;
  income: number;
  incomeSAR: string;
  expenses: number;
  expensesSAR: string;
  netProfit: number;
  netProfitSAR: string;
  profitMargin: string;
  transactionCount: number;
}

export interface CostCenterResponse extends BaseResponse {
  report: 'cost-center';
  period: { startDate: string; endDate: string };
  generatedAt: Date;
  data: {
    costCenters: CostCenter[];
    summary: {
      totalCostCenters: number;
      totalIncome: number;
      totalIncomeSAR: string;
      totalExpenses: number;
      totalExpensesSAR: string;
      totalNetProfit: number;
      totalNetProfitSAR: string;
      overallProfitMargin: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// CHART REPORTS
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/reports/cases-chart
// ═══════════════════════════════════════════════════════════════

export interface CasesChartQuery {
  months?: number; // 1-24, default 12
}

export interface CasesChartDataPoint {
  month: string;
  total: number;
  opened: number;
  closed: number;
  pending: number;
}

export interface CasesChartResponse extends BaseResponse {
  report: 'Cases Chart';
  period: {
    months: number;
    startDate: string;
  };
  data: CasesChartDataPoint[];
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/reports/revenue-chart
// ═══════════════════════════════════════════════════════════════

export interface RevenueChartQuery {
  months?: number; // 1-24, default 12
}

export interface RevenueChartDataPoint {
  month: string;
  revenue: number;
  collected: number;
  expenses: number;
  profit: number;
  invoiceCount: number;
  collectionRate: number; // percentage
}

export interface RevenueChartResponse extends BaseResponse {
  report: 'Revenue Chart';
  period: {
    months: number;
    startDate: string;
  };
  data: RevenueChartDataPoint[];
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/reports/tasks-chart
// ═══════════════════════════════════════════════════════════════

export interface TasksChartQuery {
  months?: number; // 1-24, default 12
}

export interface TasksChartDataPoint {
  month: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number; // percentage
}

export interface TasksChartResponse extends BaseResponse {
  report: 'Tasks Chart';
  period: {
    months: number;
    startDate: string;
  };
  data: TasksChartDataPoint[];
}

// ═══════════════════════════════════════════════════════════════
// ENDPOINT SUMMARY
// ═══════════════════════════════════════════════════════════════

export const REPORT_ENDPOINTS = {
  // Report Builder CRUD
  LIST: 'GET /api/reports',
  CREATE: 'POST /api/reports',
  GET: 'GET /api/reports/:id',
  UPDATE: 'PUT /api/reports/:id',
  DELETE: 'DELETE /api/reports/:id',

  // Report Execution
  EXECUTE: 'GET /api/reports/:id/execute',
  EXPORT: 'GET /api/reports/:id/export/:format',

  // Report Operations
  CLONE: 'POST /api/reports/:id/clone',
  SCHEDULE: 'PUT /api/reports/:id/schedule',
  VALIDATE: 'POST /api/reports/validate',

  // Accounting Reports
  PROFIT_LOSS: 'GET /api/reports/profit-loss',
  BALANCE_SHEET: 'GET /api/reports/balance-sheet',
  CASE_PROFITABILITY: 'GET /api/reports/case-profitability',
  AR_AGING: 'GET /api/reports/ar-aging',
  TRIAL_BALANCE: 'GET /api/reports/trial-balance',
  BUDGET_VARIANCE: 'GET /api/reports/budget-variance',
  AP_AGING: 'GET /api/reports/ap-aging',
  CLIENT_STATEMENT: 'GET /api/reports/client-statement',
  VENDOR_LEDGER: 'GET /api/reports/vendor-ledger',
  GROSS_PROFIT: 'GET /api/reports/gross-profit',
  COST_CENTER: 'GET /api/reports/cost-center',

  // Chart Reports
  CASES_CHART: 'GET /api/v1/reports/cases-chart',
  REVENUE_CHART: 'GET /api/v1/reports/revenue-chart',
  TASKS_CHART: 'GET /api/v1/reports/tasks-chart',
} as const;

// Total endpoints: 25
