/**
 * OTP Utility for TRAF3LI
 * Handles OTP generation, validation, and security
 */

const crypto = require('crypto');

/**
 * Generate a secure random OTP without modulo bias
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} - Numeric OTP code
 */
const generateOTP = (length = 6) => {
  const otpLength = parseInt(process.env.OTP_LENGTH) || length;
  let otp = '';

  // SECURITY FIX: Use crypto.randomInt to avoid modulo bias
  // crypto.randomInt provides uniform distribution across the range
  for (let i = 0; i < otpLength; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }

  return otp;
};

/**
 * Hash OTP for secure storage using HMAC-SHA256
 * SECURITY FIX: Use HMAC instead of SHA256 with string concatenation
 * to prevent length extension attacks
 * @param {string} otp - Plain OTP code
 * @returns {string} - Hashed OTP
 */
const hashOTP = (otp) => {
  const salt = process.env.OTP_SECRET_SALT;
  if (!salt) {
    throw new Error('OTP_SECRET_SALT environment variable must be set');
  }
  // SECURITY: Use HMAC-SHA256 instead of SHA256 with string concatenation
  return crypto
    .createHmac('sha256', salt)
    .update(otp)
    .digest('hex');
};

/**
 * Verify OTP against hash
 * @param {string} otp - Plain OTP to verify
 * @param {string} hashedOTP - Stored hashed OTP
 * @returns {boolean} - Whether OTP matches
 */
const verifyOTPHash = (otp, hashedOTP) => {
  const inputHash = hashOTP(otp);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(inputHash),
      Buffer.from(hashedOTP)
    );
  } catch (e) {
    return false;
  }
};

/**
 * Calculate OTP expiry time
 * @param {number} minutes - Expiry duration in minutes
 * @returns {Date} - Expiry timestamp
 */
const calculateExpiry = (minutes) => {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || minutes || 5;
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
};

/**
 * Check if OTP has expired
 * @param {Date} expiryTime - OTP expiry timestamp
 * @returns {boolean} - Whether OTP is expired
 */
const isExpired = (expiryTime) => {
  return new Date() > new Date(expiryTime);
};

/**
 * Format phone number for consistent storage
 * @param {string} phoneNumber - Input phone number
 * @returns {string} - Formatted phone number (966XXXXXXXXX)
 */
const formatPhoneForStorage = (phoneNumber) => {
  let cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    cleaned = '966' + cleaned;
  } else if (cleaned.startsWith('+966')) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * OTP purpose types
 */
const OTPPurpose = {
  LOGIN: 'login',
  REGISTRATION: 'registration',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  TRANSACTION: 'transaction',
};

/**
 * Rate limiting helper for OTP requests
 * Returns time to wait before next attempt (in seconds)
 * @param {number} attemptCount - Number of failed attempts
 * @returns {number} - Wait time in seconds
 */
const calculateRateLimitDelay = (attemptCount) => {
  // Exponential backoff: 30s, 60s, 120s, 300s (5 min)
  const delays = [30, 60, 120, 300];
  const index = Math.min(attemptCount - 1, delays.length - 1);
  return delays[index];
};

/**
 * Check if phone number is rate limited
 * @param {Date} lastAttemptTime - Last OTP request time
 * @param {number} attemptCount - Number of attempts
 * @returns {Object} - Rate limit status
 */
const checkRateLimit = (lastAttemptTime, attemptCount) => {
  if (!lastAttemptTime) {
    return { limited: false };
  }

  const requiredDelay = calculateRateLimitDelay(attemptCount);
  const timeSinceLastAttempt = (Date.now() - new Date(lastAttemptTime).getTime()) / 1000;

  if (timeSinceLastAttempt < requiredDelay) {
    const waitTime = Math.ceil(requiredDelay - timeSinceLastAttempt);
    return {
      limited: true,
      waitTime,
      message: `يرجى الانتظار ${waitTime} ثانية قبل المحاولة مرة أخرى`,
      messageEn: `Please wait ${waitTime} seconds before trying again`,
    };
  }

  return { limited: false };
};

/**
 * Sanitize phone number input to prevent injection
 * @param {string} phoneNumber - Input phone number
 * @returns {string|null} - Sanitized phone or null if invalid
 */
const sanitizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return null;
  }

  // Remove all non-digit characters except + at start
  let cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');

  // Remove + if present
  cleaned = cleaned.replace(/\+/g, '');

  // Validate length (9-12 digits)
  if (cleaned.length < 9 || cleaned.length > 12) {
    return null;
  }

  return cleaned;
};

/**
 * Generate audit log entry for OTP operations
 * @param {string} action - Action performed (send, verify, resend)
 * @param {string} identifier - Phone/email (masked)
 * @param {boolean} success - Whether operation succeeded
 * @param {string} purpose - OTP purpose
 * @returns {Object} - Audit log entry
 */
const createAuditLog = (action, identifier, success, purpose) => {
  // Mask identifier for security
  let maskedIdentifier = identifier;
  if (identifier.includes('@')) {
    // Email: show first 2 chars and domain
    const [local, domain] = identifier.split('@');
    maskedIdentifier = `${local.substring(0, 2)}****@${domain}`;
  } else if (identifier.length >= 10) {
    // Phone: show first 3 and last 4 digits
    maskedIdentifier = `${identifier.substring(0, 3)}****${identifier.slice(-4)}`;
  }

  return {
    action,
    identifier: maskedIdentifier,
    success,
    purpose,
    timestamp: new Date(),
    ipAddress: null, // To be filled by controller
  };
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTPHash,
  calculateExpiry,
  isExpired,
  formatPhoneForStorage,
  validateEmail,
  OTPPurpose,
  calculateRateLimitDelay,
  checkRateLimit,
  sanitizePhoneNumber,
  createAuditLog,
};
