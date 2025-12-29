const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ═══════════════════════════════════════════════════════════════
// CHURN EVENT MODEL - CUSTOMER LIFECYCLE TRACKING
// ═══════════════════════════════════════════════════════════════

const churnEventSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
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
    // ═══════════════════════════════════════════════════════════════
    // EVENT CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    eventType: {
        type: String,
        enum: ['churned', 'downgraded', 'paused', 'reactivated', 'expanded', 'renewed'],
        required: true,
        index: true
    },
    eventDate: {
        type: Date,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PRE-EVENT SNAPSHOT FOR ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    preEventSnapshot: {
        healthScore: Number,
        riskTier: String,
        churnProbability: Number,
        planId: String,
        mrr: Number,
        activeUsers: Number,
        tenureMonths: Number,
        lastLoginDate: Date,
        openSupportTickets: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // CHURN REASON ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    reason: {
        primary: {
            type: String,
            enum: [
                'price_too_high',
                'budget_cuts',
                'competitor',
                'product_fit',
                'missing_features',
                'poor_support',
                'technical_issues',
                'business_closed',
                'merger_acquisition',
                'internal_solution',
                'not_using',
                'contract_ended',
                'payment_failed',
                'other',
                'unknown'
            ]
        },
        secondary: String,
        details: String,
        competitorName: String
    },

    // ═══════════════════════════════════════════════════════════════
    // INTERVENTION HISTORY BEFORE CHURN
    // ═══════════════════════════════════════════════════════════════
    interventionsAttempted: [{
        interventionType: String,
        date: Date,
        channel: {
            type: String,
            enum: ['email', 'call', 'meeting', 'in_app', 'offer']
        },
        outcome: {
            type: String,
            enum: ['no_response', 'positive', 'negative', 'neutral']
        },
        notes: String,
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // REVENUE IMPACT
    // ═══════════════════════════════════════════════════════════════
    revenueImpact: {
        lostMRR: Number,
        lostARR: Number,
        lifetimeValue: Number,
        monthsAsCustomer: Number,
        totalRevenue: Number,
        outstandingBalance: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // EXIT SURVEY/FEEDBACK
    // ═══════════════════════════════════════════════════════════════
    exitSurvey: {
        completed: { type: Boolean, default: false },
        completedAt: Date,
        overallSatisfaction: { type: Number, min: 1, max: 5 },
        wouldRecommend: Boolean,
        responses: Schema.Types.Mixed,
        verbatimFeedback: String,
        willingToReturn: Boolean,
        returnConditions: String
    },

    // ═══════════════════════════════════════════════════════════════
    // WIN-BACK TRACKING
    // ═══════════════════════════════════════════════════════════════
    winBack: {
        eligible: { type: Boolean, default: true },
        attemptedAt: [Date],
        campaignsSent: [String],
        reactivatedAt: Date,
        reactivationOffer: String
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    recordedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String,
    tags: [String]
}, {
    timestamps: true,
    collection: 'churnEvents',
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
churnEventSchema.index({ eventType: 1, eventDate: -1 });
churnEventSchema.index({ 'reason.primary': 1 });
churnEventSchema.index({ 'revenueImpact.lostMRR': -1 });
churnEventSchema.index({ firmId: 1, eventType: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate churn rate for a given period
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Promise<object>} Churn rate statistics
 */
churnEventSchema.statics.getChurnRate = async function(startDate, endDate) {
    const churned = await this.countDocuments({
        eventType: 'churned',
        eventDate: { $gte: startDate, $lte: endDate }
    });

    const Firm = mongoose.model('Firm');
    const totalFirms = await Firm.countDocuments({
        createdAt: { $lte: endDate },
        status: { $ne: 'deleted' }
    });

    return {
        churned,
        total: totalFirms,
        rate: totalFirms > 0 ? parseFloat((churned / totalFirms * 100).toFixed(2)) : 0,
        period: {
            start: startDate,
            end: endDate
        }
    };
};

/**
 * Get breakdown of churn reasons for a period
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Promise<Array>} Churn reasons breakdown
 */
churnEventSchema.statics.getChurnReasonBreakdown = function(startDate, endDate) {
    return this.aggregate([
        { $match: {
            eventType: 'churned',
            eventDate: { $gte: startDate, $lte: endDate }
        }},
        { $group: {
            _id: '$reason.primary',
            count: { $sum: 1 },
            totalLostMRR: { $sum: '$revenueImpact.lostMRR' },
            avgHealthScore: { $avg: '$preEventSnapshot.healthScore' },
            avgChurnProbability: { $avg: '$preEventSnapshot.churnProbability' }
        }},
        { $sort: { count: -1 } },
        { $project: {
            _id: 0,
            reason: '$_id',
            count: 1,
            totalLostMRR: { $round: ['$totalLostMRR', 2] },
            avgHealthScore: { $round: ['$avgHealthScore', 2] },
            avgChurnProbability: { $round: ['$avgChurnProbability', 2] }
        }}
    ]);
};

/**
 * Get total lost revenue for a period
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Promise<object>} Lost revenue statistics
 */
churnEventSchema.statics.getLostRevenue = async function(startDate, endDate) {
    const result = await this.aggregate([
        { $match: {
            eventType: 'churned',
            eventDate: { $gte: startDate, $lte: endDate }
        }},
        { $group: {
            _id: null,
            totalLostMRR: { $sum: '$revenueImpact.lostMRR' },
            totalLostARR: { $sum: '$revenueImpact.lostARR' },
            avgLifetimeValue: { $avg: '$revenueImpact.lifetimeValue' },
            count: { $sum: 1 }
        }},
        { $project: {
            _id: 0,
            totalLostMRR: { $round: ['$totalLostMRR', 2] },
            totalLostARR: { $round: ['$totalLostARR', 2] },
            avgLifetimeValue: { $round: ['$avgLifetimeValue', 2] },
            count: 1
        }}
    ]);

    return result[0] || {
        totalLostMRR: 0,
        totalLostARR: 0,
        avgLifetimeValue: 0,
        count: 0
    };
};

/**
 * Get churn events by firm
 * @param {string} firmId - Firm ID
 * @returns {Promise<Array>} All churn events for the firm
 */
churnEventSchema.statics.getByFirm = function(firmId) {
    return this.find({ firmId })
        .sort({ eventDate: -1 })
        .populate('recordedBy', 'firstName lastName email')
        .populate('interventionsAttempted.performedBy', 'firstName lastName email');
};

/**
 * Get firms eligible for win-back campaigns
 * @param {number} daysSinceChurn - Days since churn (default: 30)
 * @returns {Promise<Array>} Eligible firms
 */
churnEventSchema.statics.getWinBackEligible = function(daysSinceChurn = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceChurn);

    return this.find({
        eventType: 'churned',
        eventDate: { $gte: cutoffDate },
        'winBack.eligible': true,
        'winBack.reactivatedAt': { $exists: false }
    })
    .populate('firmId', 'name email')
    .sort({ 'revenueImpact.lifetimeValue': -1 });
};

/**
 * Get intervention effectiveness statistics
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Promise<Array>} Intervention effectiveness data
 */
churnEventSchema.statics.getInterventionEffectiveness = async function(startDate, endDate) {
    return this.aggregate([
        { $match: {
            eventType: 'churned',
            eventDate: { $gte: startDate, $lte: endDate }
        }},
        { $unwind: '$interventionsAttempted' },
        { $group: {
            _id: {
                type: '$interventionsAttempted.interventionType',
                outcome: '$interventionsAttempted.outcome'
            },
            count: { $sum: 1 }
        }},
        { $group: {
            _id: '$_id.type',
            outcomes: {
                $push: {
                    outcome: '$_id.outcome',
                    count: '$count'
                }
            },
            total: { $sum: '$count' }
        }},
        { $sort: { total: -1 } },
        { $project: {
            _id: 0,
            interventionType: '$_id',
            outcomes: 1,
            total: 1
        }}
    ]);
};

/**
 * Get customer lifecycle events timeline
 * @param {string} firmId - Firm ID
 * @returns {Promise<Array>} Timeline of all events
 */
churnEventSchema.statics.getLifecycleTimeline = function(firmId) {
    return this.find({ firmId })
        .select('eventType eventDate reason.primary revenueImpact preEventSnapshot')
        .sort({ eventDate: 1 });
};

/**
 * Get churn prediction accuracy
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Promise<object>} Prediction accuracy metrics
 */
churnEventSchema.statics.getPredictionAccuracy = async function(startDate, endDate) {
    const events = await this.find({
        eventType: 'churned',
        eventDate: { $gte: startDate, $lte: endDate },
        'preEventSnapshot.churnProbability': { $exists: true }
    });

    if (events.length === 0) {
        return {
            totalEvents: 0,
            accuracy: 0
        };
    }

    let correctPredictions = 0;

    events.forEach(event => {
        const churnProb = event.preEventSnapshot.churnProbability;
        const riskTier = event.preEventSnapshot.riskTier;

        // Consider prediction correct if:
        // - Churn probability >= 60% OR
        // - Risk tier was 'critical' or 'atRisk'
        if (churnProb >= 60 || riskTier === 'critical' || riskTier === 'atRisk') {
            correctPredictions++;
        }
    });

    return {
        totalEvents: events.length,
        correctPredictions,
        accuracy: parseFloat((correctPredictions / events.length * 100).toFixed(2)),
        period: {
            start: startDate,
            end: endDate
        }
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Add win-back attempt
 * @param {string} campaign - Campaign name
 * @returns {Promise<object>} Updated churn event
 */
churnEventSchema.methods.addWinBackAttempt = async function(campaign) {
    this.winBack.attemptedAt.push(new Date());
    this.winBack.campaignsSent.push(campaign);

    return this.save();
};

/**
 * Mark as reactivated
 * @param {string} offer - Reactivation offer used
 * @returns {Promise<object>} Updated churn event
 */
churnEventSchema.methods.markReactivated = async function(offer = '') {
    this.winBack.reactivatedAt = new Date();
    this.winBack.reactivationOffer = offer;

    return this.save();
};

/**
 * Check if eligible for win-back
 * @param {number} maxDaysSinceChurn - Maximum days since churn (default: 90)
 * @returns {boolean} True if eligible
 */
churnEventSchema.methods.isWinBackEligible = function(maxDaysSinceChurn = 90) {
    if (!this.winBack.eligible || this.winBack.reactivatedAt) {
        return false;
    }

    const daysSinceChurn = Math.floor(
        (new Date() - this.eventDate) / (1000 * 60 * 60 * 24)
    );

    return daysSinceChurn <= maxDaysSinceChurn;
};

/**
 * Get summary of churn event
 * @returns {object} Event summary
 */
churnEventSchema.methods.getSummary = function() {
    return {
        eventId: this._id,
        firmId: this.firmId,
        eventType: this.eventType,
        eventDate: this.eventDate,
        reason: this.reason.primary,
        revenueImpact: {
            lostMRR: this.revenueImpact.lostMRR,
            lostARR: this.revenueImpact.lostARR,
            lifetimeValue: this.revenueImpact.lifetimeValue
        },
        preEventScore: this.preEventSnapshot.healthScore,
        preEventRisk: this.preEventSnapshot.riskTier,
        interventionsCount: this.interventionsAttempted.length,
        winBackEligible: this.isWinBackEligible(),
        exitSurveyCompleted: this.exitSurvey.completed
    };
};

module.exports = mongoose.model('ChurnEvent', churnEventSchema);
