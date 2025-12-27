/**
 * Route Security Registry
 *
 * Centralized configuration for all route security requirements.
 * This makes security auditable and ensures nothing is missed.
 */

// Permission levels
const LEVELS = {
    NONE: 'none',
    VIEW: 'view',
    EDIT: 'edit',
    FULL: 'full'
};

// Common security configurations
const PUBLIC = { auth: false };
const AUTHENTICATED = { auth: true, firmFilter: true };
const ADMIN_ONLY = { auth: true, firmFilter: true, adminOnly: true };
const OWNER_ONLY = { auth: true, firmFilter: true, ownerOnly: true };

/**
 * Route Security Definitions
 *
 * Format: 'METHOD /path': { ...securityConfig }
 *
 * Security options:
 * - auth: boolean - Requires authentication
 * - firmFilter: boolean - Applies firm isolation
 * - permission: { module, level } - Required permission
 * - resourceAccess: { model, param } - IDOR protection
 * - adminOnly: boolean - Only firm admins
 * - ownerOnly: boolean - Only firm owner
 * - webhookAuth: string - Webhook signature validation
 * - rateLimit: { window, max } - Rate limiting config
 */
const ROUTE_SECURITY = {
    // ═══════════════════════════════════════════════════════════════
    // AUTHENTICATION ROUTES (Public)
    // ═══════════════════════════════════════════════════════════════
    'POST /api/auth/login': PUBLIC,
    'POST /api/auth/register': PUBLIC,
    'POST /api/auth/forgot-password': PUBLIC,
    'POST /api/auth/reset-password': PUBLIC,
    'POST /api/auth/verify-email': PUBLIC,
    'POST /api/auth/refresh-token': PUBLIC,
    'GET /api/auth/oauth/google': PUBLIC,
    'GET /api/auth/oauth/google/callback': PUBLIC,

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK ROUTES (Signature validated)
    // ═══════════════════════════════════════════════════════════════
    'POST /api/webhooks/stripe': { auth: false, webhookAuth: 'stripe' },
    'POST /api/webhooks/zoom': { auth: false, webhookAuth: 'zoom' },
    'POST /api/webhooks/docusign': { auth: false, webhookAuth: 'docusign' },
    'POST /api/webhooks/google': { auth: false, webhookAuth: 'google' },
    'POST /api/webhooks/microsoft': { auth: false, webhookAuth: 'microsoft' },
    'POST /api/kyc/webhook': { auth: false, webhookAuth: 'autoDetect' },

    // ═══════════════════════════════════════════════════════════════
    // CASE ROUTES
    // ═══════════════════════════════════════════════════════════════
    'GET /api/cases': {
        ...AUTHENTICATED,
        permission: { module: 'cases', level: LEVELS.VIEW }
    },
    'POST /api/cases': {
        ...AUTHENTICATED,
        permission: { module: 'cases', level: LEVELS.EDIT }
    },
    'GET /api/cases/:id': {
        ...AUTHENTICATED,
        permission: { module: 'cases', level: LEVELS.VIEW },
        resourceAccess: { model: 'Case', param: 'id' }
    },
    'PUT /api/cases/:id': {
        ...AUTHENTICATED,
        permission: { module: 'cases', level: LEVELS.EDIT },
        resourceAccess: { model: 'Case', param: 'id' }
    },
    'DELETE /api/cases/:id': {
        ...AUTHENTICATED,
        permission: { module: 'cases', level: LEVELS.FULL },
        resourceAccess: { model: 'Case', param: 'id' }
    },

    // ═══════════════════════════════════════════════════════════════
    // CLIENT ROUTES
    // ═══════════════════════════════════════════════════════════════
    'GET /api/clients': {
        ...AUTHENTICATED,
        permission: { module: 'clients', level: LEVELS.VIEW }
    },
    'POST /api/clients': {
        ...AUTHENTICATED,
        permission: { module: 'clients', level: LEVELS.EDIT }
    },
    'GET /api/clients/:id': {
        ...AUTHENTICATED,
        permission: { module: 'clients', level: LEVELS.VIEW },
        resourceAccess: { model: 'Client', param: 'id' }
    },
    'PUT /api/clients/:id': {
        ...AUTHENTICATED,
        permission: { module: 'clients', level: LEVELS.EDIT },
        resourceAccess: { model: 'Client', param: 'id' }
    },
    'DELETE /api/clients/:id': {
        ...AUTHENTICATED,
        permission: { module: 'clients', level: LEVELS.FULL },
        resourceAccess: { model: 'Client', param: 'id' }
    },

    // ═══════════════════════════════════════════════════════════════
    // INVOICE ROUTES
    // ═══════════════════════════════════════════════════════════════
    'GET /api/invoices': {
        ...AUTHENTICATED,
        permission: { module: 'billing', level: LEVELS.VIEW }
    },
    'POST /api/invoices': {
        ...AUTHENTICATED,
        permission: { module: 'billing', level: LEVELS.EDIT }
    },
    'GET /api/invoices/:id': {
        ...AUTHENTICATED,
        permission: { module: 'billing', level: LEVELS.VIEW },
        resourceAccess: { model: 'Invoice', param: 'id' }
    },
    'PUT /api/invoices/:id': {
        ...AUTHENTICATED,
        permission: { module: 'billing', level: LEVELS.EDIT },
        resourceAccess: { model: 'Invoice', param: 'id' }
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT ROUTES
    // ═══════════════════════════════════════════════════════════════
    'GET /api/payments': {
        ...AUTHENTICATED,
        permission: { module: 'billing', level: LEVELS.VIEW }
    },
    'POST /api/payments': {
        ...AUTHENTICATED,
        permission: { module: 'billing', level: LEVELS.EDIT }
    },
    'POST /api/payments/:id/refund': {
        ...AUTHENTICATED,
        permission: { module: 'billing', level: LEVELS.FULL },
        resourceAccess: { model: 'Payment', param: 'id' }
    },

    // ═══════════════════════════════════════════════════════════════
    // TRUST ACCOUNT ROUTES (High Security)
    // ═══════════════════════════════════════════════════════════════
    'GET /api/trust-accounts': {
        ...AUTHENTICATED,
        permission: { module: 'trust', level: LEVELS.VIEW }
    },
    'POST /api/trust-accounts': {
        ...ADMIN_ONLY,
        permission: { module: 'trust', level: LEVELS.FULL }
    },
    'POST /api/trust-accounts/:id/deposit': {
        ...AUTHENTICATED,
        permission: { module: 'trust', level: LEVELS.EDIT },
        resourceAccess: { model: 'TrustAccount', param: 'id' }
    },
    'POST /api/trust-accounts/:id/withdraw': {
        ...ADMIN_ONLY,
        permission: { module: 'trust', level: LEVELS.FULL },
        resourceAccess: { model: 'TrustAccount', param: 'id' }
    },

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENT ROUTES
    // ═══════════════════════════════════════════════════════════════
    'GET /api/documents': {
        ...AUTHENTICATED,
        permission: { module: 'documents', level: LEVELS.VIEW }
    },
    'POST /api/documents': {
        ...AUTHENTICATED,
        permission: { module: 'documents', level: LEVELS.EDIT }
    },
    'GET /api/documents/:id': {
        ...AUTHENTICATED,
        permission: { module: 'documents', level: LEVELS.VIEW },
        resourceAccess: { model: 'Document', param: 'id' }
    },
    'DELETE /api/documents/:id': {
        ...AUTHENTICATED,
        permission: { module: 'documents', level: LEVELS.FULL },
        resourceAccess: { model: 'Document', param: 'id' }
    },

    // ═══════════════════════════════════════════════════════════════
    // TIME TRACKING ROUTES
    // ═══════════════════════════════════════════════════════════════
    'GET /api/time-entries': {
        ...AUTHENTICATED,
        permission: { module: 'time_tracking', level: LEVELS.VIEW }
    },
    'POST /api/time-entries': {
        ...AUTHENTICATED,
        permission: { module: 'time_tracking', level: LEVELS.EDIT }
    },
    'POST /api/time-entries/:id/approve': {
        ...AUTHENTICATED,
        permission: { module: 'time_tracking', level: LEVELS.FULL },
        resourceAccess: { model: 'TimeEntry', param: 'id' }
    },

    // ═══════════════════════════════════════════════════════════════
    // EXPENSE ROUTES
    // ═══════════════════════════════════════════════════════════════
    'GET /api/expenses': {
        ...AUTHENTICATED,
        permission: { module: 'expenses', level: LEVELS.VIEW }
    },
    'POST /api/expenses': {
        ...AUTHENTICATED,
        permission: { module: 'expenses', level: LEVELS.EDIT }
    },
    'POST /api/expenses/:id/approve': {
        ...AUTHENTICATED,
        permission: { module: 'expenses', level: LEVELS.FULL },
        resourceAccess: { model: 'Expense', param: 'id' }
    },

    // ═══════════════════════════════════════════════════════════════
    // ADMIN ROUTES
    // ═══════════════════════════════════════════════════════════════
    'GET /api/admin/users': ADMIN_ONLY,
    'POST /api/admin/users': ADMIN_ONLY,
    'PUT /api/admin/users/:id': ADMIN_ONLY,
    'DELETE /api/admin/users/:id': OWNER_ONLY,
    'GET /api/admin/audit-logs': ADMIN_ONLY,
    'GET /api/admin/settings': ADMIN_ONLY,
    'PUT /api/admin/settings': OWNER_ONLY,

    // ═══════════════════════════════════════════════════════════════
    // FIRM MANAGEMENT ROUTES
    // ═══════════════════════════════════════════════════════════════
    'GET /api/firm': AUTHENTICATED,
    'PUT /api/firm': OWNER_ONLY,
    'POST /api/firm/invite': ADMIN_ONLY,
    'DELETE /api/firm/members/:id': ADMIN_ONLY,
    'PUT /api/firm/members/:id/role': OWNER_ONLY,
};

/**
 * Get security config for a route
 */
const getRouteSecurityConfig = (method, path) => {
    const key = `${method.toUpperCase()} ${path}`;
    return ROUTE_SECURITY[key] || null;
};

/**
 * Check if route is public (no auth required)
 */
const isPublicRoute = (method, path) => {
    const config = getRouteSecurityConfig(method, path);
    return config && config.auth === false;
};

/**
 * Check if route requires webhook authentication
 */
const isWebhookRoute = (method, path) => {
    const config = getRouteSecurityConfig(method, path);
    return config && config.webhookAuth;
};

module.exports = {
    ROUTE_SECURITY,
    LEVELS,
    PUBLIC,
    AUTHENTICATED,
    ADMIN_ONLY,
    OWNER_ONLY,
    getRouteSecurityConfig,
    isPublicRoute,
    isWebhookRoute
};
