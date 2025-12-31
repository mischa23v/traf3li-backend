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
    'no_show',
    'pending'  // Alias for 'scheduled' - frontend compatibility
];

const APPOINTMENT_WITH_TYPES = [
    'lead',
    'client',
    'contact'
];

/**
 * Appointment types - frontend expected values
 * Used for categorizing the purpose of the appointment
 */
const APPOINTMENT_TYPES = [
    'consultation',
    'follow_up',
    'case_review',
    'initial_meeting',
    'court_preparation',
    'document_review',
    'other'
];

/**
 * Appointment source - how the appointment was created
 */
const APPOINTMENT_SOURCES = [
    'marketplace',
    'manual',
    'client_dashboard',
    'website',
    'public_booking',
    'calendar_sync',
    'other'
];

const LOCATION_TYPES = [
    'office',
    'virtual',
    'client_site',
    'phone',      // Added for frontend compatibility
    'video',      // Alias for 'virtual' - frontend compatibility
    'in-person',  // Alias for 'office' - frontend compatibility
    'other'
];

/**
 * Supported currencies
 */
const CURRENCIES = [
    'SAR',
    'USD',
    'EUR',
    'GBP',
    'AED'
];

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const appointmentSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        // Not required - solo lawyers use lawyerId instead
        // Validation: Either firmId OR lawyerId must be present (enforced by plugin)
        index: true
    },

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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

    // Appointment classification
    type: {
        type: String,
        enum: APPOINTMENT_TYPES,
        default: 'consultation',
        index: true
    },

    // Source of the appointment
    source: {
        type: String,
        enum: APPOINTMENT_SOURCES,
        default: 'manual'
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

    // Calendar integration (Google Calendar event ID)
    calendarEventId: {
        type: String
    },
    // Microsoft Calendar event ID
    microsoftCalendarEventId: {
        type: String
    },

    // Payment information
    price: {
        type: Number,
        min: 0,
        default: 0
    },
    currency: {
        type: String,
        enum: CURRENCIES,
        default: 'SAR'
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    paymentId: {
        type: String,
        trim: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'bank_transfer', 'online', 'other'],
        default: null
    },
    paidAt: {
        type: Date
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

// IMPORTANT: Include lawyerId in unique index to support solo lawyers
// Without lawyerId, all solo lawyers share firmId=null and would conflict on appointment numbers
// Migration note: If old index exists, drop it manually:
//   db.appointments.dropIndex({ firmId: 1, appointmentNumber: 1 })
appointmentSchema.index({ firmId: 1, lawyerId: 1, appointmentNumber: 1 }, { unique: true });
appointmentSchema.index({ firmId: 1, lawyerId: 1, scheduledTime: 1, status: 1 });
appointmentSchema.index({ firmId: 1, lawyerId: 1, assignedTo: 1, scheduledTime: 1 });
appointmentSchema.index({ firmId: 1, lawyerId: 1, partyId: 1, appointmentWith: 1 });
appointmentSchema.index({ firmId: 1, lawyerId: 1, caseId: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

appointmentSchema.pre('save', async function(next) {
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY VALIDATION
    // Either firmId (firm members) OR lawyerId (solo lawyers) must be present
    // ═══════════════════════════════════════════════════════════════
    if (!this.firmId && !this.lawyerId) {
        return next(new Error('Either firmId or lawyerId is required for tenant isolation'));
    }

    // ═══════════════════════════════════════════════════════════════
    // FRONTEND COMPATIBILITY - Normalize field values
    // ═══════════════════════════════════════════════════════════════

    // Normalize locationType: map frontend values to backend values
    if (this.locationType) {
        const locationTypeMap = {
            'video': 'virtual',
            'in-person': 'office',
            'inperson': 'office',
            'in_person': 'office'
        };
        if (locationTypeMap[this.locationType]) {
            this.locationType = locationTypeMap[this.locationType];
        }
    }

    // Normalize status: map 'pending' to 'scheduled'
    if (this.status === 'pending') {
        this.status = 'scheduled';
    }

    // ═══════════════════════════════════════════════════════════════
    // CALCULATE DERIVED FIELDS
    // ═══════════════════════════════════════════════════════════════

    // Calculate end time
    if (this.scheduledTime && this.duration) {
        this.endTime = new Date(this.scheduledTime.getTime() + this.duration * 60000);
    }

    // Generate appointment number if new
    if (!this.appointmentNumber && this.isNew) {
        const date = new Date();
        const year = date.getFullYear();
        // Build query for either firm members or solo lawyers
        const countQuery = {
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        };
        if (this.firmId) {
            countQuery.firmId = this.firmId;
        } else if (this.lawyerId) {
            countQuery.lawyerId = this.lawyerId;
        }
        const count = await mongoose.model('Appointment').countDocuments(countQuery);
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
 * @param {Object} firmQuery - Tenant filter (firmId or lawyerId from req.firmQuery)
 * @param {Date} date - Date to check
 * @param {ObjectId} assignedTo - User ID
 * @param {Number} duration - Slot duration in minutes
 * @param {Object} workingHours - Working hours config
 * @param {Number} buffer - Buffer between appointments
 * @returns {Promise<Array>} Array of available slots
 */
appointmentSchema.statics.getAvailableSlots = async function(
    firmQuery,
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

    // Get existing appointments for the day - use firmQuery for tenant isolation
    const appointments = await this.find({
        ...firmQuery,
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

/**
 * Get revenue statistics for appointments
 * @param {Object} firmQuery - Tenant filter (firmId or lawyerId)
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Object>} Revenue statistics
 */
appointmentSchema.statics.getRevenueStats = async function(firmQuery, startDate, endDate) {
    const matchQuery = {
        ...firmQuery,
        scheduledTime: { $gte: startDate, $lte: endDate }
    };

    // Convert firmQuery ObjectIds for aggregation
    if (matchQuery.firmId && typeof matchQuery.firmId === 'string') {
        matchQuery.firmId = new mongoose.Types.ObjectId(matchQuery.firmId);
    }
    if (matchQuery.lawyerId && typeof matchQuery.lawyerId === 'string') {
        matchQuery.lawyerId = new mongoose.Types.ObjectId(matchQuery.lawyerId);
    }

    const result = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                revenueTotal: {
                    $sum: {
                        $cond: [{ $eq: ['$isPaid', true] }, '$price', 0]
                    }
                },
                revenuePending: {
                    $sum: {
                        $cond: [
                            { $and: [
                                { $eq: ['$isPaid', false] },
                                { $in: ['$status', ['scheduled', 'confirmed', 'completed']] }
                            ]},
                            '$price',
                            0
                        ]
                    }
                },
                totalAppointments: { $sum: 1 },
                paidAppointments: {
                    $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] }
                },
                unpaidAppointments: {
                    $sum: { $cond: [{ $eq: ['$isPaid', false] }, 1, 0] }
                }
            }
        }
    ]);

    return result[0] || {
        revenueTotal: 0,
        revenuePending: 0,
        totalAppointments: 0,
        paidAppointments: 0,
        unpaidAppointments: 0
    };
};

/**
 * Get appointment statistics with revenue
 * @param {Object} firmQuery - Tenant filter
 * @param {Date} startDate - Optional start date
 * @param {Date} endDate - Optional end date
 * @returns {Promise<Object>} Full statistics
 */
appointmentSchema.statics.getFullStats = async function(firmQuery, startDate = null, endDate = null) {
    const matchQuery = { ...firmQuery };

    // Convert firmQuery ObjectIds for aggregation
    if (matchQuery.firmId && typeof matchQuery.firmId === 'string') {
        matchQuery.firmId = new mongoose.Types.ObjectId(matchQuery.firmId);
    }
    if (matchQuery.lawyerId && typeof matchQuery.lawyerId === 'string') {
        matchQuery.lawyerId = new mongoose.Types.ObjectId(matchQuery.lawyerId);
    }

    if (startDate && endDate) {
        matchQuery.scheduledTime = { $gte: startDate, $lte: endDate };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [statusCounts, revenueStats, todayCount, weekCount, monthCount] = await Promise.all([
        // Status counts
        this.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]),

        // Revenue stats
        this.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    revenueTotal: {
                        $sum: { $cond: [{ $eq: ['$isPaid', true] }, '$price', 0] }
                    },
                    revenuePending: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$isPaid', false] }, { $gt: ['$price', 0] }] },
                                '$price',
                                0
                            ]
                        }
                    }
                }
            }
        ]),

        // Today count
        this.countDocuments({
            ...matchQuery,
            scheduledTime: { $gte: todayStart, $lte: todayEnd }
        }),

        // Week count
        this.countDocuments({
            ...matchQuery,
            scheduledTime: { $gte: weekStart, $lte: weekEnd }
        }),

        // Month count
        this.countDocuments({
            ...matchQuery,
            scheduledTime: { $gte: monthStart, $lte: monthEnd }
        })
    ]);

    // Build status counts object
    const stats = {
        total: 0,
        pending: 0,      // Alias for scheduled (frontend compatibility)
        scheduled: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        todayCount,
        weekCount,
        monthCount,
        revenueTotal: revenueStats[0]?.revenueTotal || 0,
        revenuePending: revenueStats[0]?.revenuePending || 0
    };

    statusCounts.forEach(item => {
        stats.total += item.count;
        switch (item._id) {
            case 'scheduled':
                stats.scheduled = item.count;
                stats.pending = item.count; // Alias
                break;
            case 'confirmed':
                stats.confirmed = item.count;
                break;
            case 'completed':
                stats.completed = item.count;
                break;
            case 'cancelled':
                stats.cancelled = item.count;
                break;
            case 'no_show':
                stats.noShow = item.count;
                break;
        }
    });

    return stats;
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

/**
 * Mark appointment as paid
 * @param {String} paymentId - Payment transaction ID
 * @param {String} paymentMethod - Payment method used
 */
appointmentSchema.methods.markAsPaid = async function(paymentId, paymentMethod = 'other') {
    this.isPaid = true;
    this.paymentId = paymentId;
    this.paymentMethod = paymentMethod;
    this.paidAt = new Date();
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

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Export model and constants
module.exports = Appointment;
module.exports.APPOINTMENT_STATUSES = APPOINTMENT_STATUSES;
module.exports.APPOINTMENT_TYPES = APPOINTMENT_TYPES;
module.exports.APPOINTMENT_SOURCES = APPOINTMENT_SOURCES;
module.exports.APPOINTMENT_WITH_TYPES = APPOINTMENT_WITH_TYPES;
module.exports.LOCATION_TYPES = LOCATION_TYPES;
module.exports.CURRENCIES = CURRENCIES;
