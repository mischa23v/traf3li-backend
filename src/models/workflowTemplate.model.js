const mongoose = require('mongoose');

/**
 * Step Configuration Schema
 * Defines individual workflow steps
 */
const stepConfigSchema = new mongoose.Schema({
    order: {
        type: Number,
        required: true,
        min: 0
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        maxlength: 1000
    },
    type: {
        type: String,
        enum: ['task', 'approval', 'notification', 'delay', 'condition', 'action', 'form'],
        required: true
    },
    // Configuration based on step type
    config: {
        // For task steps
        assigneeType: {
            type: String,
            enum: ['owner', 'role', 'specific', 'round_robin', 'auto']
        },
        assigneeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        assigneeRole: String,
        taskPriority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        dueInDays: Number,
        dueInHours: Number,

        // For approval steps
        approverType: {
            type: String,
            enum: ['owner', 'manager', 'role', 'specific', 'sequential', 'parallel']
        },
        approverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        approverRole: String,
        approvalRequired: {
            type: Boolean,
            default: true
        },
        multipleApprovers: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            order: Number
        }],

        // For notification steps
        notificationType: {
            type: String,
            enum: ['email', 'in_app', 'sms', 'webhook']
        },
        recipients: [{
            type: String,
            enum: ['owner', 'assignee', 'manager', 'role', 'specific']
        }],
        recipientIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        recipientRole: String,
        subject: String,
        messageTemplate: String,

        // For delay steps
        delayDuration: Number, // in minutes
        delayUnit: {
            type: String,
            enum: ['minutes', 'hours', 'days', 'weeks']
        },

        // For condition steps
        conditions: [{
            field: String,
            operator: {
                type: String,
                enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'is_empty', 'is_not_empty']
            },
            value: mongoose.Schema.Types.Mixed,
            logicGate: {
                type: String,
                enum: ['AND', 'OR'],
                default: 'AND'
            }
        }],

        // For action steps
        actionType: {
            type: String,
            enum: ['update_field', 'create_record', 'send_webhook', 'run_script', 'send_email', 'create_document']
        },
        actionConfig: mongoose.Schema.Types.Mixed,

        // For form steps
        formFields: [{
            name: String,
            label: String,
            type: {
                type: String,
                enum: ['text', 'textarea', 'number', 'date', 'select', 'checkbox', 'radio', 'file']
            },
            required: Boolean,
            options: [String],
            validation: mongoose.Schema.Types.Mixed
        }],

        // Common configurations
        requiresCompletion: {
            type: Boolean,
            default: true
        },
        canSkip: {
            type: Boolean,
            default: false
        },
        autoComplete: {
            type: Boolean,
            default: false
        },
        timeout: Number, // in minutes
        retryOnFailure: {
            type: Boolean,
            default: false
        },
        maxRetries: {
            type: Number,
            default: 3
        }
    },
    // Conditional logic for step execution
    onComplete: {
        nextStepId: String,
        conditions: [{
            field: String,
            operator: String,
            value: mongoose.Schema.Types.Mixed,
            nextStepId: String
        }]
    },
    // Step metadata
    estimatedDuration: Number, // in minutes
    tags: [String]
}, { _id: true });

/**
 * Workflow Variable Schema
 * Defines variables that can be used throughout the workflow
 */
const variableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'date', 'object', 'array'],
        required: true
    },
    defaultValue: mongoose.Schema.Types.Mixed,
    description: String,
    required: {
        type: Boolean,
        default: false
    },
    validation: {
        min: Number,
        max: Number,
        pattern: String,
        options: [mongoose.Schema.Types.Mixed]
    }
}, { _id: true });

/**
 * Workflow Template Schema
 * Main schema for workflow templates
 */
const workflowTemplateSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        default: null // null for system templates
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        index: true
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        maxlength: 2000
    },

    // Categorization
    category: {
        type: String,
        enum: ['legal', 'finance', 'hr', 'client_onboarding', 'case_management', 'custom'],
        required: true,
        index: true
    },

    // Trigger Configuration
    triggerType: {
        type: String,
        enum: ['manual', 'event', 'schedule', 'condition'],
        required: true,
        default: 'manual'
    },
    triggerConfig: {
        // For event triggers
        eventName: String,
        eventType: {
            type: String,
            enum: ['create', 'update', 'delete', 'status_change', 'field_change', 'custom']
        },
        entityType: {
            type: String,
            enum: ['case', 'client', 'invoice', 'task', 'lead', 'deal', 'employee', 'custom']
        },

        // For schedule triggers
        scheduleType: {
            type: String,
            enum: ['once', 'daily', 'weekly', 'monthly', 'yearly', 'cron']
        },
        scheduleCron: String,
        scheduleDate: Date,
        scheduleTime: String,
        scheduleDayOfWeek: Number, // 0-6
        scheduleDayOfMonth: Number, // 1-31

        // For condition triggers
        conditions: [{
            field: String,
            operator: String,
            value: mongoose.Schema.Types.Mixed
        }],

        // Common trigger settings
        filters: mongoose.Schema.Types.Mixed,
        enabled: {
            type: Boolean,
            default: true
        }
    },

    // Workflow Steps
    steps: [stepConfigSchema],

    // Workflow Variables
    variables: [variableSchema],

    // Permissions
    permissions: {
        canUse: [{
            type: String,
            enum: ['all', 'owner', 'admin', 'manager', 'lawyer', 'accountant', 'hr', 'custom']
        }],
        canEdit: [{
            type: String,
            enum: ['owner', 'admin']
        }],
        specificUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isSystem: {
        type: Boolean,
        default: false,
        index: true
    },

    // Metadata
    version: {
        type: Number,
        default: 1
    },
    tags: [String],
    icon: String,
    color: String,

    // Statistics
    stats: {
        totalInstances: {
            type: Number,
            default: 0
        },
        completedInstances: {
            type: Number,
            default: 0
        },
        failedInstances: {
            type: Number,
            default: 0
        },
        averageDuration: Number, // in minutes
        lastUsed: Date
    },

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
workflowTemplateSchema.index({ firmId: 1, category: 1 });
workflowTemplateSchema.index({ firmId: 1, isActive: 1 });
workflowTemplateSchema.index({ isSystem: 1, isActive: 1 });
workflowTemplateSchema.index({ triggerType: 1 });
workflowTemplateSchema.index({ 'triggerConfig.entityType': 1 });
workflowTemplateSchema.index({ name: 'text', description: 'text' });
workflowTemplateSchema.index({ createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get total estimated duration for workflow
 * @returns {Number} - Total estimated duration in minutes
 */
workflowTemplateSchema.methods.getEstimatedDuration = function() {
    if (!this.steps || this.steps.length === 0) return 0;

    return this.steps.reduce((total, step) => {
        return total + (step.estimatedDuration || 0);
    }, 0);
};

/**
 * Get step by order
 * @param {Number} order - Step order
 * @returns {Object} - Step object
 */
workflowTemplateSchema.methods.getStepByOrder = function(order) {
    return this.steps.find(step => step.order === order);
};

/**
 * Validate workflow configuration
 * @returns {Object} - Validation result {valid: Boolean, errors: Array}
 */
workflowTemplateSchema.methods.validateWorkflow = function() {
    const errors = [];

    // Check if steps exist
    if (!this.steps || this.steps.length === 0) {
        errors.push('Workflow must have at least one step');
    }

    // Check for duplicate step orders
    const orders = this.steps.map(s => s.order);
    const duplicates = orders.filter((order, index) => orders.indexOf(order) !== index);
    if (duplicates.length > 0) {
        errors.push(`Duplicate step orders found: ${duplicates.join(', ')}`);
    }

    // Check for missing required configurations
    this.steps.forEach((step, index) => {
        if (step.type === 'task' && !step.config.assigneeType) {
            errors.push(`Step ${index + 1}: Task step requires assigneeType`);
        }

        if (step.type === 'approval' && !step.config.approverType) {
            errors.push(`Step ${index + 1}: Approval step requires approverType`);
        }

        if (step.type === 'notification' && !step.config.notificationType) {
            errors.push(`Step ${index + 1}: Notification step requires notificationType`);
        }

        if (step.type === 'delay' && !step.config.delayDuration) {
            errors.push(`Step ${index + 1}: Delay step requires delayDuration`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get system templates
 * @returns {Promise<Array>} - System templates
 */
workflowTemplateSchema.statics.getSystemTemplates = function() {
    return this.find({ isSystem: true, isActive: true })
        .sort({ name: 1 })
        .lean();
};

/**
 * Get templates by category
 * @param {String} firmId - Firm ID
 * @param {String} category - Category
 * @returns {Promise<Array>} - Templates
 */
workflowTemplateSchema.statics.getByCategory = function(firmId, category) {
    return this.find({
        $or: [
            { firmId: new mongoose.Types.ObjectId(firmId), category, isActive: true },
            { isSystem: true, category, isActive: true }
        ]
    })
        .sort({ name: 1 })
        .lean();
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-save hook to validate workflow configuration
 */
workflowTemplateSchema.pre('save', function(next) {
    // Sort steps by order
    if (this.steps && this.steps.length > 0) {
        this.steps.sort((a, b) => a.order - b.order);
    }

    next();
});

module.exports = mongoose.model('WorkflowTemplate', workflowTemplateSchema);
