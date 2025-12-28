/**
 * UI Access Configuration Model
 *
 * Controls which sidebar sections and pages are visible/accessible
 * to different roles within a firm. Admin can customize which
 * modules each role can see and access.
 *
 * Features:
 * - Sidebar section visibility per role
 * - Page/route access control
 * - Custom visibility overrides per user
 * - Lock screen with access denied message
 */

const mongoose = require('mongoose');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// SIDEBAR ITEM SCHEMA
// ═══════════════════════════════════════════════════════════════

const sidebarItemSchema = new mongoose.Schema({
    // Item identification
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    nameAr: String,
    icon: String,
    path: String,        // Route path (e.g., '/dashboard/cases')

    // Parent item (for nested navigation)
    parentId: String,

    // Order in sidebar
    order: { type: Number, default: 0 },

    // Associated namespace for permission checking
    namespace: String,

    // Visibility by role - key is role name, value is visibility
    roleVisibility: {
        type: Map,
        of: Boolean,
        default: {}
    },

    // Default visibility for roles not explicitly set
    defaultVisible: { type: Boolean, default: true },

    // Is this a system item that can't be hidden
    isSystem: { type: Boolean, default: false },

    // Badge/notification count namespace
    badgeNamespace: String,

    // Children items (for submenu)
    children: [{
        itemId: { type: String, required: true },
        name: { type: String, required: true },
        nameAr: String,
        icon: String,
        path: String,
        namespace: String,
        roleVisibility: {
            type: Map,
            of: Boolean,
            default: {}
        },
        defaultVisible: { type: Boolean, default: true },
        order: { type: Number, default: 0 }
    }]
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// PAGE ACCESS SCHEMA
// ═══════════════════════════════════════════════════════════════

const pageAccessSchema = new mongoose.Schema({
    // Page identification
    pageId: { type: String, required: true },
    name: { type: String, required: true },
    nameAr: String,

    // Route pattern (supports wildcards)
    routePattern: { type: String, required: true },  // e.g., '/dashboard/hr/*'

    // Associated namespace
    namespace: String,

    // Required action to access
    requiredAction: {
        type: String,
        enum: ['view', 'create', 'edit', 'delete', 'manage', '*'],
        default: 'view'
    },

    // Access by role
    roleAccess: {
        type: Map,
        of: Boolean,
        default: {}
    },

    // Default access for roles not explicitly set
    defaultAccess: { type: Boolean, default: true },

    // Is this a system page
    isSystem: { type: Boolean, default: false },

    // Lock screen configuration
    lockScreen: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'ليس لديك صلاحية للوصول' },
        titleEn: { type: String, default: 'Access Denied' },
        message: { type: String, default: 'ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة' },
        messageEn: { type: String, default: 'You do not have permission to access this page' },
        showRequestAccess: { type: Boolean, default: false }
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// USER OVERRIDE SCHEMA
// ═══════════════════════════════════════════════════════════════

const userOverrideSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Sidebar items to show (regardless of role)
    showSidebarItems: [String],  // itemIds

    // Sidebar items to hide (regardless of role)
    hideSidebarItems: [String],  // itemIds

    // Pages to grant access (regardless of role)
    grantPageAccess: [String],   // pageIds

    // Pages to deny access (regardless of role)
    denyPageAccess: [String],    // pageIds

    // Reason for override
    reason: String,

    // Expiration
    expiresAt: Date,

    // Who created this override
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false, timestamps: true });

// ═══════════════════════════════════════════════════════════════
// UI ACCESS CONFIG SCHEMA
// ═══════════════════════════════════════════════════════════════

const uiAccessConfigSchema = new mongoose.Schema({
    // Firm-specific configuration
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Sidebar configuration
    sidebarItems: [sidebarItemSchema],

    // Page access configuration
    pageAccess: [pageAccessSchema],

    // User-specific overrides
    userOverrides: [userOverrideSchema],

    // Global settings
    settings: {
        // Show lock screen or redirect to dashboard
        useLockScreen: { type: Boolean, default: true },

        // Default lock screen message
        defaultLockMessage: {
            title: { type: String, default: 'ليس لديك صلاحية للوصول' },
            titleEn: { type: String, default: 'Access Denied' },
            message: { type: String, default: 'ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة' },
            messageEn: { type: String, default: 'You do not have permission to access this page' }
        },

        // Redirect path when access denied (if lock screen disabled)
        redirectPath: { type: String, default: '/dashboard' },

        // Show hidden items as disabled (greyed out)
        showDisabledItems: { type: Boolean, default: false },

        // Log access denials
        logAccessDenials: { type: Boolean, default: true }
    },

    // Metadata
    version: { type: Number, default: 1 },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

uiAccessConfigSchema.index({ firmId: 1 });
uiAccessConfigSchema.index({ 'userOverrides.userId': 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get UI access configuration for a firm
 */
uiAccessConfigSchema.statics.getForFirm = async function(firmId) {
    let config = await this.findOne({ firmId }).lean();

    if (!config) {
        // Create default configuration
        config = await this.create({
            firmId,
            sidebarItems: getDefaultSidebarItems(),
            pageAccess: getDefaultPageAccess(),
            userOverrides: [],
            settings: {}
        });
        config = config.toObject();
    }

    return config;
};

/**
 * Get visible sidebar items for a user
 */
uiAccessConfigSchema.statics.getVisibleSidebar = async function(firmId, userId, userRole) {
    const config = await this.getForFirm(firmId);

    // Find user-specific overrides
    const userOverride = config.userOverrides?.find(
        o => o.userId?.toString() === userId?.toString() &&
            (!o.expiresAt || new Date(o.expiresAt) > new Date())
    );

    const visibleItems = [];

    for (const item of config.sidebarItems || []) {
        // Check user override first
        if (userOverride?.hideSidebarItems?.includes(item.itemId)) {
            continue;
        }

        if (userOverride?.showSidebarItems?.includes(item.itemId)) {
            visibleItems.push(formatSidebarItem(item, userRole, userOverride, config.settings));
            continue;
        }

        // Check role visibility
        const roleVisible = item.roleVisibility?.get?.(userRole);
        const isVisible = roleVisible !== undefined ? roleVisible : item.defaultVisible;

        if (isVisible || item.isSystem) {
            const formattedItem = formatSidebarItem(item, userRole, userOverride, config.settings);
            visibleItems.push(formattedItem);
        }
    }

    return visibleItems.sort((a, b) => a.order - b.order);
};

/**
 * Check if user has access to a page
 */
uiAccessConfigSchema.statics.checkPageAccess = async function(firmId, userId, userRole, routePath) {
    const config = await this.getForFirm(firmId);

    // Find user-specific overrides
    const userOverride = config.userOverrides?.find(
        o => o.userId?.toString() === userId?.toString() &&
            (!o.expiresAt || new Date(o.expiresAt) > new Date())
    );

    // Find matching page access rule
    const pageRule = findMatchingPageRule(config.pageAccess, routePath);

    if (!pageRule) {
        // No rule found, allow by default
        return { allowed: true, pageId: null };
    }

    // Check user override first
    if (userOverride?.denyPageAccess?.includes(pageRule.pageId)) {
        return {
            allowed: false,
            pageId: pageRule.pageId,
            lockScreen: pageRule.lockScreen,
            reason: 'User override: access denied'
        };
    }

    if (userOverride?.grantPageAccess?.includes(pageRule.pageId)) {
        return { allowed: true, pageId: pageRule.pageId };
    }

    // Check role access
    const roleAccess = pageRule.roleAccess?.get?.(userRole);
    const hasAccess = roleAccess !== undefined ? roleAccess : pageRule.defaultAccess;

    if (hasAccess) {
        return { allowed: true, pageId: pageRule.pageId };
    }

    return {
        allowed: false,
        pageId: pageRule.pageId,
        lockScreen: config.settings?.useLockScreen !== false ? pageRule.lockScreen : null,
        redirectPath: config.settings?.redirectPath || '/dashboard',
        reason: `Role ${userRole} does not have access`
    };
};

/**
 * Update sidebar item visibility for a role
 */
uiAccessConfigSchema.statics.updateSidebarVisibility = async function(firmId, itemId, role, visible, userId) {
    const config = await this.findOne({ firmId });

    if (!config) {
        throw new Error('UI Access configuration not found');
    }

    const item = config.sidebarItems.find(i => i.itemId === itemId);
    if (!item) {
        throw new Error('Sidebar item not found');
    }

    if (item.isSystem) {
        throw new Error('Cannot modify system sidebar item');
    }

    // Initialize roleVisibility if not exists
    if (!item.roleVisibility) {
        item.roleVisibility = new Map();
    }

    item.roleVisibility.set(role, visible);

    config.version += 1;
    config.lastModifiedBy = userId;
    await config.save();

    return config;
};

/**
 * Update page access for a role
 */
uiAccessConfigSchema.statics.updatePageAccess = async function(firmId, pageId, role, hasAccess, userId) {
    const config = await this.findOne({ firmId });

    if (!config) {
        throw new Error('UI Access configuration not found');
    }

    const page = config.pageAccess.find(p => p.pageId === pageId);
    if (!page) {
        throw new Error('Page access rule not found');
    }

    if (page.isSystem) {
        throw new Error('Cannot modify system page access');
    }

    // Initialize roleAccess if not exists
    if (!page.roleAccess) {
        page.roleAccess = new Map();
    }

    page.roleAccess.set(role, hasAccess);

    config.version += 1;
    config.lastModifiedBy = userId;
    await config.save();

    return config;
};

/**
 * Bulk update visibility for a role
 */
uiAccessConfigSchema.statics.bulkUpdateRoleVisibility = async function(firmId, role, updates, userId) {
    const config = await this.findOne({ firmId });

    if (!config) {
        throw new Error('UI Access configuration not found');
    }

    // Update sidebar items
    if (updates.sidebarItems) {
        for (const [itemId, visible] of Object.entries(updates.sidebarItems)) {
            const item = config.sidebarItems.find(i => i.itemId === itemId);
            if (item && !item.isSystem) {
                if (!item.roleVisibility) {
                    item.roleVisibility = new Map();
                }
                item.roleVisibility.set(role, visible);
            }
        }
    }

    // Update page access
    if (updates.pageAccess) {
        for (const [pageId, hasAccess] of Object.entries(updates.pageAccess)) {
            const page = config.pageAccess.find(p => p.pageId === pageId);
            if (page && !page.isSystem) {
                if (!page.roleAccess) {
                    page.roleAccess = new Map();
                }
                page.roleAccess.set(role, hasAccess);
            }
        }
    }

    config.version += 1;
    config.lastModifiedBy = userId;
    config.markModified('sidebarItems');
    config.markModified('pageAccess');
    await config.save();

    return config;
};

/**
 * Add user override
 */
uiAccessConfigSchema.statics.addUserOverride = async function(firmId, override, createdBy) {
    const config = await this.findOne({ firmId });

    if (!config) {
        throw new Error('UI Access configuration not found');
    }

    // Remove existing override for this user
    config.userOverrides = config.userOverrides.filter(
        o => o.userId?.toString() !== override.userId?.toString()
    );

    // Add new override
    config.userOverrides.push({
        ...override,
        createdBy
    });

    config.version += 1;
    config.lastModifiedBy = createdBy;
    await config.save();

    return config;
};

/**
 * Remove user override
 */
uiAccessConfigSchema.statics.removeUserOverride = async function(firmId, userId, removedBy) {
    const config = await this.findOne({ firmId });

    if (!config) {
        throw new Error('UI Access configuration not found');
    }

    config.userOverrides = config.userOverrides.filter(
        o => o.userId?.toString() !== userId?.toString()
    );

    config.version += 1;
    config.lastModifiedBy = removedBy;
    await config.save();

    return config;
};

/**
 * Get access matrix for all roles
 */
uiAccessConfigSchema.statics.getAccessMatrix = async function(firmId) {
    const config = await this.getForFirm(firmId);
    const roles = ['owner', 'admin', 'partner', 'senior_lawyer', 'lawyer', 'paralegal', 'secretary', 'accountant', 'intern'];

    const matrix = {
        sidebar: {},
        pages: {}
    };

    // Build sidebar matrix
    for (const item of config.sidebarItems || []) {
        matrix.sidebar[item.itemId] = {
            name: item.name,
            nameAr: item.nameAr,
            isSystem: item.isSystem,
            roles: {}
        };

        for (const role of roles) {
            const roleVisible = item.roleVisibility?.get?.(role) ?? item.roleVisibility?.[role];
            matrix.sidebar[item.itemId].roles[role] = roleVisible !== undefined ? roleVisible : item.defaultVisible;
        }
    }

    // Build page access matrix
    for (const page of config.pageAccess || []) {
        matrix.pages[page.pageId] = {
            name: page.name,
            nameAr: page.nameAr,
            routePattern: page.routePattern,
            isSystem: page.isSystem,
            roles: {}
        };

        for (const role of roles) {
            const roleAccess = page.roleAccess?.get?.(role) ?? page.roleAccess?.[role];
            matrix.pages[page.pageId].roles[role] = roleAccess !== undefined ? roleAccess : page.defaultAccess;
        }
    }

    return matrix;
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function formatSidebarItem(item, userRole, userOverride, settings) {
    const children = [];

    if (item.children) {
        for (const child of item.children) {
            // Check user override for child
            if (userOverride?.hideSidebarItems?.includes(child.itemId)) {
                continue;
            }

            if (userOverride?.showSidebarItems?.includes(child.itemId)) {
                children.push({
                    itemId: child.itemId,
                    name: child.name,
                    nameAr: child.nameAr,
                    icon: child.icon,
                    path: child.path,
                    namespace: child.namespace,
                    order: child.order
                });
                continue;
            }

            const childRoleVisible = child.roleVisibility?.get?.(userRole) ?? child.roleVisibility?.[userRole];
            const childIsVisible = childRoleVisible !== undefined ? childRoleVisible : child.defaultVisible;

            if (childIsVisible) {
                children.push({
                    itemId: child.itemId,
                    name: child.name,
                    nameAr: child.nameAr,
                    icon: child.icon,
                    path: child.path,
                    namespace: child.namespace,
                    order: child.order
                });
            }
        }
    }

    return {
        itemId: item.itemId,
        name: item.name,
        nameAr: item.nameAr,
        icon: item.icon,
        path: item.path,
        namespace: item.namespace,
        order: item.order,
        badgeNamespace: item.badgeNamespace,
        children: children.sort((a, b) => a.order - b.order)
    };
}

function findMatchingPageRule(pageAccess, routePath) {
    if (!pageAccess || !routePath) return null;

    // Try exact match first
    let match = pageAccess.find(p => p.routePattern === routePath);
    if (match) return match;

    // Try wildcard match
    for (const page of pageAccess) {
        if (page.routePattern.includes('*')) {
            const pattern = escapeRegex(page.routePattern).replace(/\\\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(routePath)) {
                return page;
            }
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

function getDefaultSidebarItems() {
    return [
        {
            itemId: 'dashboard',
            name: 'Dashboard',
            nameAr: 'لوحة التحكم',
            icon: 'LayoutDashboard',
            path: '/dashboard',
            namespace: 'dashboard',
            order: 0,
            isSystem: true,
            defaultVisible: true,
            roleVisibility: new Map()
        },
        {
            itemId: 'cases',
            name: 'Cases',
            nameAr: 'القضايا',
            icon: 'Briefcase',
            path: '/dashboard/cases',
            namespace: 'cases',
            order: 1,
            defaultVisible: true,
            roleVisibility: new Map()
        },
        {
            itemId: 'clients',
            name: 'Clients',
            nameAr: 'العملاء',
            icon: 'Users',
            path: '/dashboard/clients',
            namespace: 'clients',
            order: 2,
            defaultVisible: true,
            roleVisibility: new Map()
        },
        {
            itemId: 'tasks',
            name: 'Tasks',
            nameAr: 'المهام',
            icon: 'CheckSquare',
            path: '/dashboard/tasks',
            namespace: 'tasks',
            order: 3,
            defaultVisible: true,
            roleVisibility: new Map(),
            badgeNamespace: 'tasks'
        },
        {
            itemId: 'calendar',
            name: 'Calendar',
            nameAr: 'التقويم',
            icon: 'Calendar',
            path: '/dashboard/calendar',
            namespace: 'calendar',
            order: 4,
            defaultVisible: true,
            roleVisibility: new Map()
        },
        {
            itemId: 'documents',
            name: 'Documents',
            nameAr: 'المستندات',
            icon: 'FileText',
            path: '/dashboard/documents',
            namespace: 'documents',
            order: 5,
            defaultVisible: true,
            roleVisibility: new Map()
        },
        {
            itemId: 'finance',
            name: 'Finance',
            nameAr: 'المالية',
            icon: 'DollarSign',
            path: '/dashboard/finance',
            namespace: 'finance',
            order: 6,
            defaultVisible: true,
            roleVisibility: new Map([
                ['intern', false],
                ['secretary', false]
            ]),
            children: [
                {
                    itemId: 'invoices',
                    name: 'Invoices',
                    nameAr: 'الفواتير',
                    icon: 'FileText',
                    path: '/dashboard/invoices',
                    namespace: 'invoices',
                    order: 0,
                    defaultVisible: true,
                    roleVisibility: new Map()
                },
                {
                    itemId: 'expenses',
                    name: 'Expenses',
                    nameAr: 'المصروفات',
                    icon: 'CreditCard',
                    path: '/dashboard/expenses',
                    namespace: 'expenses',
                    order: 1,
                    defaultVisible: true,
                    roleVisibility: new Map()
                },
                {
                    itemId: 'payments',
                    name: 'Payments',
                    nameAr: 'المدفوعات',
                    icon: 'Wallet',
                    path: '/dashboard/payments',
                    namespace: 'payments',
                    order: 2,
                    defaultVisible: true,
                    roleVisibility: new Map()
                },
                {
                    itemId: 'time-tracking',
                    name: 'Time Tracking',
                    nameAr: 'تتبع الوقت',
                    icon: 'Clock',
                    path: '/dashboard/time-tracking',
                    namespace: 'time_tracking',
                    order: 3,
                    defaultVisible: true,
                    roleVisibility: new Map()
                }
            ]
        },
        {
            itemId: 'hr',
            name: 'HR',
            nameAr: 'الموارد البشرية',
            icon: 'Users',
            path: '/dashboard/hr',
            namespace: 'hr',
            order: 7,
            defaultVisible: false,
            roleVisibility: new Map([
                ['owner', true],
                ['admin', true],
                ['partner', true]
            ]),
            children: [
                {
                    itemId: 'employees',
                    name: 'Employees',
                    nameAr: 'الموظفين',
                    icon: 'UserCheck',
                    path: '/dashboard/hr/employees',
                    namespace: 'employees',
                    order: 0,
                    defaultVisible: true,
                    roleVisibility: new Map()
                },
                {
                    itemId: 'payroll',
                    name: 'Payroll',
                    nameAr: 'الرواتب',
                    icon: 'Banknote',
                    path: '/dashboard/hr/payroll',
                    namespace: 'payroll',
                    order: 1,
                    defaultVisible: true,
                    roleVisibility: new Map()
                },
                {
                    itemId: 'leave-requests',
                    name: 'Leave Requests',
                    nameAr: 'طلبات الإجازة',
                    icon: 'CalendarOff',
                    path: '/dashboard/hr/leave-requests',
                    namespace: 'leave_requests',
                    order: 2,
                    defaultVisible: true,
                    roleVisibility: new Map()
                },
                {
                    itemId: 'attendance',
                    name: 'Attendance',
                    nameAr: 'الحضور',
                    icon: 'Clock',
                    path: '/dashboard/hr/attendance',
                    namespace: 'attendance',
                    order: 3,
                    defaultVisible: true,
                    roleVisibility: new Map()
                }
            ]
        },
        {
            itemId: 'reports',
            name: 'Reports',
            nameAr: 'التقارير',
            icon: 'BarChart2',
            path: '/dashboard/reports',
            namespace: 'reports',
            order: 8,
            defaultVisible: true,
            roleVisibility: new Map([
                ['intern', false],
                ['secretary', false]
            ])
        },
        {
            itemId: 'team',
            name: 'Team',
            nameAr: 'الفريق',
            icon: 'UserPlus',
            path: '/dashboard/team',
            namespace: 'team',
            order: 9,
            defaultVisible: false,
            roleVisibility: new Map([
                ['owner', true],
                ['admin', true]
            ])
        },
        {
            itemId: 'settings',
            name: 'Settings',
            nameAr: 'الإعدادات',
            icon: 'Settings',
            path: '/dashboard/settings',
            namespace: 'settings',
            order: 100,
            defaultVisible: false,
            roleVisibility: new Map([
                ['owner', true],
                ['admin', true]
            ])
        }
    ];
}

function getDefaultPageAccess() {
    return [
        // Dashboard - always accessible
        {
            pageId: 'dashboard',
            name: 'Dashboard',
            nameAr: 'لوحة التحكم',
            routePattern: '/dashboard',
            namespace: 'dashboard',
            requiredAction: 'view',
            defaultAccess: true,
            isSystem: true,
            roleAccess: new Map()
        },
        // Cases
        {
            pageId: 'cases',
            name: 'Cases',
            nameAr: 'القضايا',
            routePattern: '/dashboard/cases*',
            namespace: 'cases',
            requiredAction: 'view',
            defaultAccess: true,
            roleAccess: new Map()
        },
        // Clients
        {
            pageId: 'clients',
            name: 'Clients',
            nameAr: 'العملاء',
            routePattern: '/dashboard/clients*',
            namespace: 'clients',
            requiredAction: 'view',
            defaultAccess: true,
            roleAccess: new Map()
        },
        // Tasks
        {
            pageId: 'tasks',
            name: 'Tasks',
            nameAr: 'المهام',
            routePattern: '/dashboard/tasks*',
            namespace: 'tasks',
            requiredAction: 'view',
            defaultAccess: true,
            roleAccess: new Map()
        },
        // Finance
        {
            pageId: 'finance',
            name: 'Finance',
            nameAr: 'المالية',
            routePattern: '/dashboard/finance*',
            namespace: 'finance',
            requiredAction: 'view',
            defaultAccess: true,
            roleAccess: new Map([
                ['intern', false],
                ['secretary', false]
            ]),
            lockScreen: {
                enabled: true,
                title: 'الوصول مقيد',
                titleEn: 'Restricted Access',
                message: 'قسم المالية متاح فقط للموظفين المصرح لهم',
                messageEn: 'Finance section is only available to authorized personnel'
            }
        },
        // Invoices
        {
            pageId: 'invoices',
            name: 'Invoices',
            nameAr: 'الفواتير',
            routePattern: '/dashboard/invoices*',
            namespace: 'invoices',
            requiredAction: 'view',
            defaultAccess: true,
            roleAccess: new Map([
                ['intern', false],
                ['secretary', false]
            ])
        },
        // HR Section
        {
            pageId: 'hr',
            name: 'HR',
            nameAr: 'الموارد البشرية',
            routePattern: '/dashboard/hr*',
            namespace: 'hr',
            requiredAction: 'view',
            defaultAccess: false,
            roleAccess: new Map([
                ['owner', true],
                ['admin', true],
                ['partner', true]
            ]),
            lockScreen: {
                enabled: true,
                title: 'قسم الموارد البشرية',
                titleEn: 'HR Department',
                message: 'هذا القسم متاح فقط للإدارة',
                messageEn: 'This section is only available to management'
            }
        },
        // Reports
        {
            pageId: 'reports',
            name: 'Reports',
            nameAr: 'التقارير',
            routePattern: '/dashboard/reports*',
            namespace: 'reports',
            requiredAction: 'view',
            defaultAccess: true,
            roleAccess: new Map([
                ['intern', false],
                ['secretary', false]
            ])
        },
        // Team Management
        {
            pageId: 'team',
            name: 'Team Management',
            nameAr: 'إدارة الفريق',
            routePattern: '/dashboard/team*',
            namespace: 'team',
            requiredAction: 'manage',
            defaultAccess: false,
            roleAccess: new Map([
                ['owner', true],
                ['admin', true]
            ]),
            lockScreen: {
                enabled: true,
                title: 'إدارة الفريق',
                titleEn: 'Team Management',
                message: 'إدارة الفريق متاحة فقط للمسؤولين',
                messageEn: 'Team management is only available to administrators'
            }
        },
        // Settings
        {
            pageId: 'settings',
            name: 'Settings',
            nameAr: 'الإعدادات',
            routePattern: '/dashboard/settings*',
            namespace: 'settings',
            requiredAction: 'manage',
            defaultAccess: false,
            roleAccess: new Map([
                ['owner', true],
                ['admin', true]
            ]),
            lockScreen: {
                enabled: true,
                title: 'الإعدادات',
                titleEn: 'Settings',
                message: 'الإعدادات متاحة فقط للمسؤولين',
                messageEn: 'Settings are only available to administrators'
            }
        },
        // Permissions
        {
            pageId: 'permissions',
            name: 'Permissions',
            nameAr: 'الصلاحيات',
            routePattern: '/dashboard/settings/permissions*',
            namespace: 'permissions',
            requiredAction: 'manage',
            defaultAccess: false,
            roleAccess: new Map([
                ['owner', true]
            ]),
            lockScreen: {
                enabled: true,
                title: 'إدارة الصلاحيات',
                titleEn: 'Permission Management',
                message: 'إدارة الصلاحيات متاحة فقط لمالك المكتب',
                messageEn: 'Permission management is only available to the firm owner'
            }
        }
    ];
}

const UIAccessConfig = mongoose.model('UIAccessConfig', uiAccessConfigSchema);

module.exports = UIAccessConfig;
