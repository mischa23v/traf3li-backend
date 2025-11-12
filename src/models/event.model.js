const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['hearing', 'meeting', 'deadline', 'task', 'other'],
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date
    },
    allDay: {
        type: Boolean,
        default: false
    },
    location: {
        type: String,
        trim: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reminders: [{
        type: {
            type: String,
            enum: ['notification', 'email', 'sms'],
            default: 'notification'
        },
        time: {
            type: Date,
            required: true
        },
        sent: {
            type: Boolean,
            default: false
        }
    }],
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    notes: {
        type: String
    },
    color: {
        type: String,
        default: '#3b82f6'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    recurrence: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly']
        },
        interval: {
            type: Number,
            default: 1
        },
        endDate: {
            type: Date
        },
        daysOfWeek: [{
            type: Number,
            min: 0,
            max: 6
        }],
        dayOfMonth: {
            type: Number,
            min: 1,
            max: 31
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
eventSchema.index({ createdBy: 1, startDate: 1 });
eventSchema.index({ caseId: 1, startDate: 1 });
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ taskId: 1 });

// Virtual for duration
eventSchema.virtual('duration').get(function() {
    if (!this.endDate) return null;
    return Math.round((this.endDate - this.startDate) / 60000); // in minutes
});

// Virtual for isPast
eventSchema.virtual('isPast').get(function() {
    return this.startDate < new Date();
});

// Virtual for isToday
eventSchema.virtual('isToday').get(function() {
    const today = new Date();
    const start = new Date(this.startDate);
    return start.toDateString() === today.toDateString();
});

// Instance method to check if user is attendee
eventSchema.methods.isUserAttendee = function(userId) {
    return this.attendees.some(attendee => attendee.toString() === userId.toString());
};

// Instance method to create reminder
eventSchema.methods.createReminder = function(type, time) {
    this.reminders.push({ type, time, sent: false });
    return this.save();
};

// Instance method to mark as completed
eventSchema.methods.markCompleted = function() {
    this.status = 'completed';
    return this.save();
};

module.exports = mongoose.model('Event', eventSchema);
