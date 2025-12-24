/**
 * KYC Verification Middleware
 *
 * Middleware to enforce KYC verification for sensitive operations.
 * Ensures users have completed and passed KYC verification before accessing protected routes.
 *
 * Usage:
 * router.post('/sensitive-operation', authenticate, requireKYC, controller.method);
 */

const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Middleware to require valid KYC verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requireKYC = async (req, res, next) => {
  try {
    // User ID should be set by authenticate middleware
    const userId = req.userID;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorAr: 'المصادقة مطلوبة',
        code: 'AUTH_REQUIRED'
      });
    }

    // Fetch user with KYC fields
    const user = await User.findById(userId)
      .select('kycStatus kycVerifiedAt kycExpiresAt firstName lastName email');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        errorAr: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if KYC status exists
    if (!user.kycStatus) {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required. Please complete identity verification.',
        errorAr: 'التحقق من الهوية مطلوب. يرجى إكمال عملية التحقق من الهوية.',
        code: 'KYC_NOT_INITIATED',
        kycStatus: null,
        redirectTo: '/kyc/initiate'
      });
    }

    // Check if KYC is pending
    if (user.kycStatus === 'pending') {
      return res.status(403).json({
        success: false,
        error: 'KYC verification is pending. Please wait for approval.',
        errorAr: 'التحقق من الهوية قيد المراجعة. يرجى الانتظار للموافقة.',
        code: 'KYC_PENDING',
        kycStatus: 'pending',
        kycInitiatedAt: user.kycInitiatedAt
      });
    }

    // Check if KYC was rejected
    if (user.kycStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'KYC verification was rejected. Please contact support.',
        errorAr: 'تم رفض التحقق من الهوية. يرجى الاتصال بالدعم.',
        code: 'KYC_REJECTED',
        kycStatus: 'rejected',
        rejectionReason: user.kycRejectionReason
      });
    }

    // Check if KYC has expired
    if (user.kycStatus === 'expired' || (user.kycExpiresAt && new Date(user.kycExpiresAt) < new Date())) {
      // Update status to expired if not already
      if (user.kycStatus !== 'expired') {
        user.kycStatus = 'expired';
        await user.save();
      }

      return res.status(403).json({
        success: false,
        error: 'KYC verification has expired. Please renew your verification.',
        errorAr: 'انتهت صلاحية التحقق من الهوية. يرجى تجديد التحقق.',
        code: 'KYC_EXPIRED',
        kycStatus: 'expired',
        kycExpiresAt: user.kycExpiresAt,
        redirectTo: '/kyc/initiate'
      });
    }

    // Check if KYC is verified
    if (user.kycStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required',
        errorAr: 'التحقق من الهوية مطلوب',
        code: 'KYC_NOT_VERIFIED',
        kycStatus: user.kycStatus
      });
    }

    // KYC is valid - allow access
    // Attach KYC info to request for use in controllers
    req.kycVerified = true;
    req.kycVerifiedAt = user.kycVerifiedAt;
    req.kycExpiresAt = user.kycExpiresAt;

    next();
  } catch (error) {
    logger.error('Error in requireKYC middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify KYC status',
      errorAr: 'فشل التحقق من حالة الهوية',
      code: 'KYC_CHECK_FAILED'
    });
  }
};

/**
 * Middleware to check KYC but not require it (soft check)
 * Sets req.kycVerified flag but doesn't block access
 */
const checkKYC = async (req, res, next) => {
  try {
    const userId = req.userID;

    if (!userId) {
      req.kycVerified = false;
      return next();
    }

    const user = await User.findById(userId)
      .select('kycStatus kycVerifiedAt kycExpiresAt');

    if (!user) {
      req.kycVerified = false;
      return next();
    }

    // Check if KYC is valid
    const isValid = user.kycStatus === 'verified' &&
                    (!user.kycExpiresAt || new Date(user.kycExpiresAt) > new Date());

    req.kycVerified = isValid;
    req.kycStatus = user.kycStatus;
    req.kycVerifiedAt = user.kycVerifiedAt;
    req.kycExpiresAt = user.kycExpiresAt;

    next();
  } catch (error) {
    logger.error('Error in checkKYC middleware:', error);
    req.kycVerified = false;
    next();
  }
};

/**
 * Middleware to require KYC for specific user roles
 * @param {Array} roles - Array of roles that require KYC
 */
const requireKYCForRoles = (roles = []) => {
  return async (req, res, next) => {
    try {
      const userId = req.userID;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          errorAr: 'المصادقة مطلوبة'
        });
      }

      const user = await User.findById(userId)
        .select('role kycStatus kycVerifiedAt kycExpiresAt');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          errorAr: 'المستخدم غير موجود'
        });
      }

      // Check if user's role requires KYC
      if (roles.includes(user.role)) {
        // Apply KYC requirement
        return requireKYC(req, res, next);
      }

      // Role doesn't require KYC, proceed
      next();
    } catch (error) {
      logger.error('Error in requireKYCForRoles middleware:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify KYC status',
        errorAr: 'فشل التحقق من حالة الهوية'
      });
    }
  };
};

module.exports = {
  requireKYC,
  checkKYC,
  requireKYCForRoles
};
