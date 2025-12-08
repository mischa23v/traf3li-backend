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
const { userMiddleware } = require('../middlewares');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// Apply authentication to all routes
router.use(userMiddleware);

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

module.exports = router;
