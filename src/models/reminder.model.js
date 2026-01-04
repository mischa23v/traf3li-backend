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
        required: false,
        trim: true,
        maxlength: 200,
        default: 'Untitled Reminder'
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    reminderDateTime: {
        type: Date,
        required: false,
        default: Date.now,
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
    // Location-based trigger configuration
    locationTrigger: {
        enabled: { type: Boolean, default: false },
        type: { type: String, enum: ['arrive', 'leave', 'nearby'] },
        location: {
            name: String,
            address: String,
            latitude: Number,
            longitude: Number,
            savedLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserLocation' }
        },
        radius: { type: Number, default: 100 }, // meters
        triggered: { type: Boolean, default: false },
        triggeredAt: Date,
        lastCheckedAt: Date,
        // For repeated location triggers
        repeatTrigger: { type: Boolean, default: false },
        cooldownMinutes: { type: Number, default: 60 } // Don't re-trigger within this time
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

// ═══════════════════════════════════════════════════════════════
// AGGRESSIVE INDEXES FOR CRON JOB PERFORMANCE
// ═══════════════════════════════════════════════════════════════

// Core reminder queries
reminderSchema.index({ userId: 1, reminderDateTime: 1 });
reminderSchema.index({ status: 1, reminderDateTime: 1 });
reminderSchema.index({ userId: 1, status: 1, reminderDateTime: 1 });

// Cron job: Pending notifications trigger (every minute)
// Query: { status: 'pending', reminderDateTime: { $lte }, 'notification.sent': { $ne: true } }
reminderSchema.index({ status: 1, reminderDateTime: 1, 'notification.sent': 1 });

// Cron job: Advance notifications (every minute)
// Query: { status: 'pending', 'notification.advanceNotifications.sent': { $ne: true } }
reminderSchema.index({ status: 1, 'notification.advanceNotifications.sent': 1 });

// Cron job: Escalation checker (every 5 min)
// Query: { status: 'pending', 'notification.sent': true, 'notification.escalation.enabled': true, 'notification.escalation.escalated': { $ne: true } }
reminderSchema.index({
    status: 1,
    'notification.sent': 1,
    'notification.escalation.enabled': 1,
    'notification.escalation.escalated': 1
});

// Cron job: Snoozed reminders (every minute)
// Query: { status: 'snoozed', 'snooze.snoozeUntil': { $lte } }
reminderSchema.index({ status: 1, 'snooze.snoozeUntil': 1 });

// Recurring reminders
reminderSchema.index({ 'recurring.enabled': 1, 'recurring.nextOccurrence': 1 });

// Delegated reminders
reminderSchema.index({ delegatedTo: 1, status: 1 });

// Location-based reminders
reminderSchema.index({ 'locationTrigger.enabled': 1, 'locationTrigger.triggered': 1 });

// Firm-based queries
reminderSchema.index({ firmId: 1, createdAt: -1 });

// Generate reminder ID before saving
// Gold Standard: Scope ID sequence to tenant (each firm/lawyer has own sequence)
reminderSchema.pre('save', async function(next) {
    if (!this.reminderId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        // Build tenant-scoped query using document's own firmId/lawyerId
        // This is set by req.addFirmId() in the controller before create
        const tenantQuery = {};
        if (this.firmId) {
            tenantQuery.firmId = this.firmId;
        } else if (this.lawyerId) {
            tenantQuery.lawyerId = this.lawyerId;
        }

        const count = await this.constructor.countDocuments({
            ...tenantQuery,
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
// Accepts firmQuery object (from req.firmQuery) for proper multi-tenant isolation
reminderSchema.statics.getUpcoming = async function(userId, days = 7, firmQuery = null) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    // Build base filter with proper isolation + userId for user's reminders
    const baseFilter = firmQuery
        ? { ...firmQuery, userId: new mongoose.Types.ObjectId(userId) }
        : { lawyerId: new mongoose.Types.ObjectId(userId), userId: new mongoose.Types.ObjectId(userId) };

    return await this.find({
        ...baseFilter,
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
// Accepts firmQuery object (from req.firmQuery) for proper multi-tenant isolation
reminderSchema.statics.getOverdue = async function(userId, firmQuery = null) {
    const now = new Date();

    // Build base filter with proper isolation + userId for user's reminders
    const baseFilter = firmQuery
        ? { ...firmQuery, userId: new mongoose.Types.ObjectId(userId) }
        : { lawyerId: new mongoose.Types.ObjectId(userId), userId: new mongoose.Types.ObjectId(userId) };

    return await this.find({
        ...baseFilter,
        status: 'pending',
        reminderDateTime: { $lt: now }
    })
    .populate('relatedCase', 'title caseNumber')
    .populate('relatedTask', 'title')
    .populate('relatedEvent', 'title')
    .sort({ reminderDateTime: -1 });
};

// Static method: Get snoozed reminders due
// Accepts firmQuery object (from req.firmQuery) for proper multi-tenant isolation
reminderSchema.statics.getSnoozedDue = async function(userId, firmQuery = null) {
    const now = new Date();

    // Build base filter with proper isolation + userId for user's reminders
    const baseFilter = firmQuery
        ? { ...firmQuery, userId: new mongoose.Types.ObjectId(userId) }
        : { lawyerId: new mongoose.Types.ObjectId(userId), userId: new mongoose.Types.ObjectId(userId) };

    return await this.find({
        ...baseFilter,
        status: 'snoozed',
        'snooze.snoozeUntil': { $lte: now }
    })
    .populate('relatedCase', 'title caseNumber')
    .populate('relatedTask', 'title')
    .sort({ 'snooze.snoozeUntil': 1 });
};

// Static method: Get delegated reminders
// Accepts firmQuery object (from req.firmQuery) for proper multi-tenant isolation
reminderSchema.statics.getDelegated = async function(userId, firmQuery = null) {
    // Build base filter with proper isolation + delegatedTo for delegated reminders
    const baseFilter = firmQuery
        ? { ...firmQuery, delegatedTo: new mongoose.Types.ObjectId(userId) }
        : { lawyerId: new mongoose.Types.ObjectId(userId), delegatedTo: new mongoose.Types.ObjectId(userId) };

    return await this.find({
        ...baseFilter,
        status: 'delegated'
    })
    .populate('userId', 'firstName lastName')
    .populate('relatedCase', 'title caseNumber')
    .sort({ reminderDateTime: 1 });
};

// Static method: Get reminder stats
// Accepts firmQuery object (from req.firmQuery) for proper isolation
reminderSchema.statics.getStats = async function(userId, firmQuery = null) {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Build base filter with proper isolation + userId for user's reminders
    const baseFilter = firmQuery
        ? { ...firmQuery, userId: new mongoose.Types.ObjectId(userId) }
        : { lawyerId: new mongoose.Types.ObjectId(userId), userId: new mongoose.Types.ObjectId(userId) };

    const stats = await this.aggregate([
        { $match: baseFilter },
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
        ...baseFilter,
        status: 'pending',
        reminderDateTime: { $lt: new Date() }
    });

    const dueToday = await this.countDocuments({
        ...baseFilter,
        status: { $in: ['pending', 'snoozed'] },
        reminderDateTime: { $gte: today, $lt: tomorrow }
    });

    const dueThisWeek = await this.countDocuments({
        ...baseFilter,
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

// Instance method: Check if location trigger should fire
reminderSchema.methods.checkLocationTrigger = function(currentLat, currentLng) {
    // Return false if location trigger is not enabled
    if (!this.locationTrigger?.enabled) {
        return false;
    }

    // Return false if already triggered and not set to repeat
    if (this.locationTrigger.triggered && !this.locationTrigger.repeatTrigger) {
        return false;
    }

    // Check cooldown period for repeated triggers
    if (this.locationTrigger.repeatTrigger && this.locationTrigger.triggeredAt) {
        const cooldownMs = (this.locationTrigger.cooldownMinutes || 60) * 60 * 1000;
        const timeSinceLastTrigger = Date.now() - new Date(this.locationTrigger.triggeredAt).getTime();
        if (timeSinceLastTrigger < cooldownMs) {
            return false;
        }
    }

    // Validate location coordinates
    const targetLat = this.locationTrigger.location?.latitude;
    const targetLng = this.locationTrigger.location?.longitude;

    if (!targetLat || !targetLng || !currentLat || !currentLng) {
        return false;
    }

    // Calculate distance using Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = currentLat * Math.PI / 180;
    const φ2 = targetLat * Math.PI / 180;
    const Δφ = (targetLat - currentLat) * Math.PI / 180;
    const Δλ = (targetLng - currentLng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters

    const radius = this.locationTrigger.radius || 100;
    const isWithinRadius = distance <= radius;

    // Check trigger type
    const triggerType = this.locationTrigger.type;

    if (triggerType === 'arrive' || triggerType === 'nearby') {
        // Trigger when user is within the radius
        return isWithinRadius;
    } else if (triggerType === 'leave') {
        // Trigger when user is outside the radius (implementation depends on tracking previous state)
        // For now, return true if outside radius
        // Note: Full implementation would require tracking previous location state
        return !isWithinRadius;
    }

    return false;
};

module.exports = mongoose.model('Reminder', reminderSchema);
