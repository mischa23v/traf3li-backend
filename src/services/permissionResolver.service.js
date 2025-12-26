/**
 * Permission Resolver Service
 *
 * Centralized service for resolving and checking permissions.
 * Combines role defaults with member overrides.
 *
 * Usage:
 *   const { resolvePermissions, checkPermission } = require('./permissionResolver.service');
 *   const perms = await resolvePermissions(userId, firmId);
 *   const canEdit = checkPermission(perms, 'cases', 'edit');
 */

const mongoose = require('mongoose');
const {
    getDefaultPermissions,
    getSoloLawyerPermissions,
    LEVEL_VALUES,
    ROLE_PERMISSIONS,
    getDepartedRestrictions
} = require('../config/permissions.config');

/**
 * Resolve effective permissions for a user
 *
 * @param {string} userId - User ID
 * @param {string} firmId - Firm ID (null for solo lawyers)
 * @returns {Object} Effective permissions object
 */
const resolvePermissions = async (userId, firmId) => {
    // Solo lawyer: return full permissions
    if (!firmId) {
        return getSoloLawyerPermissions();
    }

    // Get firm member record
    const FirmMember = mongoose.model('FirmMember');
    const member = await FirmMember.findOne({ userId, firmId }).lean();

    if (!member) {
        // Not a member - no permissions
        return {
            modules: {},
            special: {},
            hasAccess: false
        };
    }

    // Get role defaults
    const roleDefaults = getDefaultPermissions(member.role);

    // Merge with overrides
    const modules = {};
    const special = {};

    // Module permissions
    const moduleKeys = ['clients', 'cases', 'leads', 'invoices', 'payments', 'expenses',
        'documents', 'tasks', 'events', 'timeTracking', 'reports', 'settings', 'team', 'hr'];

    for (const key of moduleKeys) {
        const override = member.permissionOverrides?.[key];
        modules[key] = override !== null && override !== undefined
            ? override
            : roleDefaults.modules?.[key] || 'none';
    }

    // Special permissions
    const specialKeys = ['canApproveInvoices', 'canManageRetainers', 'canExportData',
        'canDeleteRecords', 'canViewFinance', 'canManageTeam', 'canAccessHR'];

    for (const key of specialKeys) {
        const override = member.permissionOverrides?.[key];
        special[key] = override !== null && override !== undefined
            ? override
            : roleDefaults.special?.[key] || false;
    }

    return {
        modules,
        special,
        role: member.role,
        status: member.status,
        hasAccess: true,
        isDeparted: member.role === 'departed' || member.status === 'departed',
        resourcePermissions: member.resourcePermissions || []
    };
};

/**
 * Check if permissions allow access to module at level
 *
 * @param {Object} permissions - Resolved permissions object
 * @param {string} module - Module name (e.g., 'cases', 'invoices')
 * @param {string} requiredLevel - Required level ('view', 'edit', 'full')
 * @returns {boolean} True if access allowed
 */
const checkPermission = (permissions, module, requiredLevel = 'view') => {
    if (!permissions || !permissions.modules) return false;

    const userLevel = permissions.modules[module];
    if (!userLevel || userLevel === 'none') return false;

    const userValue = LEVEL_VALUES[userLevel] || 0;
    const requiredValue = LEVEL_VALUES[requiredLevel] || 0;

    return userValue >= requiredValue;
};

/**
 * Check if permissions include special permission
 *
 * @param {Object} permissions - Resolved permissions object
 * @param {string} permission - Special permission name
 * @returns {boolean} True if has permission
 */
const checkSpecialPermission = (permissions, permission) => {
    if (!permissions || !permissions.special) return false;
    return permissions.special[permission] === true;
};

/**
 * Check if user can access specific resource
 *
 * @param {Object} permissions - Resolved permissions object
 * @param {string} resourceType - Resource type ('case', 'client')
 * @param {string} resourceId - Resource ID
 * @param {string} requiredAccess - Required access level
 * @returns {boolean} True if access allowed
 */
const checkResourcePermission = (permissions, resourceType, resourceId, requiredAccess = 'view') => {
    if (!permissions) return false;

    // Check resource-specific permission first
    const resourcePerm = permissions.resourcePermissions?.find(
        rp => rp.resourceType === resourceType &&
            rp.resourceId.toString() === resourceId.toString() &&
            (!rp.expiresAt || new Date(rp.expiresAt) > new Date())
    );

    if (resourcePerm) {
        const userValue = LEVEL_VALUES[resourcePerm.access] || 0;
        const requiredValue = LEVEL_VALUES[requiredAccess] || 0;
        return userValue >= requiredValue;
    }

    // Fall back to module-level permission
    const moduleMap = { case: 'cases', client: 'clients', project: 'cases' };
    const module = moduleMap[resourceType] || resourceType + 's';
    return checkPermission(permissions, module, requiredAccess);
};

/**
 * Get all modules user can access at given level
 *
 * @param {Object} permissions - Resolved permissions object
 * @param {string} minLevel - Minimum access level
 * @returns {string[]} Array of accessible module names
 */
const getAccessibleModules = (permissions, minLevel = 'view') => {
    if (!permissions || !permissions.modules) return [];

    const requiredValue = LEVEL_VALUES[minLevel] || 0;
    const accessible = [];

    for (const [module, level] of Object.entries(permissions.modules)) {
        const userValue = LEVEL_VALUES[level] || 0;
        if (userValue >= requiredValue) {
            accessible.push(module);
        }
    }

    return accessible;
};

/**
 * Map HTTP method to required permission level
 *
 * @param {string} method - HTTP method
 * @returns {string} Required permission level
 */
const methodToLevel = (method) => {
    switch (method.toUpperCase()) {
        case 'GET':
            return 'view';
        case 'POST':
            return 'edit';
        case 'PUT':
        case 'PATCH':
            return 'edit';
        case 'DELETE':
            return 'full';
        default:
            return 'view';
    }
};

/**
 * Check if role can manage another role
 *
 * @param {string} managerRole - Role of the manager
 * @param {string} targetRole - Role being managed
 * @returns {boolean} True if manager can manage target
 */
const canManageRole = (managerRole, targetRole) => {
    const hierarchy = ['owner', 'admin', 'partner', 'lawyer', 'accountant', 'paralegal', 'secretary', 'departed'];

    const managerLevel = hierarchy.indexOf(managerRole);
    const targetLevel = hierarchy.indexOf(targetRole);

    // Can't find role in hierarchy
    if (managerLevel === -1 || targetLevel === -1) return false;

    // Owner can manage anyone
    if (managerRole === 'owner') return true;

    // Admin can manage anyone except owner
    if (managerRole === 'admin') return targetRole !== 'owner';

    // Others can't manage
    return false;
};

/**
 * Get restrictions for departed employees
 *
 * @param {Object} permissions - Resolved permissions object
 * @returns {Object} Restrictions object
 */
const getRestrictions = (permissions) => {
    if (!permissions || !permissions.isDeparted) {
        return { onlyOwnItems: false, readOnly: false };
    }

    return getDepartedRestrictions('departed');
};

/**
 * Create permission checker middleware
 *
 * @param {string} module - Module to check
 * @param {string} level - Required level
 * @returns {Function} Express middleware
 */
const createPermissionMiddleware = (module, level = 'view') => {
    return async (req, res, next) => {
        try {
            const permissions = await resolvePermissions(req.userID, req.firmId);

            if (!checkPermission(permissions, module, level)) {
                return res.status(403).json({
                    error: true,
                    message: `Insufficient permissions for ${module}:${level}`,
                    code: 'PERMISSION_DENIED'
                });
            }

            req.permissions = permissions;
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Create special permission checker middleware
 *
 * @param {string} permission - Special permission to check
 * @returns {Function} Express middleware
 */
const createSpecialPermissionMiddleware = (permission) => {
    return async (req, res, next) => {
        try {
            const permissions = await resolvePermissions(req.userID, req.firmId);

            if (!checkSpecialPermission(permissions, permission)) {
                return res.status(403).json({
                    error: true,
                    message: `Missing special permission: ${permission}`,
                    code: 'SPECIAL_PERMISSION_DENIED'
                });
            }

            req.permissions = permissions;
            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    resolvePermissions,
    checkPermission,
    checkSpecialPermission,
    checkResourcePermission,
    getAccessibleModules,
    methodToLevel,
    canManageRole,
    getRestrictions,
    createPermissionMiddleware,
    createSpecialPermissionMiddleware
};
