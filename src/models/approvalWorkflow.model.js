/**
 * Approval Workflow Model - Multi-Level Approval Chain Configuration
 *
 * Implements configurable approval workflows with multiple levels, delegation,
 * escalation, and conditional routing similar to enterprise systems like Salesforce,
 * SAP, and Oracle.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Trigger Condition Sub-Schema
const triggerConditionSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    operator: {
        type: String,
        enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'contains', 'not_contains', 'in', 'not_in', 'is_empty', 'is_not_empty'],
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    }
}, { _id: false });

// Skip Condition Sub-Schema
const skipConditionSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    operator: {
        type: String,
        enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'contains', 'not_contains', 'in', 'not_in', 'is_empty', 'is_not_empty'],
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    }
}, { _id: false });

// Approvers Configuration Sub-Schema
const approversSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['specific', 'role', 'manager', 'dynamic'],
        required: true,
        default: 'specific'
    },
    // For type: 'specific' - list of specific user IDs
    userIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // For type: 'role' - role ID or name
    roleId: {
        type: String
    },
    // For type: 'dynamic' - field path to resolve approvers dynamically
    dynamicField: {
        type: String
    }
}, { _id: false });

// Escalation Configuration Sub-Schema
const escalationSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: false
    },
    afterHours: {
        type: Number,
        default: 24,
        min: 1
    },
    escalateTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { _id: false });

// Delegation Configuration Sub-Schema
const delegationSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: false
    },
    delegateTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    validFrom: {
        type: Date
    },
    validTo: {
        type: Date
    }
}, { _id: false });

// Approval Level Sub-Schema
const approvalLevelSchema = new mongoose.Schema({
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
    approvers: {
        type: approversSchema,
        required: true
    },
    approvalType: {
        type: String,
        enum: ['any', 'all', 'majority'],
        default: 'any'
    },
    escalation: escalationSchema,
    delegation: delegationSchema,
    skipConditions: [skipConditionSchema]
}, { _id: true });

// Action Configuration Sub-Schema (for onApproval/onRejection)
const actionSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['send_email', 'send_notification', 'update_field', 'create_task', 'webhook', 'run_script'],
        required: true
    },
    params: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// APPROVAL WORKFLOW SCHEMA
// ═══════════════════════════════════════════════════════════════

const approvalWorkflowSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION
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
    // WORKFLOW DEFINITION
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        maxlength: 200,
        trim: true
    },
    description: {
        type: String,
        maxlength: 1000,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTITY CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        enum: ['deal', 'quote', 'expense', 'leave_request', 'invoice', 'purchase_order', 'contract', 'payment', 'refund', 'time_off', 'reimbursement', 'custom'],
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER CONDITIONS
    // ═══════════════════════════════════════════════════════════════
    triggerConditions: [triggerConditionSchema],

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL LEVELS (Multi-Level Chain)
    // ═══════════════════════════════════════════════════════════════
    levels: {
        type: [approvalLevelSchema],
        required: true,
        validate: {
            validator: function(levels) {
                return levels && levels.length > 0;
            },
            message: 'At least one approval level is required'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTIONS (Post-Approval/Rejection)
    // ═══════════════════════════════════════════════════════════════
    onApproval: [actionSchema],
    onRejection: [actionSchema],

    // ═══════════════════════════════════════════════════════════════
    // SLA & NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    slaHours: {
        type: Number,
        min: 0,
        default: 48
    },
    notifyOnPending: {
        type: Boolean,
        default: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT & COMPLIANCE
    // ═══════════════════════════════════════════════════════════════
    auditRequired: {
        type: Boolean,
        default: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
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
// APPROVAL INSTANCE SCHEMA
// ═══════════════════════════════════════════════════════════════

// Approver Decision Sub-Schema
const approverDecisionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    decision: {
        type: String,
        enum: ['approved', 'rejected', 'abstained'],
        required: true
    },
    decidedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    comments: {
        type: String,
        maxlength: 1000
    },
    delegatedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: false });

// Level History Sub-Schema
const levelHistorySchema = new mongoose.Schema({
    level: {
        type: Number,
        required: true
    },
    approvers: [approverDecisionSchema],
    startedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    completedAt: {
        type: Date
    },
    skipped: {
        type: Boolean,
        default: false
    },
    skipReason: {
        type: String,
        maxlength: 500
    }
}, { _id: false });

// Audit Log Entry Sub-Schema
const auditLogEntrySchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['created', 'submitted', 'approved', 'rejected', 'escalated', 'delegated', 'cancelled', 'level_completed', 'level_skipped', 'reassigned'],
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    ipAddress: {
        type: String
    }
}, { _id: false });

const approvalInstanceSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // WORKFLOW REFERENCE
    // ═══════════════════════════════════════════════════════════════
    workflowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApprovalWorkflow',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTITY REFERENCE
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        required: true,
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUEST DETAILS
    // ═══════════════════════════════════════════════════════════════
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    requestedAt: {
        type: Date,
        default: Date.now,
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL PROGRESS
    // ═══════════════════════════════════════════════════════════════
    currentLevel: {
        type: Number,
        default: 0,
        min: 0
    },
    levelHistory: [levelHistorySchema],

    // ═══════════════════════════════════════════════════════════════
    // COMPLETION
    // ═══════════════════════════════════════════════════════════════
    completedAt: {
        type: Date
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    finalComments: {
        type: String,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT LOG
    // ═══════════════════════════════════════════════════════════════
    auditLog: [auditLogEntrySchema]
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES - APPROVAL WORKFLOW
// ═══════════════════════════════════════════════════════════════
approvalWorkflowSchema.index({ firmId: 1, entityType: 1, isActive: 1 });
approvalWorkflowSchema.index({ firmId: 1, isActive: 1, createdAt: -1 });
approvalWorkflowSchema.index({ entityType: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// INDEXES - APPROVAL INSTANCE
// ═══════════════════════════════════════════════════════════════
approvalInstanceSchema.index({ firmId: 1, status: 1, createdAt: -1 });
approvalInstanceSchema.index({ firmId: 1, requestedBy: 1, status: 1 });
approvalInstanceSchema.index({ workflowId: 1, status: 1 });
approvalInstanceSchema.index({ entityType: 1, entityId: 1 });
approvalInstanceSchema.index({ firmId: 1, currentLevel: 1, status: 1 });
approvalInstanceSchema.index({ status: 1, requestedAt: 1 }); // For SLA monitoring

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

approvalWorkflowSchema.pre('save', function(next) {
    // Sort levels by order
    if (this.levels && this.levels.length > 0) {
        this.levels.sort((a, b) => a.order - b.order);
    }
    next();
});

approvalInstanceSchema.pre('save', function(next) {
    // Auto-update completedAt when status changes to approved/rejected/cancelled
    if (this.isModified('status') && ['approved', 'rejected', 'cancelled'].includes(this.status) && !this.completedAt) {
        this.completedAt = new Date();
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS - APPROVAL WORKFLOW
// ═══════════════════════════════════════════════════════════════

/**
 * Get active workflows for a specific entity type
 */
approvalWorkflowSchema.statics.getActiveWorkflows = async function(firmId, entityType) {
    return this.find({
        firmId,
        entityType,
        isActive: true
    })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Find matching workflow based on trigger conditions
 */
approvalWorkflowSchema.statics.findMatchingWorkflow = async function(firmId, entityType, entityData) {
    const workflows = await this.find({
        firmId,
        entityType,
        isActive: true
    }).lean();

    // Find first workflow where all trigger conditions match
    for (const workflow of workflows) {
        if (!workflow.triggerConditions || workflow.triggerConditions.length === 0) {
            return workflow; // No conditions = always match
        }

        const allConditionsMet = workflow.triggerConditions.every(condition => {
            return evaluateCondition(condition, entityData);
        });

        if (allConditionsMet) {
            return workflow;
        }
    }

    return null;
};

/**
 * Create or update workflow
 */
approvalWorkflowSchema.statics.upsertWorkflow = async function(firmId, workflowId, data, userId) {
    if (workflowId) {
        const workflow = await this.findOne({ _id: workflowId, firmId });
        if (!workflow) {
            throw new Error('Workflow not found');
        }
        Object.assign(workflow, data);
        workflow.updatedBy = userId;
        return await workflow.save();
    }

    return this.create({
        ...data,
        firmId,
        createdBy: userId
    });
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS - APPROVAL INSTANCE
// ═══════════════════════════════════════════════════════════════

/**
 * Create new approval instance
 */
approvalInstanceSchema.statics.createInstance = async function(data) {
    const instance = new this(data);

    // Initialize first level
    if (instance.currentLevel === 0) {
        instance.currentLevel = 1;
    }

    // Add audit log entry
    instance.auditLog.push({
        action: 'created',
        userId: data.requestedBy,
        timestamp: new Date(),
        details: { entityType: data.entityType, entityId: data.entityId }
    });

    await instance.save();
    return instance;
};

/**
 * Get pending approvals for a user
 */
approvalInstanceSchema.statics.getPendingForUser = async function(firmId, userId, options = {}) {
    const ApprovalWorkflow = mongoose.model('ApprovalWorkflow');
    const { limit = 50, skip = 0 } = options;

    // Get all pending instances
    const instances = await this.find({
        firmId,
        status: 'pending'
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('requestedBy', 'firstName lastName email avatar')
    .populate('workflowId')
    .lean();

    // Filter instances where user is an approver at current level
    const userInstances = [];
    for (const instance of instances) {
        const workflow = instance.workflowId;
        if (!workflow || !workflow.levels) continue;

        const currentLevelConfig = workflow.levels.find(l => l.order === instance.currentLevel);
        if (!currentLevelConfig) continue;

        // Check if user is an approver at this level
        const isApprover = await isUserApproverAtLevel(userId, currentLevelConfig, instance);
        if (isApprover) {
            userInstances.push(instance);
        }
    }

    return userInstances;
};

/**
 * Get user's submitted requests
 */
approvalInstanceSchema.statics.getMyRequests = async function(firmId, userId, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    const query = { firmId, requestedBy: userId };
    if (status) query.status = status;

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('workflowId', 'name description')
        .populate('completedBy', 'firstName lastName email')
        .lean();
};

/**
 * Record approval decision
 */
approvalInstanceSchema.statics.recordDecision = async function(instanceId, userId, decision, comments, ipAddress) {
    const instance = await this.findById(instanceId).populate('workflowId');

    if (!instance) {
        throw new Error('Approval instance not found');
    }

    if (instance.status !== 'pending') {
        throw new Error('Instance is no longer pending approval');
    }

    const workflow = instance.workflowId;
    const currentLevelConfig = workflow.levels.find(l => l.order === instance.currentLevel);

    if (!currentLevelConfig) {
        throw new Error('Invalid approval level');
    }

    // Check if user is authorized approver
    const isApprover = await isUserApproverAtLevel(userId, currentLevelConfig, instance);
    if (!isApprover) {
        throw new Error('User is not authorized to approve at this level');
    }

    // Find or create level history entry
    let levelHistory = instance.levelHistory.find(lh => lh.level === instance.currentLevel);
    if (!levelHistory) {
        levelHistory = {
            level: instance.currentLevel,
            approvers: [],
            startedAt: new Date()
        };
        instance.levelHistory.push(levelHistory);
    }

    // Check if user already decided
    const existingDecision = levelHistory.approvers.find(a => a.userId.toString() === userId.toString());
    if (existingDecision) {
        throw new Error('User has already made a decision for this level');
    }

    // Record decision
    levelHistory.approvers.push({
        userId,
        decision,
        decidedAt: new Date(),
        comments
    });

    // Add audit log
    instance.auditLog.push({
        action: decision === 'approved' ? 'approved' : 'rejected',
        userId,
        timestamp: new Date(),
        details: { level: instance.currentLevel, decision, comments },
        ipAddress
    });

    // Check if level is complete
    const levelComplete = await checkLevelCompletion(instance, currentLevelConfig, levelHistory);

    if (levelComplete) {
        levelHistory.completedAt = new Date();

        // If rejected, mark entire instance as rejected
        if (decision === 'rejected') {
            instance.status = 'rejected';
            instance.completedAt = new Date();
            instance.completedBy = userId;
            instance.finalComments = comments;
        } else {
            // Move to next level or complete
            if (instance.currentLevel >= workflow.levels.length) {
                // All levels approved
                instance.status = 'approved';
                instance.completedAt = new Date();
                instance.completedBy = userId;
            } else {
                // Move to next level
                instance.currentLevel += 1;
                instance.auditLog.push({
                    action: 'level_completed',
                    userId,
                    timestamp: new Date(),
                    details: { completedLevel: instance.currentLevel - 1, nextLevel: instance.currentLevel }
                });
            }
        }
    }

    await instance.save();
    return instance;
};

/**
 * Cancel approval instance
 */
approvalInstanceSchema.statics.cancelInstance = async function(instanceId, userId, reason) {
    const instance = await this.findById(instanceId);

    if (!instance) {
        throw new Error('Approval instance not found');
    }

    if (instance.status !== 'pending') {
        throw new Error('Only pending instances can be cancelled');
    }

    // Only requester can cancel
    if (instance.requestedBy.toString() !== userId.toString()) {
        throw new Error('Only the requester can cancel this approval');
    }

    instance.status = 'cancelled';
    instance.completedAt = new Date();
    instance.completedBy = userId;
    instance.finalComments = reason;

    instance.auditLog.push({
        action: 'cancelled',
        userId,
        timestamp: new Date(),
        details: { reason }
    });

    await instance.save();
    return instance;
};

/**
 * Get approval statistics
 */
approvalInstanceSchema.statics.getStats = async function(firmId, options = {}) {
    const { startDate, endDate, entityType } = options;

    const matchQuery = { firmId };
    if (entityType) matchQuery.entityType = entityType;
    if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const result = {
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        total: 0
    };

    stats.forEach(s => {
        result[s._id] = s.count;
        result.total += s.count;
    });

    // Calculate average approval time
    const completedInstances = await this.find({
        ...matchQuery,
        status: { $in: ['approved', 'rejected'] },
        completedAt: { $exists: true }
    });

    if (completedInstances.length > 0) {
        const totalTime = completedInstances.reduce((sum, instance) => {
            const duration = instance.completedAt - instance.requestedAt;
            return sum + duration;
        }, 0);
        result.avgApprovalTimeHours = Math.round(totalTime / completedInstances.length / (1000 * 60 * 60));
    } else {
        result.avgApprovalTimeHours = 0;
    }

    return result;
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate a condition against entity data
 */
function evaluateCondition(condition, data) {
    const fieldValue = getNestedValue(data, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
        case 'equals':
            return fieldValue == conditionValue;
        case 'not_equals':
            return fieldValue != conditionValue;
        case 'greater_than':
            return Number(fieldValue) > Number(conditionValue);
        case 'less_than':
            return Number(fieldValue) < Number(conditionValue);
        case 'greater_than_or_equal':
            return Number(fieldValue) >= Number(conditionValue);
        case 'less_than_or_equal':
            return Number(fieldValue) <= Number(conditionValue);
        case 'contains':
            return String(fieldValue).includes(String(conditionValue));
        case 'not_contains':
            return !String(fieldValue).includes(String(conditionValue));
        case 'in':
            return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
        case 'not_in':
            return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
        case 'is_empty':
            return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
        case 'is_not_empty':
            return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
        default:
            return false;
    }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Check if user is approver at given level
 */
async function isUserApproverAtLevel(userId, levelConfig, instance) {
    const approversConfig = levelConfig.approvers;

    switch (approversConfig.type) {
        case 'specific':
            return approversConfig.userIds.some(id => id.toString() === userId.toString());

        case 'role':
            // Would need to check user's role - implementation depends on your role system
            const User = mongoose.model('User');
            const user = await User.findById(userId);
            return user && user.role === approversConfig.roleId;

        case 'manager':
            // Would need to check if user is the manager of the requester
            const User2 = mongoose.model('User');
            const requester = await User2.findById(instance.requestedBy);
            return requester && requester.managerId && requester.managerId.toString() === userId.toString();

        case 'dynamic':
            // Resolve approvers dynamically from entity
            // This would need to fetch the entity and check the dynamic field
            return false; // Placeholder

        default:
            return false;
    }
}

/**
 * Check if approval level is complete
 */
async function checkLevelCompletion(instance, levelConfig, levelHistory) {
    const approvers = levelHistory.approvers;
    const approvedCount = approvers.filter(a => a.decision === 'approved').length;
    const rejectedCount = approvers.filter(a => a.decision === 'rejected').length;

    switch (levelConfig.approvalType) {
        case 'any':
            // Any approval or rejection completes the level
            return approvedCount > 0 || rejectedCount > 0;

        case 'all':
            // All approvers must decide
            const totalApprovers = await getTotalApproversCount(levelConfig, instance);
            return approvers.length >= totalApprovers;

        case 'majority':
            // Majority must approve
            const total = await getTotalApproversCount(levelConfig, instance);
            const majorityThreshold = Math.ceil(total / 2);
            return approvedCount >= majorityThreshold || rejectedCount > (total - majorityThreshold);

        default:
            return false;
    }
}

/**
 * Get total number of approvers at a level
 */
async function getTotalApproversCount(levelConfig, instance) {
    const approversConfig = levelConfig.approvers;

    switch (approversConfig.type) {
        case 'specific':
            return approversConfig.userIds.length;

        case 'role':
            // Count users with this role
            const User = mongoose.model('User');
            return await User.countDocuments({ role: approversConfig.roleId, firmId: instance.firmId });

        case 'manager':
            return 1; // Usually just one manager

        case 'dynamic':
            return 1; // Placeholder

        default:
            return 1;
    }
}

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
// Removed firmIsolationPlugin - using direct RLS queries instead

// ═══════════════════════════════════════════════════════════════
// EXPORT MODELS
// ═══════════════════════════════════════════════════════════════

const ApprovalWorkflow = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);
const ApprovalInstance = mongoose.model('ApprovalInstance', approvalInstanceSchema);

module.exports = {
    ApprovalWorkflow,
    ApprovalInstance
};
