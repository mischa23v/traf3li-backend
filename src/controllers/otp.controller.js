/**
 * OTP Controller for TRAF3LI
 * Handles email OTP send, verify, and resend
 */

const { EmailOTP, User, Firm, LoginSession } = require('../models');
const { generateOTP, hashOTP } = require('../utils/otp.utils');
const NotificationDeliveryService = require('../services/notificationDelivery.service');
const crypto = require('crypto');
const { getCookieConfig, getHttpOnlyRefreshCookieConfig, REFRESH_TOKEN_COOKIE_NAME } = require('../utils/cookieConfig');
const { sanitizeObjectId, timingSafeEqual } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const refreshTokenService = require('../services/refreshToken.service');
const { generateAccessToken } = require('../utils/generateToken');
const auditLogService = require('../services/auditLog.service');
const accountLockoutService = require('../services/accountLockout.service');

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
      // Generate secure reset token (same mechanism as email-based password reset)
      // This ensures consistent security model: single-use, stored in DB, clearable
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Store hashed token in DB with 30-min expiry (same as email flow)
      await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          passwordResetRequestedAt: new Date()
        },
        { bypassFirmFilter: true }
      );

      logger.info('Password reset token generated via OTP flow', { email: email.toLowerCase() });

      return res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified. You can now reset your password.',
        messageAr: 'تم التحقق من الرمز. يمكنك الآن إعادة تعيين كلمة المرور.',
        resetToken,  // Frontend sends this to POST /auth/reset-password
        expiresInMinutes: 30  // Token validity period
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // LOGIN PURPOSE: Requires LoginSession Token (Proof of Password)
    // ═══════════════════════════════════════════════════════════════
    // This ensures that:
    // 1. Password was actually verified (not just OTP)
    // 2. Same client that verified password is verifying OTP
    // 3. IP/device binding for session continuity
    // 4. Breach info is consistent (from session, not stale user record)

    const { loginSessionToken } = req.body;
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Validate login session token is provided
    if (!loginSessionToken) {
      logger.warn('OTP verification attempted without loginSessionToken', {
        email: email.toLowerCase(),
        ipAddress
      });
      return res.status(400).json({
        success: false,
        error: 'Login session token is required for login verification',
        errorAr: 'رمز جلسة تسجيل الدخول مطلوب',
        code: 'LOGIN_SESSION_TOKEN_REQUIRED'
      });
    }

    // Verify and consume the login session token
    let sessionData;
    try {
      sessionData = await LoginSession.verifyAndConsumeToken(loginSessionToken, {
        ipAddress,
        userAgent
      });
    } catch (sessionError) {
      const errorMessages = {
        'INVALID_TOKEN_FORMAT': { en: 'Invalid login session token format', ar: 'تنسيق رمز الجلسة غير صالح' },
        'INVALID_TOKEN_SIGNATURE': { en: 'Invalid login session token', ar: 'رمز جلسة تسجيل الدخول غير صالح' },
        'TOKEN_ALREADY_USED': { en: 'Login session already used. Please sign in again.', ar: 'تم استخدام جلسة تسجيل الدخول بالفعل. يرجى تسجيل الدخول مرة أخرى.' },
        'TOKEN_EXPIRED': { en: 'Login session expired. Please sign in again.', ar: 'انتهت صلاحية جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.' },
        'TOKEN_INVALIDATED': { en: 'Login session invalidated. Please sign in again.', ar: 'تم إبطال جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.' },
        'TOKEN_NOT_FOUND': { en: 'Login session not found. Please sign in again.', ar: 'جلسة تسجيل الدخول غير موجودة. يرجى تسجيل الدخول مرة أخرى.' }
      };

      const errorMsg = errorMessages[sessionError.message] || { en: 'Invalid login session', ar: 'جلسة تسجيل دخول غير صالحة' };

      logger.warn('Login session validation failed', {
        error: sessionError.message,
        email: email.toLowerCase(),
        ipAddress
      });

      return res.status(401).json({
        success: false,
        error: errorMsg.en,
        errorAr: errorMsg.ar,
        code: sessionError.message || 'INVALID_LOGIN_SESSION'
      });
    }

    // Validate email matches session
    if (sessionData.email !== email.toLowerCase()) {
      logger.warn('Email mismatch in OTP verification', {
        sessionEmail: sessionData.email,
        providedEmail: email.toLowerCase(),
        ipAddress
      });
      return res.status(400).json({
        success: false,
        error: 'Email does not match login session',
        errorAr: 'البريد الإلكتروني لا يتطابق مع جلسة تسجيل الدخول',
        code: 'EMAIL_MISMATCH'
      });
    }

    // Fetch user for token generation
    const user = await User.findById(sessionData.userId)
      .setOptions({ bypassFirmFilter: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        errorAr: 'المستخدم غير موجود'
      });
    }

    // Get firm context for custom claims (if user belongs to a firm)
    let firm = null;
    if (user.firmId) {
      try {
        firm = await Firm.findById(user.firmId)
          .select('name nameEnglish licenseNumber status members subscription');
      } catch (firmErr) {
        logger.warn('Failed to fetch firm for OTP token generation', { error: firmErr.message });
      }
    }

    // Clear failed login attempts on successful OTP verification
    await accountLockoutService.clearFailedAttempts(user.email, ipAddress);

    // Generate JWT access token using proper utility (15-min expiry, custom claims)
    const accessToken = await generateAccessToken(user, { firm });

    // Create device info for refresh token
    const deviceInfo = {
      userAgent: userAgent,
      ip: ipAddress,
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

    // Log successful login
    auditLogService.log(
      'login_success',
      'user',
      user._id,
      null,
      {
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        ipAddress,
        userAgent,
        method: 'password_otp',
        ipMismatch: sessionData.ipMismatch || false,
        passwordBreached: sessionData.passwordBreached || false,
        severity: 'low'
      }
    );

    // Get cookie config based on request context (same as password login)
    const cookieConfig = getCookieConfig(req);
    const refreshCookieConfig = getHttpOnlyRefreshCookieConfig(req);

    // Use breach info from session (authoritative source) instead of potentially stale user record
    const passwordBreached = sessionData.passwordBreached || user.passwordBreached || false;
    const mustChangePassword = sessionData.passwordBreached || user.mustChangePassword || false;

    // Set cookies and return response
    res.cookie('accessToken', accessToken, cookieConfig)
      .cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieConfig)
      .status(200).json({
        success: true,
        message: 'Login successful',
        messageAr: 'تم تسجيل الدخول بنجاح',
        // OAuth 2.0 standard format (snake_case)
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 900, // 15 minutes
        // Backwards compatibility (camelCase)
        accessToken: accessToken,
        refreshToken: refreshToken,
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
          lawyerMode: user.lawyerMode,
          firmId: user.firmId,
          // Security flags from session (authoritative)
          mustChangePassword: mustChangePassword,
          passwordBreached: passwordBreached
        },
        // Include security warning if password is breached
        ...(passwordBreached && {
          securityWarning: {
            type: 'PASSWORD_COMPROMISED',
            message: 'تحذير أمني: كلمة المرور الخاصة بك موجودة في قاعدة بيانات التسريبات. يرجى تغييرها فوراً.',
            messageEn: 'Security Warning: Your password was found in data breach databases. Please change it immediately.',
            requirePasswordChange: true,
            redirectTo: '/dashboard/settings/security?action=change-password&reason=breach'
          }
        })
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
