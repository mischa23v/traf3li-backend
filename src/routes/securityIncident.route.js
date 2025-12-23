/**
 * Security Incident Reporting Routes
 *
 * NCA ECC-2:2024 Compliance: Section 3-1
 * Provides endpoints for reporting and managing security incidents
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize.middleware');
const AuditLog = require('../models/auditLog.model');
const {
  receiveCspReport,
  getCspViolations,
  clearCspViolations
} = require('../controllers/cspReport.controller');

/**
 * POST /api/security/incidents/report
 * Report a security incident (authenticated users)
 */
router.post('/incidents/report', authenticate, async (req, res) => {
  try {
    const {
      type,
      severity,
      description,
      affectedSystems,
      suspectedCause,
      discoveryTime,
    } = req.body;

    // Validate required fields
    if (!type || !description) {
      return res.status(400).json({
        success: false,
        error: 'Type and description are required',
      });
    }

    // Valid incident types
    const validTypes = [
      'data_breach',
      'unauthorized_access',
      'malware',
      'phishing',
      'denial_of_service',
      'insider_threat',
      'vulnerability',
      'suspicious_activity',
      'policy_violation',
      'other',
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid incident type',
        validTypes,
      });
    }

    // Create security incident log
    const incident = await AuditLog.log({
      userId: req.userID,
      userEmail: req.user.email,
      userRole: req.user.role,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      firmId: req.firmId,
      action: 'security_incident_reported',
      entityType: 'security_incident',
      severity: severity || 'high',
      status: 'pending',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'],
      details: {
        incidentType: type,
        description,
        affectedSystems: affectedSystems || [],
        suspectedCause: suspectedCause || 'unknown',
        discoveryTime: discoveryTime || new Date().toISOString(),
        reportedAt: new Date().toISOString(),
        reportedBy: {
          userId: req.userID,
          email: req.user.email,
          name: `${req.user.firstName} ${req.user.lastName}`,
        },
      },
      metadata: {
        requiresNCANotification: ['data_breach', 'unauthorized_access'].includes(type),
        autoEscalated: severity === 'critical',
      },
      complianceTags: ['NCA-ECC', 'ISO27001'],
    });

    // Log to console for immediate visibility
    console.error('🚨 [SECURITY INCIDENT REPORTED]', {
      id: incident?._id,
      type,
      severity,
      reporter: req.user.email,
      time: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Security incident reported successfully',
      data: {
        incidentId: incident?._id || 'logged',
        type,
        severity: severity || 'high',
        status: 'under_review',
        reportedAt: new Date().toISOString(),
        nextSteps: [
          'Incident has been logged',
          'Security team will be notified',
          severity === 'critical' ? 'Immediate escalation initiated' : 'Will be reviewed within 4 hours',
        ],
      },
    });
  } catch (error) {
    console.error('Security incident reporting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report security incident',
    });
  }
});

/**
 * GET /api/security/incidents
 * Get security incidents (admin only)
 */
router.get('/incidents', authenticate, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { status, severity, type, startDate, endDate, limit = 50 } = req.query;

    const query = {
      action: 'security_incident_reported',
    };

    if (req.firmId) {
      query.firmId = req.firmId;
    }

    if (status) {
      query.status = status;
    }

    if (severity) {
      query.severity = severity;
    }

    if (type) {
      query['details.incidentType'] = type;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const incidents = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('-__v')
      .lean();

    res.status(200).json({
      success: true,
      data: incidents,
      count: incidents.length,
    });
  } catch (error) {
    console.error('Get security incidents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security incidents',
    });
  }
});

/**
 * PATCH /api/security/incidents/:id/status
 * Update incident status (admin only)
 */
router.patch('/incidents/:id/status', authenticate, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, notes } = req.body;

    const validStatuses = ['pending', 'investigating', 'contained', 'resolved', 'closed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validStatuses,
      });
    }

    const incident = await AuditLog.findByIdAndUpdate(
      id,
      {
        status,
        $push: {
          'metadata.statusHistory': {
            status,
            resolution,
            notes,
            updatedBy: req.userID,
            updatedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Incident status updated',
      data: incident,
    });
  } catch (error) {
    console.error('Update incident status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update incident status',
    });
  }
});

/**
 * GET /api/security/incidents/stats
 * Get incident statistics (admin only)
 */
router.get('/incidents/stats', authenticate, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = {
      action: 'security_incident_reported',
      timestamp: { $gte: startDate },
    };

    if (req.firmId) {
      query.firmId = req.firmId;
    }

    const [byType, bySeverity, byStatus, total] = await Promise.all([
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$details.incidentType', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: `Last ${days} days`,
        total,
        byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
        bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      },
    });
  } catch (error) {
    console.error('Get incident stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve incident statistics',
    });
  }
});

/**
 * POST /api/security/vulnerability/report
 * Report a security vulnerability (public endpoint for responsible disclosure)
 */
router.post('/vulnerability/report', async (req, res) => {
  try {
    const {
      type,
      severity,
      description,
      stepsToReproduce,
      impact,
      reporterEmail,
      reporterName,
    } = req.body;

    if (!description || !reporterEmail) {
      return res.status(400).json({
        success: false,
        error: 'Description and reporter email are required',
      });
    }

    // Log vulnerability report
    console.error('🔒 [VULNERABILITY REPORTED]', {
      type,
      severity,
      reporter: reporterEmail,
      time: new Date().toISOString(),
    });

    // Store in audit log (with system user)
    await AuditLog.log({
      userId: null, // System entry
      userEmail: reporterEmail,
      userRole: 'external',
      userName: reporterName || 'External Reporter',
      action: 'vulnerability_reported',
      entityType: 'vulnerability',
      severity: severity || 'medium',
      status: 'pending',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'],
      details: {
        type: type || 'unknown',
        description,
        stepsToReproduce,
        impact,
        reporterEmail,
        reporterName,
        reportedAt: new Date().toISOString(),
      },
      complianceTags: ['responsible-disclosure'],
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for reporting this vulnerability',
      data: {
        status: 'received',
        expectedResponse: '48 hours',
        reference: `VUL-${Date.now()}`,
      },
    });
  } catch (error) {
    console.error('Vulnerability reporting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit vulnerability report',
    });
  }
});

// ============================================
// CSP VIOLATION REPORTING ENDPOINTS
// ============================================

/**
 * POST /api/security/csp-report
 * Receive CSP violation reports from browsers
 * Public endpoint (called automatically by browser)
 *
 * Note: Must accept Content-Type: application/csp-report
 */
router.post('/csp-report', receiveCspReport);

/**
 * GET /api/security/csp-violations
 * Get CSP violation statistics (admin only)
 */
router.get('/csp-violations', authenticate, authorize('admin', 'owner'), getCspViolations);

/**
 * DELETE /api/security/csp-violations
 * Clear CSP violation statistics (admin only)
 */
router.delete('/csp-violations', authenticate, authorize('admin', 'owner'), clearCspViolations);

module.exports = router;
