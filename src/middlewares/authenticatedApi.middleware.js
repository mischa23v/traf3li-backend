/**
 * Authenticated API Middleware - Enterprise Gold Standard
 *
 * This middleware combines authentication + firm context in ONE middleware.
 * Applied GLOBALLY to all /api routes.
 *
 * Pattern used by: AWS, Google Cloud, Microsoft Azure, Salesforce
 *
 * Benefits:
 * 1. Single point of authentication and tenant context
 * 2. No need to add firmFilter to individual routes
 * 3. Fail-secure: routes without auth will fail
 * 4. Performance: single middleware execution
 *
 * How it works:
 * 1. Checks if route is public (login, register, etc.) → skip
 * 2. Verifies JWT token → sets req.userID
 * 3. Sets firm context → sets req.firmQuery, req.firmId, etc.
 * 4. Provides helper functions → req.hasPermission(), req.addFirmId()
 */

const mongoose = require('mongoose');
const { verifyToken } = require('./jwt');
const {
    getDefaultPermissions,
    getSoloLawyerPermissions,
    WORK_MODES,
    getDepartedRestrictions,
    enforce,
    buildSubject,
    LEVEL_VALUES
} = require('../config/permissions.config');

// Routes that skip ALL authentication (truly public)
// NOTE: Paths are relative to /api mount point (no /api prefix)
// Following industry gold standard (AWS, Google, Okta, Auth0)
const PUBLIC_ROUTES = [
    // Core auth endpoints
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/send-otp',
    '/auth/verify-otp',
    '/auth/resend-otp',
    '/auth/otp-status',
    '/auth/csrf',
    '/auth/check-availability',
    '/auth/refresh',
    '/auth/anonymous',
    '/auth/google/one-tap',

    // Phone OTP (passwordless login)
    '/auth/phone/send-otp',
    '/auth/phone/verify-otp',
    '/auth/phone/resend-otp',
    '/auth/phone/otp-status',

    // Magic link (passwordless login)
    '/auth/magic-link/send',
    '/auth/magic-link/verify',

    // OAuth/SSO providers
    '/auth/google',
    '/auth/google/callback',
    '/auth/saml/*',
    // SSO public endpoints (specific routes, not wildcard to protect /link, /unlink, /linked)
    '/auth/sso/providers',
    '/auth/sso/initiate',
    '/auth/sso/detect',
    '/auth/sso/callback',
    // Dynamic SSO provider routes (Google, Microsoft, etc.)
    '/auth/sso/google',
    '/auth/sso/microsoft',
    '/auth/sso/facebook',
    '/auth/sso/apple',
    '/auth/sso/github',
    '/auth/sso/linkedin',
    '/auth/sso/twitter',
    '/auth/sso/okta',
    '/auth/sso/auth0',

    // CAPTCHA (needed before login/register)
    '/auth/verify-captcha',
    '/auth/captcha/providers',
    '/auth/captcha/status',

    // WebAuthn/Passkeys (authenticate endpoints are pre-auth)
    '/auth/webauthn/authenticate/start',
    '/auth/webauthn/authenticate/finish',

    // LDAP login
    '/auth/ldap/login',

    // MFA verification (post-login but pre-session)
    '/auth/mfa/verify',
    '/auth/mfa/backup-codes/verify',

    // Other public endpoints
    '/oauth',
    '/webhooks',
    '/health',
    '/public',
    '/status',
    '/invitations/verify',
    '/invitations/accept',
];

// Routes that need auth but skip firm context (user-level operations)
// NOTE: Paths are relative to /api mount point (no /api prefix)
const AUTH_ONLY_ROUTES = [
    '/auth/me',
    '/auth/logout',
    '/auth/refresh',
    '/auth/mfa',
    '/users/profile',
    '/firms/create',
    '/firms/available',
    '/invitations',
    '/setup',
];

/**
 * Check if path matches any route pattern
 */
const matchesRoute = (path, routes) => {
    return routes.some(route => {
        // Exact match or prefix match
        if (path === route || path.startsWith(route + '/')) {
            return true;
        }
        // Handle route patterns like /api/auth/* matching /api/auth/login
        if (route.endsWith('/*')) {
            const prefix = route.slice(0, -2);
            return path.startsWith(prefix);
        }
        return path.startsWith(route);
    });
};

/**
 * Check if user is a solo lawyer
 */
const checkIsSoloLawyer = (user) => {
    if (!user) return false;
    if (user.isSoloLawyer === true) return true;
    if (user.lawyerWorkMode === 'solo') return true;
    if (user.role === 'lawyer' && !user.firmId) return true;
    return false;
};

/**
 * Create permission checker function
 */
const createPermissionChecker = (permissions) => {
    return (module, requiredLevel = 'view') => {
        if (!permissions || !permissions.modules) return false;
        const userLevel = permissions.modules[module];
        if (!userLevel) return false;
        const userValue = LEVEL_VALUES[userLevel] || 0;
        const requiredValue = LEVEL_VALUES[requiredLevel] || 0;
        return userValue >= requiredValue;
    };
};

/**
 * Create special permission checker function
 */
const createSpecialPermissionChecker = (permissions) => {
    return (permission) => {
        if (!permissions || !permissions.special) return false;
        return permissions.special[permission] === true;
    };
};

/**
 * Set firm context on request object
 */
const setFirmContext = async (req, userId) => {
    const User = mongoose.model('User');
    const user = await User.findById(userId)
        .select('firmId firmRole firmStatus isSoloLawyer lawyerWorkMode role')
        .setOptions({ bypassFirmFilter: true })
        .lean();

    if (!user) {
        // User not found - minimal context
        req.firmId = null;
        req.firmQuery = {};
        req.permissions = {};
        req.hasPermission = () => false;
        req.hasSpecialPermission = () => false;
        req.addFirmId = (data) => data;
        return;
    }

    // SOLO LAWYERS
    if (checkIsSoloLawyer(user)) {
        req.firmId = null;
        req.firmRole = null;
        req.firmStatus = null;
        req.isDeparted = false;
        req.isSoloLawyer = true;
        req.workMode = WORK_MODES.SOLO;
        req.tenantId = null;

        // Solo lawyers filter by their own ID
        req.firmQuery = { lawyerId: mongoose.Types.ObjectId.createFromHexString(userId.toString()) };

        // Solo lawyers get full permissions
        const soloPermissions = getSoloLawyerPermissions();
        req.permissions = soloPermissions;

        req.hasPermission = () => true;
        req.hasSpecialPermission = () => true;

        req.addFirmId = (data) => {
            if (typeof data === 'object' && data !== null) {
                data.lawyerId = mongoose.Types.ObjectId.createFromHexString(userId.toString());
            }
            return data;
        };

        req.subject = buildSubject(user, null);
        req.enforce = (resource, action) => enforce(req.subject, resource, action, null);
        return;
    }

    // FIRM MEMBERS
    if (user.firmId) {
        req.firmId = user.firmId;
        req.firmRole = user.firmRole;
        req.firmStatus = user.firmStatus || 'active';
        req.isDeparted = user.firmRole === 'departed' || user.firmStatus === 'departed';
        req.isSoloLawyer = false;
        req.workMode = user.firmRole === 'owner' ? WORK_MODES.FIRM_OWNER : WORK_MODES.FIRM_MEMBER;
        req.tenantId = user.firmId;

        // Firm members filter by firmId
        req.firmQuery = { firmId: user.firmId };

        // Get member permissions from firm
        const Firm = mongoose.model('Firm');
        const firm = await Firm.findById(user.firmId)
            .select('members')
            .setOptions({ bypassFirmFilter: true })
            .lean();

        let memberPermissions = null;
        let member = null;

        if (firm && firm.members) {
            member = firm.members.find(m => m.userId?.toString() === userId.toString());
            if (member) {
                memberPermissions = member.permissions;
                req.memberData = member;
                req.memberStatus = member.status;
            }
        }

        const permissions = memberPermissions || getDefaultPermissions(user.firmRole);
        req.permissions = permissions;

        req.hasPermission = createPermissionChecker(permissions);
        req.hasSpecialPermission = createSpecialPermissionChecker(permissions);

        req.addFirmId = (data) => {
            if (typeof data === 'object' && data !== null) {
                data.firmId = user.firmId;
            }
            return data;
        };

        req.subject = buildSubject(user, member);
        req.enforce = (resource, action) => enforce(req.subject, resource, action, user.firmId?.toString());

        // Handle DEPARTED employees
        if (req.isDeparted) {
            req.permissions = getDefaultPermissions('departed');
            req.departedRestrictions = getDepartedRestrictions('departed');

            req.departedQuery = {
                firmId: user.firmId,
                $or: [
                    { assignedTo: mongoose.Types.ObjectId.createFromHexString(userId.toString()) },
                    { lawyerId: mongoose.Types.ObjectId.createFromHexString(userId.toString()) },
                    { createdBy: mongoose.Types.ObjectId.createFromHexString(userId.toString()) },
                    { 'team.userId': mongoose.Types.ObjectId.createFromHexString(userId.toString()) }
                ]
            };

            req.hasPermission = (module, level) => {
                if (level !== 'view') return false;
                return ['cases', 'documents', 'tasks', 'events', 'timeTracking'].includes(module);
            };
            req.hasSpecialPermission = () => false;
        }
        return;
    }

    // FALLBACK: User without firm
    if (user.role === 'lawyer') {
        req.firmId = null;
        req.isSoloLawyer = true;
        req.firmQuery = { lawyerId: mongoose.Types.ObjectId.createFromHexString(userId.toString()) };
        req.permissions = getSoloLawyerPermissions();
        req.hasPermission = () => true;
        req.hasSpecialPermission = () => true;
        req.addFirmId = (data) => {
            if (typeof data === 'object' && data !== null) {
                data.lawyerId = mongoose.Types.ObjectId.createFromHexString(userId.toString());
            }
            return data;
        };
    } else {
        req.firmId = null;
        req.firmQuery = {};
        req.permissions = {};
        req.hasPermission = () => false;
        req.hasSpecialPermission = () => false;
        req.addFirmId = (data) => data;
    }
};

/**
 * Authenticated API Middleware
 *
 * Combines JWT verification + firm context in ONE middleware.
 * This is the enterprise gold standard pattern.
 */
const authenticatedApi = async (req, res, next) => {
    try {
        // 1. Check if this is a public route (no auth needed)
        if (matchesRoute(req.path, PUBLIC_ROUTES)) {
            return next();
        }

        // 2. Verify JWT token (sets req.userID, req.jwtClaims)
        await new Promise((resolve, reject) => {
            verifyToken(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // If verifyToken sent a response (e.g., 401), don't continue
        if (res.headersSent) {
            return;
        }

        // 3. Check if this route only needs auth (not firm context)
        if (matchesRoute(req.path, AUTH_ONLY_ROUTES)) {
            return next();
        }

        // 4. Set firm context (sets req.firmQuery, req.firmId, etc.)
        const userId = req.userID || req.userId;
        if (userId) {
            // Try stateless path first (from JWT claims)
            if (req.jwtClaims && req.jwtClaims.firmId !== undefined) {
                // Use JWT claims for faster, stateless verification
                if (req.jwtClaims.isSoloLawyer) {
                    req.firmId = null;
                    req.isSoloLawyer = true;
                    req.firmQuery = { lawyerId: mongoose.Types.ObjectId.createFromHexString(userId.toString()) };
                    req.permissions = getSoloLawyerPermissions();
                    req.hasPermission = () => true;
                    req.hasSpecialPermission = () => true;
                    req.addFirmId = (data) => {
                        if (typeof data === 'object' && data !== null) {
                            data.lawyerId = mongoose.Types.ObjectId.createFromHexString(userId.toString());
                        }
                        return data;
                    };
                } else if (req.jwtClaims.firmId) {
                    req.firmId = req.jwtClaims.firmId;
                    req.firmRole = req.jwtClaims.firmRole;
                    req.isSoloLawyer = false;
                    req.firmQuery = { firmId: mongoose.Types.ObjectId.createFromHexString(req.jwtClaims.firmId) };
                    req.permissions = getDefaultPermissions(req.jwtClaims.firmRole || 'member');
                    req.hasPermission = createPermissionChecker(req.permissions);
                    req.hasSpecialPermission = createSpecialPermissionChecker(req.permissions);
                    req.addFirmId = (data) => {
                        if (typeof data === 'object' && data !== null) {
                            data.firmId = mongoose.Types.ObjectId.createFromHexString(req.jwtClaims.firmId);
                        }
                        return data;
                    };
                } else {
                    // No firm in JWT claims - fall back to database lookup
                    await setFirmContext(req, userId);
                }
            } else {
                // No JWT claims - fall back to database lookup
                await setFirmContext(req, userId);
            }
        }

        next();
    } catch (error) {
        // If it's an auth error, it was already handled by verifyToken
        if (!res.headersSent) {
            // eslint-disable-next-line no-console
            console.error('[AuthenticatedApi] Error:', error.message, {
                path: req.path,
                method: req.method,
                ip: req.ip,
                stack: error.stack
            });
            return res.status(500).json({
                success: false,
                message: 'Authentication error',
                code: 'AUTH_ERROR'
            });
        }
    }
};

module.exports = {
    authenticatedApi,
    PUBLIC_ROUTES,
    AUTH_ONLY_ROUTES,
    matchesRoute,
    checkIsSoloLawyer,
    setFirmContext
};
