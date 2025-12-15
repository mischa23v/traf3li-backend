/**
 * Appointment Model
 *
 * Manages appointments and bookings for CRM.
 * Supports scheduling, reminders, and calendar integration.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const APPOINTMENT_STATUSES = [
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
];

const APPOINTMENT_WITH_TYPES = [
    'lead',
    'client',
    'contact'
];

const LOCATION_TYPES = [
    'office',
    'virtual',
    'client_site',
    'other'
];

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const appointmentSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    appointmentNumber: {
        type: String,
        required: true,
        index: true
    },

    scheduledTime: {
        type: Date,
        required: true,
        index: true
    },
    duration: {
        type: Number,
        required: true,
        min: 15,
        max: 480  // 8 hours max
    },
    endTime: {
        type: Date
    },

    status: {
        type: String,
        enum: APPOINTMENT_STATUSES,
        default: 'scheduled',
        index: true
    },

    // Customer information
    customerName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    customerPhone: {
        type: String,
        trim: true
    },
    customerNotes: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // Party linkage
    appointmentWith: {
        type: String,
        enum: APPOINTMENT_WITH_TYPES,
        default: 'lead'
    },
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'partyModel',
        index: true
    },
    partyModel: {
        type: String,
        enum: ['Lead', 'Client', 'Contact']
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },

    // Assignment
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Location
    locationType: {
        type: String,
        enum: LOCATION_TYPES,
        default: 'office'
    },
    location: {
        type: String,
        trim: true,
        maxlength: 500
    },
    meetingLink: {
        type: String,
        trim: true
    },

    // Calendar integration
    calendarEventId: {
        type: String
    },

    // Reminders
    sendReminder: {
        type: Boolean,
        default: true
    },
    reminderSentAt: {
        type: Date
    },
    remindersSent: [{
        sentAt: Date,
        type: { type: String, enum: ['email', 'sms', 'push'] }
    }],

    // Outcome
    outcome: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: {
        type: Date
    },

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: {
        type: Date
    },
    cancellationReason: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

appointmentSchema.index({ firmId: 1, appointmentNumber: 1 }, { unique: true });
appointmentSchema.index({ firmId: 1, scheduledTime: 1, status: 1 });
appointmentSchema.index({ firmId: 1, assignedTo: 1, scheduledTime: 1 });
appointmentSchema.index({ firmId: 1, partyId: 1, appointmentWith: 1 });
appointmentSchema.index({ firmId: 1, caseId: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

appointmentSchema.pre('save', async function(next) {
    // Calculate end time
    if (this.scheduledTime && this.duration) {
        this.endTime = new Date(this.scheduledTime.getTime() + this.duration * 60000);
    }

    // Generate appointment number if new
    if (!this.appointmentNumber && this.isNew) {
        const date = new Date();
        const year = date.getFullYear();
        const count = await mongoose.model('Appointment').countDocuments({
            firmId: this.firmId,
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });
        this.appointmentNumber = `APT-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    // Set party model based on appointmentWith
    if (this.appointmentWith) {
        const modelMap = {
            lead: 'Lead',
            client: 'Client',
            contact: 'Contact'
        };
        this.partyModel = modelMap[this.appointmentWith];
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get appointments for a date range
 * @param {ObjectId} firmId - Firm ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {ObjectId} assignedTo - Optional: Filter by assigned user
 * @returns {Promise<Array>} Array of appointments
 */
appointmentSchema.statics.getForDateRange = async function(firmId, startDate, endDate, assignedTo = null) {
    const query = {
        firmId,
        scheduledTime: { $gte: startDate, $lte: endDate },
        status: { $in: ['scheduled', 'confirmed'] }
    };

    if (assignedTo) {
        query.assignedTo = assignedTo;
    }

    return this.find(query)
        .populate('assignedTo', 'firstName lastName avatar')
        .populate('partyId', 'firstName lastName companyName email phone')
        .sort({ scheduledTime: 1 });
};

/**
 * Get available time slots
 * @param {ObjectId} firmId - Firm ID
 * @param {Date} date - Date to check
 * @param {ObjectId} assignedTo - User ID
 * @param {Number} duration - Slot duration in minutes
 * @param {Object} workingHours - Working hours config
 * @param {Number} buffer - Buffer between appointments
 * @returns {Promise<Array>} Array of available slots
 */
appointmentSchema.statics.getAvailableSlots = async function(
    firmId,
    date,
    assignedTo,
    duration,
    workingHours,
    buffer = 15
) {
    if (!workingHours || !workingHours.enabled) {
        return [];
    }

    // Get day boundaries
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get existing appointments for the day
    const appointments = await this.find({
        firmId,
        assignedTo,
        scheduledTime: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['scheduled', 'confirmed'] }
    }).sort({ scheduledTime: 1 });

    // Parse working hours
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    const workStart = new Date(date);
    workStart.setHours(startHour, startMin, 0, 0);

    const workEnd = new Date(date);
    workEnd.setHours(endHour, endMin, 0, 0);

    // Generate slots
    const slots = [];
    let currentTime = workStart.getTime();
    const slotDuration = duration * 60000;  // Convert to ms
    const bufferTime = buffer * 60000;

    while (currentTime + slotDuration <= workEnd.getTime()) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime + slotDuration);

        // Check if slot conflicts with existing appointments
        const hasConflict = appointments.some(apt => {
            const aptStart = apt.scheduledTime.getTime();
            const aptEnd = apt.endTime.getTime();

            // Add buffer to appointment times
            const aptStartWithBuffer = aptStart - bufferTime;
            const aptEndWithBuffer = aptEnd + bufferTime;

            return (
                (currentTime >= aptStartWithBuffer && currentTime < aptEndWithBuffer) ||
                (currentTime + slotDuration > aptStartWithBuffer && currentTime + slotDuration <= aptEndWithBuffer) ||
                (currentTime <= aptStartWithBuffer && currentTime + slotDuration >= aptEndWithBuffer)
            );
        });

        slots.push({
            start: slotStart.toTimeString().slice(0, 5),
            end: slotEnd.toTimeString().slice(0, 5),
            startTime: slotStart,
            endTime: slotEnd,
            available: !hasConflict
        });

        currentTime += slotDuration + bufferTime;
    }

    return slots;
};

/**
 * Get upcoming appointments requiring reminders
 * @param {Number} hoursAhead - Hours to look ahead
 * @returns {Promise<Array>} Appointments needing reminders
 */
appointmentSchema.statics.getForReminders = async function(hoursAhead = 24) {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return this.find({
        scheduledTime: { $lte: reminderTime, $gt: now },
        status: { $in: ['scheduled', 'confirmed'] },
        sendReminder: true,
        reminderSentAt: { $exists: false }
    }).populate('assignedTo', 'firstName lastName email');
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Cancel the appointment
 * @param {ObjectId} userId - User cancelling
 * @param {String} reason - Cancellation reason
 */
appointmentSchema.methods.cancel = async function(userId, reason = '') {
    this.status = 'cancelled';
    this.cancelledBy = userId;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    return this.save();
};

/**
 * Mark as completed
 * @param {String} outcome - Appointment outcome notes
 * @param {Boolean} followUp - Whether follow-up is required
 * @param {Date} followUpDate - Follow-up date
 */
appointmentSchema.methods.complete = async function(outcome, followUp = false, followUpDate = null) {
    this.status = 'completed';
    this.outcome = outcome;
    this.followUpRequired = followUp;
    if (followUpDate) {
        this.followUpDate = followUpDate;
    }
    return this.save();
};

/**
 * Mark as no-show
 */
appointmentSchema.methods.markNoShow = async function() {
    this.status = 'no_show';
    return this.save();
};

/**
 * Confirm the appointment
 */
appointmentSchema.methods.confirm = async function() {
    this.status = 'confirmed';
    return this.save();
};

/**
 * Record reminder sent
 * @param {String} type - Reminder type (email, sms, push)
 */
appointmentSchema.methods.recordReminderSent = async function(type) {
    if (!this.remindersSent) {
        this.remindersSent = [];
    }
    this.remindersSent.push({ sentAt: new Date(), type });
    this.reminderSentAt = new Date();
    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if appointment is in the past
 */
appointmentSchema.virtual('isPast').get(function() {
    return this.endTime < new Date();
});

/**
 * Check if appointment is upcoming (within 24 hours)
 */
appointmentSchema.virtual('isUpcoming').get(function() {
    const now = new Date();
    const dayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return this.scheduledTime > now && this.scheduledTime <= dayFromNow;
});

/**
 * Get formatted time range
 */
appointmentSchema.virtual('timeRange').get(function() {
    if (!this.scheduledTime || !this.endTime) return '';
    const startTime = this.scheduledTime.toTimeString().slice(0, 5);
    const endTime = this.endTime.toTimeString().slice(0, 5);
    return `${startTime} - ${endTime}`;
});

appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
