/**
 * Email Verification Middleware
 * Checks if user's email is verified before allowing access to protected routes
 */

const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware to require email verification
 * Use this on routes that should only be accessible to users with verified emails
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowUnverified - If true, allows access but adds warning to response
 * @param {Array<string>} options.exemptRoles - Roles that are exempt from verification requirement (e.g., ['admin'])
 */
const requireEmailVerification = (options = {}) => {
    const { allowUnverified = false, exemptRoles = [] } = options;

    return async (request, response, next) => {
        try {
            // Get user ID from authenticated request
            const userId = request.userID || request.userId || request.user?._id || request.user?.id;

            if (!userId) {
                return response.status(401).json({
                    error: true,
                    message: 'يجب تسجيل الدخول',
                    messageEn: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Get user with email verification status
            const user = await User.findById(userId).select('email isEmailVerified emailVerifiedAt role');

            if (!user) {
                return response.status(404).json({
                    error: true,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Check if user's role is exempt from verification
            if (exemptRoles.includes(user.role)) {
                return next();
            }

            // Check if email is verified
            if (!user.isEmailVerified) {
                if (allowUnverified) {
                    // Add verification warning to request
                    request.emailVerificationWarning = {
                        isVerified: false,
                        message: 'البريد الإلكتروني غير مُفعّل',
                        messageEn: 'Email not verified'
                    };
                    return next();
                }

                // Block access if email is not verified
                return response.status(403).json({
                    error: true,
                    message: 'يجب تفعيل البريد الإلكتروني للوصول إلى هذه الميزة',
                    messageEn: 'Email verification required to access this feature',
                    code: 'EMAIL_NOT_VERIFIED',
                    data: {
                        isEmailVerified: false,
                        email: user.email,
                        requiresVerification: true
                    }
                });
            }

            // Email is verified, allow access
            next();
        } catch (error) {
            logger.error('Email verification middleware error', { error: error.message, userId });
            return response.status(500).json({
                error: true,
                message: 'حدث خطأ أثناء التحقق من حالة البريد الإلكتروني',
                messageEn: 'An error occurred while checking email verification status'
            });
        }
    };
};

/**
 * Middleware to add email verification status to request
 * This doesn't block access, just adds verification info to the request object
 */
const addEmailVerificationStatus = async (request, response, next) => {
    try {
        // Get user ID from authenticated request
        const userId = request.userID || request.userId || request.user?._id || request.user?.id;

        if (!userId) {
            return next();
        }

        // Get user with email verification status
        const user = await User.findById(userId).select('email isEmailVerified emailVerifiedAt');

        if (user) {
            request.emailVerificationStatus = {
                isVerified: user.isEmailVerified || false,
                verifiedAt: user.emailVerifiedAt,
                email: user.email
            };
        }

        next();
    } catch (error) {
        logger.error('Add email verification status middleware error', { error: error.message, userId });
        // Continue even if there's an error
        next();
    }
};

/**
 * Middleware to check if email verification is needed and add to response
 * This adds a verification reminder to successful responses
 */
const addVerificationReminder = async (request, response, next) => {
    try {
        const userId = request.userID || request.userId || request.user?._id || request.user?.id;

        if (!userId) {
            return next();
        }

        const user = await User.findById(userId).select('isEmailVerified');

        if (user && !user.isEmailVerified) {
            // Store original json method
            const originalJson = response.json.bind(response);

            // Override json method to add verification reminder
            response.json = function(data) {
                if (data && !data.error) {
                    data.verificationReminder = {
                        isEmailVerified: false,
                        message: 'يرجى تفعيل بريدك الإلكتروني للوصول إلى جميع الميزات',
                        messageEn: 'Please verify your email to access all features'
                    };
                }
                return originalJson(data);
            };
        }

        next();
    } catch (error) {
        logger.error('Verification reminder middleware error', { error: error.message, userId });
        // Continue even if there's an error
        next();
    }
};

module.exports = {
    requireEmailVerification,
    addEmailVerificationStatus,
    addVerificationReminder
};
