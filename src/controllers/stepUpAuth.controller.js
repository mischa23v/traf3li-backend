/**
 * Step-Up Authentication Controller
 *
 * Handles reauthentication endpoints for sensitive operations.
 * Supports password, MFA TOTP, Email OTP, and SMS OTP verification methods.
 */

const stepUpAuthService = require('../services/stepUpAuth.service');
const logger = require('../utils/logger');

/**
 * POST /api/auth/reauthenticate
 * Verify password or MFA TOTP for reauthentication
 *
 * @body {string} method - 'password' or 'totp'
 * @body {string} password - Password (if method is 'password')
 * @body {string} totpCode - TOTP code (if method is 'totp')
 * @body {number} ttlMinutes - Optional TTL in minutes (default: 24 hours)
 */
const reauthenticate = async (req, res) => {
  try {
    const userId = req.userID || req.userId;
    const { method, password, totpCode, ttlMinutes } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        messageEn: 'Authentication required',
        messageAr: 'المصادقة مطلوبة',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!method || !['password', 'totp'].includes(method)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid or missing method. Must be "password" or "totp"',
        messageEn: 'Invalid or missing method. Must be "password" or "totp"',
        messageAr: 'طريقة غير صالحة أو مفقودة. يجب أن تكون "password" أو "totp"',
        code: 'INVALID_METHOD'
      });
    }

    let result;

    if (method === 'password') {
      if (!password) {
        return res.status(400).json({
          error: true,
          message: 'Password is required',
          messageEn: 'Password is required',
          messageAr: 'كلمة المرور مطلوبة',
          code: 'PASSWORD_REQUIRED'
        });
      }

      result = await stepUpAuthService.verifyPasswordReauth(userId, password, ttlMinutes);
    } else if (method === 'totp') {
      if (!totpCode) {
        return res.status(400).json({
          error: true,
          message: 'TOTP code is required',
          messageEn: 'TOTP code is required',
          messageAr: 'رمز المصادقة مطلوب',
          code: 'TOTP_REQUIRED'
        });
      }

      result = await stepUpAuthService.verifyTOTPReauth(userId, totpCode, ttlMinutes);
    }

    if (!result.success) {
      const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : 401;
      return res.status(statusCode).json({
        error: true,
        message: result.error,
        messageEn: result.error,
        messageAr: result.errorAr,
        code: result.code
      });
    }

    logger.info(`Reauthentication successful via ${method}`, {
      userId,
      method,
      ip: req.ip
    });

    return res.status(200).json({
      error: false,
      message: result.message,
      messageEn: result.message,
      messageAr: result.messageAr,
      authenticatedAt: result.authenticatedAt,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    logger.error('Reauthenticate error:', {
      error: error.message,
      stack: error.stack,
      userId: req.userID || req.userId
    });

    return res.status(500).json({
      error: true,
      message: 'Reauthentication failed',
      messageEn: 'Reauthentication failed',
      messageAr: 'فشلت إعادة المصادقة',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * POST /api/auth/reauthenticate/challenge
 * Request OTP for reauthentication (email or SMS)
 *
 * @body {string} method - 'email' or 'sms'
 * @body {string} purpose - Purpose of reauthentication
 */
const createReauthChallenge = async (req, res) => {
  try {
    const userId = req.userID || req.userId;
    const { method, purpose } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        messageEn: 'Authentication required',
        messageAr: 'المصادقة مطلوبة',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!method || !['email', 'sms'].includes(method)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid or missing method. Must be "email" or "sms"',
        messageEn: 'Invalid or missing method. Must be "email" or "sms"',
        messageAr: 'طريقة غير صالحة أو مفقودة. يجب أن تكون "email" أو "sms"',
        code: 'INVALID_METHOD'
      });
    }

    const validPurposes = [
      'password_change',
      'mfa_enable',
      'mfa_disable',
      'account_deletion',
      'payment_method',
      'security_settings',
      'sensitive_operation'
    ];

    const purposeValue = purpose || 'sensitive_operation';
    if (!validPurposes.includes(purposeValue)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid purpose',
        messageEn: 'Invalid purpose',
        messageAr: 'غرض غير صالح',
        code: 'INVALID_PURPOSE'
      });
    }

    const metadata = {
      ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
      userAgent: req.headers['user-agent']
    };

    const result = await stepUpAuthService.createReauthChallenge(
      userId,
      method,
      purposeValue,
      metadata
    );

    if (!result.success) {
      const statusCode = result.code === 'RATE_LIMITED' ? 429 : 400;
      return res.status(statusCode).json({
        error: true,
        message: result.error,
        messageEn: result.error,
        messageAr: result.errorAr,
        code: result.code,
        waitTime: result.waitTime
      });
    }

    logger.info(`Reauthentication challenge created via ${method}`, {
      userId,
      method,
      purpose: purposeValue,
      challengeId: result.challengeId
    });

    return res.status(200).json({
      error: false,
      message: result.message,
      messageEn: result.message,
      messageAr: result.messageAr,
      challengeId: result.challengeId,
      method: result.method,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    logger.error('Create reauth challenge error:', {
      error: error.message,
      stack: error.stack,
      userId: req.userID || req.userId
    });

    return res.status(500).json({
      error: true,
      message: 'Failed to create reauthentication challenge',
      messageEn: 'Failed to create reauthentication challenge',
      messageAr: 'فشل إنشاء تحدي إعادة المصادقة',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * POST /api/auth/reauthenticate/verify
 * Verify OTP for reauthentication
 *
 * @body {string} code - OTP code
 * @body {string} purpose - Purpose of reauthentication
 */
const verifyReauthChallenge = async (req, res) => {
  try {
    const userId = req.userID || req.userId;
    const { code, purpose } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        messageEn: 'Authentication required',
        messageAr: 'المصادقة مطلوبة',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!code) {
      return res.status(400).json({
        error: true,
        message: 'Verification code is required',
        messageEn: 'Verification code is required',
        messageAr: 'رمز التحقق مطلوب',
        code: 'CODE_REQUIRED'
      });
    }

    const validPurposes = [
      'password_change',
      'mfa_enable',
      'mfa_disable',
      'account_deletion',
      'payment_method',
      'security_settings',
      'sensitive_operation'
    ];

    const purposeValue = purpose || 'sensitive_operation';
    if (!validPurposes.includes(purposeValue)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid purpose',
        messageEn: 'Invalid purpose',
        messageAr: 'غرض غير صالح',
        code: 'INVALID_PURPOSE'
      });
    }

    const metadata = {
      ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0],
      userAgent: req.headers['user-agent']
    };

    const result = await stepUpAuthService.verifyReauthChallenge(
      userId,
      code,
      purposeValue,
      metadata
    );

    if (!result.success) {
      return res.status(401).json({
        error: true,
        message: result.error,
        messageEn: result.error,
        messageAr: result.errorAr,
        code: result.code,
        attemptsLeft: result.attemptsLeft
      });
    }

    logger.info('Reauthentication challenge verified', {
      userId,
      purpose: purposeValue
    });

    return res.status(200).json({
      error: false,
      message: result.message,
      messageEn: result.message,
      messageAr: result.messageAr,
      authenticatedAt: result.authenticatedAt
    });
  } catch (error) {
    logger.error('Verify reauth challenge error:', {
      error: error.message,
      stack: error.stack,
      userId: req.userID || req.userId
    });

    return res.status(500).json({
      error: true,
      message: 'Failed to verify reauthentication challenge',
      messageEn: 'Failed to verify reauthentication challenge',
      messageAr: 'فشل التحقق من تحدي إعادة المصادقة',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * GET /api/auth/reauthenticate/status
 * Check reauthentication status
 */
const getReauthStatus = async (req, res) => {
  try {
    const userId = req.userID || req.userId;
    const { maxAgeMinutes } = req.query;

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        messageEn: 'Authentication required',
        messageAr: 'المصادقة مطلوبة',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const maxAge = maxAgeMinutes
      ? parseInt(maxAgeMinutes, 10)
      : stepUpAuthService.DEFAULT_REAUTH_WINDOW_MINUTES;

    const status = await stepUpAuthService.verifyRecentAuth(userId, maxAge);

    return res.status(200).json({
      error: false,
      isRecent: status.isRecent,
      authenticatedAt: status.authenticatedAt,
      expiresAt: status.expiresAt,
      reason: status.reason,
      maxAgeMinutes: maxAge
    });
  } catch (error) {
    logger.error('Get reauth status error:', {
      error: error.message,
      stack: error.stack,
      userId: req.userID || req.userId
    });

    return res.status(500).json({
      error: true,
      message: 'Failed to get reauthentication status',
      messageEn: 'Failed to get reauthentication status',
      messageAr: 'فشل الحصول على حالة إعادة المصادقة',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  reauthenticate,
  createReauthChallenge,
  verifyReauthChallenge,
  getReauthStatus
};
