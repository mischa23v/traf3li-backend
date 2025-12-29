/**
 * Approval Rule Model - Configurable Approval Workflow System
 *
 * Implements enterprise-grade approval workflows similar to Salesforce/SAP.
 * Allows firms to define rules for actions that require approval.
 */

const mongoose = require('mongoose');

// Individual approval rule sub-schema
const ruleSchema = new mongoose.Schema({
    // Which module this rule applies to
    module: {
        type: String,
        required: true,
        enum: ['cases', 'clients', 'finance', 'invoices', 'payments', 'expenses', 'documents', 'tasks', 'staff', 'settings', 'reports']
    },

    // Specific action that requires approval
    action: {
        type: String,
        required: true,
        enum: [
            // CRUD actions
            'create', 'update', 'delete',
            // Finance-specific
            'approve_invoice', 'refund_payment', 'write_off',
            // Staff-specific
            'invite_member', 'remove_member', 'change_role', 'update_permissions',
            // Document-specific
            'share_external', 'delete_permanent',
            // Case-specific
            'close_case', 'reopen_case', 'assign_case',
            // Client-specific
            'delete_client', 'merge_clients',
            // Expense-specific
            'approve_expense', 'reimburse_expense'
        ]
    },

    // Is this rule active?
    isActive: {
        type: Boolean,
        default: true
    },

    // Threshold amount (for financial approvals)
    thresholdAmount: {
        type: Number,
        default: null  // null means applies to all amounts
    },
    thresholdCurrency: {
        type: String,
        default: 'SAR'
    },

    // Who can approve this action
    approvers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Roles that can approve (alternative to specific users)
    approverRoles: [{
        type: String,
        enum: ['owner', 'admin', 'partner', 'senior_lawyer', 'accountant']
    }],

    // How many approvals are needed (for multi-level approval)
    minApprovals: {
        type: Number,
        default: 1,
        min: 1
    },

    // Auto-approve after hours (0 = never auto-approve)
    autoApproveAfterHours: {
        type: Number,
        default: 0,
        min: 0
    },

    // Escalation settings
    escalation: {
        enabled: { type: Boolean, default: false },
        afterHours: { type: Number, default: 24 },
        escalateTo: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },

    // Notification settings
    notifications: {
        notifyApprovers: { type: Boolean, default: true },
        notifyRequester: { type: Boolean, default: true },
        notifyOnApproval: { type: Boolean, default: true },
        notifyOnRejection: { type: Boolean, default: true }
    },

    // Custom conditions (JSON Logic format for advanced rules)
    conditions: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    // Description for clarity
    description: {
        type: String,
        maxlength: 500
    }
}, { _id: true });

const approvalRuleSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true,
        unique: true  // One rule set per firm
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // APPROVAL RULES
    // ═══════════════════════════════════════════════════════════════
    rules: [ruleSchema],

    // ═══════════════════════════════════════════════════════════════
    // GLOBAL SETTINGS
    // ═══════════════════════════════════════════════════════════════
    settings: {
        // Enable/disable entire approval system
        enabled: {
            type: Boolean,
            default: false
        },

        // Default behavior when no rule matches
        defaultRequiresApproval: {
            type: Boolean,
            default: false
        },

        // Allow self-approval for owners
        ownerCanSelfApprove: {
            type: Boolean,
            default: true
        },

        // Allow requesters to cancel pending approvals
        requesterCanCancel: {
            type: Boolean,
            default: true
        },

        // Reminder settings
        reminderIntervalHours: {
            type: Number,
            default: 24
        },
        maxReminders: {
            type: Number,
            default: 3
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
approvalRuleSchema.index({ 'rules.module': 1, 'rules.action': 1 });
approvalRuleSchema.index({ 'rules.isActive': 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get approval rules for a firm
 */
approvalRuleSchema.statics.getForFirm = async function(firmId) {
    let rules = await this.findOne({ firmId }).lean();

    if (!rules) {
        // Return default settings if no rules configured
        return {
            firmId,
            rules: [],
            settings: {
                enabled: false,
                defaultRequiresApproval: false,
                ownerCanSelfApprove: true,
                requesterCanCancel: true,
                reminderIntervalHours: 24,
                maxReminders: 3
            }
        };
    }

    return rules;
};

/**
 * Check if an action requires approval
 */
approvalRuleSchema.statics.requiresApproval = async function(firmId, module, action, context = {}) {
    const ruleSet = await this.findOne({ firmId }).lean();

    if (!ruleSet || !ruleSet.settings?.enabled) {
        return { requiresApproval: false };
    }

    // Find matching rule
    const matchingRule = ruleSet.rules.find(rule =>
        rule.isActive &&
        rule.module === module &&
        rule.action === action
    );

    if (!matchingRule) {
        return {
            requiresApproval: ruleSet.settings.defaultRequiresApproval,
            rule: null
        };
    }

    // Check threshold if applicable
    if (matchingRule.thresholdAmount !== null && context.amount !== undefined) {
        if (context.amount < matchingRule.thresholdAmount) {
            return { requiresApproval: false, rule: matchingRule };
        }
    }

    return {
        requiresApproval: true,
        rule: matchingRule,
        approvers: matchingRule.approvers,
        approverRoles: matchingRule.approverRoles,
        minApprovals: matchingRule.minApprovals
    };
};

/**
 * Create or update approval rules for a firm
 */
approvalRuleSchema.statics.upsertRules = async function(firmId, data, userId) {
    const existing = await this.findOne({ firmId });

    if (existing) {
        Object.assign(existing, data);
        existing.updatedBy = userId;
        await existing.save();
        return existing;
    }

    return this.create({
        firmId,
        ...data,
        createdBy: userId
    });
};

/**
 * Add a new rule to existing rules
 */
approvalRuleSchema.statics.addRule = async function(firmId, rule, userId) {
    return this.findOneAndUpdate(
        { firmId },
        {
            $push: { rules: rule },
            $set: { updatedBy: userId }
        },
        { new: true, upsert: true }
    );
};

/**
 * Update a specific rule
 */
approvalRuleSchema.statics.updateRule = async function(firmId, ruleId, updates, userId) {
    return this.findOneAndUpdate(
        { firmId, 'rules._id': ruleId },
        {
            $set: {
                ...Object.fromEntries(
                    Object.entries(updates).map(([key, value]) => [`rules.$.${key}`, value])
                ),
                updatedBy: userId
            }
        },
        { new: true }
    );
};

/**
 * Delete a specific rule
 */
approvalRuleSchema.statics.deleteRule = async function(firmId, ruleId, userId) {
    return this.findOneAndUpdate(
        { firmId },
        {
            $pull: { rules: { _id: ruleId } },
            $set: { updatedBy: userId }
        },
        { new: true }
    );
};

/**
 * Get default rule templates
 */
approvalRuleSchema.statics.getDefaultTemplates = function() {
    return [
        {
            name: 'High Value Invoice Approval',
            module: 'invoices',
            action: 'approve_invoice',
            thresholdAmount: 100000, // 1000 SAR in halalas
            approverRoles: ['owner', 'admin', 'partner'],
            minApprovals: 1,
            description: 'Require approval for invoices over 1000 SAR'
        },
        {
            name: 'Staff Removal Approval',
            module: 'staff',
            action: 'remove_member',
            approverRoles: ['owner', 'admin'],
            minApprovals: 1,
            description: 'Require admin approval to remove team members'
        },
        {
            name: 'Permission Change Approval',
            module: 'staff',
            action: 'update_permissions',
            approverRoles: ['owner'],
            minApprovals: 1,
            description: 'Only owner can approve permission changes'
        },
        {
            name: 'Expense Approval',
            module: 'expenses',
            action: 'approve_expense',
            thresholdAmount: 50000, // 500 SAR in halalas
            approverRoles: ['owner', 'admin', 'partner', 'accountant'],
            minApprovals: 1,
            description: 'Require approval for expenses over 500 SAR'
        },
        {
            name: 'Case Closure Approval',
            module: 'cases',
            action: 'close_case',
            approverRoles: ['owner', 'admin', 'partner'],
            minApprovals: 1,
            description: 'Require partner approval to close cases'
        }
    ];
};

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);
