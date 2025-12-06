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
    DEPARTED: 'departed',  // Special role for employees who left
    SOLO_LAWYER: 'solo_lawyer' // Independent lawyer without a firm
};

// ═══════════════════════════════════════════════════════════════
// WORK MODES (Casbin-style domain/tenant types)
// ═══════════════════════════════════════════════════════════════

const WORK_MODES = {
    SOLO: 'solo',           // Independent lawyer, no firm (tenant=null)
    FIRM_OWNER: 'firm_owner', // Owns a firm (tenant=firmId, role=owner)
    FIRM_MEMBER: 'firm_member' // Member of a firm (tenant=firmId, role=member/admin/etc)
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
    },

    // ─────────────────────────────────────────────────────────────
    // SOLO_LAWYER - Independent lawyer without a firm
    // Has full access to their own data (like owner, but no team)
    // No tenant/domain context - data is filtered by lawyerId
    // ─────────────────────────────────────────────────────────────
    solo_lawyer: {
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
            team: 'none',        // No team for solo lawyers
            hr: 'none'           // No HR for solo lawyers
        },
        special: {
            canApproveInvoices: true,
            canManageRetainers: true,
            canExportData: true,
            canDeleteRecords: true,
            canViewFinance: true,
            canManageTeam: false,  // Cannot manage team (no team)
            canCreateFirm: true,   // Can convert to firm
            canJoinFirm: true      // Can join existing firm
        },
        // Solo lawyer specific settings
        workMode: {
            isSolo: true,
            hasNoTenant: true,
            dataFilterBy: 'lawyerId'
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
 * Get permissions for a solo lawyer
 * Solo lawyers have owner-level permissions for their own data
 * @returns {object} Permissions object for solo lawyer
 */
function getSoloLawyerPermissions() {
    return ROLE_PERMISSIONS.solo_lawyer;
}

/**
 * Check if user is a solo lawyer based on their work mode
 * @param {object} user - User object with isSoloLawyer and lawyerWorkMode
 * @returns {boolean}
 */
function isSoloLawyer(user) {
    return user.isSoloLawyer === true ||
           user.lawyerWorkMode === 'solo' ||
           (user.role === 'lawyer' && !user.firmId);
}

/**
 * Get the appropriate permissions based on user context
 * Implements Casbin-style domain-aware permission resolution
 * @param {object} user - User object
 * @param {object} member - Firm member object (if in a firm)
 * @returns {object} Resolved permissions
 */
function resolveUserPermissions(user, member = null) {
    // Solo lawyer - full permissions, no tenant
    if (isSoloLawyer(user)) {
        return {
            ...ROLE_PERMISSIONS.solo_lawyer,
            workMode: WORK_MODES.SOLO,
            tenantId: null
        };
    }

    // Firm member - permissions from firm membership
    if (user.firmId && member) {
        const rolePerms = ROLE_PERMISSIONS[member.role] || ROLE_PERMISSIONS.lawyer;
        return {
            ...rolePerms,
            // Override with custom permissions if set
            modules: { ...rolePerms.modules, ...(member.permissions || {}) },
            workMode: member.role === 'owner' ? WORK_MODES.FIRM_OWNER : WORK_MODES.FIRM_MEMBER,
            tenantId: user.firmId
        };
    }

    // Fallback for users with firmId but no member data
    if (user.firmId) {
        const rolePerms = ROLE_PERMISSIONS[user.firmRole] || ROLE_PERMISSIONS.lawyer;
        return {
            ...rolePerms,
            workMode: user.firmRole === 'owner' ? WORK_MODES.FIRM_OWNER : WORK_MODES.FIRM_MEMBER,
            tenantId: user.firmId
        };
    }

    // Default for non-lawyer users
    return {
        modules: {},
        special: {},
        workMode: null,
        tenantId: null
    };
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

// ═══════════════════════════════════════════════════════════════
// CASBIN-STYLE ENFORCER (Subject, Object, Action, Domain)
// ═══════════════════════════════════════════════════════════════

/**
 * HTTP method to action mapping (Casbin-style)
 */
const ACTIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    APPROVE: 'approve',
    EXPORT: 'export',
    MANAGE: 'manage'
};

/**
 * Map HTTP method to action
 * @param {string} method - HTTP method
 * @returns {string} Action name
 */
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

/**
 * Check if action is allowed by permission level
 * @param {string} level - Permission level (none, view, edit, full)
 * @param {string} action - Action (create, read, update, delete)
 * @returns {boolean}
 */
function levelAllowsAction(level, action) {
    const actionLevelMap = {
        [ACTIONS.READ]: LEVEL_VALUES.view,
        [ACTIONS.CREATE]: LEVEL_VALUES.edit,
        [ACTIONS.UPDATE]: LEVEL_VALUES.edit,
        [ACTIONS.DELETE]: LEVEL_VALUES.full,
        [ACTIONS.APPROVE]: LEVEL_VALUES.full,
        [ACTIONS.EXPORT]: LEVEL_VALUES.view,
        [ACTIONS.MANAGE]: LEVEL_VALUES.full
    };

    const requiredLevel = actionLevelMap[action] || LEVEL_VALUES.view;
    const userLevel = LEVEL_VALUES[level] || 0;

    return userLevel >= requiredLevel;
}

/**
 * Casbin-style enforce function
 * Checks if subject can perform action on object in domain
 *
 * @param {object} subject - User context { role, permissions, isSoloLawyer, firmId, directPermissions, denyPermissions }
 * @param {string} object - Resource/module name (e.g., 'cases', 'clients')
 * @param {string} action - Action to perform (create, read, update, delete)
 * @param {string|null} domain - Tenant/firm ID (null for solo lawyers)
 * @returns {object} { allowed: boolean, reason: string }
 */
function enforce(subject, object, action, domain = null) {
    // 1. Check explicit deny rules first (deny takes precedence - Casbin pattern)
    if (subject.denyPermissions && subject.denyPermissions[object]) {
        const denyLevel = subject.denyPermissions[object];
        if (denyLevel === 'all' || levelAllowsAction(denyLevel, action)) {
            return {
                allowed: false,
                reason: `DENIED: Explicit deny rule for ${object}:${action}`
            };
        }
    }

    // 2. Solo lawyer - full access to their own domain (domain=null)
    if (subject.isSoloLawyer && domain === null) {
        const soloPerms = ROLE_PERMISSIONS.solo_lawyer;
        const level = soloPerms.modules[object] || 'none';
        if (levelAllowsAction(level, action)) {
            return {
                allowed: true,
                reason: 'ALLOWED: Solo lawyer has full access to own data'
            };
        }
    }

    // 3. Check domain/tenant match (multi-tenancy isolation)
    if (domain && subject.firmId && subject.firmId.toString() !== domain.toString()) {
        return {
            allowed: false,
            reason: 'DENIED: Cross-tenant access not allowed'
        };
    }

    // 4. Check direct permissions first (Laravel Permission pattern)
    if (subject.directPermissions && subject.directPermissions[object]) {
        const level = subject.directPermissions[object];
        if (levelAllowsAction(level, action)) {
            return {
                allowed: true,
                reason: `ALLOWED: Direct permission ${object}:${level}`
            };
        }
    }

    // 5. Check custom permissions from firm membership
    if (subject.permissions && subject.permissions[object]) {
        const level = subject.permissions[object];
        if (levelAllowsAction(level, action)) {
            return {
                allowed: true,
                reason: `ALLOWED: Custom permission ${object}:${level}`
            };
        }
    }

    // 6. Check role-based permissions with inheritance
    const rolePerms = getRolePermissionsWithInheritance(subject.role);
    if (rolePerms && rolePerms.modules && rolePerms.modules[object]) {
        const level = rolePerms.modules[object];
        if (levelAllowsAction(level, action)) {
            return {
                allowed: true,
                reason: `ALLOWED: Role ${subject.role} has ${object}:${level}`
            };
        }
    }

    // 7. Default deny
    return {
        allowed: false,
        reason: `DENIED: No permission for ${object}:${action}`
    };
}

/**
 * Get role permissions with inheritance from hierarchy
 * Higher roles inherit permissions from lower roles
 *
 * @param {string} role - Role name
 * @returns {object} Merged permissions from role and inherited roles
 */
function getRolePermissionsWithInheritance(role) {
    const roleIndex = ROLE_HIERARCHY.indexOf(role);
    if (roleIndex === -1) {
        return ROLE_PERMISSIONS[role] || null;
    }

    // Get all roles this role inherits from (lower in hierarchy)
    const inheritedRoles = ROLE_HIERARCHY.slice(roleIndex);

    // Merge permissions, higher roles override lower ones
    let mergedModules = {};
    let mergedSpecial = {};

    // Start from lowest role and work up
    for (let i = inheritedRoles.length - 1; i >= 0; i--) {
        const inheritRole = inheritedRoles[i];
        const perms = ROLE_PERMISSIONS[inheritRole];
        if (perms) {
            // Merge modules - higher level takes precedence
            if (perms.modules) {
                for (const [mod, level] of Object.entries(perms.modules)) {
                    const currentLevel = LEVEL_VALUES[mergedModules[mod]] || 0;
                    const newLevel = LEVEL_VALUES[level] || 0;
                    if (newLevel > currentLevel) {
                        mergedModules[mod] = level;
                    }
                }
            }
            // Merge special permissions - true takes precedence
            if (perms.special) {
                mergedSpecial = { ...mergedSpecial, ...perms.special };
            }
        }
    }

    return {
        modules: mergedModules,
        special: mergedSpecial,
        role: role
    };
}

/**
 * Check special action permission (Casbin-style for special operations)
 * @param {object} subject - User context
 * @param {string} specialAction - Special action (canApproveInvoices, canExportData, etc.)
 * @returns {boolean}
 */
function enforceSpecial(subject, specialAction) {
    // Check direct special permissions
    if (subject.directPermissions && subject.directPermissions[specialAction] === true) {
        return true;
    }

    // Check custom permissions from firm membership
    if (subject.permissions && subject.permissions[specialAction] === true) {
        return true;
    }

    // Check role-based special permissions with inheritance
    const rolePerms = getRolePermissionsWithInheritance(subject.role);
    if (rolePerms && rolePerms.special && rolePerms.special[specialAction] === true) {
        return true;
    }

    return false;
}

/**
 * Build subject context for enforce function
 * Creates a standardized subject object from user data
 *
 * @param {object} user - User document
 * @param {object} member - Firm member data (optional)
 * @returns {object} Subject context for enforce()
 */
function buildSubject(user, member = null) {
    const subject = {
        userId: user._id,
        role: user.firmRole || user.role || 'client',
        isSoloLawyer: isSoloLawyer(user),
        firmId: user.firmId || null,
        permissions: {},
        directPermissions: {},
        denyPermissions: {}
    };

    // Solo lawyer context
    if (subject.isSoloLawyer) {
        subject.role = 'solo_lawyer';
        subject.permissions = ROLE_PERMISSIONS.solo_lawyer.modules;
        return subject;
    }

    // Firm member context
    if (member) {
        subject.role = member.role;

        // Custom permissions override role defaults
        if (member.permissions && typeof member.permissions === 'object') {
            // Separate modules from special permissions
            const modulePerms = {};
            const specialPerms = {};

            for (const [key, value] of Object.entries(member.permissions)) {
                if (MODULES[key.toUpperCase()] || Object.values(MODULES).includes(key)) {
                    modulePerms[key] = value;
                } else if (typeof value === 'boolean') {
                    specialPerms[key] = value;
                }
            }

            subject.permissions = modulePerms;
            subject.directPermissions = specialPerms;
        }

        // Handle deny rules if present
        if (member.denyPermissions) {
            subject.denyPermissions = member.denyPermissions;
        }
    }

    return subject;
}

/**
 * Express middleware factory for Casbin-style enforcement
 * Creates middleware that checks permissions before route handler
 *
 * @param {string} resource - Resource/module name
 * @param {string} action - Action (optional, inferred from HTTP method if not provided)
 * @returns {function} Express middleware
 */
function enforceMiddleware(resource, action = null) {
    return async (req, res, next) => {
        try {
            const finalAction = action || methodToAction(req.method);
            const subject = req.subject || buildSubject(
                { _id: req.userID, firmId: req.firmId, firmRole: req.firmRole, isSoloLawyer: req.isSoloLawyer },
                req.memberData
            );
            const domain = req.firmId || null;

            const result = enforce(subject, resource, finalAction, domain);

            if (!result.allowed) {
                return res.status(403).json({
                    success: false,
                    message: 'ليس لديك صلاحية لهذا الإجراء',
                    code: 'PERMISSION_DENIED',
                    debug: process.env.NODE_ENV === 'development' ? result.reason : undefined
                });
            }

            // Attach enforcement result for logging
            req.enforcementResult = result;
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Permission check failed',
                error: error.message
            });
        }
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
    WORK_MODES,
    ACTIONS,

    // Basic helper functions
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

    // Casbin-style enforcer functions
    methodToAction,
    levelAllowsAction,
    enforce,
    enforceSpecial,
    getRolePermissionsWithInheritance,
    buildSubject,
    enforceMiddleware
};
