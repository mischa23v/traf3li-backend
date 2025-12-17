/**
 * Consent Management Routes
 *
 * PDPL (Personal Data Protection Law) Compliance
 * API endpoints for managing user consent and data subject rights.
 *
 * Endpoints:
 * - GET /api/consent - Get user's current consents
 * - POST /api/consent - Initialize consent record
 * - PUT /api/consent/:category - Update specific consent
 * - DELETE /api/consent - Withdraw all consents & request deletion
 * - POST /api/consent/export - Request data export
 * - GET /api/consent/history - Get consent history
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const Consent = require('../models/consent.model');
const AuditLog = require('../models/auditLog.model');

// Valid consent categories
const VALID_CATEGORIES = ['analytics', 'marketing', 'thirdParty', 'aiProcessing', 'communications'];

/**
 * GET /api/consent
 * Get user's current consent status
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const consent = await Consent.getOrCreate(req.userID, req.firmId);

    res.status(200).json({
      success: true,
      data: {
        consents: consent.consents,
        policyVersion: consent.policyVersion,
        lastReviewedAt: consent.lastReviewedAt,
        deletionRequest: consent.deletionRequest?.requested
          ? {
              status: consent.deletionRequest.status,
              requestedAt: consent.deletionRequest.requestedAt,
            }
          : null,
        exportRequest: consent.exportRequest?.requested
          ? {
              status: consent.exportRequest.status,
              requestedAt: consent.exportRequest.requestedAt,
              downloadUrl: consent.exportRequest.status === 'completed'
                ? consent.exportRequest.downloadUrl
                : null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Get consent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve consent status',
    });
  }
});

/**
 * POST /api/consent
 * Initialize or update all consents at once (e.g., from consent banner)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { consents, policyVersion } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'];

    let consent = await Consent.findOne({ userId: req.userID });

    if (!consent) {
      consent = new Consent({
        userId: req.userID,
        firmId: req.firmId,
        policyVersion: policyVersion || '1.0.0',
      });
    }

    // Update each consent category
    const timestamp = new Date();
    for (const [category, granted] of Object.entries(consents || {})) {
      if (!VALID_CATEGORIES.includes(category) && category !== 'essential') {
        continue;
      }

      // Cannot change essential consent
      if (category === 'essential') {
        continue;
      }

      const wasGranted = consent.consents[category]?.granted;
      const isGranted = Boolean(granted);

      consent.consents[category] = {
        granted: isGranted,
        timestamp,
        version: policyVersion || '1.0.0',
      };

      // Log change if different
      if (wasGranted !== isGranted) {
        consent.history.push({
          category,
          granted: isGranted,
          version: policyVersion || '1.0.0',
          timestamp,
          ipAddress,
          userAgent,
          method: 'explicit',
        });
      }
    }

    consent.policyVersion = policyVersion || consent.policyVersion;
    consent.lastReviewedAt = timestamp;

    await consent.save();

    // Audit log
    await AuditLog.log({
      userId: req.userID,
      userEmail: req.user?.email || 'unknown',
      userRole: req.user?.role || 'unknown',
      action: 'update',
      entityType: 'consent',
      entityId: consent._id,
      ipAddress,
      userAgent,
      details: {
        consentsUpdated: Object.keys(consents || {}),
        policyVersion,
      },
      complianceTags: ['PDPL'],
    });

    res.status(200).json({
      success: true,
      message: 'تم تحديث تفضيلات الموافقة',
      message_en: 'Consent preferences updated',
      data: {
        consents: consent.consents,
        policyVersion: consent.policyVersion,
      },
    });
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update consent preferences',
    });
  }
});

/**
 * PUT /api/consent/:category
 * Update a specific consent category
 */
router.put('/:category', authenticate, async (req, res) => {
  try {
    const { category } = req.params;
    const { granted } = req.body;

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid consent category',
        validCategories: VALID_CATEGORIES,
      });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'];

    const consent = await Consent.updateConsent(req.userID, category, Boolean(granted), {
      version: req.body.version || '1.0.0',
      ipAddress,
      userAgent,
    });

    // Audit log
    await AuditLog.log({
      userId: req.userID,
      userEmail: req.user?.email || 'unknown',
      userRole: req.user?.role || 'unknown',
      action: granted ? 'grant_access' : 'revoke_access',
      entityType: 'consent',
      entityId: consent._id,
      ipAddress,
      userAgent,
      details: {
        category,
        granted: Boolean(granted),
      },
      complianceTags: ['PDPL'],
    });

    res.status(200).json({
      success: true,
      message: granted
        ? `تم منح الموافقة على ${category}`
        : `تم سحب الموافقة على ${category}`,
      data: {
        category,
        granted: Boolean(granted),
        timestamp: consent.consents[category].timestamp,
      },
    });
  } catch (error) {
    console.error('Update consent category error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update consent',
    });
  }
});

/**
 * DELETE /api/consent
 * Withdraw all consents and request data deletion
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'];

    const consent = await Consent.withdrawAll(req.userID, {
      ipAddress,
      userAgent,
      reason,
    });

    // Audit log
    await AuditLog.log({
      userId: req.userID,
      userEmail: req.user?.email || 'unknown',
      userRole: req.user?.role || 'unknown',
      action: 'revoke_access',
      entityType: 'consent',
      entityId: consent._id,
      severity: 'high',
      ipAddress,
      userAgent,
      details: {
        action: 'withdraw_all_consents',
        deletionRequested: true,
        reason,
      },
      complianceTags: ['PDPL', 'data-deletion'],
    });

    res.status(200).json({
      success: true,
      message: 'تم سحب جميع الموافقات وطلب حذف البيانات',
      message_en: 'All consents withdrawn and data deletion requested',
      data: {
        deletionRequest: {
          status: 'pending',
          requestedAt: consent.deletionRequest.requestedAt,
          estimatedCompletion: '30 days',
        },
      },
    });
  } catch (error) {
    console.error('Withdraw consent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw consents',
    });
  }
});

/**
 * POST /api/consent/export
 * Request data export (PDPL data portability)
 */
router.post('/export', authenticate, async (req, res) => {
  try {
    const consent = await Consent.getOrCreate(req.userID, req.firmId);

    // Check if there's already a pending request
    if (consent.exportRequest?.status === 'pending' || consent.exportRequest?.status === 'processing') {
      return res.status(400).json({
        success: false,
        error: 'Data export already in progress',
        status: consent.exportRequest.status,
        requestedAt: consent.exportRequest.requestedAt,
      });
    }

    // Create export request
    consent.exportRequest = {
      requested: true,
      requestedAt: new Date(),
      status: 'pending',
    };

    await consent.save();

    // Audit log
    await AuditLog.log({
      userId: req.userID,
      userEmail: req.user?.email || 'unknown',
      userRole: req.user?.role || 'unknown',
      action: 'export_data',
      entityType: 'consent',
      entityId: consent._id,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'],
      details: {
        action: 'data_export_request',
      },
      complianceTags: ['PDPL', 'data-portability'],
    });

    res.status(202).json({
      success: true,
      message: 'تم استلام طلب تصدير البيانات',
      message_en: 'Data export request received',
      data: {
        status: 'pending',
        requestedAt: consent.exportRequest.requestedAt,
        estimatedCompletion: '7 days',
        note: 'You will be notified when your data export is ready',
      },
    });
  } catch (error) {
    console.error('Data export request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request data export',
    });
  }
});

/**
 * GET /api/consent/history
 * Get consent change history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const consent = await Consent.findOne({ userId: req.userID })
      .select('history')
      .lean();

    if (!consent) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Sort history by timestamp descending and limit
    const history = (consent.history || [])
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: history,
      total: consent.history?.length || 0,
    });
  } catch (error) {
    console.error('Get consent history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve consent history',
    });
  }
});

module.exports = router;
