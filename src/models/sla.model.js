const mongoose = require('mongoose');

/**
 * SLA Model - Service Level Agreement Configuration and Tracking
 *
 * This model manages SLA definitions (templates) and SLA instances (tracking)
 * for the lawyer dashboard CRM system.
 */

// ═══════════════════════════════════════════════════════════════
// METRIC THRESHOLDS SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const metricThresholdSchema = new mongoose.Schema({
    target: {
        type: Number,
        required: true,
        min: 0,
        comment: 'Target time in minutes'
    },
    warning: {
        type: Number,
        required: true,
        min: 0,
        comment: 'Warning threshold in minutes (e.g., 80% of target)'
    },
    breach: {
        type: Number,
        required: true,
        min: 0,
        comment: 'Breach threshold in minutes (when SLA is violated)'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// BUSINESS HOURS SCHEDULE SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const scheduleItemSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: true,
        min: 0,
        max: 6,
        comment: 'Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday'
    },
    startTime: {
        type: String,
        required: true,
        comment: 'Start time in HH:mm format (e.g., "09:00")'
    },
    endTime: {
        type: String,
        required: true,
        comment: 'End time in HH:mm format (e.g., "17:00")'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// SLA SCHEMA (Configuration/Template)
// ═══════════════════════════════════════════════════════════════
const slaSchema = new mongoose.Schema({
    // Basic Info
    name: {
        type: String,
        required: true,
        trim: true,
        comment: 'SLA template name (e.g., "Premium Client SLA", "Standard Response Time")'
    },

    priority: {
        type: String,
        enum: ['urgent', 'high', 'normal', 'low'],
        default: 'normal',
        required: true,
        index: true,
        comment: 'Priority level for this SLA'
    },

    // ═══════════════════════════════════════════════════════════════
    // SLA METRICS
    // ═══════════════════════════════════════════════════════════════
    metrics: {
        // First response time (time to first reply to client)
        firstResponseTime: {
            type: metricThresholdSchema,
            required: false,
            comment: 'Time to first response after ticket/case creation'
        },

        // Next response time (time between subsequent responses)
        nextResponseTime: {
            type: metricThresholdSchema,
            required: false,
            comment: 'Time to respond to client follow-ups'
        },

        // Time to close (total time to close/resolve the case)
        timeToClose: {
            type: metricThresholdSchema,
            required: false,
            comment: 'Total time to close the case'
        },

        // Time to resolve (time to resolve the issue, may differ from close)
        timeToResolve: {
            type: metricThresholdSchema,
            required: false,
            comment: 'Time to resolve the client\'s issue'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS HOURS CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    businessHours: {
        enabled: {
            type: Boolean,
            default: true,
            comment: 'Whether to enforce business hours for SLA calculations'
        },

        schedule: {
            type: [scheduleItemSchema],
            default: [
                { day: 0, startTime: '09:00', endTime: '17:00' }, // Sunday
                { day: 1, startTime: '09:00', endTime: '17:00' }, // Monday
                { day: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
                { day: 3, startTime: '09:00', endTime: '17:00' }, // Wednesday
                { day: 4, startTime: '09:00', endTime: '17:00' }  // Thursday
                // Friday & Saturday off (Saudi work week)
            ],
            comment: 'Business hours schedule for each day of the week'
        },

        timezone: {
            type: String,
            default: 'Asia/Riyadh',
            comment: 'Timezone for business hours (e.g., Asia/Riyadh)'
        },

        holidays: {
            type: [Date],
            default: [],
            comment: 'List of holiday dates when SLA clock is paused'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // PAUSE CONDITIONS
    // ═══════════════════════════════════════════════════════════════
    pauseConditions: {
        type: [String],
        default: ['awaiting_client_response', 'on_hold'],
        comment: 'Conditions that pause the SLA timer (e.g., awaiting_client_response, on_hold, pending_external)'
    },

    // ═══════════════════════════════════════════════════════════════
    // APPLICATION RULES
    // ═══════════════════════════════════════════════════════════════
    appliesTo: {
        channels: {
            type: [String],
            default: ['email', 'phone', 'whatsapp', 'portal'],
            comment: 'Communication channels this SLA applies to'
        },

        customerTiers: {
            type: [String],
            default: [],
            comment: 'Customer tiers this SLA applies to (e.g., premium, standard, basic)'
        },

        issueTypes: {
            type: [String],
            default: [],
            comment: 'Types of issues/cases this SLA applies to'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true,
        comment: 'Firm this SLA belongs to'
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who created this SLA configuration'
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who last updated this SLA configuration'
    }
}, {
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// SLA INSTANCE SCHEMA (Tracking for specific cases/tickets)
// ═══════════════════════════════════════════════════════════════

// Metric status subdocument for SLA instance
const metricStatusSchema = new mongoose.Schema({
    targetTime: {
        type: Date,
        required: false,
        comment: 'When this metric should be completed by'
    },

    actualTime: {
        type: Date,
        required: false,
        comment: 'When this metric was actually completed'
    },

    status: {
        type: String,
        enum: ['pending', 'achieved', 'warning', 'breached'],
        default: 'pending',
        comment: 'Current status of this metric'
    }
}, { _id: false });

const slaInstanceSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // REFERENCES
    // ═══════════════════════════════════════════════════════════════
    ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true,
        index: true,
        comment: 'Reference to the case/ticket this SLA instance is tracking'
    },

    slaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SLA',
        required: true,
        index: true,
        comment: 'Reference to the SLA configuration/template'
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMING
    // ═══════════════════════════════════════════════════════════════
    startedAt: {
        type: Date,
        default: Date.now,
        required: true,
        index: true,
        comment: 'When this SLA instance started tracking'
    },

    pausedAt: {
        type: Date,
        required: false,
        comment: 'When this SLA was paused (null if not paused)'
    },

    totalPausedTime: {
        type: Number,
        default: 0,
        min: 0,
        comment: 'Total time paused in milliseconds'
    },

    // ═══════════════════════════════════════════════════════════════
    // METRIC TRACKING
    // ═══════════════════════════════════════════════════════════════
    metrics: {
        firstResponse: {
            type: metricStatusSchema,
            required: false,
            comment: 'First response time tracking'
        },

        nextResponse: {
            type: metricStatusSchema,
            required: false,
            comment: 'Next response time tracking'
        },

        resolution: {
            type: metricStatusSchema,
            required: false,
            comment: 'Resolution time tracking'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    breachNotificationsSent: {
        type: [String],
        default: [],
        comment: 'List of breach notification types sent (e.g., "warning_80", "breach")'
    },

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true,
        comment: 'Firm this SLA instance belongs to'
    }
}, {
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// SLA template indexes
slaSchema.index({ firmId: 1, priority: 1 });
slaSchema.index({ firmId: 1, name: 1 });
slaSchema.index({ firmId: 1, 'appliesTo.customerTiers': 1 });

// SLA instance indexes
slaInstanceSchema.index({ firmId: 1, ticketId: 1 });
slaInstanceSchema.index({ firmId: 1, slaId: 1 });
slaInstanceSchema.index({ firmId: 1, startedAt: -1 });
slaInstanceSchema.index({ firmId: 1, 'metrics.firstResponse.status': 1 });
slaInstanceSchema.index({ firmId: 1, 'metrics.resolution.status': 1 });
slaInstanceSchema.index({ ticketId: 1, slaId: 1 }, { unique: true }); // One SLA instance per ticket-SLA pair

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Pause the SLA timer
 */
slaInstanceSchema.methods.pause = function() {
    if (!this.pausedAt) {
        this.pausedAt = new Date();
    }
    return this.save();
};

/**
 * Resume the SLA timer
 */
slaInstanceSchema.methods.resume = function() {
    if (this.pausedAt) {
        const pauseDuration = Date.now() - this.pausedAt.getTime();
        this.totalPausedTime += pauseDuration;
        this.pausedAt = null;
    }
    return this.save();
};

/**
 * Calculate elapsed time (excluding paused time)
 */
slaInstanceSchema.methods.getElapsedTime = function() {
    const now = Date.now();
    let elapsed = now - this.startedAt.getTime();

    // Subtract total paused time
    elapsed -= this.totalPausedTime;

    // If currently paused, subtract current pause duration
    if (this.pausedAt) {
        elapsed -= (now - this.pausedAt.getTime());
    }

    return Math.max(0, elapsed); // Return in milliseconds
};

/**
 * Check if a specific metric is breached
 */
slaInstanceSchema.methods.isMetricBreached = function(metricName) {
    const metric = this.metrics[metricName];
    return metric && metric.status === 'breached';
};

/**
 * Check if any metric is breached
 */
slaInstanceSchema.methods.hasAnyBreach = function() {
    return Object.keys(this.metrics).some(key =>
        this.metrics[key] && this.metrics[key].status === 'breached'
    );
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

// Pre-save hook to update updatedBy on SLA configuration changes
slaSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedBy = this.updatedBy || this.createdBy;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
const SLA = mongoose.model('SLA', slaSchema);
const SLAInstance = mongoose.model('SLAInstance', slaInstanceSchema);

module.exports = {
    SLA,
    SLAInstance
};
