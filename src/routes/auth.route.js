const express = require('express');
const { authLogin, authLogout, authLogoutAll, authRegister, authStatus, checkAvailability, getOnboardingStatus, refreshAccessToken, sendMagicLink, verifyMagicLink, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, getCSRFToken } = require('../controllers/auth.controller');
const { anonymousLogin, convertAnonymousUser } = require('../controllers/anonymous.auth.controller');
const { sendOTP, verifyOTP, resendOTP, checkOTPStatus } = require('../controllers/otp.controller');
const { sendPhoneOTP, verifyPhoneOTP, resendPhoneOTP, checkPhoneOTPStatus } = require('../controllers/phoneOtp.controller');
const { authenticateWithOneTap } = require('../controllers/googleOneTap.controller');
const {
    generateBackupCodes,
    verifyBackupCode,
    regenerateBackupCodes,
    getBackupCodesCount,
    getMFAStatus
} = require('../controllers/mfa.controller');
const {
    getActiveSessions,
    getCurrentSession,
    terminateSession,
    terminateAllOtherSessions,
    getSessionStats
} = require('../controllers/session.controller');
const { changePassword, getPasswordStatus } = require('../controllers/passwordChange.controller');
const { reauthenticate, createReauthChallenge, verifyReauthChallenge, getReauthStatus } = require('../controllers/stepUpAuth.controller');
const { authenticate } = require('../middlewares');
const { requireRecentAuthHourly, requireVeryRecentAuth } = require('../middlewares/stepUpAuth.middleware');
const { authRateLimiter, sensitiveRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    loginLimiter,
    authLimiter,
    passwordReset: passwordResetLimiter,
    otp: otpLimiter
} = require('../config/rateLimiter.config').rateLimiters;
const { captchaRegister, captchaLogin, captchaForgotPassword } = require('../middlewares/captcha.middleware');
const { csrfProtection, attachCSRFToken } = require('../middlewares/csrf.middleware');
const {
    validateLogin,
    validateRegister,
    validateSendOTP,
    validateVerifyOTP,
    validateSendPhoneOTP,
    validateVerifyPhoneOTP,
    validateCheckAvailability,
    validateSendMagicLink,
    validateVerifyMagicLink,
    validateForgotPassword,
    validateResetPassword,
    validateGoogleOneTap
} = require('../validators/auth.validator');

const app = express.Router();

/**
 * @openapi
 * /api/auth/check-availability:
 *   post:
 *     summary: Check availability of email, username, or phone
 *     description: Validates if an email, username, or phone number is available for registration. SECURITY - Heavily rate limited to prevent user enumeration attacks.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckAvailabilityRequest'
 *     responses:
 *       200:
 *         description: Availability check successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
// SECURITY: Using sensitiveRateLimiter (3 req/hour) instead of publicRateLimiter to prevent enumeration attacks
app.post('/check-availability', sensitiveRateLimiter, validateCheckAvailability, checkAvailability);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email and password. CAPTCHA verification required if enabled.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/register', authLimiter, captchaRegister, validateRegister, authRegister);

// ========== ANONYMOUS/GUEST AUTHENTICATION ==========
/**
 * @openapi
 * /api/auth/anonymous:
 *   post:
 *     summary: Create anonymous/guest session
 *     description: Creates a temporary anonymous user session (Supabase-style). No credentials required. Anonymous users can later convert to full accounts.
 *     tags:
 *       - Authentication
 *     responses:
 *       201:
 *         description: Anonymous session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                       example: Guest
 *                     lastName:
 *                       type: string
 *                       example: User
 *                     role:
 *                       type: string
 *                       example: client
 *                     isAnonymous:
 *                       type: boolean
 *                       example: true
 *                 isAnonymous:
 *                   type: boolean
 *                   example: true
 *       403:
 *         description: Anonymous authentication is not enabled
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
app.post('/anonymous', publicRateLimiter, anonymousLogin);

/**
 * @openapi
 * /api/auth/anonymous/convert:
 *   post:
 *     summary: Convert anonymous user to full account
 *     description: Converts the current anonymous user to a full account with email and password. All data is preserved.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address for the new account
 *               password:
 *                 type: string
 *                 description: Password for the new account (must meet security requirements)
 *               firstName:
 *                 type: string
 *                 description: User's first name (optional)
 *               lastName:
 *                 type: string
 *                 description: User's last name (optional)
 *               phone:
 *                 type: string
 *                 description: User's phone number (optional)
 *     responses:
 *       200:
 *         description: Account converted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid request or user is not anonymous
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Anonymous authentication is not enabled
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
app.post('/anonymous/convert', authenticate, authRateLimiter, convertAnonymousUser);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Authenticates a user and returns JWT tokens. CAPTCHA verification may be required after failed login attempts or if always enabled.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/login', loginLimiter, captchaLogin, validateLogin, authLogin);

// ========== GOOGLE ONE TAP AUTHENTICATION ==========
/**
 * @openapi
 * /api/auth/google/one-tap:
 *   post:
 *     summary: Authenticate with Google One Tap
 *     description: Verifies Google One Tap credential token and authenticates user. Creates new account if user doesn't exist. Links Google account if user exists without Google auth.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Google One Tap JWT credential token from client
 *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
 *               firmId:
 *                 type: string
 *                 description: Optional firm ID for multi-tenancy (user will be added to firm)
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   description: Success message in Arabic
 *                   example: "تم تسجيل الدخول بنجاح"
 *                 messageEn:
 *                   type: string
 *                   description: Success message in English
 *                   example: "Login successful"
 *                 user:
 *                   type: object
 *                   description: User profile with firm and permission details
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     role:
 *                       type: string
 *                     ssoProvider:
 *                       type: string
 *                       example: "google"
 *                     ssoExternalId:
 *                       type: string
 *                       description: "Google user ID (sub)"
 *                     isEmailVerified:
 *                       type: boolean
 *                     firmId:
 *                       type: string
 *                     firmRole:
 *                       type: string
 *                     permissions:
 *                       type: object
 *                 isNewUser:
 *                   type: boolean
 *                   description: True if a new account was created
 *                   example: false
 *                 accountLinked:
 *                   type: boolean
 *                   description: True if existing account was linked to Google
 *                   example: false
 *       400:
 *         description: Invalid request or credential
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 code:
 *                   type: string
 *                   enum: [CREDENTIAL_REQUIRED, INVALID_FIRM_ID, FIRM_NOT_FOUND, INVALID_TOKEN, TOKEN_EXPIRED, GOOGLE_ACCOUNT_ALREADY_LINKED]
 *       401:
 *         description: Token verification failed
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         description: Server error or Google One Tap not configured
 */
app.post('/google/one-tap', authRateLimiter, validateGoogleOneTap, authenticateWithOneTap);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     description: Invalidates the current user session and clears auth cookies
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.post('/logout', authenticate, csrfProtection, authLogout)

/**
 * @openapi
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     description: Revokes all active tokens for the current user across all devices
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Successfully logged out from all devices
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
app.post("/logout-all", authenticate, authLogoutAll)

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Uses refresh token to obtain new access token. Implements token rotation for security.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token (optional if sent via cookie)
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid or expired refresh token
 *       403:
 *         description: Token reuse detected
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/refresh', authRateLimiter, refreshAccessToken);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/me', authenticate, authStatus);

/**
 * @openapi
 * /api/auth/onboarding-status:
 *   get:
 *     summary: Get user's onboarding completion status
 *     description: Returns whether the user has completed the required onboarding/setup wizard tasks
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isComplete:
 *                       type: boolean
 *                       description: Whether all required tasks are complete
 *                     hasStarted:
 *                       type: boolean
 *                       description: Whether user has started onboarding
 *                     progress:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         percentage:
 *                           type: number
 *                     required:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         isComplete:
 *                           type: boolean
 *                     nextTask:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         taskId:
 *                           type: string
 *                         name:
 *                           type: string
 *                         route:
 *                           type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/onboarding-status', authenticate, publicRateLimiter, getOnboardingStatus);

// ========== OTP Authentication ==========
/**
 * @openapi
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to email
 *     description: Sends a one-time password to the user's email for passwordless authentication
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/send-otp', otpLimiter, validateSendOTP, sendOTP);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login
 *     description: Verifies the OTP code and returns JWT tokens if valid
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/verify-otp', otpLimiter, validateVerifyOTP, verifyOTP);

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     description: Resends the OTP code to the user's email
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOTPRequest'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/resend-otp', sensitiveRateLimiter, validateSendOTP, resendOTP);

/**
 * @openapi
 * /api/auth/otp-status:
 *   get:
 *     summary: Check OTP rate limit status
 *     description: Returns information about remaining OTP attempts and cooldown period
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: OTP status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     attemptsRemaining:
 *                       type: number
 *                       example: 3
 *                     resetTime:
 *                       type: string
 *                       format: date-time
 */
app.get('/otp-status', publicRateLimiter, checkOTPStatus);

// ========== Phone OTP Authentication ==========
/**
 * @openapi
 * /api/auth/phone/send-otp:
 *   post:
 *     summary: Send OTP to phone via SMS
 *     description: Sends a one-time password to the user's phone for passwordless authentication. Supports international phone numbers with automatic formatting.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number in international format (e.g., +966XXXXXXXXX or 05XXXXXXXX)
 *                 example: "+966501234567"
 *               purpose:
 *                 type: string
 *                 enum: [login, registration, verify_phone, password_reset, transaction]
 *                 default: login
 *                 description: Purpose of the OTP
 *     responses:
 *       200:
 *         description: OTP sent successfully via SMS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 messageAr:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *                   description: Expiry time in seconds
 *                   example: 300
 *                 phone:
 *                   type: string
 *                 provider:
 *                   type: string
 *                   description: SMS provider used (twilio or msg91)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/phone/send-otp', sensitiveRateLimiter, validateSendPhoneOTP, sendPhoneOTP);

/**
 * @openapi
 * /api/auth/phone/verify-otp:
 *   post:
 *     summary: Verify phone OTP and login
 *     description: Verifies the OTP code sent via SMS and returns JWT tokens if valid
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number in international format
 *                 example: "+966501234567"
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *               purpose:
 *                 type: string
 *                 enum: [login, registration, verify_phone, password_reset, transaction]
 *                 default: login
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 messageAr:
 *                   type: string
 *                 user:
 *                   type: object
 *                   description: User profile (for login purpose)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/phone/verify-otp', authRateLimiter, validateVerifyPhoneOTP, verifyPhoneOTP);

/**
 * @openapi
 * /api/auth/phone/resend-otp:
 *   post:
 *     summary: Resend phone OTP
 *     description: Resends the OTP code to the user's phone via SMS
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number in international format
 *                 example: "+966501234567"
 *               purpose:
 *                 type: string
 *                 enum: [login, registration, verify_phone, password_reset, transaction]
 *                 default: login
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 messageAr:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/phone/resend-otp', sensitiveRateLimiter, validateSendPhoneOTP, resendPhoneOTP);

/**
 * @openapi
 * /api/auth/phone/otp-status:
 *   get:
 *     summary: Check phone OTP rate limit status
 *     description: Returns information about remaining OTP attempts and cooldown period for a phone number
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         description: Phone number to check
 *         example: "+966501234567"
 *       - in: query
 *         name: purpose
 *         schema:
 *           type: string
 *           enum: [login, registration, verify_phone, password_reset, transaction]
 *           default: login
 *         description: OTP purpose
 *     responses:
 *       200:
 *         description: Phone OTP status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 canRequest:
 *                   type: boolean
 *                 waitTime:
 *                   type: number
 *                   description: Seconds to wait before next request
 *                 message:
 *                   type: string
 *                 messageAr:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
app.get('/phone/otp-status', publicRateLimiter, checkPhoneOTPStatus);

// ========== Magic Link (Passwordless) Authentication ==========
/**
 * @openapi
 * /api/auth/magic-link/send:
 *   post:
 *     summary: Send magic link for passwordless authentication
 *     description: Sends a magic link to the user's email for passwordless login
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               purpose:
 *                 type: string
 *                 enum: [login, register, verify_email]
 *                 default: login
 *                 description: Purpose of the magic link
 *               redirectUrl:
 *                 type: string
 *                 description: URL to redirect after successful verification
 *     responses:
 *       200:
 *         description: Magic link sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 expiresInMinutes:
 *                   type: number
 *                   example: 15
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/magic-link/send', sensitiveRateLimiter, validateSendMagicLink, sendMagicLink);

/**
 * @openapi
 * /api/auth/magic-link/verify:
 *   post:
 *     summary: Verify magic link and authenticate user
 *     description: Verifies the magic link token and authenticates the user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Magic link token from email
 *     responses:
 *       200:
 *         description: Magic link verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 redirectUrl:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
app.post('/magic-link/verify', authRateLimiter, validateVerifyMagicLink, verifyMagicLink);

// ========== MFA Backup Codes ==========
/**
 * @openapi
 * /api/auth/mfa/backup-codes/generate:
 *   post:
 *     summary: Generate backup codes for MFA recovery
 *     description: Generates 10 backup codes that can be used for MFA recovery. Codes are shown only once.
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 codes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ['ABCD-1234', 'EFGH-5678']
 *                 remainingCodes:
 *                   type: number
 *                   example: 10
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.post('/mfa/backup-codes/generate', authenticate, requireRecentAuthHourly({ purpose: 'MFA backup code generation' }), sensitiveRateLimiter, generateBackupCodes);

/**
 * @openapi
 * /api/auth/mfa/backup-codes/verify:
 *   post:
 *     summary: Verify backup code for MFA login
 *     description: Verifies a backup code during login. Each code can only be used once.
 *     tags:
 *       - MFA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *               code:
 *                 type: string
 *                 description: Backup code in format ABCD-1234
 *     responses:
 *       200:
 *         description: Backup code verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 remainingCodes:
 *                   type: number
 *                   example: 9
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.post('/mfa/backup-codes/verify', authRateLimiter, verifyBackupCode);

/**
 * @openapi
 * /api/auth/mfa/backup-codes/regenerate:
 *   post:
 *     summary: Regenerate backup codes (invalidates old codes)
 *     description: Generates a new set of backup codes and invalidates all old ones. Requires MFA to be enabled.
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 codes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ['ABCD-1234', 'EFGH-5678']
 *                 remainingCodes:
 *                   type: number
 *                   example: 10
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.post('/mfa/backup-codes/regenerate', authenticate, requireRecentAuthHourly({ purpose: 'MFA backup code regeneration' }), sensitiveRateLimiter, regenerateBackupCodes);

/**
 * @openapi
 * /api/auth/mfa/backup-codes/count:
 *   get:
 *     summary: Get remaining backup codes count
 *     description: Returns the number of unused backup codes available for the authenticated user
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup codes count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 remainingCodes:
 *                   type: number
 *                   example: 8
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/mfa/backup-codes/count', authenticate, publicRateLimiter, getBackupCodesCount);

/**
 * @openapi
 * /api/auth/mfa/status:
 *   get:
 *     summary: Get MFA status
 *     description: Returns MFA status including whether MFA is enabled and backup codes info
 *     tags:
 *       - MFA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 mfaEnabled:
 *                   type: boolean
 *                   example: true
 *                 hasTOTP:
 *                   type: boolean
 *                   example: true
 *                 hasBackupCodes:
 *                   type: boolean
 *                   example: true
 *                 remainingCodes:
 *                   type: number
 *                   example: 8
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/mfa/status', authenticate, publicRateLimiter, getMFAStatus);

// ========== Session Management ==========
/**
 * @openapi
 * /api/auth/sessions:
 *   get:
 *     summary: List user's active sessions
 *     description: Returns all active sessions for the authenticated user with device and location information, including security anomaly detection
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Session ID
 *                       device:
 *                         type: string
 *                         description: Device type (desktop, mobile, tablet)
 *                         example: desktop
 *                       browser:
 *                         type: string
 *                         description: Browser name
 *                         example: Chrome
 *                       os:
 *                         type: string
 *                         description: Operating system
 *                         example: Windows
 *                       ip:
 *                         type: string
 *                         description: IP address
 *                         example: 192.168.1.1
 *                       location:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                             example: Saudi Arabia
 *                           city:
 *                             type: string
 *                             example: Riyadh
 *                           region:
 *                             type: string
 *                             example: Riyadh Region
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Session creation timestamp
 *                       lastActivityAt:
 *                         type: string
 *                         format: date-time
 *                         description: Last activity timestamp
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         description: Session expiration timestamp
 *                       isCurrent:
 *                         type: boolean
 *                         description: Whether this is the current session
 *                       isNewDevice:
 *                         type: boolean
 *                         description: Whether this was a new device login
 *                       isSuspicious:
 *                         type: boolean
 *                         description: Whether suspicious activity was detected (anomaly detection)
 *                         example: false
 *                       suspiciousReasons:
 *                         type: array
 *                         items:
 *                           type: string
 *                           enum: [ip_mismatch, user_agent_mismatch, impossible_travel, location_change, multiple_locations, abnormal_activity_pattern]
 *                         description: List of reasons why session is flagged as suspicious
 *                         example: []
 *                       suspiciousDetectedAt:
 *                         type: string
 *                         format: date-time
 *                         description: When suspicious activity was first detected
 *                 count:
 *                   type: number
 *                   description: Total number of active sessions
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/sessions', authenticate, publicRateLimiter, getActiveSessions);

/**
 * @openapi
 * /api/auth/sessions/current:
 *   get:
 *     summary: Get current session information
 *     description: Returns details about the current active session with real-time security warnings
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current session retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     device:
 *                       type: string
 *                     browser:
 *                       type: string
 *                     os:
 *                       type: string
 *                     ip:
 *                       type: string
 *                     location:
 *                       type: object
 *                       properties:
 *                         country:
 *                           type: string
 *                         city:
 *                           type: string
 *                         region:
 *                           type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     lastActivityAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     isCurrent:
 *                       type: boolean
 *                       example: true
 *                     isSuspicious:
 *                       type: boolean
 *                       description: Whether suspicious activity was detected
 *                     suspiciousReasons:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Reasons for suspicious flag
 *                     suspiciousDetectedAt:
 *                       type: string
 *                       format: date-time
 *                 securityWarnings:
 *                   type: array
 *                   description: Real-time security warnings (if any detected)
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [ip_mismatch, user_agent_mismatch]
 *                       message:
 *                         type: string
 *                       details:
 *                         type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
app.get('/sessions/current', authenticate, publicRateLimiter, getCurrentSession);

/**
 * @openapi
 * /api/auth/sessions/stats:
 *   get:
 *     summary: Get session statistics
 *     description: Returns comprehensive session statistics including active count, suspicious sessions, policy settings, and recent sessions
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     activeCount:
 *                       type: number
 *                       description: Number of currently active sessions
 *                       example: 3
 *                     totalCount:
 *                       type: number
 *                       description: Total number of sessions (active + inactive)
 *                       example: 15
 *                     suspiciousCount:
 *                       type: number
 *                       description: Number of active sessions flagged as suspicious
 *                       example: 0
 *                     maxConcurrentSessions:
 *                       type: number
 *                       description: Maximum allowed concurrent sessions from policy
 *                       example: 5
 *                     inactivityTimeoutSeconds:
 *                       type: number
 *                       description: Session inactivity timeout in seconds from policy
 *                       example: 604800
 *                     recentSessions:
 *                       type: array
 *                       description: 10 most recent sessions (active and inactive)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           device:
 *                             type: string
 *                           browser:
 *                             type: string
 *                           os:
 *                             type: string
 *                           location:
 *                             type: object
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           lastActivityAt:
 *                             type: string
 *                             format: date-time
 *                           isActive:
 *                             type: boolean
 *                           isSuspicious:
 *                             type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/sessions/stats', authenticate, publicRateLimiter, getSessionStats);

/**
 * @openapi
 * /api/auth/sessions/{id}:
 *   delete:
 *     summary: Terminate specific session
 *     description: Terminates a specific session by ID. Users can only terminate their own sessions.
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to terminate
 *     responses:
 *       200:
 *         description: Session terminated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
app.delete('/sessions/:id', authenticate, csrfProtection, authRateLimiter, terminateSession);

/**
 * @openapi
 * /api/auth/sessions:
 *   delete:
 *     summary: Terminate all other sessions
 *     description: Terminates all sessions except the current one. Useful for security when a device is lost.
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All other sessions terminated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 terminatedCount:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.delete('/sessions', authenticate, csrfProtection, authRateLimiter, terminateAllOtherSessions);

// ========== Password Management ==========
/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     description: Allows authenticated users to change their password. Validates current password and enforces password policy.
 *     tags:
 *       - Password Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: User's current password
 *               newPassword:
 *                 type: string
 *                 description: New password (must meet policy requirements)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 messageAr:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     passwordChangedAt:
 *                       type: string
 *                       format: date-time
 *                     passwordExpiresAt:
 *                       type: string
 *                       format: date-time
 *                     strengthScore:
 *                       type: number
 *                     strengthLabel:
 *                       type: string
 *       400:
 *         description: Invalid password or policy violation
 *       401:
 *         description: Current password incorrect
 */
app.post('/change-password', authenticate, requireRecentAuthHourly({ purpose: 'password change' }), csrfProtection, authRateLimiter, changePassword);

/**
 * @openapi
 * /api/auth/password-status:
 *   get:
 *     summary: Get password expiration status
 *     description: Returns information about the user's password expiration status and rotation requirements
 *     tags:
 *       - Password Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     mustChangePassword:
 *                       type: boolean
 *                     passwordChangedAt:
 *                       type: string
 *                       format: date-time
 *                     passwordExpiresAt:
 *                       type: string
 *                       format: date-time
 *                     expirationEnabled:
 *                       type: boolean
 *                     daysOld:
 *                       type: number
 *                     daysRemaining:
 *                       type: number
 *                     needsRotation:
 *                       type: boolean
 *                     showWarning:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/password-status', authenticate, publicRateLimiter, getPasswordStatus);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Sends a password reset link to the user's email. Rate limited to 3 requests per hour per email. CAPTCHA verification required if enabled.
 *     tags:
 *       - Password Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Password reset email sent (or email not found - prevents enumeration)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 expiresInMinutes:
 *                   type: number
 *                   example: 30
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 code:
 *                   type: string
 *                   example: RATE_LIMIT_EXCEEDED
 *       500:
 *         description: Server error
 */
app.post('/forgot-password', passwordResetLimiter, captchaForgotPassword, validateForgotPassword, forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     description: Resets user's password using the token sent via email. Token expires in 30 minutes.
 *     tags:
 *       - Password Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token from email
 *               newPassword:
 *                 type: string
 *                 description: New password (must meet policy requirements - min 8 chars, uppercase, lowercase, number, special char)
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *       400:
 *         description: Invalid or expired token, or weak password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 code:
 *                   type: string
 *                   example: INVALID_TOKEN
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 */
app.post('/reset-password', passwordResetLimiter, validateResetPassword, resetPassword);

// ========== Email Verification ==========
/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email with token
 *     description: Verifies user's email address using the token sent via email
 *     tags:
 *       - Email Verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                     name:
 *                       type: string
 *                     isEmailVerified:
 *                       type: boolean
 *                     emailVerifiedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
app.post('/verify-email', publicRateLimiter, verifyEmail);

/**
 * @openapi
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     description: Resends the email verification link to the authenticated user
 *     tags:
 *       - Email Verification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 messageEn:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Email already verified or other error
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
app.post('/resend-verification', authenticate, authRateLimiter, resendVerificationEmail);

// ========== CSRF Token ==========
/**
 * @openapi
 * /api/auth/csrf:
 *   get:
 *     summary: Get fresh CSRF token
 *     description: Returns a new CSRF token for the authenticated user. Token is also set in a cookie for double-submit pattern.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSRF token retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 csrfToken:
 *                   type: string
 *                   description: CSRF token to include in X-CSRF-Token header for state-changing requests
 *                   example: "a1b2c3d4e5f6..."
 *                 enabled:
 *                   type: boolean
 *                   description: Whether CSRF protection is enabled
 *                   example: true
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Token expiration timestamp
 *                 ttl:
 *                   type: number
 *                   description: Token time-to-live in seconds
 *                   example: 3600
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to generate CSRF token
 */
app.get('/csrf', authenticate, publicRateLimiter, getCSRFToken);

// ========== Step-Up Authentication / Reauthentication ==========
/**
 * @openapi
 * /api/auth/reauthenticate:
 *   post:
 *     summary: Verify password or MFA for reauthentication
 *     description: Allows users to verify their identity using password or TOTP for sensitive operations. Updates reauthentication timestamp on success.
 *     tags:
 *       - Reauthentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [password, totp]
 *                 description: Verification method
 *               password:
 *                 type: string
 *                 description: User's password (required if method is 'password')
 *               totpCode:
 *                 type: string
 *                 description: TOTP code from authenticator app (required if method is 'totp')
 *               ttlMinutes:
 *                 type: number
 *                 description: TTL in minutes for reauthentication timestamp (default 24 hours)
 *                 example: 1440
 *     responses:
 *       200:
 *         description: Reauthentication successful
 *       400:
 *         description: Invalid method or missing credentials
 *       401:
 *         description: Invalid password or TOTP code
 */
app.post('/reauthenticate', authenticate, csrfProtection, authRateLimiter, reauthenticate);

/**
 * @openapi
 * /api/auth/reauthenticate/challenge:
 *   post:
 *     summary: Request OTP for reauthentication (email or SMS)
 *     description: Generates and sends an OTP code via email or SMS for reauthentication purposes
 *     tags:
 *       - Reauthentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [email, sms]
 *                 description: OTP delivery method
 *               purpose:
 *                 type: string
 *                 enum: [password_change, mfa_enable, mfa_disable, account_deletion, payment_method, security_settings, sensitive_operation]
 *                 default: sensitive_operation
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid method or purpose
 *       429:
 *         description: Rate limit exceeded
 */
app.post('/reauthenticate/challenge', authenticate, csrfProtection, authRateLimiter, createReauthChallenge);

/**
 * @openapi
 * /api/auth/reauthenticate/verify:
 *   post:
 *     summary: Verify OTP for reauthentication
 *     description: Verifies the OTP code sent via email or SMS. Updates reauthentication timestamp on success.
 *     tags:
 *       - Reauthentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *               purpose:
 *                 type: string
 *                 enum: [password_change, mfa_enable, mfa_disable, account_deletion, payment_method, security_settings, sensitive_operation]
 *                 default: sensitive_operation
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid code or purpose
 *       401:
 *         description: Invalid or expired OTP
 */
app.post('/reauthenticate/verify', authenticate, csrfProtection, authRateLimiter, verifyReauthChallenge);

/**
 * @openapi
 * /api/auth/reauthenticate/status:
 *   get:
 *     summary: Check reauthentication status
 *     description: Returns whether the user has recently authenticated and when the authentication expires
 *     tags:
 *       - Reauthentication
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: maxAgeMinutes
 *         schema:
 *           type: number
 *         description: Maximum age of authentication in minutes (default 24 hours)
 *     responses:
 *       200:
 *         description: Reauthentication status retrieved
 *       401:
 *         description: Not authenticated
 */
app.get('/reauthenticate/status', authenticate, publicRateLimiter, getReauthStatus);

// ========== OAuth SSO Routes ==========
const oauthRoutes = require('./oauth.route');
app.use('/sso', oauthRoutes);

module.exports = app;