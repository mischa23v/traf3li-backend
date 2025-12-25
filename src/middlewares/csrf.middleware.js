/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens on state-changing requests (POST, PUT, DELETE, PATCH).
 * Implements double-submit cookie pattern as fallback.
 *
 * Features:
 * - X-CSRF-Token header validation
 * - Double-submit cookie pattern fallback
 * - Automatic token rotation after validation
 * - Session-based token management
 * - Graceful degradation when CSRF is disabled
 *
 * Usage:
 *   app.post('/api/auth/logout', csrfProtection, controller);
 */

const csrfService = require('../services/csrf.service');
const logger = require('../utils/contextLogger');

/**
 * CSRF Protection Middleware
 * Validates CSRF token for state-changing requests
 *
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 * @param {Function} next - Express next middleware
 */
const csrfProtection = async (request, response, next) => {
    try {
        // Skip if CSRF protection is disabled
        if (!csrfService.isEnabled()) {
            logger.debug('CSRF protection disabled, skipping validation');
            return next();
        }

        // Only validate state-changing requests
        const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
        if (safeMethods.includes(request.method)) {
            logger.debug('Safe HTTP method, skipping CSRF validation', { method: request.method });
            return next();
        }

        // Get session identifier (user ID or session token hash)
        // Priority: userID (from auth middleware) > userId > user._id
        const sessionId = request.userID || request.userId || request.user?._id?.toString();

        if (!sessionId) {
            logger.warn('CSRF validation failed: no session identifier', {
                endpoint: request.originalUrl,
                method: request.method,
                ip: request.ip
            });
            return response.status(403).json({
                error: true,
                message: 'Authentication required for CSRF protection',
                messageAr: 'المصادقة مطلوبة لحماية CSRF',
                code: 'CSRF_NO_SESSION'
            });
        }

        // Extract CSRF token from request
        // Priority: X-CSRF-Token header > x-csrf-token header > cookie
        let token = request.headers['x-csrf-token'] ||
                   request.headers['X-CSRF-Token'];

        // Fallback to double-submit cookie pattern
        if (!token && request.cookies?.csrfToken) {
            token = request.cookies.csrfToken;
            logger.debug('Using CSRF token from cookie (double-submit pattern)');
        }

        // Check if token exists
        if (!token) {
            logger.warn('CSRF token missing', {
                endpoint: request.originalUrl,
                method: request.method,
                sessionId,
                ip: request.ip,
                userAgent: request.headers['user-agent']
            });

            return response.status(403).json({
                error: true,
                message: 'CSRF token required',
                messageAr: 'رمز CSRF مطلوب',
                code: 'CSRF_TOKEN_MISSING',
                details: 'Include X-CSRF-Token header or csrfToken cookie with your request'
            });
        }

        // Validate token
        const validation = await csrfService.validateCSRFToken(token, sessionId, {
            rotate: true // Enable token rotation for security
        });

        if (!validation.valid) {
            logger.warn('CSRF token validation failed', {
                endpoint: request.originalUrl,
                method: request.method,
                sessionId,
                code: validation.code,
                ip: request.ip
            });

            return response.status(403).json({
                error: true,
                message: validation.message,
                messageAr: validation.messageAr,
                code: validation.code
            });
        }

        // Attach new token to response if rotated
        if (validation.newToken) {
            // Set new token in response header
            response.setHeader('X-CSRF-Token', validation.newToken);

            // Also set cookie for double-submit pattern
            response.cookie('csrfToken', validation.newToken, {
                httpOnly: false, // Allow JavaScript access for sending in headers
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production',
                maxAge: parseInt(process.env.CSRF_TOKEN_TTL || '3600', 10) * 1000,
                path: '/'
            });

            logger.debug('CSRF token rotated and sent in response', {
                sessionId,
                endpoint: request.originalUrl
            });
        }

        // Token valid, continue to next middleware
        next();
    } catch (error) {
        logger.error('CSRF middleware error', {
            error: error.message,
            endpoint: request.originalUrl,
            method: request.method
        });

        return response.status(500).json({
            error: true,
            message: 'CSRF validation error',
            messageAr: 'خطأ في التحقق من CSRF',
            code: 'CSRF_VALIDATION_ERROR'
        });
    }
};

/**
 * Generate and attach CSRF token to response
 * Use this middleware on login/register endpoints to provide initial token
 *
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 * @param {Function} next - Express next middleware
 */
const attachCSRFToken = async (request, response, next) => {
    try {
        // Skip if CSRF protection is disabled
        if (!csrfService.isEnabled()) {
            return next();
        }

        // Get session identifier
        const sessionId = request.userID || request.userId || request.user?._id?.toString();

        if (!sessionId) {
            logger.debug('Cannot attach CSRF token: no session identifier');
            return next();
        }

        // Generate CSRF token
        const tokenData = await csrfService.generateCSRFToken(sessionId);

        if (tokenData.token) {
            // Attach token to response for client
            // Store in request for controller to access
            request.csrfToken = tokenData.token;

            logger.debug('CSRF token generated and attached to request', {
                sessionId,
                expiresAt: tokenData.expiresAt
            });
        }

        next();
    } catch (error) {
        logger.error('Failed to attach CSRF token', {
            error: error.message
        });
        // Don't fail the request if CSRF token generation fails
        next();
    }
};

module.exports = {
    csrfProtection,
    attachCSRFToken
};
