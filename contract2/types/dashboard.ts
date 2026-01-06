/**
 * Dashboard API Type Definitions
 * Auto-generated from /home/user/traf3li-backend/src/routes/dashboard.route.js
 * and /home/user/traf3li-backend/src/controllers/dashboard.controller.js
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════

export interface BaseResponse<T = any> {
  error: boolean;
  success?: boolean;
  message?: string;
  data?: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type Period = 'week' | 'month' | 'quarter' | 'year';

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/summary
// ═══════════════════════════════════════════════════════════════

export interface DashboardSummaryResponse extends BaseResponse<DashboardSummaryData> {}

export interface DashboardSummaryData {
  caseStats: CaseStats;
  taskStats: TaskStats;
  reminderStats: ReminderStats;
  todayEvents: TodayEvent[];
  financialSummary: FinancialSummary;
}

export interface CaseStats {
  total: number;
  active: number;
  pending: number;
  closed: number;
}

export interface TaskStats {
  total: number;
  byStatus: {
    todo: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
}

export interface ReminderStats {
  total: number;
  byStatus: {
    pending: number;
    completed: number;
    snoozed: number;
  };
}

export interface TodayEvent {
  _id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  type?: string;
  status?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  pendingAmount: number;
  overdueAmount: number;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/analytics
// ═══════════════════════════════════════════════════════════════

export interface AnalyticsResponse extends BaseResponse<AnalyticsData> {}

export interface AnalyticsData {
  revenue: RevenueAnalytics;
  clients: ClientAnalytics;
  cases: CaseAnalytics;
  invoices: InvoiceAnalytics;
}

export interface RevenueAnalytics {
  total: number;
  monthly: number;
  growth: number; // percentage
}

export interface ClientAnalytics {
  total: number;
  new: number;
  growth: number; // percentage
}

export interface CaseAnalytics {
  total: number;
  open: number;
  closed: number;
  completionRate: number; // percentage
}

export interface InvoiceAnalytics {
  pending: number;
  overdue: number;
  collected: number;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/reports?period=month
// ═══════════════════════════════════════════════════════════════

export interface ReportsQueryParams {
  period?: Period;
}

export interface ReportsResponse extends BaseResponse<ReportsData> {}

export interface ReportsData {
  period: Period;
  casesChart: CasesChartData;
  revenueChart: RevenueChartData;
  tasksChart: TasksChartData;
}

export interface CasesChartData {
  labels: string[];
  data: number[];
  totals: {
    total: number;
  };
}

export interface RevenueChartData {
  labels: string[];
  data: number[];
  totals: {
    total: number;
  };
}

export interface TasksChartData {
  labels: string[];
  data: number[];
  completed: number[];
  totals: {
    total: number;
    completed: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/hero-stats
// ═══════════════════════════════════════════════════════════════

export interface HeroStatsResponse extends BaseResponse<HeroStatsData> {
  stats: HeroStatsData;
}

export interface HeroStatsData {
  cases: {
    total: number;
    active: number;
    closed: number;
  };
  clients: {
    total: number;
    active: number;
    inactive: number;
  };
  invoices: {
    total: number;
    paid: number;
    pending: number;
  };
  orders: {
    total: number;
    completed: number;
    active: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/stats
// ═══════════════════════════════════════════════════════════════

export interface DashboardStatsResponse extends BaseResponse<DashboardStatsData> {
  stats: DashboardStatsData;
}

export interface DashboardStatsData {
  cases: Record<string, number>; // status -> count
  tasks: Record<string, number>; // status -> count
  invoices: Record<string, number>; // status -> count
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/financial-summary
// ═══════════════════════════════════════════════════════════════

export interface FinancialSummaryResponse extends BaseResponse {
  summary: DetailedFinancialSummary;
}

export interface DetailedFinancialSummary {
  revenue: number;
  expenses: number;
  profit: number;
  pendingInvoices: number;
  paidInvoices: number;
  totalPayments: number;
  netIncome: number;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/today-events
// ═══════════════════════════════════════════════════════════════

export interface TodayEventsResponse extends BaseResponse {
  events: TodayEvent[];
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/recent-messages?limit=10
// ═══════════════════════════════════════════════════════════════

export interface RecentMessagesQueryParams {
  limit?: number;
}

export interface RecentMessagesResponse extends BaseResponse {
  messages: Message[];
}

export interface Message {
  _id: string;
  conversationID: string;
  userID: {
    _id: string;
    username: string;
    image?: string;
  };
  text?: string;
  createdAt: Date;
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/activity?days=30
// ═══════════════════════════════════════════════════════════════

export interface ActivityOverviewQueryParams {
  days?: number;
}

export interface ActivityOverviewResponse extends BaseResponse {
  activity: ActivityOverviewData;
}

export interface ActivityOverviewData {
  period: string; // e.g., "Last 30 days"
  newCases: number;
  newClients: number;
  newInvoices: number;
  hoursWorked: number;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/crm-stats
// ═══════════════════════════════════════════════════════════════

export interface CRMStatsResponse extends BaseResponse<CRMStatsData> {
  stats: CRMStatsData;
}

export interface CRMStatsData {
  totalClients: number;
  newClientsThisMonth: number;
  activeLeads: number;
  conversionRate: number; // percentage
  clientsByStatus: Record<string, number>;
  leadsByStatus: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/hr-stats
// ═══════════════════════════════════════════════════════════════

export interface HRStatsResponse extends BaseResponse<HRStatsData> {
  stats: HRStatsData;
}

export interface HRStatsData {
  totalEmployees: number;
  attendanceRate: number; // percentage
  pendingLeaves: number;
  openPositions: number;
  activeEmployees: number;
  presentToday: number;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dashboard/finance-stats
// ═══════════════════════════════════════════════════════════════

export interface FinanceStatsResponse extends BaseResponse<FinanceStatsData> {
  stats: FinanceStatsData;
}

export interface FinanceStatsData {
  totalRevenue: number;
  expenses: number;
  profitMargin: number; // percentage
  pendingInvoices: number;
  pendingInvoicesCount: number;
  paidInvoicesCount: number;
  netProfit: number;
}

// ═══════════════════════════════════════════════════════════════
// ENDPOINT SUMMARY
// ═══════════════════════════════════════════════════════════════

export const DASHBOARD_ENDPOINTS = {
  SUMMARY: 'GET /api/dashboard/summary',
  ANALYTICS: 'GET /api/dashboard/analytics',
  REPORTS: 'GET /api/dashboard/reports',
  HERO_STATS: 'GET /api/dashboard/hero-stats',
  STATS: 'GET /api/dashboard/stats',
  FINANCIAL_SUMMARY: 'GET /api/dashboard/financial-summary',
  TODAY_EVENTS: 'GET /api/dashboard/today-events',
  RECENT_MESSAGES: 'GET /api/dashboard/recent-messages',
  ACTIVITY: 'GET /api/dashboard/activity',
  CRM_STATS: 'GET /api/dashboard/crm-stats',
  HR_STATS: 'GET /api/dashboard/hr-stats',
  FINANCE_STATS: 'GET /api/dashboard/finance-stats',
} as const;

// Total endpoints: 12
