const mongoose = require('mongoose');

/**
 * Lifecycle Workflow Model - HR-style Lifecycle Management
 * Supports onboarding, offboarding, and other lifecycle workflows
 * for employees, customers, deals, and clients
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Document schema for task documents
const documentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocumentTemplate'
    },
    requiresSignature: {
        type: Boolean,
        default: false
    }
}, { _id: true });

// Automation schema for task automations
const automationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['email', 'notification', 'webhook', 'create_task', 'assign_user', 'update_field'],
        required: true
    },
    config: mongoose.Schema.Types.Mixed,
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true });

// Task schema for stage tasks
const taskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    assigneeType: {
        type: String,
        enum: ['owner', 'role', 'specific', 'auto'],
        required: true,
        default: 'owner'
    },
    assigneeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assigneeRole: String,
    dueOffset: {
        type: Number,
        default: 0,
        comment: 'Days from stage start'
    },
    required: {
        type: Boolean,
        default: true
    },
    automations: [automationSchema],
    dependencies: [{
        type: String,
        comment: 'Task names that must be completed first'
    }],
    documents: [documentSchema],
    order: {
        type: Number,
        default: 0
    }
}, { _id: true });

// Advance condition schema for stage advancement
const advanceConditionSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists', 'not_exists'],
        required: true
    },
    value: mongoose.Schema.Types.Mixed
}, { _id: true });

// Stage schema for workflow stages
const stageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        required: true
    },
    tasks: [taskSchema],
    autoAdvance: {
        type: Boolean,
        default: false
    },
    advanceConditions: [advanceConditionSchema],
    description: String,
    durationDays: Number
}, { _id: true });

// Notification schema for workflow notifications
const notificationSchema = new mongoose.Schema({
    event: {
        type: String,
        enum: ['workflow_started', 'workflow_completed', 'stage_started', 'stage_completed',
               'task_assigned', 'task_completed', 'task_overdue', 'workflow_stalled'],
        required: true
    },
    recipients: [{
        type: String,
        enum: ['owner', 'assignee', 'manager', 'hr', 'specific_user', 'specific_role']
    }],
    recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    recipientRoles: [String],
    template: String,
    channels: [{
        type: String,
        enum: ['email', 'sms', 'in_app', 'webhook'],
        default: 'in_app'
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE WORKFLOW SCHEMA
// ═══════════════════════════════════════════════════════════════

const lifecycleWorkflowSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    entityType: {
        type: String,
        enum: ['employee', 'customer', 'deal', 'client'],
        required: true,
        index: true
    },
    lifecycleType: {
        type: String,
        enum: ['onboarding', 'active', 'offboarding', 'lifecycle_event'],
        required: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    stages: [stageSchema],
    notifications: [notificationSchema],
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP - Multi-tenancy
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
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// LIFECYCLE INSTANCE SCHEMA
// ═══════════════════════════════════════════════════════════════

// Stage history schema for instance tracking
const stageHistorySchema = new mongoose.Schema({
    stage: {
        type: Number,
        required: true
    },
    stageName: String,
    activatedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    duration: Number, // Duration in days
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: true });

// Task completion schema for instance tracking
const taskCompletionSchema = new mongoose.Schema({
    taskRef: {
        type: String,
        required: true,
        comment: 'Reference to task by stage.order and task name'
    },
    taskName: String,
    stageOrder: Number,
    completedAt: {
        type: Date,
        default: Date.now
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: String,
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileKey: String,
        uploadedAt: { type: Date, default: Date.now }
    }]
}, { _id: true });

const lifecycleInstanceSchema = new mongoose.Schema({
    workflowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LifecycleWorkflow',
        required: true,
        index: true
    },
    entityType: {
        type: String,
        enum: ['employee', 'customer', 'deal', 'client'],
        required: true,
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    entityName: String, // Cached for display
    currentStage: {
        type: Number,
        default: 0,
        index: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'cancelled'],
        default: 'in_progress',
        index: true
    },
    stageHistory: [stageHistorySchema],
    taskCompletions: [taskCompletionSchema],

    // Progress tracking
    progress: {
        totalTasks: { type: Number, default: 0 },
        completedTasks: { type: Number, default: 0 },
        completionPercentage: { type: Number, default: 0, min: 0, max: 100 }
    },

    // Cancellation details
    cancelledAt: Date,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancellationReason: String,

    // Notes and metadata
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,

    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP - Multi-tenancy
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES - LIFECYCLE WORKFLOW
// ═══════════════════════════════════════════════════════════════
lifecycleWorkflowSchema.index({ firmId: 1, entityType: 1 });
lifecycleWorkflowSchema.index({ firmId: 1, lifecycleType: 1 });
lifecycleWorkflowSchema.index({ firmId: 1, isActive: 1 });
lifecycleWorkflowSchema.index({ firmId: 1, entityType: 1, lifecycleType: 1 });
lifecycleWorkflowSchema.index({ createdBy: 1 });

// ═══════════════════════════════════════════════════════════════
// INDEXES - LIFECYCLE INSTANCE
// ═══════════════════════════════════════════════════════════════
lifecycleInstanceSchema.index({ firmId: 1, status: 1 });
lifecycleInstanceSchema.index({ firmId: 1, entityType: 1 });
lifecycleInstanceSchema.index({ firmId: 1, entityId: 1 });
lifecycleInstanceSchema.index({ firmId: 1, workflowId: 1 });
lifecycleInstanceSchema.index({ firmId: 1, currentStage: 1 });
lifecycleInstanceSchema.index({ firmId: 1, status: 1, entityType: 1 });
lifecycleInstanceSchema.index({ entityId: 1, entityType: 1 });
lifecycleInstanceSchema.index({ workflowId: 1, status: 1 });
lifecycleInstanceSchema.index({ startedAt: -1 });
lifecycleInstanceSchema.index({ completedAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS - LIFECYCLE WORKFLOW
// ═══════════════════════════════════════════════════════════════

// Ensure stage orders are sequential
lifecycleWorkflowSchema.pre('save', function(next) {
    if (this.stages && this.stages.length > 0) {
        // Sort stages by order
        this.stages.sort((a, b) => a.order - b.order);

        // Ensure orders are sequential starting from 0
        this.stages.forEach((stage, index) => {
            stage.order = index;
        });
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS - LIFECYCLE INSTANCE
// ═══════════════════════════════════════════════════════════════

// Calculate progress and update stage history
lifecycleInstanceSchema.pre('save', function(next) {
    // Calculate task completion progress
    if (this.taskCompletions) {
        this.progress.completedTasks = this.taskCompletions.length;

        if (this.progress.totalTasks > 0) {
            this.progress.completionPercentage = Math.round(
                (this.progress.completedTasks / this.progress.totalTasks) * 100
            );
        }
    }

    // Update stage history duration if stage is completed
    if (this.stageHistory && this.stageHistory.length > 0) {
        this.stageHistory.forEach(history => {
            if (history.completedAt && history.activatedAt) {
                const durationMs = history.completedAt - history.activatedAt;
                history.duration = Math.round(durationMs / (1000 * 60 * 60 * 24)); // Convert to days
            }
        });
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS - LIFECYCLE WORKFLOW
// ═══════════════════════════════════════════════════════════════

// Get total number of tasks across all stages
lifecycleWorkflowSchema.methods.getTotalTasks = function() {
    let total = 0;
    if (this.stages) {
        this.stages.forEach(stage => {
            if (stage.tasks) {
                total += stage.tasks.length;
            }
        });
    }
    return total;
};

// Get tasks for a specific stage
lifecycleWorkflowSchema.methods.getStageByOrder = function(order) {
    return this.stages.find(stage => stage.order === order);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS - LIFECYCLE INSTANCE
// ═══════════════════════════════════════════════════════════════

// Advance to next stage
lifecycleInstanceSchema.methods.advanceToNextStage = async function() {
    const workflow = await mongoose.model('LifecycleWorkflow').findById(this.workflowId);

    if (!workflow) {
        throw new Error('Workflow not found');
    }

    // Complete current stage in history
    if (this.stageHistory.length > 0) {
        const currentHistory = this.stageHistory[this.stageHistory.length - 1];
        if (!currentHistory.completedAt) {
            currentHistory.completedAt = new Date();
        }
    }

    // Move to next stage
    const nextStage = this.currentStage + 1;

    if (nextStage >= workflow.stages.length) {
        // Workflow completed
        this.status = 'completed';
        this.completedAt = new Date();
        this.currentStage = workflow.stages.length - 1;
    } else {
        this.currentStage = nextStage;

        // Add to stage history
        const stage = workflow.stages[nextStage];
        this.stageHistory.push({
            stage: nextStage,
            stageName: stage.name,
            activatedAt: new Date()
        });
    }

    return this.save();
};

// Mark task as completed
lifecycleInstanceSchema.methods.completeTask = function(taskRef, userId, notes, attachments) {
    // Check if task is already completed
    const existing = this.taskCompletions.find(tc => tc.taskRef === taskRef);

    if (existing) {
        return false; // Task already completed
    }

    // Add task completion
    this.taskCompletions.push({
        taskRef,
        completedAt: new Date(),
        completedBy: userId,
        notes,
        attachments
    });

    return true;
};

// Check if all required tasks in current stage are completed
lifecycleInstanceSchema.methods.isCurrentStageComplete = async function() {
    const workflow = await mongoose.model('LifecycleWorkflow').findById(this.workflowId);

    if (!workflow) {
        throw new Error('Workflow not found');
    }

    const stage = workflow.stages[this.currentStage];
    if (!stage) {
        return false;
    }

    // Get required tasks in current stage
    const requiredTasks = stage.tasks.filter(task => task.required);

    if (requiredTasks.length === 0) {
        return true; // No required tasks
    }

    // Check if all required tasks are completed
    for (const task of requiredTasks) {
        const taskRef = `${this.currentStage}-${task.name}`;
        const completed = this.taskCompletions.find(tc => tc.taskRef === taskRef);

        if (!completed) {
            return false; // Required task not completed
        }
    }

    return true;
};

// Get completion progress for current stage
lifecycleInstanceSchema.methods.getCurrentStageProgress = async function() {
    const workflow = await mongoose.model('LifecycleWorkflow').findById(this.workflowId);

    if (!workflow) {
        throw new Error('Workflow not found');
    }

    const stage = workflow.stages[this.currentStage];
    if (!stage || !stage.tasks || stage.tasks.length === 0) {
        return { total: 0, completed: 0, percentage: 100 };
    }

    const total = stage.tasks.length;
    let completed = 0;

    for (const task of stage.tasks) {
        const taskRef = `${this.currentStage}-${task.name}`;
        const isCompleted = this.taskCompletions.find(tc => tc.taskRef === taskRef);

        if (isCompleted) {
            completed++;
        }
    }

    return {
        total,
        completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS - LIFECYCLE WORKFLOW
// ═══════════════════════════════════════════════════════════════

// Get workflows by entity type and lifecycle type
lifecycleWorkflowSchema.statics.getByType = function(firmId, entityType, lifecycleType) {
    return this.find({
        firmId,
        entityType,
        lifecycleType,
        isActive: true
    }).sort({ createdAt: -1 });
};

// Get active workflows for firm
lifecycleWorkflowSchema.statics.getActiveWorkflows = function(firmId, filters = {}) {
    return this.find({
        firmId,
        isActive: true,
        ...filters
    })
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS - LIFECYCLE INSTANCE
// ═══════════════════════════════════════════════════════════════

// Get instances for firm
lifecycleInstanceSchema.statics.getInstances = function(firmId, filters = {}) {
    return this.find({
        firmId,
        ...filters
    })
    .populate('workflowId', 'name entityType lifecycleType')
    .populate('createdBy', 'firstName lastName email')
    .populate('taskCompletions.completedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Get active instances
lifecycleInstanceSchema.statics.getActiveInstances = function(firmId, entityType) {
    const query = {
        firmId,
        status: 'in_progress'
    };

    if (entityType) {
        query.entityType = entityType;
    }

    return this.find(query)
        .populate('workflowId', 'name entityType lifecycleType')
        .populate('createdBy', 'firstName lastName email')
        .sort({ startedAt: -1 });
};

// Get instances by entity
lifecycleInstanceSchema.statics.getByEntity = function(firmId, entityId, entityType) {
    return this.find({
        firmId,
        entityId,
        entityType
    })
    .populate('workflowId', 'name lifecycleType')
    .sort({ startedAt: -1 });
};

// Get statistics
lifecycleInstanceSchema.statics.getStats = async function(firmId, entityType) {
    const query = { firmId };
    if (entityType) {
        query.entityType = entityType;
    }

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalInstances: { $sum: 1 },
                inProgress: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
                },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                cancelled: {
                    $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                },
                avgCompletionRate: { $avg: '$progress.completionPercentage' }
            }
        }
    ]);

    if (!stats) {
        return {
            totalInstances: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0,
            averageCompletionRate: 0
        };
    }

    return {
        totalInstances: stats.totalInstances,
        inProgress: stats.inProgress,
        completed: stats.completed,
        cancelled: stats.cancelled,
        averageCompletionRate: Math.round(stats.avgCompletionRate || 0)
    };
};

// ═══════════════════════════════════════════════════════════════
// MODELS EXPORT
// ═══════════════════════════════════════════════════════════════

const LifecycleWorkflow = mongoose.model('LifecycleWorkflow', lifecycleWorkflowSchema);
const LifecycleInstance = mongoose.model('LifecycleInstance', lifecycleInstanceSchema);

module.exports = {
    LifecycleWorkflow,
    LifecycleInstance
};
