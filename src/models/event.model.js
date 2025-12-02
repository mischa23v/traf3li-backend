const mongoose = require('mongoose');

// Location schema
const locationSchema = new mongoose.Schema({
    name: String,
    address: String,
    room: String,
    virtualLink: String,
    virtualPlatform: {
        type: String,
        enum: ['zoom', 'teams', 'google_meet', 'webex', 'other']
    },
    instructions: String,
    coordinates: {
        latitude: Number,
        longitude: Number
    }
}, { _id: false });

// Attendee schema
const attendeeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    name: String,
    phone: String,
    role: {
        type: String,
        enum: ['organizer', 'required', 'optional', 'resource'],
        default: 'required'
    },
    status: {
        type: String,
        enum: ['invited', 'confirmed', 'declined', 'tentative', 'no_response'],
        default: 'invited'
    },
    responseStatus: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'tentative'],
        default: 'pending'
    },
    isRequired: { type: Boolean, default: true },
    responseNote: String,
    respondedAt: Date,
    notificationSent: { type: Boolean, default: false }
}, { _id: true });

// Agenda item schema
const agendaItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    duration: Number, // minutes
    presenter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    presenterName: String,
    notes: String,
    order: Number,
    completed: { type: Boolean, default: false }
}, { _id: true });

// Action item schema
const actionItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assigneeName: String,
    dueDate: Date,
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    completedAt: Date,
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
}, { _id: true });

// Event reminder schema
const eventReminderSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['notification', 'push', 'email', 'sms', 'whatsapp'],
        default: 'notification'
    },
    beforeMinutes: { type: Number, required: true },
    sent: { type: Boolean, default: false },
    sentAt: Date
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

const eventSchema = new mongoose.Schema({
    eventId: {
        type: String,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    description: {
        type: String,
        trim: true,
        maxlength: 5000
    },
    type: {
        type: String,
        enum: [
            'hearing',
            'court_date',
            'meeting',
            'client_meeting',
            'deposition',
            'mediation',
            'arbitration',
            'deadline',
            'filing_deadline',
            'conference_call',
            'internal_meeting',
            'training',
            'webinar',
            'consultation',
            'task',
            'other'
        ],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'tentative', 'canceled', 'cancelled', 'postponed', 'completed', 'in_progress', 'rescheduled'],
        default: 'scheduled',
        index: true
    },
    // Date and time
    startDateTime: {
        type: Date,
        required: true,
        index: true
    },
    endDateTime: {
        type: Date
    },
    // Legacy fields for compatibility
    startDate: { type: Date },
    endDate: { type: Date },
    allDay: {
        type: Boolean,
        default: false
    },
    timezone: {
        type: String,
        default: 'Asia/Riyadh'
    },
    // Location
    location: locationSchema,
    // Legacy location field
    locationString: { type: String, trim: true },
    // Participants
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attendees: [attendeeSchema],
    // Related entities
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
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    reminderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reminder'
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    // Court details (show only for court events)
    courtDetails: {
        courtType: {
            type: String,
            enum: [
                'general_court',
                'criminal_court',
                'family_court',
                'commercial_court',
                'labor_court',
                'appeal_court',
                'supreme_court',
                'administrative_court',
                'enforcement_court'
            ]
        },
        courtCaseNumber: String,
        caseYear: Number,
        najizCaseNumber: String
    },
    // Virtual meeting (show only for virtual/hybrid)
    virtualMeeting: {
        platform: {
            type: String,
            enum: ['zoom', 'teams', 'google_meet', 'webex', 'other']
        },
        meetingUrl: String,
        meetingId: String,
        meetingPassword: String
    },
    // Agenda and minutes
    agenda: [agendaItemSchema],
    actionItems: [actionItemSchema],
    minutesNotes: {
        type: String,
        maxlength: 10000
    },
    minutesRecordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    minutesRecordedAt: Date,
    // Attachments
    attachments: [attachmentSchema],
    // Reminders
    reminders: [eventReminderSchema],
    // Recurring configuration
    recurrence: {
        enabled: { type: Boolean, default: false },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom']
        },
        interval: { type: Number, default: 1 },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],
        dayOfMonth: { type: Number, min: 1, max: 31 },
        weekOfMonth: { type: Number, min: 1, max: 5 },
        endType: {
            type: String,
            enum: ['never', 'after_occurrences', 'on_date'],
            default: 'never'
        },
        endDate: Date,
        maxOccurrences: Number,
        occurrencesCompleted: { type: Number, default: 0 },
        exceptions: [Date], // Dates to skip
        parentEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
        nextOccurrence: Date
    },
    // Recurring instance fields
    isRecurringInstance: { type: Boolean, default: false },
    parentEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    // Calendar sync
    calendarSync: {
        googleCalendarId: String,
        outlookEventId: String,
        appleCalendarId: String,
        iCalUid: String,
        lastSyncedAt: Date,
        syncStatus: {
            type: String,
            enum: ['synced', 'pending', 'failed', 'not_synced'],
            default: 'not_synced'
        }
    },
    // Display
    color: {
        type: String,
        default: '#3b82f6'
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'confidential'],
        default: 'private'
    },
    // Priority and importance
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    // Enhanced Billing
    billing: {
        isBillable: { type: Boolean, default: false },
        billingType: {
            type: String,
            enum: ['hourly', 'fixed_fee', 'retainer', 'pro_bono', 'not_billable'],
            default: 'hourly'
        },
        hourlyRate: Number,
        fixedAmount: Number,
        currency: { type: String, default: 'SAR' },
        billableAmount: Number,
        invoiceStatus: {
            type: String,
            enum: ['not_invoiced', 'invoiced', 'paid'],
            default: 'not_invoiced'
        },
        linkedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }
    },
    // Completion tracking
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    outcome: String,
    // Follow-up
    followUpRequired: { type: Boolean, default: false },
    followUpTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    followUpNotes: String,
    // Cancellation/Postponement
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,
    postponedTo: Date,
    postponementReason: String,
    // Notes
    notes: {
        type: String,
        maxlength: 2000
    },
    // Tags
    tags: [{ type: String, trim: true }],
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
eventSchema.index({ createdBy: 1, startDateTime: 1 });
eventSchema.index({ organizer: 1, startDateTime: 1 });
eventSchema.index({ caseId: 1, startDateTime: 1 });
eventSchema.index({ clientId: 1, startDateTime: 1 });
eventSchema.index({ startDateTime: 1, endDateTime: 1 });
eventSchema.index({ taskId: 1 });
eventSchema.index({ status: 1, startDateTime: 1 });
eventSchema.index({ 'attendees.userId': 1, startDateTime: 1 });
eventSchema.index({ 'recurrence.enabled': 1, 'recurrence.nextOccurrence': 1 });
eventSchema.index({ title: 'text', description: 'text' });

// Generate event ID before saving
eventSchema.pre('save', async function(next) {
    if (!this.eventId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.eventId = `EVT-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Sync legacy fields
    if (this.startDateTime) {
        this.startDate = this.startDateTime;
    }
    if (this.endDateTime) {
        this.endDate = this.endDateTime;
    }
    if (this.location && this.location.name) {
        this.locationString = this.location.name;
    }

    next();
});

// Virtual for duration
eventSchema.virtual('duration').get(function() {
    if (!this.endDateTime) return null;
    return Math.round((this.endDateTime - this.startDateTime) / 60000); // in minutes
});

// Virtual for isPast
eventSchema.virtual('isPast').get(function() {
    return this.startDateTime < new Date();
});

// Virtual for isToday
eventSchema.virtual('isToday').get(function() {
    const today = new Date();
    const start = new Date(this.startDateTime);
    return start.toDateString() === today.toDateString();
});

// Virtual for isUpcoming
eventSchema.virtual('isUpcoming').get(function() {
    return this.startDateTime > new Date();
});

// Instance method to check if user is attendee
eventSchema.methods.isUserAttendee = function(userId) {
    return this.attendees.some(attendee =>
        attendee.userId && attendee.userId.toString() === userId.toString()
    );
};

// Instance method to add attendee
eventSchema.methods.addAttendee = function(attendeeData) {
    this.attendees.push(attendeeData);
    return this.save();
};

// Instance method to update attendee RSVP
eventSchema.methods.updateRSVP = function(userId, status, responseNote) {
    const attendee = this.attendees.find(a =>
        a.userId && a.userId.toString() === userId.toString()
    );
    if (attendee) {
        attendee.status = status;
        attendee.responseNote = responseNote;
        attendee.respondedAt = new Date();
    }
    return this.save();
};

// Instance method to create reminder
eventSchema.methods.createReminder = function(type, beforeMinutes) {
    this.reminders.push({ type, beforeMinutes, sent: false });
    return this.save();
};

// Instance method to mark as completed
eventSchema.methods.markCompleted = function(userId) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.completedBy = userId;
    return this.save();
};

// Instance method to cancel event
eventSchema.methods.cancel = function(userId, reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = userId;
    this.cancellationReason = reason;
    return this.save();
};

// Instance method to postpone event
eventSchema.methods.postpone = function(newDateTime, reason) {
    this.status = 'postponed';
    this.postponedTo = newDateTime;
    this.postponementReason = reason;
    return this.save();
};

// Static method: Get events for calendar view
eventSchema.statics.getCalendarEvents = async function(userId, startDate, endDate, filters = {}) {
    const query = {
        $and: [
            // User access check
            {
                $or: [
                    { createdBy: new mongoose.Types.ObjectId(userId) },
                    { organizer: new mongoose.Types.ObjectId(userId) },
                    { 'attendees.userId': new mongoose.Types.ObjectId(userId) }
                ]
            },
            // Date range check
            { startDateTime: { $gte: startDate } },
            {
                $or: [
                    { endDateTime: { $lte: endDate } },
                    { endDateTime: { $exists: false } },
                    { endDateTime: null }
                ]
            }
        ],
        status: { $ne: 'cancelled' }
    };

    if (filters.caseId) query.caseId = new mongoose.Types.ObjectId(filters.caseId);
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    return await this.find(query)
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .populate('organizer', 'firstName lastName')
        .sort({ startDateTime: 1 });
};

// Static method: Get upcoming events
eventSchema.statics.getUpcoming = async function(userId, days = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return await this.find({
        $or: [
            { createdBy: new mongoose.Types.ObjectId(userId) },
            { organizer: new mongoose.Types.ObjectId(userId) },
            { 'attendees.userId': new mongoose.Types.ObjectId(userId) }
        ],
        startDateTime: { $gte: now, $lte: future },
        status: { $in: ['scheduled', 'confirmed'] }
    })
    .populate('caseId', 'title caseNumber')
    .populate('clientId', 'firstName lastName')
    .sort({ startDateTime: 1 });
};

// Static method: Get event stats
eventSchema.statics.getStats = async function(userId, filters = {}) {
    const matchQuery = {
        $or: [
            { createdBy: new mongoose.Types.ObjectId(userId) },
            { organizer: new mongoose.Types.ObjectId(userId) }
        ]
    };

    if (filters.startDate || filters.endDate) {
        matchQuery.startDateTime = {};
        if (filters.startDate) matchQuery.startDateTime.$gte = new Date(filters.startDate);
        if (filters.endDate) matchQuery.startDateTime.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
                confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                postponed: { $sum: { $cond: [{ $eq: ['$status', 'postponed'] }, 1, 0] } }
            }
        }
    ]);

    const byType = await this.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const todayCount = await this.countDocuments({
        ...matchQuery,
        startDateTime: { $gte: today, $lt: tomorrow },
        status: { $in: ['scheduled', 'confirmed'] }
    });

    const weekCount = await this.countDocuments({
        ...matchQuery,
        startDateTime: { $gte: today, $lt: weekEnd },
        status: { $in: ['scheduled', 'confirmed'] }
    });

    return {
        total: stats[0]?.total || 0,
        byStatus: {
            scheduled: stats[0]?.scheduled || 0,
            confirmed: stats[0]?.confirmed || 0,
            completed: stats[0]?.completed || 0,
            cancelled: stats[0]?.cancelled || 0,
            postponed: stats[0]?.postponed || 0
        },
        byType: byType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        today: todayCount,
        thisWeek: weekCount
    };
};

// Static method: Check availability
eventSchema.statics.checkAvailability = async function(userIds, startDateTime, endDateTime, excludeEventId = null) {
    const query = {
        $or: userIds.map(id => ({
            $or: [
                { organizer: new mongoose.Types.ObjectId(id) },
                { 'attendees.userId': new mongoose.Types.ObjectId(id) }
            ]
        })),
        status: { $in: ['scheduled', 'confirmed'] },
        $or: [
            { startDateTime: { $lt: endDateTime, $gte: startDateTime } },
            { endDateTime: { $gt: startDateTime, $lte: endDateTime } },
            { startDateTime: { $lte: startDateTime }, endDateTime: { $gte: endDateTime } }
        ]
    };

    if (excludeEventId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeEventId) };
    }

    const conflicts = await this.find(query)
        .select('title startDateTime endDateTime organizer attendees')
        .populate('organizer', 'firstName lastName');

    return {
        available: conflicts.length === 0,
        conflicts
    };
};

module.exports = mongoose.model('Event', eventSchema);
