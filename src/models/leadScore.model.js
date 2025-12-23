const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// AI LEAD SCORING MODEL - COMPREHENSIVE LEAD INTELLIGENCE
// ═══════════════════════════════════════════════════════════════

const leadScoreSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // OVERALL SCORE (0-100 normalized scale)
    // ═══════════════════════════════════════════════════════════════
    totalScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Grade based on score (A: 80-100, B: 60-79, C: 40-59, D: 20-39, F: 0-19)
    grade: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'F'],
        index: true
    },

    // Category for quick filtering
    category: {
        type: String,
        enum: ['hot', 'warm', 'cool', 'cold'],
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AI PREDICTIONS
    // ═══════════════════════════════════════════════════════════════
    conversionProbability: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    confidenceLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },

    predictedCloseDate: Date,
    predictedValue: Number,

    // ═══════════════════════════════════════════════════════════════
    // SCORE BREAKDOWN - 4 MAIN DIMENSIONS
    // ═══════════════════════════════════════════════════════════════
    breakdown: {
        // ───────────────────────────────────────────────────────────
        // 1. DEMOGRAPHIC SCORE (25% default weight)
        // ───────────────────────────────────────────────────────────
        demographic: {
            score: { type: Number, default: 0, min: 0, max: 100 },
            factors: {
                caseType: {
                    value: String,
                    score: Number,
                    weight: { type: Number, default: 30 }
                },
                caseValue: {
                    value: Number,
                    score: Number,
                    weight: { type: Number, default: 25 }
                },
                location: {
                    value: String,
                    score: Number,
                    weight: { type: Number, default: 15 }
                },
                industry: {
                    value: String,
                    score: Number,
                    weight: { type: Number, default: 15 }
                },
                companySize: {
                    value: String,
                    score: Number,
                    weight: { type: Number, default: 15 }
                }
            }
        },

        // ───────────────────────────────────────────────────────────
        // 2. BANT SCORE (30% default weight)
        // ───────────────────────────────────────────────────────────
        bant: {
            score: { type: Number, default: 0, min: 0, max: 100 },
            factors: {
                budget: {
                    value: String, // 'premium', 'high', 'medium', 'low', 'unknown'
                    score: Number,
                    weight: { type: Number, default: 30 }
                },
                authority: {
                    value: String, // 'decision_maker', 'influencer', 'researcher', 'unknown'
                    score: Number,
                    weight: { type: Number, default: 25 }
                },
                need: {
                    value: String, // 'urgent', 'planning', 'exploring', 'unknown'
                    score: Number,
                    weight: { type: Number, default: 25 }
                },
                timeline: {
                    value: String, // 'immediate', 'this_month', 'this_quarter', 'this_year', 'no_timeline'
                    score: Number,
                    weight: { type: Number, default: 20 }
                }
            }
        },

        // ───────────────────────────────────────────────────────────
        // 3. BEHAVIORAL SCORE (30% default weight)
        // ───────────────────────────────────────────────────────────
        behavioral: {
            score: { type: Number, default: 0, min: 0, max: 100 },
            factors: {
                emailEngagement: {
                    score: Number,
                    opens: { type: Number, default: 0 },
                    clicks: { type: Number, default: 0 },
                    replies: { type: Number, default: 0 }
                },
                responseTime: {
                    score: Number,
                    avgHours: Number,
                    fastestHours: Number
                },
                meetingAttendance: {
                    score: Number,
                    scheduled: { type: Number, default: 0 },
                    attended: { type: Number, default: 0 },
                    noShows: { type: Number, default: 0 }
                },
                documentViews: {
                    score: Number,
                    count: { type: Number, default: 0 },
                    totalTimeSeconds: Number
                },
                websiteVisits: {
                    score: Number,
                    count: { type: Number, default: 0 },
                    totalDurationSeconds: Number,
                    pagesViewed: { type: Number, default: 0 }
                },
                phoneCallDuration: {
                    score: Number,
                    totalMinutes: { type: Number, default: 0 },
                    callCount: { type: Number, default: 0 },
                    avgMinutes: Number
                },
                formSubmissions: {
                    score: Number,
                    count: { type: Number, default: 0 }
                },
                interactionFrequency: {
                    score: Number,
                    daysActive: { type: Number, default: 0 },
                    totalInteractions: { type: Number, default: 0 }
                }
            }
        },

        // ───────────────────────────────────────────────────────────
        // 4. ENGAGEMENT SCORE (15% default weight)
        // ───────────────────────────────────────────────────────────
        engagement: {
            score: { type: Number, default: 0, min: 0, max: 100 },
            factors: {
                recency: {
                    score: Number,
                    daysSinceContact: Number,
                    lastContactDate: Date
                },
                frequency: {
                    score: Number,
                    touchpoints: { type: Number, default: 0 },
                    touchpointsLast30Days: { type: Number, default: 0 }
                },
                depth: {
                    score: Number,
                    avgEngagementTimeMinutes: Number,
                    qualityInteractions: { type: Number, default: 0 }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // WEIGHTS (Configurable per firm, must sum to 100)
    // ═══════════════════════════════════════════════════════════════
    weights: {
        demographic: { type: Number, default: 25, min: 0, max: 100 },
        bant: { type: Number, default: 30, min: 0, max: 100 },
        behavioral: { type: Number, default: 30, min: 0, max: 100 },
        engagement: { type: Number, default: 15, min: 0, max: 100 }
    },

    // ═══════════════════════════════════════════════════════════════
    // DECAY MECHANISM
    // ═══════════════════════════════════════════════════════════════
    decay: {
        applied: { type: Number, default: 0, min: 0, max: 100 }, // % decay applied
        lastActivityAt: Date,
        daysSinceActivity: Number,
        nextDecayDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // SCORE HISTORY & TRACKING
    // ═══════════════════════════════════════════════════════════════
    scoreHistory: [{
        score: Number,
        grade: String,
        category: String,
        conversionProbability: Number,
        breakdown: {
            demographic: Number,
            bant: Number,
            behavioral: Number,
            engagement: Number
        },
        calculatedAt: { type: Date, default: Date.now },
        reason: {
            type: String,
            enum: ['scheduled', 'activity', 'manual', 'decay', 'initial']
        },
        triggeredBy: String, // Activity type that triggered recalculation
        notes: String
    }],

    // ═══════════════════════════════════════════════════════════════
    // INSIGHTS & RECOMMENDATIONS
    // ═══════════════════════════════════════════════════════════════
    insights: {
        strengths: [String], // e.g., "High budget capacity", "Decision maker identified"
        weaknesses: [String], // e.g., "Low engagement", "No timeline set"
        recommendations: [String], // Next best actions
        similarConvertedLeads: [{
            leadId: mongoose.Schema.Types.ObjectId,
            similarity: Number,
            conversionTimedays: Number
        }],
        updatedAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // ML SCORE EXTENSION - MACHINE LEARNING ENHANCEMENTS
    // ═══════════════════════════════════════════════════════════════
    mlScore: {
        enabled: { type: Boolean, default: false },
        probability: { type: Number, min: 0, max: 1 }, // ML model probability (0-1)
        calibrated: { type: Boolean, default: true }, // Whether probability is calibrated
        modelVersion: String, // e.g., "xgboost-v2.1", "rf-v1.3"
        method: {
            type: String,
            enum: ['batch', 'realtime'],
            default: 'batch'
        },
        confidence: { type: Number, min: 0, max: 1 }, // Model confidence in prediction
        lastScoredAt: Date,

        // SHAP explainability - helps understand ML model decisions
        shap: {
            baseValue: Number, // Base prediction value before features
            featureContributions: {
                type: Map,
                of: Number // Map of feature name -> SHAP value
            },
            topPositiveFactors: [{
                feature: String,
                impact: Number, // SHAP value
                value: mongoose.Schema.Types.Mixed // Actual feature value
            }],
            topNegativeFactors: [{
                feature: String,
                impact: Number,
                value: mongoose.Schema.Types.Mixed
            }]
        },

        // Sales-friendly explanation derived from SHAP
        salesExplanation: {
            keyStrengths: [String], // Human-readable strengths
            keyWeaknesses: [String], // Human-readable weaknesses
            recommendedActions: [String], // Specific next steps
            urgencyLevel: {
                type: String,
                enum: ['immediate', 'soon', 'scheduled', 'nurture'],
                default: 'nurture'
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // SALES PRIORITY - QUEUE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    salesPriority: {
        tier: {
            type: String,
            enum: ['P1_HOT', 'P2_WARM', 'P3_COOL', 'P4_NURTURE'],
            index: true
        },
        expectedValue: Number, // Predicted revenue from this lead
        slaDeadline: Date, // Service Level Agreement deadline for action
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true
        },
        escalationLevel: { type: Number, default: 0, min: 0 }, // How many times escalated
        lastContactedAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // FEATURE STORE - ML FEATURE ENGINEERING
    // ═══════════════════════════════════════════════════════════════
    features: {
        // ───────────────────────────────────────────────────────────
        // Behavioral features
        // ───────────────────────────────────────────────────────────
        engagementVelocity: Number, // Rate of engagement increase/decrease
        responseSpeedPercentile: Number, // How fast lead responds (0-100)
        meetingReliability: Number, // % of meetings attended
        crossChannelEngagement: Number, // Number of different channels used

        // ───────────────────────────────────────────────────────────
        // BANT interaction features
        // ───────────────────────────────────────────────────────────
        urgencySignal: Number, // Derived urgency score from interactions
        decisionMakerAccess: Boolean, // Direct access to decision maker
        budgetTimelineFit: Number, // How well budget and timeline align

        // ───────────────────────────────────────────────────────────
        // Temporal features
        // ───────────────────────────────────────────────────────────
        activitiesLast7d: Number, // Activity count in last 7 days
        activitiesPrev7d: Number, // Activity count in previous 7 days (8-14 days ago)
        activityTrend: Number, // Ratio of last 7d / prev 7d
        daysInCurrentStatus: Number, // How long in current status

        // ───────────────────────────────────────────────────────────
        // Source quality
        // ───────────────────────────────────────────────────────────
        sourceConversionRate: Number, // Historical conversion rate of this source

        // ───────────────────────────────────────────────────────────
        // Metadata
        // ───────────────────────────────────────────────────────────
        computedAt: Date // When features were last computed
    },

    // ═══════════════════════════════════════════════════════════════
    // CONVERSION TRACKING - OUTCOME MEASUREMENT
    // ═══════════════════════════════════════════════════════════════
    conversion: {
        converted: { type: Boolean, default: false, index: true },
        convertedAt: Date,
        conversionValue: Number, // Actual revenue realized
        conversionType: String, // e.g., "client", "case", "retainer"
        daysToConvert: Number // Days from lead creation to conversion
    },

    // ═══════════════════════════════════════════════════════════════
    // CALCULATION METADATA
    // ═══════════════════════════════════════════════════════════════
    calculation: {
        lastCalculatedAt: Date,
        nextScheduledAt: Date,
        calculationCount: { type: Number, default: 0 },
        lastError: String,
        version: { type: String, default: '1.0' } // Scoring algorithm version
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
leadScoreSchema.index({ firmId: 1, totalScore: -1 });
leadScoreSchema.index({ firmId: 1, grade: 1 });
leadScoreSchema.index({ firmId: 1, category: 1 });
leadScoreSchema.index({ firmId: 1, conversionProbability: -1 });
leadScoreSchema.index({ leadId: 1 }, { unique: true });
leadScoreSchema.index({ 'calculation.nextScheduledAt': 1 });
leadScoreSchema.index({ 'decay.nextDecayDate': 1 });

// ML Score Indexes
leadScoreSchema.index({ firmId: 1, 'mlScore.probability': -1 });
leadScoreSchema.index({ firmId: 1, 'mlScore.enabled': 1 });
leadScoreSchema.index({ 'mlScore.lastScoredAt': 1 });

// Sales Priority Indexes
leadScoreSchema.index({ firmId: 1, 'salesPriority.tier': 1 });
leadScoreSchema.index({ 'salesPriority.assignedTo': 1, 'salesPriority.tier': 1 });
leadScoreSchema.index({ 'salesPriority.slaDeadline': 1 });

// Conversion Tracking Indexes
leadScoreSchema.index({ firmId: 1, 'conversion.converted': 1 });
leadScoreSchema.index({ 'conversion.convertedAt': -1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
leadScoreSchema.virtual('scoreChange').get(function() {
    if (this.scoreHistory.length < 2) return 0;
    const current = this.totalScore;
    const previous = this.scoreHistory[this.scoreHistory.length - 2].score;
    return current - previous;
});

leadScoreSchema.virtual('trending').get(function() {
    const change = this.scoreChange;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
});

leadScoreSchema.set('toJSON', { virtuals: true });
leadScoreSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get leads by grade
leadScoreSchema.statics.getLeadsByGrade = async function(firmId, grade, options = {}) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        grade
    };

    return await this.find(query)
        .populate('leadId', 'firstName lastName companyName email phone status')
        .sort({ totalScore: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

// Get top scoring leads
leadScoreSchema.statics.getTopLeads = async function(firmId, limit = 20) {
    return await this.find({ firmId: new mongoose.Types.ObjectId(firmId) })
        .populate('leadId', 'firstName lastName companyName email phone status estimatedValue')
        .sort({ totalScore: -1 })
        .limit(limit);
};

// Get score distribution
leadScoreSchema.statics.getScoreDistribution = async function(firmId) {
    const distribution = await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
        {
            $group: {
                _id: '$grade',
                count: { $sum: 1 },
                avgScore: { $avg: '$totalScore' },
                avgConversionProb: { $avg: '$conversionProbability' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const categoryDist = await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgScore: { $avg: '$totalScore' }
            }
        }
    ]);

    return {
        byGrade: distribution,
        byCategory: categoryDist,
        total: await this.countDocuments({ firmId: new mongoose.Types.ObjectId(firmId) })
    };
};

// Get leads needing recalculation
leadScoreSchema.statics.getNeedingRecalculation = async function() {
    const now = new Date();
    return await this.find({
        'calculation.nextScheduledAt': { $lte: now }
    }).populate('leadId', 'firstName lastName status');
};

// Get leads needing decay application
leadScoreSchema.statics.getNeedingDecay = async function() {
    const now = new Date();
    return await this.find({
        'decay.nextDecayDate': { $lte: now },
        totalScore: { $gt: 0 }
    }).populate('leadId', 'firstName lastName');
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Add score to history
leadScoreSchema.methods.addToHistory = function(reason, triggeredBy, notes) {
    this.scoreHistory.push({
        score: this.totalScore,
        grade: this.grade,
        category: this.category,
        conversionProbability: this.conversionProbability,
        breakdown: {
            demographic: this.breakdown.demographic.score,
            bant: this.breakdown.bant.score,
            behavioral: this.breakdown.behavioral.score,
            engagement: this.breakdown.engagement.score
        },
        calculatedAt: new Date(),
        reason,
        triggeredBy,
        notes
    });

    // Keep only last 50 history entries
    if (this.scoreHistory.length > 50) {
        this.scoreHistory = this.scoreHistory.slice(-50);
    }
};

// Calculate category based on grade
leadScoreSchema.methods.updateCategory = function() {
    const categoryMap = {
        'A': 'hot',
        'B': 'warm',
        'C': 'cool',
        'D': 'cold',
        'F': 'cold'
    };
    this.category = categoryMap[this.grade] || 'cold';
};

// ───────────────────────────────────────────────────────────
// ML-specific instance methods
// ───────────────────────────────────────────────────────────

/**
 * Check if ML rescoring is needed based on:
 * - Time since last ML scoring
 * - Significant activity changes
 * - Feature staleness
 * @param {Object} options - Configuration options
 * @returns {Boolean} Whether rescoring is needed
 */
leadScoreSchema.methods.needsRescoring = function(options = {}) {
    const {
        maxAgeHours = 24,           // Max hours since last ML scoring
        minActivityChange = 3,       // Min new activities to trigger rescore
        featureAgeHours = 12,        // Max hours for feature freshness
        forceIfNoScore = true        // Force if never scored with ML
    } = options;

    // Never scored with ML
    if (forceIfNoScore && this.mlScore.enabled && !this.mlScore.lastScoredAt) {
        return true;
    }

    // ML not enabled - check traditional scoring
    if (!this.mlScore.enabled) {
        const hoursSinceCalc = this.calculation.lastCalculatedAt
            ? (Date.now() - this.calculation.lastCalculatedAt.getTime()) / (1000 * 60 * 60)
            : Infinity;
        return hoursSinceCalc > maxAgeHours;
    }

    // Check ML score age
    const hoursSinceMLScore = this.mlScore.lastScoredAt
        ? (Date.now() - this.mlScore.lastScoredAt.getTime()) / (1000 * 60 * 60)
        : Infinity;

    if (hoursSinceMLScore > maxAgeHours) {
        return true;
    }

    // Check feature freshness
    const hoursSinceFeatures = this.features.computedAt
        ? (Date.now() - this.features.computedAt.getTime()) / (1000 * 60 * 60)
        : Infinity;

    if (hoursSinceFeatures > featureAgeHours) {
        return true;
    }

    // Check for significant activity changes
    if (this.breakdown.behavioral.factors.interactionFrequency.totalInteractions) {
        const lastHistoryEntry = this.scoreHistory[this.scoreHistory.length - 1];
        if (lastHistoryEntry) {
            const previousTotal = lastHistoryEntry.breakdown?.behavioral || 0;
            const currentTotal = this.breakdown.behavioral.factors.interactionFrequency.totalInteractions;
            const activityDelta = currentTotal - (previousTotal || 0);

            if (activityDelta >= minActivityChange) {
                return true;
            }
        }
    }

    return false;
};

/**
 * Update sales priority tier based on ML score and urgency
 */
leadScoreSchema.methods.updateSalesPriority = function() {
    const mlProb = this.mlScore.probability || (this.totalScore / 100);
    const urgency = this.mlScore.salesExplanation?.urgencyLevel || 'nurture';

    // Determine tier based on ML probability and urgency
    if (mlProb >= 0.7 || urgency === 'immediate') {
        this.salesPriority.tier = 'P1_HOT';
    } else if (mlProb >= 0.5 || urgency === 'soon') {
        this.salesPriority.tier = 'P2_WARM';
    } else if (mlProb >= 0.3 || urgency === 'scheduled') {
        this.salesPriority.tier = 'P3_COOL';
    } else {
        this.salesPriority.tier = 'P4_NURTURE';
    }

    // Set SLA deadlines based on tier
    const now = new Date();
    const slaHours = {
        'P1_HOT': 4,      // 4 hours
        'P2_WARM': 24,    // 24 hours (1 day)
        'P3_COOL': 72,    // 72 hours (3 days)
        'P4_NURTURE': 168 // 168 hours (7 days)
    };

    this.salesPriority.slaDeadline = new Date(
        now.getTime() + (slaHours[this.salesPriority.tier] * 60 * 60 * 1000)
    );
};

/**
 * Record conversion outcome for ML training data
 */
leadScoreSchema.methods.recordConversion = function(conversionData = {}) {
    const {
        value,
        type = 'client',
        convertedAt = new Date()
    } = conversionData;

    this.conversion.converted = true;
    this.conversion.convertedAt = convertedAt;
    this.conversion.conversionValue = value;
    this.conversion.conversionType = type;

    // Calculate days to convert
    if (this.createdAt) {
        this.conversion.daysToConvert = Math.floor(
            (convertedAt.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
    }
};

// ───────────────────────────────────────────────────────────
// ML-specific static methods
// ───────────────────────────────────────────────────────────

/**
 * Get leads that need ML rescoring
 */
leadScoreSchema.statics.getNeedingMLRescoring = async function(firmId, options = {}) {
    const { maxAgeHours = 24 } = options;
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        'mlScore.enabled': true,
        $or: [
            { 'mlScore.lastScoredAt': { $exists: false } },
            { 'mlScore.lastScoredAt': { $lt: cutoffDate } },
            { 'features.computedAt': { $lt: cutoffDate } }
        ]
    }).populate('leadId', 'firstName lastName companyName email status');
};

/**
 * Get training data for ML model
 * Returns historical score data with conversion outcomes
 */
leadScoreSchema.statics.getMLTrainingData = async function(firmId, options = {}) {
    const { minInteractions = 5, includeUnconverted = true } = options;

    const matchStage = {
        firmId: new mongoose.Types.ObjectId(firmId),
        'breakdown.behavioral.factors.interactionFrequency.totalInteractions': { $gte: minInteractions }
    };

    if (!includeUnconverted) {
        matchStage['conversion.converted'] = true;
    }

    return await this.find(matchStage)
        .select('features breakdown mlScore conversion totalScore conversionProbability createdAt')
        .populate('leadId', 'status source estimatedValue createdAt')
        .lean();
};

/**
 * Get leads by sales priority tier
 */
leadScoreSchema.statics.getLeadsByPriorityTier = async function(firmId, tier, options = {}) {
    const { limit = 50, assignedTo = null } = options;

    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        'salesPriority.tier': tier
    };

    if (assignedTo) {
        query['salesPriority.assignedTo'] = new mongoose.Types.ObjectId(assignedTo);
    }

    return await this.find(query)
        .populate('leadId', 'firstName lastName companyName email phone status')
        .populate('salesPriority.assignedTo', 'firstName lastName email')
        .sort({ 'mlScore.probability': -1, totalScore: -1 })
        .limit(limit)
        .lean();
};

/**
 * Get leads past SLA deadline
 */
leadScoreSchema.statics.getOverdueSLA = async function(firmId) {
    const now = new Date();

    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        'salesPriority.slaDeadline': { $lt: now },
        'conversion.converted': false
    })
        .populate('leadId', 'firstName lastName companyName email status')
        .populate('salesPriority.assignedTo', 'firstName lastName email')
        .sort({ 'salesPriority.slaDeadline': 1 })
        .lean();
};

/**
 * Get ML performance metrics
 */
leadScoreSchema.statics.getMLPerformanceMetrics = async function(firmId) {
    const metrics = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                'mlScore.enabled': true,
                'mlScore.probability': { $exists: true }
            }
        },
        {
            $facet: {
                overall: [
                    {
                        $group: {
                            _id: null,
                            totalScored: { $sum: 1 },
                            avgProbability: { $avg: '$mlScore.probability' },
                            avgConfidence: { $avg: '$mlScore.confidence' },
                            converted: {
                                $sum: { $cond: ['$conversion.converted', 1, 0] }
                            }
                        }
                    }
                ],
                byTier: [
                    {
                        $group: {
                            _id: '$salesPriority.tier',
                            count: { $sum: 1 },
                            avgProbability: { $avg: '$mlScore.probability' },
                            converted: {
                                $sum: { $cond: ['$conversion.converted', 1, 0] }
                            },
                            avgValue: { $avg: '$conversion.conversionValue' }
                        }
                    },
                    { $sort: { _id: 1 } }
                ],
                calibration: [
                    {
                        $bucket: {
                            groupBy: '$mlScore.probability',
                            boundaries: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
                            default: 'other',
                            output: {
                                count: { $sum: 1 },
                                converted: {
                                    $sum: { $cond: ['$conversion.converted', 1, 0] }
                                },
                                avgPredicted: { $avg: '$mlScore.probability' }
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return metrics[0];
};

module.exports = mongoose.model('LeadScore', leadScoreSchema);
