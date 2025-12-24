const express = require('express');
const { authLogin, authLogout, authLogoutAll, authRegister, authStatus, checkAvailability, getOnboardingStatus, refreshAccessToken, sendMagicLink, verifyMagicLink, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { sendOTP, verifyOTP, resendOTP, checkOTPStatus } = require('../controllers/otp.controller');
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
const { authenticate } = require('../middlewares');
const { authRateLimiter, sensitiveRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateLogin,
    validateRegister,
    validateSendOTP,
    validateVerifyOTP,
    validateCheckAvailability,
    validateSendMagicLink,
    validateVerifyMagicLink,
    validateForgotPassword,
    validateResetPassword
} = require('../validators/auth.validator');

const app = express.Router();

/**
 * @openapi
 * /api/auth/check-availability:
 *   post:
 *     summary: Check availability of email, username, or phone
 *     description: Validates if an email, username, or phone number is available for registration
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
app.post('/check-availability', publicRateLimiter, validateCheckAvailability, checkAvailability);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email and password
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
app.post('/register', authRateLimiter, validateRegister, authRegister);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Authenticates a user and returns JWT tokens
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
app.post('/login', authRateLimiter, validateLogin, authLogin);

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
app.post('/logout', authLogout)

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
app.post('/send-otp', sensitiveRateLimiter, validateSendOTP, sendOTP);

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
app.post('/verify-otp', authRateLimiter, validateVerifyOTP, verifyOTP);

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
app.post('/mfa/backup-codes/generate', authenticate, sensitiveRateLimiter, generateBackupCodes);

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
app.post('/mfa/backup-codes/regenerate', authenticate, sensitiveRateLimiter, regenerateBackupCodes);

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
 *     description: Returns all active sessions for the authenticated user with device and location information
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
 *                       device:
 *                         type: string
 *                       browser:
 *                         type: string
 *                       os:
 *                         type: string
 *                       ip:
 *                         type: string
 *                       location:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       lastActivityAt:
 *                         type: string
 *                         format: date-time
 *                       isCurrent:
 *                         type: boolean
 *                 count:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/sessions', authenticate, publicRateLimiter, getActiveSessions);

/**
 * @openapi
 * /api/auth/sessions/current:
 *   get:
 *     summary: Get current session information
 *     description: Returns details about the current active session
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
 *     description: Returns session statistics including active count and recent sessions
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session statistics retrieved successfully
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
app.delete('/sessions/:id', authenticate, authRateLimiter, terminateSession);

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
app.delete('/sessions', authenticate, authRateLimiter, terminateAllOtherSessions);

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
app.post('/change-password', authenticate, authRateLimiter, changePassword);

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
 *     description: Sends a password reset link to the user's email. Rate limited to 3 requests per hour per email.
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
app.post('/forgot-password', sensitiveRateLimiter, validateForgotPassword, forgotPassword);

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
app.post('/reset-password', authRateLimiter, validateResetPassword, resetPassword);

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

// ========== OAuth SSO Routes ==========
const oauthRoutes = require('./oauth.route');
app.use('/sso', oauthRoutes);

module.exports = app;