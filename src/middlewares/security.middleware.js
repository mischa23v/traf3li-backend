const crypto = require('crypto');
const logger = require('../utils/logger');
const { getCookieDomain } = require('../controllers/auth.controller');

// Robust production detection for cross-origin cookie settings
// Checks multiple indicators to determine if we're in a production environment
const isProductionEnv = process.env.NODE_ENV === 'production' ||
                        process.env.NODE_ENV === 'prod' ||
                        process.env.RENDER === 'true' ||
                        process.env.VERCEL_ENV === 'production' ||
                        process.env.RAILWAY_ENVIRONMENT === 'production';

/**
 * Origin Check Middleware
 * Verifies that the Origin or Referer header matches allowed origins
 * Provides defense-in-depth against CSRF attacks
 */
const allowedOrigins = [
    // Production URLs
    'https://traf3li.com',
    'https://dashboard.traf3li.com',
    'https://www.traf3li.com',
    'https://www.dashboard.traf3li.com',

    // Development URLs
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:8080',

    // Environment variables
    process.env.CLIENT_URL,
    process.env.DASHBOARD_URL
].filter(Boolean);

const originCheck = (req, res, next) => {
    // Skip for GET, HEAD, OPTIONS (safe methods)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const origin = req.headers.origin || req.headers.referer;

    // Allow requests with no origin (mobile apps, server-to-server)
    // This is acceptable for API-only backends with other protections
    if (!origin) {
        logger.warn('Request without origin/referer header', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        return next();
    }

    // Extract hostname from origin/referer
    let originHostname;
    try {
        const url = new URL(origin);
        originHostname = url.origin;
    } catch (error) {
        logger.warn('Invalid origin/referer URL', { origin });
        return res.status(403).json({
            error: true,
            message: 'Invalid origin'
        });
    }

    // Check if origin matches allowed list
    const isAllowed = allowedOrigins.some(allowed =>
        originHostname === allowed || originHostname.startsWith(allowed)
    );

    // Special handling for Vercel preview deployments
    const isVercelPreview = originHostname.includes('.vercel.app');

    if (isAllowed || isVercelPreview) {
        return next();
    }

    logger.warn('Origin check failed', {
        origin: originHostname,
        method: req.method,
        path: req.path,
        ip: req.ip
    });

    return res.status(403).json({
        error: true,
        message: 'Origin not allowed'
    });
};

/**
 * No Cache Middleware
 * Prevents caching of sensitive endpoints (auth, payments, user data)
 * Ensures fresh data and prevents sensitive data from being cached
 */
const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
};

/**
 * Validate Content-Type Middleware
 * Ensures POST/PUT/PATCH requests have proper Content-Type header
 * Prevents content-type confusion attacks
 */
const validateContentType = (req, res, next) => {
    // Only validate for methods that typically send data
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return next();
    }

    const contentType = req.headers['content-type'];

    // If no body is expected (Content-Length: 0), skip validation
    if (req.headers['content-length'] === '0') {
        return next();
    }

    // Allow multipart/form-data for file uploads
    if (contentType && contentType.includes('multipart/form-data')) {
        return next();
    }

    // Require application/json for JSON APIs
    if (!contentType || !contentType.includes('application/json')) {
        logger.warn('Invalid or missing Content-Type', {
            method: req.method,
            path: req.path,
            contentType: contentType || 'none',
            ip: req.ip
        });

        return res.status(415).json({
            error: true,
            message: 'Content-Type must be application/json or multipart/form-data'
        });
    }

    next();
};

/**
 * Double-Submit Cookie Pattern for CSRF Protection
 * Generates a random token and stores it in both a cookie and requires it in request header
 * For state-changing operations, client must send the token from cookie in a custom header
 */

// Middleware to generate and set CSRF token cookie
const setCsrfToken = (req, res, next) => {
    // Check if token already exists in cookies
    let csrfToken = req.cookies['csrf-token'];

    // Generate new token if it doesn't exist
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(32).toString('hex');

        // Set as httpOnly cookie (more secure, but still readable by frontend via document.cookie workaround)
        // For double-submit pattern, we need it to be readable by client JS
        res.cookie('csrf-token', csrfToken, {
            httpOnly: false, // Must be false so client can read it
            secure: isProductionEnv, // HTTPS only in production
            sameSite: isProductionEnv ? 'none' : 'lax', // 'none' for cross-origin in production, 'lax' for development
            maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days (matching JWT token expiration)
            path: '/',
            domain: getCookieDomain(req) // Dynamic: '.traf3li.com' for production domains, undefined for Vercel
        });
    }

    // Make token available to response for initial setup
    res.locals.csrfToken = csrfToken;

    next();
};

// Public auth routes that should be exempt from CSRF validation
// These are pre-authentication endpoints where users don't have a session yet
// Note: These paths are relative to the /api mount point (req.path excludes /api prefix)
const csrfExemptPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/send-otp',
    '/auth/verify-otp',
    '/auth/resend-otp',
    '/auth/check-availability',
    '/auth/logout',
    // Versioned auth routes
    '/v1/auth/login',
    '/v1/auth/register',
    '/v1/auth/send-otp',
    '/v1/auth/verify-otp',
    '/v1/auth/resend-otp',
    '/v1/auth/check-availability',
    '/v1/auth/logout',
    '/v2/auth/login',
    '/v2/auth/register',
    '/v2/auth/send-otp',
    '/v2/auth/verify-otp',
    '/v2/auth/resend-otp',
    '/v2/auth/check-availability',
    '/v2/auth/logout',
    // Webhook endpoints (have their own signature verification)
    '/webhooks'
];

// Middleware to validate CSRF token on state-changing requests
const validateCsrfToken = (req, res, next) => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip CSRF validation for exempt paths (public auth endpoints)
    const isExempt = csrfExemptPaths.some(path =>
        req.path === path || req.path.startsWith(path + '/')
    );

    if (isExempt) {
        logger.debug('CSRF validation skipped for exempt path', { path: req.path });
        return next();
    }

    const cookieToken = req.cookies['csrf-token'];
    const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

    // Check if tokens exist
    if (!cookieToken) {
        logger.warn('CSRF token missing from cookie', {
            method: req.method,
            path: req.path,
            ip: req.ip
        });

        return res.status(403).json({
            error: true,
            message: 'CSRF token missing. Please refresh the page.'
        });
    }

    if (!headerToken) {
        logger.warn('CSRF token missing from header', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            headers: Object.keys(req.headers)
        });

        return res.status(403).json({
            error: true,
            message: 'CSRF token required in X-CSRF-Token header'
        });
    }

    // Validate tokens match (constant-time comparison to prevent timing attacks)
    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    if (cookieBuffer.length !== headerBuffer.length) {
        logger.warn('CSRF token length mismatch', {
            method: req.method,
            path: req.path,
            ip: req.ip
        });

        return res.status(403).json({
            error: true,
            message: 'Invalid CSRF token'
        });
    }

    // Use crypto.timingSafeEqual for constant-time comparison
    if (!crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
        logger.warn('CSRF token validation failed', {
            method: req.method,
            path: req.path,
            ip: req.ip
        });

        return res.status(403).json({
            error: true,
            message: 'Invalid CSRF token'
        });
    }

    // Token is valid
    next();
};

/**
 * Security Headers Middleware
 * Additional security headers not covered by helmet
 */
const securityHeaders = (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS protection (legacy, but defense-in-depth)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    next();
};

/**
 * Request sanitization middleware
 * Prevents common injection attacks by sanitizing input
 */
const sanitizeRequest = (req, res, next) => {
    // Recursively sanitize object
    const sanitize = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                // Remove null bytes
                obj[key] = obj[key].replace(/\0/g, '');

                // Limit string length to prevent DoS
                if (obj[key].length > 1000000) { // 1MB limit
                    obj[key] = obj[key].substring(0, 1000000);
                }
            } else if (typeof obj[key] === 'object') {
                sanitize(obj[key]);
            }
        }

        return obj;
    };

    // Sanitize body, query, and params
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);

    next();
};

module.exports = {
    originCheck,
    noCache,
    validateContentType,
    setCsrfToken,
    validateCsrfToken,
    securityHeaders,
    sanitizeRequest
};
