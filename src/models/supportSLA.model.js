const mongoose = require('mongoose');
const Counter = require('./counter.model');

/**
 * Support SLA Model - Service Level Agreement for Support Tickets
 *
 * This model defines SLA policies for support tickets, including response times,
 * resolution times, working hours, and holidays. Simpler than the general SLA model,
 * specifically designed for the support module.
 */

// ═══════════════════════════════════════════════════════════════
// WORKING HOURS SUBDOCUMENT
// ═══════════════════════════════════════════════════════════════
const workingHoursSchema = new mongoose.Schema({
    start: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        comment: 'Start time in HH:mm format (e.g., "09:00")'
    },

    end: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        comment: 'End time in HH:mm format (e.g., "17:00")'
    },

    timezone: {
        type: String,
        default: 'Asia/Riyadh',
        comment: 'Timezone for working hours'
    }
}, { _id: false, versionKey: false });

// ═══════════════════════════════════════════════════════════════
// SUPPORT SLA SCHEMA
// ═══════════════════════════════════════════════════════════════
const supportSLASchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    slaId: {
        type: String,
        unique: true,
        required: true,
        index: true,
        comment: 'Auto-generated SLA ID (e.g., SLA-0001)'
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        comment: 'SLA policy name (e.g., "Premium Support", "Standard SLA")'
    },

    nameAr: {
        type: String,
        trim: true,
        maxlength: 200,
        comment: 'SLA policy name in Arabic'
    },

    description: {
        type: String,
        trim: true,
        comment: 'Detailed description of the SLA policy'
    },

    descriptionAr: {
        type: String,
        trim: true,
        comment: 'Detailed description in Arabic'
    },

    // ═══════════════════════════════════════════════════════════════
    // PRIORITY & TYPE
    // ═══════════════════════════════════════════════════════════════
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        required: true,
        index: true,
        comment: 'Priority level this SLA applies to'
    },

    supportType: {
        type: String,
        trim: true,
        comment: 'Type of support (e.g., "technical", "billing", "general")'
    },

    // ═══════════════════════════════════════════════════════════════
    // TIME TARGETS (in minutes)
    // ═══════════════════════════════════════════════════════════════
    firstResponseMinutes: {
        type: Number,
        required: true,
        min: 0,
        comment: 'Target time for first response in minutes'
    },

    resolutionMinutes: {
        type: Number,
        required: true,
        min: 0,
        comment: 'Target time for resolution in minutes'
    },

    // ═══════════════════════════════════════════════════════════════
    // WORKING HOURS
    // ═══════════════════════════════════════════════════════════════
    workingHours: {
        type: workingHoursSchema,
        required: false,
        comment: 'Business working hours for SLA calculations'
    },

    // ═══════════════════════════════════════════════════════════════
    // WORKING DAYS
    // ═══════════════════════════════════════════════════════════════
    workingDays: {
        type: [Number],
        default: [0, 1, 2, 3, 4], // Sunday to Thursday (Saudi work week)
        validate: {
            validator: function(days) {
                return days.every(day => day >= 0 && day <= 6);
            },
            message: 'Working days must be between 0 (Sunday) and 6 (Saturday)'
        },
        comment: 'Array of working days (0=Sunday, 1=Monday, ..., 6=Saturday)'
    },

    // ═══════════════════════════════════════════════════════════════
    // HOLIDAYS
    // ═══════════════════════════════════════════════════════════════
    holidays: {
        type: [String],
        default: [],
        validate: {
            validator: function(holidays) {
                return holidays.every(holiday => {
                    const date = new Date(holiday);
                    return !isNaN(date.getTime());
                });
            },
            message: 'Holidays must be valid ISO date strings'
        },
        comment: 'Array of holiday dates in ISO format (YYYY-MM-DD)'
    },

    // ═══════════════════════════════════════════════════════════════
    // WARNING THRESHOLDS (percentage of target time)
    // ═══════════════════════════════════════════════════════════════
    warningThreshold: {
        type: Number,
        default: 80,
        min: 0,
        max: 100,
        comment: 'Percentage of target time before warning (e.g., 80 means warn at 80% of time elapsed)'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & FLAGS
    // ═══════════════════════════════════════════════════════════════
    isDefault: {
        type: Boolean,
        default: false,
        index: true,
        comment: 'Whether this is the default SLA policy'
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        required: true,
        index: true,
        comment: 'Status of the SLA policy'
    },

    // ═══════════════════════════════════════════════════════════════
    // APPLICABILITY
    // ═══════════════════════════════════════════════════════════════
    applicableTicketTypes: {
        type: [String],
        default: [],
        comment: 'Ticket types this SLA applies to (empty = all types)'
    },

    applicableChannels: {
        type: [String],
        default: [],
        comment: 'Communication channels this SLA applies to (empty = all channels)'
    },

    // ═══════════════════════════════════════════════════════════════
    // ESCALATION
    // ═══════════════════════════════════════════════════════════════
    escalationEnabled: {
        type: Boolean,
        default: false,
        comment: 'Whether to enable automatic escalation on breach'
    },

    escalationLevels: [{
        level: {
            type: Number,
            required: true
        },
        percentageOfTarget: {
            type: Number,
            required: true,
            min: 0,
            max: 200
        },
        notifyUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        notifyRoles: {
            type: [String],
            default: []
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true,
        comment: 'Firm this SLA policy belongs to'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who created this SLA policy'
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        comment: 'User who last updated this SLA policy'
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
supportSLASchema.index({ firmId: 1, status: 1, priority: 1 });
supportSLASchema.index({ firmId: 1, isDefault: 1 });
supportSLASchema.index({ firmId: 1, name: 1 });
supportSLASchema.index({ firmId: 1, supportType: 1 });

// Ensure only one default SLA per firm per priority
supportSLASchema.index(
    { firmId: 1, priority: 1, isDefault: 1 },
    {
        unique: true,
        partialFilterExpression: { isDefault: true }
    }
);

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════
supportSLASchema.virtual('firstResponseHours').get(function() {
    return this.firstResponseMinutes / 60;
});

supportSLASchema.virtual('resolutionHours').get(function() {
    return this.resolutionMinutes / 60;
});

supportSLASchema.virtual('isActive').get(function() {
    return this.status === 'active';
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate next SLA ID
 * @returns {Promise<String>} - Formatted SLA ID (e.g., SLA-0001)
 */
supportSLASchema.statics.generateSLAId = async function() {
    const seq = await Counter.getNextSequence('supportSLA');
    return `SLA-${String(seq).padStart(4, '0')}`;
};

/**
 * Get default SLA for a priority level
 */
supportSLASchema.statics.getDefaultSLA = async function(firmId, priority = 'medium') {
    const sla = await this.findOne({
        firmId,
        priority,
        isDefault: true,
        status: 'active'
    });

    // Fallback to any active SLA for that priority
    if (!sla) {
        return await this.findOne({
            firmId,
            priority,
            status: 'active'
        }).sort({ createdAt: 1 });
    }

    return sla;
};

/**
 * Get active SLAs for a firm
 */
supportSLASchema.statics.getActiveSLAs = async function(firmId) {
    return await this.find({
        firmId,
        status: 'active'
    }).sort({ priority: -1, name: 1 });
};

/**
 * Get SLA by priority and type
 */
supportSLASchema.statics.getBySupportType = async function(firmId, priority, supportType) {
    return await this.findOne({
        firmId,
        priority,
        supportType,
        status: 'active'
    });
};

/**
 * Calculate due dates based on SLA
 */
supportSLASchema.statics.calculateDueDates = function(sla, startDate = new Date()) {
    const firstResponseDue = new Date(startDate.getTime() + sla.firstResponseMinutes * 60000);
    const resolutionDue = new Date(startDate.getTime() + sla.resolutionMinutes * 60000);

    return {
        firstResponseDue,
        resolutionDue
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a date is a working day
 */
supportSLASchema.methods.isWorkingDay = function(date) {
    const dayOfWeek = date.getDay();
    return this.workingDays.includes(dayOfWeek);
};

/**
 * Check if a date is a holiday
 */
supportSLASchema.methods.isHoliday = function(date) {
    const dateStr = date.toISOString().split('T')[0];
    return this.holidays.includes(dateStr);
};

/**
 * Check if a time is within working hours
 */
supportSLASchema.methods.isWithinWorkingHours = function(date) {
    if (!this.workingHours) {
        return true; // 24/7 support if no working hours defined
    }

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return timeStr >= this.workingHours.start && timeStr <= this.workingHours.end;
};

/**
 * Calculate due date considering working hours and days
 */
supportSLASchema.methods.calculateDueDate = function(startDate, durationMinutes) {
    let remainingMinutes = durationMinutes;
    let currentDate = new Date(startDate);

    // If no working hours/days constraints, simple calculation
    if (!this.workingHours || this.workingDays.length === 7) {
        return new Date(currentDate.getTime() + remainingMinutes * 60000);
    }

    while (remainingMinutes > 0) {
        // Skip non-working days and holidays
        while (!this.isWorkingDay(currentDate) || this.isHoliday(currentDate)) {
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(0, 0, 0, 0);
        }

        // Calculate minutes available in current working day
        const [startHour, startMin] = this.workingHours.start.split(':').map(Number);
        const [endHour, endMin] = this.workingHours.end.split(':').map(Number);

        let workDayStart = new Date(currentDate);
        workDayStart.setHours(startHour, startMin, 0, 0);

        let workDayEnd = new Date(currentDate);
        workDayEnd.setHours(endHour, endMin, 0, 0);

        // If current time is before work day start, move to start
        if (currentDate < workDayStart) {
            currentDate = new Date(workDayStart);
        }

        // If current time is after work day end, move to next day
        if (currentDate >= workDayEnd) {
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(0, 0, 0, 0);
            continue;
        }

        // Calculate remaining minutes in current work day
        const minutesLeftInDay = (workDayEnd - currentDate) / 60000;

        if (remainingMinutes <= minutesLeftInDay) {
            // Can complete within current work day
            currentDate = new Date(currentDate.getTime() + remainingMinutes * 60000);
            remainingMinutes = 0;
        } else {
            // Need to continue to next work day
            remainingMinutes -= minutesLeftInDay;
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(0, 0, 0, 0);
        }
    }

    return currentDate;
};

/**
 * Get response and resolution due dates
 */
supportSLASchema.methods.getDueDates = function(ticketCreatedAt = new Date()) {
    return {
        firstResponseDue: this.calculateDueDate(ticketCreatedAt, this.firstResponseMinutes),
        resolutionDue: this.calculateDueDate(ticketCreatedAt, this.resolutionMinutes)
    };
};

/**
 * Set as default SLA for this priority
 */
supportSLASchema.methods.setAsDefault = async function(userId = null) {
    // Unset any existing default for this firm and priority
    await this.constructor.updateMany(
        {
            firmId: this.firmId,
            priority: this.priority,
            _id: { $ne: this._id }
        },
        { isDefault: false }
    );

    this.isDefault = true;
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Activate SLA
 */
supportSLASchema.methods.activate = async function(userId = null) {
    this.status = 'active';
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Deactivate SLA
 */
supportSLASchema.methods.deactivate = async function(userId = null) {
    this.status = 'inactive';
    this.isDefault = false; // Can't be default if inactive
    this.updatedBy = userId;
    await this.save();
    return this;
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

// Pre-save hook to auto-generate SLA ID
supportSLASchema.pre('save', async function(next) {
    if (this.isNew && !this.slaId) {
        this.slaId = await this.constructor.generateSLAId();
    }
    next();
});

// Pre-save hook to update updatedBy
supportSLASchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew && !this.updatedBy) {
        this.updatedBy = this.createdBy;
    }
    next();
});

// Pre-save hook to ensure only one default per firm per priority
supportSLASchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        // Unset any other defaults for this firm and priority
        await this.constructor.updateMany(
            {
                firmId: this.firmId,
                priority: this.priority,
                _id: { $ne: this._id }
            },
            { isDefault: false }
        );
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
module.exports = mongoose.model('SupportSLA', supportSLASchema);
