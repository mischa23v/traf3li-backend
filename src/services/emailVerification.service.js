/**
 * Email Verification Service
 * Gold Standard Implementation (Google/Microsoft/AWS patterns)
 *
 * KEY FIX: Uses NotificationDeliveryService.sendVerificationEmail() which sends DIRECTLY
 * via Resend API. This bypasses the queue that silently fails when DISABLE_QUEUES=true.
 *
 * Security Features:
 * - Tokens stored as SHA-256 hashes
 * - Timing-safe comparisons
 * - Brute force protection
 * - IP/User-Agent logging
 * - User enumeration prevention
 */

const EmailVerification = require('../models/emailVerification.model');
const { User } = require('../models');
const NotificationDeliveryService = require('./notificationDelivery.service');
const logger = require('../utils/logger');
const { randomTimingDelay, maskEmail } = require('../utils/securityUtils');

class EmailVerificationService {
    /**
     * Send verification email to user
     * @param {string} userId - User ID
     * @param {string} email - User email
     * @param {string} userName - User name for personalization
     * @param {string} language - Language preference (ar/en)
     * @param {Object} options - Additional options
     * @param {string} options.ipAddress - Request IP
     * @param {string} options.userAgent - Request User-Agent
     * @returns {Promise<Object>} Result with success status and message
     */
    static async sendVerificationEmail(userId, email, userName = '', language = 'ar', options = {}) {
        try {
            const { ipAddress = null, userAgent = null } = options;

            // Check if user exists
            // NOTE: Bypass firmIsolation filter - email verification works for solo lawyers without firmId
            const user = await User.findById(userId).setOptions({ bypassFirmFilter: true });
            if (!user) {
                throw new Error('User not found');
            }

            // Check if already verified
            if (user.isEmailVerified) {
                return {
                    success: false,
                    message: 'البريد الإلكتروني مُفعّل بالفعل',
                    messageEn: 'Email already verified',
                    code: 'ALREADY_VERIFIED'
                };
            }

            // Check rate limit
            const rateLimit = await EmailVerification.checkResendRateLimit(userId);
            if (!rateLimit.allowed) {
                return {
                    success: false,
                    message: rateLimit.message,
                    messageEn: rateLimit.messageEn,
                    code: 'RATE_LIMITED',
                    waitSeconds: rateLimit.waitSeconds,
                    waitMinutes: rateLimit.waitMinutes
                };
            }

            // Create new token (secure method with hashing)
            const tokenResult = await EmailVerification.createTokenSecure(userId, email, {
                ipAddress,
                userAgent
            });

            if (!tokenResult.success) {
                return {
                    success: false,
                    message: tokenResult.message,
                    messageEn: tokenResult.messageEn,
                    code: tokenResult.error
                };
            }

            const { verification, rawToken } = tokenResult;

            // Generate verification URL
            const clientUrl = process.env.CLIENT_URL || process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
            const verificationUrl = `${clientUrl}/verify-email?token=${rawToken}`;

            // Send verification email using DIRECT method (bypasses queue)
            const emailResult = await NotificationDeliveryService.sendVerificationEmail({
                email,
                userName: userName || `${user.firstName} ${user.lastName}`.trim() || 'User',
                verificationUrl,
                token: rawToken,
                language
            });

            if (!emailResult.success) {
                logger.error('Failed to send verification email via NotificationDeliveryService', {
                    error: emailResult.error,
                    userId,
                    email: maskEmail(email)
                });

                // Don't expose internal error to user
                return {
                    success: false,
                    message: 'فشل إرسال بريد التفعيل. يرجى المحاولة لاحقاً.',
                    messageEn: 'Failed to send verification email. Please try again later.',
                    code: 'EMAIL_SEND_FAILED'
                };
            }

            logger.info(`Email verification sent to ${maskEmail(email)} for user ${userId}`, {
                messageId: emailResult.messageId
            });

            return {
                success: true,
                message: 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني',
                messageEn: 'Verification link sent to your email',
                expiresAt: verification.expiresAt,
                email: maskEmail(email)
            };
        } catch (error) {
            logger.error('Failed to send verification email', { error: error.message, userId, email: maskEmail(email) });
            throw new Error(`Failed to send verification email: ${error.message}`);
        }
    }

    /**
     * Verify email with token
     * @param {string} token - Verification token
     * @param {Object} options - Additional options
     * @param {string} options.ipAddress - Request IP
     * @param {string} options.userAgent - Request User-Agent
     * @returns {Promise<Object>} Result with success status and user info
     */
    static async verifyEmail(token, options = {}) {
        try {
            const { ipAddress = null, userAgent = null } = options;

            if (!token) {
                return {
                    success: false,
                    message: 'رمز التفعيل مطلوب',
                    messageEn: 'Verification token required',
                    code: 'TOKEN_REQUIRED'
                };
            }

            // Verify token using secure method
            const result = await EmailVerification.verifyTokenSecure(token, {
                ipAddress,
                userAgent
            });

            if (!result.valid) {
                // Handle specific error cases
                if (result.error === 'TOKEN_LOCKED') {
                    return {
                        success: false,
                        message: result.message,
                        messageEn: result.messageEn,
                        code: 'TOKEN_LOCKED',
                        waitMinutes: result.waitMinutes
                    };
                }

                return {
                    success: false,
                    message: 'رمز التفعيل غير صالح أو منتهي الصلاحية',
                    messageEn: 'Invalid or expired verification token',
                    code: result.error
                };
            }

            // Update user
            // NOTE: Bypass firmIsolation filter - email verification works for solo lawyers without firmId
            const user = await User.findOneAndUpdate(
                { _id: result.userId },
                {
                    isEmailVerified: true,
                    emailVerifiedAt: new Date()
                },
                { new: true, bypassFirmFilter: true }
            ).select('_id email username firstName lastName isEmailVerified emailVerifiedAt');

            if (!user) {
                return {
                    success: false,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            logger.info(`Email verified successfully for user ${user._id} (${maskEmail(user.email)})`);

            return {
                success: true,
                message: 'تم تفعيل البريد الإلكتروني بنجاح',
                messageEn: 'Email verified successfully',
                user: {
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    name: `${user.firstName} ${user.lastName}`.trim(),
                    isEmailVerified: user.isEmailVerified,
                    emailVerifiedAt: user.emailVerifiedAt
                }
            };
        } catch (error) {
            logger.error('Failed to verify email', { error: error.message, token: token ? token.substring(0, 8) + '...' : undefined });
            throw new Error(`Failed to verify email: ${error.message}`);
        }
    }

    /**
     * Resend verification email (for authenticated users)
     * @param {string} userId - User ID
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Result with success status and message
     */
    static async resendVerificationEmail(userId, options = {}) {
        try {
            // Get user
            // NOTE: Bypass firmIsolation filter - email verification works for solo lawyers without firmId
            const user = await User.findById(userId).select('email firstName lastName isEmailVerified').setOptions({ bypassFirmFilter: true });

            if (!user) {
                return {
                    success: false,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            // Check if already verified
            if (user.isEmailVerified) {
                return {
                    success: false,
                    message: 'البريد الإلكتروني مُفعّل بالفعل',
                    messageEn: 'Email already verified',
                    code: 'ALREADY_VERIFIED'
                };
            }

            const userName = `${user.firstName} ${user.lastName}`.trim();

            // Send verification email
            return await this.sendVerificationEmail(userId, user.email, userName, 'ar', options);
        } catch (error) {
            logger.error('Failed to resend verification email', { error: error.message, userId });
            throw new Error(`Failed to resend verification email: ${error.message}`);
        }
    }

    /**
     * Request verification email by email address (PUBLIC - no auth required)
     * This endpoint prevents user enumeration by returning the same response
     * regardless of whether the email exists.
     *
     * @param {string} email - Email address
     * @param {Object} options - Additional options
     * @param {string} options.ipAddress - Request IP
     * @param {string} options.userAgent - Request User-Agent
     * @returns {Promise<Object>} Result with success status and message
     */
    static async requestVerificationByEmail(email, options = {}) {
        const { ipAddress = null, userAgent = null } = options;

        try {
            // Add random delay to prevent timing attacks on user enumeration
            await randomTimingDelay(150, 400);

            if (!email || typeof email !== 'string') {
                return {
                    success: false,
                    message: 'البريد الإلكتروني مطلوب',
                    messageEn: 'Email address required',
                    code: 'EMAIL_REQUIRED'
                };
            }

            const normalizedEmail = email.toLowerCase().trim();

            // Find user by email
            // NOTE: Bypass firmIsolation filter - email verification is global
            const user = await User.findOne({ email: normalizedEmail })
                .select('_id email firstName lastName isEmailVerified')
                .setOptions({ bypassFirmFilter: true });

            // SECURITY: Same response regardless of user existence (prevents enumeration)
            const genericResponse = {
                success: true,
                message: 'إذا كان هذا البريد الإلكتروني مسجلاً وغير مُفعّل، سيتم إرسال رابط التفعيل.',
                messageEn: 'If this email is registered and not verified, a verification link will be sent.',
                email: maskEmail(normalizedEmail)
            };

            // User doesn't exist - return generic response
            if (!user) {
                logger.info('Verification request for non-existent email', {
                    email: maskEmail(normalizedEmail),
                    ipAddress
                });
                return genericResponse;
            }

            // User already verified - return generic response
            if (user.isEmailVerified) {
                logger.info('Verification request for already verified email', {
                    userId: user._id,
                    email: maskEmail(normalizedEmail),
                    ipAddress
                });
                return genericResponse;
            }

            // Check rate limit
            const rateLimit = await EmailVerification.checkResendRateLimit(user._id);
            if (!rateLimit.allowed) {
                // Return rate limit error (this is OK to expose as it applies to all requests)
                return {
                    success: false,
                    message: rateLimit.message,
                    messageEn: rateLimit.messageEn,
                    code: 'RATE_LIMITED',
                    waitSeconds: rateLimit.waitSeconds,
                    waitMinutes: rateLimit.waitMinutes
                };
            }

            // Send verification email
            const userName = `${user.firstName} ${user.lastName}`.trim();
            const sendResult = await this.sendVerificationEmail(
                user._id,
                user.email,
                userName,
                'ar',
                { ipAddress, userAgent }
            );

            // Always return generic response to prevent enumeration
            // But log actual result for debugging
            if (!sendResult.success) {
                logger.error('Failed to send verification email in public request', {
                    userId: user._id,
                    email: maskEmail(normalizedEmail),
                    error: sendResult.code
                });
            }

            return genericResponse;
        } catch (error) {
            logger.error('Failed to process verification request', {
                error: error.message,
                email: maskEmail(email),
                ipAddress
            });

            // Return generic response even on error (prevents enumeration)
            return {
                success: true,
                message: 'إذا كان هذا البريد الإلكتروني مسجلاً وغير مُفعّل، سيتم إرسال رابط التفعيل.',
                messageEn: 'If this email is registered and not verified, a verification link will be sent.',
                email: maskEmail(email)
            };
        }
    }

    /**
     * Cleanup expired verification tokens
     * @returns {Promise<number>} Number of deleted tokens
     */
    static async cleanupExpiredTokens() {
        try {
            const deletedCount = await EmailVerification.cleanupExpired();
            logger.info(`Cleaned up ${deletedCount} expired email verification tokens`);
            return deletedCount;
        } catch (error) {
            logger.error('Failed to cleanup expired tokens', { error: error.message });
            throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
        }
    }

    /**
     * Get verification status for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Verification status
     */
    static async getVerificationStatus(userId) {
        try {
            // NOTE: Bypass firmIsolation filter - email verification works for solo lawyers without firmId
            const user = await User.findById(userId).select('email isEmailVerified emailVerifiedAt').setOptions({ bypassFirmFilter: true });

            if (!user) {
                return {
                    success: false,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            let pendingVerification = null;

            if (!user.isEmailVerified) {
                const activeToken = await EmailVerification.findActiveByUserId(userId);
                if (activeToken) {
                    pendingVerification = {
                        expiresAt: activeToken.expiresAt,
                        sentCount: activeToken.sentCount,
                        lastSentAt: activeToken.lastSentAt,
                        canResend: activeToken.canResend()
                    };
                }
            }

            return {
                success: true,
                email: maskEmail(user.email),
                isEmailVerified: user.isEmailVerified,
                emailVerifiedAt: user.emailVerifiedAt,
                pendingVerification
            };
        } catch (error) {
            logger.error('Failed to get verification status', { error: error.message, userId });
            throw new Error(`Failed to get verification status: ${error.message}`);
        }
    }
}

module.exports = EmailVerificationService;
