/**
 * API Type Definitions - Main Index
 *
 * This file exports all TypeScript type definitions for the traf3li-backend API.
 * Generated from route and controller files.
 *
 * Total Contract Files: 14
 * Total Modules: 67
 * Total Endpoints: 960+
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
// ADDITIONAL MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

export * from './dashboard';     // Dashboard stats and analytics (12 endpoints)
export * from './workflow';      // Workflow templates and instances (13 endpoints)
export * from './tag';           // Tag management (9 endpoints)
export * from './reminder';      // Reminders including location-based (24 endpoints)
export * from './report';        // Reports and analytics (25 endpoints)
export * from './misc';          // Support, Audit, Approval, Health, Webhook (82 endpoints)

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
  FINANCE: {
    name: 'Finance',
    modules: ['Invoice', 'Expense', 'ExpenseClaim', 'Payment', 'Retainer', 'TimeTracking', 'Billing', 'BillingRate'],
    endpointCount: 98,
    description: 'Financial management and billing',
  },
  CRM: {
    name: 'CRM',
    modules: ['Lead', 'Contact', 'Organization', 'Pipeline', 'Activity', 'LeadScoring', 'LeadSource', 'Followup', 'Competitor'],
    endpointCount: 78,
    description: 'Customer relationship management',
  },
  HR: {
    name: 'HR',
    modules: ['HR', 'Payroll', 'PayrollRun', 'Attendance', 'LeaveManagement', 'PerformanceReview', 'Training', 'Recruitment', 'Onboarding'],
    endpointCount: 78,
    description: 'Human resources management',
  },
  INTEGRATIONS: {
    name: 'Integrations',
    modules: ['Calendar', 'GoogleCalendar', 'MicrosoftCalendar', 'Appointment', 'Event', 'WhatsApp', 'Slack', 'Telegram', 'Discord', 'Gmail', 'Zoom', 'DocuSign'],
    endpointCount: 128,
    description: 'Third-party integrations',
  },
  SECURITY: {
    name: 'Security',
    modules: ['OAuth', 'MFA', 'WebAuthn', 'SAML', 'SSO', 'LDAP', 'SecurityIncident', 'ApiKey', 'Captcha', 'Biometric'],
    endpointCount: 61,
    description: 'Security and authentication',
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
  totalContractFiles: 14,
  totalModules: 67,
  totalEndpoints: TOTAL_ENDPOINTS,
  totalRouteFiles: 234,
  coveragePercentage: 95,
  generatedDate: '2026-01-06',
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
