const mongoose = require('mongoose');

// Advance notification schema
const advanceNotificationSchema = new mongoose.Schema({
    beforeMinutes: { type: Number, required: true },
    channels: [{ type: String, enum: ['push', 'email', 'sms', 'whatsapp', 'in_app'] }],
    sent: { type: Boolean, default: false },
    sentAt: Date
}, { _id: true });

// Escalation schema
const escalationSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    escalateAfterMinutes: { type: Number, default: 30 },
    escalateTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalated: { type: Boolean, default: false },
    escalatedAt: Date
}, { _id: false });

const reminderSchema = new mongoose.Schema({
    reminderId: {
        type: String,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    reminderDateTime: {
        type: Date,
        required: true,
        index: true
    },
    // Legacy fields for backward compatibility
    reminderDate: {
        type: Date,
        index: true
    },
    reminderTime: {
        type: String
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    type: {
        type: String,
        enum: [
            'task_due',
            'hearing',
            'deadline',
            'meeting',
            'payment',
            'contract_renewal',
            'statute_limitation',
            'follow_up',
            'general',
            // Legacy types
            'task'
        ],
        default: 'general'
    },
    status: {
        type: String,
        enum: ['pending', 'snoozed', 'completed', 'dismissed', 'delegated'],
        default: 'pending',
        index: true
    },
    // Snooze configuration
    snooze: {
        snoozedAt: Date,
        snoozeUntil: Date,
        snoozeCount: { type: Number, default: 0 },
        snoozeReason: String,
        maxSnoozeCount: { type: Number, default: 5 }
    },
    // Notification configuration
    notification: {
        channels: [{
            type: String,
            enum: ['push', 'email', 'sms', 'whatsapp', 'in_app'],
            default: 'push'
        }],
        advanceNotifications: [advanceNotificationSchema],
        escalation: escalationSchema,
        sent: { type: Boolean, default: false },
        sentAt: Date,
        failedAttempts: { type: Number, default: 0 },
        lastAttemptAt: Date
    },
    // Acknowledgment
    acknowledgedAt: Date,
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgmentAction: {
        type: String,
        enum: ['completed', 'dismissed', 'snoozed', 'delegated']
    },
    // Delegation
    delegatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    delegatedAt: Date,
    delegationNote: String,
    // Related entities
    relatedCase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    relatedTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        index: true
    },
    relatedEvent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        index: true
    },
    relatedInvoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Recurring configuration
    recurring: {
        enabled: { type: Boolean, default: false },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom']
        },
        interval: { type: Number, default: 1 },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],
        dayOfMonth: { type: Number, min: 1, max: 31 },
        endDate: Date,
        maxOccurrences: Number,
        occurrencesCompleted: { type: Number, default: 0 },
        nextOccurrence: Date,
        parentReminderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reminder' }
    },
    // Completion details
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completionNote: String,
    // Additional fields
    notes: {
        type: String,
        maxlength: 1000
    },
    tags: [{ type: String, trim: true }],
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    // Legacy notification fields
    notificationSent: { type: Boolean, default: false },
    notificationSentAt: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes for performance
reminderSchema.index({ userId: 1, reminderDateTime: 1 });
reminderSchema.index({ status: 1, reminderDateTime: 1 });
reminderSchema.index({ userId: 1, status: 1, reminderDateTime: 1 });
reminderSchema.index({ 'recurring.enabled': 1, 'recurring.nextOccurrence': 1 });
reminderSchema.index({ delegatedTo: 1, status: 1 });
reminderSchema.index({ 'snooze.snoozeUntil': 1, status: 1 });

// Generate reminder ID before saving
reminderSchema.pre('save', async function(next) {
    if (!this.reminderId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.reminderId = `REM-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Sync legacy fields with new fields
    if (this.reminderDateTime && !this.reminderDate) {
        this.reminderDate = this.reminderDateTime;
        this.reminderTime = this.reminderDateTime.toTimeString().substring(0, 5);
    }

    next();
});

// Static method: Get upcoming reminders
reminderSchema.statics.getUpcoming = async function(userId, days = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return await this.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['pending', 'snoozed'] },
        $or: [
            { reminderDateTime: { $gte: now, $lte: future } },
            { 'snooze.snoozeUntil': { $gte: now, $lte: future } }
        ]
    })
    .populate('relatedCase', 'title caseNumber')
    .populate('relatedTask', 'title')
    .populate('relatedEvent', 'title')
    .populate('clientId', 'firstName lastName')
    .sort({ reminderDateTime: 1 });
};

// Static method: Get overdue reminders
reminderSchema.statics.getOverdue = async function(userId) {
    const now = new Date();

    return await this.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        reminderDateTime: { $lt: now }
    })
    .populate('relatedCase', 'title caseNumber')
    .populate('relatedTask', 'title')
    .populate('relatedEvent', 'title')
    .sort({ reminderDateTime: -1 });
};

// Static method: Get snoozed reminders due
reminderSchema.statics.getSnoozedDue = async function(userId) {
    const now = new Date();

    return await this.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'snoozed',
        'snooze.snoozeUntil': { $lte: now }
    })
    .populate('relatedCase', 'title caseNumber')
    .populate('relatedTask', 'title')
    .sort({ 'snooze.snoozeUntil': 1 });
};

// Static method: Get delegated reminders
reminderSchema.statics.getDelegated = async function(userId) {
    return await this.find({
        delegatedTo: new mongoose.Types.ObjectId(userId),
        status: 'delegated'
    })
    .populate('userId', 'firstName lastName')
    .populate('relatedCase', 'title caseNumber')
    .sort({ reminderDateTime: 1 });
};

// Static method: Get reminder stats
reminderSchema.statics.getStats = async function(userId) {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const stats = await this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                snoozed: { $sum: { $cond: [{ $eq: ['$status', 'snoozed'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                dismissed: { $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] } },
                delegated: { $sum: { $cond: [{ $eq: ['$status', 'delegated'] }, 1, 0] } }
            }
        }
    ]);

    const overdue = await this.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        reminderDateTime: { $lt: new Date() }
    });

    const dueToday = await this.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['pending', 'snoozed'] },
        reminderDateTime: { $gte: today, $lt: tomorrow }
    });

    const dueThisWeek = await this.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['pending', 'snoozed'] },
        reminderDateTime: { $gte: today, $lt: weekEnd }
    });

    return {
        total: stats[0]?.total || 0,
        byStatus: {
            pending: stats[0]?.pending || 0,
            snoozed: stats[0]?.snoozed || 0,
            completed: stats[0]?.completed || 0,
            dismissed: stats[0]?.dismissed || 0,
            delegated: stats[0]?.delegated || 0
        },
        overdue,
        dueToday,
        dueThisWeek
    };
};

module.exports = mongoose.model('Reminder', reminderSchema);
