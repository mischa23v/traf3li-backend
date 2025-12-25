const mongoose = require('mongoose');

/**
 * Step Execution Record Schema
 * Tracks the execution history of each workflow step
 */
const stepExecutionSchema = new mongoose.Schema({
    stepOrder: {
        type: Number,
        required: true
    },
    stepName: String,
    stepType: {
        type: String,
        enum: ['task', 'approval', 'notification', 'delay', 'condition', 'action', 'form']
    },
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'timeout'],
        default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    duration: Number, // in milliseconds
    result: mongoose.Schema.Types.Mixed,
    error: {
        message: String,
        stack: String,
        code: String
    },
    retryCount: {
        type: Number,
        default: 0
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String,
    metadata: mongoose.Schema.Types.Mixed
}, { _id: true, timestamps: true });

/**
 * Workflow Instance Schema
 * Main schema for tracking workflow executions
 */
const workflowInstanceSchema = new mongoose.Schema({
    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
    // FIRM (Multi-Tenancy)
    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // Template Reference
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkflowTemplate',
        required: true,
        index: true
    },

    // Instance Details
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },

    // Current Execution State
    currentStep: {
        type: Number,
        default: 0,
        min: 0
    },
    currentStepName: String,

    // Variables (runtime values)
    variables: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Step History
    stepHistory: [stepExecutionSchema],

    // Timing
    startedAt: Date,
    completedAt: Date,
    pausedAt: Date,
    cancelledAt: Date,
    duration: Number, // in milliseconds

    // Progress Tracking
    progress: {
        totalSteps: {
            type: Number,
            default: 0
        },
        completedSteps: {
            type: Number,
            default: 0
        },
        failedSteps: {
            type: Number,
            default: 0
        },
        skippedSteps: {
            type: Number,
            default: 0
        },
        percentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },

    // Entity Association
    entityType: {
        type: String,
        enum: ['case', 'client', 'invoice', 'task', 'lead', 'deal', 'employee', 'custom'],
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    entityName: String,

    // Trigger Information
    triggeredBy: {
        type: String,
        enum: ['manual', 'event', 'schedule', 'condition', 'api']
    },
    triggerData: mongoose.Schema.Types.Mixed,

    // Error Handling
    lastError: {
        stepOrder: Number,
        message: String,
        timestamp: Date,
        retryable: Boolean
    },

    // Cancellation/Failure Info
    cancellationReason: String,
    failureReason: String,

    // Audit
    startedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    pausedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Metadata
    tags: [String],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    notes: String,

    // Parent/Child Relationships
    parentInstanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkflowInstance'
    },
    childInstances: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkflowInstance'
    }]
}, {
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
// INDEXES
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
workflowInstanceSchema.index({ firmId: 1, status: 1 });
workflowInstanceSchema.index({ firmId: 1, templateId: 1 });
workflowInstanceSchema.index({ entityType: 1, entityId: 1 });
workflowInstanceSchema.index({ startedBy: 1, status: 1 });
workflowInstanceSchema.index({ startedAt: -1 });
workflowInstanceSchema.index({ completedAt: -1 });
workflowInstanceSchema.index({ 'stepHistory.status': 1 });
workflowInstanceSchema.index({ triggeredBy: 1 });

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
// VIRTUALS
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

/**
 * Get if workflow is active (running or pending)
 */
workflowInstanceSchema.virtual('isActive').get(function() {
    return ['pending', 'running', 'paused'].includes(this.status);
});

/**
 * Get if workflow is finished (completed, failed, or cancelled)
 */
workflowInstanceSchema.virtual('isFinished').get(function() {
    return ['completed', 'failed', 'cancelled'].includes(this.status);
});

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
// METHODS
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

/**
 * Start the workflow execution
 * @param {String} userId - User ID who started the workflow
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.start = async function(userId) {
    if (this.status !== 'pending') {
        throw new Error('Workflow can only be started from pending state');
    }

    this.status = 'running';
    this.startedAt = new Date();
    this.startedBy = new mongoose.Types.ObjectId(userId);

    return await this.save();
};

/**
 * Pause the workflow execution
 * @param {String} userId - User ID who paused the workflow
 * @param {String} reason - Pause reason
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.pause = async function(userId, reason = '') {
    if (this.status !== 'running') {
        throw new Error('Only running workflows can be paused');
    }

    this.status = 'paused';
    this.pausedAt = new Date();
    this.pausedBy = new mongoose.Types.ObjectId(userId);
    if (reason) {
        this.notes = (this.notes || '') + `\nPaused: ${reason}`;
    }

    return await this.save();
};

/**
 * Resume the workflow execution
 * @param {String} userId - User ID who resumed the workflow
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.resume = async function(userId) {
    if (this.status !== 'paused') {
        throw new Error('Only paused workflows can be resumed');
    }

    this.status = 'running';
    this.pausedAt = null;
    this.notes = (this.notes || '') + `\nResumed at ${new Date().toISOString()}`;

    return await this.save();
};

/**
 * Cancel the workflow execution
 * @param {String} userId - User ID who cancelled the workflow
 * @param {String} reason - Cancellation reason
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.cancel = async function(userId, reason = '') {
    if (this.isFinished) {
        throw new Error('Cannot cancel a finished workflow');
    }

    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = new mongoose.Types.ObjectId(userId);
    this.cancellationReason = reason;

    if (!this.completedAt) {
        this.completedAt = new Date();
    }

    // Calculate duration
    if (this.startedAt) {
        this.duration = this.completedAt - this.startedAt;
    }

    return await this.save();
};

/**
 * Mark workflow as completed
 * @param {String} userId - User ID who completed the workflow
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.complete = async function(userId) {
    if (this.status === 'completed') {
        return this; // Already completed
    }

    this.status = 'completed';
    this.completedAt = new Date();
    this.completedBy = new mongoose.Types.ObjectId(userId);
    this.progress.percentage = 100;

    // Calculate duration
    if (this.startedAt) {
        this.duration = this.completedAt - this.startedAt;
    }

    return await this.save();
};

/**
 * Mark workflow as failed
 * @param {String} reason - Failure reason
 * @param {Object} error - Error object
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.fail = async function(reason, error = null) {
    this.status = 'failed';
    this.completedAt = new Date();
    this.failureReason = reason;

    if (error) {
        this.lastError = {
            stepOrder: this.currentStep,
            message: error.message || reason,
            timestamp: new Date(),
            retryable: error.retryable || false
        };
    }

    // Calculate duration
    if (this.startedAt) {
        this.duration = this.completedAt - this.startedAt;
    }

    return await this.save();
};

/**
 * Advance to next step
 * @param {Object} stepResult - Result from the completed step
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.advanceStep = async function(stepResult = {}) {
    // Update current step execution record
    const currentExecution = this.stepHistory.find(
        h => h.stepOrder === this.currentStep && h.status === 'running'
    );

    if (currentExecution) {
        currentExecution.status = 'completed';
        currentExecution.completedAt = new Date();
        currentExecution.result = stepResult;
        if (currentExecution.startedAt) {
            currentExecution.duration = currentExecution.completedAt - currentExecution.startedAt;
        }

        this.progress.completedSteps++;
    }

    // Move to next step
    this.currentStep++;

    // Update progress percentage
    if (this.progress.totalSteps > 0) {
        this.progress.percentage = Math.round(
            (this.progress.completedSteps / this.progress.totalSteps) * 100
        );
    }

    return await this.save();
};

/**
 * Record step execution
 * @param {Object} stepData - Step execution data
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.recordStepExecution = async function(stepData) {
    this.stepHistory.push({
        stepOrder: stepData.order,
        stepName: stepData.name,
        stepType: stepData.type,
        status: stepData.status || 'running',
        startedAt: new Date(),
        assignedTo: stepData.assignedTo,
        metadata: stepData.metadata || {}
    });

    this.currentStepName = stepData.name;

    return await this.save();
};

/**
 * Update step status
 * @param {Number} stepOrder - Step order
 * @param {String} status - New status
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.updateStepStatus = async function(stepOrder, status, data = {}) {
    const execution = this.stepHistory.find(
        h => h.stepOrder === stepOrder && ['pending', 'running'].includes(h.status)
    );

    if (execution) {
        execution.status = status;

        if (status === 'completed') {
            execution.completedAt = new Date();
            execution.completedBy = data.completedBy;
            if (execution.startedAt) {
                execution.duration = execution.completedAt - execution.startedAt;
            }
            this.progress.completedSteps++;
        } else if (status === 'failed') {
            execution.completedAt = new Date();
            execution.error = data.error;
            this.progress.failedSteps++;
        } else if (status === 'skipped') {
            execution.completedAt = new Date();
            this.progress.skippedSteps++;
        }

        if (data.result) {
            execution.result = data.result;
        }

        if (data.notes) {
            execution.notes = data.notes;
        }

        // Update progress percentage
        if (this.progress.totalSteps > 0) {
            this.progress.percentage = Math.round(
                (this.progress.completedSteps / this.progress.totalSteps) * 100
            );
        }
    }

    return await this.save();
};

/**
 * Get current step execution
 * @returns {Object} - Current step execution record
 */
workflowInstanceSchema.methods.getCurrentStepExecution = function() {
    return this.stepHistory.find(
        h => h.stepOrder === this.currentStep
    );
};

/**
 * Get variable value
 * @param {String} name - Variable name
 * @returns {*} - Variable value
 */
workflowInstanceSchema.methods.getVariable = function(name) {
    return this.variables.get(name);
};

/**
 * Set variable value
 * @param {String} name - Variable name
 * @param {*} value - Variable value
 * @returns {Promise<Object>} - Updated instance
 */
workflowInstanceSchema.methods.setVariable = async function(name, value) {
    this.variables.set(name, value);
    return await this.save();
};

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
// STATICS
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

/**
 * Get active workflows for entity
 * @param {String} entityType - Entity type
 * @param {String} entityId - Entity ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} - Active workflow instances
 */
workflowInstanceSchema.statics.getActiveForEntity = function(entityType, entityId, firmId) {
    return this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        status: { $in: ['pending', 'running', 'paused'] }
    })
        .populate('templateId', 'name category')
        .populate('startedBy', 'firstName lastName email')
        .sort({ startedAt: -1 })
        .lean();
};

/**
 * Get statistics for a template
 * @param {String} templateId - Template ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Statistics
 */
workflowInstanceSchema.statics.getTemplateStats = async function(templateId, firmId) {
    const stats = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                templateId: new mongoose.Types.ObjectId(templateId)
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                failed: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                cancelled: {
                    $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                },
                active: {
                    $sum: { $cond: [{ $in: ['$status', ['pending', 'running', 'paused']] }, 1, 0] }
                },
                avgDuration: { $avg: '$duration' },
                avgProgress: { $avg: '$progress.percentage' }
            }
        }
    ]);

    return stats[0] || {
        total: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        active: 0,
        avgDuration: 0,
        avgProgress: 0
    };
};

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
// MIDDLEWARE
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

/**
 * Pre-save hook to calculate duration
 */
workflowInstanceSchema.pre('save', function(next) {
    // Update duration if workflow is completed/failed/cancelled
    if (this.isFinished && this.startedAt && this.completedAt && !this.duration) {
        this.duration = this.completedAt - this.startedAt;
    }

    next();
});

/**
 * Post-save hook to update template statistics
 */
workflowInstanceSchema.post('save', async function(doc) {
    try {
        const WorkflowTemplate = mongoose.model('WorkflowTemplate');

        // Update template stats on completion
        if (doc.status === 'completed' && doc.isModified('status')) {
            await WorkflowTemplate.findByIdAndUpdate(
                doc.templateId,
                {
                    $inc: { 'stats.completedInstances': 1 },
                    $set: { 'stats.lastUsed': new Date() }
                }
            );
        }

        // Update template stats on failure
        if (doc.status === 'failed' && doc.isModified('status')) {
            await WorkflowTemplate.findByIdAndUpdate(
                doc.templateId,
                {
                    $inc: { 'stats.failedInstances': 1 }
                }
            );
        }
    } catch (error) {
        // Log error but don't fail the save
        console.error('Error updating template stats:', error);
    }
});

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');

/**
 * Apply Row-Level Security (RLS) plugin to enforce firm-level data isolation.
 */
workflowInstanceSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('WorkflowInstance', workflowInstanceSchema);
