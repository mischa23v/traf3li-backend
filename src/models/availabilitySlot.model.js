/**
 * Availability Slot Model
 *
 * Manages lawyer's weekly availability schedule for appointments.
 * Defines time slots when a lawyer is available for bookings.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6]; // 0=Sunday, 6=Saturday
const SLOT_DURATIONS = [15, 30, 45, 60, 90, 120]; // minutes

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const availabilitySlotSchema = new mongoose.Schema({
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

    dayOfWeek: {
        type: Number,
        required: true,
        min: 0,
        max: 6,
        validate: {
            validator: (v) => DAYS_OF_WEEK.includes(v),
            message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)'
        }
    },

    startTime: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'startTime must be in HH:MM format']
    },

    endTime: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'endTime must be in HH:MM format']
    },

    isActive: {
        type: Boolean,
        default: true
    },

    slotDuration: {
        type: Number,
        default: 30,
        validate: {
            validator: (v) => SLOT_DURATIONS.includes(v),
            message: 'slotDuration must be one of: 15, 30, 45, 60, 90, 120 minutes'
        }
    },

    breakBetweenSlots: {
        type: Number,
        default: 0,
        min: 0,
        max: 60
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

availabilitySlotSchema.index({ firmId: 1, lawyerId: 1, dayOfWeek: 1 });
availabilitySlotSchema.index({ lawyerId: 1, dayOfWeek: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

availabilitySlotSchema.pre('save', function(next) {
    // Validate that endTime is after startTime
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
        return next(new Error('endTime must be after startTime'));
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get availability for a specific lawyer
 * @param {ObjectId} lawyerId - Lawyer's user ID
 * @param {Object} firmQuery - Firm isolation query
 * @returns {Promise<Array>} Array of availability slots
 */
availabilitySlotSchema.statics.getForLawyer = async function(lawyerId, firmQuery = {}) {
    return this.find({
        ...firmQuery,
        lawyerId,
        isActive: true
    }).sort({ dayOfWeek: 1, startTime: 1 });
};

/**
 * Get availability for a specific day
 * @param {ObjectId} lawyerId - Lawyer's user ID
 * @param {Number} dayOfWeek - Day of week (0-6)
 * @param {Object} firmQuery - Firm isolation query
 * @returns {Promise<Array>} Array of availability slots for the day
 */
availabilitySlotSchema.statics.getForDay = async function(lawyerId, dayOfWeek, firmQuery = {}) {
    return this.find({
        ...firmQuery,
        lawyerId,
        dayOfWeek,
        isActive: true
    }).sort({ startTime: 1 });
};

/**
 * Bulk update availability for a lawyer (replaces all slots)
 * @param {ObjectId} lawyerId - Lawyer's user ID
 * @param {ObjectId} firmId - Firm ID
 * @param {Array} slots - Array of slot data
 * @returns {Promise<Array>} Created slots
 */
availabilitySlotSchema.statics.bulkUpdate = async function(lawyerId, firmId, slots) {
    // Delete existing slots for this lawyer
    await this.deleteMany({ lawyerId, firmId });

    // Create new slots
    const slotsWithIds = slots.map(slot => ({
        ...slot,
        lawyerId,
        firmId
    }));

    return this.insertMany(slotsWithIds);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate time slots for this availability period
 * @returns {Array} Array of { startTime, endTime } objects
 */
availabilitySlotSchema.methods.generateTimeSlots = function() {
    const slots = [];
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + this.slotDuration <= endMinutes) {
        const slotStart = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`;
        const slotEndMinutes = currentMinutes + this.slotDuration;
        const slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, '0')}:${String(slotEndMinutes % 60).padStart(2, '0')}`;

        slots.push({
            startTime: slotStart,
            endTime: slotEnd
        });

        currentMinutes += this.slotDuration + this.breakBetweenSlots;
    }

    return slots;
};

module.exports = mongoose.model('AvailabilitySlot', availabilitySlotSchema);
