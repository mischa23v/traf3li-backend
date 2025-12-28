/**
 * Automation Model
 *
 * Represents automation rules that trigger actions based on various events and conditions.
 * This is a comprehensive automation engine for business process automation across entities.
 *
 * Features:
 * - Multi-trigger support (record events, time-based, webhooks, forms, status changes)
 * - Conditional execution with field-based conditions
 * - Multiple sequential actions with error handling
 * - Time-based scheduling (interval, cron, relative)
 * - Field change watching
 * - Rate limiting per automation
 * - Execution statistics and monitoring
 * - Multi-tenancy via firmId
 *
 * Supported Entity Types:
 * - lead, deal, contact, case, task, invoice
 *
 * Action Types:
 * - update_record, create_record, send_email, send_notification
 * - create_task, update_field, call_webhook, send_slack
 * - assign_to, add_to_campaign, create_activity, delay
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Condition Schema
 * Defines conditions that must be met for automation to execute
 */
const conditionSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true,
        trim: true
        // e.g., 'status', 'priority', 'assignedTo', 'amount'
    },
    operator: {
        type: String,
        required: true,
        enum: [
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'starts_with',
            'ends_with',
            'greater_than',
            'greater_than_or_equal',
            'less_than',
            'less_than_or_equal',
            'is_empty',
            'is_not_empty',
            'in',
            'not_in',
            'changed',
            'changed_to',
            'changed_from'
        ]
    },
    value: {
        type: mongoose.Schema.Types.Mixed
        // Can be string, number, boolean, array, date, etc.
    }
}, { _id: true });

/**
 * Schedule Schema
 * Defines time-based scheduling configuration
 */
const scheduleSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['interval', 'cron', 'relative'],
        default: 'interval'
    },
    value: {
        type: String,
        required: true,
        trim: true
        // For interval: '5m', '1h', '1d', '1w'
        // For cron: '0 9 * * *' (every day at 9 AM)
        // For relative: '1d_before:dueDate', '2h_after:createdAt'
    },
    timezone: {
        type: String,
        default: 'Asia/Riyadh',
        trim: true
        // IANA timezone identifier
    }
}, { _id: false });

/**
 * Trigger Schema
 * Defines when the automation should be triggered
 */
const triggerSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'record_created',
            'record_updated',
            'field_changed',
            'time_based',
            'webhook',
            'form_submitted',
            'status_changed',
            'date_arrived'
        ],
        index: true
    },
    conditions: {
        type: [conditionSchema],
        default: []
        // All conditions must be met (AND logic)
    },
    schedule: {
        type: scheduleSchema,
        default: null
        // Required when type is 'time_based'
    },
    watchFields: {
        type: [String],
        default: []
        // Fields to watch for 'field_changed' trigger
        // e.g., ['status', 'priority', 'assignedTo']
    }
}, { _id: false });

/**
 * Action Schema
 * Defines actions to execute when automation is triggered
 */
const actionSchema = new mongoose.Schema({
    order: {
        type: Number,
        required: true,
        default: 0
        // Actions execute in ascending order
    },
    type: {
        type: String,
        required: true,
        enum: [
            'update_record',
            'create_record',
            'send_email',
            'send_notification',
            'create_task',
            'update_field',
            'call_webhook',
            'send_slack',
            'assign_to',
            'add_to_campaign',
            'create_activity',
            'delay'
        ],
        index: true
    },
    config: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        default: {}
        // Action-specific configuration
        // Examples:
        // - update_record: { fields: { status: 'in_progress', priority: 'high' } }
        // - send_email: { templateId: '...', to: '{{contact.email}}', subject: '...' }
        // - create_task: { title: '...', assignedTo: '...', dueDate: '...' }
        // - call_webhook: { url: '...', method: 'POST', headers: {...}, body: {...} }
        // - delay: { duration: '1h', unit: 'hours' }
    },
    continueOnError: {
        type: Boolean,
        default: false
        // If true, continue executing next actions even if this action fails
    }
}, { _id: true });

/**
 * Rate Limit Schema
 * Defines rate limiting for automation execution
 */
const rateLimitSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: false
    },
    maxPerHour: {
        type: Number,
        default: 100,
        min: 1,
        max: 10000
    },
    maxPerDay: {
        type: Number,
        default: 1000,
        min: 1,
        max: 100000
    }
}, { _id: false });

/**
 * Statistics Schema
 * Tracks automation execution statistics
 */
const statisticsSchema = new mongoose.Schema({
    totalRuns: {
        type: Number,
        default: 0,
        min: 0
    },
    successfulRuns: {
        type: Number,
        default: 0,
        min: 0
    },
    failedRuns: {
        type: Number,
        default: 0,
        min: 0
    },
    lastRun: {
        type: Date,
        index: true
    },
    lastError: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    lastErrorAt: {
        type: Date
    },
    averageExecutionTime: {
        type: Number,
        default: 0
        // In milliseconds
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const automationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: [true, 'Automation name is required'],
        trim: true,
        maxlength: 200,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTITY CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        required: [true, 'Entity type is required'],
        enum: ['lead', 'deal', 'contact', 'case', 'task', 'invoice'],
        index: true
        // The type of entity this automation applies to
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    enabled: {
        type: Boolean,
        default: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
        // Admin can deactivate without disabling
    },

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    trigger: {
        type: triggerSchema,
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTIONS CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    actions: {
        type: [actionSchema],
        required: [true, 'At least one action is required'],
        validate: {
            validator: function(actions) {
                return actions && actions.length > 0;
            },
            message: 'Automation must have at least one action'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RATE LIMITING
    // ═══════════════════════════════════════════════════════════════
    rateLimit: {
        type: rateLimitSchema,
        default: () => ({})
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        type: statisticsSchema,
        default: () => ({})
    },

    // ═══════════════════════════════════════════════════════════════
    // EXECUTION CONTROL
    // ═══════════════════════════════════════════════════════════════
    priority: {
        type: Number,
        default: 10,
        min: 1,
        max: 100
        // Lower numbers execute first
    },
    timeout: {
        type: Number,
        default: 30000,
        min: 1000,
        max: 300000
        // Execution timeout in milliseconds
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    tags: {
        type: [String],
        default: []
    },
    category: {
        type: String,
        trim: true,
        maxlength: 100
        // e.g., 'sales', 'support', 'finance', 'legal'
    },
    version: {
        type: Number,
        default: 1
        // Track automation versions for changes
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    disabledAt: {
        type: Date
    },
    disabledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    disabledReason: {
        type: String,
        trim: true,
        maxlength: 500
    }

}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound indexes for efficient queries
automationSchema.index({ firmId: 1, entityType: 1, enabled: 1, isActive: 1 });
automationSchema.index({ firmId: 1, entityType: 1, 'trigger.type': 1, enabled: 1 });
automationSchema.index({ firmId: 1, enabled: 1, isActive: 1 });
automationSchema.index({ firmId: 1, category: 1 });
automationSchema.index({ priority: 1, enabled: 1 });
automationSchema.index({ createdBy: 1, entityType: 1 });
automationSchema.index({ 'stats.lastRun': -1 });
automationSchema.index({ 'trigger.schedule.type': 1 });
automationSchema.index({ tags: 1 });

// Text search index
automationSchema.index({ name: 'text', description: 'text' });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get success rate percentage
 */
automationSchema.virtual('successRate').get(function() {
    if (!this.stats || this.stats.totalRuns === 0) return 0;
    return Math.round((this.stats.successfulRuns / this.stats.totalRuns) * 100);
});

/**
 * Get failure rate percentage
 */
automationSchema.virtual('failureRate').get(function() {
    if (!this.stats || this.stats.totalRuns === 0) return 0;
    return Math.round((this.stats.failedRuns / this.stats.totalRuns) * 100);
});

/**
 * Check if automation is currently enabled
 */
automationSchema.virtual('isEnabled').get(function() {
    return this.enabled && this.isActive;
});

/**
 * Get human-readable trigger description
 */
automationSchema.virtual('triggerDescription').get(function() {
    if (!this.trigger) return '';

    const triggerType = this.trigger.type;
    const baseDesc = triggerType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    if (triggerType === 'field_changed' && this.trigger.watchFields?.length) {
        return `${baseDesc} (${this.trigger.watchFields.join(', ')})`;
    }

    if (triggerType === 'time_based' && this.trigger.schedule) {
        return `${baseDesc} (${this.trigger.schedule.type}: ${this.trigger.schedule.value})`;
    }

    return baseDesc;
});

/**
 * Get total actions count
 */
automationSchema.virtual('actionsCount').get(function() {
    return this.actions?.length || 0;
});

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-save hook for validation and normalization
 */
automationSchema.pre('save', function(next) {
    // Sort actions by order
    if (this.actions && this.actions.length > 0) {
        this.actions.sort((a, b) => a.order - b.order);
    }

    // Validate time_based trigger has schedule
    if (this.trigger?.type === 'time_based' && !this.trigger.schedule) {
        return next(new Error('time_based trigger requires a schedule configuration'));
    }

    // Validate field_changed trigger has watchFields
    if (this.trigger?.type === 'field_changed' && (!this.trigger.watchFields || this.trigger.watchFields.length === 0)) {
        return next(new Error('field_changed trigger requires at least one watch field'));
    }

    // Track version changes
    if (this.isModified('trigger') || this.isModified('actions')) {
        this.version = (this.version || 1) + 1;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active automations for a specific entity and trigger type
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type (lead, case, etc.)
 * @param {String} triggerType - Trigger type
 * @returns {Promise<Array>} Array of automation rules
 */
automationSchema.statics.getActiveAutomations = async function(firmId, entityType, triggerType) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        enabled: true,
        isActive: true
    };

    if (triggerType) {
        query['trigger.type'] = triggerType;
    }

    return await this.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort({ priority: 1 })
        .lean();
};

/**
 * Get automations by entity type
 * @param {ObjectId} firmId - Firm ID
 * @param {String} entityType - Entity type
 * @returns {Promise<Array>}
 */
automationSchema.statics.getByEntityType = async function(firmId, entityType) {
    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType
    })
    .populate('createdBy', 'firstName lastName')
    .sort({ priority: 1, createdAt: -1 });
};

/**
 * Get automation statistics for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Object>} Statistics summary
 */
automationSchema.statics.getFirmStats = async function(firmId) {
    const stats = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId)
            }
        },
        {
            $group: {
                _id: null,
                totalAutomations: { $sum: 1 },
                activeAutomations: {
                    $sum: { $cond: [{ $and: ['$enabled', '$isActive'] }, 1, 0] }
                },
                disabledAutomations: {
                    $sum: { $cond: ['$enabled', 0, 1] }
                },
                totalRuns: { $sum: '$stats.totalRuns' },
                successfulRuns: { $sum: '$stats.successfulRuns' },
                failedRuns: { $sum: '$stats.failedRuns' }
            }
        }
    ]);

    const byEntity = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId)
            }
        },
        {
            $group: {
                _id: '$entityType',
                count: { $sum: 1 },
                active: { $sum: { $cond: [{ $and: ['$enabled', '$isActive'] }, 1, 0] } }
            }
        }
    ]);

    const byTrigger = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId)
            }
        },
        {
            $group: {
                _id: '$trigger.type',
                count: { $sum: 1 }
            }
        }
    ]);

    return {
        summary: stats[0] || {
            totalAutomations: 0,
            activeAutomations: 0,
            disabledAutomations: 0,
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0
        },
        byEntity: byEntity.reduce((acc, item) => {
            acc[item._id] = { count: item.count, active: item.active };
            return acc;
        }, {}),
        byTrigger: byTrigger.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {})
    };
};

/**
 * Check rate limit for automation
 * @param {ObjectId} automationId - Automation ID
 * @returns {Promise<Boolean>} True if within rate limit
 */
automationSchema.statics.checkRateLimit = async function(automationId) {
    const automation = await this.findById(automationId);

    if (!automation || !automation.rateLimit?.enabled) {
        return true; // No rate limit or not enabled
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // This would typically check against an execution log collection
    // For now, returning true (implementation depends on execution tracking)
    return true;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Execute this automation
 * @param {Object} record - The record that triggered the automation
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Execution result
 */
automationSchema.methods.execute = async function(record, context = {}) {
    const startTime = Date.now();

    try {
        // Check if automation is enabled
        if (!this.enabled || !this.isActive) {
            return {
                success: false,
                skipped: true,
                reason: 'Automation is not enabled'
            };
        }

        // Evaluate trigger conditions
        if (!await this.evaluateConditions(record)) {
            return {
                success: false,
                skipped: true,
                reason: 'Trigger conditions not met'
            };
        }

        // Execute actions in order
        const results = [];
        for (const action of this.actions) {
            try {
                const actionResult = await this.executeAction(action, record, context);
                results.push(actionResult);

                if (!actionResult.success && !action.continueOnError) {
                    throw new Error(`Action ${action.type} failed: ${actionResult.error}`);
                }
            } catch (error) {
                if (!action.continueOnError) {
                    throw error;
                }
                results.push({ success: false, error: error.message });
            }
        }

        // Update statistics
        const executionTime = Date.now() - startTime;
        await this.updateStats(true, executionTime);

        return {
            success: true,
            results,
            executionTime
        };
    } catch (error) {
        const executionTime = Date.now() - startTime;
        await this.updateStats(false, executionTime, error.message);

        return {
            success: false,
            error: error.message,
            executionTime
        };
    }
};

/**
 * Evaluate trigger conditions
 * @param {Object} record - Record to evaluate
 * @returns {Promise<Boolean>}
 */
automationSchema.methods.evaluateConditions = async function(record) {
    if (!this.trigger.conditions || this.trigger.conditions.length === 0) {
        return true; // No conditions means always execute
    }

    // All conditions must be met (AND logic)
    for (const condition of this.trigger.conditions) {
        const fieldValue = this.getFieldValue(record, condition.field);

        if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
            return false;
        }
    }

    return true;
};

/**
 * Get field value from record (supports nested fields)
 * @param {Object} record - Record object
 * @param {String} field - Field path (e.g., 'contact.email')
 * @returns {*} Field value
 */
automationSchema.methods.getFieldValue = function(record, field) {
    const parts = field.split('.');
    let value = record;

    for (const part of parts) {
        if (value && typeof value === 'object') {
            value = value[part];
        } else {
            return undefined;
        }
    }

    return value;
};

/**
 * Evaluate a single condition
 * @param {*} fieldValue - Actual field value
 * @param {String} operator - Comparison operator
 * @param {*} expectedValue - Expected value
 * @returns {Boolean}
 */
automationSchema.methods.evaluateCondition = function(fieldValue, operator, expectedValue) {
    switch (operator) {
        case 'equals':
            return fieldValue == expectedValue;
        case 'not_equals':
            return fieldValue != expectedValue;
        case 'contains':
            return String(fieldValue).includes(String(expectedValue));
        case 'not_contains':
            return !String(fieldValue).includes(String(expectedValue));
        case 'starts_with':
            return String(fieldValue).startsWith(String(expectedValue));
        case 'ends_with':
            return String(fieldValue).endsWith(String(expectedValue));
        case 'greater_than':
            return Number(fieldValue) > Number(expectedValue);
        case 'greater_than_or_equal':
            return Number(fieldValue) >= Number(expectedValue);
        case 'less_than':
            return Number(fieldValue) < Number(expectedValue);
        case 'less_than_or_equal':
            return Number(fieldValue) <= Number(expectedValue);
        case 'is_empty':
            return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
        case 'is_not_empty':
            return !!fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
        case 'in':
            return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
        case 'not_in':
            return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
        default:
            return false;
    }
};

/**
 * Execute a single action
 * @param {Object} action - Action to execute
 * @param {Object} record - Record object
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
automationSchema.methods.executeAction = async function(action, record, context) {
    // Placeholder for action execution
    // Actual implementation would be in a service layer
    return {
        success: true,
        type: action.type,
        message: `Action ${action.type} executed successfully`
    };
};

/**
 * Update automation statistics
 * @param {Boolean} success - Whether execution was successful
 * @param {Number} executionTime - Execution time in milliseconds
 * @param {String} error - Error message if failed
 */
automationSchema.methods.updateStats = async function(success, executionTime, error = null) {
    this.stats.totalRuns = (this.stats.totalRuns || 0) + 1;

    if (success) {
        this.stats.successfulRuns = (this.stats.successfulRuns || 0) + 1;
    } else {
        this.stats.failedRuns = (this.stats.failedRuns || 0) + 1;
        this.stats.lastError = error;
        this.stats.lastErrorAt = new Date();
    }

    this.stats.lastRun = new Date();

    // Update average execution time
    const totalRuns = this.stats.totalRuns;
    const currentAvg = this.stats.averageExecutionTime || 0;
    this.stats.averageExecutionTime = ((currentAvg * (totalRuns - 1)) + executionTime) / totalRuns;

    await this.save();
};

/**
 * Disable automation
 * @param {ObjectId} userId - User performing the action
 * @param {String} reason - Reason for disabling
 */
automationSchema.methods.disable = async function(userId, reason = null) {
    this.enabled = false;
    this.disabledAt = new Date();
    this.disabledBy = userId;
    this.disabledReason = reason;
    this.updatedBy = userId;

    await this.save();
    return this;
};

/**
 * Enable automation
 * @param {ObjectId} userId - User performing the action
 */
automationSchema.methods.enable = async function(userId) {
    this.enabled = true;
    this.disabledAt = null;
    this.disabledBy = null;
    this.disabledReason = null;
    this.updatedBy = userId;

    await this.save();
    return this;
};

/**
 * Validate automation configuration
 * @returns {Object} Validation result
 */
automationSchema.methods.validateConfig = function() {
    const errors = [];

    // Validate trigger
    if (!this.trigger) {
        errors.push('Trigger configuration is required');
    }

    // Validate actions
    if (!this.actions || this.actions.length === 0) {
        errors.push('At least one action is required');
    }

    // Validate action configurations
    this.actions?.forEach((action, index) => {
        if (!action.config || Object.keys(action.config).length === 0) {
            errors.push(`Action ${index + 1} (${action.type}) is missing configuration`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
// Removed firmIsolationPlugin - using direct RLS queries instead

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

module.exports = mongoose.model('Automation', automationSchema);
