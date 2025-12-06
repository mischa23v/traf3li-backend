/**
 * Simplified Permissions Configuration
 * Everyone gets full access - same permissions for all users
 */

// Simple roles
const ROLES = {
    OWNER: 'owner',
    MEMBER: 'member'
};

// Permission levels
const PERMISSION_LEVELS = {
    NONE: 'none',
    VIEW: 'view',
    EDIT: 'edit',
    FULL: 'full'
};

const LEVEL_VALUES = {
    none: 0,
    view: 1,
    edit: 2,
    full: 3
};

// Modules
const MODULES = {
    CLIENTS: 'clients',
    CASES: 'cases',
    LEADS: 'leads',
    INVOICES: 'invoices',
    PAYMENTS: 'payments',
    EXPENSES: 'expenses',
    DOCUMENTS: 'documents',
    TASKS: 'tasks',
    EVENTS: 'events',
    TIME_TRACKING: 'timeTracking',
    REPORTS: 'reports',
    SETTINGS: 'settings',
    TEAM: 'team'
};

// Full access permissions - same for everyone
const FULL_ACCESS = {
    modules: {
        clients: 'full',
        cases: 'full',
        leads: 'full',
        invoices: 'full',
        payments: 'full',
        expenses: 'full',
        documents: 'full',
        tasks: 'full',
        events: 'full',
        timeTracking: 'full',
        reports: 'full',
        settings: 'full',
        team: 'full'
    },
    special: {
        canApproveInvoices: true,
        canManageRetainers: true,
        canExportData: true,
        canDeleteRecords: true,
        canViewFinance: true,
        canManageTeam: true
    }
};

// Everyone gets the same permissions
const ROLE_PERMISSIONS = {
    owner: FULL_ACCESS,
    member: FULL_ACCESS,
    admin: FULL_ACCESS,
    partner: FULL_ACCESS,
    lawyer: FULL_ACCESS,
    paralegal: FULL_ACCESS,
    secretary: FULL_ACCESS,
    accountant: FULL_ACCESS,
    solo_lawyer: FULL_ACCESS,
    departed: FULL_ACCESS
};

const ROLE_HIERARCHY = ['owner', 'member'];

const EMPLOYMENT_STATUS = {
    ACTIVE: 'active',
    DEPARTED: 'departed',
    SUSPENDED: 'suspended',
    PENDING: 'pending'
};

const ACTIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    APPROVE: 'approve',
    EXPORT: 'export',
    MANAGE: 'manage'
};

// Simple helper functions
function getDefaultPermissions(role) {
    return FULL_ACCESS;
}

function getSoloLawyerPermissions() {
    return FULL_ACCESS;
}

function isSoloLawyer(user) {
    return !user.firmId;
}

function resolveUserPermissions(user, member = null) {
    return {
        ...FULL_ACCESS,
        tenantId: user.firmId || null
    };
}

function meetsPermissionLevel(userLevel, requiredLevel) {
    return LEVEL_VALUES[userLevel] >= LEVEL_VALUES[requiredLevel];
}

function roleHasPermission(role, module, requiredLevel = 'view') {
    return true; // Everyone has full access
}

function hasSpecialPermission(role, permission) {
    return true; // Everyone has all special permissions
}

function getDepartedRestrictions(role) {
    return null; // No restrictions
}

function getRoleLevel(role) {
    return 10; // Everyone is top level
}

function canManageRole(managerRole, targetRole) {
    return true; // Everyone can manage
}

function getAccessibleModules(role, minLevel = 'view') {
    return Object.values(MODULES);
}

function getRequiredLevelForAction(method) {
    switch (method.toUpperCase()) {
        case 'GET': return 'view';
        case 'POST': return 'edit';
        case 'PUT':
        case 'PATCH': return 'edit';
        case 'DELETE': return 'full';
        default: return 'view';
    }
}

function methodToAction(method) {
    const map = {
        'GET': ACTIONS.READ,
        'POST': ACTIONS.CREATE,
        'PUT': ACTIONS.UPDATE,
        'PATCH': ACTIONS.UPDATE,
        'DELETE': ACTIONS.DELETE
    };
    return map[method.toUpperCase()] || ACTIONS.READ;
}

function levelAllowsAction(level, action) {
    return true; // Always allow
}

function enforce(subject, object, action, domain = null) {
    return { allowed: true, reason: 'ALLOWED: Full access' };
}

function enforceSpecial(subject, specialAction) {
    return true;
}

function getRolePermissionsWithInheritance(role) {
    return FULL_ACCESS;
}

function buildSubject(user, member = null) {
    return {
        userId: user._id,
        role: 'owner',
        isSoloLawyer: !user.firmId,
        firmId: user.firmId || null,
        permissions: FULL_ACCESS.modules,
        directPermissions: FULL_ACCESS.special,
        denyPermissions: {}
    };
}

function enforceMiddleware(resource, action = null) {
    return async (req, res, next) => {
        next(); // Always allow
    };
}

module.exports = {
    // Constants
    ROLES,
    ROLE_HIERARCHY,
    PERMISSION_LEVELS,
    LEVEL_VALUES,
    MODULES,
    ROLE_PERMISSIONS,
    EMPLOYMENT_STATUS,
    ACTIONS,

    // Helper functions
    getDefaultPermissions,
    getSoloLawyerPermissions,
    isSoloLawyer,
    resolveUserPermissions,
    meetsPermissionLevel,
    roleHasPermission,
    hasSpecialPermission,
    getDepartedRestrictions,
    getRoleLevel,
    canManageRole,
    getAccessibleModules,
    getRequiredLevelForAction,

    // Enforcer functions
    methodToAction,
    levelAllowsAction,
    enforce,
    enforceSpecial,
    getRolePermissionsWithInheritance,
    buildSubject,
    enforceMiddleware
};
