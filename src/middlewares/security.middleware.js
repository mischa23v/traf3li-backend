/**
 * Unified Security Middleware Stack
 *
 * Combines all security layers into a single, easy-to-apply middleware.
 * Use this to ensure consistent security across all routes.
 */

const authenticate = require('./authenticate');
const { firmFilter, checkFirmPermission, firmOwnerOnly, firmAdminOnly } = require('./firmFilter.middleware');
const { resourceAccessMiddleware, checkResourceAccess } = require('./resourceAccess.middleware');
const { autoDetectWebhookAuth, preserveRawBody } = require('./webhookAuth.middleware');
const { enforceMiddleware } = require('../config/permissions.config');
const { ROUTE_SECURITY, getRouteSecurityConfig } = require('../config/routeSecurity.config');

/**
 * Apply full security stack based on configuration
 */
const applySecurityStack = (config) => {
    const stack = [];

    // Webhook routes - signature validation only, no user auth
    if (config.webhookAuth) {
        stack.push(preserveRawBody);
        stack.push(autoDetectWebhookAuth(config.webhookAuth));
        return stack;
    }

    // Public routes - no security
    if (config.auth === false) {
        return stack;
    }

    // 1. Authentication
    stack.push(authenticate);

    // 2. Firm context and isolation
    if (config.firmFilter !== false) {
        stack.push(firmFilter);
    }

    // 3. Owner-only check
    if (config.ownerOnly) {
        stack.push(firmOwnerOnly);
    }
    // 4. Admin-only check
    else if (config.adminOnly) {
        stack.push(firmAdminOnly);
    }

    // 5. Permission check
    if (config.permission) {
        stack.push(enforceMiddleware(config.permission.module, config.permission.level));
    }

    // 6. Resource access / IDOR protection
    if (config.resourceAccess) {
        stack.push(resourceAccessMiddleware(config.resourceAccess));
    }

    return stack;
};

/**
 * Secure route middleware factory
 *
 * Usage:
 *   router.get('/:id', secure({ model: 'Case', permission: 'cases:view' }), controller.get);
 *   router.post('/', secure({ permission: 'cases:edit' }), controller.create);
 *   router.delete('/:id', secure({ model: 'Case', permission: 'cases:full', adminOnly: true }), controller.delete);
 */
const secure = (options = {}) => {
    const config = {
        auth: true,
        firmFilter: true,
        ...options
    };

    // Parse permission shorthand 'module:level' format
    if (typeof config.permission === 'string') {
        const [module, level] = config.permission.split(':');
        config.permission = { module, level };
    }

    // Convert model to resourceAccess config
    if (config.model && !config.resourceAccess) {
        config.resourceAccess = { model: config.model, param: 'id' };
    }

    return applySecurityStack(config);
};

/**
 * Apply security from route registry
 *
 * Usage in route files:
 *   router.get('/cases', ...secureFromRegistry('GET', '/api/cases'), controller.list);
 */
const secureFromRegistry = (method, path) => {
    const config = getRouteSecurityConfig(method, path);
    if (!config) {
        // eslint-disable-next-line no-console
        console.warn(`[Security] No security config found for ${method} ${path}`);
        return [authenticate, firmFilter]; // Default to authenticated + firm filter
    }
    return applySecurityStack(config);
};

/**
 * Quick helpers for common patterns
 */
const secureView = (module, model = null) => secure({
    permission: `${module}:view`,
    model
});

const secureEdit = (module, model = null) => secure({
    permission: `${module}:edit`,
    model
});

const secureFull = (module, model = null) => secure({
    permission: `${module}:full`,
    model
});

const secureAdmin = (module = null) => secure({
    adminOnly: true,
    permission: module ? `${module}:full` : null
});

const secureOwner = () => secure({
    ownerOnly: true
});

/**
 * Webhook security helper
 */
const secureWebhook = (provider) => applySecurityStack({
    webhookAuth: provider
});

/**
 * No-cache middleware
 * Prevents browser caching for sensitive routes (auth, financial data, etc.)
 */
const noCache = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
};

/**
 * Origin check middleware
 * Validates request origin against allowed origins
 */
const originCheck = (req, res, next) => {
    const origin = req.get('Origin');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    // Allow requests without origin (same-origin, server-to-server)
    if (!origin) {
        return next();
    }

    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    // ALWAYS allow localhost and 127.0.0.1 (any port) - matches CORS config
    // This allows local frontend development against production API
    if (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin === 'http://localhost' ||
        origin === 'http://127.0.0.1') {
        return next();
    }

    // Check if origin is allowed
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
        return res.status(403).json({
            success: false,
            error: 'Origin not allowed'
        });
    }

    next();
};

/**
 * Validate Content-Type middleware
 * Ensures requests have appropriate content type
 */
const validateContentType = (req, res, next) => {
    // Skip for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip if no body
    if (!req.body || Object.keys(req.body).length === 0) {
        return next();
    }

    const contentType = req.get('Content-Type');

    // Allow JSON and form data
    if (contentType && (
        contentType.includes('application/json') ||
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data')
    )) {
        return next();
    }

    // For API routes, require proper content type
    if (req.path.startsWith('/api/') && req.body && Object.keys(req.body).length > 0) {
        return res.status(415).json({
            success: false,
            error: 'Unsupported Media Type',
            message: 'Content-Type must be application/json or multipart/form-data'
        });
    }

    next();
};

/**
 * Set CSRF token middleware
 * Sets CSRF token in response for client to use
 */
const setCsrfToken = (req, res, next) => {
    // CSRF is typically handled by csurf middleware or similar
    // This is a placeholder that can be extended
    if (req.csrfToken && typeof req.csrfToken === 'function') {
        res.locals.csrfToken = req.csrfToken();
    }
    next();
};

/**
 * Validate CSRF token middleware
 * Validates CSRF token on state-changing requests
 */
const validateCsrfToken = (req, res, next) => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip for API requests with valid auth token (API uses JWT, not CSRF)
    if (req.headers.authorization) {
        return next();
    }

    // Skip for webhook endpoints
    if (req.path.includes('/webhook')) {
        return next();
    }

    // CSRF validation would be handled by csurf middleware
    // This is a pass-through for compatibility
    next();
};

/**
 * Security headers middleware
 * Sets common security headers
 */
const securityHeaders = (req, res, next) => {
    // X-Content-Type-Options
    res.set('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options
    res.set('X-Frame-Options', 'DENY');

    // X-XSS-Protection (legacy but defense-in-depth)
    res.set('X-XSS-Protection', '1; mode=block');

    // Referrer-Policy
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove X-Powered-By
    res.removeHeader('X-Powered-By');

    next();
};

/**
 * Sanitize request middleware
 * Basic request sanitization
 */
const sanitizeRequest = (req, res, next) => {
    // Remove null bytes from strings in body
    if (req.body && typeof req.body === 'object') {
        const sanitizeValue = (value) => {
            if (typeof value === 'string') {
                return value.replace(/\0/g, '');
            }
            if (Array.isArray(value)) {
                return value.map(sanitizeValue);
            }
            if (value && typeof value === 'object') {
                const sanitized = {};
                for (const key of Object.keys(value)) {
                    sanitized[key] = sanitizeValue(value[key]);
                }
                return sanitized;
            }
            return value;
        };
        req.body = sanitizeValue(req.body);
    }

    next();
};

module.exports = {
    applySecurityStack,
    secure,
    secureFromRegistry,
    secureView,
    secureEdit,
    secureFull,
    secureAdmin,
    secureOwner,
    secureWebhook,
    noCache,
    originCheck,
    validateContentType,
    setCsrfToken,
    validateCsrfToken,
    securityHeaders,
    sanitizeRequest
};
