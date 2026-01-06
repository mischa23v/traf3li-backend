/**
 * System Modules API Contracts
 *
 * System/Admin modules: admin-api, admin-tools, approval, webhook, queue, health,
 * metrics, support, analytics, plugin, command-palette, keyboard-shortcut,
 * sandbox, walkthrough, setup-wizard, mfa, webauthn, saml, ldap, sso-config,
 * audit, audit-log, security-incident, data-export, automation
 *
 * Total: ~300 endpoints
 * @module SystemModules
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API MODULE (22 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace AdminAPI {
  export interface DashboardSummary {
    totalFirms: number;
    activeFirms: number;
    totalUsers: number;
    activeUsers: number;
    revenue: { current: number; previous: number; change: number };
    newSignups: { today: number; week: number; month: number };
  }

  export interface RevenueData {
    period: string;
    amount: number;
    subscriptions: number;
  }

  export interface ActiveUserStats {
    daily: { date: string; count: number }[];
    weekly: { week: string; count: number }[];
    monthly: { month: string; count: number }[];
  }

  export interface FirmAdmin {
    _id: string;
    name: string;
    email: string;
    plan: string;
    status: 'active' | 'suspended' | 'cancelled';
    userCount: number;
    createdAt: string;
    lastActivity: string;
  }

  export interface UserAdmin {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    firmId?: string;
    role: string;
    status: 'active' | 'inactive' | 'suspended';
    lastLoginAt?: string;
    createdAt: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (22)
  /** GET /api/admin-api/dashboard/summary */
  /** GET /api/admin-api/dashboard/revenue */
  /** GET /api/admin-api/dashboard/active-users */
  /** GET /api/admin-api/dashboard/growth */
  /** GET /api/admin-api/firms */
  /** GET /api/admin-api/firms/:id */
  /** PATCH /api/admin-api/firms/:id/status */
  /** POST /api/admin-api/firms/:id/suspend */
  /** POST /api/admin-api/firms/:id/activate */
  /** DELETE /api/admin-api/firms/:id */
  /** GET /api/admin-api/users */
  /** GET /api/admin-api/users/:id */
  /** PATCH /api/admin-api/users/:id/status */
  /** POST /api/admin-api/users/:id/impersonate */
  /** DELETE /api/admin-api/users/:id */
  /** GET /api/admin-api/subscriptions */
  /** GET /api/admin-api/audit-logs */
  /** GET /api/admin-api/system-health */
  /** GET /api/admin-api/feature-flags */
  /** PUT /api/admin-api/feature-flags */
  /** GET /api/admin-api/config */
  /** PUT /api/admin-api/config */
}


// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN TOOLS MODULE (30 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace AdminTools {
  export interface UserDataExport {
    user: UserAdmin;
    cases: unknown[];
    tasks: unknown[];
    documents: unknown[];
    activities: unknown[];
  }

  export interface FirmDataExport {
    firm: unknown;
    members: unknown[];
    cases: unknown[];
    clients: unknown[];
    invoices: unknown[];
    documents: unknown[];
  }

  export interface MaintenanceStatus {
    isEnabled: boolean;
    message?: string;
    scheduledEnd?: string;
    allowedIPs?: string[];
  }

  export interface CacheStats {
    size: number;
    keys: number;
    hitRate: number;
    lastCleared: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (30)
  /** GET /api/admin-tools/users/:id/data */
  /** DELETE /api/admin-tools/users/:id/data */
  /** GET /api/admin-tools/firms/:id/export */
  /** POST /api/admin-tools/firms/:id/import */
  /** POST /api/admin-tools/maintenance/enable */
  /** POST /api/admin-tools/maintenance/disable */
  /** GET /api/admin-tools/maintenance/status */
  /** POST /api/admin-tools/cache/clear */
  /** GET /api/admin-tools/cache/stats */
  /** POST /api/admin-tools/cache/warm */
  /** GET /api/admin-tools/jobs */
  /** GET /api/admin-tools/jobs/:id */
  /** POST /api/admin-tools/jobs/:id/retry */
  /** DELETE /api/admin-tools/jobs/:id */
  /** GET /api/admin-tools/logs */
  /** GET /api/admin-tools/logs/errors */
  /** DELETE /api/admin-tools/logs/clear */
  /** POST /api/admin-tools/migrations/run */
  /** GET /api/admin-tools/migrations/status */
  /** POST /api/admin-tools/migrations/rollback */
  /** GET /api/admin-tools/database/stats */
  /** POST /api/admin-tools/database/backup */
  /** GET /api/admin-tools/database/backups */
  /** POST /api/admin-tools/database/restore */
  /** POST /api/admin-tools/notifications/broadcast */
  /** GET /api/admin-tools/api-keys */
  /** POST /api/admin-tools/api-keys */
  /** DELETE /api/admin-tools/api-keys/:id */
  /** POST /api/admin-tools/api-keys/:id/rotate */
  /** GET /api/admin-tools/system/diagnostics */
}


// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL MODULE (19 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Approval {
  export type ApprovalEntityType = 'invoice' | 'expense' | 'leave' | 'document' | 'payment';
  export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

  export interface ApprovalRule {
    _id: string;
    entityType: ApprovalEntityType;
    name: string;
    conditions: ApprovalCondition[];
    approvers: ApproverConfig[];
    escalationRules?: EscalationRule[];
    isActive: boolean;
    firmId?: string;
    createdAt: string;
  }

  export interface ApprovalCondition {
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'in';
    value: unknown;
  }

  export interface ApproverConfig {
    type: 'user' | 'role' | 'manager';
    value: string;
    order: number;
    required: boolean;
  }

  export interface EscalationRule {
    afterHours: number;
    escalateTo: string;
  }

  export interface ApprovalRequest {
    _id: string;
    entityType: ApprovalEntityType;
    entityId: string;
    requesterId: string;
    status: ApprovalStatus;
    currentApprover: string;
    approvalChain: ApprovalStep[];
    comments?: string;
    submittedAt: string;
    completedAt?: string;
    firmId?: string;
  }

  export interface ApprovalStep {
    approverId: string;
    status: ApprovalStatus;
    comments?: string;
    actionAt?: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (19)
  /** GET /api/approval/rules */
  /** PUT /api/approval/rules */
  /** POST /api/approval/rules */
  /** GET /api/approval/rules/:id */
  /** PUT /api/approval/rules/:id */
  /** DELETE /api/approval/rules/:id */
  /** GET /api/approval/pending */
  /** GET /api/approval/history */
  /** GET /api/approval/my-requests */
  /** GET /api/approval/stats */
  /** GET /api/approval/:id */
  /** POST /api/approval/:id/approve */
  /** POST /api/approval/:id/reject */
  /** POST /api/approval/:id/cancel */
  /** POST /api/approval/:id/delegate */
  /** POST /api/approval/:id/escalate */
  /** POST /api/approval/:id/comment */
  /** GET /api/approval/entity/:type/:id */
  /** POST /api/approval/submit */
}


// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK MODULE (16 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Webhook {
  export type WebhookEvent = 'case.created' | 'case.updated' | 'client.created' | 'invoice.paid' | 'task.completed';
  export type WebhookStatus = 'active' | 'inactive' | 'failed';

  export interface WebhookConfig {
    _id: string;
    name: string;
    url: string;
    events: WebhookEvent[];
    secret: string;
    status: WebhookStatus;
    headers?: Record<string, string>;
    retryPolicy: { maxRetries: number; backoffMs: number };
    failureCount: number;
    lastTriggeredAt?: string;
    lastSuccessAt?: string;
    lastFailureAt?: string;
    firmId?: string;
    createdAt: string;
  }

  export interface WebhookDelivery {
    _id: string;
    webhookId: string;
    event: WebhookEvent;
    payload: unknown;
    statusCode?: number;
    responseBody?: string;
    duration?: number;
    attempts: number;
    success: boolean;
    error?: string;
    createdAt: string;
  }

  export interface WebhookStats {
    totalWebhooks: number;
    activeWebhooks: number;
    deliveriesTotal: number;
    successRate: number;
    avgResponseTime: number;
    eventCounts: Record<WebhookEvent, number>;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (16)
  /** GET /api/webhook/stats */
  /** GET /api/webhook/events */
  /** POST /api/webhook */
  /** GET /api/webhook */
  /** GET /api/webhook/:id */
  /** PUT /api/webhook/:id */
  /** DELETE /api/webhook/:id */
  /** POST /api/webhook/:id/test */
  /** POST /api/webhook/:id/toggle */
  /** GET /api/webhook/:id/deliveries */
  /** GET /api/webhook/:id/deliveries/:deliveryId */
  /** POST /api/webhook/:id/deliveries/:deliveryId/retry */
  /** GET /api/webhook/recent-deliveries */
  /** POST /api/webhook/verify-signature */
  /** GET /api/webhook/sample-payloads/:event */
  /** POST /api/webhook/bulk-delete */
}


// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE MODULE (13 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Queue {
  export type QueueName = 'email' | 'notification' | 'export' | 'import' | 'report' | 'sync';
  export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

  export interface QueueInfo {
    name: QueueName;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }

  export interface JobInfo {
    id: string;
    name: string;
    data: unknown;
    status: JobStatus;
    progress: number;
    attempts: number;
    maxAttempts: number;
    error?: string;
    processedOn?: string;
    finishedOn?: string;
    createdAt: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (13)
  /** GET /api/queue */
  /** GET /api/queue/:name */
  /** GET /api/queue/:name/jobs */
  /** GET /api/queue/:name/jobs/:id */
  /** DELETE /api/queue/:name/jobs/:id */
  /** POST /api/queue/:name/jobs/:id/retry */
  /** POST /api/queue/:name/pause */
  /** POST /api/queue/:name/resume */
  /** POST /api/queue/:name/clean */
  /** GET /api/queue/:name/stats */
  /** POST /api/queue/add */
  /** GET /api/queue/health */
  /** POST /api/queue/drain-all */
}


// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH MODULE (9 endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Health {
  export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
  }

  export interface ComponentHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    message?: string;
    lastCheck: string;
  }

  export interface ApiResponse<T> { success: boolean; data?: T; message?: string; }

  // API ENDPOINTS (9)
  /** GET /api/health */
  /** GET /api/health/live */
  /** GET /api/health/ready */
  /** GET /api/health/components */
  /** GET /api/health/components/:id */
  /** GET /api/health/database */
  /** GET /api/health/redis */
  /** GET /api/health/external */
  /** GET /api/health/detailed */
}


// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL SYSTEM MODULES (Condensed)
// ═══════════════════════════════════════════════════════════════════════════════

export namespace Analytics {
  export interface AnalyticsEvent {
    _id: string;
    eventType: string;
    userId?: string;
    sessionId?: string;
    properties: Record<string, unknown>;
    timestamp: string;
  }

  export interface AppDashboardData {
    activeUsers: number;
    pageViews: number;
    sessions: number;
    avgSessionDuration: number;
    topPages: { path: string; views: number }[];
    usersByCountry: { country: string; count: number }[];
  }
  // 26 endpoints: events, counts, dashboard, funnels, cohorts, etc.
}

export namespace AnalyticsReport {
  export interface ReportConfig {
    _id: string;
    name: string;
    type: 'dashboard' | 'table' | 'chart' | 'pivot';
    metrics: string[];
    dimensions: string[];
    filters: unknown[];
    dateRange: { start: string; end: string };
    schedule?: { frequency: string; recipients: string[] };
    isPinned: boolean;
    isFavorite: boolean;
    userId: string;
    firmId?: string;
  }
  // 20 endpoints: stats, favorites, pinned, CRUD, schedule, export
}

export namespace Plugin {
  export interface PluginRecord {
    _id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    category: string;
    status: 'installed' | 'active' | 'inactive' | 'error';
    config?: Record<string, unknown>;
    permissions: string[];
    hooks: string[];
    installedAt: string;
    firmId?: string;
  }
  // 16 endpoints: search, all, loader/stats, CRUD, toggle, configure
}

export namespace Support {
  export interface SupportTicket {
    _id: string;
    ticketNumber: string;
    subject: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
    userId: string;
    assignedTo?: string;
    messages: SupportMessage[];
    firmId?: string;
    createdAt: string;
    resolvedAt?: string;
  }

  export interface SupportMessage {
    _id: string;
    content: string;
    isStaff: boolean;
    author: string;
    attachments?: string[];
    createdAt: string;
  }
  // 16 endpoints: stats, settings, CRUD, messages, assign, resolve
}

export namespace CommandPalette {
  export interface Command {
    id: string;
    name: string;
    description?: string;
    shortcut?: string;
    category: string;
    action: string;
    params?: Record<string, unknown>;
  }

  export interface SearchResult {
    type: 'command' | 'case' | 'client' | 'task' | 'document';
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
    action: string;
  }
  // 9 endpoints: search, commands, recent, favorites, execute
}

export namespace KeyboardShortcut {
  export interface ShortcutConfig {
    action: string;
    keys: string[];
    description: string;
    category: string;
    isCustom: boolean;
    isEnabled: boolean;
  }
  // 9 endpoints: defaults, check-conflict, reset-all, CRUD
}

export namespace Sandbox {
  export interface SandboxEnvironment {
    _id: string;
    name: string;
    templateId?: string;
    status: 'creating' | 'active' | 'expired' | 'deleted';
    expiresAt: string;
    config: Record<string, unknown>;
    createdBy: string;
    createdAt: string;
  }
  // 9 endpoints: templates, stats, CRUD, extend, reset
}

export namespace Walkthrough {
  export interface WalkthroughRecord {
    _id: string;
    name: string;
    description: string;
    steps: WalkthroughStep[];
    targetPage?: string;
    isActive: boolean;
    completedBy: string[];
  }

  export interface WalkthroughStep {
    title: string;
    content: string;
    targetSelector: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    action?: string;
  }
  // 14 endpoints: CRUD, progress, complete, skip, restart
}

export namespace SetupWizard {
  export interface WizardStatus {
    isComplete: boolean;
    currentStep: number;
    completedSteps: string[];
    skippedSteps: string[];
    startedAt: string;
    completedAt?: string;
  }

  export interface WizardSection {
    id: string;
    name: string;
    description: string;
    tasks: WizardTask[];
    order: number;
    isRequired: boolean;
    isComplete: boolean;
  }

  export interface WizardTask {
    id: string;
    name: string;
    description: string;
    action: string;
    isComplete: boolean;
    completedAt?: string;
  }
  // 13 endpoints: status, sections, tasks/complete, skip, reset
}

export namespace MFA {
  export interface MFAConfig {
    userId: string;
    isEnabled: boolean;
    method: 'totp' | 'sms' | 'email';
    backupCodes: string[];
    lastUsedAt?: string;
  }
  // 9 endpoints: setup, verify-setup, verify, disable, backup-codes, etc.
}

export namespace WebAuthn {
  export interface WebAuthnCredential {
    _id: string;
    userId: string;
    name: string;
    credentialId: string;
    publicKey: string;
    signCount: number;
    createdAt: string;
    lastUsedAt?: string;
  }
  // 7 endpoints: register/start, register/finish, authenticate/start, authenticate/finish, credentials, delete
}

export namespace SAML {
  export interface SAMLConfig {
    firmId: string;
    entityId: string;
    ssoUrl: string;
    certificate: string;
    attributeMapping: Record<string, string>;
    isEnabled: boolean;
  }
  // 8 endpoints: metadata, login, acs (assertion consumer), logout, config, test
}

export namespace LDAP {
  export interface LDAPConfig {
    firmId: string;
    serverUrl: string;
    baseDN: string;
    bindDN: string;
    searchFilter: string;
    attributeMapping: Record<string, string>;
    isEnabled: boolean;
  }
  // 6 endpoints: config, test, sync, users, groups
}

export namespace SSOConfig {
  export interface SSOSettings {
    firmId: string;
    provider: 'saml' | 'oidc' | 'ldap';
    config: Record<string, unknown>;
    isEnabled: boolean;
    enforced: boolean;
    allowedDomains: string[];
  }
  // 5 endpoints: get, update, test, enable, disable
}

export namespace AuditLog {
  export interface AuditLogEntry {
    _id: string;
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    userEmail: string;
    changes?: { field: string; oldValue: unknown; newValue: unknown }[];
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
    firmId?: string;
  }
  // 33 endpoints: list, entity/:type/:id, user/:id, export, stats, etc.
}

export namespace SecurityIncident {
  export interface Incident {
    _id: string;
    type: 'unauthorized_access' | 'data_breach' | 'malware' | 'phishing' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'reported' | 'investigating' | 'contained' | 'resolved' | 'closed';
    description: string;
    affectedSystems?: string[];
    affectedUsers?: string[];
    timeline: IncidentEvent[];
    reportedBy: string;
    assignedTo?: string;
    firmId?: string;
    createdAt: string;
    resolvedAt?: string;
  }

  export interface IncidentEvent {
    timestamp: string;
    action: string;
    description: string;
    actor: string;
  }
  // 8 endpoints: report, list, status update, assign, timeline, resolve
}

export namespace DataExport {
  export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';
  export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

  export interface ExportJob {
    _id: string;
    type: string;
    format: ExportFormat;
    status: ExportStatus;
    filters?: Record<string, unknown>;
    fileUrl?: string;
    fileSize?: number;
    expiresAt?: string;
    error?: string;
    userId: string;
    firmId?: string;
    createdAt: string;
    completedAt?: string;
  }
  // 18 endpoints: export, jobs, download, templates, schedule
}

export namespace Automation {
  export type TriggerType = 'event' | 'schedule' | 'condition';
  export type ActionType = 'email' | 'notification' | 'webhook' | 'task' | 'update';

  export interface AutomationRule {
    _id: string;
    name: string;
    description?: string;
    trigger: { type: TriggerType; config: Record<string, unknown> };
    conditions?: { field: string; operator: string; value: unknown }[];
    actions: { type: ActionType; config: Record<string, unknown> }[];
    isActive: boolean;
    lastTriggeredAt?: string;
    triggerCount: number;
    firmId?: string;
    createdBy: string;
    createdAt: string;
  }
  // 10 endpoints: CRUD, toggle, test, logs, stats
}

export namespace Metrics {
  export interface SystemMetrics {
    cpu: number;
    memory: { used: number; total: number };
    disk: { used: number; total: number };
    requests: { total: number; perSecond: number };
    responseTime: { avg: number; p95: number; p99: number };
  }
  // 4 endpoints: metrics, json, performance, custom
}

export namespace APIKey {
  export interface APIKeyRecord {
    _id: string;
    name: string;
    key: string;
    prefix: string;
    scopes: string[];
    rateLimit: number;
    expiresAt?: string;
    lastUsedAt?: string;
    usageCount: number;
    isActive: boolean;
    firmId?: string;
    createdBy: string;
    createdAt: string;
  }
  // 7 endpoints: CRUD, stats, rotate, revoke
}


/**
 * SYSTEM MODULES API CONTRACTS SUMMARY
 *
 * Total Modules: 26
 * Total Endpoints: ~300
 *
 * Breakdown:
 * - AuditLog: 33 endpoints
 * - AdminTools: 30 endpoints
 * - Analytics: 26 endpoints
 * - AdminAPI: 22 endpoints
 * - AnalyticsReport: 20 endpoints
 * - Approval: 19 endpoints
 * - DataExport: 18 endpoints
 * - Webhook: 16 endpoints
 * - Plugin: 16 endpoints
 * - Support: 16 endpoints
 * - Walkthrough: 14 endpoints
 * - Queue: 13 endpoints
 * - SetupWizard: 13 endpoints
 * - Automation: 10 endpoints
 * - CommandPalette: 9 endpoints
 * - KeyboardShortcut: 9 endpoints
 * - Sandbox: 9 endpoints
 * - Health: 9 endpoints
 * - MFA: 9 endpoints
 * - SAML: 8 endpoints
 * - SecurityIncident: 8 endpoints
 * - WebAuthn: 7 endpoints
 * - APIKey: 7 endpoints
 * - LDAP: 6 endpoints
 * - SSOConfig: 5 endpoints
 * - Metrics: 4 endpoints
 */
