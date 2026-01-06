/**
 * Miscellaneous Modules API Type Definitions
 *
 * This file contains TypeScript type definitions for:
 * - Support (Ticket & SLA Management)
 * - Audit Log (Compliance & Security Logging)
 * - Approval (Workflow Management)
 * - Health (System Health Monitoring)
 * - Webhook (Event Notification System)
 *
 * Generated from: support.route.js, auditLog.route.js, approval.route.js,
 *                 health.route.js, webhook.route.js and their controllers
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages?: number;
    totalPages?: number;
  };
}

export type ObjectId = string;

// ═══════════════════════════════════════════════════════════════
// SUPPORT MODULE - Ticket & SLA Management
// ═══════════════════════════════════════════════════════════════

// ---------- Enums ----------

export type TicketStatus = 'open' | 'replied' | 'resolved' | 'closed' | 'on_hold';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketType = 'question' | 'problem' | 'feature_request' | 'incident' | 'service_request';
export type SLAStatus = 'active' | 'inactive';

// ---------- Ticket Types ----------

export interface SupportTicket {
  _id: ObjectId;
  ticketNumber?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  ticketType: TicketType;
  raisedBy: ObjectId;
  assignedTo?: ObjectId;
  clientId?: ObjectId;
  firmId: ObjectId;
  tags?: string[];
  customFields?: Record<string, any>;
  replies?: Array<{
    content: string;
    userId: ObjectId;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

export interface CreateTicketRequest {
  subject: string;
  description: string;
  priority?: TicketPriority;
  ticketType?: TicketType;
  raisedBy?: ObjectId;
  clientId?: ObjectId;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateTicketRequest {
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  ticketType?: TicketType;
  status?: TicketStatus;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface GetTicketsQuery {
  status?: TicketStatus;
  priority?: TicketPriority;
  ticketType?: TicketType;
  assignedTo?: ObjectId;
  raisedBy?: ObjectId;
  clientId?: ObjectId;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReplyToTicketRequest {
  content: string;
}

// ---------- SLA Types ----------

export interface SupportSLA {
  _id: ObjectId;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  priority: TicketPriority;
  supportType?: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  workingHours?: {
    start: string;
    end: string;
  };
  workingDays?: number[];
  holidays?: Date[];
  warningThreshold?: number;
  isDefault?: boolean;
  status: SLAStatus;
  applicableTicketTypes?: TicketType[];
  applicableChannels?: string[];
  escalationEnabled?: boolean;
  escalationLevels?: Array<{
    level: number;
    delayMinutes: number;
    escalateTo: ObjectId[];
  }>;
  firmId: ObjectId;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSLARequest {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  priority: TicketPriority;
  supportType?: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  workingHours?: {
    start: string;
    end: string;
  };
  workingDays?: number[];
  holidays?: Date[];
  warningThreshold?: number;
  isDefault?: boolean;
  applicableTicketTypes?: TicketType[];
  applicableChannels?: string[];
  escalationEnabled?: boolean;
  escalationLevels?: Array<{
    level: number;
    delayMinutes: number;
    escalateTo: ObjectId[];
  }>;
}

export interface UpdateSLARequest {
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  priority?: TicketPriority;
  supportType?: string;
  firstResponseMinutes?: number;
  resolutionMinutes?: number;
  workingHours?: {
    start: string;
    end: string;
  };
  workingDays?: number[];
  holidays?: Date[];
  warningThreshold?: number;
  isDefault?: boolean;
  status?: SLAStatus;
  applicableTicketTypes?: TicketType[];
  applicableChannels?: string[];
  escalationEnabled?: boolean;
  escalationLevels?: Array<{
    level: number;
    delayMinutes: number;
    escalateTo: ObjectId[];
  }>;
}

// ---------- Statistics & Settings ----------

export interface SupportStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResponseTime?: number;
  avgResolutionTime?: number;
  byPriority?: Record<TicketPriority, number>;
  byStatus?: Record<TicketStatus, number>;
  byType?: Record<TicketType, number>;
}

export interface SupportSettings {
  defaultSlaId?: ObjectId;
  autoAssignTickets?: boolean;
  defaultAssignee?: ObjectId;
  ticketPrefixFormat?: string;
  ticketNumberingStartFrom?: number;
  emailNotifications?: {
    enabled: boolean;
    onNewTicket?: boolean;
    onReply?: boolean;
    onStatusChange?: boolean;
  };
  workingHours?: {
    start: string;
    end: string;
  };
  workingDays?: number[];
  holidays?: Date[];
  customerPortal?: {
    enabled: boolean;
    publicUrl?: string;
  };
  automation?: {
    autoClose?: {
      enabled: boolean;
      daysAfterResolved?: number;
    };
  };
  defaultPriority?: TicketPriority;
  priorityEscalation?: {
    enabled: boolean;
    rules?: Array<{
      fromPriority: TicketPriority;
      toPriority: TicketPriority;
      afterMinutes: number;
    }>;
  };
  enabledTicketTypes?: TicketType[];
  defaultTags?: string[];
  requiredFields?: string[];
  integrations?: Record<string, any>;
  branding?: {
    logo?: string;
    primaryColor?: string;
  };
  allowDuplicateTickets?: boolean;
  duplicateDetectionEnabled?: boolean;
  mergeTicketsEnabled?: boolean;
  internalNotesEnabled?: boolean;
  firmId: ObjectId;
}

export interface UpdateSettingsRequest {
  defaultSlaId?: ObjectId;
  autoAssignTickets?: boolean;
  defaultAssignee?: ObjectId;
  ticketPrefixFormat?: string;
  ticketNumberingStartFrom?: number;
  emailNotifications?: {
    enabled: boolean;
    onNewTicket?: boolean;
    onReply?: boolean;
    onStatusChange?: boolean;
  };
  workingHours?: {
    start: string;
    end: string;
  };
  workingDays?: number[];
  holidays?: Date[];
  customerPortal?: {
    enabled: boolean;
    publicUrl?: string;
  };
  automation?: {
    autoClose?: {
      enabled: boolean;
      daysAfterResolved?: number;
    };
  };
  defaultPriority?: TicketPriority;
  priorityEscalation?: {
    enabled: boolean;
    rules?: Array<{
      fromPriority: TicketPriority;
      toPriority: TicketPriority;
      afterMinutes: number;
    }>;
  };
  enabledTicketTypes?: TicketType[];
  defaultTags?: string[];
  requiredFields?: string[];
  integrations?: Record<string, any>;
  branding?: {
    logo?: string;
    primaryColor?: string;
  };
  allowDuplicateTickets?: boolean;
  duplicateDetectionEnabled?: boolean;
  mergeTicketsEnabled?: boolean;
  internalNotesEnabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG MODULE - Compliance & Security Logging
// ═══════════════════════════════════════════════════════════════

// ---------- Enums ----------

export type AuditLogStatus = 'success' | 'failed' | 'suspicious';
export type AuditLogSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AuditLogAction = string; // Too many to enumerate
export type ComplianceStandard = 'ALL' | 'GDPR' | 'HIPAA' | 'SOC2' | 'ISO27001';

// ---------- Audit Log Types ----------

export interface AuditLog {
  _id: ObjectId;
  action: AuditLogAction;
  entityType?: string;
  entityId?: ObjectId;
  resourceType?: string; // Alias for entityType
  resourceId?: ObjectId; // Alias for entityId
  userId?: ObjectId;
  userEmail?: string;
  userRole?: string;
  firmId?: ObjectId;
  status: AuditLogStatus;
  severity?: AuditLogSeverity;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  endpoint?: string;
  timestamp: Date;
  details?: Record<string, any>;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  complianceTags?: string[];
}

export interface GetAuditLogsQuery {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: ObjectId;
  startDate?: string;
  endDate?: string;
  status?: AuditLogStatus;
  severity?: AuditLogSeverity;
  firmId?: ObjectId;
}

export interface GetEntityAuditTrailQuery {
  limit?: number;
  page?: number;
}

export interface GetUserActivityQuery {
  startDate?: string;
  endDate?: string;
  action?: string;
  entityType?: string;
  limit?: number;
  page?: number;
}

export interface GetSecurityEventsQuery {
  startDate?: string;
  endDate?: string;
  severity?: AuditLogSeverity;
  limit?: number;
  page?: number;
}

export interface ExportAuditLogsQuery {
  format?: 'json' | 'csv';
  action?: string;
  entityType?: string;
  userId?: ObjectId;
  startDate?: string;
  endDate?: string;
  status?: AuditLogStatus;
  severity?: AuditLogSeverity;
}

export interface GetFailedLoginsQuery {
  hours?: number;
}

export interface CheckBruteForceRequest {
  identifier: string; // email or IP
  timeWindow?: number; // milliseconds
}

export interface CheckBruteForceResponse {
  success: boolean;
  data: {
    identifier: string;
    failedAttempts: number;
    timeWindow: string;
    isSuspicious: boolean;
  };
}

export interface GetAuditSummaryQuery {
  period?: 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
  firmId?: ObjectId;
}

export interface AuditSummary {
  period: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalLogs: number;
    failedActions: number;
    successRate: string;
  };
  topActions: Array<{
    action: string;
    count: number;
  }>;
  bySeverity: Record<string, number>;
  byEntityType: Array<{
    entityType: string;
    count: number;
  }>;
  topUsers: Array<{
    userId: ObjectId;
    userEmail?: string;
    count: number;
  }>;
}

export interface GetSecurityEventsEnhancedQuery extends GetSecurityEventsQuery {
  groupBy?: string;
}

export interface GetComplianceReportQuery {
  startDate?: string;
  endDate?: string;
  complianceTag?: string;
  format?: 'json' | 'pdf';
}

export interface ComplianceReport {
  reportGenerated: Date;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  firm?: ObjectId;
  summary: {
    totalAuditLogs: number;
    dataAccessAttempts: number;
    permissionChanges: number;
    dataExports: number;
    failedAttempts: number;
    complianceScore: string;
  };
  complianceBreakdown: Array<{
    tag: string;
    count: number;
  }>;
  severityBreakdown: Record<string, number>;
  criticalEvents: Array<{
    action: string;
    entityType?: string;
    userEmail?: string;
    timestamp: Date;
    status: AuditLogStatus;
    details?: any;
  }>;
  recommendations: Array<{
    severity: string;
    message: string;
  }>;
}

// ---------- Enhanced Logging Types ----------

export interface LogWithDiffRequest {
  action: string;
  entityType: string;
  entityId: ObjectId;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface LogBulkActionRequest {
  action: string;
  entities: Array<{
    entityType: string;
    entityId: ObjectId;
  }>;
  metadata?: Record<string, any>;
}

export interface LogSecurityEventRequest {
  eventType: string;
  details?: Record<string, any>;
}

export interface SearchLogsQuery {
  q: string;
  page?: number;
  limit?: number;
  firmId?: ObjectId;
  [key: string]: any; // Additional filters
}

export interface GetLogsByActionQuery {
  limit?: number;
  skip?: number;
  startDate?: string;
  endDate?: string;
  firmId?: ObjectId;
}

export interface GetLogsByDateRangeQuery {
  startDate: string;
  endDate: string;
  limit?: number;
  skip?: number;
  action?: string;
  entityType?: string;
  severity?: AuditLogSeverity;
  firmId?: ObjectId;
}

export interface GetActivitySummaryQuery {
  period?: 'daily' | 'weekly' | 'monthly';
  firmId?: ObjectId;
}

export interface GetTopUsersQuery {
  period?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
  firmId?: ObjectId;
}

export interface GetTopActionsQuery {
  period?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
  firmId?: ObjectId;
}

export interface GenerateComplianceReportRequest {
  startDate: string;
  endDate: string;
  standard?: ComplianceStandard;
  firmId?: ObjectId;
}

export interface VerifyLogIntegrityRequest {
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  firmId?: ObjectId;
}

export interface VerifyLogIntegrityResponse {
  success: boolean;
  data: {
    integrityScore: number;
    isIntact: boolean;
    totalLogs?: number;
    verifiedLogs?: number;
    issues?: any[];
  };
}

export interface ExportForAuditRequest {
  dateRange: {
    start: string;
    end: string;
  };
  format?: 'json' | 'csv';
  firmId?: ObjectId;
}

export interface GetRetentionStatusQuery {
  firmId?: ObjectId;
}

// ---------- Archiving Types ----------

export interface ArchivingStats {
  totalLogs: number;
  archivedLogs: number;
  activeLogs: number;
  oldestLog?: Date;
  newestLog?: Date;
  archiveSize?: number;
}

export interface ArchiveSummary {
  firmId?: ObjectId;
  startDate?: string;
  endDate?: string;
  totalArchived: number;
  byMonth?: Record<string, number>;
  byAction?: Record<string, number>;
}

export interface RunArchivingRequest {
  thresholdDays?: number;
  batchSize?: number;
  dryRun?: boolean;
  firmId?: ObjectId;
}

export interface RunArchivingResponse {
  success: boolean;
  archivedCount: number;
  deletedCount: number;
  dryRun: boolean;
  duration?: number;
}

export interface VerifyArchiveIntegrityRequest {
  sampleSize?: number;
}

export interface VerifyArchiveIntegrityResponse {
  success: boolean;
  totalSampled: number;
  verified: number;
  failed: number;
  integrityScore: number;
}

export interface RestoreArchivedLogsRequest {
  query: Record<string, any>;
  limit?: number;
}

export interface RestoreArchivedLogsResponse {
  success: boolean;
  restoredCount: number;
  duration?: number;
}

// ═══════════════════════════════════════════════════════════════
// APPROVAL MODULE - Workflow Management
// ═══════════════════════════════════════════════════════════════

// ---------- Enums ----------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalDecision = 'approved' | 'rejected' | 'abstained';
export type ApprovalEntityType =
  | 'deal'
  | 'quote'
  | 'expense'
  | 'leave_request'
  | 'invoice'
  | 'purchase_order'
  | 'contract'
  | 'payment'
  | 'refund'
  | 'time_off'
  | 'reimbursement';

// ---------- Old Approval System Types ----------

export interface ApprovalRule {
  _id: ObjectId;
  firmId: ObjectId;
  rules?: Array<{
    module: string;
    action: string;
    requiredApprovers?: ObjectId[];
    requiredRoles?: string[];
    threshold?: number;
  }>;
  settings?: {
    allowSelfApproval?: boolean;
    requireAllApprovers?: boolean;
  };
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateApprovalRulesRequest {
  rules?: Array<{
    module: string;
    action: string;
    requiredApprovers?: ObjectId[];
    requiredRoles?: string[];
    threshold?: number;
  }>;
  settings?: {
    allowSelfApproval?: boolean;
    requireAllApprovers?: boolean;
  };
}

export interface ApprovalRequest {
  _id: ObjectId;
  firmId: ObjectId;
  module: string;
  action: string;
  targetType: string;
  targetId: ObjectId;
  requestedBy: ObjectId;
  requiredApprovers: ObjectId[];
  requiredRoles: string[];
  status: ApprovalStatus;
  decisions?: Array<{
    userId: ObjectId;
    decision: ApprovalDecision;
    comment?: string;
    timestamp: Date;
  }>;
  finalizedBy?: ObjectId;
  finalizedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApproveRequestRequest {
  comment?: string;
}

export interface RejectRequestRequest {
  reason: string;
}

// ---------- New Approval Workflow System Types ----------

export interface ApprovalWorkflow {
  _id: ObjectId;
  firmId: ObjectId;
  name: string;
  description?: string;
  entityType: ApprovalEntityType;
  triggerConditions?: Record<string, any>;
  levels: Array<{
    level: number;
    name?: string;
    approverType: 'specific' | 'role' | 'manager' | 'dynamic';
    approvers?: ObjectId[];
    roles?: string[];
    dynamicField?: string;
    approvalType: 'any' | 'all' | 'majority';
    requiredCount?: number;
    skipConditions?: Record<string, any>;
    slaHours?: number;
  }>;
  onApproval?: {
    action?: string;
    notifyUsers?: ObjectId[];
  };
  onRejection?: {
    action?: string;
    notifyUsers?: ObjectId[];
  };
  slaHours?: number;
  notifyOnPending?: boolean;
  auditRequired?: boolean;
  isActive: boolean;
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  entityType: ApprovalEntityType;
  triggerConditions?: Record<string, any>;
  levels: Array<{
    level: number;
    name?: string;
    approverType: 'specific' | 'role' | 'manager' | 'dynamic';
    approvers?: ObjectId[];
    roles?: string[];
    dynamicField?: string;
    approvalType: 'any' | 'all' | 'majority';
    requiredCount?: number;
    skipConditions?: Record<string, any>;
    slaHours?: number;
  }>;
  onApproval?: {
    action?: string;
    notifyUsers?: ObjectId[];
  };
  onRejection?: {
    action?: string;
    notifyUsers?: ObjectId[];
  };
  slaHours?: number;
  notifyOnPending?: boolean;
  auditRequired?: boolean;
  isActive?: boolean;
}

export interface UpdateWorkflowRequest extends Partial<CreateWorkflowRequest> {}

export interface ListWorkflowsQuery {
  entityType?: ApprovalEntityType;
  isActive?: boolean | string;
  page?: number;
  limit?: number;
}

export interface InitiateApprovalRequest {
  workflowId: ObjectId;
  entityType: ApprovalEntityType;
  entityId: ObjectId;
}

export interface ApprovalInstance {
  _id: ObjectId;
  firmId: ObjectId;
  workflowId: ObjectId;
  entityType: ApprovalEntityType;
  entityId: ObjectId;
  requestedBy: ObjectId;
  currentLevel: number;
  status: ApprovalStatus;
  levels: Array<{
    level: number;
    approvers: ObjectId[];
    decisions: Array<{
      approverId: ObjectId;
      decision: ApprovalDecision;
      comments?: string;
      timestamp: Date;
      ipAddress?: string;
    }>;
    status: 'pending' | 'approved' | 'rejected' | 'skipped';
    completedAt?: Date;
  }>;
  delegations?: Array<{
    fromUserId: ObjectId;
    toUserId: ObjectId;
    reason?: string;
    timestamp: Date;
  }>;
  cancellationReason?: string;
  cancelledBy?: ObjectId;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface GetPendingApprovalsQuery {
  page?: number;
  limit?: number;
}

export interface RecordDecisionRequest {
  decision: ApprovalDecision;
  comments?: string;
}

export interface CancelApprovalRequest {
  reason?: string;
}

export interface DelegateApprovalRequest {
  toUserId: ObjectId;
  reason?: string;
}

export interface GetApprovalHistoryQuery {
  page?: number;
  limit?: number;
}

// ═══════════════════════════════════════════════════════════════
// HEALTH MODULE - System Health Monitoring
// ═══════════════════════════════════════════════════════════════

// ---------- Health Check Types ----------

export interface BasicHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime?: number;
  error?: string;
}

export interface LivenessProbeResponse {
  status: 'alive' | 'dead';
  timestamp: string;
  uptime?: number;
  error?: string;
}

export interface ReadinessProbeResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks?: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
  reason?: string;
  error?: string;
}

export interface DetailedHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    stripe?: ServiceHealth;
    [key: string]: ServiceHealth | undefined;
  };
  system?: SystemInfo;
}

export interface DeepHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    mongodb: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      database?: string;
      collections?: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      version?: string;
      memoryUsed?: string;
      error?: string;
    };
    stripe: {
      status: 'healthy' | 'unhealthy' | 'not_configured';
      responseTime?: number;
      error?: string;
    };
    disk: {
      status: 'healthy' | 'warning' | 'unknown';
      total?: string;
      free?: string;
      used?: string;
      usedPercent?: string;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'warning' | 'unknown';
      heapUsed: string;
      heapTotal: string;
      heapUsedPercent: string;
      systemTotal: string;
      systemFree: string;
      systemUsed: string;
      systemUsedPercent: string;
      error?: string;
    };
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded' | 'not_configured';
  responseTime?: number;
  latencyMs?: number;
  message?: string;
  [key: string]: any;
}

export interface SystemInfo {
  platform: string;
  nodeVersion: string;
  memory: {
    total: string;
    free: string;
    used: string;
  };
  cpu: {
    model: string;
    cores: number;
  };
  uptime: number;
}

export interface PingResponse {
  message: 'pong';
  timestamp: string;
}

export interface CircuitBreakerStatus {
  status: 'healthy' | 'degraded' | 'recovering' | 'error';
  timestamp: string;
  services: Record<string, {
    status: 'healthy' | 'unhealthy' | 'degraded';
    lastCheck?: Date;
  }>;
  circuits: Array<{
    name: string;
    state: 'closed' | 'open' | 'halfOpen';
    failures?: number;
    successRate?: number;
  }>;
  error?: string;
}

export interface CacheStats {
  status: 'ok' | 'error';
  timestamp: string;
  cache: {
    type: string;
    hits?: number;
    misses?: number;
    hitRate?: string;
    size?: number;
  };
  error?: string;
}

export interface DebugAuthResponse {
  timestamp: string;
  request: {
    origin: string;
    referer: string;
    host: string;
    forwardedHost: string;
    vercelForwarded: string;
    userAgent: string;
  };
  proxy: {
    isSameOriginProxy: boolean;
    detectionMethod: string;
    willUseSameSiteLax: boolean;
    willSetDomain: boolean;
  };
  cookies: {
    rawHeader: string;
    rawLength: number;
    parsed: string[];
    hasAccessToken: boolean;
    hasCsrfToken: boolean;
    accessTokenLength: number;
    csrfTokenLength: number;
  };
  server: {
    nodeEnv: string;
    isRender: boolean;
    note: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK MODULE - Event Notification System
// ═══════════════════════════════════════════════════════════════

// ---------- Enums ----------

export type WebhookEvent =
  // Case events
  | 'case.created' | 'case.updated' | 'case.deleted' | 'case.status_changed'
  // Client events
  | 'client.created' | 'client.updated' | 'client.deleted'
  // Appointment events
  | 'appointment.created' | 'appointment.updated' | 'appointment.deleted' | 'appointment.cancelled'
  // Document events
  | 'document.created' | 'document.updated' | 'document.deleted' | 'document.shared'
  // Task events
  | 'task.created' | 'task.updated' | 'task.deleted' | 'task.completed'
  // Invoice events
  | 'invoice.created' | 'invoice.sent' | 'invoice.paid' | 'invoice.overdue'
  // Payment events
  | 'payment.received' | 'payment.failed' | 'payment.refunded'
  // More events...
  | string;

export type WebhookStatus = 'active' | 'inactive' | 'disabled';
export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

// ---------- Webhook Types ----------

export interface Webhook {
  _id: ObjectId;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  url: string;
  events: WebhookEvent[];
  name?: string;
  description?: string;
  secret: string; // Never returned in responses
  isActive: boolean;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
  stats?: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    lastDelivery?: Date;
    lastSuccessfulDelivery?: Date;
  };
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastDisabledAt?: Date;
  disabledReason?: string;
}

export interface RegisterWebhookRequest {
  url: string;
  events: WebhookEvent[];
  name?: string;
  description?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: WebhookEvent[];
  name?: string;
  description?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };
  filters?: Record<string, any>;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface GetWebhooksQuery {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  event?: WebhookEvent;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WebhookDelivery {
  _id: ObjectId;
  webhookId: ObjectId;
  event: WebhookEvent;
  payload: Record<string, any>;
  signature: string;
  url: string;
  status: DeliveryStatus;
  statusCode?: number;
  responseBody?: any;
  responseHeaders?: Record<string, string>;
  error?: string;
  currentAttempt: number;
  maxRetries: number;
  nextRetryAt?: Date;
  canRetry: boolean;
  attempts: Array<{
    attemptNumber: number;
    timestamp: Date;
    statusCode?: number;
    error?: string;
    duration?: number;
  }>;
  createdAt: Date;
  completedAt?: Date;
  duration?: number;
}

export interface GetWebhookDeliveriesQuery {
  page?: number;
  limit?: number;
  status?: DeliveryStatus;
  event?: WebhookEvent;
}

export interface TestWebhookRequest {
  [key: string]: any; // Custom test payload
}

export interface DisableWebhookRequest {
  reason?: string;
}

export interface WebhookStats {
  totalWebhooks: number;
  activeWebhooks: number;
  inactiveWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime?: number;
  recentDeliveries?: WebhookDelivery[];
  eventDistribution?: Record<WebhookEvent, number>;
}

export interface AvailableEventsResponse {
  success: boolean;
  data: {
    events: WebhookEvent[];
    categories: Record<string, WebhookEvent[]>;
  };
}

export interface GetWebhookSecretResponse {
  success: boolean;
  data: {
    webhookId: ObjectId;
    secret: string;
  };
}

export interface RegenerateSecretResponse {
  success: boolean;
  message: string;
  data: {
    webhookId: ObjectId;
    secret: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// API ENDPOINT TYPE MAPS
// ═══════════════════════════════════════════════════════════════

/**
 * Support Module API Endpoints (16 endpoints)
 */
export interface SupportAPI {
  // Statistics & Settings
  'GET /api/support/stats': {
    query: void;
    response: ApiResponse<SupportStats>;
  };
  'GET /api/support/settings': {
    query: void;
    response: ApiResponse<SupportSettings>;
  };
  'PUT /api/support/settings': {
    body: UpdateSettingsRequest;
    response: ApiResponse<SupportSettings>;
  };

  // Tickets
  'GET /api/support/tickets': {
    query: GetTicketsQuery;
    response: PaginatedResponse<SupportTicket>;
  };
  'POST /api/support/tickets': {
    body: CreateTicketRequest;
    response: ApiResponse<SupportTicket>;
  };
  'GET /api/support/tickets/:id': {
    params: { id: ObjectId };
    response: ApiResponse<SupportTicket>;
  };
  'PUT /api/support/tickets/:id': {
    params: { id: ObjectId };
    body: UpdateTicketRequest;
    response: ApiResponse<SupportTicket>;
  };
  'DELETE /api/support/tickets/:id': {
    params: { id: ObjectId };
    response: ApiResponse<void>;
  };
  'POST /api/support/tickets/:id/reply': {
    params: { id: ObjectId };
    body: ReplyToTicketRequest;
    response: ApiResponse<SupportTicket>;
  };
  'POST /api/support/tickets/:id/resolve': {
    params: { id: ObjectId };
    response: ApiResponse<SupportTicket>;
  };
  'POST /api/support/tickets/:id/close': {
    params: { id: ObjectId };
    response: ApiResponse<SupportTicket>;
  };

  // SLAs
  'GET /api/support/slas': {
    query: void;
    response: ApiResponse<SupportSLA[]>;
  };
  'POST /api/support/slas': {
    body: CreateSLARequest;
    response: ApiResponse<SupportSLA>;
  };
  'GET /api/support/slas/:id': {
    params: { id: ObjectId };
    response: ApiResponse<SupportSLA>;
  };
  'PUT /api/support/slas/:id': {
    params: { id: ObjectId };
    body: UpdateSLARequest;
    response: ApiResponse<SupportSLA>;
  };
  'DELETE /api/support/slas/:id': {
    params: { id: ObjectId };
    response: ApiResponse<void>;
  };
}

/**
 * Audit Log Module API Endpoints (33 endpoints)
 */
export interface AuditLogAPI {
  // Basic queries
  'GET /api/audit-logs': {
    query: GetAuditLogsQuery;
    response: PaginatedResponse<AuditLog>;
  };
  'GET /api/audit-logs/entity/:type/:id': {
    params: { type: string; id: ObjectId };
    query: GetEntityAuditTrailQuery;
    response: ApiResponse<AuditLog[]>;
  };
  'GET /api/audit-logs/user/:id': {
    params: { id: ObjectId };
    query: GetUserActivityQuery;
    response: ApiResponse<AuditLog[]>;
  };
  'GET /api/audit-logs/security': {
    query: GetSecurityEventsQuery;
    response: ApiResponse<AuditLog[]>;
  };
  'GET /api/audit-logs/export': {
    query: ExportAuditLogsQuery;
    response: ApiResponse<AuditLog[]> | string; // CSV or JSON
  };
  'GET /api/audit-logs/failed-logins': {
    query: GetFailedLoginsQuery;
    response: ApiResponse<AuditLog[]>;
  };
  'GET /api/audit-logs/suspicious': {
    query: { limit?: number };
    response: ApiResponse<AuditLog[]>;
  };
  'POST /api/audit-logs/check-brute-force': {
    body: CheckBruteForceRequest;
    response: CheckBruteForceResponse;
  };
  'GET /api/audit-logs/summary': {
    query: GetAuditSummaryQuery;
    response: ApiResponse<AuditSummary>;
  };
  'GET /api/audit-logs/security-events': {
    query: GetSecurityEventsEnhancedQuery;
    response: ApiResponse<AuditLog[]>;
  };
  'GET /api/audit-logs/compliance-report': {
    query: GetComplianceReportQuery;
    response: ApiResponse<ComplianceReport>;
  };

  // Archiving
  'GET /api/audit-logs/archiving/stats': {
    query: void;
    response: ApiResponse<ArchivingStats>;
  };
  'GET /api/audit-logs/archiving/summary': {
    query: { firmId?: ObjectId; startDate?: string; endDate?: string };
    response: ApiResponse<ArchiveSummary>;
  };
  'POST /api/audit-logs/archiving/run': {
    body: RunArchivingRequest;
    response: RunArchivingResponse;
  };
  'POST /api/audit-logs/archiving/verify': {
    body: VerifyArchiveIntegrityRequest;
    response: VerifyArchiveIntegrityResponse;
  };
  'POST /api/audit-logs/archiving/restore': {
    body: RestoreArchivedLogsRequest;
    response: RestoreArchivedLogsResponse;
  };

  // Enhanced logging
  'POST /api/audit-logs/log-with-diff': {
    body: LogWithDiffRequest;
    response: ApiResponse<AuditLog>;
  };
  'POST /api/audit-logs/log-bulk-action': {
    body: LogBulkActionRequest;
    response: ApiResponse<AuditLog>;
  };
  'POST /api/audit-logs/log-security-event': {
    body: LogSecurityEventRequest;
    response: ApiResponse<AuditLog>;
  };

  // Search & Query
  'GET /api/audit-logs/search': {
    query: SearchLogsQuery;
    response: PaginatedResponse<AuditLog>;
  };
  'GET /api/audit-logs/by-action/:action': {
    params: { action: string };
    query: GetLogsByActionQuery;
    response: ApiResponse<AuditLog[]>;
  };
  'GET /api/audit-logs/by-date-range': {
    query: GetLogsByDateRangeQuery;
    response: ApiResponse<AuditLog[]>;
  };

  // Analytics
  'GET /api/audit-logs/analytics/activity-summary': {
    query: GetActivitySummaryQuery;
    response: ApiResponse<any>;
  };
  'GET /api/audit-logs/analytics/top-users': {
    query: GetTopUsersQuery;
    response: ApiResponse<Array<{ userId: ObjectId; count: number }>>;
  };
  'GET /api/audit-logs/analytics/top-actions': {
    query: GetTopActionsQuery;
    response: ApiResponse<Array<{ action: string; count: number }>>;
  };
  'GET /api/audit-logs/analytics/anomalies': {
    query: void;
    response: ApiResponse<any[]>;
  };

  // Compliance
  'POST /api/audit-logs/compliance/generate-report': {
    body: GenerateComplianceReportRequest;
    response: ApiResponse<ComplianceReport>;
  };
  'POST /api/audit-logs/compliance/verify-integrity': {
    body: VerifyLogIntegrityRequest;
    response: VerifyLogIntegrityResponse;
  };
  'POST /api/audit-logs/compliance/export-for-audit': {
    body: ExportForAuditRequest;
    response: ApiResponse<any> | string; // CSV or JSON
  };
  'GET /api/audit-logs/compliance/retention-status': {
    query: GetRetentionStatusQuery;
    response: ApiResponse<any>;
  };

  // Archive management (controller endpoints)
  'GET /api/audit-logs/archive/stats': {
    query: void;
    response: ApiResponse<ArchivingStats>;
  };
  'POST /api/audit-logs/archive/run': {
    body: RunArchivingRequest;
    response: RunArchivingResponse;
  };
  'POST /api/audit-logs/archive/verify': {
    body: VerifyArchiveIntegrityRequest;
    response: VerifyArchiveIntegrityResponse;
  };
}

/**
 * Approval Module API Endpoints (8 endpoints - old system only)
 */
export interface ApprovalAPI {
  // Old approval system
  'GET /api/approvals/rules': {
    query: void;
    response: ApiResponse<ApprovalRule>;
  };
  'PUT /api/approvals/rules': {
    body: UpdateApprovalRulesRequest;
    response: ApiResponse<ApprovalRule>;
  };
  'GET /api/approvals/pending': {
    query: GetPendingApprovalsQuery;
    response: PaginatedResponse<ApprovalRequest>;
  };
  'GET /api/approvals/history': {
    query: GetApprovalHistoryQuery;
    response: PaginatedResponse<ApprovalInstance>;
  };
  'GET /api/approvals/:id': {
    params: { id: ObjectId };
    response: ApiResponse<ApprovalRequest>;
  };
  'POST /api/approvals/:id/approve': {
    params: { id: ObjectId };
    body: ApproveRequestRequest;
    response: ApiResponse<ApprovalRequest>;
  };
  'POST /api/approvals/:id/reject': {
    params: { id: ObjectId };
    body: RejectRequestRequest;
    response: ApiResponse<ApprovalRequest>;
  };
  'POST /api/approvals/:id/cancel': {
    params: { id: ObjectId };
    body: CancelApprovalRequest;
    response: ApiResponse<ApprovalInstance>;
  };
}

/**
 * Health Module API Endpoints (9 endpoints)
 */
export interface HealthAPI {
  'GET /health': {
    query: void;
    response: BasicHealthResponse;
  };
  'GET /health/live': {
    query: void;
    response: LivenessProbeResponse;
  };
  'GET /health/ready': {
    query: void;
    response: ReadinessProbeResponse;
  };
  'GET /health/detailed': {
    query: void;
    response: DetailedHealthResponse;
  };
  'GET /health/deep': {
    query: void;
    response: DeepHealthResponse;
  };
  'GET /health/ping': {
    query: void;
    response: PingResponse;
  };
  'GET /health/circuits': {
    query: void;
    response: CircuitBreakerStatus;
  };
  'GET /health/cache': {
    query: void;
    response: CacheStats;
  };
  'GET /health/debug-auth': {
    query: void;
    response: DebugAuthResponse;
  };
}

/**
 * Webhook Module API Endpoints (16 endpoints)
 */
export interface WebhookAPI {
  // Informational
  'GET /api/webhooks/stats': {
    query: void;
    response: ApiResponse<WebhookStats>;
  };
  'GET /api/webhooks/events': {
    query: void;
    response: AvailableEventsResponse;
  };

  // CRUD
  'POST /api/webhooks': {
    body: RegisterWebhookRequest;
    response: ApiResponse<Webhook>;
  };
  'GET /api/webhooks': {
    query: GetWebhooksQuery;
    response: PaginatedResponse<Webhook>;
  };
  'GET /api/webhooks/:id': {
    params: { id: ObjectId };
    response: ApiResponse<Webhook>;
  };
  'PUT /api/webhooks/:id': {
    params: { id: ObjectId };
    body: UpdateWebhookRequest;
    response: ApiResponse<Webhook>;
  };
  'PATCH /api/webhooks/:id': {
    params: { id: ObjectId };
    body: UpdateWebhookRequest;
    response: ApiResponse<Webhook>;
  };
  'DELETE /api/webhooks/:id': {
    params: { id: ObjectId };
    response: ApiResponse<void>;
  };

  // Actions
  'POST /api/webhooks/:id/test': {
    params: { id: ObjectId };
    body: TestWebhookRequest;
    response: ApiResponse<{ deliveryId: ObjectId; status: DeliveryStatus; url: string }>;
  };
  'POST /api/webhooks/:id/enable': {
    params: { id: ObjectId };
    response: ApiResponse<Webhook>;
  };
  'POST /api/webhooks/:id/disable': {
    params: { id: ObjectId };
    body: DisableWebhookRequest;
    response: ApiResponse<Webhook>;
  };
  'GET /api/webhooks/:id/secret': {
    params: { id: ObjectId };
    response: GetWebhookSecretResponse;
  };
  'POST /api/webhooks/:id/regenerate-secret': {
    params: { id: ObjectId };
    response: RegenerateSecretResponse;
  };

  // Deliveries
  'GET /api/webhooks/:id/deliveries': {
    params: { id: ObjectId };
    query: GetWebhookDeliveriesQuery;
    response: PaginatedResponse<WebhookDelivery>;
  };
  'GET /api/webhooks/:id/deliveries/:deliveryId': {
    params: { id: ObjectId; deliveryId: ObjectId };
    response: ApiResponse<WebhookDelivery>;
  };
  'POST /api/webhooks/:id/deliveries/:deliveryId/retry': {
    params: { id: ObjectId; deliveryId: ObjectId };
    response: ApiResponse<any>;
  };
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Total Endpoints Documented: 82
 *
 * Breakdown by module:
 * - Support: 16 endpoints
 * - Audit Log: 33 endpoints
 * - Approval: 8 endpoints
 * - Health: 9 endpoints
 * - Webhook: 16 endpoints
 */
