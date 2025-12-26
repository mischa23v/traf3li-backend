/**
 * Global Firm Context Middleware
 *
 * This middleware is applied ONCE globally to ALL /api routes.
 * It automatically sets firm context (firmId, firmQuery, permissions) on every request.
 *
 * NO NEED to add firmFilter to individual routes anymore!
 *
 * Features:
 * - Automatically detects solo lawyers vs firm members
 * - Sets req.firmId, req.firmQuery, req.permissions
 * - Provides helper functions like req.hasPermission()
 * - Handles departed employees with restricted access
 */

const mongoose = require('mongoose');
const {
    getDefaultPermissions,
    getSoloLawyerPermissions,
    WORK_MODES,
    getDepartedRestrictions,
    enforce,
    buildSubject,
    LEVEL_VALUES
} = require('../config/permissions.config');

// Routes that should SKIP firm context (public routes)
const PUBLIC_ROUTES = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/verify-otp',
    '/api/oauth',
    '/api/invitations',
    '/api/health',
    '/api/webhooks',
    '/api/public',
];

// Routes that need user but not firm context
const USER_ONLY_ROUTES = [
    '/api/auth/me',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/users/profile',
    '/api/firms/create',      // Creating a firm (user doesn't have firm yet)
    '/api/firms/available',   // Checking available firms
];

/**
 * Check if user is a solo lawyer
 */
const checkIsSoloLawyer = (user) => {
    if (!user) return false;

    // Explicit solo lawyer flag
    if (user.isSoloLawyer === true) return true;

    // Solo work mode
    if (user.lawyerWorkMode === 'solo') return true;

    // Lawyer without firm
    if (user.role === 'lawyer' && !user.firmId) return true;

    return false;
};

/**
 * Check if route should skip firm context
 */
const shouldSkipFirmContext = (path) => {
    return PUBLIC_ROUTES.some(route => path.startsWith(route));
};

/**
 * Check if route needs only user context (not firm)
 */
const needsOnlyUserContext = (path) => {
    return USER_ONLY_ROUTES.some(route => path.startsWith(route));
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
 * Global Firm Context Middleware
 * Apply this ONCE to all /api routes
 */
const globalFirmContext = async (req, res, next) => {
    try {
        // Skip public routes
        if (shouldSkipFirmContext(req.path)) {
            return next();
        }

        // Skip if no user (will fail auth anyway)
        if (!req.user && !req.userID) {
            return next();
        }

        const userId = req.userID || req.user?._id || req.user?.id;
        if (!userId) {
            return next();
        }

        // Get user from database with firm info
        const User = mongoose.model('User');
        const user = await User.findById(userId)
            .select('firmId firmRole firmStatus isSoloLawyer lawyerWorkMode role')
            .setOptions({ bypassFirmFilter: true })
            .lean();

        if (!user) {
            return next();
        }

        // Handle SOLO LAWYERS
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

            // Helper functions
            req.hasPermission = () => true; // Solo lawyers have all permissions
            req.hasSpecialPermission = () => true;

            // Add firmId helper (for creating new records)
            req.addFirmId = (data) => {
                if (typeof data === 'object' && data !== null) {
                    data.lawyerId = mongoose.Types.ObjectId.createFromHexString(userId.toString());
                }
                return data;
            };

            // Casbin-style enforcement
            req.subject = buildSubject(user, null);
            req.enforce = (resource, action) => enforce(req.subject, resource, action, null);

            return next();
        }

        // Handle FIRM MEMBERS
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

            // Use member permissions or role defaults
            const permissions = memberPermissions || getDefaultPermissions(user.firmRole);
            req.permissions = permissions;

            // Permission checker functions
            req.hasPermission = createPermissionChecker(permissions);
            req.hasSpecialPermission = createSpecialPermissionChecker(permissions);

            // Add firmId helper (for creating new records)
            req.addFirmId = (data) => {
                if (typeof data === 'object' && data !== null) {
                    data.firmId = user.firmId;
                }
                return data;
            };

            // Casbin-style enforcement
            req.subject = buildSubject(user, member);
            req.enforce = (resource, action) => enforce(req.subject, resource, action, user.firmId?.toString());

            // Handle DEPARTED employees
            if (req.isDeparted) {
                req.permissions = getDefaultPermissions('departed');
                req.departedRestrictions = getDepartedRestrictions('departed');

                // Departed users can only see their own assigned items
                req.departedQuery = {
                    firmId: user.firmId,
                    $or: [
                        { assignedTo: mongoose.Types.ObjectId.createFromHexString(userId.toString()) },
                        { lawyerId: mongoose.Types.ObjectId.createFromHexString(userId.toString()) },
                        { createdBy: mongoose.Types.ObjectId.createFromHexString(userId.toString()) },
                        { 'team.userId': mongoose.Types.ObjectId.createFromHexString(userId.toString()) }
                    ]
                };

                // Departed users have very limited permissions
                req.hasPermission = (module, level) => {
                    if (level !== 'view') return false;
                    return ['cases', 'documents', 'tasks', 'events', 'timeTracking'].includes(module);
                };
                req.hasSpecialPermission = () => false;
            }

            return next();
        }

        // FALLBACK: User without firm (legacy support)
        if (user.role === 'lawyer') {
            // Treat as solo lawyer
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
            // Non-lawyer without firm - minimal context
            req.firmId = null;
            req.firmQuery = {};
            req.permissions = {};
            req.hasPermission = () => false;
            req.hasSpecialPermission = () => false;
            req.addFirmId = (data) => data;
        }

        next();
    } catch (error) {
        console.error('[GlobalFirmContext] Error:', error);
        next(error);
    }
};

/**
 * Middleware to require firm membership (blocks solo lawyers)
 */
const requireFirm = (req, res, next) => {
    if (!req.firmId) {
        return res.status(403).json({
            error: true,
            message: 'This action requires firm membership',
            code: 'FIRM_REQUIRED'
        });
    }
    next();
};

/**
 * Middleware to require specific permission
 */
const requirePermission = (module, level = 'view') => {
    return (req, res, next) => {
        if (!req.hasPermission || !req.hasPermission(module, level)) {
            return res.status(403).json({
                error: true,
                message: `Insufficient permissions for ${module}:${level}`,
                code: 'PERMISSION_DENIED'
            });
        }
        next();
    };
};

/**
 * Middleware to require special permission
 */
const requireSpecialPermission = (permission) => {
    return (req, res, next) => {
        if (!req.hasSpecialPermission || !req.hasSpecialPermission(permission)) {
            return res.status(403).json({
                error: true,
                message: `Missing special permission: ${permission}`,
                code: 'SPECIAL_PERMISSION_DENIED'
            });
        }
        next();
    };
};

/**
 * Middleware to block departed users
 */
const blockDeparted = (req, res, next) => {
    if (req.isDeparted) {
        return res.status(403).json({
            error: true,
            message: 'Departed users cannot perform this action',
            code: 'DEPARTED_BLOCKED'
        });
    }
    next();
};

/**
 * Middleware to require firm owner role
 */
const firmOwnerOnly = (req, res, next) => {
    if (req.firmRole !== 'owner') {
        return res.status(403).json({
            error: true,
            message: 'Only firm owners can perform this action',
            code: 'OWNER_REQUIRED'
        });
    }
    next();
};

/**
 * Middleware to require firm admin or owner role
 */
const firmAdminOnly = (req, res, next) => {
    if (!['owner', 'admin'].includes(req.firmRole)) {
        return res.status(403).json({
            error: true,
            message: 'Only firm owners or admins can perform this action',
            code: 'ADMIN_REQUIRED'
        });
    }
    next();
};

module.exports = {
    globalFirmContext,
    requireFirm,
    requirePermission,
    requireSpecialPermission,
    blockDeparted,
    firmOwnerOnly,
    firmAdminOnly,
    checkIsSoloLawyer,
    shouldSkipFirmContext,
    PUBLIC_ROUTES,
    USER_ONLY_ROUTES
};
