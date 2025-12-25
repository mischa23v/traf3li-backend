const jwt = require('jsonwebtoken');
const logger = require('../utils/contextLogger');

/**
 * Middleware to check if the authenticated user is anonymous
 * Use this to restrict sensitive operations for anonymous users
 *
 * Usage:
 *   router.post('/sensitive-operation', authenticate, requireNotAnonymous, handler);
 *   router.get('/limited-feature', authenticate, warnIfAnonymous, handler);
 */

/**
 * Block anonymous users from accessing this route
 * Returns 403 if user is anonymous
 */
const requireNotAnonymous = (request, response, next) => {
    try {
        const { accessToken } = request.cookies;

        if (!accessToken) {
            return response.status(401).json({
                error: true,
                message: 'المصادقة مطلوبة',
                messageEn: 'Authentication required',
                code: 'NO_TOKEN'
            });
        }

        // Decode token to check is_anonymous claim
        const decoded = jwt.decode(accessToken);

        if (decoded && decoded.is_anonymous === true) {
            logger.info('Anonymous user blocked from restricted operation', {
                userId: decoded.id,
                endpoint: request.originalUrl,
                method: request.method
            });

            return response.status(403).json({
                error: true,
                message: 'هذه العملية غير متاحة للمستخدمين المجهولين. يرجى إنشاء حساب كامل.',
                messageEn: 'This operation is not available for anonymous users. Please create a full account.',
                code: 'ANONYMOUS_NOT_ALLOWED',
                requiresAccount: true
            });
        }

        // User is not anonymous, allow access
        return next();
    } catch (error) {
        logger.error('Error in requireNotAnonymous middleware', { error: error.message });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء التحقق من الصلاحيات',
            messageEn: 'An error occurred while checking permissions',
            code: 'PERMISSION_CHECK_FAILED'
        });
    }
};

/**
 * Add isAnonymous flag to request object
 * Does not block access, just adds information
 */
const checkAnonymous = (request, response, next) => {
    try {
        const { accessToken } = request.cookies;

        if (accessToken) {
            const decoded = jwt.decode(accessToken);
            request.isAnonymous = decoded?.is_anonymous === true;
            request.anonymousUserId = decoded?.is_anonymous ? decoded.id : null;
        } else {
            request.isAnonymous = false;
            request.anonymousUserId = null;
        }

        return next();
    } catch (error) {
        logger.error('Error in checkAnonymous middleware', { error: error.message });
        request.isAnonymous = false;
        request.anonymousUserId = null;
        return next();
    }
};

/**
 * Log warning if anonymous user accesses this route
 * Does not block access, just logs for monitoring
 */
const warnIfAnonymous = (request, response, next) => {
    try {
        const { accessToken } = request.cookies;

        if (accessToken) {
            const decoded = jwt.decode(accessToken);

            if (decoded && decoded.is_anonymous === true) {
                logger.warn('Anonymous user accessing monitored endpoint', {
                    userId: decoded.id,
                    endpoint: request.originalUrl,
                    method: request.method,
                    ip: request.ip || request.headers['x-forwarded-for']?.split(',')[0],
                    userAgent: request.headers['user-agent']
                });
            }
        }

        return next();
    } catch (error) {
        logger.error('Error in warnIfAnonymous middleware', { error: error.message });
        return next();
    }
};

/**
 * Apply rate limiting specific to anonymous users
 * Anonymous users get stricter rate limits
 */
const anonymousRateLimit = (anonymousLimit = 10, normalLimit = 100) => {
    return (request, response, next) => {
        try {
            const { accessToken } = request.cookies;

            if (accessToken) {
                const decoded = jwt.decode(accessToken);

                if (decoded && decoded.is_anonymous === true) {
                    // Set stricter rate limit for anonymous users
                    request.rateLimit = anonymousLimit;
                    request.isAnonymous = true;
                } else {
                    request.rateLimit = normalLimit;
                    request.isAnonymous = false;
                }
            } else {
                // No token = treat as anonymous
                request.rateLimit = anonymousLimit;
                request.isAnonymous = true;
            }

            return next();
        } catch (error) {
            logger.error('Error in anonymousRateLimit middleware', { error: error.message });
            request.rateLimit = anonymousLimit; // Default to stricter limit on error
            return next();
        }
    };
};

module.exports = {
    requireNotAnonymous,
    checkAnonymous,
    warnIfAnonymous,
    anonymousRateLimit
};
