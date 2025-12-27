/**
 * Audit Log Controller - Enhanced Compliance & Security Logging API
 *
 * Comprehensive audit log management including:
 * - Enhanced logging (with diff, bulk actions, security events)
 * - Advanced search and querying
 * - Analytics and anomaly detection
 * - Compliance reporting and integrity verification
 * - Archive management
 */

const auditLogService = require('../services/auditLog.service');
const auditLogArchivingService = require('../services/auditLogArchiving.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const logger = require('../utils/logger');
const { sanitizeFilename } = require('../utils/sanitize');

// ═══════════════════════════════════════════════════════════════
// ENHANCED LOGGING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/audit-logs/log-with-diff
 * Log an action with automatic diff calculation
 * Requires: admin or automated system permission
 */
const logWithDiff = asyncHandler(async (req, res) => {
  const { action, entityType, entityId, oldData, newData, metadata } = req.body;

  if (!action || !entityType || !entityId) {
    throw CustomException('Action, entityType, and entityId are required', 400);
  }

  const userId = req.user._id || req.user.id;
  const firmId = req.user.firmId || req.firmId;

  const fullMetadata = {
    ...metadata,
    ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
    userAgent: req.headers['user-agent'],
    method: req.method,
    endpoint: req.originalUrl,
  };

  const log = await auditLogService.logWithDiff(
    action,
    entityType,
    entityId,
    oldData,
    newData,
    userId,
    firmId,
    fullMetadata
  );

  res.json({
    success: true,
    data: log,
  });
});

/**
 * POST /api/audit-logs/log-bulk-action
 * Log a bulk action affecting multiple entities
 * Requires: admin or automated system permission
 */
const logBulkAction = asyncHandler(async (req, res) => {
  const { action, entities, metadata } = req.body;

  if (!action || !entities || !Array.isArray(entities)) {
    throw CustomException('Action and entities array are required', 400);
  }

  const userId = req.user._id || req.user.id;
  const firmId = req.user.firmId || req.firmId;

  const fullMetadata = {
    ...metadata,
    ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
    userAgent: req.headers['user-agent'],
    method: req.method,
    endpoint: req.originalUrl,
  };

  const log = await auditLogService.logBulkAction(
    action,
    entities,
    userId,
    firmId,
    fullMetadata
  );

  res.json({
    success: true,
    data: log,
  });
});

/**
 * POST /api/audit-logs/log-security-event
 * Log a security event
 * Requires: admin permission
 */
const logSecurityEvent = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw CustomException('Resource not found', 404);
  }

  const { eventType, details } = req.body;

  if (!eventType) {
    throw CustomException('Event type is required', 400);
  }

  const userId = req.user._id || req.user.id;
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0];

  const additionalContext = {
    firmId: req.user.firmId || req.firmId,
    userAgent: req.headers['user-agent'],
    method: req.method,
    endpoint: req.originalUrl,
  };

  const log = await auditLogService.logSecurityEvent(
    eventType,
    details,
    userId,
    ip,
    additionalContext
  );

  res.json({
    success: true,
    data: log,
  });
});

// ═══════════════════════════════════════════════════════════════
// QUERY & SEARCH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/audit-logs/search
 * Full-text search across audit logs
 * Requires: admin or reports view permission
 */
const searchLogs = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !req.hasPermission?.('reports', 'view')) {
    throw CustomException('Resource not found', 404);
  }

  const { q, page = 1, limit = 50, ...filters } = req.query;

  if (!q) {
    throw CustomException('Search query (q) is required', 400);
  }

  // For non-admin users, restrict to their firm
  const effectiveFirmId = req.user.role === 'admin' ? filters.firmId : (req.user.firmId || req.firmId);

  const result = await auditLogService.searchLogs(q, {
    ...filters,
    firmId: effectiveFirmId,
  }, {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100),
  });

  res.json({
    success: true,
    data: result.logs,
    pagination: result.pagination,
  });
});

/**
 * GET /api/audit-logs/by-action/:action
 * Get logs by action type
 * Requires: admin or reports view permission
 */
const getLogsByAction = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !req.hasPermission?.('reports', 'view')) {
    throw CustomException('Resource not found', 404);
  }

  const { action } = req.params;
  const { limit = 100, skip = 0, startDate, endDate } = req.query;

  const firmId = req.user.role === 'admin' ? req.query.firmId : (req.user.firmId || req.firmId);

  const logs = await auditLogService.getLogsByAction(action, {
    limit: Math.min(parseInt(limit), 500),
    skip: parseInt(skip),
    firmId,
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: logs,
    meta: {
      action,
      count: logs.length,
    },
  });
});

/**
 * GET /api/audit-logs/by-date-range
 * Get logs within a date range
 * Requires: admin or reports view permission
 */
const getLogsByDateRange = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !req.hasPermission?.('reports', 'view')) {
    throw CustomException('Resource not found', 404);
  }

  const { startDate, endDate, limit = 100, skip = 0, action, entityType, severity } = req.query;

  if (!startDate || !endDate) {
    throw CustomException('Start date and end date are required', 400);
  }

  const firmId = req.user.role === 'admin' ? req.query.firmId : (req.user.firmId || req.firmId);

  const logs = await auditLogService.getLogsByDateRange(startDate, endDate, firmId, {
    limit: Math.min(parseInt(limit), 500),
    skip: parseInt(skip),
    action,
    entityType,
    severity,
  });

  res.json({
    success: true,
    data: logs,
    meta: {
      dateRange: { startDate, endDate },
      count: logs.length,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/audit-logs/analytics/activity-summary
 * Get activity summary for a firm
 * Requires: admin or reports view permission
 */
const getActivitySummary = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !req.hasPermission?.('reports', 'view')) {
    throw CustomException('Resource not found', 404);
  }

  const { period = 'weekly' } = req.query;
  const firmId = req.user.role === 'admin' ? req.query.firmId : (req.user.firmId || req.firmId);

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const summary = await auditLogService.getActivitySummary(firmId, period);

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * GET /api/audit-logs/analytics/top-users
 * Get most active users
 * Requires: admin or reports view permission
 */
const getTopUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !req.hasPermission?.('reports', 'view')) {
    throw CustomException('Resource not found', 404);
  }

  const { period = 'weekly', limit = 10 } = req.query;
  const firmId = req.user.role === 'admin' ? req.query.firmId : (req.user.firmId || req.firmId);

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const topUsers = await auditLogService.getTopUsers(firmId, period, parseInt(limit));

  res.json({
    success: true,
    data: topUsers,
    meta: {
      period,
      count: topUsers.length,
    },
  });
});

/**
 * GET /api/audit-logs/analytics/top-actions
 * Get most common actions
 * Requires: admin or reports view permission
 */
const getTopActions = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !req.hasPermission?.('reports', 'view')) {
    throw CustomException('Resource not found', 404);
  }

  const { period = 'weekly', limit = 10 } = req.query;
  const firmId = req.user.role === 'admin' ? req.query.firmId : (req.user.firmId || req.firmId);

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const topActions = await auditLogService.getTopActions(firmId, period, parseInt(limit));

  res.json({
    success: true,
    data: topActions,
    meta: {
      period,
      count: topActions.length,
    },
  });
});

/**
 * GET /api/audit-logs/analytics/anomalies
 * Detect anomalies in audit log patterns
 * Requires: admin permission
 */
const getAnomalies = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw CustomException('Resource not found', 404);
  }

  const firmId = req.user.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const anomalies = await auditLogService.getAnomalies(firmId);

  res.json({
    success: true,
    data: anomalies,
  });
});

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/audit-logs/compliance/generate-report
 * Generate comprehensive compliance report
 * Requires: admin permission
 */
const generateComplianceReport = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw CustomException('Resource not found', 404);
  }

  const { startDate, endDate, standard = 'ALL' } = req.body;
  const firmId = req.body.firmId || req.user.firmId || req.firmId;

  if (!startDate || !endDate) {
    throw CustomException('Start date and end date are required', 400);
  }

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const report = await auditLogService.generateComplianceReport(
    firmId,
    startDate,
    endDate,
    standard
  );

  // Log this compliance report generation
  await auditLogService.log(
    'generate_compliance_report',
    'audit_log',
    null,
    null,
    {
      userId: req.user._id || req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      firmId,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      method: req.method,
      endpoint: req.originalUrl,
      severity: 'high',
      details: {
        dateRange: { startDate, endDate },
        standard,
      },
    }
  );

  res.json({
    success: true,
    data: report,
  });
});

/**
 * POST /api/audit-logs/compliance/verify-integrity
 * Verify audit log integrity using hash chain
 * Requires: admin permission
 */
const verifyLogIntegrity = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw CustomException('Resource not found', 404);
  }

  const { dateRange = {} } = req.body;
  const firmId = req.body.firmId || req.user.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const result = await auditLogService.verifyLogIntegrity(firmId, dateRange);

  // Log this integrity verification
  await auditLogService.log(
    'verify_log_integrity',
    'audit_log',
    null,
    null,
    {
      userId: req.user._id || req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      firmId,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      method: req.method,
      endpoint: req.originalUrl,
      severity: 'high',
      details: {
        dateRange,
        integrityScore: result.integrityScore,
        isIntact: result.isIntact,
      },
    }
  );

  res.json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/audit-logs/compliance/export-for-audit
 * Export audit logs for external auditors with integrity verification
 * Requires: admin permission
 */
const exportForAudit = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !req.hasSpecialPermission?.('canExportData')) {
    throw CustomException('Resource not found', 404);
  }

  const { dateRange, format = 'json' } = req.body;
  const firmId = req.body.firmId || req.user.firmId || req.firmId;

  if (!dateRange || !dateRange.start || !dateRange.end) {
    throw CustomException('Date range (start and end) is required', 400);
  }

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const exportData = await auditLogService.exportForAudit(firmId, dateRange, format);

  // Log this audit export
  await auditLogService.log(
    'export_for_audit',
    'audit_log',
    null,
    null,
    {
      userId: req.user._id || req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      firmId,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      method: req.method,
      endpoint: req.originalUrl,
      severity: 'critical',
      details: {
        dateRange,
        format,
        recordCount: exportData?.audit?.totalRecords || 0,
      },
    }
  );

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(exportData.filename)}"`);
    return res.send(exportData.data);
  }

  res.json({
    success: true,
    data: exportData,
  });
});

/**
 * GET /api/audit-logs/compliance/retention-status
 * Get retention compliance status
 * Requires: admin permission
 */
const getRetentionStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw CustomException('Resource not found', 404);
  }

  const firmId = req.query.firmId || req.user.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const status = await auditLogService.getRetentionStatus(firmId);

  res.json({
    success: true,
    data: status,
  });
});

// ═══════════════════════════════════════════════════════════════
// ARCHIVE MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/audit-logs/archive/stats
 * Get archiving statistics
 * Requires: admin permission
 */
const getArchiveStats = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw CustomException('Resource not found', 404);
  }

  const stats = await auditLogArchivingService.getArchivingStats();

  res.json({
    success: true,
    data: stats.data || stats,
  });
});

/**
 * POST /api/audit-logs/archive/run
 * Manually trigger audit log archiving
 * Requires: admin permission
 */
const runArchiving = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw CustomException('Resource not found', 404);
  }

  const { thresholdDays = 90, batchSize = 1000, dryRun = false, firmId } = req.body;

  if (thresholdDays < 30) {
    throw CustomException('Threshold must be at least 30 days', 400);
  }

  if (batchSize < 100 || batchSize > 5000) {
    throw CustomException('Batch size must be between 100 and 5000', 400);
  }

  // Log this archiving action
  await auditLogService.log(
    'trigger_audit_archiving',
    'audit_log',
    null,
    null,
    {
      userId: req.user._id || req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      firmId: req.user.firmId || req.firmId,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      method: req.method,
      endpoint: req.originalUrl,
      severity: 'high',
      details: { thresholdDays, batchSize, dryRun, firmId: firmId || null },
    }
  );

  const result = await auditLogArchivingService.archiveOldLogs({
    thresholdDays,
    batchSize,
    dryRun,
    firmId: firmId || null,
  });

  res.json({
    success: result.success,
    data: result,
  });
});

/**
 * POST /api/audit-logs/archive/verify
 * Verify archive integrity
 * Requires: admin permission
 */
const verifyArchiveIntegrity = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw CustomException('Resource not found', 404);
  }

  const { sampleSize = 100 } = req.body;

  if (sampleSize < 10 || sampleSize > 1000) {
    throw CustomException('Sample size must be between 10 and 1000', 400);
  }

  const result = await auditLogArchivingService.verifyArchiveIntegrity(sampleSize);

  res.json({
    success: result.success,
    data: result,
  });
});

module.exports = {
  // Enhanced logging
  logWithDiff,
  logBulkAction,
  logSecurityEvent,

  // Query & search
  searchLogs,
  getLogsByAction,
  getLogsByDateRange,

  // Analytics
  getActivitySummary,
  getTopUsers,
  getTopActions,
  getAnomalies,

  // Compliance
  generateComplianceReport,
  verifyLogIntegrity,
  exportForAudit,
  getRetentionStatus,

  // Archive management
  getArchiveStats,
  runArchiving,
  verifyArchiveIntegrity,
};
