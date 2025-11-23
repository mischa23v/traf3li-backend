const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
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
    reminderDate: {
        type: Date,
        required: true,
        index: true
    },
    reminderTime: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    type: {
        type: String,
        enum: ['task', 'hearing', 'deadline', 'meeting', 'payment', 'general'],
        default: 'general'
    },
    relatedCase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },
    relatedTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    relatedEvent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'dismissed'],
        default: 'pending',
        index: true
    },
    notificationSent: {
        type: Boolean,
        default: false
    },
    notificationSentAt: {
        type: Date
    },
    recurring: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
            required: false
        },
        endDate: {
            type: Date,
            required: false
        }
    },
    completedAt: {
        type: Date
    },
    notes: {
        type: String,
        maxlength: 500
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes for performance
reminderSchema.index({ userId: 1, reminderDate: 1 });
reminderSchema.index({ status: 1, reminderDate: 1 });
reminderSchema.index({ userId: 1, status: 1, reminderDate: 1 });

// Static method: Get upcoming reminders
reminderSchema.statics.getUpcoming = async function(userId, days = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return await this.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        reminderDate: {
            $gte: now,
            $lte: future
        }
    })
    .populate('relatedCase', 'title caseNumber')
    .populate('relatedTask', 'title')
    .populate('relatedEvent', 'title')
    .sort({ reminderDate: 1 });
};

// Static method: Get overdue reminders
reminderSchema.statics.getOverdue = async function(userId) {
    const now = new Date();

    return await this.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        reminderDate: { $lt: now }
    })
    .populate('relatedCase', 'title caseNumber')
    .populate('relatedTask', 'title')
    .populate('relatedEvent', 'title')
    .sort({ reminderDate: -1 });
};

module.exports = mongoose.model('Reminder', reminderSchema);
