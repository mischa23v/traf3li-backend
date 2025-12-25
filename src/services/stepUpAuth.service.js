/**
 * Step-Up Authentication Service
 *
 * Implements Supabase-style reauthentication flow for sensitive operations.
 * Requires users to verify their identity before performing high-risk actions.
 *
 * Features:
 * - Recent authentication verification
 * - Multiple verification methods (password, MFA TOTP, Email OTP, SMS OTP)
 * - Configurable time windows
 * - Redis-backed timestamp storage
 * - Rate limiting
 */

const { User } = require('../models');
const ReauthChallenge = require('../models/reauthChallenge.model');
const EmailOTP = require('../models/emailOtp.model');
const PhoneOTP = require('../models/phoneOtp.model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const cacheService = require('./cache.service');
const mfaService = require('./mfa.service');
const emailService = require('./email.service');
const logger = require('../utils/logger');

const DEFAULT_REAUTH_WINDOW_MINUTES = 24 * 60; // 24 hours

/**
 * Generate Redis key for reauthentication timestamp
 * @param {string} userId - User ID
 * @returns {string} Redis key
 */
const getReauthKey = (userId) => `reauth:${userId}:timestamp`;

/**
 * Check if user has recently authenticated
 * @param {string} userId - User ID
 * @param {number} maxAgeMinutes - Maximum age in minutes (default: 24 hours)
 * @returns {Promise<Object>} { isRecent: boolean, authenticatedAt: Date|null, expiresAt: Date|null }
 */
const verifyRecentAuth = async (userId, maxAgeMinutes = DEFAULT_REAUTH_WINDOW_MINUTES) => {
  try {
    const key = getReauthKey(userId);
    const timestamp = await cacheService.get(key);

    if (!timestamp) {
      return {
        isRecent: false,
        authenticatedAt: null,
        expiresAt: null,
        reason: 'NO_RECENT_AUTH'
      };
    }

    const authenticatedAt = new Date(timestamp);
    const expiresAt = new Date(authenticatedAt.getTime() + maxAgeMinutes * 60 * 1000);
    const now = new Date();

    const isRecent = now < expiresAt;

    return {
      isRecent,
      authenticatedAt,
      expiresAt,
      reason: isRecent ? null : 'AUTH_EXPIRED'
    };
  } catch (error) {
    logger.error('verifyRecentAuth error:', error);
    // Fail closed - require reauthentication on error
    return {
      isRecent: false,
      authenticatedAt: null,
      expiresAt: null,
      reason: 'ERROR'
    };
  }
};

/**
 * Update reauthentication timestamp
 * @param {string} userId - User ID
 * @param {number} ttlMinutes - TTL in minutes (default: 24 hours)
 * @returns {Promise<void>}
 */
const updateReauthTimestamp = async (userId, ttlMinutes = DEFAULT_REAUTH_WINDOW_MINUTES) => {
  try {
    const key = getReauthKey(userId);
    const timestamp = new Date().toISOString();
    const ttlSeconds = ttlMinutes * 60;

    await cacheService.set(key, timestamp, ttlSeconds);

    logger.debug(`Updated reauth timestamp for user ${userId}, expires in ${ttlMinutes} minutes`);
  } catch (error) {
    logger.error('updateReauthTimestamp error:', error);
    throw error;
  }
};

/**
 * Clear reauthentication timestamp (force reauthentication)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const clearReauthTimestamp = async (userId) => {
  try {
    const key = getReauthKey(userId);
    await cacheService.del(key);
    logger.debug(`Cleared reauth timestamp for user ${userId}`);
  } catch (error) {
    logger.error('clearReauthTimestamp error:', error);
    throw error;
  }
};

/**
 * Generate a 6-digit OTP code
 * @returns {string} 6-digit code
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Create reauthentication challenge with OTP
 * @param {string} userId - User ID
 * @param {string} method - Verification method ('email', 'sms', 'totp')
 * @param {string} purpose - Purpose of reauthentication
 * @param {Object} metadata - Additional metadata (IP, user agent, etc.)
 * @returns {Promise<Object>} Challenge result
 */
const createReauthChallenge = async (userId, method, purpose, metadata = {}) => {
  try {
    // Check rate limit
    const rateLimit = await ReauthChallenge.checkRateLimit(userId, purpose);
    if (rateLimit.limited) {
      return {
        success: false,
        error: rateLimit.message,
        errorAr: rateLimit.messageAr,
        code: 'RATE_LIMITED',
        waitTime: rateLimit.waitTime
      };
    }

    // Get user
    const user = await User.findById(userId).select('email phone mfaEnabled mfaSecret');
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        errorAr: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      };
    }

    // Validate method availability
    if (method === 'totp' && !user.mfaEnabled) {
      return {
        success: false,
        error: 'MFA TOTP is not enabled for this account',
        errorAr: 'المصادقة الثنائية غير مفعلة لهذا الحساب',
        code: 'MFA_NOT_ENABLED'
      };
    }

    if (method === 'sms' && !user.phone) {
      return {
        success: false,
        error: 'Phone number not registered',
        errorAr: 'رقم الهاتف غير مسجل',
        code: 'PHONE_NOT_REGISTERED'
      };
    }

    if (method === 'email' && !user.email) {
      return {
        success: false,
        error: 'Email not registered',
        errorAr: 'البريد الإلكتروني غير مسجل',
        code: 'EMAIL_NOT_REGISTERED'
      };
    }

    // Generate OTP (not needed for TOTP)
    const otp = method === 'totp' ? null : generateOTP();

    // Create challenge record
    const challenge = await ReauthChallenge.createChallenge(
      userId,
      otp || 'TOTP', // Store placeholder for TOTP
      method,
      purpose,
      10, // 10 minutes expiry
      metadata
    );

    // Send OTP based on method
    if (method === 'email') {
      try {
        await emailService.sendReauthenticationOTP(user.email, otp, purpose);
        challenge.deliveryStatus = 'sent';
        await challenge.save();
      } catch (emailError) {
        logger.error('Failed to send reauthentication email:', emailError);
        challenge.deliveryStatus = 'failed';
        challenge.deliveryError = emailError.message;
        await challenge.save();

        return {
          success: false,
          error: 'Failed to send verification email',
          errorAr: 'فشل إرسال رسالة التحقق',
          code: 'EMAIL_SEND_FAILED'
        };
      }
    } else if (method === 'sms') {
      try {
        // SMS sending would be implemented here
        // For now, we'll use the PhoneOTP model pattern
        await PhoneOTP.createOTP(user.phone, otp, 'transaction', 10, metadata);
        challenge.deliveryStatus = 'sent';
        await challenge.save();

        // TODO: Integrate with SMS provider (Twilio, etc.)
        logger.info(`SMS OTP for reauthentication: ${otp} to ${user.phone}`);
      } catch (smsError) {
        logger.error('Failed to send reauthentication SMS:', smsError);
        challenge.deliveryStatus = 'failed';
        challenge.deliveryError = smsError.message;
        await challenge.save();

        return {
          success: false,
          error: 'Failed to send verification SMS',
          errorAr: 'فشل إرسال رسالة التحقق',
          code: 'SMS_SEND_FAILED'
        };
      }
    }

    return {
      success: true,
      message: method === 'totp'
        ? 'Please enter your authenticator code'
        : `Verification code sent via ${method}`,
      messageAr: method === 'totp'
        ? 'الرجاء إدخال رمز المصادقة'
        : `تم إرسال رمز التحقق عبر ${method === 'email' ? 'البريد الإلكتروني' : 'الرسائل النصية'}`,
      challengeId: challenge._id,
      method,
      expiresAt: challenge.expiresAt
    };
  } catch (error) {
    logger.error('createReauthChallenge error:', error);
    return {
      success: false,
      error: 'Failed to create reauthentication challenge',
      errorAr: 'فشل إنشاء تحدي إعادة المصادقة',
      code: 'CHALLENGE_CREATION_FAILED'
    };
  }
};

/**
 * Verify reauthentication challenge
 * @param {string} userId - User ID
 * @param {string} code - Verification code
 * @param {string} purpose - Purpose of reauthentication
 * @param {Object} metadata - Additional metadata (IP, user agent, etc.)
 * @returns {Promise<Object>} Verification result
 */
const verifyReauthChallenge = async (userId, code, purpose, metadata = {}) => {
  try {
    // Verify the challenge
    const result = await ReauthChallenge.verifyChallenge(
      userId,
      code,
      purpose,
      metadata.ipAddress
    );

    if (!result.success) {
      return result;
    }

    // Update reauthentication timestamp on success
    await updateReauthTimestamp(userId);

    logger.info(`Reauthentication successful for user ${userId}, purpose: ${purpose}`);

    return {
      success: true,
      message: 'Reauthentication successful',
      messageAr: 'تمت إعادة المصادقة بنجاح',
      authenticatedAt: new Date()
    };
  } catch (error) {
    logger.error('verifyReauthChallenge error:', error);
    return {
      success: false,
      error: 'Failed to verify reauthentication challenge',
      errorAr: 'فشل التحقق من تحدي إعادة المصادقة',
      code: 'VERIFICATION_FAILED'
    };
  }
};

/**
 * Verify password for reauthentication
 * @param {string} userId - User ID
 * @param {string} password - Password to verify
 * @param {number} ttlMinutes - TTL for reauthentication timestamp
 * @returns {Promise<Object>} Verification result
 */
const verifyPasswordReauth = async (userId, password, ttlMinutes = DEFAULT_REAUTH_WINDOW_MINUTES) => {
  try {
    const user = await User.findById(userId).select('password');
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        errorAr: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid password',
        errorAr: 'كلمة المرور غير صحيحة',
        code: 'INVALID_PASSWORD'
      };
    }

    // Update reauthentication timestamp
    await updateReauthTimestamp(userId, ttlMinutes);

    logger.info(`Password reauthentication successful for user ${userId}`);

    return {
      success: true,
      message: 'Reauthentication successful',
      messageAr: 'تمت إعادة المصادقة بنجاح',
      authenticatedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000)
    };
  } catch (error) {
    logger.error('verifyPasswordReauth error:', error);
    return {
      success: false,
      error: 'Failed to verify password',
      errorAr: 'فشل التحقق من كلمة المرور',
      code: 'VERIFICATION_FAILED'
    };
  }
};

/**
 * Verify MFA TOTP for reauthentication
 * @param {string} userId - User ID
 * @param {string} totpCode - TOTP code
 * @param {number} ttlMinutes - TTL for reauthentication timestamp
 * @returns {Promise<Object>} Verification result
 */
const verifyTOTPReauth = async (userId, totpCode, ttlMinutes = DEFAULT_REAUTH_WINDOW_MINUTES) => {
  try {
    const user = await User.findById(userId).select('mfaEnabled mfaSecret');
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        errorAr: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND'
      };
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return {
        success: false,
        error: 'MFA is not enabled',
        errorAr: 'المصادقة الثنائية غير مفعلة',
        code: 'MFA_NOT_ENABLED'
      };
    }

    // Decrypt and verify TOTP
    const decryptedSecret = mfaService.decryptMFASecret(user.mfaSecret);
    const isValid = mfaService.verifyTOTP(decryptedSecret, totpCode);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid TOTP code',
        errorAr: 'رمز المصادقة غير صحيح',
        code: 'INVALID_TOTP'
      };
    }

    // Update reauthentication timestamp
    await updateReauthTimestamp(userId, ttlMinutes);

    logger.info(`TOTP reauthentication successful for user ${userId}`);

    return {
      success: true,
      message: 'Reauthentication successful',
      messageAr: 'تمت إعادة المصادقة بنجاح',
      authenticatedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000)
    };
  } catch (error) {
    logger.error('verifyTOTPReauth error:', error);
    return {
      success: false,
      error: 'Failed to verify TOTP',
      errorAr: 'فشل التحقق من رمز المصادقة',
      code: 'VERIFICATION_FAILED'
    };
  }
};

module.exports = {
  verifyRecentAuth,
  updateReauthTimestamp,
  clearReauthTimestamp,
  createReauthChallenge,
  verifyReauthChallenge,
  verifyPasswordReauth,
  verifyTOTPReauth,
  DEFAULT_REAUTH_WINDOW_MINUTES
};
