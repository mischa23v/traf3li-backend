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
    noCache
};
