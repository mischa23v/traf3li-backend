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
const stepUpAuthService = require('../services/stepUpAuth.service');

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

    // Get user for login/password_reset (bypass firmFilter for auth)
    const user = await User.findOne({ email: email.toLowerCase() })
      .setOptions({ bypassFirmFilter: true });

    // SECURITY: For login purpose, if user doesn't exist, return success to prevent enumeration
    // but don't actually send an OTP (prevents resource abuse while hiding valid emails)
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

    if (purpose === 'login' && !user) {
      // Log for security monitoring but return success to prevent enumeration
      logger.warn('OTP requested for non-existent user (login purpose)', {
        email: email.toLowerCase(),
        ipAddress: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent']
      });

      // TIMING ATTACK PREVENTION: Add random delay to match real OTP send timing
      // Real OTP sends take 150-400ms (DB write + email API call)
      // Random delay prevents attackers from distinguishing valid vs invalid emails via timing
      const crypto = require('crypto');
      const minDelay = 150; // Minimum delay in ms
      const maxDelay = 400; // Maximum delay in ms
      const randomDelay = crypto.randomInt(minDelay, maxDelay + 1);

      await new Promise(resolve => setTimeout(resolve, randomDelay));

      // Return identical response structure to successful OTP send
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        messageAr: 'تم إرسال رمز التحقق بنجاح',
        expiresIn: expiryMinutes * 60, // seconds
        email: email.toLowerCase()
      });
    }

    // Generate OTP
    const otpCode = generateOTP(6);

    // Store OTP in database (hashed)
    await EmailOTP.createOTP(email, otpCode, purpose, expiryMinutes, {
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    });

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
 *
 * GOLD STANDARD API Design (AWS Cognito, Auth0, Google pattern):
 * - For login purpose: Only requires { otp, loginSessionToken }
 *   Email is EXTRACTED from the cryptographically signed loginSessionToken
 *   Frontend does NOT need to send email (reduces attack surface, cleaner API)
 *
 * - For other purposes: Requires { email, otp }
 *   Email is validated and used directly
 *
 * Body: { otp, purpose?, loginSessionToken? } OR { email, otp, purpose? }
 */
const verifyOTP = async (req, res) => {
  // Debug flag - enabled by default, set AUTH_DEBUG=false to disable
  const DEBUG = process.env.AUTH_DEBUG !== 'false';

  try {
    const { otp, purpose = 'login', loginSessionToken } = req.body;
    let { email } = req.body;

    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Debug: Log OTP verification attempt
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[OTP-DEBUG] ${new Date().toISOString()} | verifyOTP called`, {
        purpose,
        hasOtp: !!otp,
        hasEmail: !!email,
        hasLoginSessionToken: !!loginSessionToken,
        ip: ipAddress
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Validate OTP format (required for all purposes)
    // ═══════════════════════════════════════════════════════════════
    if (!otp) {
      return res.status(400).json({
        success: false,
        error: 'OTP is required',
        errorAr: 'رمز التحقق مطلوب'
      });
    }

    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be exactly 6 numeric digits',
        errorAr: 'رمز التحقق يجب أن يكون 6 أرقام بالضبط'
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Validate purpose
    // ═══════════════════════════════════════════════════════════════
    const validPurposes = ['login', 'registration', 'password_reset', 'email_verification', 'transaction'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purpose',
        errorAr: 'غرض غير صالح'
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Get email based on purpose (GOLD STANDARD)
    // ═══════════════════════════════════════════════════════════════
    //
    // For LOGIN purpose: Extract email from loginSessionToken
    // - The token is HMAC-SHA256 signed by the server
    // - It contains the verified email from password authentication
    // - This is the source of truth (not client-provided email)
    // - Prevents email substitution attacks
    //
    // CRITICAL: We verify token SIGNATURE first (no DB write), then verify OTP,
    // then CONSUME the token. This ensures if OTP fails, user can retry
    // without needing to re-enter password.
    //
    // For OTHER purposes: Require email in request body
    // - These flows don't have a prior authentication step
    // ═══════════════════════════════════════════════════════════════

    let tokenPayload = null;  // Stores parsed token data (for login purpose)

    if (purpose === 'login') {
      // LOGIN PURPOSE: Validate token signature to get email (WITHOUT consuming)
      if (!loginSessionToken) {
        logger.warn('OTP verification attempted without loginSessionToken', {
          ipAddress,
          purpose
        });
        return res.status(400).json({
          success: false,
          error: 'Login session token is required for login verification',
          errorAr: 'رمز جلسة تسجيل الدخول مطلوب',
          code: 'LOGIN_SESSION_TOKEN_REQUIRED'
        });
      }

      // Step 3a: Verify token SIGNATURE only (no DB write, no consumption)
      // This extracts email from the cryptographically signed token
      try {
        tokenPayload = LoginSession.verifyTokenSignature(loginSessionToken);
      } catch (signatureError) {
        const errorMessages = {
          'INVALID_TOKEN_FORMAT': { en: 'Invalid login session token format', ar: 'تنسيق رمز الجلسة غير صالح' },
          'INVALID_TOKEN_ENCODING': { en: 'Invalid login session token encoding', ar: 'ترميز رمز الجلسة غير صالح' },
          'INVALID_TOKEN_PAYLOAD': { en: 'Invalid login session token data', ar: 'بيانات رمز الجلسة غير صالحة' },
          'INVALID_TOKEN_SIGNATURE': { en: 'Invalid login session token', ar: 'رمز جلسة تسجيل الدخول غير صالح' }
        };

        const errorMsg = errorMessages[signatureError.message] || { en: 'Invalid login session', ar: 'جلسة تسجيل دخول غير صالحة' };

        logger.warn('Login session token signature validation failed', {
          error: signatureError.message,
          ipAddress
        });

        return res.status(401).json({
          success: false,
          error: errorMsg.en,
          errorAr: errorMsg.ar,
          code: signatureError.message || 'INVALID_LOGIN_SESSION'
        });
      }

      // GOLD STANDARD: Extract email from verified token (source of truth)
      email = tokenPayload.email;

      // Belt-and-suspenders: If frontend also sent email, log if it doesn't match
      // (This is for backwards compatibility and security monitoring)
      const providedEmail = req.body.email;
      if (providedEmail && typeof providedEmail === 'string' && providedEmail.toLowerCase() !== email) {
        logger.warn('Email mismatch detected (using token email)', {
          tokenEmail: email,
          providedEmail: providedEmail.toLowerCase(),
          ipAddress
        });
        // Use token email (source of truth), don't fail
      }

    } else {
      // NON-LOGIN PURPOSE: Require email in request body
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
          errorAr: 'البريد الإلكتروني مطلوب'
        });
      }

      // Type safety check
      if (typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Email must be a string',
          errorAr: 'البريد الإلكتروني يجب أن يكون نصاً'
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email address',
          errorAr: 'عنوان البريد الإلكتروني غير صالح'
        });
      }

      email = email.toLowerCase();
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Rate limiting for verification attempts
    // ═══════════════════════════════════════════════════════════════
    const verificationRateLimit = await EmailOTP.checkVerificationRateLimit(ipAddress, email);

    if (verificationRateLimit.limited) {
      return res.status(429).json({
        success: false,
        error: verificationRateLimit.message,
        errorAr: verificationRateLimit.messageAr,
        waitTime: verificationRateLimit.waitTime || 300
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Verify OTP with timing-safe comparison
    // ═══════════════════════════════════════════════════════════════
    const result = await EmailOTP.verifyOTP(email, otp, purpose, ipAddress);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        errorAr: result.errorAr,
        attemptsLeft: result.attemptsLeft
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Handle different purposes
    // ═══════════════════════════════════════════════════════════════

    if (purpose === 'registration' || purpose === 'email_verification') {
      // For registration, just confirm OTP is valid
      // User creation happens in separate registration endpoint
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified. Proceed with registration.',
        messageAr: 'تم التحقق من الرمز. أكمل التسجيل.',
        email: email
      });
    }

    if (purpose === 'password_reset') {
      // Generate secure reset token (same mechanism as email-based password reset)
      // This ensures consistent security model: single-use, stored in DB, clearable
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Store hashed token in DB with 30-min expiry (same as email flow)
      await User.findOneAndUpdate(
        { email: email },
        {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          passwordResetRequestedAt: new Date()
        },
        { bypassFirmFilter: true }
      );

      logger.info('Password reset token generated via OTP flow', { email: email });

      return res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified. You can now reset your password.',
        messageAr: 'تم التحقق من الرمز. يمكنك الآن إعادة تعيين كلمة المرور.',
        resetToken,  // Frontend sends this to POST /auth/reset-password
        expiresInMinutes: 30  // Token validity period
      });
    }

    if (purpose === 'transaction') {
      // Transaction purpose: Step-up authentication for sensitive operations
      // Returns verification status - calling code handles the transaction
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified for transaction.',
        messageAr: 'تم التحقق من الرمز للمعاملة.',
        email: email,
        purpose: 'transaction',
        verifiedAt: new Date().toISOString()
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // LOGIN PURPOSE: Complete authentication
    // ═══════════════════════════════════════════════════════════════
    // At this point:
    // - loginSessionToken signature is verified
    // - Email is extracted from token (source of truth)
    // - OTP is verified
    // - Now we CONSUME the token (mark as used in DB)
    // - Ready to issue tokens

    // Step 6a: NOW consume the loginSessionToken (after OTP verified)
    // This is the ONLY place we touch the database for the token
    let sessionData;
    try {
      sessionData = await LoginSession.verifyAndConsumeToken(loginSessionToken, {
        ipAddress,
        userAgent
      });
    } catch (consumeError) {
      // Token consumption errors (already used, expired, not found, etc.)
      const errorMessages = {
        'INVALID_TOKEN_FORMAT': { en: 'Invalid login session token format', ar: 'تنسيق رمز الجلسة غير صالح' },
        'INVALID_TOKEN_ENCODING': { en: 'Invalid login session token encoding', ar: 'ترميز رمز الجلسة غير صالح' },
        'INVALID_TOKEN_PAYLOAD': { en: 'Invalid login session token data', ar: 'بيانات رمز الجلسة غير صالحة' },
        'INVALID_TOKEN_SIGNATURE': { en: 'Invalid login session token', ar: 'رمز جلسة تسجيل الدخول غير صالح' },
        'TOKEN_ALREADY_USED': { en: 'Login session already used. Please sign in again.', ar: 'تم استخدام جلسة تسجيل الدخول بالفعل. يرجى تسجيل الدخول مرة أخرى.' },
        'TOKEN_EXPIRED': { en: 'Login session expired. Please sign in again.', ar: 'انتهت صلاحية جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.' },
        'TOKEN_INVALIDATED': { en: 'Login session invalidated. Please sign in again.', ar: 'تم إبطال جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.' },
        'TOKEN_NOT_FOUND': { en: 'Login session not found. Please sign in again.', ar: 'جلسة تسجيل الدخول غير موجودة. يرجى تسجيل الدخول مرة أخرى.' }
      };

      const errorMsg = errorMessages[consumeError.message] || { en: 'Invalid login session', ar: 'جلسة تسجيل دخول غير صالحة' };

      logger.warn('Login session consumption failed after OTP verification', {
        error: consumeError.message,
        email,
        ipAddress
      });

      return res.status(401).json({
        success: false,
        error: errorMsg.en,
        errorAr: errorMsg.ar,
        code: consumeError.message || 'INVALID_LOGIN_SESSION'
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

    // Debug: Log token generation with timing info
    if (DEBUG) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(accessToken);
      // eslint-disable-next-line no-console
      console.log('[OTP-DEBUG] Login tokens issued', {
        userId: user._id.toString(),
        email: user.email,
        tokenIssuedAt: decoded?.iat ? new Date(decoded.iat * 1000).toISOString() : null,
        tokenExpiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        tokenDurationMinutes: decoded ? ((decoded.exp - decoded.iat) / 60).toFixed(2) : null,
        serverTime: new Date().toISOString(),
        firmId: user.firmId || null,
        isSoloLawyer: user.isSoloLawyer || false
      });
    }

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

    // Update reauthentication timestamp on successful login
    // CRITICAL: Must await to prevent race condition with immediate password change requests
    try {
      await stepUpAuthService.updateReauthTimestamp(user._id.toString());
    } catch (err) {
      logger.error('Failed to update reauth timestamp on OTP login:', err);
      // Continue - don't fail login for this
    }

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
          // Email verification status (Gold Standard - Feature-Based Blocking)
          isEmailVerified: user.isEmailVerified || false,
          emailVerifiedAt: user.emailVerifiedAt || null,
          // Security flags from session (authoritative)
          mustChangePassword: mustChangePassword,
          passwordBreached: passwordBreached
        },
        // Email verification context for frontend feature blocking
        emailVerification: {
          isVerified: user.isEmailVerified || false,
          requiresVerification: !user.isEmailVerified,
          verificationSentAt: new Date().toISOString(),
          // Features allowed without email verification
          allowedFeatures: ['tasks', 'reminders', 'events', 'gantt', 'calendar', 'notifications', 'profile-view'],
          // Features blocked until email is verified
          blockedFeatures: ['cases', 'clients', 'billing', 'invoices', 'documents', 'integrations', 'team', 'reports', 'analytics', 'hr', 'crm-write']
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
