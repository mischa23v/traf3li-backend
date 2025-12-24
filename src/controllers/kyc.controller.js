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

/**
 * POST /api/kyc/webhook
 * Handle verification callbacks from external services
 * (Yakeen/Wathq webhook handler)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const { source, userId, status, data } = webhookData;

    logger.info('KYC webhook received:', { source, userId, status });

    // Verify webhook signature (implement based on provider's requirements)
    // const isValid = await verifyWebhookSignature(req);
    // if (!isValid) {
    //   return res.status(401).json({ success: false, error: 'Invalid signature' });
    // }

    // Process webhook based on source
    if (source === 'yakeen' || source === 'wathq') {
      // Update user KYC status based on webhook data
      // This is a placeholder - implement based on actual webhook structure
      logger.info(`Processing ${source} webhook for user ${userId}`);

      // You would call kycService methods here to update status
      // For example:
      // if (status === 'verified') {
      //   await kycService.verifyIdentity(userId, data);
      // }
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
 */
exports.getPendingVerifications = async (req, res) => {
  try {
    const User = require('../models/user.model');

    const pendingUsers = await User.find({ kycStatus: 'pending' })
      .select('_id firstName lastName email kycStatus kycInitiatedAt kycDocuments')
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
 */
exports.getKYCStats = async (req, res) => {
  try {
    const User = require('../models/user.model');

    const [
      totalUsers,
      verifiedUsers,
      pendingUsers,
      rejectedUsers,
      expiredUsers
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ kycStatus: 'verified' }),
      User.countDocuments({ kycStatus: 'pending' }),
      User.countDocuments({ kycStatus: 'rejected' }),
      User.countDocuments({ kycStatus: 'expired' })
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
