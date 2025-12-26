/**
 * FirmMember Model
 *
 * Simplified model for firm membership.
 * Stores role + optional permission overrides.
 * Base permissions come from role defaults in permissions.config.js
 *
 * This replaces the complex firm.members[] array structure.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ROLES = ['owner', 'admin', 'partner', 'lawyer', 'paralegal', 'secretary', 'accountant', 'departed'];
const STATUSES = ['active', 'departed', 'suspended', 'pending'];
const PERMISSION_LEVELS = ['none', 'view', 'edit', 'full'];

/**
 * Permission overrides schema
 * Only store values that DIFFER from role defaults
 * null = use role default
 */
const permissionOverridesSchema = new Schema({
    // Module permissions (only if different from role default)
    clients: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    cases: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    leads: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    invoices: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    payments: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    expenses: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    documents: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    tasks: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    events: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    timeTracking: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    reports: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    settings: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    team: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },
    hr: { type: String, enum: [...PERMISSION_LEVELS, null], default: null },

    // Special permissions (only if different from role default)
    canApproveInvoices: { type: Boolean, default: null },
    canManageRetainers: { type: Boolean, default: null },
    canExportData: { type: Boolean, default: null },
    canDeleteRecords: { type: Boolean, default: null },
    canViewFinance: { type: Boolean, default: null },
    canManageTeam: { type: Boolean, default: null },
    canAccessHR: { type: Boolean, default: null }
}, { _id: false });

/**
 * Resource-specific permissions
 * For per-case or per-client access control
 */
const resourcePermissionSchema = new Schema({
    resourceType: {
        type: String,
        enum: ['case', 'client', 'project'],
        required: true
    },
    resourceId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    access: {
        type: String,
        enum: PERMISSION_LEVELS,
        required: true
    },
    grantedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    grantedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date
    },
    reason: {
        type: String,
        maxlength: 500
    }
}, { _id: true });

/**
 * Main FirmMember schema
 */
const firmMemberSchema = new Schema({
    // Core fields
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ROLES,
        required: true,
        default: 'lawyer'
    },
    status: {
        type: String,
        enum: STATUSES,
        default: 'active',
        index: true
    },

    // Permission overrides (null = use role default)
    permissionOverrides: {
        type: permissionOverridesSchema,
        default: () => ({})
    },

    // Per-resource permissions (for specific case/client access)
    resourcePermissions: {
        type: [resourcePermissionSchema],
        default: []
    },

    // Employment info
    department: {
        type: String,
        maxlength: 100
    },
    title: {
        type: String,
        maxlength: 100
    },
    reportsTo: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    // Timestamps
    joinedAt: {
        type: Date,
        default: Date.now
    },
    departedAt: {
        type: Date
    },
    departureReason: {
        type: String,
        maxlength: 500
    },

    // For departed users: cases they can still access
    assignedCases: [{
        type: Schema.Types.ObjectId,
        ref: 'Case'
    }],

    // Previous role (for reinstatement)
    previousRole: {
        type: String,
        enum: [...ROLES, null]
    },

    // Audit
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    collection: 'firmmembers'
});

// Indexes
firmMemberSchema.index({ userId: 1, firmId: 1 }, { unique: true });
firmMemberSchema.index({ firmId: 1, role: 1 });
firmMemberSchema.index({ firmId: 1, status: 1 });
firmMemberSchema.index({ 'resourcePermissions.resourceId': 1 });

/**
 * Get effective permissions (role defaults + overrides)
 */
firmMemberSchema.methods.getEffectivePermissions = function() {
    const { getDefaultPermissions } = require('../config/permissions.config');
    const defaults = getDefaultPermissions(this.role);

    const modules = {};
    const special = {};

    // Merge module permissions
    const moduleKeys = ['clients', 'cases', 'leads', 'invoices', 'payments', 'expenses',
        'documents', 'tasks', 'events', 'timeTracking', 'reports', 'settings', 'team', 'hr'];

    for (const key of moduleKeys) {
        const override = this.permissionOverrides?.[key];
        modules[key] = override !== null && override !== undefined
            ? override
            : defaults.modules?.[key] || 'none';
    }

    // Merge special permissions
    const specialKeys = ['canApproveInvoices', 'canManageRetainers', 'canExportData',
        'canDeleteRecords', 'canViewFinance', 'canManageTeam', 'canAccessHR'];

    for (const key of specialKeys) {
        const override = this.permissionOverrides?.[key];
        special[key] = override !== null && override !== undefined
            ? override
            : defaults.special?.[key] || false;
    }

    return { modules, special };
};

/**
 * Check if member has permission for module
 */
firmMemberSchema.methods.hasPermission = function(module, requiredLevel = 'view') {
    const { LEVEL_VALUES } = require('../config/permissions.config');
    const perms = this.getEffectivePermissions();
    const userLevel = perms.modules[module];

    if (!userLevel) return false;

    const userValue = LEVEL_VALUES[userLevel] || 0;
    const requiredValue = LEVEL_VALUES[requiredLevel] || 0;

    return userValue >= requiredValue;
};

/**
 * Check if member has special permission
 */
firmMemberSchema.methods.hasSpecialPermission = function(permission) {
    const perms = this.getEffectivePermissions();
    return perms.special[permission] === true;
};

/**
 * Check if member can access specific resource
 */
firmMemberSchema.methods.canAccessResource = function(resourceType, resourceId, requiredAccess = 'view') {
    const { LEVEL_VALUES } = require('../config/permissions.config');

    // Find specific permission for this resource
    const resourcePerm = this.resourcePermissions?.find(
        rp => rp.resourceType === resourceType &&
            rp.resourceId.toString() === resourceId.toString() &&
            (!rp.expiresAt || rp.expiresAt > new Date())
    );

    if (resourcePerm) {
        const userValue = LEVEL_VALUES[resourcePerm.access] || 0;
        const requiredValue = LEVEL_VALUES[requiredAccess] || 0;
        return userValue >= requiredValue;
    }

    // Fall back to module-level permission
    // Map resource type to module name
    const moduleMap = { case: 'cases', client: 'clients', project: 'cases' };
    const module = moduleMap[resourceType] || resourceType + 's';
    return this.hasPermission(module, requiredAccess);
};

/**
 * Grant access to specific resource
 */
firmMemberSchema.methods.grantResourceAccess = function(resourceType, resourceId, access, grantedBy, options = {}) {
    // Remove existing permission for this resource
    this.resourcePermissions = this.resourcePermissions.filter(
        rp => !(rp.resourceType === resourceType && rp.resourceId.toString() === resourceId.toString())
    );

    // Add new permission
    this.resourcePermissions.push({
        resourceType,
        resourceId,
        access,
        grantedBy,
        grantedAt: new Date(),
        expiresAt: options.expiresAt,
        reason: options.reason
    });

    return this;
};

/**
 * Revoke access to specific resource
 */
firmMemberSchema.methods.revokeResourceAccess = function(resourceType, resourceId) {
    this.resourcePermissions = this.resourcePermissions.filter(
        rp => !(rp.resourceType === resourceType && rp.resourceId.toString() === resourceId.toString())
    );
    return this;
};

/**
 * Set permission override
 */
firmMemberSchema.methods.setPermissionOverride = function(key, value) {
    if (!this.permissionOverrides) {
        this.permissionOverrides = {};
    }
    this.permissionOverrides[key] = value;
    this.markModified('permissionOverrides');
    return this;
};

/**
 * Clear permission override (revert to role default)
 */
firmMemberSchema.methods.clearPermissionOverride = function(key) {
    if (this.permissionOverrides) {
        this.permissionOverrides[key] = null;
        this.markModified('permissionOverrides');
    }
    return this;
};

/**
 * Process departure (change to departed status)
 */
firmMemberSchema.methods.processDepature = async function(processedBy, reason) {
    this.previousRole = this.role;
    this.role = 'departed';
    this.status = 'departed';
    this.departedAt = new Date();
    this.departureReason = reason;
    this.updatedBy = processedBy;

    // Get assigned cases for read-only access
    const Case = mongoose.model('Case');
    const assignedCases = await Case.find({
        firmId: this.firmId,
        $or: [
            { assignedTo: this.userId },
            { lawyerId: this.userId },
            { 'team.userId': this.userId }
        ]
    }).select('_id').lean();

    this.assignedCases = assignedCases.map(c => c._id);

    return this;
};

/**
 * Reinstate departed member
 */
firmMemberSchema.methods.reinstate = function(newRole, reinstatedBy) {
    const roleToAssign = newRole || this.previousRole || 'lawyer';

    this.role = roleToAssign;
    this.status = 'active';
    this.departedAt = null;
    this.departureReason = null;
    this.previousRole = null;
    this.assignedCases = [];
    this.permissionOverrides = {};
    this.updatedBy = reinstatedBy;

    return this;
};

// Static methods

/**
 * Find member by user and firm
 */
firmMemberSchema.statics.findByUserAndFirm = function(userId, firmId) {
    return this.findOne({ userId, firmId });
};

/**
 * Find all members of a firm
 */
firmMemberSchema.statics.findByFirm = function(firmId, options = {}) {
    const query = this.find({ firmId });

    if (options.status) {
        query.where('status').equals(options.status);
    }
    if (options.role) {
        query.where('role').equals(options.role);
    }
    if (options.populate) {
        query.populate('userId', 'firstName lastName email image');
    }

    return query;
};

/**
 * Find all firms a user belongs to
 */
firmMemberSchema.statics.findByUser = function(userId) {
    return this.find({ userId }).populate('firmId', 'name nameEnglish');
};

/**
 * Check if user is member of firm
 */
firmMemberSchema.statics.isMember = async function(userId, firmId) {
    const count = await this.countDocuments({
        userId,
        firmId,
        status: { $in: ['active', 'pending'] }
    });
    return count > 0;
};

/**
 * Get member count for a firm
 */
firmMemberSchema.statics.getMemberCount = function(firmId, status = 'active') {
    return this.countDocuments({ firmId, status });
};

const FirmMember = mongoose.model('FirmMember', firmMemberSchema);

module.exports = FirmMember;
