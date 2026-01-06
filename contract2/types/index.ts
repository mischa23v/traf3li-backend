/**
 * API Type Definitions - Main Index
 *
 * This file exports all TypeScript type definitions for the traf3li-backend API.
 * Generated from route and controller files.
 *
 * Total Contract Files: 30
 * Total Modules: 247
 * Total Endpoints: 3,900+
 */

// ═══════════════════════════════════════════════════════════════
// CORE MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

export * from './core';          // Auth, User, Firm, Case, Task, Client, Document (228 endpoints)
export * from './finance';       // Invoice, Expense, Payment, Retainer, Billing (98 endpoints)
export * from './crm';           // Lead, Contact, Organization, Pipeline, Activity (78 endpoints)
export * from './hr';            // HR, Payroll, Attendance, Leave, Performance (78 endpoints)
export * from './integrations';  // Calendar, Google, Microsoft, WhatsApp, Slack (128 endpoints)
export * from './security';      // OAuth, MFA, WebAuthn, SAML, SSO, LDAP (61 endpoints)
export * from './accounting';    // Account, Journal, Bank, Reconciliation (64 endpoints)
export * from './operations';    // Vendor, Bill, Inventory, Asset (60 endpoints)

// ═══════════════════════════════════════════════════════════════
// EXTENDED MODULE EXPORTS (Original)
// ═══════════════════════════════════════════════════════════════

export * from './admin-system';       // Admin API, AI Chat, ML Scoring, Plugins (187 endpoints)
export * from './crm-extended';       // Sales, Pipeline, Forecast, Territory (228 endpoints)
export * from './finance-hr-extended'; // Corporate Cards, Dunning, Loans, Grievance (265 endpoints)
export * from './legal-docs-comm';    // Legal Contracts, Documents, Email Marketing (232 endpoints)
export * from './regional-misc';      // Saudi Banking, Temporal, KYC, ZATCA (424 endpoints)

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

export * from './dashboard';     // Dashboard stats and analytics (12 endpoints)
export * from './workflow';      // Workflow templates and instances (13 endpoints)
export * from './tag';           // Tag management (9 endpoints)
export * from './reminder';      // Reminders including location-based (24 endpoints)
export * from './report';        // Reports and analytics (25 endpoints)
export * from './misc';          // Support, Audit, Approval, Health, Webhook (82 endpoints)

// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE MODULE EXPORTS (NEW - Full Coverage)
// ═══════════════════════════════════════════════════════════════

export * from './core-extended';       // Task, Case, Firm, Client, Document, User, Team, Staff, Permission, Notification (308 endpoints)
export * from './hr-full';             // Recruitment, Training, Attendance, Performance, Leave, Payroll, etc. (365 endpoints)
export * from './finance-full';        // Invoice, Expense, ExpenseClaim, Billing, Payment, Quote, etc. (230 endpoints)
export * from './crm-full';            // Lead, LeadScoring, Contact, Followup, Activity, Campaign, etc. (195 endpoints)
export * from './integrations-extended'; // Event, Appointment, WhatsApp, Gmail, DocuSign, Zoom, Slack, etc. (264 endpoints)
export * from './system-modules';      // AdminAPI, AdminTools, Approval, Webhook, Queue, Health, Analytics, etc. (300 endpoints)
export * from './misc-modules';        // Sales, Inventory, Manufacturing, Quality, Product, Reminder, Status, Assets (260 endpoints)
export * from './verification-ai';     // Verify, Biometric, ML-Scoring, AI-Matching, AI-Chat, AI-Settings, etc. (164 endpoints)
export * from './financial-misc';      // BillingRate, JournalEntry, Account, Statement, AR-Aging, Currency, etc. (91 endpoints)
export * from './marketplace-modules'; // Job, Proposal, Order, Gig, Review, Score, Apps, Plan, CustomField, etc. (110 endpoints)

// ═══════════════════════════════════════════════════════════════
// MODULE SUMMARY
// ═══════════════════════════════════════════════════════════════

export const API_MODULES = {
  // Core Modules
  CORE: {
    name: 'Core',
    modules: ['Auth', 'User', 'Firm', 'Case', 'Task', 'Client', 'Document', 'Notification', 'Permission', 'Team', 'Invitation', 'Staff'],
    endpointCount: 228,
    description: 'Core business entities and authentication',
  },
  CORE_EXTENDED: {
    name: 'Core Extended',
    modules: ['Task', 'Case', 'Firm', 'Client', 'Document', 'User', 'Team', 'Staff', 'Permission', 'Notification'],
    endpointCount: 308,
    description: 'Comprehensive core module contracts with full endpoint coverage',
  },
  FINANCE: {
    name: 'Finance',
    modules: ['Invoice', 'Expense', 'ExpenseClaim', 'Payment', 'Retainer', 'TimeTracking', 'Billing', 'BillingRate'],
    endpointCount: 98,
    description: 'Financial management and billing',
  },
  FINANCE_FULL: {
    name: 'Finance Full',
    modules: ['Invoice', 'ExpenseClaim', 'Report', 'Payment', 'Bill', 'Expense', 'Billing', 'Quote', 'FiscalPeriod', 'GeneralLedger', 'CreditNote', 'Transaction', 'BankAccount', 'Retainer'],
    endpointCount: 230,
    description: 'Comprehensive finance module contracts',
  },
  FINANCIAL_MISC: {
    name: 'Financial Miscellaneous',
    modules: ['BillingRate', 'JournalEntry', 'Account', 'Statement', 'ARaging', 'BankTransaction', 'BankTransfer', 'BillPayment', 'ConsolidatedReports', 'PaymentTerms', 'Currency', 'Vendor', 'Refund'],
    endpointCount: 91,
    description: 'Additional financial modules',
  },
  CRM: {
    name: 'CRM',
    modules: ['Lead', 'Contact', 'Organization', 'Pipeline', 'Activity', 'LeadScoring', 'LeadSource', 'Followup', 'Competitor'],
    endpointCount: 78,
    description: 'Customer relationship management',
  },
  CRM_FULL: {
    name: 'CRM Full',
    modules: ['Lead', 'LeadScoring', 'Activity', 'Contact', 'Followup', 'CRMActivity', 'LostReason', 'Competitor', 'Organization', 'Campaign', 'Referral', 'Cycle', 'View', 'LeadConversion', 'LeadSource'],
    endpointCount: 195,
    description: 'Comprehensive CRM module contracts',
  },
  HR: {
    name: 'HR',
    modules: ['HR', 'Payroll', 'PayrollRun', 'Attendance', 'LeaveManagement', 'PerformanceReview', 'Training', 'Recruitment', 'Onboarding'],
    endpointCount: 78,
    description: 'Human resources management',
  },
  HR_FULL: {
    name: 'HR Full',
    modules: ['Recruitment', 'Training', 'Attendance', 'PerformanceReview', 'SuccessionPlan', 'LeaveManagement', 'JobPosition', 'Onboarding', 'Offboarding', 'Shift', 'Payroll', 'PayrollRun', 'LeaveRequest'],
    endpointCount: 365,
    description: 'Comprehensive HR module contracts',
  },
  INTEGRATIONS: {
    name: 'Integrations',
    modules: ['Calendar', 'GoogleCalendar', 'MicrosoftCalendar', 'Appointment', 'Event', 'WhatsApp', 'Slack', 'Telegram', 'Discord', 'Gmail', 'Zoom', 'DocuSign'],
    endpointCount: 128,
    description: 'Third-party integrations',
  },
  INTEGRATIONS_EXTENDED: {
    name: 'Integrations Extended',
    modules: ['Event', 'Appointment', 'WhatsApp', 'Gmail', 'DocuSign', 'Zoom', 'Slack', 'Discord', 'Telegram', 'GitHub', 'Trello', 'OAuth'],
    endpointCount: 264,
    description: 'Comprehensive integration module contracts',
  },
  SECURITY: {
    name: 'Security',
    modules: ['OAuth', 'MFA', 'WebAuthn', 'SAML', 'SSO', 'LDAP', 'SecurityIncident', 'ApiKey', 'Captcha', 'Biometric'],
    endpointCount: 61,
    description: 'Security and authentication',
  },
  SYSTEM_MODULES: {
    name: 'System Modules',
    modules: ['AdminAPI', 'AdminTools', 'Approval', 'Webhook', 'Queue', 'Health', 'Analytics', 'AnalyticsReport', 'Plugin', 'Support', 'CommandPalette', 'KeyboardShortcut', 'Sandbox', 'Walkthrough', 'SetupWizard', 'MFA', 'WebAuthn', 'SAML', 'LDAP', 'SSOConfig', 'AuditLog', 'SecurityIncident', 'DataExport', 'Automation', 'Metrics', 'APIKey'],
    endpointCount: 300,
    description: 'System administration and management modules',
  },
  VERIFICATION_AI: {
    name: 'Verification & AI',
    modules: ['Verify', 'Biometric', 'MLScoring', 'AIMatching', 'AIChat', 'AISettings', 'ConflictCheck', 'HRExtended', 'NotificationPreference'],
    endpointCount: 164,
    description: 'Verification services and AI features',
  },
  MISC_MODULES: {
    name: 'Miscellaneous Modules',
    modules: ['Sales', 'Inventory', 'Manufacturing', 'Quality', 'Product', 'Reminder', 'Status', 'Assets'],
    endpointCount: 260,
    description: 'Sales, inventory, manufacturing, and operations',
  },
  MARKETPLACE: {
    name: 'Marketplace',
    modules: ['Job', 'Proposal', 'Order', 'Gig', 'Review', 'Score', 'Apps', 'Question', 'Answer', 'Plan', 'CustomField', 'Invitation', 'Lawyer', 'Timeline', 'Audit', 'Captcha', 'Dispute', 'SLA'],
    endpointCount: 110,
    description: 'Marketplace, jobs, and additional utilities',
  },
  ACCOUNTING: {
    name: 'Accounting',
    modules: ['Account', 'JournalEntry', 'BankAccount', 'BankTransaction', 'BankReconciliation', 'GeneralLedger', 'FiscalPeriod', 'Currency'],
    endpointCount: 64,
    description: 'Accounting and financial reporting',
  },
  OPERATIONS: {
    name: 'Operations',
    modules: ['Vendor', 'Bill', 'BillPayment', 'Order', 'Inventory', 'Product', 'Quality', 'Manufacturing', 'Assets'],
    endpointCount: 60,
    description: 'Operations and supply chain',
  },

  // Extended Modules (Original)
  ADMIN_SYSTEM: {
    name: 'Admin & System',
    modules: ['AdminAPI', 'AdminTools', 'AIChat', 'AIMatching', 'AISettings', 'MLScoring', 'Sandbox', 'SetupWizard', 'Walkthrough', 'CommandPalette', 'KeyboardShortcut', 'Plugins', 'Apps', 'Answers'],
    endpointCount: 187,
    description: 'Admin tools, AI features, and system configuration',
  },
  CRM_EXTENDED: {
    name: 'CRM Extended',
    modules: ['ActivityPlan', 'CRMPipeline', 'CRMReports', 'CRMSettings', 'CRMTransaction', 'ChatterFollower', 'Churn', 'SalesOrder', 'SalesForecast', 'SalesPerson', 'SalesQuota', 'SalesStage', 'SalesTeam', 'PriceLevel', 'DealHealth', 'DealRoom', 'Deduplication', 'Lifecycle', 'Playbook', 'Territory', 'Brokers'],
    endpointCount: 228,
    description: 'Extended CRM, sales management, and forecasting',
  },
  FINANCE_HR_EXTENDED: {
    name: 'Finance & HR Extended',
    modules: ['CorporateCard', 'Dunning', 'ExpensePolicy', 'RecurringInvoice', 'EmployeeLoan', 'TrustAccount', 'InvoiceApproval', 'Payout', 'Grievance', 'OrganizationalUnit', 'RateCard', 'RateGroup', 'EmployeeAdvance', 'EmployeeBenefit', 'CompensationReward', 'PeerReview', 'HRAnalytics', 'IncomeTaxSlab', 'FinanceSetup', 'InvoiceTemplate', 'PaymentReceipt', 'RecurringTransaction'],
    endpointCount: 265,
    description: 'Extended finance and HR management',
  },
  LEGAL_DOCS_COMM: {
    name: 'Legal, Documents & Communication',
    modules: ['LegalContract', 'LegalDocument', 'MatterBudget', 'DocumentAnalysis', 'CloudStorage', 'OfflineSync', 'PDFMe', 'UnifiedData', 'SavedFilter', 'SavedReport', 'PreparedReport', 'EmailMarketing', 'EmailSettings', 'EmailTemplate', 'ThreadMessage', 'ContactList', 'Conversation', 'Message'],
    endpointCount: 232,
    description: 'Legal contracts, document management, and communication',
  },
  REGIONAL_MISC: {
    name: 'Regional & Miscellaneous',
    modules: ['RegionalBanks', 'SaudiBanking', 'TemporalCase', 'TemporalInvoice', 'TemporalOffboarding', 'TemporalOnboarding', 'Investments', 'InvestmentSearch', 'Trades', 'TradingAccounts', 'InterestArea', 'Buying', 'BulkActions', 'Consent', 'Gantt', 'InterCompany', 'KPIAnalytics', 'KYC', 'LockDate', 'SLOMonitoring', 'SmartButton', 'SmartScheduling', 'Subcontracting', 'AssetAssignment', 'FieldHistory', 'NotificationSettings', 'UserSettings', 'OrganizationTemplate', 'AutomatedAction', 'DebitNote', 'ExchangeRateRevaluation', 'Macro', 'GOSI', 'ZATCA', 'CaseNotion'],
    endpointCount: 424,
    description: 'Regional integrations (Saudi), temporal workflows, and miscellaneous',
  },

  // Utility Modules
  DASHBOARD: {
    name: 'Dashboard',
    modules: ['Dashboard'],
    endpointCount: 12,
    description: 'Dashboard statistics and analytics',
  },
  WORKFLOW: {
    name: 'Workflow',
    modules: ['Workflow'],
    endpointCount: 13,
    description: 'Workflow template and instance management',
  },
  TAG: {
    name: 'Tag',
    modules: ['Tag'],
    endpointCount: 9,
    description: 'Tag management and categorization',
  },
  REMINDER: {
    name: 'Reminder',
    modules: ['Reminder', 'LocationReminder'],
    endpointCount: 24,
    description: 'Reminder management including location-based',
  },
  REPORT: {
    name: 'Report',
    modules: ['Report', 'AccountingReport', 'ChartReport'],
    endpointCount: 25,
    description: 'Report builder and analytics',
  },
  MISC: {
    name: 'Misc',
    modules: ['Support', 'AuditLog', 'Approval', 'Health', 'Webhook', 'Analytics', 'Queue', 'Metrics'],
    endpointCount: 82,
    description: 'Miscellaneous utilities and system endpoints',
  },
} as const;

export const TOTAL_ENDPOINTS = Object.values(API_MODULES).reduce(
  (sum, module) => sum + module.endpointCount,
  0
);

// ═══════════════════════════════════════════════════════════════
// COVERAGE STATISTICS
// ═══════════════════════════════════════════════════════════════

export const COVERAGE_STATS = {
  totalContractFiles: 30,
  totalModules: 247,
  totalEndpoints: 3958,  // Based on coverage report
  totalRouteFiles: 256,
  coveragePercentage: 99,
  generatedDate: '2026-01-06',
  newFilesAdded: [
    'core-extended.ts (308 endpoints)',
    'hr-full.ts (365 endpoints)',
    'finance-full.ts (230 endpoints)',
    'crm-full.ts (195 endpoints)',
    'integrations-extended.ts (264 endpoints)',
    'system-modules.ts (300 endpoints)',
    'misc-modules.ts (260 endpoints)',
    'verification-ai.ts (164 endpoints)',
    'financial-misc.ts (91 endpoints)',
    'marketplace-modules.ts (110 endpoints)',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════

/*
import {
  // Core
  User, CreateUserRequest, UpdateUserResponse,
  Case, CreateCaseRequest, CaseListResponse,
  Task, CreateTaskRequest, TaskBulkUpdateRequest,

  // Finance
  Invoice, CreateInvoiceRequest, InvoiceListResponse,
  Payment, RecordPaymentRequest, PaymentResponse,

  // CRM
  Lead, CreateLeadRequest, LeadConversionRequest,
  Contact, Pipeline, Stage,

  // HR
  Employee, PayrollRun, AttendanceRecord, LeaveRequest,

  // Integrations
  CalendarEvent, GoogleCalendarSync, AppointmentSlot,

  // Security
  MfaSetupResponse, WebAuthnCredential, OAuthToken,

  // Accounting
  JournalEntry, BankTransaction, Reconciliation,

  // Operations
  Vendor, Bill, InventoryItem, Asset,

  // Extended - Admin/System
  AdminAPI, AIChat, MLScoring, Plugins,

  // Extended - CRM
  SalesForecast, Territory, DealRoom,

  // Extended - Finance/HR
  CorporateCard, EmployeeLoan, Grievance, TrustAccount,

  // Extended - Legal/Docs
  LegalContract, EmailMarketing, CloudStorage,

  // Extended - Regional
  SaudiBanking, ZATCA, KYC, Gantt,

  // New Comprehensive Modules
  TaskContract, CaseContract, FirmContract, ClientContract,
  RecruitmentContract, TrainingContract, AttendanceContract,
  InvoiceContract, ExpenseClaimContract, PaymentContract,
  LeadContract, LeadScoringContract, ContactContract,
  EventContract, AppointmentContract, WhatsAppContract,
  AdminAPIContract, ApprovalContract, WebhookContract,
  SalesContract, InventoryContract, ManufacturingContract,
  VerifyContract, BiometricContract, MLScoringContract,
  JobContract, ProposalContract, AppsContract,

  // Dashboard
  DashboardSummaryResponse, HeroStatsResponse,

  // Workflow
  WorkflowTemplate, WorkflowInstance,

  // Reports
  ReportDefinition, ProfitLossResponse,

  // Stats
  TOTAL_ENDPOINTS,
  API_MODULES,
  COVERAGE_STATS,
} from './contract2/types';

// Use with React Query
const { data } = useQuery<CaseListResponse>({
  queryKey: caseKeys.list(filters),
  queryFn: () => caseService.list(filters),
});
*/
