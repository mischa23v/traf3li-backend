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

module.exports = mongoose.model('LeadScore', leadScoreSchema);
