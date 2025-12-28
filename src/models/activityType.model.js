/**
 * Activity Type Model
 *
 * Represents configurable activity types for task/activity scheduling.
 * Similar to Odoo's mail.activity.type, this defines the types of activities
 * that can be created in the system (e.g., call, meeting, email, to-do).
 *
 * Features:
 * - Firm-specific and system-wide activity types
 * - Default delay configurations for deadline calculation
 * - Activity chaining (suggest or auto-trigger follow-up activities)
 * - Model-specific activity types (e.g., only for cases or leads)
 * - Category-based grouping (phonecall, meeting, email, etc.)
 * - FontAwesome icon and decoration type for UI display
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const activityTypeSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        default: null,
        index: true
        // null = system default type available to all firms
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: [true, 'Activity type name is required'],
        trim: true,
        maxlength: 100
    },
    nameAr: {
        type: String,
        required: [true, 'Arabic activity type name is required'],
        trim: true,
        maxlength: 100
    },
    summary: {
        type: String,
        trim: true,
        maxlength: 500
    },

    // ═══════════════════════════════════════════════════════════════
    // DISPLAY & UI
    // ═══════════════════════════════════════════════════════════════
    icon: {
        type: String,
        default: 'fa-tasks',
        trim: true
        // FontAwesome icon class (e.g., 'fa-phone', 'fa-calendar')
    },
    decoration_type: {
        type: String,
        enum: ['warning', 'danger', 'success', 'info'],
        default: 'info'
        // Color/style decoration for UI display
    },

    // ═══════════════════════════════════════════════════════════════
    // MODEL RESTRICTION
    // ═══════════════════════════════════════════════════════════════
    res_model: {
        type: String,
        default: null,
        trim: true
        // If set, this activity type is only available for this model
        // e.g., 'Case', 'Lead', 'Client'
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT DELAY CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    delay_count: {
        type: Number,
        default: 0,
        min: 0
        // Default delay in delay_unit for deadline calculation
    },
    delay_unit: {
        type: String,
        enum: ['days', 'weeks', 'months'],
        default: 'days'
    },
    delay_from: {
        type: String,
        enum: ['current_date', 'previous_activity'],
        default: 'current_date'
        // Calculate deadline from current date or previous activity deadline
    },

    // ═══════════════════════════════════════════════════════════════
    // CATEGORY & TYPE
    // ═══════════════════════════════════════════════════════════════
    category: {
        type: String,
        enum: ['default', 'upload_file', 'phonecall', 'meeting', 'email', 'reminder', 'todo'],
        default: 'default',
        index: true
        // Category for grouping and filtering activity types
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY CHAINING
    // ═══════════════════════════════════════════════════════════════
    chaining_type: {
        type: String,
        enum: ['suggest', 'trigger'],
        default: 'suggest'
        // 'suggest' = suggest next activities to user
        // 'trigger' = auto-create next activity on completion
    },
    suggested_next_type_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActivityType'
        // Array of activity types to suggest after completion
    }],
    triggered_next_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActivityType',
        default: null
        // Single activity type to auto-create on completion
    },

    // ═══════════════════════════════════════════════════════════════
    // BEHAVIOR
    // ═══════════════════════════════════════════════════════════════
    keep_done: {
        type: Boolean,
        default: false
        // Keep activity visible after marked as done
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & SYSTEM FLAGS
    // ═══════════════════════════════════════════════════════════════
    isSystem: {
        type: Boolean,
        default: false,
        index: true
        // System-defined types cannot be deleted
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
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

activityTypeSchema.index({ firmId: 1, category: 1 });
activityTypeSchema.index({ firmId: 1, isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all active types for a firm including system defaults
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Array of activity types (firm + system)
 */
activityTypeSchema.statics.getDefaultTypes = async function(firmId) {
    return this.find({
        $or: [
            { firmId: firmId, isActive: true },
            { firmId: null, isSystem: true, isActive: true }
        ]
    }).sort({ name: 1 });
};

/**
 * Get types applicable to a specific model
 * @param {ObjectId} firmId - Firm ID
 * @param {String} res_model - Model name (e.g., 'Case', 'Lead')
 * @returns {Promise<Array>} Array of activity types
 */
activityTypeSchema.statics.getTypesForModel = async function(firmId, res_model) {
    return this.find({
        $or: [
            { firmId: firmId, isActive: true, res_model: null },
            { firmId: firmId, isActive: true, res_model: res_model },
            { firmId: null, isSystem: true, isActive: true, res_model: null },
            { firmId: null, isSystem: true, isActive: true, res_model: res_model }
        ]
    }).sort({ name: 1 });
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate deadline based on delay configuration
 * @param {Date} fromDate - Start date for calculation (default: now)
 * @returns {Date} Calculated deadline
 */
activityTypeSchema.methods.calculateDeadline = function(fromDate = new Date()) {
    const deadline = new Date(fromDate);

    if (this.delay_count === 0) {
        return deadline;
    }

    switch (this.delay_unit) {
        case 'days':
            deadline.setDate(deadline.getDate() + this.delay_count);
            break;
        case 'weeks':
            deadline.setDate(deadline.getDate() + (this.delay_count * 7));
            break;
        case 'months':
            deadline.setMonth(deadline.getMonth() + this.delay_count);
            break;
    }

    return deadline;
};

/**
 * Check if this is a system type
 * @returns {Boolean} True if system type
 */
activityTypeSchema.methods.isSystemType = function() {
    return this.isSystem === true;
};

/**
 * Check if this type has chaining configured
 * @returns {Boolean} True if has next activities
 */
activityTypeSchema.methods.hasChaining = function() {
    return (this.chaining_type === 'suggest' && this.suggested_next_type_ids?.length > 0) ||
           (this.chaining_type === 'trigger' && this.triggered_next_type_id !== null);
};

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get display name (bilingual)
 */
activityTypeSchema.virtual('displayName').get(function() {
    return `${this.name} / ${this.nameAr}`;
});

/**
 * Get delay description
 */
activityTypeSchema.virtual('delayDescription').get(function() {
    if (this.delay_count === 0) {
        return 'Same day';
    }
    const unit = this.delay_count === 1 ? this.delay_unit.slice(0, -1) : this.delay_unit;
    return `${this.delay_count} ${unit} from ${this.delay_from.replace('_', ' ')}`;
});

activityTypeSchema.set('toJSON', { virtuals: true });
activityTypeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ActivityType', activityTypeSchema);
