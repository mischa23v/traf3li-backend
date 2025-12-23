/**
 * Audit Log Routes - System-Wide Compliance & Security Audit Trail API
 *
 * This provides endpoints for querying comprehensive audit logs across the system.
 * Includes support for entity trails, user activity, security events, and exports.
 *
 * All routes require authentication and appropriate permissions.
 */

const express = require('express');
const router = express.Router();
const auditLogService = require('../services/auditLog.service');
const auditLogArchivingService = require('../services/auditLogArchiving.service');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// Apply authentication to all routes
router.use(userMiddleware);

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/audit-logs
 * List all audit logs with filters
 * Requires: admin permission or reports view permission
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // Check permissions - only admins or users with reports permission
    if (req.user.role !== 'admin' && !req.hasPermission?.('reports', 'view')) {
      throw CustomException('Insufficient permissions to view audit logs', 403);
    }

    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      userId,
      startDate,
      endDate,
      status,
      severity,
      firmId,
    } = req.query;

    // For non-admin users, restrict to their firm
    const effectiveFirmId = req.user.role === 'admin' ? firmId : (req.user.firmId || req.firmId);

    const filters = {
      firmId: effectiveFirmId,
      action,
      entityType,
      userId,
      startDate,
      endDate,
      status,
      severity,
      limit: Math.min(parseInt(limit) || 50, 100),
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) delete filters[key];
    });

    const logs = await auditLogService.exportAuditLog(filters);

    // Calculate pagination
    const total = logs.length;
    const totalPages = Math.ceil(total / filters.limit);
    const skip = (parseInt(page) - 1) * filters.limit;
    const paginatedLogs = logs.slice(skip, skip + filters.limit);

    res.json({
      success: true,
      data: paginatedLogs,
      pagination: {
        page: parseInt(page),
        limit: filters.limit,
        total,
        totalPages,
      },
    });
  })
);

/**
 * GET /api/audit-logs/entity/:type/:id
 * Get audit trail for a specific entity
 * Requires: appropriate entity access permission
 */
router.get(
  '/entity/:type/:id',
  asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { limit = 100, page = 1 } = req.query;

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const options = {
      limit: Math.min(parseInt(limit) || 100, 500),
      skip,
      firmId: req.user.role === 'admin' ? undefined : (req.user.firmId || req.firmId),
    };

    const trail = await auditLogService.getAuditTrail(type, id, options);

    res.json({
      success: true,
      data: trail,
      meta: {
        entityType: type,
        entityId: id,
        count: trail.length,
      },
    });
  })
);

/**
 * GET /api/audit-logs/user/:id
 * Get activity for a specific user
 * Requires: admin or self-access
 */
router.get(
  '/user/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate, action, entityType, limit = 50, page = 1 } = req.query;

    // Users can only view their own activity unless they're admin
    if (req.user.role !== 'admin' && id !== req.user._id?.toString() && id !== req.user.id?.toString()) {
      throw CustomException('Insufficient permissions to view this user activity', 403);
    }

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const options = {
      limit: Math.min(parseInt(limit) || 50, 500),
      skip,
      action,
      entityType,
      firmId: req.user.role === 'admin' ? undefined : (req.user.firmId || req.firmId),
    };

    const activity = await auditLogService.getUserActivity(id, dateRange, options);

    res.json({
      success: true,
      data: activity,
      meta: {
        userId: id,
        count: activity.length,
        dateRange,
      },
    });
  })
);

/**
 * GET /api/audit-logs/security
 * Get security events (failed logins, permission changes, etc.)
 * Requires: admin permission
 */
router.get(
  '/security',
  asyncHandler(async (req, res) => {
    // Only admins can view security events
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to view security events', 403);
    }

    const { startDate, endDate, severity, limit = 100, page = 1 } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const options = {
      limit: Math.min(parseInt(limit) || 100, 500),
      skip,
      severity,
    };

    const firmId = req.user.firmId || req.firmId;
    const events = await auditLogService.getSecurityEvents(firmId, dateRange, options);

    res.json({
      success: true,
      data: events,
      meta: {
        count: events.length,
        dateRange,
        severity,
      },
    });
  })
);

/**
 * GET /api/audit-logs/export
 * Export audit logs to CSV or JSON
 * Requires: admin permission or export permission
 */
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    // Check permissions
    if (req.user.role !== 'admin' && !req.hasSpecialPermission?.('canExportData')) {
      throw CustomException('Insufficient permissions to export audit logs', 403);
    }

    const {
      format = 'json',
      action,
      entityType,
      userId,
      startDate,
      endDate,
      status,
      severity,
    } = req.query;

    // For non-admin users, restrict to their firm
    const firmId = req.user.role === 'admin' ? req.query.firmId : (req.user.firmId || req.firmId);

    const filters = {
      firmId,
      action,
      entityType,
      userId,
      startDate,
      endDate,
      status,
      severity,
      limit: 10000, // Max export limit
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) delete filters[key];
    });

    const result = await auditLogService.exportAuditLog(filters, format);

    // Log this export action
    await auditLogService.log(
      'export_data',
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
        details: {
          recordCount: Array.isArray(result.data) ? result.data.length : 0,
          filters,
          format,
        },
      }
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    }

    res.json({
      success: true,
      data: result.data,
      meta: {
        recordCount: result.data.length,
        exportedAt: new Date().toISOString(),
        filters,
        format,
      },
    });
  })
);

/**
 * GET /api/audit-logs/failed-logins
 * Get recent failed login attempts
 * Requires: admin permission
 */
router.get(
  '/failed-logins',
  asyncHandler(async (req, res) => {
    // Only admins can view failed logins
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to view failed logins', 403);
    }

    const { hours = 1 } = req.query;
    const timeWindow = parseInt(hours) * 60 * 60 * 1000; // Convert to milliseconds

    const failedLogins = await auditLogService.getFailedLogins(timeWindow);

    res.json({
      success: true,
      data: failedLogins,
      meta: {
        count: failedLogins.length,
        timeWindow: `${hours} hour(s)`,
      },
    });
  })
);

/**
 * GET /api/audit-logs/suspicious
 * Get suspicious activity
 * Requires: admin permission
 */
router.get(
  '/suspicious',
  asyncHandler(async (req, res) => {
    // Only admins can view suspicious activity
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to view suspicious activity', 403);
    }

    const { limit = 100 } = req.query;

    const suspicious = await auditLogService.getSuspiciousActivity(parseInt(limit));

    res.json({
      success: true,
      data: suspicious,
      meta: {
        count: suspicious.length,
      },
    });
  })
);

/**
 * POST /api/audit-logs/check-brute-force
 * Check for brute force attempts
 * Requires: admin permission
 */
router.post(
  '/check-brute-force',
  asyncHandler(async (req, res) => {
    // Only admins can check brute force
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions', 403);
    }

    const { identifier, timeWindow = 900000 } = req.body; // 15 minutes default

    if (!identifier) {
      throw CustomException('Identifier (email or IP) is required', 400);
    }

    const attempts = await auditLogService.checkBruteForce(identifier, timeWindow);

    res.json({
      success: true,
      data: {
        identifier,
        failedAttempts: attempts,
        timeWindow: `${timeWindow / 60000} minute(s)`,
        isSuspicious: attempts >= 5,
      },
    });
  })
);

/**
 * GET /api/audit-logs/summary
 * Get daily/weekly/monthly audit summary
 * Requires: admin permission or reports view permission
 */
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    // Check permissions - only admins or users with reports permission
    if (req.user.role !== 'admin' && !req.hasPermission?.('reports', 'view')) {
      throw CustomException('Insufficient permissions to view audit summary', 403);
    }

    const { period = 'daily', startDate, endDate } = req.query;
    const firmId = req.user.role === 'admin' ? req.query.firmId : (req.user.firmId || req.firmId);

    // Determine date range based on period
    const now = new Date();
    let calculatedStartDate, calculatedEndDate;

    if (period === 'daily') {
      calculatedStartDate = new Date(now);
      calculatedStartDate.setHours(0, 0, 0, 0);
      calculatedEndDate = new Date(now);
      calculatedEndDate.setHours(23, 59, 59, 999);
    } else if (period === 'weekly') {
      calculatedStartDate = new Date(now);
      calculatedStartDate.setDate(now.getDate() - 7);
      calculatedStartDate.setHours(0, 0, 0, 0);
      calculatedEndDate = now;
    } else if (period === 'monthly') {
      calculatedStartDate = new Date(now);
      calculatedStartDate.setMonth(now.getMonth() - 1);
      calculatedStartDate.setHours(0, 0, 0, 0);
      calculatedEndDate = now;
    }

    // Use custom dates if provided
    if (startDate) calculatedStartDate = new Date(startDate);
    if (endDate) calculatedEndDate = new Date(endDate);

    const AuditLog = require('../models/auditLog.model');

    // Build query
    const query = {
      timestamp: {
        $gte: calculatedStartDate,
        $lte: calculatedEndDate,
      },
    };

    if (firmId) {
      query.firmId = firmId;
    }

    // Aggregate statistics
    const [
      totalLogs,
      actionStats,
      severityStats,
      entityStats,
      userStats,
      failedActions,
    ] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: { $ifNull: ['$entityType', '$resourceType'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$userId', userEmail: { $first: '$userEmail' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.countDocuments({ ...query, status: 'failed' }),
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          startDate: calculatedStartDate,
          endDate: calculatedEndDate,
        },
        summary: {
          totalLogs,
          failedActions,
          successRate: totalLogs > 0 ? ((totalLogs - failedActions) / totalLogs * 100).toFixed(2) : 100,
        },
        topActions: actionStats.map(stat => ({
          action: stat._id,
          count: stat.count,
        })),
        bySeverity: severityStats.reduce((acc, stat) => {
          acc[stat._id || 'unknown'] = stat.count;
          return acc;
        }, {}),
        byEntityType: entityStats.map(stat => ({
          entityType: stat._id,
          count: stat.count,
        })),
        topUsers: userStats.map(stat => ({
          userId: stat._id,
          userEmail: stat.userEmail,
          count: stat.count,
        })),
      },
    });
  })
);

/**
 * GET /api/audit-logs/security-events
 * Get security-related events only (enhanced version)
 * Requires: admin permission
 */
router.get(
  '/security-events',
  asyncHandler(async (req, res) => {
    // Only admins can view security events
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to view security events', 403);
    }

    const { startDate, endDate, severity, limit = 100, page = 1, groupBy } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const options = {
      limit: Math.min(parseInt(limit) || 100, 500),
      skip,
      severity,
    };

    const firmId = req.user.firmId || req.firmId;
    const events = await auditLogService.getSecurityEvents(firmId, dateRange, options);

    // If groupBy is specified, group the results
    let groupedData = null;
    if (groupBy) {
      const AuditLog = require('../models/auditLog.model');
      const query = {
        $or: [
          { status: 'suspicious' },
          { status: 'failed' },
          { action: 'login_failed' },
          { action: { $in: ['update_permissions', 'update_role', 'grant_access', 'revoke_access'] } },
          { severity: { $in: ['high', 'critical'] } }
        ]
      };

      if (firmId) query.firmId = firmId;
      if (dateRange.startDate || dateRange.endDate) {
        query.timestamp = {};
        if (dateRange.startDate) query.timestamp.$gte = new Date(dateRange.startDate);
        if (dateRange.endDate) query.timestamp.$lte = new Date(dateRange.endDate);
      }

      groupedData = await AuditLog.aggregate([
        { $match: query },
        { $group: { _id: `$${groupBy}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]);
    }

    res.json({
      success: true,
      data: events,
      grouped: groupedData,
      meta: {
        count: events.length,
        dateRange,
        severity,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  })
);

/**
 * GET /api/audit-logs/compliance-report
 * Generate compliance report for regulatory requirements
 * Requires: admin permission
 */
router.get(
  '/compliance-report',
  asyncHandler(async (req, res) => {
    // Only admins can generate compliance reports
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to generate compliance reports', 403);
    }

    const { startDate, endDate, complianceTag, format = 'json' } = req.query;
    const firmId = req.user.firmId || req.firmId;

    // Default to last 30 days if no dates provided
    const now = new Date();
    const calculatedStartDate = startDate ? new Date(startDate) : new Date(now.setDate(now.getDate() - 30));
    const calculatedEndDate = endDate ? new Date(endDate) : new Date();

    const AuditLog = require('../models/auditLog.model');

    // Build query
    const query = {
      timestamp: {
        $gte: calculatedStartDate,
        $lte: calculatedEndDate,
      },
    };

    if (firmId) query.firmId = firmId;
    if (complianceTag) query.complianceTags = complianceTag;

    // Gather compliance statistics
    const [
      totalLogs,
      byComplianceTag,
      bySeverity,
      criticalEvents,
      dataAccessLogs,
      permissionChanges,
      dataExports,
      failedAttempts,
    ] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.aggregate([
        { $match: query },
        { $unwind: { path: '$complianceTags', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$complianceTags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      AuditLog.find({
        ...query,
        severity: 'critical',
      })
        .sort({ timestamp: -1 })
        .limit(50)
        .select('action entityType userEmail timestamp status details')
        .lean(),
      AuditLog.countDocuments({
        ...query,
        action: { $in: ['view_document', 'download_document', 'access_sensitive_data', 'view_client', 'view_case'] },
      }),
      AuditLog.countDocuments({
        ...query,
        action: { $in: ['update_permissions', 'update_role', 'grant_access', 'revoke_access'] },
      }),
      AuditLog.countDocuments({
        ...query,
        action: { $in: ['export_data', 'bulk_export', 'download_export'] },
      }),
      AuditLog.countDocuments({
        ...query,
        status: 'failed',
      }),
    ]);

    const report = {
      reportGenerated: new Date(),
      dateRange: {
        startDate: calculatedStartDate,
        endDate: calculatedEndDate,
      },
      firm: firmId,
      summary: {
        totalAuditLogs: totalLogs,
        dataAccessAttempts: dataAccessLogs,
        permissionChanges,
        dataExports,
        failedAttempts,
        complianceScore: totalLogs > 0 ? ((totalLogs - failedAttempts) / totalLogs * 100).toFixed(2) : 100,
      },
      complianceBreakdown: byComplianceTag.map(tag => ({
        tag: tag._id || 'untagged',
        count: tag.count,
      })),
      severityBreakdown: bySeverity.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      criticalEvents: criticalEvents.map(event => ({
        action: event.action,
        entityType: event.entityType,
        userEmail: event.userEmail,
        timestamp: event.timestamp,
        status: event.status,
        details: event.details,
      })),
      recommendations: [],
    };

    // Add compliance recommendations based on findings
    if (failedAttempts > totalLogs * 0.1) {
      report.recommendations.push({
        severity: 'high',
        message: `High failure rate detected (${((failedAttempts / totalLogs) * 100).toFixed(1)}%). Review failed actions and implement additional security measures.`,
      });
    }

    if (permissionChanges > 50) {
      report.recommendations.push({
        severity: 'medium',
        message: `${permissionChanges} permission changes detected. Ensure all changes are properly authorized and documented.`,
      });
    }

    if (dataExports > 20) {
      report.recommendations.push({
        severity: 'medium',
        message: `${dataExports} data exports detected. Verify all exports comply with data protection regulations.`,
      });
    }

    if (report.recommendations.length === 0) {
      report.recommendations.push({
        severity: 'low',
        message: 'No significant compliance issues detected. Continue monitoring.',
      });
    }

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
          dateRange: report.dateRange,
          complianceTag,
          totalLogs,
        },
      }
    );

    // Return based on format
    if (format === 'pdf') {
      // TODO: Implement PDF generation
      return res.status(501).json({
        success: false,
        message: 'PDF format not yet implemented',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  })
);

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG ARCHIVING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/audit-logs/archiving/stats
 * Get archiving statistics
 * Requires: admin permission
 */
router.get(
  '/archiving/stats',
  asyncHandler(async (req, res) => {
    // Only admins can view archiving stats
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to view archiving statistics', 403);
    }

    const stats = await auditLogArchivingService.getArchivingStats();

    res.json({
      success: true,
      data: stats.data || stats,
    });
  })
);

/**
 * GET /api/audit-logs/archiving/summary
 * Get archive summary with statistics
 * Requires: admin permission
 */
router.get(
  '/archiving/summary',
  asyncHandler(async (req, res) => {
    // Only admins can view archive summary
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to view archive summary', 403);
    }

    const { firmId, startDate, endDate } = req.query;

    const summary = await auditLogArchivingService.generateArchiveSummary({
      firmId: firmId || req.user.firmId || req.firmId,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: summary.data || summary,
    });
  })
);

/**
 * POST /api/audit-logs/archiving/run
 * Manually trigger audit log archiving
 * Requires: admin permission
 */
router.post(
  '/archiving/run',
  asyncHandler(async (req, res) => {
    // Only admins can trigger archiving
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to trigger archiving', 403);
    }

    const { thresholdDays = 90, batchSize = 1000, dryRun = false, firmId } = req.body;

    // Validate parameters
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
        details: {
          thresholdDays,
          batchSize,
          dryRun,
          firmId: firmId || null,
        },
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
  })
);

/**
 * POST /api/audit-logs/archiving/verify
 * Verify archive integrity
 * Requires: admin permission
 */
router.post(
  '/archiving/verify',
  asyncHandler(async (req, res) => {
    // Only admins can verify archive integrity
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to verify archive integrity', 403);
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
  })
);

/**
 * POST /api/audit-logs/archiving/restore
 * Restore archived logs back to main collection
 * Requires: admin permission
 * CAUTION: Use with care - typically for compliance or investigation
 */
router.post(
  '/archiving/restore',
  asyncHandler(async (req, res) => {
    // Only admins can restore archived logs
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to restore archived logs', 403);
    }

    const { query = {}, limit = 100 } = req.body;

    if (!query || typeof query !== 'object') {
      throw CustomException('Valid query object is required', 400);
    }

    if (limit < 1 || limit > 1000) {
      throw CustomException('Limit must be between 1 and 1000', 400);
    }

    // Log this restore action
    await auditLogService.log(
      'restore_archived_logs',
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
        severity: 'critical',
        details: {
          query,
          limit,
        },
      }
    );

    const result = await auditLogArchivingService.restoreArchivedLogs(query, limit);

    res.json({
      success: result.success,
      data: result,
    });
  })
);

module.exports = router;
