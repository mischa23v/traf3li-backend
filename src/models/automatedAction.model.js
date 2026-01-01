/**
 * Automated Action Model
 *
 * Represents automated actions that trigger on various events.
 * Similar to Odoo's base.automation, this defines automated workflows
 * that execute when specific conditions are met.
 *
 * Features:
 * - Event-based triggers (create, update, delete, time, stage change)
 * - Conditional execution with MongoDB query filters
 * - Multiple action types (update, activity, email, notification, webhook, code)
 * - Time-based scheduling with flexible date ranges
 * - Activity creation with user assignment logic
 * - Email and notification templates
 * - Webhook integrations
 * - Sandboxed code execution
 * - Execution tracking and statistics
 */

const mongoose = require('mongoose');
const { validateWebhookUrlSync } = require('../utils/urlValidator');

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const automatedActionSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


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
        required: [true, 'Automated action name is required'],
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        required: [true, 'Arabic automated action name is required'],
        trim: true,
        maxlength: 200
    },

    // ═══════════════════════════════════════════════════════════════
    // TARGET MODEL
    // ═══════════════════════════════════════════════════════════════
    model_name: {
        type: String,
        required: [true, 'Target model is required'],
        trim: true,
        index: true
        // e.g., 'Case', 'Client', 'Invoice', 'Lead'
    },

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    trigger: {
        type: String,
        enum: ['on_create', 'on_write', 'on_unlink', 'on_time', 'on_stage_change'],
        required: [true, 'Trigger type is required'],
        index: true
    },
    trigger_field_ids: {
        type: [String],
        default: []
        // Fields that trigger on_write (e.g., ['status', 'priority'])
    },

    // ═══════════════════════════════════════════════════════════════
    // FILTER CONDITIONS
    // ═══════════════════════════════════════════════════════════════
    filter_pre_domain: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
        // MongoDB query format - condition before action
        // e.g., { status: 'pending', priority: { $gte: 3 } }
    },
    filter_domain: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
        // MongoDB query format - condition after action
    },

    // ═══════════════════════════════════════════════════════════════
    // TIME-BASED TRIGGER CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    trg_date_id: {
        type: String,
        trim: true
        // Date field for on_time trigger (e.g., 'deadline', 'dueDate')
    },
    trg_date_range: {
        type: Number,
        default: 0
        // Delay value (can be negative for "before")
    },
    trg_date_range_type: {
        type: String,
        enum: ['minutes', 'hours', 'days', 'weeks', 'months'],
        default: 'days'
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTION CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    action_type: {
        type: String,
        enum: ['update_record', 'create_activity', 'send_email', 'send_notification', 'execute_code', 'webhook'],
        required: [true, 'Action type is required'],
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // UPDATE RECORD ACTION
    // ═══════════════════════════════════════════════════════════════
    update_values: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
        // Fields to update, e.g., { status: 'completed', priority: 1 }
    },

    // ═══════════════════════════════════════════════════════════════
    // CREATE ACTIVITY ACTION
    // ═══════════════════════════════════════════════════════════════
    activity_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActivityType'
    },
    activity_user_type: {
        type: String,
        enum: ['specific_user', 'record_owner', 'activity_creator'],
        default: 'record_owner'
    },
    activity_user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Required when activity_user_type is 'specific_user'
    },
    activity_summary: {
        type: String,
        trim: true,
        maxlength: 500
        // Template string, supports variables like {{record.name}}
    },
    activity_note: {
        type: String,
        trim: true,
        maxlength: 2000
        // Template string, supports variables
    },

    // ═══════════════════════════════════════════════════════════════
    // SEND EMAIL ACTION
    // ═══════════════════════════════════════════════════════════════
    email_template_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmailTemplate'
    },

    // ═══════════════════════════════════════════════════════════════
    // SEND NOTIFICATION ACTION
    // ═══════════════════════════════════════════════════════════════
    notification_template: {
        type: String,
        trim: true,
        maxlength: 1000
        // Template string for notification message
    },

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK ACTION
    // ═══════════════════════════════════════════════════════════════
    webhook_url: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return true; // Optional field
                // Use SSRF-safe URL validation
                const result = validateWebhookUrlSync(v, {
                    allowHttp: process.env.NODE_ENV !== 'production'
                });
                return result.valid;
            },
            message: props => {
                if (!props.value) return 'Invalid webhook URL';
                const result = validateWebhookUrlSync(props.value, {
                    allowHttp: process.env.NODE_ENV !== 'production'
                });
                return result.error || 'Invalid webhook URL - private/internal addresses are not allowed';
            }
        }
    },
    webhook_method: {
        type: String,
        enum: ['POST', 'PUT', 'PATCH'],
        default: 'POST'
    },

    // ═══════════════════════════════════════════════════════════════
    // EXECUTE CODE ACTION
    // ═══════════════════════════════════════════════════════════════
    code: {
        type: String,
        trim: true
        // JavaScript code to execute in sandboxed environment
        // Has access to: record, context, models
    },

    // ═══════════════════════════════════════════════════════════════
    // EXECUTION CONTROL
    // ═══════════════════════════════════════════════════════════════
    sequence: {
        type: Number,
        default: 10,
        index: true
        // Lower numbers execute first
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EXECUTION STATISTICS
    // ═══════════════════════════════════════════════════════════════
    last_run: {
        type: Date,
        index: true
    },
    run_count: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updated_by: {
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

// Compound index for efficient trigger lookup
automatedActionSchema.index({ firmId: 1, model_name: 1, trigger: 1, isActive: 1 });
automatedActionSchema.index({ firmId: 1, isActive: 1 });
automatedActionSchema.index({ sequence: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get display name (bilingual)
 */
automatedActionSchema.virtual('displayName').get(function() {
    return `${this.name} / ${this.nameAr}`;
});

/**
 * Get trigger description
 */
automatedActionSchema.virtual('triggerDescription').get(function() {
    switch (this.trigger) {
        case 'on_create':
            return 'On record creation';
        case 'on_write':
            return `On record update${this.trigger_field_ids?.length ? ` (${this.trigger_field_ids.join(', ')})` : ''}`;
        case 'on_unlink':
            return 'On record deletion';
        case 'on_stage_change':
            return 'On stage/status change';
        case 'on_time':
            const range = this.trg_date_range;
            const type = this.trg_date_range_type;
            const field = this.trg_date_id || 'date';
            if (range === 0) {
                return `When ${field} is reached`;
            } else if (range > 0) {
                return `${range} ${type} after ${field}`;
            } else {
                return `${Math.abs(range)} ${type} before ${field}`;
            }
        default:
            return this.trigger;
    }
});

/**
 * Get action description
 */
automatedActionSchema.virtual('actionDescription').get(function() {
    switch (this.action_type) {
        case 'update_record':
            return 'Update record fields';
        case 'create_activity':
            return 'Create activity';
        case 'send_email':
            return 'Send email';
        case 'send_notification':
            return 'Send notification';
        case 'execute_code':
            return 'Execute custom code';
        case 'webhook':
            return `Call webhook (${this.webhook_method || 'POST'})`;
        default:
            return this.action_type;
    }
});

automatedActionSchema.set('toJSON', { virtuals: true });
automatedActionSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active actions for a specific trigger
 * @param {ObjectId} firmId - Firm ID
 * @param {String} modelName - Model name (e.g., 'Case', 'Client')
 * @param {String} trigger - Trigger type
 * @returns {Promise<Array>} Array of automated actions sorted by sequence
 */
automatedActionSchema.statics.getActionsForTrigger = async function(firmId, modelName, trigger) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        model_name: modelName,
        trigger: trigger,
        isActive: true
    };

    return await this.find(query)
        .populate('activity_type_id', 'name nameAr icon')
        .populate('activity_user_id', 'firstName lastName email')
        .populate('email_template_id', 'name subject')
        .populate('created_by', 'firstName lastName')
        .populate('updated_by', 'firstName lastName')
        .sort({ sequence: 1 })
        .lean();
};

/**
 * Execute an automated action on a record
 * @param {ObjectId} actionId - Action ID
 * @param {Object} record - The record to act upon
 * @param {Object} context - Execution context (user, changes, etc.)
 * @returns {Promise<Object>} Execution result
 */
automatedActionSchema.statics.executeAction = async function(actionId, record, context = {}) {
    const action = await this.findById(actionId)
        .populate('activity_type_id')
        .populate('activity_user_id')
        .populate('email_template_id');

    if (!action) {
        throw new Error('Automated action not found');
    }

    if (!action.isActive) {
        throw new Error('Automated action is not active');
    }

    // Check pre-condition filter
    if (action.filter_pre_domain && Object.keys(action.filter_pre_domain).length > 0) {
        const matchesPre = await this._evaluateFilter(record, action.filter_pre_domain);
        if (!matchesPre) {
            return { success: false, reason: 'Pre-condition filter not met' };
        }
    }

    // Check post-condition filter
    if (action.filter_domain && Object.keys(action.filter_domain).length > 0) {
        const matchesPost = await this._evaluateFilter(record, action.filter_domain);
        if (!matchesPost) {
            return { success: false, reason: 'Post-condition filter not met' };
        }
    }

    let result;
    try {
        // Execute the action based on type
        switch (action.action_type) {
            case 'update_record':
                result = await this._executeUpdateRecord(action, record, context);
                break;
            case 'create_activity':
                result = await this._executeCreateActivity(action, record, context);
                break;
            case 'send_email':
                result = await this._executeSendEmail(action, record, context);
                break;
            case 'send_notification':
                result = await this._executeSendNotification(action, record, context);
                break;
            case 'execute_code':
                result = await this._executeCode(action, record, context);
                break;
            case 'webhook':
                result = await this._executeWebhook(action, record, context);
                break;
            default:
                throw new Error(`Unknown action type: ${action.action_type}`);
        }

        // Update statistics
        action.last_run = new Date();
        action.run_count += 1;
        await action.save();

        return { success: true, result };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Schedule time-based actions for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Array of scheduled actions
 */
automatedActionSchema.statics.scheduleTimeBased = async function(firmId) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        trigger: 'on_time',
        isActive: true
    };

    const actions = await this.find(query)
        .populate('activity_type_id')
        .populate('email_template_id')
        .sort({ sequence: 1 });

    // Process each time-based action
    const scheduled = [];
    for (const action of actions) {
        // This would typically integrate with a job scheduler (e.g., Bull, Agenda)
        // For now, return the actions that need to be scheduled
        scheduled.push({
            actionId: action._id,
            modelName: action.model_name,
            dateField: action.trg_date_id,
            offset: {
                value: action.trg_date_range,
                unit: action.trg_date_range_type
            }
        });
    }

    return scheduled;
};

// ═══════════════════════════════════════════════════════════════
// PRIVATE HELPER METHODS (STATIC)
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate a filter against a record
 * @private
 */
automatedActionSchema.statics._evaluateFilter = async function(record, filter) {
    // Simple MongoDB-style filter evaluation
    // In a production system, you might want to use a library for this
    for (const [field, condition] of Object.entries(filter)) {
        const value = record[field];

        if (typeof condition === 'object' && condition !== null) {
            // Handle operators like $gte, $lte, $in, etc.
            for (const [operator, operand] of Object.entries(condition)) {
                switch (operator) {
                    case '$eq':
                        if (value !== operand) return false;
                        break;
                    case '$ne':
                        if (value === operand) return false;
                        break;
                    case '$gt':
                        if (value <= operand) return false;
                        break;
                    case '$gte':
                        if (value < operand) return false;
                        break;
                    case '$lt':
                        if (value >= operand) return false;
                        break;
                    case '$lte':
                        if (value > operand) return false;
                        break;
                    case '$in':
                        if (!Array.isArray(operand) || !operand.includes(value)) return false;
                        break;
                    case '$nin':
                        if (!Array.isArray(operand) || operand.includes(value)) return false;
                        break;
                    default:
                        // Unknown operator
                        return false;
                }
            }
        } else {
            // Direct equality check
            if (value !== condition) return false;
        }
    }

    return true;
};

/**
 * Execute update_record action
 * @private
 */
automatedActionSchema.statics._executeUpdateRecord = async function(action, record, context) {
    // This would update the record using the appropriate model
    // Placeholder implementation
    return {
        type: 'update_record',
        updates: action.update_values,
        recordId: record._id || record.id
    };
};

/**
 * Execute create_activity action
 * @private
 */
automatedActionSchema.statics._executeCreateActivity = async function(action, record, context) {
    const Activity = mongoose.model('Activity');

    // Determine the user to assign the activity to
    let assignedUserId;
    switch (action.activity_user_type) {
        case 'specific_user':
            assignedUserId = action.activity_user_id;
            break;
        case 'record_owner':
            assignedUserId = record.assignedTo || record.owner || record.createdBy;
            break;
        case 'activity_creator':
            assignedUserId = context.userId || action.created_by;
            break;
        default:
            assignedUserId = action.activity_user_id;
    }

    if (!assignedUserId) {
        throw new Error('Could not determine user for activity assignment');
    }

    // Template variable replacement
    const summary = this._replaceTemplateVars(action.activity_summary || 'Automated activity', record);
    const note = this._replaceTemplateVars(action.activity_note || '', record);

    // Calculate deadline (default to today + 1 day if activity type has no delay)
    let deadline = new Date();
    if (action.activity_type_id?.calculateDeadline) {
        deadline = action.activity_type_id.calculateDeadline();
    } else {
        deadline.setDate(deadline.getDate() + 1);
    }

    const activity = await Activity.create({
        firmId: action.firmId,
        res_model: action.model_name,
        res_id: record._id || record.id,
        activity_type_id: action.activity_type_id?._id,
        summary,
        note,
        date_deadline: deadline,
        user_id: assignedUserId,
        create_user_id: action.created_by,
        state: 'scheduled',
        automated: true
    });

    return {
        type: 'create_activity',
        activityId: activity._id,
        assignedTo: assignedUserId
    };
};

/**
 * Execute send_email action
 * @private
 */
automatedActionSchema.statics._executeSendEmail = async function(action, record, context) {
    // This would integrate with the email service
    // Placeholder implementation
    return {
        type: 'send_email',
        templateId: action.email_template_id?._id,
        recipient: record.email || record.contactEmail,
        recordId: record._id || record.id
    };
};

/**
 * Execute send_notification action
 * @private
 */
automatedActionSchema.statics._executeSendNotification = async function(action, record, context) {
    const Notification = mongoose.model('Notification');

    const message = this._replaceTemplateVars(action.notification_template || 'You have a notification', record);

    // Determine recipient (similar to activity assignment logic)
    const recipientId = record.assignedTo || record.owner || record.createdBy;

    if (!recipientId) {
        throw new Error('Could not determine recipient for notification');
    }

    const QueueService = require('../services/queue.service');
    QueueService.createNotification({
        firmId: action.firmId,
        userId: recipientId,
        type: 'automation',
        title: `Automated: ${action.name}`,
        message,
        relatedModel: action.model_name,
        relatedId: record._id || record.id,
        isRead: false
    });

    return {
        type: 'send_notification',
        notificationId: null, // Fire-and-forget, no ID returned
        recipient: recipientId
    };
};

/**
 * Execute webhook action
 * @private
 */
automatedActionSchema.statics._executeWebhook = async function(action, record, context) {
    // This would make an HTTP request to the webhook URL
    // Placeholder implementation
    return {
        type: 'webhook',
        url: action.webhook_url,
        method: action.webhook_method,
        payload: {
            action: action.name,
            model: action.model_name,
            record: record,
            timestamp: new Date()
        }
    };
};

/**
 * Execute custom code action
 * @private
 */
automatedActionSchema.statics._executeCode = async function(action, record, context) {
    // This would execute code in a sandboxed environment
    // SECURITY: Must be properly sandboxed in production
    // Placeholder implementation
    return {
        type: 'execute_code',
        code: action.code,
        note: 'Code execution not implemented - requires sandboxing'
    };
};

/**
 * Replace template variables in a string
 * @private
 */
automatedActionSchema.statics._replaceTemplateVars = function(template, record) {
    if (!template || typeof template !== 'string') return '';

    let result = template;

    // Replace {{record.field}} patterns
    const pattern = /\{\{record\.(\w+)\}\}/g;
    result = result.replace(pattern, (match, field) => {
        return record[field] || '';
    });

    return result;
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if this action should run based on field changes
 * @param {Array} changedFields - Array of field names that changed
 * @returns {Boolean} True if action should run
 */
automatedActionSchema.methods.shouldRunForFields = function(changedFields) {
    if (this.trigger !== 'on_write') {
        return true;
    }

    if (!this.trigger_field_ids || this.trigger_field_ids.length === 0) {
        return true; // Run on any write
    }

    // Check if any of the trigger fields were changed
    return changedFields.some(field => this.trigger_field_ids.includes(field));
};

/**
 * Test if a record matches this action's filters
 * @param {Object} record - Record to test
 * @returns {Promise<Boolean>} True if record matches
 */
automatedActionSchema.methods.matchesFilters = async function(record) {
    const constructor = this.constructor;

    // Check pre-condition
    if (this.filter_pre_domain && Object.keys(this.filter_pre_domain).length > 0) {
        const matchesPre = await constructor._evaluateFilter(record, this.filter_pre_domain);
        if (!matchesPre) return false;
    }

    // Check post-condition
    if (this.filter_domain && Object.keys(this.filter_domain).length > 0) {
        const matchesPost = await constructor._evaluateFilter(record, this.filter_domain);
        if (!matchesPost) return false;
    }

    return true;
};

/**
 * Calculate the execution date for time-based triggers
 * @param {Date} baseDate - The base date from the record
 * @returns {Date} Calculated execution date
 */
automatedActionSchema.methods.calculateExecutionDate = function(baseDate) {
    if (this.trigger !== 'on_time' || !baseDate) {
        return null;
    }

    const executionDate = new Date(baseDate);
    const range = this.trg_date_range || 0;

    switch (this.trg_date_range_type) {
        case 'minutes':
            executionDate.setMinutes(executionDate.getMinutes() + range);
            break;
        case 'hours':
            executionDate.setHours(executionDate.getHours() + range);
            break;
        case 'days':
            executionDate.setDate(executionDate.getDate() + range);
            break;
        case 'weeks':
            executionDate.setDate(executionDate.getDate() + (range * 7));
            break;
        case 'months':
            executionDate.setMonth(executionDate.getMonth() + range);
            break;
    }

    return executionDate;
};

/**
 * Validate action configuration
 * @returns {Object} Validation result with isValid and errors
 */
automatedActionSchema.methods.validateActionConfig = function() {
    const errors = [];

    // Validate trigger-specific fields
    if (this.trigger === 'on_time') {
        if (!this.trg_date_id) {
            errors.push('Time-based trigger requires trg_date_id');
        }
    }

    // Validate action-specific fields
    switch (this.action_type) {
        case 'create_activity':
            if (!this.activity_type_id) {
                errors.push('create_activity requires activity_type_id');
            }
            if (this.activity_user_type === 'specific_user' && !this.activity_user_id) {
                errors.push('specific_user type requires activity_user_id');
            }
            break;
        case 'send_email':
            if (!this.email_template_id) {
                errors.push('send_email requires email_template_id');
            }
            break;
        case 'send_notification':
            if (!this.notification_template) {
                errors.push('send_notification requires notification_template');
            }
            break;
        case 'webhook':
            if (!this.webhook_url) {
                errors.push('webhook requires webhook_url');
            }
            break;
        case 'execute_code':
            if (!this.code) {
                errors.push('execute_code requires code');
            }
            break;
        case 'update_record':
            if (!this.update_values || Object.keys(this.update_values).length === 0) {
                errors.push('update_record requires update_values');
            }
            break;
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = mongoose.model('AutomatedAction', automatedActionSchema);
