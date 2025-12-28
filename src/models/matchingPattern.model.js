/**
 * MatchingPattern Model
 *
 * Stores learned patterns from user confirmations/rejections
 * for AI-powered transaction matching.
 *
 * The system learns from:
 * - Confirmed matches: Patterns that successfully matched
 * - Rejected matches: Patterns that were suggested but wrong
 *
 * Over time, this enables:
 * - Higher auto-match rates (target: 90%+)
 * - Reduced false positives
 * - Firm-specific matching behavior
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Pattern features extracted from transaction
const patternFeaturesSchema = new Schema({
    amountRange: {
        min: { type: Number },
        max: { type: Number }
    },
    type: {
        type: String,
        enum: ['credit', 'debit']
    },
    descriptionKeywords: [{
        type: String,
        trim: true
    }],
    dayOfMonth: {
        type: Number,
        min: 1,
        max: 31
    },
    dayOfWeek: {
        type: Number,
        min: 0,
        max: 6
    },
    vendorPattern: {
        type: String,
        trim: true
    },
    clientPattern: {
        type: String,
        trim: true
    },
    referencePattern: {
        type: String,
        trim: true
    }
}, { _id: false });

// Rejection reason tracking
const rejectionReasonSchema = new Schema({
    reason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const matchingPatternSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFIERS
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Pattern identifier - unique combination of features
    patternKey: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PATTERN TYPE
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: ['Invoice', 'Expense', 'Payment', 'Bill', 'BankTransfer', 'JournalEntry'],
        required: true,
        index: true
    },

    // More specific pattern classification
    patternType: {
        type: String,
        enum: [
            'vendor_amount',      // Same vendor, similar amount
            'description',        // Description pattern matching
            'reference',          // Reference format pattern
            'recurring',          // Recurring transaction
            'client_payment',     // Client payment pattern
            'vendor_payment',     // Vendor payment pattern
            'salary',             // Salary/payroll pattern
            'subscription',       // Subscription/SaaS payment
            'utility',            // Utility bill pattern
            'tax',                // Tax payment pattern
            'other'
        ],
        default: 'other'
    },

    // ═══════════════════════════════════════════════════════════════
    // PATTERN FEATURES
    // ═══════════════════════════════════════════════════════════════
    features: {
        type: patternFeaturesSchema,
        default: () => ({})
    },

    // Example records that created/strengthened this pattern
    exampleTransactionId: {
        type: Schema.Types.ObjectId,
        ref: 'BankTransaction'
    },
    exampleRecordId: {
        type: Schema.Types.ObjectId,
        refPath: 'type'
    },

    // Match reasons that led to this pattern
    matchReasons: [{
        type: String,
        trim: true
    }],

    // ═══════════════════════════════════════════════════════════════
    // LEARNING METRICS
    // ═══════════════════════════════════════════════════════════════
    confirmations: {
        type: Number,
        default: 0,
        min: 0
    },
    rejections: {
        type: Number,
        default: 0,
        min: 0
    },
    totalUses: {
        type: Number,
        default: 0,
        min: 0
    },

    // Success rate calculated on save
    successRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1
    },

    // Rejection tracking for debugging
    rejectionReasons: {
        type: [rejectionReasonSchema],
        default: []
    },

    // ═══════════════════════════════════════════════════════════════
    // USAGE TRACKING
    // ═══════════════════════════════════════════════════════════════
    lastUsedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    firstSeenAt: {
        type: Date,
        default: Date.now
    },

    // Pattern strength (calculated based on confirmations vs rejections)
    strength: {
        type: Number,
        default: 0,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Auto-deactivated patterns (too many rejections)
    deactivatedAt: Date,
    deactivationReason: String

}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound indexes for efficient pattern lookup
matchingPatternSchema.index({ firmId: 1, patternKey: 1, type: 1 }, { unique: true });
matchingPatternSchema.index({ firmId: 1, isActive: 1, lastUsedAt: -1 });
matchingPatternSchema.index({ firmId: 1, type: 1, strength: -1 });
matchingPatternSchema.index({ firmId: 1, patternType: 1, isActive: 1 });

// TTL index for auto-cleanup of inactive patterns (6 months)
matchingPatternSchema.index(
    { lastUsedAt: 1 },
    { expireAfterSeconds: 180 * 24 * 60 * 60 } // 180 days
);

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

matchingPatternSchema.pre('save', function(next) {
    // Calculate success rate
    if (this.totalUses > 0) {
        this.successRate = this.confirmations / this.totalUses;
    } else {
        this.successRate = 0;
    }

    // Calculate pattern strength
    // Strength = confirmations * 2 - rejections * 5, capped at -50 to 100
    const rawStrength = (this.confirmations * 2) - (this.rejections * 5);
    this.strength = Math.max(-50, Math.min(100, rawStrength));

    // Auto-deactivate patterns with too many rejections
    if (this.rejections >= 5 && this.successRate < 0.3) {
        this.isActive = false;
        this.deactivatedAt = new Date();
        this.deactivationReason = 'Low success rate with multiple rejections';
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active patterns for a firm
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} options - Query options
 * @returns {Array} Active patterns sorted by strength
 */
matchingPatternSchema.statics.getActivePatterns = async function(firmId, options = {}) {
    const {
        type,
        minStrength = 0,
        limit = 100
    } = options;

    const query = {
        firmId,
        isActive: true,
        strength: { $gte: minStrength }
    };

    if (type) query.type = type;

    return await this.find(query)
        .sort({ strength: -1, lastUsedAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * Get pattern statistics for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Object} Pattern statistics
 */
matchingPatternSchema.statics.getStatistics = async function(firmId) {
    const stats = await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
        {
            $facet: {
                overall: [
                    {
                        $group: {
                            _id: null,
                            totalPatterns: { $sum: 1 },
                            activePatterns: {
                                $sum: { $cond: ['$isActive', 1, 0] }
                            },
                            totalConfirmations: { $sum: '$confirmations' },
                            totalRejections: { $sum: '$rejections' },
                            avgSuccessRate: { $avg: '$successRate' },
                            avgStrength: { $avg: '$strength' }
                        }
                    }
                ],
                byType: [
                    {
                        $group: {
                            _id: '$type',
                            count: { $sum: 1 },
                            confirmations: { $sum: '$confirmations' },
                            rejections: { $sum: '$rejections' },
                            avgSuccessRate: { $avg: '$successRate' }
                        }
                    }
                ],
                byPatternType: [
                    {
                        $group: {
                            _id: '$patternType',
                            count: { $sum: 1 },
                            avgStrength: { $avg: '$strength' }
                        }
                    }
                ],
                topPatterns: [
                    { $match: { isActive: true } },
                    { $sort: { strength: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            patternKey: 1,
                            type: 1,
                            confirmations: 1,
                            rejections: 1,
                            strength: 1,
                            successRate: 1
                        }
                    }
                ]
            }
        }
    ]);

    const result = stats[0];
    return {
        overall: result.overall[0] || {},
        byType: result.byType,
        byPatternType: result.byPatternType,
        topPatterns: result.topPatterns
    };
};

/**
 * Record a pattern match (confirmation)
 * @param {Object} params - Pattern parameters
 * @returns {Object} Updated pattern
 */
matchingPatternSchema.statics.recordMatch = async function(params) {
    const {
        firmId,
        lawyerId,
        patternKey,
        type,
        patternType,
        features,
        exampleTransactionId,
        exampleRecordId,
        matchReasons
    } = params;

    return await this.findOneAndUpdate(
        { firmId, patternKey, type },
        {
            $inc: { confirmations: 1, totalUses: 1 },
            $set: {
                lawyerId,
                patternType,
                features,
                exampleTransactionId,
                exampleRecordId,
                matchReasons,
                lastUsedAt: new Date(),
                isActive: true
            },
            $setOnInsert: {
                firstSeenAt: new Date()
            }
        },
        { upsert: true, new: true }
    );
};

/**
 * Record a pattern rejection
 * @param {Object} params - Rejection parameters
 * @returns {Object} Updated pattern
 */
matchingPatternSchema.statics.recordRejection = async function(params) {
    const {
        firmId,
        patternKey,
        type,
        reason
    } = params;

    return await this.findOneAndUpdate(
        { firmId, patternKey, type },
        {
            $inc: { rejections: 1, totalUses: 1 },
            $set: { lastUsedAt: new Date() },
            $push: {
                rejectionReasons: {
                    $each: [{ reason, date: new Date() }],
                    $slice: -10 // Keep last 10 rejections
                }
            }
        },
        { upsert: true, new: true }
    );
};

/**
 * Cleanup old/weak patterns
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} options - Cleanup options
 * @returns {Object} Cleanup result
 */
matchingPatternSchema.statics.cleanup = async function(firmId, options = {}) {
    const {
        maxAgeDays = 180,
        maxPatterns = 1000,
        minStrength = -30
    } = options;

    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

    // Delete old inactive patterns
    const oldResult = await this.deleteMany({
        firmId,
        lastUsedAt: { $lt: cutoffDate },
        isActive: false
    });

    // Delete very weak patterns
    const weakResult = await this.deleteMany({
        firmId,
        strength: { $lt: minStrength },
        confirmations: { $lt: 2 }
    });

    // Limit total patterns per firm
    const count = await this.countDocuments({ firmId });
    let trimmedCount = 0;

    if (count > maxPatterns) {
        const toDelete = count - maxPatterns;
        const oldestPatterns = await this.find({ firmId })
            .sort({ lastUsedAt: 1 })
            .limit(toDelete)
            .select('_id');

        const trimResult = await this.deleteMany({
            _id: { $in: oldestPatterns.map(p => p._id) }
        });
        trimmedCount = trimResult.deletedCount;
    }

    return {
        deletedOld: oldResult.deletedCount,
        deletedWeak: weakResult.deletedCount,
        deletedForLimit: trimmedCount,
        total: oldResult.deletedCount + weakResult.deletedCount + trimmedCount
    };
};

/**
 * Get patterns similar to a transaction
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} transaction - Transaction to match
 * @param {Object} options - Query options
 * @returns {Array} Matching patterns
 */
matchingPatternSchema.statics.findSimilarPatterns = async function(firmId, transaction, options = {}) {
    const { limit = 10 } = options;

    // Build pattern key components
    const amountBucket = Math.round(transaction.amount / 100) * 100;
    const keywords = (transaction.description || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length >= 3)
        .slice(0, 5);

    // Find patterns matching any of the keywords or amount bucket
    return await this.find({
        firmId,
        isActive: true,
        $or: [
            { patternKey: { $regex: `amt:${amountBucket}`, $options: 'i' } },
            { 'features.descriptionKeywords': { $in: keywords } },
            { patternKey: { $regex: `type:${transaction.type}`, $options: 'i' } }
        ]
    })
        .sort({ strength: -1, successRate: -1 })
        .limit(limit)
        .lean();
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if pattern is reliable enough for auto-matching
 * @returns {boolean} True if pattern can be used for auto-matching
 */
matchingPatternSchema.methods.isReliable = function() {
    return (
        this.isActive &&
        this.confirmations >= 3 &&
        this.successRate >= 0.7 &&
        this.strength >= 10
    );
};

/**
 * Get pattern confidence level
 * @returns {string} Confidence level
 */
matchingPatternSchema.methods.getConfidenceLevel = function() {
    if (this.successRate >= 0.9 && this.confirmations >= 10) return 'very_high';
    if (this.successRate >= 0.8 && this.confirmations >= 5) return 'high';
    if (this.successRate >= 0.6 && this.confirmations >= 3) return 'medium';
    if (this.successRate >= 0.4) return 'low';
    return 'very_low';
};

module.exports = mongoose.model('MatchingPattern', matchingPatternSchema);
