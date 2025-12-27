/**
 * SalesForecast Model
 *
 * Multi-tenant sales forecasting model for revenue tracking and quota management.
 * Security: Includes firmId for multi-tenant isolation.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PERIOD_TYPES = ['monthly', 'quarterly', 'yearly'];
const SCOPE_TYPES = ['firm', 'team', 'territory', 'user'];
const FORECAST_STATUSES = ['draft', 'submitted', 'approved', 'locked'];
const ADJUSTMENT_TYPES = ['override', 'adjustment', 'correction'];

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const salesForecastSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY (Required for firm isolation)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // FORECAST IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    forecastId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },

    // ═══════════════════════════════════════════════════════════════
    // PERIOD
    // ═══════════════════════════════════════════════════════════════
    periodType: {
        type: String,
        enum: PERIOD_TYPES,
        required: true,
        index: true
    },
    periodStart: {
        type: Date,
        required: true,
        index: true
    },
    periodEnd: {
        type: Date,
        required: true,
        index: true
    },
    fiscalYear: {
        type: Number,
        index: true
    },
    fiscalQuarter: {
        type: Number,
        min: 1,
        max: 4,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SCOPE
    // ═══════════════════════════════════════════════════════════════
    scopeType: {
        type: String,
        enum: SCOPE_TYPES,
        default: 'firm',
        index: true
    },
    salesTeamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesTeam',
        index: true
    },
    territoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Territory',
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TARGETS
    // ═══════════════════════════════════════════════════════════════
    quota: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR',
        maxlength: 3
    },

    // ═══════════════════════════════════════════════════════════════
    // FORECAST CATEGORIES
    // ═══════════════════════════════════════════════════════════════
    pipeline: {
        amount: {
            type: Number,
            default: 0,
            min: 0
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    bestCase: {
        amount: {
            type: Number,
            default: 0,
            min: 0
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    commit: {
        amount: {
            type: Number,
            default: 0,
            min: 0
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    closedWon: {
        amount: {
            type: Number,
            default: 0,
            min: 0
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CALCULATED FIELDS
    // ═══════════════════════════════════════════════════════════════
    forecastTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    weightedForecast: {
        type: Number,
        default: 0,
        min: 0
    },
    quotaAttainment: {
        type: Number,
        default: 0,
        min: 0
    },
    gap: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // ADJUSTMENTS
    // ═══════════════════════════════════════════════════════════════
    adjustments: [{
        type: {
            type: String,
            enum: ADJUSTMENT_TYPES
        },
        amount: {
            type: Number,
            default: 0
        },
        reason: {
            type: String,
            trim: true,
            maxlength: 500
        },
        adjustedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        adjustedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: FORECAST_STATUSES,
        default: 'draft',
        index: true
    },
    submittedAt: {
        type: Date
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // LAST CALCULATION
    // ═══════════════════════════════════════════════════════════════
    lastCalculatedAt: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        trim: true,
        maxlength: 5000
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
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

// Unique forecast ID
salesForecastSchema.index({ firmId: 1, forecastId: 1 }, { unique: true });

// Common query patterns
salesForecastSchema.index({ firmId: 1, periodStart: 1, periodEnd: 1 });
salesForecastSchema.index({ firmId: 1, scopeType: 1, status: 1 });
salesForecastSchema.index({ firmId: 1, fiscalYear: 1, fiscalQuarter: 1 });
salesForecastSchema.index({ firmId: 1, status: 1, periodStart: 1 });
salesForecastSchema.index({ salesTeamId: 1 });
salesForecastSchema.index({ territoryId: 1 });
salesForecastSchema.index({ userId: 1 });
salesForecastSchema.index({ firmId: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

salesForecastSchema.pre('save', async function(next) {
    // Generate forecast ID if new (FC-YYYY-####)
    if (!this.forecastId && this.isNew) {
        const year = this.periodStart.getFullYear();

        // Count forecasts created this year for this firm
        const count = await mongoose.model('SalesForecast').countDocuments({
            firmId: this.firmId,
            periodStart: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });

        this.forecastId = `FC-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate derived fields
    this.forecastTotal = (this.commit?.amount || 0) + (this.bestCase?.amount || 0);
    this.weightedForecast = ((this.commit?.amount || 0) * 0.9) +
                           ((this.bestCase?.amount || 0) * 0.5) +
                           ((this.pipeline?.amount || 0) * 0.2);
    this.quotaAttainment = this.quota > 0 ?
                          (((this.closedWon?.amount || 0) / this.quota) * 100) : 0;
    this.gap = this.quota - (this.closedWon?.amount || 0) - (this.commit?.amount || 0);

    // Update last calculated timestamp
    this.lastCalculatedAt = new Date();

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get forecasts by period range
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Date} periodStart - Start date
 * @param {Date} periodEnd - End date
 * @returns {Promise<Array>} Array of forecasts
 */
salesForecastSchema.statics.getByPeriod = async function(firmId, periodStart, periodEnd) {
    if (!firmId) {
        throw new Error('firmId is required for multi-tenant isolation');
    }

    return this.find({
        firmId,
        periodStart: { $gte: periodStart },
        periodEnd: { $lte: periodEnd }
    })
    .populate('salesTeamId', 'name')
    .populate('territoryId', 'name')
    .populate('userId', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName')
    .sort({ periodStart: 1 });
};

/**
 * Get current quarter forecasts
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @returns {Promise<Array>} Array of forecasts
 */
salesForecastSchema.statics.getCurrentQuarter = async function(firmId) {
    if (!firmId) {
        throw new Error('firmId is required for multi-tenant isolation');
    }

    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const year = now.getFullYear();

    return this.find({
        firmId,
        fiscalYear: year,
        fiscalQuarter: quarter
    })
    .populate('salesTeamId', 'name')
    .populate('territoryId', 'name')
    .populate('userId', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

/**
 * Get forecasts with filters
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Array of forecasts
 */
salesForecastSchema.statics.getForecasts = async function(firmId, filters = {}) {
    if (!firmId) {
        throw new Error('firmId is required for multi-tenant isolation');
    }

    const query = { firmId };

    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.periodType) query.periodType = filters.periodType;
    if (filters.scopeType) query.scopeType = filters.scopeType;
    if (filters.fiscalYear) query.fiscalYear = filters.fiscalYear;
    if (filters.fiscalQuarter) query.fiscalQuarter = filters.fiscalQuarter;
    if (filters.salesTeamId) query.salesTeamId = filters.salesTeamId;
    if (filters.territoryId) query.territoryId = filters.territoryId;
    if (filters.userId) query.userId = filters.userId;

    // Date range filters
    if (filters.periodStart || filters.periodEnd) {
        query.periodStart = {};
        if (filters.periodStart) query.periodStart.$gte = new Date(filters.periodStart);
        if (filters.periodEnd) query.periodStart.$lte = new Date(filters.periodEnd);
    }

    const skip = filters.skip || 0;
    const limit = filters.limit || 20;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    return this.find(query)
        .populate('salesTeamId', 'name')
        .populate('territoryId', 'name')
        .populate('userId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .populate('submittedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);
};

/**
 * Get forecast by ID with firm isolation
 * @param {String} forecastId - Forecast ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @returns {Promise<Object>} Forecast document
 */
salesForecastSchema.statics.getForecastById = async function(forecastId, firmId) {
    if (!firmId) {
        throw new Error('firmId is required for multi-tenant isolation');
    }

    return this.findOne({ _id: forecastId, firmId })
        .populate('salesTeamId', 'name members')
        .populate('territoryId', 'name region')
        .populate('userId', 'firstName lastName email phone')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .populate('submittedBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .populate('adjustments.adjustedBy', 'firstName lastName');
};

module.exports = mongoose.model('SalesForecast', salesForecastSchema);
