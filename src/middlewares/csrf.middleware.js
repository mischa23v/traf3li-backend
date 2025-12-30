/**
 * CSRF Protection Middleware - Industry Gold Standard Implementation
 *
 * Implements multiple layers of protection following practices from
 * Stripe, Auth0, Google, and Cloudflare:
 *
 * 1. Origin Header Validation (primary defense)
 * 2. Double-Submit Cookie Pattern (secondary defense)
 * 3. Token Rotation (replay attack prevention)
 * 4. Proper SameSite Cookie Configuration (browser-level protection)
 *
 * Features:
 * - Origin/Referer header validation before token check
 * - X-CSRF-Token header validation
 * - Double-submit cookie pattern
 * - Automatic token rotation after validation
 * - Centralized cookie configuration for cross-origin support
 * - Graceful degradation when CSRF is disabled
 *
 * Usage:
 *   app.post('/api/auth/logout', csrfProtection, controller);
 */

const csrfService = require('../services/csrf.service');
const logger = require('../utils/contextLogger');
const { getCSRFCookieConfig } = require('../utils/cookieConfig');

// ═══════════════════════════════════════════════════════════════
// CSRF EXEMPT ROUTES (public endpoints that don't require CSRF)
// ═══════════════════════════════════════════════════════════════

/**
 * Routes that are exempt from CSRF validation
 * These are public endpoints used before authentication (login flows)
 * Origin validation is still performed for security
 */
// NOTE: These are full paths (CSRF middleware is applied per-route, not mounted)
// Must match PUBLIC_ROUTES in authenticatedApi.middleware.js
const CSRF_EXEMPT_ROUTES = [
    // Core auth (with /api prefix)
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-captcha',
    // SSO/OAuth
    '/api/auth/sso/initiate',
    '/api/auth/sso/detect',
    '/api/auth/sso/callback',
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/saml',
    '/api/auth/saml/callback',
    // WebAuthn/Passkeys
    '/api/auth/webauthn/authenticate/start',
    '/api/auth/webauthn/authenticate/finish',
    // LDAP
    '/api/auth/ldap/login',
    // MFA
    '/api/auth/mfa/verify',
    '/api/auth/mfa/backup-codes/verify',
    // Webhooks
    '/api/webhooks',

    // Same routes without /api prefix (for mounted routes)
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-captcha',
    '/auth/sso/initiate',
    '/auth/sso/detect',
    '/auth/sso/callback',
    '/auth/google',
    '/auth/google/callback',
    '/auth/saml',
    '/auth/saml/callback',
    '/auth/webauthn/authenticate/start',
    '/auth/webauthn/authenticate/finish',
    '/auth/ldap/login',
    '/auth/mfa/verify',
    '/auth/mfa/backup-codes/verify',
    '/webhooks',
];

/**
 * Check if path matches any exempt route
 */
const isCSRFExempt = (path) => {
    return CSRF_EXEMPT_ROUTES.some(route => {
        if (path === route || path.startsWith(route + '/')) {
            return true;
        }
        return path.startsWith(route);
    });
};

// ═══════════════════════════════════════════════════════════════
// ALLOWED ORIGINS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get allowed origins from environment or use defaults
 * Production: traf3li.com subdomains
 * Development: localhost variants
 */
const getAllowedOrigins = () => {
    // Allow configuration via environment variable
    if (process.env.ALLOWED_ORIGINS) {
        return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().toLowerCase());
    }

    const isProduction = process.env.NODE_ENV === 'production';

    // Base production origins
    const productionOrigins = [
        'https://traf3li.com',
        'https://www.traf3li.com',
        'https://dashboard.traf3li.com',
        'https://api.traf3li.com',
        'https://app.traf3li.com'
    ];

    // Development origins (localhost variants)
    const devOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:5176'
    ];

    // In production, include both production AND dev origins
    // This allows local development against production API
    if (isProduction) {
        return [...productionOrigins, ...devOrigins];
    }

    // In development, only need dev origins
    return devOrigins;
};

// ═══════════════════════════════════════════════════════════════
// ORIGIN VALIDATION (Gold Standard - used by Stripe, Cloudflare)
// ═══════════════════════════════════════════════════════════════

/**
 * Validate Origin header against allowed origins
 * This is the PRIMARY defense against CSRF (before token validation)
 *
 * @param {Object} request - Express request object
 * @returns {Object} - { valid: boolean, origin: string|null, reason: string }
 */
const validateOrigin = (request) => {
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    const allowedOrigins = getAllowedOrigins();

    // For same-origin requests, Origin header might be absent
    // In that case, check Referer header
    if (!origin) {
        // No Origin header - check Referer as fallback
        if (!referer) {
            // Both missing - this could be:
            // 1. Same-origin request from older browser
            // 2. Direct API call (curl, Postman)
            // 3. Attacker trying to bypass
            // Be strict in production, lenient in development
            const isProduction = process.env.NODE_ENV === 'production';
            if (isProduction) {
                logger.warn('CSRF: No Origin or Referer header in production', {
                    method: request.method,
                    path: request.path,
                    ip: request.ip
                });
                // Still allow but log - some legitimate requests may not have these
                return { valid: true, origin: null, reason: 'no_origin_header' };
            }
            return { valid: true, origin: null, reason: 'development_mode' };
        }

        // Extract origin from Referer
        try {
            const refererUrl = new URL(referer);
            const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

            const isAllowed = allowedOrigins.some(allowed =>
                refererOrigin.toLowerCase() === allowed.toLowerCase()
            );

            if (!isAllowed) {
                return {
                    valid: false,
                    origin: refererOrigin,
                    reason: 'referer_not_allowed'
                };
            }

            return { valid: true, origin: refererOrigin, reason: 'referer_validated' };
        } catch {
            return { valid: false, origin: null, reason: 'invalid_referer' };
        }
    }

    // Validate Origin header
    const isAllowed = allowedOrigins.some(allowed =>
        origin.toLowerCase() === allowed.toLowerCase()
    );

    if (!isAllowed) {
        // Check if it's a subdomain of traf3li.com (dynamic subdomain support)
        try {
            const originUrl = new URL(origin);
            const hostname = originUrl.hostname;

            if (hostname === 'traf3li.com' || hostname.endsWith('.traf3li.com')) {
                return { valid: true, origin, reason: 'traf3li_subdomain' };
            }
        } catch {
            // Invalid URL
        }

        return { valid: false, origin, reason: 'origin_not_allowed' };
    }

    return { valid: true, origin, reason: 'origin_allowed' };
};

// ═══════════════════════════════════════════════════════════════
// MAIN CSRF PROTECTION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * CSRF Protection Middleware
 * Validates Origin header and CSRF token for state-changing requests
 *
 * Defense layers:
 * 1. Origin/Referer validation (blocks most attacks)
 * 2. CSRF token validation (defense in depth)
 * 3. Token rotation (prevents replay)
 *
 * @param {Object} request - Express request object
 * @param {Object} response - Express response object
 * @param {Function} next - Express next middleware
 */
const csrfProtection = async (request, response, next) => {
    try {
        // Aggressive logging for debugging
        // eslint-disable-next-line no-console
        console.log('[CSRF] Validating request:', {
            method: request.method,
            path: request.path,
            origin: request.headers.origin || 'none',
            referer: request.headers.referer || 'none',
            hasCSRFHeader: !!request.headers['x-csrf-token'],
            hasCSRFCookie: !!request.cookies?.csrfToken,
            cookies: Object.keys(request.cookies || {})
        });

        // Skip if CSRF protection is disabled
        if (!csrfService.isEnabled()) {
            // eslint-disable-next-line no-console
            console.log('[CSRF] Protection disabled, skipping validation');
            logger.debug('CSRF protection disabled, skipping validation');
            return next();
        }

        // Only validate state-changing requests
        const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
        if (safeMethods.includes(request.method)) {
            // eslint-disable-next-line no-console
            console.log('[CSRF] Safe HTTP method, skipping:', request.method);
            logger.debug('Safe HTTP method, skipping CSRF validation', { method: request.method });
            return next();
        }

        // Skip CSRF for exempt routes (public login endpoints)
        if (isCSRFExempt(request.path)) {
            // eslint-disable-next-line no-console
            console.log('[CSRF] Exempt route, skipping:', request.path);
            logger.debug('CSRF exempt route, skipping validation', { path: request.path });
            return next();
        }

        // ─────────────────────────────────────────────────────────
        // LAYER 1: Origin Header Validation (Primary Defense)
        // ─────────────────────────────────────────────────────────
        const originValidation = validateOrigin(request);

        if (!originValidation.valid) {
            logger.warn('CSRF: Origin validation failed', {
                origin: originValidation.origin,
                reason: originValidation.reason,
                endpoint: request.originalUrl,
                method: request.method,
                ip: request.ip,
                userAgent: request.headers['user-agent']
            });

            return response.status(403).json({
                error: true,
                message: 'Request origin not allowed',
                messageAr: 'مصدر الطلب غير مسموح به',
                code: 'CSRF_ORIGIN_INVALID'
            });
        }

        // ─────────────────────────────────────────────────────────
        // LAYER 2: Session Validation
        // ─────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────
        // LAYER 3: CSRF Token Validation (Defense in Depth)
        // ─────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────
        // SUCCESS: Attach rotated token to response
        // ─────────────────────────────────────────────────────────
        if (validation.newToken) {
            // Set new token in response header
            response.setHeader('X-CSRF-Token', validation.newToken);

            // Also set cookie for double-submit pattern
            // Use centralized cookie config for proper cross-origin support
            const cookieConfig = getCSRFCookieConfig(request);
            response.cookie('csrfToken', validation.newToken, cookieConfig);

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

// ═══════════════════════════════════════════════════════════════
// ATTACH CSRF TOKEN MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Generate and attach CSRF token to response
 * Use this middleware on login/register endpoints to provide initial token
 *
 * Sets token in:
 * 1. Response header (X-CSRF-Token)
 * 2. Cookie (csrfToken) - for double-submit pattern
 * 3. Request object (request.csrfToken) - for controller access
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
            // Store in request for controller to access
            request.csrfToken = tokenData.token;

            // Set token in response header
            response.setHeader('X-CSRF-Token', tokenData.token);

            // Set cookie for double-submit pattern
            // Use centralized cookie config for proper cross-origin support
            const cookieConfig = getCSRFCookieConfig(request);
            response.cookie('csrfToken', tokenData.token, cookieConfig);

            logger.debug('CSRF token generated and attached', {
                sessionId,
                expiresAt: tokenData.expiresAt,
                cookieSameSite: cookieConfig.sameSite
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
    attachCSRFToken,
    // Export for testing
    validateOrigin,
    getAllowedOrigins
};
