const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============ DUNNING STAGE SCHEMA ============
const DunningStageSchema = new Schema({
    order: {
        type: Number,
        required: true,
        min: 1
    },
    daysOverdue: {
        type: Number,
        required: true,
        enum: [7, 14, 30, 60, 90]
    },
    action: {
        type: String,
        required: true,
        enum: ['email', 'sms', 'call', 'collection_agency']
    },
    template: {
        type: String,
        trim: true,
        comment: 'Email template name to use for this stage'
    },
    addLateFee: {
        type: Boolean,
        default: false
    },
    lateFeeAmount: {
        type: Number,
        min: 0,
        default: 0
    },
    lateFeeType: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed'
    },
    escalateTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        comment: 'User to escalate this stage to (e.g., manager, collections team)'
    }
}, { _id: true });

// ============ MAIN DUNNING POLICY SCHEMA ============
const dunningPolicySchema = new Schema({
    // ============ FIRM (Multi-Tenancy) ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ============ BASIC INFO ============
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    // ============ DUNNING STAGES ============
    stages: {
        type: [DunningStageSchema],
        default: [],
        validate: {
            validator: function(stages) {
                // Ensure stages are ordered correctly
                if (stages.length === 0) return true;

                const orders = stages.map(s => s.order);
                const uniqueOrders = new Set(orders);

                // Check for duplicate orders
                if (orders.length !== uniqueOrders.size) return false;

                // Check for duplicate daysOverdue
                const days = stages.map(s => s.daysOverdue);
                const uniqueDays = new Set(days);
                if (days.length !== uniqueDays.size) return false;

                return true;
            },
            message: 'Stages must have unique order values and unique daysOverdue values'
        }
    },

    // ============ PAUSE CONDITIONS ============
    pauseConditions: {
        type: [String],
        enum: ['dispute_open', 'payment_plan_active'],
        default: []
    },

    // ============ STATUS FLAGS ============
    isDefault: {
        type: Boolean,
        default: false,
        comment: 'Whether this is the default dunning policy for the firm'
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // ============ METADATA ============
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
dunningPolicySchema.index({ firmId: 1, isDefault: 1 });
dunningPolicySchema.index({ firmId: 1, isActive: 1 });
dunningPolicySchema.index({ firmId: 1, name: 1 });
dunningPolicySchema.index({ createdAt: -1 });

// Compound indexes for multi-tenant dashboard queries
dunningPolicySchema.index({ firmId: 1, isActive: 1, isDefault: 1 });
dunningPolicySchema.index({ firmId: 1, createdAt: -1 });

// ============ VIRTUALS ============
dunningPolicySchema.virtual('stageCount').get(function() {
    return this.stages ? this.stages.length : 0;
});

dunningPolicySchema.virtual('maxDaysOverdue').get(function() {
    if (!this.stages || this.stages.length === 0) return 0;
    return Math.max(...this.stages.map(s => s.daysOverdue));
});

// ============ PRE-SAVE MIDDLEWARE ============
dunningPolicySchema.pre('save', async function(next) {
    // If this policy is being set as default, unset other defaults for this firm
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            {
                firmId: this.firmId,
                _id: { $ne: this._id },
                isDefault: true
            },
            {
                $set: { isDefault: false }
            }
        ).setOptions({ bypassFirmFilter: true });
    }

    // Sort stages by order
    if (this.stages && this.stages.length > 0) {
        this.stages.sort((a, b) => a.order - b.order);
    }

    next();
});

// ============ STATICS ============
/**
 * Get the default dunning policy for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<DunningPolicy>} - Default dunning policy
 */
dunningPolicySchema.statics.getDefault = async function(firmId) {
    return await this.findOne({
        firmId,
        isDefault: true,
        isActive: true
    });
};

/**
 * Get active dunning policies for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} - List of active dunning policies
 */
dunningPolicySchema.statics.getActivePolicies = async function(firmId) {
    return await this.find({
        firmId,
        isActive: true
    }).sort({ isDefault: -1, name: 1 });
};

/**
 * Get the next dunning stage for an invoice
 * @param {Number} daysOverdue - Number of days the invoice is overdue
 * @returns {Object} - Next dunning stage to execute, or null if no more stages
 */
dunningPolicySchema.methods.getNextStage = function(daysOverdue) {
    if (!this.stages || this.stages.length === 0) return null;

    // Find the first stage where daysOverdue matches or exceeds the stage's threshold
    const nextStage = this.stages.find(stage => daysOverdue >= stage.daysOverdue);

    return nextStage || null;
};

/**
 * Get all applicable stages for a given number of days overdue
 * Returns all stages that should have been executed by now
 * @param {Number} daysOverdue - Number of days the invoice is overdue
 * @returns {Array} - Array of stages that apply
 */
dunningPolicySchema.methods.getApplicableStages = function(daysOverdue) {
    if (!this.stages || this.stages.length === 0) return [];

    // Return all stages where the threshold has been met
    return this.stages.filter(stage => daysOverdue >= stage.daysOverdue);
};

/**
 * Check if dunning should be paused based on conditions
 * @param {Object} invoice - Invoice object
 * @returns {Boolean} - Whether dunning should be paused
 */
dunningPolicySchema.methods.shouldPause = function(invoice) {
    if (!this.pauseConditions || this.pauseConditions.length === 0) {
        return false;
    }

    // Check dispute_open condition
    if (this.pauseConditions.includes('dispute_open') && invoice.dispute?.status === 'open') {
        return true;
    }

    // Check payment_plan_active condition
    if (this.pauseConditions.includes('payment_plan_active') &&
        invoice.paymentPlan?.enabled === true) {
        return true;
    }

    return false;
};

/**
 * Calculate late fee for a given stage
 * @param {Object} stage - Dunning stage
 * @param {Number} invoiceAmount - Invoice amount in halalas
 * @returns {Number} - Late fee amount in halalas
 */
dunningPolicySchema.methods.calculateLateFee = function(stage, invoiceAmount) {
    if (!stage.addLateFee || !stage.lateFeeAmount) {
        return 0;
    }

    if (stage.lateFeeType === 'percentage') {
        // Calculate percentage of invoice amount
        return Math.round((invoiceAmount * stage.lateFeeAmount) / 100);
    }

    // Fixed amount (assume already in halalas)
    const { toHalalas } = require('../utils/currency');
    return Number.isInteger(stage.lateFeeAmount)
        ? stage.lateFeeAmount
        : toHalalas(stage.lateFeeAmount);
};

module.exports = mongoose.model('DunningPolicy', dunningPolicySchema);
