/**
 * Password Expiration Middleware
 *
 * Checks if user's password has expired and requires change.
 * If expired, returns 403 with MUST_CHANGE_PASSWORD error.
 * Only allows access to password change endpoint when expired.
 *
 * Usage:
 * - Apply to protected routes that require valid (non-expired) password
 * - Checks both automatic expiration and forced password change flags
 */

const { checkPasswordAge } = require('../utils/passwordPolicy');
const logger = require('../utils/logger');

/**
 * Middleware to check if user's password has expired
 * Blocks access if password expired, except for password change endpoints
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkPasswordExpiration = async (req, res, next) => {
    try {
        // Only check for authenticated users
        if (!req.user || !req.user._id) {
            return next();
        }

        const user = req.user;

        // Allow access to password change endpoints even if password expired
        const allowedPaths = [
            '/api/auth/change-password',
            '/api/auth/logout',
            '/api/auth/me',
            '/api/auth/sessions'
        ];

        if (allowedPaths.some(path => req.path === path)) {
            return next();
        }

        // Check if user is forced to change password (admin-initiated)
        if (user.mustChangePassword === true) {
            return res.status(403).json({
                error: true,
                code: 'MUST_CHANGE_PASSWORD',
                message: 'You must change your password before accessing this resource',
                messageAr: 'يجب عليك تغيير كلمة المرور قبل الوصول إلى هذا المورد',
                reason: 'admin_forced',
                data: {
                    setAt: user.mustChangePasswordSetAt,
                    changePasswordUrl: '/api/auth/change-password'
                }
            });
        }

        // Check if firm has password expiration enabled
        if (user.firmId) {
            const Firm = require('../models/firm.model');
            const firm = await Firm.findById(user.firmId).select('enterpriseSettings').lean();

            if (firm?.enterpriseSettings?.enablePasswordExpiration) {
                const maxAgeDays = firm.enterpriseSettings.passwordMaxAgeDays || 90;

                // Check password age
                const ageCheck = checkPasswordAge(user, maxAgeDays);

                if (ageCheck.needsRotation) {
                    return res.status(403).json({
                        error: true,
                        code: 'PASSWORD_EXPIRED',
                        message: 'Your password has expired. Please change your password to continue.',
                        messageAr: 'انتهت صلاحية كلمة المرور الخاصة بك. يرجى تغيير كلمة المرور للمتابعة.',
                        reason: 'automatic_expiration',
                        data: {
                            daysOld: ageCheck.daysOld,
                            expiresAt: ageCheck.expiresAt,
                            maxAgeDays,
                            changePasswordUrl: '/api/auth/change-password'
                        }
                    });
                }

                // Check if password is expiring soon (within warning period)
                const warningDays = firm.enterpriseSettings.passwordExpiryWarningDays || 7;
                if (ageCheck.daysRemaining <= warningDays && ageCheck.daysRemaining > 0) {
                    // Add warning to response headers (frontend can display banner)
                    res.setHeader('X-Password-Expiry-Warning', 'true');
                    res.setHeader('X-Password-Days-Remaining', ageCheck.daysRemaining.toString());
                    res.setHeader('X-Password-Expires-At', ageCheck.expiresAt.toISOString());
                }
            }

            // Check if firm requires all users to change password
            if (firm?.enterpriseSettings?.requirePasswordChange) {
                // Check if user has changed password after the requirement was set
                const requirementSetAt = firm.enterpriseSettings.requirePasswordChangeSetAt;
                const userPasswordChangedAt = user.passwordChangedAt;

                if (!userPasswordChangedAt ||
                    (requirementSetAt && userPasswordChangedAt < requirementSetAt)) {
                    return res.status(403).json({
                        error: true,
                        code: 'FIRM_PASSWORD_CHANGE_REQUIRED',
                        message: 'Your organization requires all users to change their password. Please update your password to continue.',
                        messageAr: 'تطلب مؤسستك من جميع المستخدمين تغيير كلمة المرور. يرجى تحديث كلمة المرور للمتابعة.',
                        reason: 'firm_requirement',
                        data: {
                            requirementSetAt,
                            changePasswordUrl: '/api/auth/change-password'
                        }
                    });
                }
            }
        }

        // Password is valid, continue
        next();
    } catch (error) {
        logger.error('Password expiration check error:', error);
        // Don't block request on error, just log it
        next();
    }
};

/**
 * Helper function to check if password will expire soon
 * Can be used in controllers to send proactive warnings
 *
 * @param {Object} user - User document
 * @param {Object} firm - Firm document
 * @returns {Object} - Expiration info
 */
const getPasswordExpirationInfo = (user, firm) => {
    if (!firm?.enterpriseSettings?.enablePasswordExpiration) {
        return {
            enabled: false,
            needsRotation: false,
            warningNeeded: false
        };
    }

    const maxAgeDays = firm.enterpriseSettings.passwordMaxAgeDays || 90;
    const warningDays = firm.enterpriseSettings.passwordExpiryWarningDays || 7;

    const ageCheck = checkPasswordAge(user, maxAgeDays);

    return {
        enabled: true,
        needsRotation: ageCheck.needsRotation,
        warningNeeded: ageCheck.daysRemaining <= warningDays && ageCheck.daysRemaining > 0,
        daysOld: ageCheck.daysOld,
        daysRemaining: ageCheck.daysRemaining,
        expiresAt: ageCheck.expiresAt,
        maxAgeDays,
        warningDays
    };
};

/**
 * Middleware version that only adds warning headers without blocking
 * Use this for less critical endpoints where you want to warn but not block
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const addPasswordExpiryWarning = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id || !req.user.firmId) {
            return next();
        }

        const Firm = require('../models/firm.model');
        const firm = await Firm.findById(req.user.firmId).select('enterpriseSettings').lean();

        const expirationInfo = getPasswordExpirationInfo(req.user, firm);

        if (expirationInfo.warningNeeded) {
            res.setHeader('X-Password-Expiry-Warning', 'true');
            res.setHeader('X-Password-Days-Remaining', expirationInfo.daysRemaining.toString());
            res.setHeader('X-Password-Expires-At', expirationInfo.expiresAt.toISOString());
        }

        next();
    } catch (error) {
        logger.error('Password expiry warning error:', error);
        next();
    }
};

module.exports = {
    checkPasswordExpiration,
    getPasswordExpirationInfo,
    addPasswordExpiryWarning
};
