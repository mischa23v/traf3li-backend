const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ═══════════════════════════════════════════════════════════════
// CUSTOMER HEALTH SCORE MODEL - CHURN PREDICTION & PREVENTION
// ═══════════════════════════════════════════════════════════════

const customerHealthScoreSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // COMPOSITE HEALTH SCORE (0-100)
    // ═══════════════════════════════════════════════════════════════
    healthScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    previousScore: {
        type: Number,
        min: 0,
        max: 100
    },
    scoreChange: {
        type: Number
    }, // Difference from previous

    // ═══════════════════════════════════════════════════════════════
    // RISK CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    riskTier: {
        type: String,
        enum: ['healthy', 'warning', 'atRisk', 'critical'],
        required: true,
        index: true
    },
    previousRiskTier: {
        type: String,
        enum: ['healthy', 'warning', 'atRisk', 'critical']
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPONENT SCORES WITH DETAILED FACTORS
    // ═══════════════════════════════════════════════════════════════
    components: {
        // ───────────────────────────────────────────────────────────
        // 1. USAGE SCORE (40% default weight)
        // ───────────────────────────────────────────────────────────
        usage: {
            score: { type: Number, min: 0, max: 100 },
            weight: { type: Number, default: 0.40 },
            factors: {
                loginCount30d: Number,
                loginScore: Number,
                uniqueUsersActive: Number,
                featuresUsed: Number,
                featureAdoptionRate: Number,
                seatUtilization: Number,
                activeMembers: Number,
                licensedSeats: Number,
                avgSessionDuration: Number,
                lastLoginDaysAgo: Number
            }
        },

        // ───────────────────────────────────────────────────────────
        // 2. FINANCIAL SCORE (25% default weight)
        // ───────────────────────────────────────────────────────────
        financial: {
            score: { type: Number, min: 0, max: 100 },
            weight: { type: Number, default: 0.25 },
            factors: {
                paymentSuccessRate: Number,
                overdueInvoices: Number,
                overdueRate: Number,
                avgDaysToPay: Number,
                totalRevenue: Number,
                revenueGrowth: Number,
                lifetimeValue: Number,
                monthsAsCustomer: Number
            }
        },

        // ───────────────────────────────────────────────────────────
        // 3. ENGAGEMENT SCORE (20% default weight)
        // ───────────────────────────────────────────────────────────
        engagement: {
            score: { type: Number, min: 0, max: 100 },
            weight: { type: Number, default: 0.20 },
            factors: {
                emailOpenRate: Number,
                emailClickRate: Number,
                supportTicketsOpen: Number,
                supportTicketsResolved: Number,
                avgTicketResolutionTime: Number,
                npsScore: Number,
                lastSupportContact: Date,
                meetingsAttended: Number
            }
        },

        // ───────────────────────────────────────────────────────────
        // 4. CONTRACT SCORE (15% default weight)
        // ───────────────────────────────────────────────────────────
        contract: {
            score: { type: Number, min: 0, max: 100 },
            weight: { type: Number, default: 0.15 },
            factors: {
                tenureMonths: Number,
                daysUntilRenewal: Number,
                planTier: String,
                contractValue: Number,
                expansionHistory: Number,
                downgradeHistory: Number,
                renewalCount: Number
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TREND ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    trend: {
        direction: {
            type: String,
            enum: ['improving', 'stable', 'declining']
        },
        changePercent: Number,
        velocityScore: Number, // Rate of change
        periodDays: { type: Number, default: 30 }
    },

    // ═══════════════════════════════════════════════════════════════
    // CHURN PREDICTION
    // ═══════════════════════════════════════════════════════════════
    churnProbability: {
        type: Number,
        min: 0,
        max: 100
    },
    predictedChurnDate: Date,
    confidence: {
        type: String,
        enum: ['low', 'medium', 'high']
    },

    // ═══════════════════════════════════════════════════════════════
    // TOP RISK FACTORS (sorted by impact)
    // ═══════════════════════════════════════════════════════════════
    topRiskFactors: [{
        factor: String,
        category: {
            type: String,
            enum: ['usage', 'financial', 'engagement', 'contract']
        },
        impact: Number,
        currentValue: Schema.Types.Mixed,
        threshold: Schema.Types.Mixed,
        recommendation: String,
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // INTERVENTION TRACKING
    // ═══════════════════════════════════════════════════════════════
    interventions: [{
        type: { type: String },
        triggeredAt: Date,
        status: {
            type: String,
            enum: ['pending', 'sent', 'completed', 'failed']
        },
        outcome: String,
        notes: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // MODEL METADATA
    // ═══════════════════════════════════════════════════════════════
    modelVersion: {
        type: String,
        default: 'v1.0'
    },
    dataQuality: {
        type: Number,
        min: 0,
        max: 100
    },
    dataCompleteness: {
        usage: Boolean,
        financial: Boolean,
        engagement: Boolean,
        contract: Boolean
    },

    calculatedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    nextCalculation: Date
}, {
    timestamps: true,
    collection: 'customerHealthScores',
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
customerHealthScoreSchema.index({ firmId: 1, calculatedAt: -1 });
customerHealthScoreSchema.index({ riskTier: 1, healthScore: 1 });
customerHealthScoreSchema.index({ churnProbability: -1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get latest health score for a specific firm
 * @param {string} firmId - Firm ID
 * @returns {Promise<object|null>} Latest health score or null
 */
customerHealthScoreSchema.statics.getLatestByFirm = function(firmId) {
    return this.findOne({ firmId })
        .sort({ calculatedAt: -1 });
};

/**
 * Get firms at risk of churning
 * @param {number} limit - Maximum number of results (default: 50)
 * @returns {Promise<Array>} At-risk firms with their health scores
 */
customerHealthScoreSchema.statics.getAtRiskFirms = function(limit = 50) {
    return this.find({
        riskTier: { $in: ['atRisk', 'critical'] }
    })
    .sort({ churnProbability: -1 })
    .limit(limit)
    .populate('firmId', 'name email');
};

/**
 * Get health score distribution across all firms
 * @returns {Promise<Array>} Distribution by risk tier
 */
customerHealthScoreSchema.statics.getHealthDistribution = async function() {
    return this.aggregate([
        { $sort: { firmId: 1, calculatedAt: -1 } },
        { $group: { _id: '$firmId', latest: { $first: '$$ROOT' } } },
        { $group: {
            _id: '$latest.riskTier',
            count: { $sum: 1 },
            avgScore: { $avg: '$latest.healthScore' }
        }},
        { $sort: { _id: 1 } }
    ]);
};

/**
 * Get firms with declining health scores
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Array>} Firms with declining health
 */
customerHealthScoreSchema.statics.getDecliningFirms = async function(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.aggregate([
        { $match: { calculatedAt: { $gte: cutoffDate } } },
        { $sort: { firmId: 1, calculatedAt: -1 } },
        { $group: {
            _id: '$firmId',
            latest: { $first: '$$ROOT' },
            oldest: { $last: '$$ROOT' }
        }},
        { $match: {
            'latest.healthScore': { $lt: '$oldest.healthScore' }
        }},
        { $project: {
            firmId: '$_id',
            currentScore: '$latest.healthScore',
            previousScore: '$oldest.healthScore',
            scoreDrop: { $subtract: ['$oldest.healthScore', '$latest.healthScore'] },
            currentRiskTier: '$latest.riskTier',
            churnProbability: '$latest.churnProbability'
        }},
        { $sort: { scoreDrop: -1 } }
    ]);
};

/**
 * Get firms needing immediate attention
 * @returns {Promise<Array>} Critical and at-risk firms
 */
customerHealthScoreSchema.statics.getNeedingAttention = async function() {
    return this.aggregate([
        { $sort: { firmId: 1, calculatedAt: -1 } },
        { $group: { _id: '$firmId', latest: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$latest' } },
        { $match: {
            $or: [
                { riskTier: 'critical' },
                { riskTier: 'atRisk', churnProbability: { $gte: 60 } },
                { 'trend.direction': 'declining', healthScore: { $lt: 50 } }
            ]
        }},
        { $lookup: {
            from: 'firms',
            localField: 'firmId',
            foreignField: '_id',
            as: 'firm'
        }},
        { $unwind: '$firm' },
        { $sort: { churnProbability: -1 } }
    ]);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Determine if firm needs intervention
 * @returns {boolean} True if intervention is needed
 */
customerHealthScoreSchema.methods.needsIntervention = function() {
    return this.riskTier === 'critical' ||
           (this.riskTier === 'atRisk' && this.churnProbability >= 60) ||
           (this.trend.direction === 'declining' && this.healthScore < 50);
};

/**
 * Get recommended actions based on risk factors
 * @returns {Array} List of recommended actions
 */
customerHealthScoreSchema.methods.getRecommendedActions = function() {
    const actions = [];

    // Sort risk factors by priority and impact
    const criticalFactors = this.topRiskFactors
        .filter(f => f.priority === 'critical' || f.priority === 'high')
        .sort((a, b) => b.impact - a.impact);

    criticalFactors.forEach(factor => {
        if (factor.recommendation) {
            actions.push({
                factor: factor.factor,
                category: factor.category,
                priority: factor.priority,
                recommendation: factor.recommendation,
                impact: factor.impact
            });
        }
    });

    return actions;
};

/**
 * Add intervention record
 * @param {string} type - Intervention type
 * @param {string} status - Status of intervention
 * @param {string} notes - Optional notes
 * @returns {Promise<object>} Updated health score
 */
customerHealthScoreSchema.methods.addIntervention = async function(type, status = 'pending', notes = '') {
    this.interventions.push({
        type,
        triggeredAt: new Date(),
        status,
        notes
    });

    return this.save();
};

module.exports = mongoose.model('CustomerHealthScore', customerHealthScoreSchema);
