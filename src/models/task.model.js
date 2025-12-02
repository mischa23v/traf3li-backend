const mongoose = require('mongoose');

// Subtask schema
const subtaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    autoReset: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
}, { _id: true });

// Time session schema
const timeSessionSchema = new mongoose.Schema({
    startedAt: { type: Date, required: true },
    endedAt: Date,
    duration: Number, // minutes
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    isBillable: { type: Boolean, default: true }
}, { _id: true });

// Checklist schema
const checklistSchema = new mongoose.Schema({
    title: { type: String, required: true },
    items: [{
        text: String,
        completed: { type: Boolean, default: false },
        completedAt: Date
    }]
}, { _id: true });

// Task reminder schema
const taskReminderSchema = new mongoose.Schema({
    type: { type: String, enum: ['due_date', 'start_date', 'custom'], default: 'due_date' },
    beforeMinutes: { type: Number, required: true },
    sent: { type: Boolean, default: false },
    sentAt: Date
}, { _id: true });

// Comment schema
const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
}, { _id: true });

// Attachment schema
const attachmentSchema = new mongoose.Schema({
    fileName: String,
    fileUrl: String,
    fileKey: String, // S3 key for the file (used for S3 storage)
    fileType: String,
    fileSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    storageType: { type: String, enum: ['local', 's3'], default: 'local' },
    // Document editing support (TipTap compatible)
    isEditable: { type: Boolean, default: false },
    documentContent: String, // HTML content for rendering
    documentJson: mongoose.Schema.Types.Mixed, // TipTap JSON format for editing
    contentFormat: { type: String, enum: ['html', 'tiptap-json', 'markdown'], default: 'html' },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastEditedAt: Date,
    // Voice memo support
    isVoiceMemo: { type: Boolean, default: false },
    duration: Number, // Duration in seconds for audio files
    transcription: String // Optional transcription for voice memos
}, { _id: true });

// History entry schema
const historyEntrySchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['created', 'updated', 'status_changed', 'assigned', 'completed', 'reopened',
               'commented', 'attachment_added', 'attachment_removed', 'subtask_added',
               'subtask_completed', 'subtask_uncompleted', 'subtask_deleted',
               'dependency_added', 'dependency_removed', 'created_from_template']
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    changes: mongoose.Schema.Types.Mixed,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    details: String,
    timestamp: { type: Date, default: Date.now }
}, { _id: true });

// Workflow rule schema
const workflowConditionSchema = new mongoose.Schema({
    field: { type: String, required: true },
    operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'], required: true },
    value: mongoose.Schema.Types.Mixed
}, { _id: false });

const workflowActionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['create_task', 'update_field', 'send_notification', 'assign_user'],
        required: true
    },
    taskTemplate: {
        title: String,
        description: String,
        taskType: String,
        priority: String,
        dueDateOffset: Number,
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    field: String,
    value: mongoose.Schema.Types.Mixed,
    notificationType: String,
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const workflowRuleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    trigger: {
        type: { type: String, enum: ['status_change', 'completion', 'due_date_passed'], required: true },
        fromStatus: String,
        toStatus: String
    },
    conditions: [workflowConditionSchema],
    actions: [workflowActionSchema],
    isActive: { type: Boolean, default: true }
}, { _id: true });

// Dependency schema
const dependencySchema = new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    type: { type: String, enum: ['blocks', 'blocked_by', 'related'], default: 'blocked_by' }
}, { _id: true });

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    description: {
        type: String,
        trim: true,
        maxlength: 5000
    },
    status: {
        type: String,
        enum: ['backlog', 'todo', 'in_progress', 'done', 'canceled'],
        default: 'todo',
        index: true
    },
    priority: {
        type: String,
        enum: ['none', 'low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    label: {
        type: String,
        enum: ['bug', 'feature', 'documentation', 'enhancement', 'question', 'legal', 'administrative', 'urgent'],
        default: null
    },
    tags: [{ type: String, trim: true }],
    dueDate: {
        type: Date,
        index: true
    },
    dueTime: String, // HH:mm format
    startDate: Date,
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    parentTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    subtasks: [subtaskSchema],
    checklists: [checklistSchema],
    timeTracking: {
        estimatedMinutes: { type: Number, default: 0 },
        actualMinutes: { type: Number, default: 0 },
        sessions: [timeSessionSchema],
        isTracking: { type: Boolean, default: false },
        currentSessionStart: Date
    },
    recurring: {
        enabled: { type: Boolean, default: false },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom']
        },
        type: {
            type: String,
            enum: ['due_date', 'completion_date'],
            default: 'due_date'
        },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],
        dayOfMonth: { type: Number, min: 1, max: 31 },
        weekOfMonth: { type: Number, min: 1, max: 5 },
        interval: { type: Number, default: 1 },
        endDate: Date,
        maxOccurrences: Number,
        occurrencesCompleted: { type: Number, default: 0 },
        assigneeStrategy: {
            type: String,
            enum: ['fixed', 'round_robin', 'random', 'least_assigned'],
            default: 'fixed'
        },
        assigneePool: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        nextDue: Date
    },
    reminders: [taskReminderSchema],
    attachments: [attachmentSchema],
    comments: [commentSchema],
    history: [historyEntrySchema],
    points: { type: Number, default: 0 }, // Gamification
    progress: { type: Number, default: 0, min: 0, max: 100 },
    manualProgress: { type: Boolean, default: false }, // If true, progress is set manually and not auto-calculated from subtasks
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, maxlength: 2000 },
    // Template fields
    isTemplate: {
        type: Boolean,
        default: false,
        index: true
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    templateName: {
        type: String,
        trim: true,
        maxlength: 200
    },
    // Task Dependencies
    dependencies: [dependencySchema],
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    blocks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    // Workflow Rules
    workflowRules: [workflowRuleSchema],
    outcome: {
        type: String,
        enum: ['successful', 'unsuccessful', 'appealed', 'settled', 'dismissed', null],
        default: null
    },
    outcomeNotes: { type: String, maxlength: 2000 },
    outcomeDate: Date,
    // Budget Tracking
    budget: {
        estimatedHours: { type: Number, default: 0 },
        hourlyRate: { type: Number, default: 0 },
        estimatedCost: { type: Number, default: 0 },
        actualCost: { type: Number, default: 0 },
        variance: { type: Number, default: 0 },
        variancePercent: { type: Number, default: 0 }
    },
    // Task Type for legal workflows
    taskType: {
        type: String,
        enum: ['general', 'court_hearing', 'document_review', 'client_meeting',
               'filing_deadline', 'appeal_deadline', 'discovery', 'deposition',
               'mediation', 'settlement', 'research', 'drafting'],
        default: 'general'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes for performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ caseId: 1, status: 1 });
taskSchema.index({ clientId: 1 });
taskSchema.index({ 'recurring.enabled': 1, 'recurring.nextDue': 1 });
taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ isTemplate: 1, createdBy: 1 });
taskSchema.index({ isTemplate: 1, isPublic: 1 });
taskSchema.index({ blockedBy: 1 });
taskSchema.index({ blocks: 1 });
taskSchema.index({ taskType: 1 });
taskSchema.index({ createdAt: -1 });

// Pre-save hook to calculate progress from subtasks and budget
taskSchema.pre('save', function(next) {
    // Calculate progress from subtasks (only if not manually set)
    if (!this.manualProgress && this.subtasks && this.subtasks.length > 0) {
        const completed = this.subtasks.filter(s => s.completed).length;
        this.progress = Math.round((completed / this.subtasks.length) * 100);
    }

    // Calculate actual minutes from time sessions
    if (this.timeTracking?.sessions) {
        this.timeTracking.actualMinutes = this.timeTracking.sessions
            .filter(s => s.endedAt)
            .reduce((sum, s) => sum + (s.duration || 0), 0);
    }

    // Calculate budget figures
    if (this.budget) {
        // Calculate estimated cost
        if (this.budget.hourlyRate && this.timeTracking?.estimatedMinutes) {
            this.budget.estimatedHours = this.timeTracking.estimatedMinutes / 60;
            this.budget.estimatedCost = this.budget.estimatedHours * this.budget.hourlyRate;
        }

        // Calculate actual cost (only billable time)
        if (this.budget.hourlyRate && this.timeTracking?.sessions) {
            const billableMinutes = this.timeTracking.sessions
                .filter(s => s.endedAt && s.isBillable !== false)
                .reduce((sum, s) => sum + (s.duration || 0), 0);
            const actualHours = billableMinutes / 60;
            this.budget.actualCost = actualHours * this.budget.hourlyRate;
        }

        // Calculate variance
        if (this.budget.estimatedCost > 0) {
            this.budget.variance = this.budget.estimatedCost - this.budget.actualCost;
            this.budget.variancePercent = (this.budget.variance / this.budget.estimatedCost) * 100;
        }
    }

    next();
});

// Static method: Get task stats
taskSchema.statics.getStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { $or: [{ assignedTo: new mongoose.Types.ObjectId(userId) }, { createdBy: new mongoose.Types.ObjectId(userId) }] } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                backlog: { $sum: { $cond: [{ $eq: ['$status', 'backlog'] }, 1, 0] } },
                todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
                in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
                canceled: { $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 1, 0] } }
            }
        }
    ]);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    const overdue = await this.countDocuments({
        $or: [{ assignedTo: new mongoose.Types.ObjectId(userId) }, { createdBy: new mongoose.Types.ObjectId(userId) }],
        status: { $nin: ['done', 'canceled'] },
        dueDate: { $lt: now }
    });

    const dueToday = await this.countDocuments({
        $or: [{ assignedTo: new mongoose.Types.ObjectId(userId) }, { createdBy: new mongoose.Types.ObjectId(userId) }],
        status: { $nin: ['done', 'canceled'] },
        dueDate: {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lte: new Date(now.setHours(23, 59, 59, 999))
        }
    });

    const completedThisWeek = await this.countDocuments({
        $or: [{ assignedTo: new mongoose.Types.ObjectId(userId) }, { createdBy: new mongoose.Types.ObjectId(userId) }],
        status: 'done',
        completedAt: { $gte: weekStart }
    });

    return {
        total: stats[0]?.total || 0,
        byStatus: {
            backlog: stats[0]?.backlog || 0,
            todo: stats[0]?.todo || 0,
            in_progress: stats[0]?.in_progress || 0,
            done: stats[0]?.done || 0,
            canceled: stats[0]?.canceled || 0
        },
        overdue,
        dueToday,
        completedThisWeek
    };
};

module.exports = mongoose.model('Task', taskSchema);
