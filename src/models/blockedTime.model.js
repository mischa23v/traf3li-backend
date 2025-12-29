/**
 * Blocked Time Model
 *
 * Manages blocked time periods when a lawyer is unavailable for appointments.
 * Supports one-time blocks (vacation, meetings) and recurring blocks.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly'];

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const recurrencePatternSchema = new mongoose.Schema({
    frequency: {
        type: String,
        enum: RECURRENCE_FREQUENCIES,
        required: true
    },
    interval: {
        type: Number,
        default: 1,
        min: 1,
        max: 12
    },
    endDate: {
        type: Date
    },
    daysOfWeek: [{
        type: Number,
        min: 0,
        max: 6
    }]
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const blockedTimeSchema = new mongoose.Schema({
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
        required: true,
        index: true
    },

    startDateTime: {
        type: Date,
        required: true,
        index: true
    },

    endDateTime: {
        type: Date,
        required: true
    },

    reason: {
        type: String,
        trim: true,
        maxlength: 500
    },

    isAllDay: {
        type: Boolean,
        default: false
    },

    isRecurring: {
        type: Boolean,
        default: false
    },

    recurrencePattern: {
        type: recurrencePatternSchema,
        default: null
    },

    // For tracking recurring instances
    parentBlockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BlockedTime',
        index: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

blockedTimeSchema.index({ firmId: 1, lawyerId: 1, startDateTime: 1, endDateTime: 1 });
blockedTimeSchema.index({ lawyerId: 1, startDateTime: 1, endDateTime: 1 });

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

blockedTimeSchema.pre('save', function(next) {
    // Validate that endDateTime is after startDateTime
    if (this.endDateTime <= this.startDateTime) {
        return next(new Error('endDateTime must be after startDateTime'));
    }

    // If recurring, recurrencePattern is required
    if (this.isRecurring && !this.recurrencePattern) {
        return next(new Error('recurrencePattern is required for recurring blocks'));
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get blocked times for a date range
 * @param {ObjectId} lawyerId - Lawyer's user ID
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {Object} firmQuery - Firm isolation query
 * @returns {Promise<Array>} Array of blocked times
 */
blockedTimeSchema.statics.getForDateRange = async function(lawyerId, startDate, endDate, firmQuery = {}) {
    return this.find({
        ...firmQuery,
        lawyerId,
        $or: [
            // Block starts within range
            { startDateTime: { $gte: startDate, $lte: endDate } },
            // Block ends within range
            { endDateTime: { $gte: startDate, $lte: endDate } },
            // Block spans the entire range
            { startDateTime: { $lte: startDate }, endDateTime: { $gte: endDate } }
        ]
    }).sort({ startDateTime: 1 });
};

/**
 * Check if a time slot is blocked
 * @param {ObjectId} lawyerId - Lawyer's user ID
 * @param {Date} startTime - Slot start time
 * @param {Date} endTime - Slot end time
 * @param {Object} firmQuery - Firm isolation query
 * @returns {Promise<boolean>} True if slot is blocked
 */
blockedTimeSchema.statics.isTimeBlocked = async function(lawyerId, startTime, endTime, firmQuery = {}) {
    const conflict = await this.findOne({
        ...firmQuery,
        lawyerId,
        $or: [
            // Block overlaps with slot start
            { startDateTime: { $lte: startTime }, endDateTime: { $gt: startTime } },
            // Block overlaps with slot end
            { startDateTime: { $lt: endTime }, endDateTime: { $gte: endTime } },
            // Block is within slot
            { startDateTime: { $gte: startTime }, endDateTime: { $lte: endTime } }
        ]
    });

    return !!conflict;
};

/**
 * Get all blocked times for a lawyer
 * @param {ObjectId} lawyerId - Lawyer's user ID
 * @param {Object} firmQuery - Firm isolation query
 * @returns {Promise<Array>} Array of blocked times
 */
blockedTimeSchema.statics.getForLawyer = async function(lawyerId, firmQuery = {}) {
    return this.find({
        ...firmQuery,
        lawyerId,
        // Only return future or ongoing blocks
        endDateTime: { $gte: new Date() }
    }).sort({ startDateTime: 1 });
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get duration in minutes
 */
blockedTimeSchema.virtual('durationMinutes').get(function() {
    return Math.round((this.endDateTime - this.startDateTime) / (1000 * 60));
});

/**
 * Check if block is currently active
 */
blockedTimeSchema.virtual('isActive').get(function() {
    const now = new Date();
    return this.startDateTime <= now && this.endDateTime >= now;
});

blockedTimeSchema.set('toJSON', { virtuals: true });
blockedTimeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BlockedTime', blockedTimeSchema);
