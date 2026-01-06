/**
 * Admin & System API Type Definitions
 *
 * Comprehensive TypeScript types for all admin, AI, and system-related modules:
 * - Admin API (Dashboard, Users, Audit, Firms)
 * - Admin Tools (Data Management, System Tools, User Management, Security)
 * - AI Chat (Conversations, Messages, Providers)
 * - AI Transaction Matching (ML-based bank transaction matching)
 * - AI Settings (API Keys, Preferences, Feature Management)
 * - ML Lead Scoring (Scoring, Training, Priority Queue, Analytics)
 * - Sandbox (Demo Environments)
 * - Setup Wizard (Onboarding Progress)
 * - Walkthrough (Interactive Guides)
 * - Command Palette (Search & Navigation)
 * - Keyboard Shortcuts (Customization)
 * - Plugins (Extension Management)
 * - Apps (Third-party Integrations)
 * - Answers (Q&A System)
 *
 * Total Endpoints: 187
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES & ENUMS
// ═══════════════════════════════════════════════════════════════

export type ApiResponse<T = any> = {
  success: boolean;
  error?: boolean;
  message?: string;
  messageAr?: string;
  messageEn?: string;
  data?: T;
};

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  DELETED = 'deleted'
}

export enum UserRole {
  ADMIN = 'admin',
  LAWYER = 'lawyer',
  CLIENT = 'client',
  STAFF = 'staff',
  PARTNER = 'partner',
  PARALEGAL = 'paralegal',
  SECRETARY = 'secretary',
  ACCOUNTANT = 'accountant'
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  LOGIN = 'login',
  LOGOUT = 'logout'
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FirmStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled'
}

export enum FirmPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel'
}

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  AZURE = 'azure',
  CUSTOM = 'custom'
}

export enum MLAlgorithm {
  RANDOM_FOREST = 'random_forest',
  GRADIENT_BOOSTING = 'gradient_boosting',
  NEURAL_NETWORK = 'neural_network',
  AUTO = 'auto'
}

export enum ContactType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  MESSAGE = 'message',
  WHATSAPP = 'whatsapp',
  OTHER = 'other'
}

export enum SLAFilter {
  ALL = 'all',
  OVERDUE = 'overdue',
  TODAY = 'today',
  UPCOMING = 'upcoming'
}

export enum TimeGrouping {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

export enum AppCategory {
  COMMUNICATION = 'communication',
  PRODUCTIVITY = 'productivity',
  INTEGRATION = 'integration',
  FINANCE = 'finance',
  LEGAL = 'legal',
  OTHER = 'other'
}

export enum AppStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  PENDING = 'pending'
}

export enum WalkthroughStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}

// ═══════════════════════════════════════════════════════════════
// ADMIN API - DASHBOARD (6 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin-api/dashboard/summary
 * Get dashboard summary with key metrics
 */
export interface GetDashboardSummaryResponse {
  error: boolean;
  data: {
    users: {
      total: number;
      active: number;
      new: number;
      suspended: number;
    };
    firms: {
      total: number;
      active: number;
      trial: number;
      suspended: number;
    };
    cases: {
      total: number;
      open: number;
      closed: number;
      overdue: number;
    };
    revenue: {
      total: number;
      monthly: number;
      growth: number;
    };
  };
}

/**
 * GET /api/admin-api/dashboard/revenue
 * Get revenue metrics and financial analytics
 */
export interface GetRevenueMetricsRequest {
  months?: number; // Default: 12
}

export interface GetRevenueMetricsResponse {
  error: boolean;
  data: {
    monthly: Array<{
      month: string;
      revenue: number;
      invoices: number;
      payments: number;
    }>;
    byPaymentMethod: Array<{
      method: string;
      total: number;
      count: number;
    }>;
    topClients: Array<{
      clientId: string;
      clientName: string;
      totalRevenue: number;
    }>;
  };
}

/**
 * GET /api/admin-api/dashboard/active-users
 * Get active users and activity metrics
 */
export interface GetActiveUsersResponse {
  error: boolean;
  data: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
    byRole: Array<{
      role: UserRole;
      count: number;
    }>;
  };
}

/**
 * GET /api/admin-api/dashboard/system-health
 * Get system health and performance metrics
 */
export interface GetSystemHealthResponse {
  error: boolean;
  data: {
    database: {
      status: 'healthy' | 'degraded' | 'down';
      connections: number;
      responseTime: number;
    };
    server: {
      uptime: number;
      cpu: number;
      memory: number;
    };
    errors: {
      last24Hours: number;
      critical: number;
    };
  };
}

/**
 * GET /api/admin-api/dashboard/pending-approvals
 * Get pending approvals and items requiring attention
 */
export interface GetPendingApprovalsRequest {
  limit?: number; // Default: 20
  skip?: number; // Default: 0
}

export interface GetPendingApprovalsResponse {
  error: boolean;
  data: {
    approvals: any[];
    overdueInvoices: any[];
    unverifiedUsers: any[];
    total: number;
  };
}

/**
 * GET /api/admin-api/dashboard/recent-activity
 * Get recent activity feed
 */
export interface GetRecentActivityRequest {
  limit?: number; // Default: 50
  skip?: number; // Default: 0
}

export interface GetRecentActivityResponse {
  error: boolean;
  data: {
    activities: Array<{
      timestamp: string;
      action: string;
      userId: string;
      userName: string;
      resourceType: string;
      resourceId: string;
      details: any;
    }>;
    total: number;
    stats: {
      totalActions: number;
      uniqueUsers: number;
      topActions: Array<{ action: string; count: number }>;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN API - USERS (7 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin-api/users
 * List users with filtering and pagination
 */
export interface ListUsersRequest {
  limit?: number; // Default: 20
  skip?: number; // Default: 0
  role?: UserRole;
  status?: UserStatus;
  verified?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'lastLogin' | 'firstName' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface ListUsersResponse {
  error: boolean;
  data: {
    users: Array<{
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      verified: boolean;
      createdAt: string;
      lastLogin: string;
    }>;
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * GET /api/admin-api/users/export
 * Export users data
 */
export interface ExportUsersRequest {
  format?: 'csv' | 'json'; // Default: json
}

/**
 * GET /api/admin-api/users/:id
 * Get detailed user information
 */
export interface GetUserDetailsResponse {
  error: boolean;
  data: {
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      role: UserRole;
      status: UserStatus;
      verified: boolean;
      createdAt: string;
      lastLogin: string;
      firmId?: string;
      firmName?: string;
    };
    activity: {
      totalLogins: number;
      lastLogin: string;
      recentActions: any[];
    };
    stats: {
      casesCreated: number;
      tasksCompleted: number;
      documentsUploaded: number;
    };
  };
}

/**
 * PATCH /api/admin-api/users/:id/status
 * Update user status
 */
export interface UpdateUserStatusRequest {
  status: UserStatus;
  reason?: string;
}

export interface UpdateUserStatusResponse {
  error: boolean;
  message: string;
  data: {
    userId: string;
    status: UserStatus;
  };
}

/**
 * POST /api/admin-api/users/:id/revoke-tokens
 * Revoke all user tokens
 */
export interface RevokeUserTokensRequest {
  reason?: 'admin_revoke' | 'security_incident' | 'account_suspended' | 'account_deleted';
  notes?: string;
}

export interface RevokeUserTokensResponse {
  error: boolean;
  message: string;
  data: {
    tokensRevoked: number;
  };
}

/**
 * POST /api/admin-api/users/:id/reset-password
 * Reset user password
 */
export interface ResetUserPasswordRequest {
  newPassword?: string; // Optional - auto-generated if not provided
  sendEmail?: boolean; // Default: true
}

export interface ResetUserPasswordResponse {
  error: boolean;
  message: string;
  data: {
    temporaryPassword?: string;
    emailSent: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN API - AUDIT (5 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin-api/audit/logs
 * Get audit logs with filtering
 */
export interface GetAuditLogsRequest {
  limit?: number; // Default: 100
  skip?: number; // Default: 0
  action?: string;
  resourceType?: string;
  status?: AuditStatus;
  severity?: AuditSeverity;
  userId?: string;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}

export interface GetAuditLogsResponse {
  error: boolean;
  data: {
    logs: Array<{
      _id: string;
      timestamp: string;
      action: string;
      userId: string;
      userName: string;
      resourceType: string;
      resourceId: string;
      status: AuditStatus;
      severity: AuditSeverity;
      ipAddress: string;
      userAgent: string;
      changes: any;
    }>;
    total: number;
  };
}

/**
 * GET /api/admin-api/audit/security-events
 * Get security-specific events
 */
export interface GetSecurityEventsRequest {
  limit?: number; // Default: 50
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}

export interface GetSecurityEventsResponse {
  error: boolean;
  data: {
    events: Array<{
      timestamp: string;
      type: string;
      severity: AuditSeverity;
      userId: string;
      ipAddress: string;
      details: any;
    }>;
    total: number;
  };
}

/**
 * GET /api/admin-api/audit/compliance-report
 * Generate compliance report
 */
export interface GetComplianceReportRequest {
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}

export interface GetComplianceReportResponse {
  error: boolean;
  data: {
    period: {
      start: string;
      end: string;
    };
    metrics: {
      totalActions: number;
      successfulActions: number;
      failedActions: number;
      uniqueUsers: number;
    };
    byAction: Array<{
      action: string;
      count: number;
    }>;
    bySeverity: Array<{
      severity: AuditSeverity;
      count: number;
    }>;
  };
}

/**
 * GET /api/admin-api/audit/export
 * Export audit logs
 */
export interface ExportAuditLogsRequest {
  format?: 'csv' | 'json'; // Default: json
  startDate: string; // Required - ISO 8601
  endDate: string; // Required - ISO 8601
}

/**
 * GET /api/admin-api/audit/login-history
 * Get user login history
 */
export interface GetLoginHistoryRequest {
  limit?: number; // Default: 100
  userId?: string;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}

export interface GetLoginHistoryResponse {
  error: boolean;
  data: {
    logins: Array<{
      timestamp: string;
      userId: string;
      userName: string;
      ipAddress: string;
      userAgent: string;
      success: boolean;
      failureReason?: string;
    }>;
    total: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN API - FIRMS (5 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin-api/firms
 * List all firms with statistics (Super Admin)
 */
export interface ListFirmsRequest {
  limit?: number; // Default: 20
  skip?: number; // Default: 0
  status?: FirmStatus;
  search?: string;
}

export interface ListFirmsResponse {
  error: boolean;
  data: {
    firms: Array<{
      _id: string;
      name: string;
      status: FirmStatus;
      plan: FirmPlan;
      userCount: number;
      casesCount: number;
      createdAt: string;
    }>;
    total: number;
  };
}

/**
 * GET /api/admin-api/firms/:id
 * Get detailed firm information
 */
export interface GetFirmDetailsResponse {
  error: boolean;
  data: {
    firm: {
      _id: string;
      name: string;
      status: FirmStatus;
      plan: FirmPlan;
      createdAt: string;
      updatedAt: string;
    };
    users: any[];
    statistics: {
      totalCases: number;
      activeCases: number;
      totalClients: number;
      totalRevenue: number;
    };
  };
}

/**
 * GET /api/admin-api/firms/:id/usage
 * Get firm usage metrics
 */
export interface GetFirmUsageRequest {
  days?: number; // Default: 30
}

export interface GetFirmUsageResponse {
  error: boolean;
  data: {
    period: {
      days: number;
      start: string;
      end: string;
    };
    usage: {
      apiCalls: number;
      storageUsed: number;
      activeUsers: number;
      documents: number;
    };
    trends: Array<{
      date: string;
      apiCalls: number;
      activeUsers: number;
    }>;
  };
}

/**
 * PATCH /api/admin-api/firms/:id/plan
 * Update firm plan/subscription (Super Admin)
 */
export interface UpdateFirmPlanRequest {
  plan: FirmPlan;
  status?: 'active' | 'cancelled' | 'trial';
  notes?: string;
}

export interface UpdateFirmPlanResponse {
  error: boolean;
  message: string;
  data: {
    firmId: string;
    plan: FirmPlan;
    status: string;
  };
}

/**
 * PATCH /api/admin-api/firms/:id/suspend
 * Suspend or unsuspend a firm (Super Admin)
 */
export interface SuspendFirmRequest {
  suspend: boolean;
  reason?: string;
}

export interface SuspendFirmResponse {
  error: boolean;
  message: string;
  data: {
    firmId: string;
    suspended: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN TOOLS - DATA MANAGEMENT (6 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/tools/users/:id/data
 * Get user data for export/review (GDPR)
 */
export interface GetUserDataRequest {
  format?: 'json' | 'csv'; // Default: json
  includeRelated?: boolean; // Default: true
}

export interface GetUserDataResponse {
  success: boolean;
  data: {
    user: any;
    cases: any[];
    documents: any[];
    activities: any[];
  };
}

/**
 * DELETE /api/admin/tools/users/:id/data
 * Delete user data (GDPR right to erasure)
 */
export interface DeleteUserDataRequest {
  anonymize?: boolean; // Default: true
  cascade?: boolean; // Default: false
}

export interface DeleteUserDataResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    anonymized: boolean;
    recordsDeleted: number;
  };
}

/**
 * GET /api/admin/tools/firms/:id/export
 * Export all firm data
 */
export interface ExportFirmDataRequest {
  format?: 'json' | 'csv'; // Default: json
}

/**
 * POST /api/admin/tools/firms/:id/import
 * Import firm data
 */
export interface ImportFirmDataRequest {
  clients?: any[];
  cases?: any[];
}

export interface ImportFirmDataResponse {
  success: boolean;
  data: {
    imported: {
      clients: number;
      cases: number;
    };
    errors: any[];
  };
}

/**
 * POST /api/admin/tools/users/merge
 * Merge duplicate users
 */
export interface MergeUsersRequest {
  sourceUserId: string; // User to merge from (will be deleted)
  targetUserId: string; // User to merge into (will be kept)
}

export interface MergeUsersResponse {
  success: boolean;
  message: string;
  data: {
    mergedUserId: string;
    recordsMoved: number;
  };
}

/**
 * POST /api/admin/tools/clients/merge
 * Merge duplicate clients
 */
export interface MergeClientsRequest {
  sourceClientId: string;
  targetClientId: string;
}

export interface MergeClientsResponse {
  success: boolean;
  message: string;
  data: {
    mergedClientId: string;
    recordsMoved: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN TOOLS - DATA FIXES (5 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/admin/tools/firms/:id/recalculate-invoices
 * Recalculate invoice totals
 */
export interface RecalculateInvoiceTotalsResponse {
  success: boolean;
  data: {
    invoicesUpdated: number;
    totalDifference: number;
  };
}

/**
 * POST /api/admin/tools/firms/:id/reindex
 * Reindex search data
 */
export interface ReindexSearchDataResponse {
  success: boolean;
  data: {
    recordsReindexed: number;
  };
}

/**
 * POST /api/admin/tools/firms/:id/cleanup-orphaned
 * Cleanup orphaned records
 */
export interface CleanupOrphanedRecordsResponse {
  success: boolean;
  data: {
    recordsDeleted: number;
    types: Array<{
      type: string;
      count: number;
    }>;
  };
}

/**
 * GET /api/admin/tools/firms/:id/validate
 * Validate data integrity
 */
export interface ValidateDataIntegrityResponse {
  success: boolean;
  data: {
    valid: boolean;
    issues: Array<{
      type: string;
      severity: string;
      count: number;
      details: any[];
    }>;
  };
}

/**
 * POST /api/admin/tools/firms/:id/fix-currency
 * Fix currency conversion issues
 */
export interface FixCurrencyConversionsResponse {
  success: boolean;
  data: {
    recordsFixed: number;
    totalAmountAdjusted: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN TOOLS - SYSTEM (6 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/tools/stats
 * Get system-wide statistics
 */
export interface GetSystemStatsResponse {
  success: boolean;
  data: {
    users: {
      total: number;
      active: number;
      inactive: number;
    };
    firms: {
      total: number;
      active: number;
      trial: number;
    };
    storage: {
      used: number;
      available: number;
      documents: number;
    };
    performance: {
      avgResponseTime: number;
      errorRate: number;
    };
  };
}

/**
 * GET /api/admin/tools/activity-report
 * Get user activity report
 */
export interface GetUserActivityReportRequest {
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}

export interface GetUserActivityReportResponse {
  success: boolean;
  data: {
    period: {
      start: string;
      end: string;
    };
    totalUsers: number;
    activeUsers: number;
    topUsers: Array<{
      userId: string;
      userName: string;
      activityCount: number;
    }>;
  };
}

/**
 * GET /api/admin/tools/storage-usage
 * Get storage usage per firm
 */
export interface GetStorageUsageRequest {
  firmId?: string;
}

export interface GetStorageUsageResponse {
  success: boolean;
  data: {
    firms: Array<{
      firmId: string;
      firmName: string;
      storageUsed: number;
      documentCount: number;
    }>;
    total: number;
  };
}

/**
 * POST /api/admin/tools/clear-cache
 * Clear cache by pattern
 */
export interface ClearCacheRequest {
  pattern?: string; // Default: "*" (e.g., "user:*")
}

export interface ClearCacheResponse {
  success: boolean;
  data: {
    keysDeleted: number;
  };
}

/**
 * GET /api/admin/tools/diagnostics
 * Run system diagnostics
 */
export interface RunDiagnosticsResponse {
  success: boolean;
  data: {
    database: {
      connected: boolean;
      responseTime: number;
    };
    redis: {
      connected: boolean;
      responseTime: number;
    };
    storage: {
      accessible: boolean;
      free: number;
    };
    services: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'down';
    }>;
  };
}

/**
 * GET /api/admin/tools/slow-queries
 * Get slow database queries
 */
export interface GetSlowQueriesRequest {
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
}

export interface GetSlowQueriesResponse {
  success: boolean;
  data: {
    queries: Array<{
      query: string;
      duration: number;
      timestamp: string;
      collection: string;
    }>;
    total: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN TOOLS - USER MANAGEMENT (6 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/admin/tools/users/:id/reset-password
 * Reset user password and send email
 */
export interface AdminResetPasswordResponse {
  success: boolean;
  message: string;
  data: {
    emailSent: boolean;
  };
}

/**
 * POST /api/admin/tools/users/:id/impersonate
 * Create impersonation session
 */
export interface ImpersonateUserResponse {
  success: boolean;
  data: {
    sessionId: string;
    token: string;
    expiresAt: string;
  };
}

/**
 * POST /api/admin/tools/impersonation/:sessionId/end
 * End impersonation session
 */
export interface EndImpersonationResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/admin/tools/users/:id/lock
 * Lock user account
 */
export interface LockUserRequest {
  reason?: string; // Default: administrative_action
}

export interface LockUserResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    locked: boolean;
  };
}

/**
 * POST /api/admin/tools/users/:id/unlock
 * Unlock user account
 */
export interface UnlockUserResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    unlocked: boolean;
  };
}

/**
 * GET /api/admin/tools/users/:id/login-history
 * Get login history for user
 */
export interface GetUserLoginHistoryRequest {
  limit?: number; // Default: 50
}

export interface GetUserLoginHistoryResponse {
  success: boolean;
  data: {
    logins: Array<{
      timestamp: string;
      ipAddress: string;
      userAgent: string;
      success: boolean;
      location?: string;
    }>;
    total: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN TOOLS - JWT KEY ROTATION (7 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/tools/key-rotation/status
 * Get current JWT key rotation status
 */
export interface GetKeyRotationStatusResponse {
  success: boolean;
  data: {
    enabled: boolean;
    currentKey: {
      id: string;
      createdAt: string;
      expiresAt: string;
    };
    deprecatedKeys: Array<{
      id: string;
      createdAt: string;
      deprecatedAt: string;
      expiresAt: string;
    }>;
    rotationAge: number; // days
    gracePeriod: number; // days
  };
}

/**
 * GET /api/admin/tools/key-rotation/check
 * Check if key rotation is needed
 */
export interface CheckRotationNeededResponse {
  success: boolean;
  data: {
    rotationNeeded: boolean;
    currentKeyAge: number;
    daysUntilRotation: number;
  };
}

/**
 * POST /api/admin/tools/key-rotation/rotate
 * Manually trigger JWT key rotation
 */
export interface RotateKeysResponse {
  success: boolean;
  message: string;
  data: {
    newKeyId: string;
    previousKeyId: string;
    rotatedAt: string;
  };
}

/**
 * POST /api/admin/tools/key-rotation/auto-rotate
 * Perform automatic rotation if needed
 */
export interface AutoRotateResponse {
  success: boolean;
  data: {
    rotationPerformed: boolean;
    message: string;
  };
}

/**
 * POST /api/admin/tools/key-rotation/generate
 * Generate a new signing key
 */
export interface GenerateNewKeyResponse {
  success: boolean;
  data: {
    keyId: string;
    createdAt: string;
  };
}

/**
 * POST /api/admin/tools/key-rotation/cleanup
 * Cleanup expired signing keys
 */
export interface CleanupExpiredKeysResponse {
  success: boolean;
  data: {
    keysDeleted: number;
  };
}

/**
 * POST /api/admin/tools/key-rotation/initialize
 * Initialize key rotation service
 */
export interface InitializeKeyRotationResponse {
  success: boolean;
  message: string;
  data: {
    keysLoaded: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// AI CHAT (8 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ai-chat/providers
 * Get available AI providers configured for the firm
 */
export interface GetAIChatProvidersResponse {
  success: boolean;
  data: Array<{
    id: string;
    name: string;
    provider: AIProvider;
    model: string;
    capabilities: string[];
    isDefault: boolean;
  }>;
}

/**
 * POST /api/ai-chat
 * Send a message to the AI assistant
 */
export interface SendAIMessageRequest {
  message: string;
  conversationId?: string;
  provider?: string;
}

export interface SendAIMessageResponse {
  success: boolean;
  data: {
    conversationId: string;
    messageId: string;
    response: string;
    provider: string;
    model: string;
    tokensUsed: number;
  };
}

/**
 * POST /api/ai-chat/stream
 * Send a message and receive streaming response via SSE
 */
export interface StreamAIMessageRequest {
  message: string;
  conversationId?: string;
  provider?: string;
}

// Response is Server-Sent Events stream

/**
 * GET /api/ai-chat/conversations
 * Get all conversations for the authenticated user
 */
export interface GetAIConversationsRequest {
  page?: number; // Default: 1
  limit?: number; // Default: 20
}

export interface GetAIConversationsResponse {
  success: boolean;
  data: {
    conversations: Array<{
      _id: string;
      title: string;
      provider: string;
      messageCount: number;
      lastMessage: string;
      lastMessageAt: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * GET /api/ai-chat/conversations/:conversationId
 * Get specific conversation with full message history
 */
export interface GetAIConversationResponse {
  success: boolean;
  data: {
    _id: string;
    title: string;
    provider: string;
    messages: Array<{
      _id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      tokensUsed?: number;
    }>;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * PATCH /api/ai-chat/conversations/:conversationId
 * Update conversation title
 */
export interface UpdateConversationTitleRequest {
  title: string;
}

export interface UpdateConversationTitleResponse {
  success: boolean;
  data: {
    conversationId: string;
    title: string;
  };
}

/**
 * DELETE /api/ai-chat/conversations/:conversationId
 * Delete (archive) a conversation
 */
export interface DeleteAIConversationResponse {
  success: boolean;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// AI MATCHING (12 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/ai-matching/match
 * Find matches for a single transaction
 */
export interface FindMatchesRequest {
  transactionId: string;
  confidenceThreshold?: number; // Default: 0.7
}

export interface FindMatchesResponse {
  success: boolean;
  data: {
    transactionId: string;
    matches: Array<{
      targetId: string;
      targetType: string;
      confidence: number;
      reason: string;
      details: any;
    }>;
  };
}

/**
 * POST /api/ai-matching/batch
 * Batch match multiple transactions
 */
export interface BatchMatchRequest {
  transactionIds: string[];
  confidenceThreshold?: number;
}

export interface BatchMatchResponse {
  success: boolean;
  data: {
    matched: number;
    unmatched: number;
    results: Array<{
      transactionId: string;
      matched: boolean;
      matchId?: string;
      confidence?: number;
    }>;
  };
}

/**
 * POST /api/ai-matching/auto-match
 * Auto-match unmatched transactions
 */
export interface AutoMatchRequest {
  firmId?: string;
  confidenceThreshold?: number;
  limit?: number;
}

export interface AutoMatchResponse {
  success: boolean;
  data: {
    processed: number;
    matched: number;
    unmatched: number;
  };
}

/**
 * POST /api/ai-matching/confirm
 * Confirm a suggested match
 */
export interface ConfirmMatchRequest {
  transactionId: string;
  matchId: string;
}

export interface ConfirmMatchResponse {
  success: boolean;
  message: string;
  data: {
    transactionId: string;
    matchId: string;
    confirmed: boolean;
  };
}

/**
 * POST /api/ai-matching/reject
 * Reject a suggested match
 */
export interface RejectMatchRequest {
  transactionId: string;
  matchId: string;
  reason?: string;
}

export interface RejectMatchResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/ai-matching/unmatch
 * Unmatch a previously matched transaction
 */
export interface UnmatchTransactionRequest {
  transactionId: string;
  reason?: string;
}

export interface UnmatchTransactionResponse {
  success: boolean;
  message: string;
}

/**
 * GET /api/ai-matching/suggestions
 * Get pending match suggestions for review
 */
export interface GetPendingSuggestionsRequest {
  limit?: number;
  skip?: number;
}

export interface GetPendingSuggestionsResponse {
  success: boolean;
  data: {
    suggestions: Array<{
      transactionId: string;
      transaction: any;
      matches: Array<{
        targetId: string;
        confidence: number;
        reason: string;
      }>;
    }>;
    total: number;
  };
}

/**
 * POST /api/ai-matching/suggestions/bulk-confirm
 * Bulk confirm suggestions
 */
export interface BulkConfirmSuggestionsRequest {
  confirmations: Array<{
    transactionId: string;
    matchId: string;
  }>;
}

export interface BulkConfirmSuggestionsResponse {
  success: boolean;
  data: {
    confirmed: number;
    failed: number;
  };
}

/**
 * GET /api/ai-matching/stats
 * Get matching statistics
 */
export interface GetMatchingStatsResponse {
  success: boolean;
  data: {
    total: number;
    matched: number;
    unmatched: number;
    pending: number;
    accuracy: number;
  };
}

/**
 * GET /api/ai-matching/patterns/stats
 * Get pattern statistics
 */
export interface GetPatternStatsResponse {
  success: boolean;
  data: {
    totalPatterns: number;
    activePatterns: number;
    avgConfidence: number;
  };
}

/**
 * GET /api/ai-matching/patterns
 * Get learned patterns
 */
export interface GetPatternsResponse {
  success: boolean;
  data: {
    patterns: Array<{
      pattern: string;
      confidence: number;
      frequency: number;
      lastUsed: string;
    }>;
  };
}

/**
 * POST /api/ai-matching/patterns/cleanup
 * Cleanup old patterns (admin only)
 */
export interface CleanupPatternsRequest {
  olderThan?: number; // days
  minFrequency?: number;
}

export interface CleanupPatternsResponse {
  success: boolean;
  data: {
    patternsDeleted: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// AI SETTINGS (8 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ai-settings
 * Get AI settings (masked keys)
 */
export interface GetAISettingsResponse {
  success: boolean;
  data: {
    providers: Array<{
      provider: AIProvider;
      configured: boolean;
      keyMasked: string;
    }>;
    defaultProvider: AIProvider;
    preferences: {
      temperature: number;
      maxTokens: number;
      topP: number;
    };
  };
}

/**
 * GET /api/ai-settings/features
 * Get feature status
 */
export interface GetAIFeatureStatusResponse {
  success: boolean;
  data: {
    chat: boolean;
    documentAnalysis: boolean;
    contractReview: boolean;
    matching: boolean;
  };
}

/**
 * GET /api/ai-settings/usage
 * Get usage statistics
 */
export interface GetAIUsageStatsResponse {
  success: boolean;
  data: {
    tokensUsed: number;
    requestsCount: number;
    costEstimate: number;
    period: string;
  };
}

/**
 * POST /api/ai-settings/keys
 * Save an API key (validates before saving)
 */
export interface SaveAPIKeyRequest {
  provider: AIProvider;
  apiKey: string;
}

export interface SaveAPIKeyResponse {
  success: boolean;
  message: string;
  data: {
    provider: AIProvider;
    configured: boolean;
  };
}

/**
 * POST /api/ai-settings/validate
 * Validate an API key without saving
 */
export interface ValidateAPIKeyRequest {
  provider: AIProvider;
  apiKey: string;
}

export interface ValidateAPIKeyResponse {
  success: boolean;
  data: {
    valid: boolean;
    provider: AIProvider;
    model?: string;
  };
}

/**
 * DELETE /api/ai-settings/keys/:provider
 * Remove an API key
 */
export interface RemoveAPIKeyResponse {
  success: boolean;
  message: string;
}

/**
 * PATCH /api/ai-settings/preferences
 * Update preferences
 */
export interface UpdateAIPreferencesRequest {
  defaultProvider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface UpdateAIPreferencesResponse {
  success: boolean;
  data: {
    preferences: {
      defaultProvider: AIProvider;
      temperature: number;
      maxTokens: number;
      topP: number;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// ML LEAD SCORING - SCORES (6 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ml/scores
 * Get ML scores for leads
 */
export interface GetMLScoresRequest {
  page?: number; // Default: 1, min: 1
  limit?: number; // Default: 50, min: 1, max: 100
  minScore?: number; // min: 0, max: 100
  maxScore?: number; // min: 0, max: 100
}

export interface GetMLScoresResponse {
  success: boolean;
  data: {
    scores: Array<{
      leadId: string;
      score: number;
      confidence: number;
      factors: Array<{
        factor: string;
        weight: number;
      }>;
      lastCalculated: string;
    }>;
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * GET /api/ml/scores/:leadId
 * Get ML score for specific lead
 */
export interface GetMLScoreResponse {
  success: boolean;
  data: {
    leadId: string;
    score: number;
    confidence: number;
    factors: Array<{
      factor: string;
      value: any;
      weight: number;
      contribution: number;
    }>;
    lastCalculated: string;
  };
}

/**
 * POST /api/ml/scores/:leadId/calculate
 * Calculate/refresh ML score for lead
 */
export interface CalculateMLScoreResponse {
  success: boolean;
  data: {
    leadId: string;
    score: number;
    confidence: number;
    calculatedAt: string;
  };
}

/**
 * POST /api/ml/scores/batch
 * Batch calculate scores
 */
export interface BatchCalculateMLScoresRequest {
  leadIds: string[]; // min: 1, max: 100
}

export interface BatchCalculateMLScoresResponse {
  success: boolean;
  data: {
    processed: number;
    succeeded: number;
    failed: number;
    results: Array<{
      leadId: string;
      score?: number;
      error?: string;
    }>;
  };
}

/**
 * GET /api/ml/scores/:leadId/explanation
 * Get SHAP explanation for ML score
 */
export interface GetMLScoreExplanationResponse {
  success: boolean;
  data: {
    leadId: string;
    score: number;
    shapValues: Array<{
      feature: string;
      value: any;
      contribution: number;
    }>;
    baseValue: number;
  };
}

/**
 * GET /api/ml/scores/:leadId/hybrid
 * Get hybrid ML + rules score
 */
export interface GetHybridMLScoreResponse {
  success: boolean;
  data: {
    leadId: string;
    mlScore: number;
    rulesScore: number;
    hybridScore: number;
    weights: {
      ml: number;
      rules: number;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// ML LEAD SCORING - TRAINING (3 endpoints - Admin Only)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/ml/train
 * Train ML model (Admin only)
 */
export interface TrainMLModelRequest {
  algorithm?: MLAlgorithm; // Default: auto
  testSize?: number; // Default: 0.2, min: 0.1, max: 0.5
  features?: string[];
  hyperparameters?: any;
}

export interface TrainMLModelResponse {
  success: boolean;
  data: {
    modelId: string;
    algorithm: MLAlgorithm;
    trainedAt: string;
    metrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
  };
}

/**
 * GET /api/ml/model/metrics
 * Get model performance metrics (Admin only)
 */
export interface GetMLModelMetricsResponse {
  success: boolean;
  data: {
    modelId: string;
    algorithm: string;
    trainedAt: string;
    metrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
      auc: number;
    };
    features: Array<{
      name: string;
      importance: number;
    }>;
  };
}

/**
 * POST /api/ml/model/export
 * Export training data (Admin only)
 */
export interface ExportMLTrainingDataRequest {
  format?: ExportFormat; // Default: csv
  includeFeatures?: boolean; // Default: true
  includeLabels?: boolean; // Default: true
  dateFrom?: string; // ISO 8601 date
  dateTo?: string; // ISO 8601 date
}

export interface ExportMLTrainingDataResponse {
  success: boolean;
  data: {
    downloadUrl: string;
    recordCount: number;
    format: ExportFormat;
  };
}

// ═══════════════════════════════════════════════════════════════
// ML LEAD SCORING - PRIORITY QUEUE (5 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ml/priority-queue
 * Get prioritized leads for sales rep
 */
export interface GetPriorityQueueRequest {
  limit?: number; // Default: 20, min: 1, max: 100
  filterBy?: SLAFilter; // Default: all
}

export interface GetPriorityQueueResponse {
  success: boolean;
  data: {
    leads: Array<{
      leadId: string;
      leadName: string;
      mlScore: number;
      slaStatus: 'on_time' | 'due_today' | 'overdue';
      slaDeadline: string;
      priority: number;
      lastContactAt?: string;
    }>;
    total: number;
  };
}

/**
 * GET /api/ml/priority-queue/workload
 * Get team workload distribution
 */
export interface GetWorkloadResponse {
  success: boolean;
  data: {
    team: Array<{
      userId: string;
      userName: string;
      assignedLeads: number;
      avgScore: number;
      overdue: number;
    }>;
    totalLeads: number;
    avgWorkload: number;
  };
}

/**
 * POST /api/ml/priority/:leadId/contact
 * Record contact (resets SLA)
 */
export interface RecordContactRequest {
  contactType: ContactType;
  notes?: string; // max: 1000
  duration?: number; // min: 0, max: 1440 (minutes)
}

export interface RecordContactResponse {
  success: boolean;
  data: {
    leadId: string;
    contactRecorded: boolean;
    slaReset: boolean;
    nextContactDue: string;
  };
}

/**
 * PUT /api/ml/priority/:leadId/assign
 * Assign lead to rep
 */
export interface AssignLeadRequest {
  assignedTo: string; // User ID
  notes?: string; // max: 500
}

export interface AssignLeadResponse {
  success: boolean;
  data: {
    leadId: string;
    assignedTo: string;
    assignedAt: string;
  };
}

/**
 * GET /api/ml/sla/metrics
 * Get SLA metrics
 */
export interface GetSLAMetricsResponse {
  success: boolean;
  data: {
    onTime: number;
    overdue: number;
    complianceRate: number;
    avgResponseTime: number;
  };
}

/**
 * GET /api/ml/sla/breaches
 * Get current SLA breaches
 */
export interface GetSLABreachesResponse {
  success: boolean;
  data: {
    breaches: Array<{
      leadId: string;
      leadName: string;
      assignedTo: string;
      deadline: string;
      overdueBy: number; // hours
    }>;
    total: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// ML LEAD SCORING - ANALYTICS (3 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ml/analytics/dashboard
 * Get ML scoring dashboard
 */
export interface GetMLDashboardRequest {
  period?: number; // Default: 30, min: 1, max: 365 (days)
  groupBy?: TimeGrouping; // Default: week
}

export interface GetMLDashboardResponse {
  success: boolean;
  data: {
    period: {
      days: number;
      start: string;
      end: string;
    };
    overview: {
      totalLeads: number;
      avgScore: number;
      conversions: number;
      conversionRate: number;
    };
    trends: Array<{
      date: string;
      avgScore: number;
      conversions: number;
    }>;
  };
}

/**
 * GET /api/ml/analytics/feature-importance
 * Get feature importance
 */
export interface GetFeatureImportanceResponse {
  success: boolean;
  data: {
    features: Array<{
      name: string;
      importance: number;
      rank: number;
    }>;
  };
}

/**
 * GET /api/ml/analytics/score-distribution
 * Get score distribution
 */
export interface GetScoreDistributionResponse {
  success: boolean;
  data: {
    distribution: Array<{
      range: string; // e.g., "0-10", "10-20"
      count: number;
      percentage: number;
    }>;
    stats: {
      mean: number;
      median: number;
      stdDev: number;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// SANDBOX (8 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/sandbox/templates
 * Get available sandbox templates
 */
export interface GetSandboxTemplatesResponse {
  success: boolean;
  data: {
    templates: Array<{
      id: string;
      name: string;
      description: string;
      features: string[];
      sampleData: boolean;
    }>;
  };
}

/**
 * GET /api/sandbox/stats
 * Get sandbox statistics (admin only)
 */
export interface GetSandboxStatsResponse {
  success: boolean;
  data: {
    totalSandboxes: number;
    active: number;
    expired: number;
    avgDuration: number;
  };
}

/**
 * POST /api/sandbox
 * Create new sandbox
 */
export interface CreateSandboxRequest {
  templateId?: string;
  name?: string;
  expirationDays?: number; // Default: 7
}

export interface CreateSandboxResponse {
  success: boolean;
  data: {
    sandboxId: string;
    name: string;
    expiresAt: string;
    apiKey: string;
  };
}

/**
 * GET /api/sandbox
 * Get user's active sandbox
 */
export interface GetSandboxResponse {
  success: boolean;
  data: {
    _id: string;
    name: string;
    status: 'active' | 'expired';
    createdAt: string;
    expiresAt: string;
    apiCallsUsed: number;
    apiCallsLimit: number;
  };
}

/**
 * POST /api/sandbox/:id/reset
 * Reset sandbox to initial state
 */
export interface ResetSandboxResponse {
  success: boolean;
  message: string;
  data: {
    sandboxId: string;
    resetAt: string;
  };
}

/**
 * POST /api/sandbox/:id/extend
 * Extend sandbox expiration
 */
export interface ExtendSandboxRequest {
  days?: number; // Default: 7
}

export interface ExtendSandboxResponse {
  success: boolean;
  data: {
    sandboxId: string;
    newExpirationDate: string;
  };
}

/**
 * POST /api/sandbox/:id/clone
 * Clone sandbox to production firm
 */
export interface CloneSandboxToProductionRequest {
  firmName?: string;
  includeData?: boolean;
}

export interface CloneSandboxToProductionResponse {
  success: boolean;
  data: {
    firmId: string;
    firmName: string;
    recordsCloned: number;
  };
}

/**
 * GET /api/sandbox/:id/check-limit
 * Check API limit
 */
export interface CheckSandboxLimitResponse {
  success: boolean;
  data: {
    used: number;
    limit: number;
    remaining: number;
    limitReached: boolean;
  };
}

/**
 * DELETE /api/sandbox/:id
 * Delete sandbox
 */
export interface DeleteSandboxResponse {
  success: boolean;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// SETUP WIZARD (13 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/setup/status
 * Get full setup status with all sections and tasks
 */
export interface GetSetupStatusResponse {
  success: boolean;
  data: {
    sections: Array<{
      _id: string;
      title: string;
      description: string;
      order: number;
      completed: boolean;
      tasks: Array<{
        _id: string;
        title: string;
        description: string;
        required: boolean;
        completed: boolean;
        skipped: boolean;
      }>;
    }>;
    overallProgress: number;
  };
}

/**
 * GET /api/setup/sections
 * Get all active sections with their tasks
 */
export interface GetSetupSectionsResponse {
  success: boolean;
  data: {
    sections: Array<{
      _id: string;
      title: string;
      description: string;
      icon: string;
      order: number;
      tasks: any[];
    }>;
  };
}

/**
 * POST /api/setup/tasks/:taskId/complete
 * Mark task as complete
 */
export interface CompleteSetupTaskResponse {
  success: boolean;
  message: string;
  data: {
    taskId: string;
    completed: boolean;
    completedAt: string;
  };
}

/**
 * POST /api/setup/tasks/:taskId/skip
 * Mark task as skipped
 */
export interface SkipSetupTaskResponse {
  success: boolean;
  message: string;
  data: {
    taskId: string;
    skipped: boolean;
    skippedAt: string;
  };
}

/**
 * GET /api/setup/next-task
 * Get next incomplete required task
 */
export interface GetNextSetupTaskResponse {
  success: boolean;
  data: {
    task: {
      _id: string;
      title: string;
      description: string;
      sectionTitle: string;
      order: number;
    } | null;
  };
}

/**
 * GET /api/setup/progress-percentage
 * Calculate overall completion percentage
 */
export interface GetSetupProgressPercentageResponse {
  success: boolean;
  data: {
    percentage: number;
    completedTasks: number;
    totalTasks: number;
  };
}

/**
 * POST /api/setup/reset
 * Reset user's setup progress (admin only)
 */
export interface ResetSetupProgressResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/setup/admin/sections
 * Create new section (admin only)
 */
export interface CreateSetupSectionRequest {
  title: string;
  description: string;
  icon?: string;
  order: number;
}

export interface CreateSetupSectionResponse {
  success: boolean;
  data: {
    _id: string;
    title: string;
    order: number;
  };
}

/**
 * PATCH /api/setup/admin/sections/:sectionId
 * Update section (admin only)
 */
export interface UpdateSetupSectionRequest {
  title?: string;
  description?: string;
  icon?: string;
  order?: number;
  active?: boolean;
}

export interface UpdateSetupSectionResponse {
  success: boolean;
  data: {
    _id: string;
    updated: boolean;
  };
}

/**
 * DELETE /api/setup/admin/sections/:sectionId
 * Delete section (admin only)
 */
export interface DeleteSetupSectionResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/setup/admin/tasks
 * Create new task (admin only)
 */
export interface CreateSetupTaskRequest {
  sectionId: string;
  title: string;
  description: string;
  required?: boolean;
  order: number;
  link?: string;
}

export interface CreateSetupTaskResponse {
  success: boolean;
  data: {
    _id: string;
    title: string;
    sectionId: string;
  };
}

/**
 * PATCH /api/setup/admin/tasks/:taskId
 * Update task (admin only)
 */
export interface UpdateSetupTaskRequest {
  title?: string;
  description?: string;
  required?: boolean;
  order?: number;
  link?: string;
  active?: boolean;
}

export interface UpdateSetupTaskResponse {
  success: boolean;
  data: {
    _id: string;
    updated: boolean;
  };
}

/**
 * DELETE /api/setup/admin/tasks/:taskId
 * Delete task (admin only)
 */
export interface DeleteSetupTaskResponse {
  success: boolean;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// WALKTHROUGH (15 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/walkthroughs
 * Get list of available walkthroughs for user
 */
export interface ListWalkthroughsResponse {
  success: boolean;
  data: {
    walkthroughs: Array<{
      _id: string;
      title: string;
      description: string;
      category: string;
      estimatedMinutes: number;
      status: WalkthroughStatus;
      progress: number;
    }>;
  };
}

/**
 * GET /api/walkthroughs/progress
 * Get user's progress on all walkthroughs
 */
export interface GetWalkthroughProgressResponse {
  success: boolean;
  data: {
    overall: {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
    };
    byWalkthrough: Array<{
      walkthroughId: string;
      title: string;
      status: WalkthroughStatus;
      currentStep: number;
      totalSteps: number;
    }>;
  };
}

/**
 * GET /api/walkthroughs/:id
 * Get specific walkthrough details with tasks
 */
export interface GetWalkthroughResponse {
  success: boolean;
  data: {
    _id: string;
    title: string;
    description: string;
    category: string;
    steps: Array<{
      order: number;
      title: string;
      description: string;
      action: string;
      completed: boolean;
    }>;
    userProgress: {
      status: WalkthroughStatus;
      currentStep: number;
      startedAt?: string;
      completedAt?: string;
    };
  };
}

/**
 * POST /api/walkthroughs/:id/start
 * Start a walkthrough
 */
export interface StartWalkthroughResponse {
  success: boolean;
  data: {
    walkthroughId: string;
    status: WalkthroughStatus;
    currentStep: number;
    startedAt: string;
  };
}

/**
 * POST /api/walkthroughs/:id/step/next
 * Advance to next step in walkthrough
 */
export interface NextWalkthroughStepResponse {
  success: boolean;
  data: {
    walkthroughId: string;
    currentStep: number;
    completed: boolean;
  };
}

/**
 * POST /api/walkthroughs/:id/step/:stepOrder/skip
 * Skip a specific step in walkthrough
 */
export interface SkipWalkthroughStepResponse {
  success: boolean;
  data: {
    walkthroughId: string;
    stepSkipped: number;
    currentStep: number;
  };
}

/**
 * POST /api/walkthroughs/:id/complete
 * Complete entire walkthrough
 */
export interface CompleteWalkthroughResponse {
  success: boolean;
  message: string;
  data: {
    walkthroughId: string;
    status: WalkthroughStatus;
    completedAt: string;
  };
}

/**
 * POST /api/walkthroughs/:id/skip
 * Skip entire walkthrough
 */
export interface SkipWalkthroughResponse {
  success: boolean;
  message: string;
  data: {
    walkthroughId: string;
    status: WalkthroughStatus;
  };
}

/**
 * POST /api/walkthroughs/:id/reset
 * Reset progress on a walkthrough
 */
export interface ResetWalkthroughResponse {
  success: boolean;
  message: string;
  data: {
    walkthroughId: string;
    reset: boolean;
  };
}

/**
 * GET /api/walkthroughs/stats
 * Get completion statistics for all walkthroughs (admin only)
 */
export interface GetWalkthroughStatsResponse {
  success: boolean;
  data: {
    overall: {
      totalWalkthroughs: number;
      totalUsers: number;
      avgCompletionRate: number;
    };
    byWalkthrough: Array<{
      walkthroughId: string;
      title: string;
      started: number;
      completed: number;
      completionRate: number;
      avgTimeToComplete: number;
    }>;
  };
}

/**
 * GET /api/walkthroughs/admin
 * List all walkthroughs for admin management (admin only)
 */
export interface ListAllWalkthroughsResponse {
  success: boolean;
  data: {
    walkthroughs: Array<{
      _id: string;
      title: string;
      description: string;
      category: string;
      stepsCount: number;
      active: boolean;
      createdAt: string;
    }>;
  };
}

/**
 * POST /api/walkthroughs/admin
 * Create a new walkthrough (admin only)
 */
export interface CreateWalkthroughRequest {
  title: string;
  description: string;
  category: string;
  estimatedMinutes?: number;
  steps: Array<{
    order: number;
    title: string;
    description: string;
    action: string;
  }>;
}

export interface CreateWalkthroughResponse {
  success: boolean;
  data: {
    _id: string;
    title: string;
  };
}

/**
 * PUT /api/walkthroughs/admin/:id
 * Update a walkthrough (admin only)
 */
export interface UpdateWalkthroughRequest {
  title?: string;
  description?: string;
  category?: string;
  estimatedMinutes?: number;
  steps?: Array<{
    order: number;
    title: string;
    description: string;
    action: string;
  }>;
  active?: boolean;
}

export interface UpdateWalkthroughResponse {
  success: boolean;
  data: {
    _id: string;
    updated: boolean;
  };
}

/**
 * DELETE /api/walkthroughs/admin/:id
 * Delete (deactivate) a walkthrough (admin only)
 */
export interface DeleteWalkthroughResponse {
  success: boolean;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// COMMAND PALETTE (8 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/command-palette/search
 * Search across all entities
 */
export interface CommandPaletteSearchRequest {
  q: string; // Search query
  types?: string[]; // Filter by entity types
  limit?: number;
}

export interface CommandPaletteSearchResponse {
  success: boolean;
  data: {
    results: Array<{
      id: string;
      type: string;
      title: string;
      subtitle?: string;
      icon?: string;
      url: string;
      score: number;
    }>;
    total: number;
  };
}

/**
 * GET /api/command-palette/commands
 * Get available commands
 */
export interface GetCommandsResponse {
  success: boolean;
  data: {
    commands: Array<{
      id: string;
      label: string;
      shortcut?: string;
      category: string;
      action: string;
    }>;
  };
}

/**
 * GET /api/command-palette/recent
 * Get recent items
 */
export interface GetRecentItemsRequest {
  limit?: number; // Default: 10
}

export interface GetRecentItemsResponse {
  success: boolean;
  data: {
    items: Array<{
      id: string;
      type: string;
      title: string;
      url: string;
      lastAccessedAt: string;
    }>;
  };
}

/**
 * POST /api/command-palette/track/record
 * Track record view
 */
export interface TrackRecordViewRequest {
  recordId: string;
  recordType: string;
}

export interface TrackRecordViewResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/command-palette/track/search
 * Track search query
 */
export interface TrackSearchRequest {
  query: string;
  resultsCount: number;
}

export interface TrackSearchResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/command-palette/track/command
 * Track command execution
 */
export interface TrackCommandRequest {
  commandId: string;
}

export interface TrackCommandResponse {
  success: boolean;
  message: string;
}

/**
 * GET /api/command-palette/saved-searches
 * Get saved searches
 */
export interface GetSavedSearchesResponse {
  success: boolean;
  data: {
    searches: Array<{
      name: string;
      query: string;
      filters: any;
      createdAt: string;
    }>;
  };
}

/**
 * POST /api/command-palette/saved-searches
 * Save a search
 */
export interface SaveSearchRequest {
  name: string;
  query: string;
  filters?: any;
}

export interface SaveSearchResponse {
  success: boolean;
  data: {
    name: string;
    saved: boolean;
  };
}

/**
 * DELETE /api/command-palette/saved-searches/:name
 * Delete saved search
 */
export interface DeleteSavedSearchResponse {
  success: boolean;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS (9 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/keyboard-shortcuts/defaults
 * Get default shortcuts (public - no user-specific data)
 */
export interface GetDefaultShortcutsResponse {
  success: boolean;
  data: {
    shortcuts: Array<{
      id: string;
      action: string;
      keys: string;
      description: string;
      category: string;
    }>;
  };
}

/**
 * POST /api/keyboard-shortcuts/check-conflict
 * Check for conflicts
 */
export interface CheckShortcutConflictRequest {
  keys: string;
  excludeId?: string;
}

export interface CheckShortcutConflictResponse {
  success: boolean;
  data: {
    conflict: boolean;
    conflictingShortcut?: {
      id: string;
      action: string;
      keys: string;
    };
  };
}

/**
 * POST /api/keyboard-shortcuts/reset-all
 * Reset all shortcuts to defaults
 */
export interface ResetAllShortcutsResponse {
  success: boolean;
  message: string;
  data: {
    reset: boolean;
  };
}

/**
 * GET /api/keyboard-shortcuts
 * Get all user shortcuts
 */
export interface GetShortcutsResponse {
  success: boolean;
  data: {
    shortcuts: Array<{
      _id: string;
      action: string;
      keys: string;
      description: string;
      category: string;
      isCustom: boolean;
    }>;
  };
}

/**
 * POST /api/keyboard-shortcuts
 * Create custom shortcut
 */
export interface CreateShortcutRequest {
  action: string;
  keys: string;
  description: string;
  category?: string;
}

export interface CreateShortcutResponse {
  success: boolean;
  data: {
    _id: string;
    action: string;
    keys: string;
  };
}

/**
 * GET /api/keyboard-shortcuts/:id
 * Get specific shortcut by ID
 */
export interface GetShortcutByIdResponse {
  success: boolean;
  data: {
    _id: string;
    action: string;
    keys: string;
    description: string;
    category: string;
    isCustom: boolean;
  };
}

/**
 * PUT /api/keyboard-shortcuts/:id
 * Update shortcut
 */
export interface UpdateShortcutRequest {
  keys?: string;
  description?: string;
}

export interface UpdateShortcutResponse {
  success: boolean;
  data: {
    _id: string;
    updated: boolean;
  };
}

/**
 * DELETE /api/keyboard-shortcuts/:id
 * Delete custom shortcut
 */
export interface DeleteShortcutResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/keyboard-shortcuts/:id/reset
 * Reset shortcut to default
 */
export interface ResetShortcutResponse {
  success: boolean;
  data: {
    _id: string;
    reset: boolean;
    keys: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// PLUGINS (17 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/plugins/search
 * Search plugins
 */
export interface SearchPluginsRequest {
  q?: string; // Search query
  category?: string;
}

export interface SearchPluginsResponse {
  success: boolean;
  data: {
    plugins: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      version: string;
      author: string;
    }>;
  };
}

/**
 * GET /api/plugins/all
 * Get all plugins (System Admin Only)
 */
export interface GetAllPluginsResponse {
  success: boolean;
  data: {
    plugins: Array<{
      id: string;
      name: string;
      version: string;
      enabled: boolean;
      installations: number;
    }>;
  };
}

/**
 * GET /api/plugins/loader/stats
 * Get plugin loader statistics (System Admin Only)
 */
export interface GetPluginLoaderStatsResponse {
  success: boolean;
  data: {
    totalPlugins: number;
    loaded: number;
    failed: number;
    hooks: {
      total: number;
      byType: Record<string, number>;
    };
  };
}

/**
 * GET /api/plugins/available
 * Get available plugins for installation
 */
export interface GetAvailablePluginsRequest {
  category?: string;
}

export interface GetAvailablePluginsResponse {
  success: boolean;
  data: {
    plugins: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      version: string;
      price: number;
      rating: number;
      installed: boolean;
    }>;
  };
}

/**
 * GET /api/plugins/installed
 * Get installed plugins for current firm
 */
export interface GetInstalledPluginsRequest {
  enabled?: boolean;
}

export interface GetInstalledPluginsResponse {
  success: boolean;
  data: {
    plugins: Array<{
      pluginId: string;
      name: string;
      version: string;
      enabled: boolean;
      installedAt: string;
      settings: any;
    }>;
  };
}

/**
 * POST /api/plugins/register
 * Register a new plugin (System Admin Only)
 */
export interface RegisterPluginRequest {
  name: string;
  version: string;
  description: string;
  author: string;
  hooks: any[];
  settings?: any;
}

export interface RegisterPluginResponse {
  success: boolean;
  data: {
    pluginId: string;
    registered: boolean;
  };
}

/**
 * POST /api/plugins/hooks/execute
 * Execute a hook manually (for testing)
 */
export interface ExecutePluginHookRequest {
  hookName: string;
  context: any;
}

export interface ExecutePluginHookResponse {
  success: boolean;
  data: {
    results: any[];
    executionTime: number;
  };
}

/**
 * GET /api/plugins/:id
 * Get plugin by ID
 */
export interface GetPluginResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    category: string;
    settings: any;
    hooks: any[];
  };
}

/**
 * GET /api/plugins/:id/stats
 * Get plugin statistics
 */
export interface GetPluginStatsResponse {
  success: boolean;
  data: {
    pluginId: string;
    installations: number;
    activeInstallations: number;
    totalHookExecutions: number;
    avgExecutionTime: number;
  };
}

/**
 * POST /api/plugins/:id/reload
 * Reload a plugin (System Admin Only)
 */
export interface ReloadPluginResponse {
  success: boolean;
  message: string;
  data: {
    pluginId: string;
    reloaded: boolean;
  };
}

/**
 * POST /api/plugins/:id/install
 * Install a plugin
 */
export interface InstallPluginRequest {
  settings?: any;
}

export interface InstallPluginResponse {
  success: boolean;
  data: {
    installationId: string;
    pluginId: string;
    installedAt: string;
  };
}

/**
 * DELETE /api/plugins/:id/uninstall
 * Uninstall a plugin
 */
export interface UninstallPluginResponse {
  success: boolean;
  message: string;
}

/**
 * GET /api/plugins/installations/:installationId
 * Get plugin installation details
 */
export interface GetPluginInstallationResponse {
  success: boolean;
  data: {
    _id: string;
    pluginId: string;
    firmId: string;
    enabled: boolean;
    settings: any;
    installedAt: string;
  };
}

/**
 * PATCH /api/plugins/installations/:installationId/settings
 * Update plugin settings
 */
export interface UpdatePluginSettingsRequest {
  settings: any;
}

export interface UpdatePluginSettingsResponse {
  success: boolean;
  data: {
    installationId: string;
    settings: any;
  };
}

/**
 * POST /api/plugins/installations/:installationId/enable
 * Enable a plugin installation
 */
export interface EnablePluginResponse {
  success: boolean;
  data: {
    installationId: string;
    enabled: boolean;
  };
}

/**
 * POST /api/plugins/installations/:installationId/disable
 * Disable a plugin installation
 */
export interface DisablePluginResponse {
  success: boolean;
  data: {
    installationId: string;
    enabled: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// APPS (11 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/apps/categories
 * Get app categories
 */
export interface GetAppCategoriesResponse {
  success: boolean;
  data: Array<{
    name: string;
    apps: Array<{
      id: string;
      name: string;
      icon: string;
    }>;
  }>;
}

/**
 * GET /api/apps
 * List all available apps
 */
export interface ListAppsResponse {
  success: boolean;
  data: {
    apps: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      category: AppCategory;
      status: AppStatus;
      isConnected: boolean;
      connectedAt?: string;
      lastSyncAt?: string;
    }>;
    total: number;
    connected: number;
  };
}

/**
 * GET /api/apps/stats
 * Get firm integration statistics
 */
export interface GetAppsStatsResponse {
  success: boolean;
  data: {
    total: number;
    connected: number;
    disconnected: number;
    error: number;
    pending: number;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
  };
}

/**
 * GET /api/apps/:appId
 * Get app details and status
 */
export interface GetAppResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: AppCategory;
    status: AppStatus;
    isConnected: boolean;
    connectedAt?: string;
    lastSyncAt?: string;
    settings?: any;
    metadata?: any;
    stats?: {
      totalSyncs: number;
      lastSync: string;
      errors: number;
    };
  };
}

/**
 * POST /api/apps/:appId/connect
 * Start app connection flow
 */
export interface ConnectAppResponse {
  success: boolean;
  data: {
    authUrl: string;
    appId: string;
    appName: string;
    message: string;
  };
}

/**
 * POST /api/apps/:appId/disconnect
 * Disconnect an app
 */
export interface DisconnectAppRequest {
  reason?: string;
}

export interface DisconnectAppResponse {
  success: boolean;
  message: string;
}

/**
 * GET /api/apps/:appId/settings
 * Get app settings
 */
export interface GetAppSettingsResponse {
  success: boolean;
  data: {
    settings: any;
  };
}

/**
 * PUT /api/apps/:appId/settings
 * Update app settings
 */
export interface UpdateAppSettingsRequest {
  settings: any;
}

export interface UpdateAppSettingsResponse {
  success: boolean;
  data: {
    settings: any;
  };
}

/**
 * POST /api/apps/:appId/sync
 * Trigger manual sync
 */
export interface SyncAppResponse {
  success: boolean;
  data: {
    syncId: string;
    status: 'started' | 'completed' | 'failed';
    message: string;
  };
}

/**
 * POST /api/apps/:appId/test
 * Test app connection
 */
export interface TestAppResponse {
  success: boolean;
  data: {
    test: {
      success: boolean;
      message: string;
      timestamp: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// ANSWERS (6 endpoints)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/answers
 * Create answer
 */
export interface CreateAnswerRequest {
  questionId: string;
  content: string;
  attachments?: any[];
}

export interface CreateAnswerResponse {
  success: boolean;
  data: {
    _id: string;
    questionId: string;
    content: string;
    createdAt: string;
  };
}

/**
 * GET /api/answers/:questionId
 * Get answers for question
 */
export interface GetAnswersResponse {
  success: boolean;
  data: {
    answers: Array<{
      _id: string;
      content: string;
      userId: string;
      userName: string;
      likes: number;
      verified: boolean;
      createdAt: string;
    }>;
    total: number;
  };
}

/**
 * PATCH /api/answers/:_id
 * Update answer
 */
export interface UpdateAnswerRequest {
  content?: string;
  attachments?: any[];
}

export interface UpdateAnswerResponse {
  success: boolean;
  data: {
    _id: string;
    updated: boolean;
  };
}

/**
 * DELETE /api/answers/:_id
 * Delete answer
 */
export interface DeleteAnswerResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/answers/like/:_id
 * Like answer
 */
export interface LikeAnswerResponse {
  success: boolean;
  data: {
    _id: string;
    likes: number;
  };
}

/**
 * PATCH /api/answers/verify/:_id
 * Verify answer (admin)
 */
export interface VerifyAnswerRequest {
  verified: boolean;
}

export interface VerifyAnswerResponse {
  success: boolean;
  data: {
    _id: string;
    verified: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL TYPES
// ═══════════════════════════════════════════════════════════════

export * from './admin-system';
