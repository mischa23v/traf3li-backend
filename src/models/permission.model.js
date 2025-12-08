/**
 * Permission Model - Enterprise Authorization System
 *
 * Inspired by:
 * - Casbin: PERM metamodel (Policy, Effect, Request, Matchers)
 * - Ory Keto/Zanzibar: Relation tuples, namespaces, reverse lookups
 * - Keycloak: Resources, scopes, decision strategies
 * - OPA: Structured policy decisions
 *
 * This model defines permission policies with support for:
 * - RBAC (Role-Based Access Control)
 * - ABAC (Attribute-Based Access Control)
 * - ReBAC (Relationship-Based Access Control)
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// PERMISSION POLICY SCHEMA (Casbin PERM Model)
// ═══════════════════════════════════════════════════════════════

const conditionSchema = new mongoose.Schema({
    field: { type: String, required: true },      // e.g., 'amount', 'status', 'department'
    operator: {
        type: String,
        enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'regex', 'exists'],
        required: true
    },
    value: mongoose.Schema.Types.Mixed,           // The value to compare against
    valueType: {
        type: String,
        enum: ['static', 'context', 'subject', 'resource'],
        default: 'static'
    }
}, { _id: false });

const policySchema = new mongoose.Schema({
    // Policy identification
    policyId: { type: String, required: true },
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    descriptionAr: String,

    // Policy type (Casbin model types)
    policyType: {
        type: String,
        enum: ['p', 'g', 'g2', 'g3'],  // p=policy, g=role grouping, g2=resource role, g3=domain
        default: 'p'
    },

    // Subject (who is making the request)
    subject: {
        type: { type: String, enum: ['user', 'role', 'group', 'any'], default: 'role' },
        value: String,                              // role name, user id, or group id
        conditions: [conditionSchema]               // ABAC conditions on subject
    },

    // Resource (what is being accessed) - Keycloak style
    resource: {
        namespace: { type: String, required: true },  // e.g., 'cases', 'clients', 'invoices'
        type: String,                                  // e.g., 'case', 'client', 'invoice'
        id: String,                                    // specific resource id (optional)
        conditions: [conditionSchema]                  // ABAC conditions on resource
    },

    // Action/Scope (what operation) - Keycloak scopes
    action: {
        type: String,
        enum: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'assign', 'manage', '*'],
        required: true
    },

    // Effect (allow or deny) - Casbin effect
    effect: {
        type: String,
        enum: ['allow', 'deny'],
        default: 'allow'
    },

    // Priority (for conflict resolution) - lower number = higher priority
    priority: { type: Number, default: 100 },

    // Context conditions (ABAC) - evaluated at runtime
    contextConditions: [conditionSchema],

    // Time-based conditions
    timeConstraints: {
        validFrom: Date,
        validUntil: Date,
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],  // 0=Sunday
        hoursFrom: { type: Number, min: 0, max: 23 },
        hoursTo: { type: Number, min: 0, max: 23 }
    },

    // Metadata
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },        // System policies can't be deleted
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, _id: false });

// ═══════════════════════════════════════════════════════════════
// PERMISSION CONFIGURATION SCHEMA
// ═══════════════════════════════════════════════════════════════

const permissionConfigSchema = new mongoose.Schema({
    // Firm-specific configuration
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true
    },

    // Decision strategy (Keycloak-inspired)
    decisionStrategy: {
        type: String,
        enum: [
            'unanimous',      // All policies must allow
            'affirmative',    // At least one policy must allow (default)
            'consensus'       // Majority must allow
        ],
        default: 'affirmative'
    },

    // Deny override (explicit deny takes precedence)
    denyOverride: { type: Boolean, default: true },

    // Policies for this firm
    policies: [policySchema],

    // Role hierarchy (Casbin RBAC with domains)
    roleHierarchy: [{
        role: { type: String, required: true },
        inheritsFrom: [String],      // Roles this role inherits from
        level: { type: Number, default: 0 }  // Hierarchy level for ordering
    }],

    // Resource role assignments (Casbin g2)
    resourceRoles: [{
        resourceType: { type: String, required: true },
        resourceId: { type: mongoose.Schema.Types.ObjectId },
        role: { type: String, required: true },
        subject: {
            type: { type: String, enum: ['user', 'role'] },
            id: String
        }
    }],

    // Namespace definitions (Keto-inspired)
    namespaces: [{
        name: { type: String, required: true },
        displayName: String,
        displayNameAr: String,
        relations: [{
            name: { type: String, required: true },
            directlyRelated: [String],    // What types can be directly related
            computedUserset: String       // Computed from another relation
        }]
    }],

    // Default policies applied when no specific policy matches
    defaultEffect: {
        type: String,
        enum: ['allow', 'deny'],
        default: 'deny'
    },

    // Audit settings
    auditSettings: {
        logAllDecisions: { type: Boolean, default: true },
        logDeniedOnly: { type: Boolean, default: false },
        retentionDays: { type: Number, default: 90 }
    },

    // Cache settings
    cacheSettings: {
        enabled: { type: Boolean, default: true },
        ttlSeconds: { type: Number, default: 300 }
    },

    // Metadata
    version: { type: Number, default: 1 },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

permissionConfigSchema.index({ firmId: 1 });
permissionConfigSchema.index({ 'policies.policyId': 1 });
permissionConfigSchema.index({ 'policies.resource.namespace': 1 });
permissionConfigSchema.index({ 'policies.isActive': 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get permission configuration for a firm
 */
permissionConfigSchema.statics.getForFirm = async function(firmId) {
    let config = await this.findOne({ firmId }).lean();

    if (!config) {
        // Create default configuration
        config = await this.create({
            firmId,
            policies: getDefaultPolicies(),
            roleHierarchy: getDefaultRoleHierarchy(),
            namespaces: getDefaultNamespaces()
        });
        config = config.toObject();
    }

    return config;
};

/**
 * Add or update a policy
 */
permissionConfigSchema.statics.upsertPolicy = async function(firmId, policy, userId) {
    const config = await this.findOne({ firmId });

    if (!config) {
        throw new Error('Permission configuration not found');
    }

    const existingIndex = config.policies.findIndex(p => p.policyId === policy.policyId);

    if (existingIndex >= 0) {
        // Update existing policy
        if (config.policies[existingIndex].isSystem) {
            throw new Error('Cannot modify system policy');
        }
        config.policies[existingIndex] = { ...config.policies[existingIndex], ...policy };
    } else {
        // Add new policy
        config.policies.push({
            ...policy,
            policyId: policy.policyId || `policy_${Date.now()}`
        });
    }

    config.version += 1;
    config.lastModifiedBy = userId;
    await config.save();

    return config;
};

/**
 * Delete a policy
 */
permissionConfigSchema.statics.deletePolicy = async function(firmId, policyId, userId) {
    const config = await this.findOne({ firmId });

    if (!config) {
        throw new Error('Permission configuration not found');
    }

    const policy = config.policies.find(p => p.policyId === policyId);
    if (policy?.isSystem) {
        throw new Error('Cannot delete system policy');
    }

    config.policies = config.policies.filter(p => p.policyId !== policyId);
    config.version += 1;
    config.lastModifiedBy = userId;
    await config.save();

    return config;
};

/**
 * Get effective roles for a user (including inherited roles)
 */
permissionConfigSchema.statics.getEffectiveRoles = async function(firmId, userRole) {
    const config = await this.findOne({ firmId }).lean();

    if (!config) {
        return [userRole];
    }

    const roles = new Set([userRole]);
    const hierarchy = config.roleHierarchy || [];

    const addInheritedRoles = (role) => {
        const roleConfig = hierarchy.find(r => r.role === role);
        if (roleConfig?.inheritsFrom) {
            roleConfig.inheritsFrom.forEach(inheritedRole => {
                if (!roles.has(inheritedRole)) {
                    roles.add(inheritedRole);
                    addInheritedRoles(inheritedRole);
                }
            });
        }
    };

    addInheritedRoles(userRole);
    return Array.from(roles);
};

/**
 * Get policies matching a request
 */
permissionConfigSchema.statics.getMatchingPolicies = async function(firmId, request) {
    const config = await this.findOne({ firmId }).lean();

    if (!config) {
        return [];
    }

    const { subject, resource, action } = request;
    const effectiveRoles = await this.getEffectiveRoles(firmId, subject.role);

    return config.policies.filter(policy => {
        if (!policy.isActive) return false;

        // Check subject match
        const subjectMatch =
            policy.subject.type === 'any' ||
            (policy.subject.type === 'user' && policy.subject.value === subject.userId) ||
            (policy.subject.type === 'role' && effectiveRoles.includes(policy.subject.value));

        if (!subjectMatch) return false;

        // Check resource match
        const resourceMatch =
            policy.resource.namespace === resource.namespace &&
            (!policy.resource.id || policy.resource.id === resource.id);

        if (!resourceMatch) return false;

        // Check action match
        const actionMatch = policy.action === '*' || policy.action === action;

        if (!actionMatch) return false;

        // Check time constraints
        if (policy.timeConstraints?.validFrom || policy.timeConstraints?.validUntil) {
            const now = new Date();
            if (policy.timeConstraints.validFrom && now < policy.timeConstraints.validFrom) return false;
            if (policy.timeConstraints.validUntil && now > policy.timeConstraints.validUntil) return false;
        }

        return true;
    }).sort((a, b) => a.priority - b.priority);
};

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

function getDefaultPolicies() {
    return [
        // Owner has full access
        {
            policyId: 'owner_full_access',
            name: 'Owner Full Access',
            nameAr: 'صلاحيات كاملة للمالك',
            policyType: 'p',
            subject: { type: 'role', value: 'owner' },
            resource: { namespace: '*' },
            action: '*',
            effect: 'allow',
            priority: 1,
            isActive: true,
            isSystem: true
        },
        // Admin has manage access
        {
            policyId: 'admin_manage_access',
            name: 'Admin Management Access',
            nameAr: 'صلاحيات إدارية للمسؤول',
            policyType: 'p',
            subject: { type: 'role', value: 'admin' },
            resource: { namespace: '*' },
            action: 'manage',
            effect: 'allow',
            priority: 10,
            isActive: true,
            isSystem: true
        },
        // Partner access
        {
            policyId: 'partner_cases_access',
            name: 'Partner Cases Access',
            nameAr: 'صلاحيات القضايا للشريك',
            policyType: 'p',
            subject: { type: 'role', value: 'partner' },
            resource: { namespace: 'cases' },
            action: '*',
            effect: 'allow',
            priority: 20,
            isActive: true,
            isSystem: true
        },
        // Lawyer basic access
        {
            policyId: 'lawyer_view_cases',
            name: 'Lawyer View Cases',
            nameAr: 'عرض القضايا للمحامي',
            policyType: 'p',
            subject: { type: 'role', value: 'lawyer' },
            resource: { namespace: 'cases' },
            action: 'view',
            effect: 'allow',
            priority: 30,
            isActive: true,
            isSystem: true
        },
        {
            policyId: 'lawyer_edit_cases',
            name: 'Lawyer Edit Assigned Cases',
            nameAr: 'تعديل القضايا المسندة للمحامي',
            policyType: 'p',
            subject: { type: 'role', value: 'lawyer' },
            resource: { namespace: 'cases' },
            action: 'edit',
            effect: 'allow',
            priority: 30,
            isActive: true,
            isSystem: true,
            contextConditions: [{
                field: 'resource.assignedTo',
                operator: 'contains',
                value: 'subject.userId',
                valueType: 'subject'
            }]
        },
        // Deny departed users
        {
            policyId: 'deny_departed',
            name: 'Deny Departed Users',
            nameAr: 'حظر المستخدمين المغادرين',
            policyType: 'p',
            subject: { type: 'any', conditions: [{ field: 'status', operator: 'eq', value: 'departed' }] },
            resource: { namespace: '*' },
            action: '*',
            effect: 'deny',
            priority: 0,
            isActive: true,
            isSystem: true
        }
    ];
}

function getDefaultRoleHierarchy() {
    return [
        { role: 'owner', inheritsFrom: ['admin'], level: 0 },
        { role: 'admin', inheritsFrom: ['partner'], level: 1 },
        { role: 'partner', inheritsFrom: ['senior_lawyer'], level: 2 },
        { role: 'senior_lawyer', inheritsFrom: ['lawyer'], level: 3 },
        { role: 'lawyer', inheritsFrom: ['paralegal'], level: 4 },
        { role: 'paralegal', inheritsFrom: ['secretary'], level: 5 },
        { role: 'secretary', inheritsFrom: [], level: 6 },
        { role: 'accountant', inheritsFrom: [], level: 5 },
        { role: 'intern', inheritsFrom: [], level: 7 }
    ];
}

function getDefaultNamespaces() {
    return [
        {
            name: 'cases',
            displayName: 'Cases',
            displayNameAr: 'القضايا',
            relations: [
                { name: 'owner', directlyRelated: ['user'] },
                { name: 'assignee', directlyRelated: ['user'] },
                { name: 'viewer', directlyRelated: ['user', 'role'], computedUserset: 'assignee' }
            ]
        },
        {
            name: 'clients',
            displayName: 'Clients',
            displayNameAr: 'العملاء',
            relations: [
                { name: 'owner', directlyRelated: ['user'] },
                { name: 'manager', directlyRelated: ['user'] },
                { name: 'viewer', computedUserset: 'manager' }
            ]
        },
        {
            name: 'invoices',
            displayName: 'Invoices',
            displayNameAr: 'الفواتير',
            relations: [
                { name: 'owner', directlyRelated: ['user'] },
                { name: 'approver', directlyRelated: ['user', 'role'] },
                { name: 'viewer', directlyRelated: ['user', 'role'] }
            ]
        },
        {
            name: 'documents',
            displayName: 'Documents',
            displayNameAr: 'المستندات',
            relations: [
                { name: 'owner', directlyRelated: ['user'] },
                { name: 'editor', directlyRelated: ['user'] },
                { name: 'viewer', directlyRelated: ['user', 'role'], computedUserset: 'editor' }
            ]
        },
        {
            name: 'team',
            displayName: 'Team',
            displayNameAr: 'الفريق',
            relations: [
                { name: 'admin', directlyRelated: ['user', 'role'] },
                { name: 'member', directlyRelated: ['user'] }
            ]
        },
        {
            name: 'settings',
            displayName: 'Settings',
            displayNameAr: 'الإعدادات',
            relations: [
                { name: 'admin', directlyRelated: ['role'] }
            ]
        },
        {
            name: 'reports',
            displayName: 'Reports',
            displayNameAr: 'التقارير',
            relations: [
                { name: 'viewer', directlyRelated: ['user', 'role'] },
                { name: 'exporter', directlyRelated: ['user', 'role'] }
            ]
        }
    ];
}

const PermissionConfig = mongoose.model('PermissionConfig', permissionConfigSchema);

module.exports = PermissionConfig;
