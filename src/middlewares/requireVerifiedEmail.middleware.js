/**
 * Require Verified Email Middleware
 *
 * Gold Standard (AWS/Google/Stripe Pattern):
 * Blocks access to sensitive operations for users with unverified emails.
 *
 * Usage:
 *   // Single route
 *   router.post('/cases', requireVerifiedEmail, createCase);
 *
 *   // All routes in a router
 *   router.use(requireVerifiedEmail);
 *
 *   // With custom message
 *   router.post('/invoices', requireVerifiedEmail({
 *       feature: 'invoice creation'
 *   }), createInvoice);
 *
 * Response when blocked:
 *   HTTP 403 { code: 'EMAIL_VERIFICATION_REQUIRED', feature: '...' }
 */

const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Mask email for security (u***r@example.com)
 * @param {string} email - Email to mask
 * @returns {string} Masked email
 */
const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '***@***.***';

    const [localPart, domain] = email.split('@');
    const maskedLocal = localPart.length > 2
        ? localPart[0] + '***' + localPart[localPart.length - 1]
        : localPart[0] + '***';

    return `${maskedLocal}@${domain}`;
};

/**
 * Create requireVerifiedEmail middleware
 * @param {Object} options - Middleware options
 * @param {string} options.feature - Feature name for error message
 * @param {boolean} options.allowLegacy - Allow legacy users (default: true for grace period)
 * @returns {Function} Express middleware
 */
const requireVerifiedEmail = (options = {}) => {
    const {
        feature = 'this feature',
        allowLegacy = true
    } = typeof options === 'object' ? options : {};

    return async (req, res, next) => {
        try {
            const userId = req.userID || req.userId;

            if (!userId) {
                return res.status(401).json({
                    error: true,
                    message: 'المصادقة مطلوبة',
                    messageEn: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Fetch user's email verification status
            // NOTE: Bypass firmIsolation - email verification is user-level
            const user = await User.findById(userId)
                .select('email isEmailVerified createdAt')
                .setOptions({ bypassFirmFilter: true })
                .lean();

            if (!user) {
                return res.status(404).json({
                    error: true,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Email is verified - allow access
            if (user.isEmailVerified) {
                return next();
            }

            // Check if legacy user (created before enforcement)
            if (allowLegacy) {
                const enforcementDate = new Date(process.env.EMAIL_VERIFICATION_ENFORCEMENT_DATE || '2025-02-01');
                const isLegacyUser = new Date(user.createdAt) < enforcementDate;

                if (isLegacyUser) {
                    // Add header to prompt frontend to show verification banner
                    res.setHeader('X-Email-Verification-Required', 'true');
                    return next();
                }
            }

            // Block access - email verification required
            logger.warn('Access blocked: email not verified', {
                userId,
                email: user.email,
                feature,
                endpoint: req.originalUrl
            });

            return res.status(403).json({
                error: true,
                message: `يجب تفعيل البريد الإلكتروني للوصول إلى ${feature === 'this feature' ? 'هذه الميزة' : feature}`,
                messageEn: `Email verification required to access ${feature}`,
                code: 'EMAIL_VERIFICATION_REQUIRED',
                email: maskEmail(user.email),
                feature
            });
        } catch (error) {
            logger.error('requireVerifiedEmail middleware error', {
                error: error.message,
                userId: req.userID
            });

            // Fail closed - block access on errors
            return res.status(500).json({
                error: true,
                message: 'خطأ في التحقق من حالة البريد الإلكتروني',
                messageEn: 'Error checking email verification status',
                code: 'VERIFICATION_CHECK_ERROR'
            });
        }
    };
};

/**
 * Shorthand for routes that don't need custom options
 * Usage: router.post('/cases', requireVerifiedEmailMiddleware, createCase);
 */
const requireVerifiedEmailMiddleware = requireVerifiedEmail();

module.exports = {
    requireVerifiedEmail,
    requireVerifiedEmailMiddleware,
    maskEmail
};
