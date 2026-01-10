/**
 * Email Verification Required Middleware
 * Gold Standard - Feature-Based Access Control
 *
 * This middleware blocks unverified email users from accessing sensitive features.
 * Unverified users CAN access: tasks, reminders, events, gantt, calendar
 * Unverified users CANNOT access: cases, clients, billing, documents, etc.
 *
 * @module middlewares/emailVerificationRequired
 */

const logger = require('../utils/contextLogger');
const auditLogService = require('../services/auditLog.service');

// ═══════════════════════════════════════════════════════════════
// ROUTE CONFIGURATION - Which routes require email verification
// ═══════════════════════════════════════════════════════════════

/**
 * Routes that DO NOT require email verification (allowed for unverified users)
 * These are basic productivity features that don't involve sensitive data
 */
const EMAIL_VERIFICATION_EXEMPT_ROUTES = [
    // Core productivity features - ALLOWED
    '/tasks',
    '/reminders',
    '/events',
    '/gantt',
    '/calendar',
    '/notifications',

    // Auth & verification - ALLOWED (so user can verify their email)
    '/auth',
    '/users/me',
    '/users/profile',
    '/users/settings/notifications', // Only notification settings

    // Public/system routes - ALLOWED
    '/health',
    '/status',
    '/public',

    // Specific allowed operations
    '/appointments/calendar.ics', // ICS download
    '/appointments/available-slots', // Public booking slots
];

/**
 * Routes that ALWAYS require email verification (even with exempt parent)
 * These override exempt routes for specific sensitive sub-operations
 */
const EMAIL_VERIFICATION_ALWAYS_REQUIRED = [
    // User settings that modify sensitive data
    '/users/settings/security',
    '/users/settings/integrations',
    '/users/settings/billing',
    '/users/settings/team',
];

/**
 * Route patterns that require email verification
 * Sensitive features are blocked until email is verified
 */
const EMAIL_VERIFICATION_REQUIRED_ROUTES = [
    // Legal data - BLOCKED
    '/cases',
    '/clients',
    '/matters',
    '/legal-documents',

    // Financial - BLOCKED
    '/billing',
    '/invoices',
    '/payments',
    '/expenses',
    '/transactions',
    '/accounts',
    '/retainers',
    '/statements',

    // Documents - BLOCKED
    '/documents',
    '/files',
    '/templates',
    '/contracts',

    // Integrations - BLOCKED
    '/integrations',
    '/google-calendar',
    '/microsoft-calendar',
    '/gmail',
    '/outlook',
    '/slack',
    '/whatsapp',
    '/zoom',
    '/docusign',

    // Team & HR - BLOCKED
    '/team',
    '/members',
    '/hr',
    '/payroll',
    '/leave-requests',
    '/attendance',

    // CRM (write operations) - BLOCKED
    '/leads',
    '/crm-pipeline',
    '/crm-activity',
    '/territories',
    '/sales-person',

    // Appointments (create/edit) - BLOCKED (read allowed via calendar)
    '/appointments', // POST, PUT, DELETE blocked, GET allowed

    // Reports & Analytics - BLOCKED
    '/reports',
    '/analytics',
    '/dashboard/analytics',
    '/dashboard/reports',

    // Settings (sensitive) - BLOCKED
    '/settings',
    '/firm-settings',
    '/subscription',

    // Workflow & Automation - BLOCKED
    '/workflow',
    '/automation',
    '/webhooks',
];

/**
 * HTTP methods that are exempt from verification on blocked routes
 * GET requests might be allowed for basic viewing, but write operations are blocked
 */
const EXEMPT_METHODS_FOR_BLOCKED_ROUTES = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Check if a route path matches any pattern in the list
 * @param {string} path - The request path
 * @param {string[]} patterns - Array of route patterns to check
 * @returns {boolean} - Whether the path matches any pattern
 */
const matchesRoutePattern = (path, patterns) => {
    // Normalize path - remove version prefix and trailing slash
    const normalizedPath = path
        .replace(/^\/api\/(v1|v2)/, '')
        .replace(/\/$/, '')
        .toLowerCase();

    for (const pattern of patterns) {
        const normalizedPattern = pattern.toLowerCase();

        // Exact match
        if (normalizedPath === normalizedPattern) {
            return true;
        }

        // Prefix match (e.g., /cases matches /cases/123, /cases/123/documents)
        if (normalizedPath.startsWith(normalizedPattern + '/')) {
            return true;
        }

        // Check if normalized path starts with pattern
        if (normalizedPath.startsWith(normalizedPattern)) {
            return true;
        }
    }

    return false;
};

/**
 * Middleware to enforce email verification on sensitive routes
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.blockWriteOnly - If true, only block write operations (POST, PUT, DELETE)
 * @param {boolean} options.strictMode - If true, block ALL operations on protected routes
 * @returns {Function} Express middleware function
 */
const emailVerificationRequired = (options = {}) => {
    const { blockWriteOnly = false, strictMode = false } = options;

    return async (req, res, next) => {
        try {
            // Skip if no user context (public routes handled by authenticatedApi)
            if (!req.userID) {
                return next();
            }

            // Get user's email verification status from JWT claims or request context
            // This is set by authenticatedApi middleware
            const isEmailVerified = req.isEmailVerified ?? req.jwtClaims?.isEmailVerified ?? false;

            // If email is verified, allow all routes
            if (isEmailVerified) {
                return next();
            }

            // ═══════════════════════════════════════════════════════════════
            // EMAIL NOT VERIFIED - Check if route is blocked
            // ═══════════════════════════════════════════════════════════════

            const path = req.path || req.originalUrl;
            const method = req.method.toUpperCase();

            // Check if route is explicitly always required (override exemptions)
            if (matchesRoutePattern(path, EMAIL_VERIFICATION_ALWAYS_REQUIRED)) {
                return blockAccessForUnverifiedUser(req, res, path, method);
            }

            // Check if route is exempt (allowed without verification)
            if (matchesRoutePattern(path, EMAIL_VERIFICATION_EXEMPT_ROUTES)) {
                return next();
            }

            // Check if route requires verification
            if (matchesRoutePattern(path, EMAIL_VERIFICATION_REQUIRED_ROUTES)) {
                // In blockWriteOnly mode, allow GET/HEAD/OPTIONS
                if (blockWriteOnly && EXEMPT_METHODS_FOR_BLOCKED_ROUTES.includes(method)) {
                    return next();
                }

                return blockAccessForUnverifiedUser(req, res, path, method);
            }

            // In strict mode, block all routes not explicitly exempted
            if (strictMode) {
                return blockAccessForUnverifiedUser(req, res, path, method);
            }

            // Default: allow if not in blocked list
            return next();

        } catch (error) {
            logger.error('Email verification middleware error', {
                error: error.message,
                stack: error.stack,
                path: req.path,
                userId: req.userID
            });

            // Fail open to prevent blocking legitimate users due to middleware errors
            // Security is handled by route-level checks as backup
            return next();
        }
    };
};

/**
 * Block access for unverified user and return standardized error
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} path - The blocked path
 * @param {string} method - The HTTP method
 */
const blockAccessForUnverifiedUser = (req, res, path, method) => {
    // Log blocked access attempt
    logger.warn('Blocked unverified user access to protected route', {
        userId: req.userID,
        path: path,
        method: method,
        ip: req.ip || req.headers['x-forwarded-for']
    });

    // Audit log for security monitoring
    auditLogService.log(
        'access_blocked_email_not_verified',
        'user',
        req.userID,
        null,
        {
            userId: req.userID,
            path: path,
            method: method,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            severity: 'low'
        }
    );

    // Return standardized error response
    return res.status(403).json({
        error: true,
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'يرجى تفعيل بريدك الإلكتروني للوصول إلى هذه الميزة',
        messageEn: 'Please verify your email to access this feature',
        // Provide redirect hint for frontend
        redirectTo: '/verify-email',
        // Include verification info for frontend
        emailVerification: {
            isVerified: false,
            requiresVerification: true,
            // Features allowed without email verification
            allowedFeatures: ['tasks', 'reminders', 'events', 'gantt', 'calendar', 'notifications', 'profile-view'],
            // This specific feature is blocked
            blockedFeature: extractFeatureFromPath(path)
        }
    });
};

/**
 * Extract feature name from path for error message
 * @param {string} path - The request path
 * @returns {string} - Human-readable feature name
 */
const extractFeatureFromPath = (path) => {
    const featureMap = {
        '/cases': 'cases',
        '/clients': 'clients',
        '/billing': 'billing',
        '/invoices': 'invoices',
        '/documents': 'documents',
        '/integrations': 'integrations',
        '/team': 'team',
        '/reports': 'reports',
        '/analytics': 'analytics',
        '/settings': 'settings',
        '/hr': 'hr',
        '/payroll': 'payroll',
        '/leads': 'crm',
        '/crm': 'crm',
        '/appointments': 'appointments',
        '/workflow': 'workflow'
    };

    const normalizedPath = path.replace(/^\/api\/(v1|v2)/, '').toLowerCase();

    for (const [pattern, feature] of Object.entries(featureMap)) {
        if (normalizedPath.startsWith(pattern)) {
            return feature;
        }
    }

    return 'protected-feature';
};

/**
 * Convenience middleware that only blocks write operations
 * Useful for routes where viewing is allowed but modifying is blocked
 */
const emailVerificationRequiredForWrites = emailVerificationRequired({ blockWriteOnly: true });

/**
 * Convenience middleware that blocks all operations on protected routes
 * Use for highly sensitive routes where no access should be granted
 */
const emailVerificationRequiredStrict = emailVerificationRequired({ strictMode: true });

module.exports = {
    emailVerificationRequired,
    emailVerificationRequiredForWrites,
    emailVerificationRequiredStrict,
    // Export route lists for testing/documentation
    EMAIL_VERIFICATION_EXEMPT_ROUTES,
    EMAIL_VERIFICATION_REQUIRED_ROUTES,
    EMAIL_VERIFICATION_ALWAYS_REQUIRED,
    // Export helper functions for testing
    matchesRoutePattern,
    extractFeatureFromPath
};
