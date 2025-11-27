const mongoose = require('mongoose');

// Subtask schema
const subtaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    autoReset: { type: Boolean, default: false }
}, { _id: true });

// Time session schema
const timeSessionSchema = new mongoose.Schema({
    startedAt: { type: Date, required: true },
    endedAt: Date,
    duration: Number, // minutes
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
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
    fileType: String,
    fileSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

// History entry schema
const historyEntrySchema = new mongoose.Schema({
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changes: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

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
        sessions: [timeSessionSchema]
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

// Pre-save hook to calculate progress from subtasks
taskSchema.pre('save', function(next) {
    if (this.subtasks && this.subtasks.length > 0) {
        const completed = this.subtasks.filter(s => s.completed).length;
        this.progress = Math.round((completed / this.subtasks.length) * 100);
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
