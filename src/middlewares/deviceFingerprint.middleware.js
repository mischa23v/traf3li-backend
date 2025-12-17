/**
 * Device Fingerprint Middleware
 *
 * NCA ECC-2:2024 Compliance: Session Security
 * Validates device fingerprints to detect session hijacking attempts.
 *
 * Features:
 * - Stores device fingerprint with session
 * - Validates fingerprint on subsequent requests
 * - Logs suspicious activity when fingerprint mismatches
 * - Optional strict mode that blocks mismatched requests
 */

const cacheService = require('../services/cache.service');
const AuditLog = require('../models/auditLog.model');

// Configuration
const CONFIG = {
  // Cache key prefix for device fingerprints
  FINGERPRINT_PREFIX: 'device:fingerprint:',
  // How long to store fingerprint (24 hours)
  FINGERPRINT_TTL: 24 * 60 * 60,
  // Header name for device fingerprint
  HEADER_NAME: 'x-device-fingerprint',
  // Whether to block requests with mismatched fingerprints
  STRICT_MODE: process.env.DEVICE_FINGERPRINT_STRICT === 'true',
  // Allow fingerprint to be missing (for backwards compatibility)
  ALLOW_MISSING: true,
};

/**
 * Store device fingerprint for a user session
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID (JWT jti or similar)
 * @param {string} fingerprint - Device fingerprint from client
 * @param {Object} metadata - Additional metadata (IP, userAgent, etc.)
 */
async function storeDeviceFingerprint(userId, sessionId, fingerprint, metadata = {}) {
  if (!fingerprint) return;

  const key = `${CONFIG.FINGERPRINT_PREFIX}${userId}:${sessionId}`;
  const data = {
    fingerprint,
    userId,
    sessionId,
    createdAt: new Date().toISOString(),
    ...metadata,
  };

  await cacheService.set(key, data, CONFIG.FINGERPRINT_TTL);
}

/**
 * Validate device fingerprint for a request
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @param {string} currentFingerprint - Current fingerprint from request
 * @returns {Object} Validation result
 */
async function validateDeviceFingerprint(userId, sessionId, currentFingerprint) {
  const key = `${CONFIG.FINGERPRINT_PREFIX}${userId}:${sessionId}`;
  const stored = await cacheService.get(key);

  // No stored fingerprint - first request or expired
  if (!stored) {
    return {
      valid: true,
      reason: 'no_stored_fingerprint',
      isFirstRequest: true,
    };
  }

  // No current fingerprint provided
  if (!currentFingerprint) {
    return {
      valid: CONFIG.ALLOW_MISSING,
      reason: 'missing_fingerprint',
      storedFingerprint: stored.fingerprint?.substring(0, 8) + '...',
    };
  }

  // Compare fingerprints
  const match = stored.fingerprint === currentFingerprint;

  return {
    valid: match,
    reason: match ? 'fingerprint_match' : 'fingerprint_mismatch',
    storedFingerprint: stored.fingerprint?.substring(0, 8) + '...',
    currentFingerprint: currentFingerprint.substring(0, 8) + '...',
  };
}

/**
 * Middleware to validate device fingerprints
 *
 * Usage:
 * app.use('/api', authenticate, validateDeviceFingerprintMiddleware);
 */
const validateDeviceFingerprintMiddleware = async (req, res, next) => {
  try {
    // Skip if no authenticated user
    if (!req.user || !req.userID) {
      return next();
    }

    const fingerprint = req.headers[CONFIG.HEADER_NAME];
    const sessionId = req.user.jti || req.user.sessionId || req.userID;

    // Validate fingerprint
    const result = await validateDeviceFingerprint(req.userID, sessionId, fingerprint);

    // Store result in request for downstream use
    req.deviceFingerprint = {
      provided: !!fingerprint,
      ...result,
    };

    // If first request with fingerprint, store it
    if (result.isFirstRequest && fingerprint) {
      await storeDeviceFingerprint(req.userID, sessionId, fingerprint, {
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
      });
    }

    // Handle mismatch
    if (!result.valid) {
      // Log suspicious activity
      await AuditLog.log({
        userId: req.userID,
        userEmail: req.user.email || 'unknown',
        userRole: req.user.role || 'unknown',
        action: 'suspicious_activity',
        entityType: 'session',
        severity: 'high',
        status: 'suspicious',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.headers['user-agent'],
        details: {
          type: 'device_fingerprint_mismatch',
          reason: result.reason,
          storedFingerprint: result.storedFingerprint,
          currentFingerprint: result.currentFingerprint,
          endpoint: req.originalUrl,
          method: req.method,
        },
        complianceTags: ['NCA-ECC', 'session-security'],
      });

      console.warn('⚠️ [SECURITY] Device fingerprint mismatch:', {
        userId: req.userID,
        ip: req.ip,
        endpoint: req.originalUrl,
      });

      // In strict mode, block the request
      if (CONFIG.STRICT_MODE) {
        return res.status(403).json({
          success: false,
          error: 'جلسة غير صالحة - يرجى تسجيل الدخول مرة أخرى',
          error_en: 'Invalid session - please login again',
          code: 'SESSION_DEVICE_MISMATCH',
        });
      }
    }

    next();
  } catch (error) {
    console.error('Device fingerprint validation error:', error.message);
    // Don't block on errors - fail open for availability
    next();
  }
};

/**
 * Clear device fingerprint on logout
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 */
async function clearDeviceFingerprint(userId, sessionId) {
  const key = `${CONFIG.FINGERPRINT_PREFIX}${userId}:${sessionId}`;
  await cacheService.del(key);
}

module.exports = {
  storeDeviceFingerprint,
  validateDeviceFingerprint,
  validateDeviceFingerprintMiddleware,
  clearDeviceFingerprint,
  CONFIG,
};
