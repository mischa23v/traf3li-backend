/**
 * KYC Controller
 *
 * Handles HTTP requests for KYC/AML verification endpoints
 */

const kycService = require('../services/kyc.service');
const logger = require('../utils/logger');

/**
 * POST /api/kyc/initiate
 * Initiate KYC verification process
 */
exports.initiateVerification = async (req, res) => {
  try {
    const userId = req.userID; // From authenticate middleware
    const { documentType } = req.body;

    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required',
        errorAr: 'نوع المستند مطلوب'
      });
    }

    const result = await kycService.initiateVerification(userId, documentType);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in initiateVerification controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate KYC verification',
      errorAr: 'فشل بدء عملية التحقق من الهوية'
    });
  }
};

/**
 * POST /api/kyc/verify
 * Verify identity using provided document data
 */
exports.verifyIdentity = async (req, res) => {
  try {
    const userId = req.userID;
    const documentData = req.body;

    // Validate required fields based on document type
    const { documentType } = documentData;

    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required',
        errorAr: 'نوع المستند مطلوب'
      });
    }

    if ((documentType === 'national_id' || documentType === 'iqama') && (!documentData.nationalId || !documentData.birthDate)) {
      return res.status(400).json({
        success: false,
        error: 'National ID and birth date are required',
        errorAr: 'رقم الهوية وتاريخ الميلاد مطلوبان'
      });
    }

    if (documentType === 'commercial_registration' && !documentData.crNumber) {
      return res.status(400).json({
        success: false,
        error: 'Commercial registration number is required',
        errorAr: 'رقم السجل التجاري مطلوب'
      });
    }

    const result = await kycService.verifyIdentity(userId, documentData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in verifyIdentity controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify identity',
      errorAr: 'فشل التحقق من الهوية'
    });
  }
};

/**
 * POST /api/kyc/submit
 * Submit KYC document
 */
exports.submitDocument = async (req, res) => {
  try {
    const userId = req.userID;
    const documentData = req.body;

    const { type, fileUrl } = documentData;

    if (!type || !fileUrl) {
      return res.status(400).json({
        success: false,
        error: 'Document type and file URL are required',
        errorAr: 'نوع المستند ورابط الملف مطلوبان'
      });
    }

    const result = await kycService.submitDocument(userId, documentData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in submitDocument controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit document',
      errorAr: 'فشل إرسال المستند'
    });
  }
};

/**
 * GET /api/kyc/status
 * Get KYC verification status
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.userID;

    const result = await kycService.checkVerificationStatus(userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in getStatus controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get KYC status',
      errorAr: 'فشل الحصول على حالة التحقق من الهوية'
    });
  }
};

/**
 * GET /api/kyc/history
 * Get KYC verification history
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.userID;

    const result = await kycService.getVerificationHistory(userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in getHistory controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get KYC history',
      errorAr: 'فشل الحصول على سجل التحقق من الهوية'
    });
  }
};

// Webhook signature verification is now handled by centralized middleware
// See: src/middlewares/webhookAuth.middleware.js
// The handleWebhook endpoint should be protected by:
// router.post('/webhook', createWebhookAuth('yakeen'), kycController.handleWebhook);
// or use autoDetectWebhookAuth() for auto-detection

/**
 * POST /api/kyc/webhook
 * Handle verification callbacks from external services
 * (Yakeen/Wathq webhook handler)
 *
 * SECURITY: This endpoint should be protected by the webhookAuth middleware
 * in the routes file:
 * router.post('/webhook', autoDetectWebhookAuth(), kycController.handleWebhook);
 *
 * The middleware will verify the webhook signature before this handler runs.
 * If req.webhookVerified is true, the signature was valid.
 */
exports.handleWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const { source, userId, status, data } = webhookData;

    logger.info('KYC webhook received:', { source, userId, status });

    // SECURITY: Verify webhook was authenticated by middleware
    if (!req.webhookVerified) {
      logger.warn('Webhook not verified by middleware', { source, userId });
      return res.status(401).json({
        success: false,
        error: 'Webhook authentication required'
      });
    }

    // Validate source
    if (!source || !['yakeen', 'wathq'].includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing webhook source'
      });
    }

    // Process webhook based on source
    if (source === 'yakeen' || source === 'wathq') {
      logger.info(`Processing ${source} webhook for user ${userId}`);

      // Update user KYC status based on webhook data
      if (status === 'verified' && userId && data) {
        await kycService.verifyIdentity(userId, {
          documentType: data.documentType || 'national_id',
          nationalId: data.nationalId,
          birthDate: data.birthDate,
          verified: true,
          verificationSource: source
        });
      } else if (status === 'rejected' && userId) {
        const User = require('../models/user.model');
        await User.findByIdAndUpdate(userId, {
          kycStatus: 'rejected',
          kycRejectedAt: new Date(),
          kycRejectionReason: data?.reason || 'Verification failed'
        });
      }
    }

    // Return success to acknowledge webhook receipt
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    logger.error('Error processing KYC webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
};

/**
 * POST /api/kyc/review
 * Admin endpoint to manually review and approve/reject KYC
 */
exports.reviewKYC = async (req, res) => {
  try {
    const reviewerId = req.userID;
    const { userId, approved, notes, documentIndex } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        errorAr: 'معرف المستخدم مطلوب'
      });
    }

    if (approved === undefined || approved === null) {
      return res.status(400).json({
        success: false,
        error: 'Approval decision is required',
        errorAr: 'قرار الموافقة مطلوب'
      });
    }

    const result = await kycService.reviewKYC(userId, reviewerId, {
      approved,
      notes,
      documentIndex
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in reviewKYC controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to review KYC',
      errorAr: 'فشل مراجعة التحقق من الهوية'
    });
  }
};

/**
 * GET /api/kyc/admin/pending
 * Admin endpoint to get all pending KYC verifications
 * SECURITY: Scoped to admin's firm unless super admin
 */
exports.getPendingVerifications = async (req, res) => {
  try {
    const User = require('../models/user.model');

    // Get firm context for multi-tenancy
    const firmId = req.firmId || req.user?.firmId;
    const isSuperAdmin = req.user?.role === 'admin' && !firmId;

    // Build filter with firm scope (unless super admin)
    const filter = { kycStatus: 'pending' };
    if (!isSuperAdmin && firmId) {
      filter.firmId = firmId;
    }

    const pendingUsers = await User.find(filter)
      .select('_id firstName lastName email kycStatus kycInitiatedAt kycDocuments firmId')
      .sort({ kycInitiatedAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: {
        count: pendingUsers.length,
        users: pendingUsers
      }
    });
  } catch (error) {
    logger.error('Error getting pending verifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get pending verifications',
      errorAr: 'فشل الحصول على عمليات التحقق المعلقة'
    });
  }
};

/**
 * GET /api/kyc/admin/stats
 * Admin endpoint to get KYC statistics
 * SECURITY: Scoped to admin's firm unless super admin
 */
exports.getKYCStats = async (req, res) => {
  try {
    const User = require('../models/user.model');

    // Get firm context for multi-tenancy
    const firmId = req.firmId || req.user?.firmId;
    const isSuperAdmin = req.user?.role === 'admin' && !firmId;

    // Build base filter with firm scope (unless super admin)
    const baseFilter = {};
    if (!isSuperAdmin && firmId) {
      baseFilter.firmId = firmId;
    }

    const [
      totalUsers,
      verifiedUsers,
      pendingUsers,
      rejectedUsers,
      expiredUsers
    ] = await Promise.all([
      User.countDocuments(baseFilter),
      User.countDocuments({ ...baseFilter, kycStatus: 'verified' }),
      User.countDocuments({ ...baseFilter, kycStatus: 'pending' }),
      User.countDocuments({ ...baseFilter, kycStatus: 'rejected' }),
      User.countDocuments({ ...baseFilter, kycStatus: 'expired' })
    ]);

    const verificationRate = totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        pendingUsers,
        rejectedUsers,
        expiredUsers,
        verificationRate: parseFloat(verificationRate)
      }
    });
  } catch (error) {
    logger.error('Error getting KYC stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get KYC statistics',
      errorAr: 'فشل الحصول على إحصائيات التحقق من الهوية'
    });
  }
};
