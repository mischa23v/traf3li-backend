/**
 * Step-Up Authentication Middleware
 *
 * Enforces recent authentication for sensitive operations.
 * Similar to Supabase Auth's reauthentication requirement.
 *
 * Returns 401 with REAUTHENTICATION_REQUIRED code if user hasn't
 * authenticated recently within the specified time window.
 */

const stepUpAuthService = require('../services/stepUpAuth.service');
const logger = require('../utils/logger');

/**
 * Middleware factory to require recent authentication
 * @param {number} maxAgeMinutes - Maximum age of authentication in minutes
 * @param {Object} options - Additional options
 * @param {string} options.purpose - Purpose description for logging
 * @param {string} options.reauthPath - Custom path for reauthentication (default: /api/auth/reauthenticate)
 * @returns {Function} Express middleware
 */
const requireRecentAuth = (maxAgeMinutes = stepUpAuthService.DEFAULT_REAUTH_WINDOW_MINUTES, options = {}) => {
  return async (req, res, next) => {
    try {
      // Get user ID from authenticated request
      const userId = req.userID || req.userId || req.user?._id;

      if (!userId) {
        logger.warn('requireRecentAuth: No user ID in request', {
          endpoint: req.originalUrl,
          method: req.method
        });

        return res.status(401).json({
          error: true,
          message: 'Authentication required',
          messageEn: 'Authentication required',
          messageAr: 'المصادقة مطلوبة',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Check if user has recently authenticated
      const authStatus = await stepUpAuthService.verifyRecentAuth(userId, maxAgeMinutes);

      if (!authStatus.isRecent) {
        const purpose = options.purpose || 'sensitive operation';
        const reauthPath = options.reauthPath || '/api/auth/reauthenticate';

        logger.info('requireRecentAuth: Reauthentication required', {
          userId,
          endpoint: req.originalUrl,
          method: req.method,
          purpose,
          reason: authStatus.reason,
          authenticatedAt: authStatus.authenticatedAt,
          maxAgeMinutes
        });

        return res.status(401).json({
          error: true,
          message: 'Recent authentication required for this operation',
          messageEn: 'Recent authentication required for this operation',
          messageAr: 'يتطلب هذا الإجراء إعادة المصادقة',
          code: 'REAUTHENTICATION_REQUIRED',
          reauthUrl: reauthPath,
          maxAgeMinutes,
          authenticatedAt: authStatus.authenticatedAt,
          reason: authStatus.reason,
          details: {
            message: 'Please verify your identity to continue',
            messageAr: 'الرجاء التحقق من هويتك للمتابعة'
          }
        });
      }

      // User has recently authenticated, proceed
      logger.debug('requireRecentAuth: Recent authentication verified', {
        userId,
        endpoint: req.originalUrl,
        authenticatedAt: authStatus.authenticatedAt,
        expiresAt: authStatus.expiresAt
      });

      // Attach auth status to request for controllers to use
      req.reauthStatus = authStatus;

      next();
    } catch (error) {
      logger.error('requireRecentAuth middleware error:', {
        error: error.message,
        stack: error.stack,
        endpoint: req.originalUrl
      });

      // Fail closed - require reauthentication on error
      return res.status(401).json({
        error: true,
        message: 'Authentication verification failed',
        messageEn: 'Authentication verification failed',
        messageAr: 'فشل التحقق من المصادقة',
        code: 'REAUTHENTICATION_REQUIRED',
        reauthUrl: options.reauthPath || '/api/auth/reauthenticate'
      });
    }
  };
};

/**
 * Predefined middleware for common use cases
 */

// Very strict - 5 minutes for critical operations (payments, account deletion)
const requireVeryRecentAuth = (options = {}) => {
  return requireRecentAuth(5, {
    ...options,
    purpose: options.purpose || 'critical operation'
  });
};

// Moderate - 1 hour for sensitive settings
const requireRecentAuthHourly = (options = {}) => {
  return requireRecentAuth(60, {
    ...options,
    purpose: options.purpose || 'sensitive settings'
  });
};

// Default - 24 hours for general sensitive operations
const requireRecentAuthDaily = (options = {}) => {
  return requireRecentAuth(24 * 60, {
    ...options,
    purpose: options.purpose || 'sensitive operation'
  });
};

module.exports = {
  requireRecentAuth,
  requireVeryRecentAuth,
  requireRecentAuthHourly,
  requireRecentAuthDaily
};
