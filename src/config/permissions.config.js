/**
 * Permissions Configuration - Role-Based Access Control (RBAC)
 *
 * This file defines what each role can do in the system.
 * It handles:
 * 1. Active employees with full role-based permissions
 * 2. Departed employees with limited read-only access to their work
 * 3. Module-level and action-level permissions
 *
 * Permission Levels:
 * - none: No access
 * - view: Read-only access
 * - edit: Can create and update
 * - full: Can create, update, and delete
 *
 * Special Permissions:
 * - canApproveInvoices: Can approve/reject invoices
 * - canManageRetainers: Can manage retainer agreements
 * - canExportData: Can export data
 * - canDeleteRecords: Can permanently delete records
 * - canViewFinance: Can see financial data
 * - canManageTeam: Can add/remove team members
 */

// ═══════════════════════════════════════════════════════════════
// ROLES HIERARCHY
// ═══════════════════════════════════════════════════════════════

const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    PARTNER: 'partner',
    LAWYER: 'lawyer',
    PARALEGAL: 'paralegal',
    SECRETARY: 'secretary',
    ACCOUNTANT: 'accountant',
    DEPARTED: 'departed'  // Special role for employees who left
};

// Role hierarchy for permission inheritance
const ROLE_HIERARCHY = [
    'owner',      // Level 7 - Full access
    'admin',      // Level 6 - Almost full access
    'partner',    // Level 5 - Senior role
    'lawyer',     // Level 4 - Standard legal work
    'accountant', // Level 3 - Financial focus
    'paralegal',  // Level 2 - Support role
    'secretary',  // Level 1 - Basic access
    'departed'    // Level 0 - Read-only limited access
];

// ═══════════════════════════════════════════════════════════════
// PERMISSION LEVELS
// ═══════════════════════════════════════════════════════════════

const PERMISSION_LEVELS = {
    NONE: 'none',
    VIEW: 'view',
    EDIT: 'edit',
    FULL: 'full'
};

// Numeric values for comparison
const LEVEL_VALUES = {
    none: 0,
    view: 1,
    edit: 2,
    full: 3
};

// ═══════════════════════════════════════════════════════════════
// MODULES
// ═══════════════════════════════════════════════════════════════

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
    TEAM: 'team',
    HR: 'hr'
};

// ═══════════════════════════════════════════════════════════════
// DEFAULT PERMISSIONS BY ROLE
// ═══════════════════════════════════════════════════════════════

const ROLE_PERMISSIONS = {
    // ─────────────────────────────────────────────────────────────
    // OWNER - Full access to everything
    // ─────────────────────────────────────────────────────────────
    owner: {
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
            team: 'full',
            hr: 'full'
        },
        special: {
            canApproveInvoices: true,
            canManageRetainers: true,
            canExportData: true,
            canDeleteRecords: true,
            canViewFinance: true,
            canManageTeam: true
        }
    },

    // ─────────────────────────────────────────────────────────────
    // ADMIN - Almost full access (can't change some owner-only settings)
    // ─────────────────────────────────────────────────────────────
    admin: {
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
            settings: 'edit',  // Can edit but not full control
            team: 'full',
            hr: 'full'
        },
        special: {
            canApproveInvoices: true,
            canManageRetainers: true,
            canExportData: true,
            canDeleteRecords: true,
            canViewFinance: true,
            canManageTeam: true
        }
    },

    // ─────────────────────────────────────────────────────────────
    // PARTNER - Senior lawyer with expanded access
    // ─────────────────────────────────────────────────────────────
    partner: {
        modules: {
            clients: 'full',
            cases: 'full',
            leads: 'full',
            invoices: 'full',
            payments: 'edit',
            expenses: 'edit',
            documents: 'full',
            tasks: 'full',
            events: 'full',
            timeTracking: 'full',
            reports: 'view',
            settings: 'view',
            team: 'view',
            hr: 'none'
        },
        special: {
            canApproveInvoices: true,
            canManageRetainers: true,
            canExportData: true,
            canDeleteRecords: false,
            canViewFinance: true,
            canManageTeam: false
        }
    },

    // ─────────────────────────────────────────────────────────────
    // LAWYER - Standard legal work access
    // ─────────────────────────────────────────────────────────────
    lawyer: {
        modules: {
            clients: 'edit',
            cases: 'edit',
            leads: 'edit',
            invoices: 'edit',
            payments: 'view',
            expenses: 'edit',  // Can log their own expenses
            documents: 'edit',
            tasks: 'full',     // Full control over their tasks
            events: 'full',
            timeTracking: 'full',
            reports: 'view',
            settings: 'none',
            team: 'view',      // Can see team members
            hr: 'none'
        },
        special: {
            canApproveInvoices: false,
            canManageRetainers: false,
            canExportData: false,
            canDeleteRecords: false,
            canViewFinance: false,  // No access to firm-wide finance
            canManageTeam: false
        }
    },

    // ─────────────────────────────────────────────────────────────
    // PARALEGAL - Support role for legal work
    // ─────────────────────────────────────────────────────────────
    paralegal: {
        modules: {
            clients: 'edit',
            cases: 'edit',
            leads: 'edit',
            invoices: 'view',
            payments: 'none',
            expenses: 'view',
            documents: 'edit',
            tasks: 'edit',
            events: 'edit',
            timeTracking: 'edit',
            reports: 'none',
            settings: 'none',
            team: 'view',
            hr: 'none'
        },
        special: {
            canApproveInvoices: false,
            canManageRetainers: false,
            canExportData: false,
            canDeleteRecords: false,
            canViewFinance: false,
            canManageTeam: false
        }
    },

    // ─────────────────────────────────────────────────────────────
    // SECRETARY - Basic access for administrative support
    // ─────────────────────────────────────────────────────────────
    secretary: {
        modules: {
            clients: 'view',
            cases: 'view',
            leads: 'edit',
            invoices: 'view',
            payments: 'view',
            expenses: 'view',
            documents: 'view',
            tasks: 'edit',
            events: 'edit',
            timeTracking: 'view',
            reports: 'none',
            settings: 'none',
            team: 'view',
            hr: 'none'
        },
        special: {
            canApproveInvoices: false,
            canManageRetainers: false,
            canExportData: false,
            canDeleteRecords: false,
            canViewFinance: false,
            canManageTeam: false
        }
    },

    // ─────────────────────────────────────────────────────────────
    // ACCOUNTANT - Financial focus
    // ─────────────────────────────────────────────────────────────
    accountant: {
        modules: {
            clients: 'view',
            cases: 'none',
            leads: 'none',
            invoices: 'full',
            payments: 'full',
            expenses: 'full',
            documents: 'view',
            tasks: 'edit',
            events: 'edit',
            timeTracking: 'view',  // For billing purposes
            reports: 'full',
            settings: 'none',
            team: 'none',
            hr: 'view'
        },
        special: {
            canApproveInvoices: true,
            canManageRetainers: true,
            canExportData: true,
            canDeleteRecords: false,
            canViewFinance: true,
            canManageTeam: false
        }
    },

    // ─────────────────────────────────────────────────────────────
    // DEPARTED - Ex-employees with read-only access to their work
    // They can ONLY see cases/tasks/events they were assigned to
    // NO access to financial data whatsoever
    // ─────────────────────────────────────────────────────────────
    departed: {
        modules: {
            clients: 'none',     // No client access after departure
            cases: 'view',       // Read-only to their cases
            leads: 'none',
            invoices: 'none',    // No finance access
            payments: 'none',
            expenses: 'none',
            documents: 'view',   // Read-only to case documents
            tasks: 'view',       // Read-only to their tasks
            events: 'view',      // Read-only to their events
            timeTracking: 'view', // Can see their time entries
            reports: 'none',
            settings: 'none',
            team: 'none',
            hr: 'none'
        },
        special: {
            canApproveInvoices: false,
            canManageRetainers: false,
            canExportData: false,
            canDeleteRecords: false,
            canViewFinance: false,
            canManageTeam: false
        },
        // Restrictions for departed employees
        restrictions: {
            // Only see items they were personally assigned/created
            onlyOwnItems: true,
            // Read-only even for "view" permissions
            readOnly: true,
            // Cannot create anything new
            cannotCreate: true,
            // Cannot modify anything
            cannotUpdate: true
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// EMPLOYMENT STATUS
// ═══════════════════════════════════════════════════════════════

const EMPLOYMENT_STATUS = {
    ACTIVE: 'active',
    DEPARTED: 'departed',
    SUSPENDED: 'suspended',
    PENDING: 'pending'  // Invitation pending
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get default permissions for a role
 * @param {string} role - The role name
 * @returns {object} Permissions object
 */
function getDefaultPermissions(role) {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.secretary;
}

/**
 * Check if a permission level meets the required level
 * @param {string} userLevel - User's permission level (none, view, edit, full)
 * @param {string} requiredLevel - Required level
 * @returns {boolean}
 */
function meetsPermissionLevel(userLevel, requiredLevel) {
    return LEVEL_VALUES[userLevel] >= LEVEL_VALUES[requiredLevel];
}

/**
 * Check if a role has permission for a module at a certain level
 * @param {string} role - The role name
 * @param {string} module - The module name
 * @param {string} requiredLevel - Required level (default: 'view')
 * @returns {boolean}
 */
function roleHasPermission(role, module, requiredLevel = 'view') {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) return false;

    const moduleLevel = rolePerms.modules[module] || 'none';
    return meetsPermissionLevel(moduleLevel, requiredLevel);
}

/**
 * Check if role has a special permission
 * @param {string} role - The role name
 * @param {string} permission - The special permission name
 * @returns {boolean}
 */
function hasSpecialPermission(role, permission) {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) return false;

    return rolePerms.special?.[permission] === true;
}

/**
 * Check if role is departed and has restrictions
 * @param {string} role - The role name
 * @returns {object|null} Restrictions object or null
 */
function getDepartedRestrictions(role) {
    if (role !== 'departed') return null;
    return ROLE_PERMISSIONS.departed.restrictions;
}

/**
 * Get role hierarchy level (higher = more permissions)
 * @param {string} role - The role name
 * @returns {number}
 */
function getRoleLevel(role) {
    const index = ROLE_HIERARCHY.indexOf(role);
    return index === -1 ? 0 : ROLE_HIERARCHY.length - index;
}

/**
 * Check if role can manage another role
 * @param {string} managerRole - The manager's role
 * @param {string} targetRole - The target role
 * @returns {boolean}
 */
function canManageRole(managerRole, targetRole) {
    // Only owner can manage admin
    if (targetRole === 'admin') return managerRole === 'owner';
    // Owner and admin can manage anyone else
    if (['owner', 'admin'].includes(managerRole)) return true;
    return false;
}

/**
 * Get all modules a role can access
 * @param {string} role - The role name
 * @param {string} minLevel - Minimum access level (default: 'view')
 * @returns {string[]} Array of module names
 */
function getAccessibleModules(role, minLevel = 'view') {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) return [];

    return Object.entries(rolePerms.modules)
        .filter(([_, level]) => meetsPermissionLevel(level, minLevel))
        .map(([module]) => module);
}

/**
 * Map API action to permission level
 * @param {string} method - HTTP method
 * @returns {string} Required permission level
 */
function getRequiredLevelForAction(method) {
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
}

module.exports = {
    ROLES,
    ROLE_HIERARCHY,
    PERMISSION_LEVELS,
    LEVEL_VALUES,
    MODULES,
    ROLE_PERMISSIONS,
    EMPLOYMENT_STATUS,
    // Helper functions
    getDefaultPermissions,
    meetsPermissionLevel,
    roleHasPermission,
    hasSpecialPermission,
    getDepartedRestrictions,
    getRoleLevel,
    canManageRole,
    getAccessibleModules,
    getRequiredLevelForAction
};
