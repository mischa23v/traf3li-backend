/**
 * OTP Controller for TRAF3LI
 * Handles email OTP send, verify, and resend
 */

const { EmailOTP, User } = require('../models');
const { generateOTP, hashOTP } = require('../utils/otp.utils');
const NotificationDeliveryService = require('../services/notificationDelivery.service');
const jwt = require('jsonwebtoken');
const { getCookieConfig } = require('./auth.controller');
const { sanitizeObjectId, timingSafeEqual } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Send OTP to email
 * POST /api/auth/send-otp
 * Body: { email, purpose }
 */
const sendOTP = async (req, res) => {
  try {
    const { email, purpose = 'login' } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
        errorAr: 'عنوان البريد الإلكتروني غير صالح'
      });
    }

    // Validate purpose
    const validPurposes = ['login', 'registration', 'password_reset', 'email_verification', 'transaction'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purpose',
        errorAr: 'غرض غير صالح'
      });
    }

    // Check rate limit (5 OTPs per hour, 1 min between requests)
    const rateLimit = await EmailOTP.checkRateLimit(email, purpose);
    if (rateLimit.limited) {
      return res.status(429).json({
        success: false,
        error: rateLimit.message,
        errorAr: rateLimit.messageAr,
        waitTime: rateLimit.waitTime || 60
      });
    }

    // For login, check if user exists (bypass firmFilter for auth)
    if (purpose === 'login') {
      const existingUser = await User.findOne({ email: email.toLowerCase() })
        .setOptions({ bypassFirmFilter: true });
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found. Please register first.',
          errorAr: 'المستخدم غير موجود. يرجى التسجيل أولاً.'
        });
      }
    }

    // Generate OTP
    const otpCode = generateOTP(6);

    // Store OTP in database (hashed)
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
    await EmailOTP.createOTP(email, otpCode, purpose, expiryMinutes, {
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    });

    // Get user name if exists (bypass firmFilter for auth)
    const user = await User.findOne({ email: email.toLowerCase() })
      .setOptions({ bypassFirmFilter: true });
    const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

    // Send OTP email
    const emailResult = await NotificationDeliveryService.sendEmailOTP(
      email,
      otpCode,
      userName
    );

    if (!emailResult.success) {
      logger.error('OTP email failed:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email. Please try again.',
        errorAr: 'فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      messageAr: 'تم إرسال رمز التحقق بنجاح',
      expiresIn: expiryMinutes * 60, // seconds
      email: email.toLowerCase()
    });

  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 * Body: { email, otp, purpose }
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, purpose = 'login' } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required',
        errorAr: 'البريد الإلكتروني ورمز التحقق مطلوبان'
      });
    }

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
        errorAr: 'عنوان البريد الإلكتروني غير صالح'
      });
    }

    // Validate OTP format - must be exactly 6 numeric digits
    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be exactly 6 numeric digits',
        errorAr: 'رمز التحقق يجب أن يكون 6 أرقام بالضبط'
      });
    }

    // Validate purpose
    const validPurposes = ['login', 'registration', 'password_reset', 'email_verification', 'transaction'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purpose',
        errorAr: 'غرض غير صالح'
      });
    }

    // Rate limiting for verification attempts (IP-based protection against brute force)
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const verificationRateLimit = await EmailOTP.checkVerificationRateLimit(ipAddress, email);

    if (verificationRateLimit.limited) {
      return res.status(429).json({
        success: false,
        error: verificationRateLimit.message,
        errorAr: verificationRateLimit.messageAr,
        waitTime: verificationRateLimit.waitTime || 300
      });
    }

    // Verify OTP with timing-safe comparison
    const result = await EmailOTP.verifyOTP(email, otp, purpose, ipAddress);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        errorAr: result.errorAr,
        attemptsLeft: result.attemptsLeft
      });
    }

    // Handle different purposes
    if (purpose === 'registration' || purpose === 'email_verification') {
      // For registration, just confirm OTP is valid
      // User creation happens in separate registration endpoint
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified. Proceed with registration.',
        messageAr: 'تم التحقق من الرمز. أكمل التسجيل.',
        email: email.toLowerCase()
      });
    }

    if (purpose === 'password_reset') {
      // Generate password reset token
      const resetToken = jwt.sign(
        { email: email.toLowerCase(), purpose: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified. You can now reset your password.',
        messageAr: 'تم التحقق من الرمز. يمكنك الآن إعادة تعيين كلمة المرور.',
        resetToken
      });
    }

    // For login, generate tokens (bypass firmFilter for auth)
    const user = await User.findOne({ email: email.toLowerCase() })
      .setOptions({ bypassFirmFilter: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        errorAr: 'المستخدم غير موجود'
      });
    }

    // Generate JWT token (same format as password login for consistency)
    const accessToken = jwt.sign(
      {
        _id: user._id,
        isSeller: user.isSeller
      },
      process.env.JWT_SECRET,
      { expiresIn: '7 days' }  // Same as password login
    );

    // Get cookie config based on request context (same as password login)
    const cookieConfig = getCookieConfig(req);

    // Set cookie and return response (same pattern as password login)
    res.cookie('accessToken', accessToken, cookieConfig)
      .status(200).json({
        success: true,
        message: 'Login successful',
        messageAr: 'تم تسجيل الدخول بنجاح',
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          image: user.image,
          phone: user.phone,
          isSeller: user.isSeller,
          lawyerMode: user.lawyerMode
        }
      });

  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Resend OTP
 * POST /api/auth/resend-otp
 * Body: { email, purpose }
 */
const resendOTP = async (req, res) => {
  // Same as sendOTP - it handles rate limiting internally
  return sendOTP(req, res);
};

/**
 * Check OTP rate limit status
 * GET /api/auth/otp-status?email=...&purpose=...
 */
const checkOTPStatus = async (req, res) => {
  try {
    const { email, purpose = 'login' } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const rateLimit = await EmailOTP.checkRateLimit(email, purpose);

    res.status(200).json({
      success: true,
      canRequest: !rateLimit.limited,
      waitTime: rateLimit.waitTime || 0,
      message: rateLimit.message,
      messageAr: rateLimit.messageAr
    });

  } catch (error) {
    logger.error('Check OTP status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  resendOTP,
  checkOTPStatus
};
