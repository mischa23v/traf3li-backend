/**
 * Approval Chain Model - Reusable Approval Chain Templates
 *
 * Defines reusable approval chain templates that can be applied to different
 * entity types. Each chain defines a sequence of approvers and approval rules.
 *
 * Security: Multi-tenant isolation via firmId
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// APPROVAL STEP SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════

const approvalStepSchema = new mongoose.Schema({
    order: {
        type: Number,
        required: true,
        min: 1
    },
    name: {
        type: String,
        required: true,
        maxlength: 100,
        trim: true
    },
    // Type of approver resolution
    approverType: {
        type: String,
        enum: ['specific', 'role', 'manager', 'dynamic', 'requester_manager'],
        default: 'specific',
        required: true
    },
    // Specific user IDs (for approverType: 'specific')
    approverIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Role name (for approverType: 'role')
    role: {
        type: String
    },
    // Dynamic field path (for approverType: 'dynamic')
    dynamicField: {
        type: String
    },
    // Approval requirement
    requirementType: {
        type: String,
        enum: ['any', 'all', 'majority', 'count'],
        default: 'any'
    },
    // Required count (for requirementType: 'count')
    requiredCount: {
        type: Number,
        min: 1,
        default: 1
    },
    // Allow delegation
    allowDelegation: {
        type: Boolean,
        default: true
    },
    // Auto-skip conditions
    skipConditions: {
        type: mongoose.Schema.Types.Mixed
    },
    // Timeout in hours
    timeoutHours: {
        type: Number,
        min: 0,
        default: 48
    }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// APPROVAL CHAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const approvalChainSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CHAIN CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        maxlength: 200,
        trim: true
    },
    description: {
        type: String,
        maxlength: 1000
    },

    // Entity types this chain applies to
    entityTypes: [{
        type: String,
        required: true
    }],

    // Approval steps in order
    steps: {
        type: [approvalStepSchema],
        required: true,
        validate: {
            validator: function(steps) {
                return steps && steps.length > 0;
            },
            message: 'At least one approval step is required'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CHAIN BEHAVIOR
    // ═══════════════════════════════════════════════════════════════

    // Can approvers see pending approvals ahead of them
    allowFutureApproval: {
        type: Boolean,
        default: false
    },

    // Prevent self-approval
    preventSelfApproval: {
        type: Boolean,
        default: true
    },

    // Auto-escalation settings
    escalation: {
        enabled: {
            type: Boolean,
            default: false
        },
        afterHours: {
            type: Number,
            default: 48
        },
        escalateTo: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },

    // Notification settings
    notifications: {
        notifyOnRequest: {
            type: Boolean,
            default: true
        },
        notifyOnApproval: {
            type: Boolean,
            default: true
        },
        notifyOnRejection: {
            type: Boolean,
            default: true
        },
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
    // STATUS & METADATA
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            delete ret.__v;
            return ret;
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
approvalChainSchema.index({ firmId: 1, isActive: 1, entityTypes: 1 });
approvalChainSchema.index({ firmId: 1, lawyerId: 1 });
approvalChainSchema.index({ firmId: 1, isDefault: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

approvalChainSchema.pre('save', function(next) {
    // Sort steps by order
    if (this.steps && this.steps.length > 0) {
        this.steps.sort((a, b) => a.order - b.order);
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active chains for entity type
 */
approvalChainSchema.statics.getForEntityType = async function(firmId, entityType) {
    return this.find({
        firmId,
        entityTypes: entityType,
        isActive: true
    })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();
};

/**
 * Get default chain for entity type
 */
approvalChainSchema.statics.getDefaultChain = async function(firmId, entityType) {
    return this.findOne({
        firmId,
        entityTypes: entityType,
        isActive: true,
        isDefault: true
    }).lean();
};

module.exports = mongoose.model('ApprovalChain', approvalChainSchema);
