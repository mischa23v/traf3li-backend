const mongoose = require('mongoose');

/**
 * AI Interaction Model - Audit & Safety Logging
 *
 * Tracks all AI interactions for:
 * - Security auditing
 * - Compliance monitoring
 * - Usage tracking
 * - Safety violation detection
 * - Quality improvement
 */

const aiInteractionSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // USER & FIRM CONTEXT
    // ═══════════════════════════════════════════════════════════════
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AI PROVIDER & MODEL
    // ═══════════════════════════════════════════════════════════════
    provider: {
        type: String,
        enum: ['anthropic', 'openai'],
        required: true,
        index: true
    },
    model: {
        type: String,
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // INPUT (USER MESSAGE)
    // ═══════════════════════════════════════════════════════════════
    input: {
        // Original user input (before sanitization)
        original: {
            type: String,
            required: true
        },
        // Sanitized input (after safety checks)
        sanitized: {
            type: String,
            required: true
        },
        // Token count
        tokenCount: {
            type: Number,
            default: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // OUTPUT (AI RESPONSE)
    // ═══════════════════════════════════════════════════════════════
    output: {
        // Original AI response (before filtering)
        original: {
            type: String,
            required: true
        },
        // Filtered response (after safety checks)
        filtered: {
            type: String,
            required: true
        },
        // Token count
        tokenCount: {
            type: Number,
            default: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // SAFETY CHECKS
    // ═══════════════════════════════════════════════════════════════
    safetyChecks: {
        // Input safety violations detected
        inputViolations: [{
            type: {
                type: String,
                enum: ['prompt_injection', 'pii_detected', 'harmful_content', 'jailbreak_attempt', 'excessive_length']
            },
            severity: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            },
            pattern: String,
            description: String
        }],
        // Output safety violations detected
        outputViolations: [{
            type: {
                type: String,
                enum: ['pii_leakage', 'harmful_content', 'hallucination', 'low_confidence', 'legal_disclaimer_missing']
            },
            severity: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            },
            pattern: String,
            description: String
        }],
        // Whether input was sanitized
        inputSanitized: {
            type: Boolean,
            default: false
        },
        // Whether output was filtered
        outputFiltered: {
            type: Boolean,
            default: false
        },
        // Overall safety score (0-100, higher = safer)
        safetyScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 100
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RATE LIMITING
    // ═══════════════════════════════════════════════════════════════
    rateLimiting: {
        // Whether rate limit was checked
        checked: {
            type: Boolean,
            default: false
        },
        // Whether request was within limits
        withinLimit: {
            type: Boolean,
            default: true
        },
        // Current usage count at time of request
        currentUsage: {
            type: Number,
            default: 0
        },
        // User's quota limit
        quotaLimit: {
            type: Number,
            default: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RESPONSE VALIDATION
    // ═══════════════════════════════════════════════════════════════
    validation: {
        // Confidence score from AI (0-1)
        confidenceScore: {
            type: Number,
            min: 0,
            max: 1,
            default: null
        },
        // Whether response was flagged as uncertain
        flaggedAsUncertain: {
            type: Boolean,
            default: false
        },
        // Whether legal disclaimer was added
        legalDisclaimerAdded: {
            type: Boolean,
            default: false
        },
        // Context type (for legal info verification)
        contextType: {
            type: String,
            enum: ['legal', 'case_management', 'scheduling', 'general', null],
            default: null
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUEST METADATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
        // IP address
        ipAddress: String,
        // User agent
        userAgent: String,
        // Session ID
        sessionId: String,
        // Request ID
        requestId: String,
        // Conversation ID (if part of a conversation)
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatHistory',
            default: null
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // USAGE & PERFORMANCE
    // ═══════════════════════════════════════════════════════════════
    usage: {
        // Total tokens used
        totalTokens: {
            type: Number,
            default: 0
        },
        // Response time in milliseconds
        responseTimeMs: {
            type: Number,
            default: 0
        },
        // Cost in credits/currency (if applicable)
        cost: {
            type: Number,
            default: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & FLAGS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['success', 'blocked', 'filtered', 'rate_limited', 'error'],
        default: 'success',
        index: true
    },

    // Blocked reason (if status is blocked)
    blockedReason: {
        type: String,
        default: null
    },

    // Error details (if status is error)
    error: {
        message: String,
        code: String,
        stack: String
    },

    // Flags for review
    flaggedForReview: {
        type: Boolean,
        default: false,
        index: true
    },
    flaggedReason: String,

    // Admin review
    reviewed: {
        type: Boolean,
        default: false
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    reviewNotes: String

}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
aiInteractionSchema.index({ userId: 1, createdAt: -1 });
aiInteractionSchema.index({ firmId: 1, createdAt: -1 });
aiInteractionSchema.index({ status: 1, flaggedForReview: 1 });
aiInteractionSchema.index({ 'safetyChecks.safetyScore': 1 });
aiInteractionSchema.index({ createdAt: -1 }); // For cleanup/archiving

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get user's AI usage in a time period
 */
aiInteractionSchema.statics.getUserUsage = async function(userId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                totalInteractions: { $sum: 1 },
                totalTokens: { $sum: '$usage.totalTokens' },
                totalCost: { $sum: '$usage.cost' },
                blockedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] }
                }
            }
        }
    ]);
};

/**
 * Get flagged interactions for review
 */
aiInteractionSchema.statics.getFlaggedInteractions = async function(limit = 100) {
    return this.find({ flaggedForReview: true, reviewed: false })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'email firstName lastName')
        .populate('firmId', 'name');
};

/**
 * Get safety violations summary
 */
aiInteractionSchema.statics.getSafetyViolationsSummary = async function(firmId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                createdAt: { $gte: startDate }
            }
        },
        {
            $unwind: { path: '$safetyChecks.inputViolations', preserveNullAndEmptyArrays: true }
        },
        {
            $unwind: { path: '$safetyChecks.outputViolations', preserveNullAndEmptyArrays: true }
        },
        {
            $group: {
                _id: {
                    inputType: '$safetyChecks.inputViolations.type',
                    outputType: '$safetyChecks.outputViolations.type'
                },
                count: { $sum: 1 }
            }
        }
    ]);
};

module.exports = mongoose.model('AIInteraction', aiInteractionSchema);
