/**
 * Sales Quota Model
 *
 * Enterprise-grade quota management for sales teams and individuals.
 * Supports monthly, quarterly, and yearly quotas with breakdown by deal type.
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const salesQuotaSchema = new Schema({
    // Multi-tenant isolation (REQUIRED)
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Assignment - who this quota applies to
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'SalesTeam',
        index: true
    },
    isCompanyWide: {
        type: Boolean,
        default: false
    },

    // Quota identification
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
    description: {
        type: String,
        maxlength: 1000
    },

    // Period configuration
    period: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly', 'custom'],
        required: true
    },
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true,
        index: true
    },

    // Revenue targets
    target: {
        type: Number,
        required: true,
        min: 0
    },
    achieved: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR',
        enum: ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'BHD', 'OMR', 'QAR']
    },

    // Breakdown by deal type
    breakdownByType: {
        newBusiness: {
            target: { type: Number, default: 0, min: 0 },
            achieved: { type: Number, default: 0, min: 0 }
        },
        renewal: {
            target: { type: Number, default: 0, min: 0 },
            achieved: { type: Number, default: 0, min: 0 }
        },
        upsell: {
            target: { type: Number, default: 0, min: 0 },
            achieved: { type: Number, default: 0, min: 0 }
        },
        crossSell: {
            target: { type: Number, default: 0, min: 0 },
            achieved: { type: Number, default: 0, min: 0 }
        }
    },

    // Deal count targets
    dealsTarget: {
        type: Number,
        min: 0
    },
    dealsAchieved: {
        type: Number,
        default: 0,
        min: 0
    },

    // Activity targets (optional)
    activityTargets: {
        calls: { target: Number, achieved: { type: Number, default: 0 } },
        meetings: { target: Number, achieved: { type: Number, default: 0 } },
        emails: { target: Number, achieved: { type: Number, default: 0 } },
        proposals: { target: Number, achieved: { type: Number, default: 0 } }
    },

    // Pipeline targets (optional)
    pipelineTargets: {
        leadsGenerated: { target: Number, achieved: { type: Number, default: 0 } },
        leadsQualified: { target: Number, achieved: { type: Number, default: 0 } },
        proposalsSent: { target: Number, achieved: { type: Number, default: 0 } }
    },

    // Quota adjustments
    adjustments: [{
        date: { type: Date, default: Date.now },
        previousTarget: Number,
        newTarget: Number,
        reason: String,
        adjustedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }],

    // Status tracking
    status: {
        type: String,
        enum: ['draft', 'active', 'completed', 'cancelled', 'exceeded'],
        default: 'draft',
        index: true
    },

    // Performance indicators
    lastUpdatedAt: {
        type: Date,
        default: Date.now
    },
    achievedAt: Date, // When 100% was reached
    exceededAt: Date, // When target was exceeded

    // Linked deals for tracking
    linkedDeals: [{
        dealId: { type: Schema.Types.ObjectId, ref: 'Lead' },
        value: Number,
        dealType: { type: String, enum: ['newBusiness', 'renewal', 'upsell', 'crossSell'] },
        closedAt: Date
    }],

    // Notes
    notes: {
        type: String,
        maxlength: 2000
    },

    // Metadata
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: Progress percentage
salesQuotaSchema.virtual('progressPercentage').get(function() {
    if (!this.target || this.target === 0) return 0;
    return Math.round((this.achieved / this.target) * 100);
});

// Virtual: Remaining amount
salesQuotaSchema.virtual('remaining').get(function() {
    return Math.max(0, this.target - this.achieved);
});

// Virtual: Days remaining in period
salesQuotaSchema.virtual('daysRemaining').get(function() {
    if (!this.endDate) return 0;
    const now = new Date();
    const diff = this.endDate - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual: Daily target to meet quota
salesQuotaSchema.virtual('dailyTargetRequired').get(function() {
    const remaining = this.remaining;
    const daysRemaining = this.daysRemaining;
    if (daysRemaining === 0) return remaining;
    return Math.round(remaining / daysRemaining);
});

// Virtual: Is on track
salesQuotaSchema.virtual('isOnTrack').get(function() {
    if (!this.startDate || !this.endDate || !this.target) return false;
    const now = new Date();
    const totalDays = (this.endDate - this.startDate) / (1000 * 60 * 60 * 24);
    const daysPassed = (now - this.startDate) / (1000 * 60 * 60 * 24);
    const expectedProgress = (daysPassed / totalDays) * this.target;
    return this.achieved >= expectedProgress;
});

// Virtual: Attainment status
salesQuotaSchema.virtual('attainmentStatus').get(function() {
    const progress = this.progressPercentage;
    if (progress >= 100) return 'exceeded';
    if (progress >= 90) return 'on_track';
    if (progress >= 70) return 'at_risk';
    if (progress >= 50) return 'behind';
    return 'critical';
});

// Pre-save: Update status based on achievement
salesQuotaSchema.pre('save', function(next) {
    // Update lastUpdatedAt
    this.lastUpdatedAt = new Date();

    // Check if quota achieved
    if (this.achieved >= this.target && this.status === 'active') {
        if (!this.achievedAt) {
            this.achievedAt = new Date();
        }
        if (this.achieved > this.target && !this.exceededAt) {
            this.exceededAt = new Date();
            this.status = 'exceeded';
        }
    }

    // Check if period ended
    if (this.endDate && new Date() > this.endDate && this.status === 'active') {
        this.status = 'completed';
    }

    next();
});

// Indexes for performance
salesQuotaSchema.index({ firmId: 1, status: 1 });
salesQuotaSchema.index({ firmId: 1, userId: 1, period: 1 });
salesQuotaSchema.index({ firmId: 1, teamId: 1, period: 1 });
salesQuotaSchema.index({ firmId: 1, startDate: 1, endDate: 1 });
salesQuotaSchema.index({ lawyerId: 1, status: 1 });
salesQuotaSchema.index({ lawyerId: 1, startDate: 1, endDate: 1 });

// Static: Get current quota for user
salesQuotaSchema.statics.getCurrentQuota = async function(userId, firmId) {
    const now = new Date();
    return this.findOne({
        userId,
        firmId,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
    });
};

// Static: Get team quotas
salesQuotaSchema.statics.getTeamQuotas = async function(teamId, firmId, period) {
    const query = { teamId, firmId, status: { $in: ['active', 'completed'] } };
    if (period) {
        query.period = period;
    }
    return this.find(query).populate('userId', 'firstName lastName email');
};

// Static: Get leaderboard
salesQuotaSchema.statics.getLeaderboard = async function(firmId, options = {}) {
    const { period, limit = 10 } = options;
    const now = new Date();

    const match = {
        firmId: new mongoose.Types.ObjectId(firmId),
        status: { $in: ['active', 'exceeded'] },
        startDate: { $lte: now },
        endDate: { $gte: now }
    };

    if (period) {
        match.period = period;
    }

    return this.aggregate([
        { $match: match },
        {
            $addFields: {
                progressPercentage: {
                    $cond: [
                        { $eq: ['$target', 0] },
                        0,
                        { $multiply: [{ $divide: ['$achieved', '$target'] }, 100] }
                    ]
                }
            }
        },
        { $sort: { progressPercentage: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                userId: 1,
                userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                userEmail: '$user.email',
                target: 1,
                achieved: 1,
                progressPercentage: 1,
                period: 1,
                status: 1
            }
        }
    ]);
};

// Instance: Record deal achievement
salesQuotaSchema.methods.recordDeal = async function(dealValue, dealType = 'newBusiness', dealId = null) {
    this.achieved += dealValue;

    if (this.breakdownByType[dealType]) {
        this.breakdownByType[dealType].achieved += dealValue;
    }

    this.dealsAchieved += 1;

    if (dealId) {
        this.linkedDeals.push({
            dealId,
            value: dealValue,
            dealType,
            closedAt: new Date()
        });
    }

    return this.save();
};

const SalesQuota = mongoose.model('SalesQuota', salesQuotaSchema);

module.exports = SalesQuota;
