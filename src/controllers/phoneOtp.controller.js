/**
 * Phone OTP Controller for TRAF3LI
 * Handles SMS OTP send, verify, and resend for phone authentication
 */

const { PhoneOTP, User, Firm } = require('../models');
const { generateOTP } = require('../utils/otp.utils');
const smsService = require('../services/sms.service');
const jwt = require('jsonwebtoken');
const { getCookieConfig, getHttpOnlyRefreshCookieConfig, REFRESH_TOKEN_COOKIE_NAME } = require('../utils/cookieConfig');
const logger = require('../utils/logger');
const { generateAccessToken } = require('../utils/generateToken');
const refreshTokenService = require('../services/refreshToken.service');

/**
 * Send OTP to phone via SMS
 * POST /api/auth/phone/send-otp
 * Body: { phone, purpose }
 */
const sendPhoneOTP = async (req, res) => {
  try {
    const { phone, purpose = 'login' } = req.body;

    // Validate phone
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
        errorAr: 'رقم الهاتف مطلوب'
      });
    }

    // Validate and format phone number
    if (!smsService.isValidPhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        errorAr: 'تنسيق رقم الهاتف غير صالح'
      });
    }

    const formattedPhone = smsService.formatPhoneNumber(phone);

    // Validate purpose
    const validPurposes = ['login', 'registration', 'verify_phone', 'password_reset', 'transaction'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purpose',
        errorAr: 'غرض غير صالح'
      });
    }

    // Check rate limit (3 OTPs per hour, 1 min between requests)
    const rateLimit = await PhoneOTP.checkRateLimit(formattedPhone, purpose);
    if (rateLimit.limited) {
      return res.status(429).json({
        success: false,
        error: rateLimit.message,
        errorAr: rateLimit.messageAr,
        waitTime: rateLimit.waitTime || 60
      });
    }

    // For login, check if user exists with this phone
    if (purpose === 'login') {
      const existingUser = await User.findOne({ phone: formattedPhone });
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found with this phone number. Please register first.',
          errorAr: 'المستخدم غير موجود بهذا الرقم. يرجى التسجيل أولاً.'
        });
      }
    }

    // Generate OTP
    const otpCode = generateOTP(6);

    // Store OTP in database (hashed)
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
    await PhoneOTP.createOTP(formattedPhone, otpCode, purpose, expiryMinutes, {
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    });

    // Send OTP via SMS
    const smsResult = await smsService.sendOTP(formattedPhone, otpCode);

    if (!smsResult.success) {
      logger.error('OTP SMS failed:', smsResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP SMS. Please try again.',
        errorAr: 'فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.',
        details: smsResult.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      messageAr: 'تم إرسال رمز التحقق بنجاح',
      expiresIn: expiryMinutes * 60, // seconds
      phone: formattedPhone,
      provider: smsResult.provider
    });

  } catch (error) {
    logger.error('Send phone OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Verify phone OTP
 * POST /api/auth/phone/verify-otp
 * Body: { phone, otp, purpose }
 */
const verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp, purpose = 'login' } = req.body;

    // Validate input
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required',
        errorAr: 'رقم الهاتف ورمز التحقق مطلوبان'
      });
    }

    // Validate phone format
    if (!smsService.isValidPhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        errorAr: 'تنسيق رقم الهاتف غير صالح'
      });
    }

    const formattedPhone = smsService.formatPhoneNumber(phone);

    // Validate OTP format - must be exactly 6 numeric digits
    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be exactly 6 numeric digits',
        errorAr: 'رمز التحقق يجب أن يكون 6 أرقام بالضبط'
      });
    }

    // Validate purpose
    const validPurposes = ['login', 'registration', 'verify_phone', 'password_reset', 'transaction'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purpose',
        errorAr: 'غرض غير صالح'
      });
    }

    // Rate limiting for verification attempts (IP-based protection against brute force)
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const verificationRateLimit = await PhoneOTP.checkVerificationRateLimit(ipAddress, formattedPhone);

    if (verificationRateLimit.limited) {
      return res.status(429).json({
        success: false,
        error: verificationRateLimit.message,
        errorAr: verificationRateLimit.messageAr,
        waitTime: verificationRateLimit.waitTime || 300
      });
    }

    // Verify OTP with timing-safe comparison
    const result = await PhoneOTP.verifyOTP(formattedPhone, otp, purpose, ipAddress);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        errorAr: result.errorAr,
        attemptsLeft: result.attemptsLeft
      });
    }

    // Handle different purposes
    if (purpose === 'registration' || purpose === 'verify_phone') {
      // For registration/verification, just confirm OTP is valid
      // Actual user creation/update happens in separate endpoint
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified successfully.',
        messageAr: 'تم التحقق من الرمز بنجاح.',
        phone: formattedPhone
      });
    }

    if (purpose === 'password_reset') {
      // Generate password reset token
      const resetToken = jwt.sign(
        { phone: formattedPhone, purpose: 'password_reset' },
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

    // For login, generate tokens
    const user = await User.findOne({ phone: formattedPhone })
      .select('+isEmailVerified +createdAt')
      .setOptions({ bypassFirmFilter: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found with this phone number',
        errorAr: 'المستخدم غير موجود بهذا الرقم'
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // EMAIL VERIFICATION CHECK (Gold Standard)
    // ═══════════════════════════════════════════════════════════════
    // Phone OTP does NOT prove email ownership.
    // Enforce email verification for non-legacy users.
    // ═══════════════════════════════════════════════════════════════
    if (!user.isEmailVerified) {
      const enforcementDateStr = process.env.EMAIL_VERIFICATION_ENFORCEMENT_DATE || '2025-02-01';
      const enforcementDate = new Date(enforcementDateStr);
      const userCreatedAt = user.createdAt ? new Date(user.createdAt) : new Date(0);
      const isLegacyUser = isNaN(enforcementDate.getTime()) || userCreatedAt < enforcementDate;

      if (!isLegacyUser) {
        logger.warn('Phone OTP login blocked: email not verified', {
          userId: user._id,
          phone: formattedPhone
        });

        // Mask email for security
        let maskedEmail = '***@***.***';
        if (user.email && user.email.includes('@')) {
          const [localPart, domain] = user.email.split('@');
          const maskedLocal = localPart.length > 2
            ? localPart[0] + '***' + localPart[localPart.length - 1]
            : localPart[0] + '***';
          maskedEmail = `${maskedLocal}@${domain}`;
        }

        return res.status(403).json({
          success: false,
          error: 'Please verify your email to continue',
          errorAr: 'يرجى تفعيل بريدك الإلكتروني للمتابعة',
          code: 'EMAIL_NOT_VERIFIED',
          email: maskedEmail
        });
      }
    }

    // Get firm context for custom claims (if user belongs to a firm)
    let firm = null;
    if (user.firmId) {
      try {
        firm = await Firm.findById(user.firmId)
          .select('name nameEnglish licenseNumber status members subscription');
      } catch (firmErr) {
        logger.warn('Failed to fetch firm for phone OTP token generation', { error: firmErr.message });
      }
    }

    // Generate JWT access token using proper utility (15-min expiry, custom claims)
    const accessToken = await generateAccessToken(user, { firm });

    // Create device info for refresh token
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceIp = req.ip || req.headers['x-forwarded-for'];
    const deviceInfo = {
      userAgent: userAgent,
      ip: deviceIp,
      deviceId: req.headers['x-device-id'] || null,
      browser: req.headers['sec-ch-ua'] || null,
      os: req.headers['sec-ch-ua-platform'] || null,
      device: req.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop'
    };

    // Generate refresh token (long-lived, 7 days)
    const refreshToken = await refreshTokenService.createRefreshToken(
      user._id.toString(),
      deviceInfo,
      user.firmId
    );

    // Get cookie config based on request context
    const cookieConfig = getCookieConfig(req);
    const refreshCookieConfig = getHttpOnlyRefreshCookieConfig(req);

    // Set cookies and return response (BFF Pattern: tokens in httpOnly cookies ONLY)
    res.cookie('accessToken', accessToken, cookieConfig)
      .cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieConfig)
      .status(200).json({
        success: true,
        message: 'Login successful',
        messageAr: 'تم تسجيل الدخول بنجاح',
        // Token metadata only (NOT the actual tokens)
        token_type: 'Bearer',
        expires_in: 900, // 15 minutes in seconds
        // SECURITY: access_token and refresh_token are httpOnly cookies ONLY
        // Frontend uses credentials: 'include' to auto-attach cookies
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
    logger.error('Verify phone OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Resend phone OTP
 * POST /api/auth/phone/resend-otp
 * Body: { phone, purpose }
 */
const resendPhoneOTP = async (req, res) => {
  // Same as sendPhoneOTP - it handles rate limiting internally
  return sendPhoneOTP(req, res);
};

/**
 * Check phone OTP rate limit status
 * GET /api/auth/phone/otp-status?phone=...&purpose=...
 */
const checkPhoneOTPStatus = async (req, res) => {
  try {
    const { phone, purpose = 'login' } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
        errorAr: 'رقم الهاتف مطلوب'
      });
    }

    // Validate and format phone
    if (!smsService.isValidPhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        errorAr: 'تنسيق رقم الهاتف غير صالح'
      });
    }

    const formattedPhone = smsService.formatPhoneNumber(phone);
    const rateLimit = await PhoneOTP.checkRateLimit(formattedPhone, purpose);

    res.status(200).json({
      success: true,
      canRequest: !rateLimit.limited,
      waitTime: rateLimit.waitTime || 0,
      message: rateLimit.message,
      messageAr: rateLimit.messageAr
    });

  } catch (error) {
    logger.error('Check phone OTP status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

module.exports = {
  sendPhoneOTP,
  verifyPhoneOTP,
  resendPhoneOTP,
  checkPhoneOTPStatus
};
