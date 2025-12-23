/**
 * IP Restriction Middleware
 * Enforces firm-level IP whitelisting for enhanced security
 *
 * Features:
 * - Checks client IP against firm's whitelist
 * - Supports X-Forwarded-For header (reverse proxy)
 * - Bypasses non-firm routes
 * - Logs blocked attempts to audit log
 * - Notifies admins of blocked attempts
 *
 * Usage:
 * - Apply globally to all authenticated routes
 * - Automatically bypasses if IP whitelisting is disabled
 * - Requires user to be authenticated (userMiddleware)
 */

const logger = require('../utils/logger');
const ipRestrictionService = require('../services/ipRestriction.service');
const { getClientIP } = require('./adminIPWhitelist.middleware');

/**
 * IP Restriction Middleware
 * Checks if client IP is allowed to access firm resources
 */
const ipRestrictionMiddleware = async (req, res, next) => {
  try {
    // Only apply to authenticated users
    if (!req.user && !req.userID && !req.userId) {
      return next();
    }

    // Get user ID
    const userId = req.user?._id || req.user?.id || req.userID || req.userId;

    // Get user's firm ID
    let firmId = req.firmId || req.user?.firmId;

    // If no firm ID yet, try to get it from user
    if (!firmId && userId) {
      try {
        const User = require('../models/user.model');
        const user = await User.findById(userId).select('firmId').lean();
        firmId = user?.firmId;
      } catch (error) {
        logger.error('Failed to get user firmId:', error);
      }
    }

    // Bypass if no firm (solo lawyers, personal accounts)
    if (!firmId) {
      return next();
    }

    // Get client IP
    const clientIP = getClientIP(req);

    if (!clientIP) {
      logger.error('IP Restriction: Could not determine client IP');
      return res.status(403).json({
        success: false,
        error: 'غير قادر على تحديد عنوان IP',
        error_en: 'Unable to determine IP address',
        code: 'IP_DETECTION_FAILED'
      });
    }

    // Check if IP is allowed
    const { allowed, reason, expiresAt } = await ipRestrictionService.isIPAllowed(clientIP, firmId);

    if (!allowed) {
      // Log blocked attempt
      await ipRestrictionService.logBlockedAttempt(firmId, clientIP, {
        userId,
        ipAddress: clientIP,
        userAgent: req.headers['user-agent'],
        endpoint: `${req.method} ${req.originalUrl}`,
        method: req.method,
        url: req.originalUrl
      });

      logger.warn('🚨 IP RESTRICTION: Access blocked', {
        firmId,
        userId,
        clientIP,
        reason,
        endpoint: `${req.method} ${req.originalUrl}`
      });

      return res.status(403).json({
        success: false,
        error: 'الوصول محظور من هذا العنوان',
        error_en: 'Access denied from this IP address',
        code: 'IP_NOT_WHITELISTED',
        details: {
          clientIP,
          reason,
          message: 'Your IP address is not authorized to access this firm. Please contact your administrator to whitelist your IP.'
        }
      });
    }

    // IP is allowed - attach info to request
    req.ipRestriction = {
      allowed: true,
      clientIP,
      reason,
      expiresAt
    };

    // Record usage if temporary allowance
    if (reason === 'IP in temporary whitelist' && expiresAt) {
      try {
        const TemporaryIPAllowance = require('../models/temporaryIPAllowance.model');
        await TemporaryIPAllowance.findOneAndUpdate(
          {
            firmId,
            ipAddress: clientIP,
            isActive: true,
            expiresAt: { $gt: new Date() }
          },
          {
            lastUsedAt: new Date(),
            $inc: { usageCount: 1 }
          }
        );
      } catch (error) {
        logger.error('Failed to record temporary IP usage:', error);
      }
    }

    next();
  } catch (error) {
    logger.error('IP Restriction Middleware error:', error);
    // On error, fail open (allow access) to prevent lockout
    // But log the error for investigation
    logger.error('⚠️  IP restriction check failed - allowing access (fail-open)', {
      error: error.message,
      stack: error.stack
    });
    next();
  }
};

/**
 * Optional: IP Restriction with custom error handler
 * Use when you want more control over error responses
 */
const ipRestrictionWithOptions = (options = {}) => {
  const {
    bypassRoutes = [],
    strictMode = false, // If true, fail closed on error instead of open
    customErrorHandler = null
  } = options;

  return async (req, res, next) => {
    try {
      // Check if route should bypass IP restriction
      const shouldBypass = bypassRoutes.some(route => {
        if (typeof route === 'string') {
          return req.path.startsWith(route);
        }
        if (route instanceof RegExp) {
          return route.test(req.path);
        }
        return false;
      });

      if (shouldBypass) {
        return next();
      }

      // Run standard IP restriction check
      await ipRestrictionMiddleware(req, res, next);
    } catch (error) {
      if (customErrorHandler) {
        return customErrorHandler(error, req, res, next);
      }

      if (strictMode) {
        // Fail closed - block access on error
        return res.status(500).json({
          success: false,
          error: 'خطأ في التحقق من عنوان IP',
          error_en: 'IP restriction check failed',
          code: 'IP_CHECK_ERROR'
        });
      }

      // Fail open - allow access on error
      next();
    }
  };
};

/**
 * Middleware to bypass IP restriction for specific routes
 * Use for public endpoints or auth endpoints
 */
const bypassIPRestriction = (req, res, next) => {
  req.bypassIPRestriction = true;
  next();
};

/**
 * Check if current request has IP restriction bypass
 */
const hasIPRestrictionBypass = (req) => {
  return req.bypassIPRestriction === true;
};

module.exports = {
  ipRestrictionMiddleware,
  ipRestrictionWithOptions,
  bypassIPRestriction,
  hasIPRestrictionBypass
};
