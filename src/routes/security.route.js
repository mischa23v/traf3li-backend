/**
 * Security Routes - Security Incident Detection and Management API
 *
 * Provides endpoints for security incident management and monitoring.
 * Includes dashboard statistics, incident CRUD operations, and manual detection triggers.
 *
 * All routes require authentication and admin permissions.
 */

const express = require('express');
const router = express.Router();
const securityMonitorService = require('../services/securityMonitor.service');
const { userMiddleware } = require('../middlewares');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// Apply authentication to all routes
router.use(userMiddleware);

// ═══════════════════════════════════════════════════════════════
// SECURITY DASHBOARD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/security/dashboard
 * Get security dashboard statistics and metrics
 * Requires: admin permission
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    // Only admins can view security dashboard
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to view security dashboard', 403);
    }

    const { startDate, endDate } = req.query;
    const firmId = req.user.firmId || req.firmId;

    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const stats = await securityMonitorService.getDashboardStats(firmId, dateRange);

    res.json({
      success: true,
      data: stats,
      meta: {
        firmId,
        dateRange,
        generatedAt: new Date(),
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════
// INCIDENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/security/incidents
 * List security incidents with filters
 * Requires: admin permission
 */
router.get(
  '/incidents',
  asyncHandler(async (req, res) => {
    // Only admins can view security incidents
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to view security incidents', 403);
    }

    const {
      page = 1,
      limit = 50,
      type,
      severity,
      status,
      userId,
      ip,
      startDate,
      endDate,
      sort,
    } = req.query;

    const firmId = req.user.firmId || req.firmId;

    const filters = {
      type,
      severity,
      status,
      userId,
      ip,
      startDate,
      endDate,
      limit: Math.min(parseInt(limit) || 50, 500),
      skip: (parseInt(page) - 1) * (parseInt(limit) || 50),
      sort: sort ? JSON.parse(sort) : { detectedAt: -1 },
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) delete filters[key];
    });

    const result = await securityMonitorService.getIncidents(firmId, filters);

    res.json({
      success: true,
      data: result.incidents,
      pagination: {
        page: result.page,
        limit: filters.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  })
);

/**
 * GET /api/security/incidents/:id
 * Get detailed information about a specific incident
 * Requires: admin permission
 */
router.get(
  '/incidents/:id',
  asyncHandler(async (req, res) => {
    // Only admins can view security incidents
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to view security incidents', 403);
    }

    const { id } = req.params;
    const firmId = req.user.firmId || req.firmId;

    const incident = await securityMonitorService.getIncidentById(id, firmId);

    res.json({
      success: true,
      data: incident,
    });
  })
);

/**
 * PUT /api/security/incidents/:id
 * Update security incident status and details
 * Requires: admin permission
 */
router.put(
  '/incidents/:id',
  asyncHandler(async (req, res) => {
    // Only admins can update security incidents
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions to update security incidents', 403);
    }

    const { id } = req.params;
    const { status, resolution, notes } = req.body;

    if (!status) {
      throw CustomException('Status is required', 400);
    }

    const validStatuses = ['open', 'investigating', 'resolved', 'false_positive'];
    if (!validStatuses.includes(status)) {
      throw CustomException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const userId = req.user._id || req.user.id;

    const updatedIncident = await securityMonitorService.updateIncident(
      id,
      status,
      userId,
      { resolution, notes }
    );

    res.json({
      success: true,
      data: updatedIncident,
      message: 'Security incident updated successfully',
    });
  })
);

/**
 * POST /api/security/incidents/:id/acknowledge
 * Acknowledge a security incident
 * Requires: admin permission
 */
router.post(
  '/incidents/:id/acknowledge',
  asyncHandler(async (req, res) => {
    // Only admins can acknowledge incidents
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions', 403);
    }

    const { id } = req.params;
    const firmId = req.user.firmId || req.firmId;
    const userId = req.user._id || req.user.id;

    const incident = await securityMonitorService.getIncidentById(id, firmId);

    if (incident.acknowledged) {
      throw CustomException('Incident already acknowledged', 400);
    }

    const SecurityIncident = require('../models/securityIncident.model');
    const incidentDoc = await SecurityIncident.findById(id);
    await incidentDoc.acknowledge(userId);

    res.json({
      success: true,
      message: 'Incident acknowledged successfully',
    });
  })
);

/**
 * POST /api/security/incidents/:id/notes
 * Add a note to a security incident
 * Requires: admin permission
 */
router.post(
  '/incidents/:id/notes',
  asyncHandler(async (req, res) => {
    // Only admins can add notes
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions', 403);
    }

    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      throw CustomException('Note content is required', 400);
    }

    const firmId = req.user.firmId || req.firmId;
    const userId = req.user._id || req.user.id;

    // Verify incident belongs to firm
    await securityMonitorService.getIncidentById(id, firmId);

    const SecurityIncident = require('../models/securityIncident.model');
    const incidentDoc = await SecurityIncident.findById(id);
    await incidentDoc.addNote(note, userId);

    res.json({
      success: true,
      message: 'Note added successfully',
    });
  })
);

// ═══════════════════════════════════════════════════════════════
// MANUAL DETECTION TRIGGERS (for testing and manual checks)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/security/detect/brute-force
 * Manually trigger brute force detection
 * Requires: admin permission
 */
router.post(
  '/detect/brute-force',
  asyncHandler(async (req, res) => {
    // Only admins can trigger manual detection
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions', 403);
    }

    const { userId, ip, email, userAgent } = req.body;

    if (!userId && !ip && !email) {
      throw CustomException('Either userId, ip, or email is required', 400);
    }

    const result = await securityMonitorService.detectBruteForce(userId, ip, {
      email,
      userAgent,
      firmId: req.user.firmId || req.firmId,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/security/detect/account-takeover
 * Manually trigger account takeover detection
 * Requires: admin permission
 */
router.post(
  '/detect/account-takeover',
  asyncHandler(async (req, res) => {
    // Only admins can trigger manual detection
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions', 403);
    }

    const { userId, loginInfo } = req.body;

    if (!userId) {
      throw CustomException('userId is required', 400);
    }

    const result = await securityMonitorService.detectAccountTakeover(userId, loginInfo);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/security/detect/anomalous-activity
 * Manually trigger anomalous activity detection
 * Requires: admin permission
 */
router.post(
  '/detect/anomalous-activity',
  asyncHandler(async (req, res) => {
    // Only admins can trigger manual detection
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions', 403);
    }

    const { userId, action } = req.body;

    if (!userId || !action) {
      throw CustomException('userId and action are required', 400);
    }

    const result = await securityMonitorService.detectAnomalousActivity(userId, action);

    res.json({
      success: true,
      data: result,
    });
  })
);

// ═══════════════════════════════════════════════════════════════
// STATISTICS & REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/security/stats
 * Get security statistics summary
 * Requires: admin permission
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    // Only admins can view security stats
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions', 403);
    }

    const { startDate, endDate } = req.query;
    const firmId = req.user.firmId || req.firmId;

    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const SecurityIncident = require('../models/securityIncident.model');
    const stats = await SecurityIncident.getStats(firmId, dateRange);

    res.json({
      success: true,
      data: stats,
      meta: {
        firmId,
        dateRange,
        generatedAt: new Date(),
      },
    });
  })
);

/**
 * GET /api/security/incidents/open
 * Get all open security incidents
 * Requires: admin permission
 */
router.get(
  '/incidents/open',
  asyncHandler(async (req, res) => {
    // Only admins can view open incidents
    if (req.user.role !== 'admin') {
      throw CustomException('Insufficient permissions', 403);
    }

    const { severity, limit = 50 } = req.query;
    const firmId = req.user.firmId || req.firmId;

    const SecurityIncident = require('../models/securityIncident.model');
    const openIncidents = await SecurityIncident.getOpenIncidents(firmId, {
      severity,
      limit: Math.min(parseInt(limit) || 50, 500),
    });

    res.json({
      success: true,
      data: openIncidents,
      meta: {
        count: openIncidents.length,
        firmId,
      },
    });
  })
);

module.exports = router;
