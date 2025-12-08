const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// LEAD SCORING CONFIGURATION - FIRM-SPECIFIC RULES
// ═══════════════════════════════════════════════════════════════

const leadScoringConfigSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // WEIGHTS (Must sum to 100)
    // ═══════════════════════════════════════════════════════════════
    weights: {
        demographic: { type: Number, default: 25, min: 0, max: 100 },
        bant: { type: Number, default: 30, min: 0, max: 100 },
        behavioral: { type: Number, default: 30, min: 0, max: 100 },
        engagement: { type: Number, default: 15, min: 0, max: 100 }
    },

    // ═══════════════════════════════════════════════════════════════
    // GRADING THRESHOLDS
    // ═══════════════════════════════════════════════════════════════
    grading: {
        A: {
            min: { type: Number, default: 80 },
            max: { type: Number, default: 100 },
            label: { type: String, default: 'Hot Lead' },
            labelAr: { type: String, default: 'عميل ساخن' },
            color: { type: String, default: '#ef4444' }, // Red
            icon: { type: String, default: '🔥' }
        },
        B: {
            min: { type: Number, default: 60 },
            max: { type: Number, default: 79 },
            label: { type: String, default: 'Warm Lead' },
            labelAr: { type: String, default: 'عميل دافئ' },
            color: { type: String, default: '#f97316' }, // Orange
            icon: { type: String, default: '⭐' }
        },
        C: {
            min: { type: Number, default: 40 },
            max: { type: Number, default: 59 },
            label: { type: String, default: 'Cool Lead' },
            labelAr: { type: String, default: 'عميل فاتر' },
            color: { type: String, default: '#eab308' }, // Yellow
            icon: { type: String, default: '💫' }
        },
        D: {
            min: { type: Number, default: 20 },
            max: { type: Number, default: 39 },
            label: { type: String, default: 'Cold Lead' },
            labelAr: { type: String, default: 'عميل بارد' },
            color: { type: String, default: '#3b82f6' }, // Blue
            icon: { type: String, default: '❄️' }
        },
        F: {
            min: { type: Number, default: 0 },
            max: { type: Number, default: 19 },
            label: { type: String, default: 'Unqualified' },
            labelAr: { type: String, default: 'غير مؤهل' },
            color: { type: String, default: '#6b7280' }, // Gray
            icon: { type: String, default: '⛔' }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DEMOGRAPHIC SCORING RULES
    // ═══════════════════════════════════════════════════════════════
    demographicRules: {
        // Case type scoring (0-100 per type)
        caseTypes: [{
            type: String, // 'civil', 'criminal', 'family', 'commercial', etc.
            score: { type: Number, min: 0, max: 100 },
            priority: { type: Number, default: 1 } // Higher priority = more important
        }],

        // Case value ranges (in halalas)
        caseValueRanges: [{
            min: Number, // Minimum value in halalas
            max: Number, // Maximum value in halalas
            score: { type: Number, min: 0, max: 100 }
        }],

        // Preferred locations
        preferredLocations: [{
            location: String, // City name
            score: { type: Number, min: 0, max: 100 }
        }],

        // Industry scoring (for companies)
        industries: [{
            name: String,
            score: { type: Number, min: 0, max: 100 }
        }],

        // Company size scoring
        companySizes: [{
            size: { type: String, enum: ['micro', 'small', 'medium', 'large', 'enterprise'] },
            score: { type: Number, min: 0, max: 100 }
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // BANT SCORING RULES
    // ═══════════════════════════════════════════════════════════════
    bantRules: {
        // Budget scoring
        budget: {
            premium: { type: Number, default: 100 }, // Unlimited budget
            high: { type: Number, default: 80 },     // > 100,000 SAR
            medium: { type: Number, default: 60 },   // 20,000 - 100,000 SAR
            low: { type: Number, default: 30 },      // < 20,000 SAR
            unknown: { type: Number, default: 10 }   // Not discussed
        },

        // Authority scoring
        authority: {
            decision_maker: { type: Number, default: 100 }, // Can sign immediately
            influencer: { type: Number, default: 60 },      // Can influence decision
            researcher: { type: Number, default: 30 },      // Just researching
            unknown: { type: Number, default: 10 }
        },

        // Need urgency scoring
        need: {
            urgent: { type: Number, default: 100 },    // Immediate legal need
            planning: { type: Number, default: 70 },   // Planning to hire lawyer
            exploring: { type: Number, default: 40 },  // Just exploring options
            unknown: { type: Number, default: 10 }
        },

        // Timeline scoring
        timeline: {
            immediate: { type: Number, default: 100 },     // < 1 week
            this_month: { type: Number, default: 80 },     // Within month
            this_quarter: { type: Number, default: 60 },   // Within 3 months
            this_year: { type: Number, default: 40 },      // Within year
            no_timeline: { type: Number, default: 10 },    // No specific timeline
            unknown: { type: Number, default: 10 }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // BEHAVIORAL SCORING RULES
    // ═══════════════════════════════════════════════════════════════
    behavioralRules: {
        // Email engagement
        emailOpen: {
            points: { type: Number, default: 5 },
            max: { type: Number, default: 25 } // Max points from email opens
        },
        emailClick: {
            points: { type: Number, default: 10 },
            max: { type: Number, default: 40 }
        },
        emailReply: {
            points: { type: Number, default: 15 },
            max: { type: Number, default: 60 }
        },

        // Meeting engagement
        meetingScheduled: {
            points: { type: Number, default: 15 }
        },
        meetingAttended: {
            points: { type: Number, default: 20 },
            max: { type: Number, default: 60 }
        },
        meetingNoShow: {
            penalty: { type: Number, default: -15 } // Negative points
        },

        // Document engagement
        documentView: {
            points: { type: Number, default: 8 },
            max: { type: Number, default: 32 }
        },
        documentDownload: {
            points: { type: Number, default: 12 },
            max: { type: Number, default: 36 }
        },

        // Phone engagement
        phoneCall: {
            pointsPerMinute: { type: Number, default: 2 },
            max: { type: Number, default: 40 },
            minDuration: { type: Number, default: 2 } // Minimum 2 minutes to count
        },

        // Form & website engagement
        formSubmission: {
            points: { type: Number, default: 15 },
            max: { type: Number, default: 45 }
        },
        websiteVisit: {
            points: { type: Number, default: 2 },
            max: { type: Number, default: 20 }
        },

        // Response time bonus
        responseWithin24h: {
            points: { type: Number, default: 15 }
        },
        responseWithin1h: {
            points: { type: Number, default: 25 }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ENGAGEMENT SCORING RULES
    // ═══════════════════════════════════════════════════════════════
    engagementRules: {
        // Recency scoring (days since last contact)
        recency: {
            today: { type: Number, default: 100 },
            within3days: { type: Number, default: 80 },
            within7days: { type: Number, default: 60 },
            within14days: { type: Number, default: 40 },
            within30days: { type: Number, default: 20 },
            over30days: { type: Number, default: 5 }
        },

        // Frequency scoring (number of touchpoints)
        frequency: {
            perTouchpoint: { type: Number, default: 5 },
            max: { type: Number, default: 50 },
            timeWindow: { type: Number, default: 30 } // Days to consider
        },

        // Depth scoring (quality of engagement)
        depth: {
            qualityInteractionPoints: { type: Number, default: 10 }, // Calls, meetings
            regularInteractionPoints: { type: Number, default: 3 },  // Emails, messages
            max: { type: Number, default: 50 }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DECAY SETTINGS
    // ═══════════════════════════════════════════════════════════════
    decay: {
        enabled: { type: Boolean, default: true },
        decayPerDay: { type: Number, default: 0.5 }, // % to decay per day of inactivity
        startAfterDays: { type: Number, default: 7 }, // Start decay after X days
        minimumScore: { type: Number, default: 10 }, // Never decay below this
        maxDecayPercent: { type: Number, default: 50 }, // Max total decay percentage
        resetOnActivity: { type: Boolean, default: true }, // Reset decay on new activity
        decaySchedule: {
            type: String,
            enum: ['daily', 'weekly'],
            default: 'daily'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CALCULATION SCHEDULE
    // ═══════════════════════════════════════════════════════════════
    calculationSchedule: {
        autoRecalculate: { type: Boolean, default: true },
        frequency: {
            type: String,
            enum: ['realtime', 'hourly', 'daily', 'weekly'],
            default: 'daily'
        },
        preferredTime: { type: String, default: '03:00' }, // HH:MM format
        recalculateOnActivity: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // CONVERSION PREDICTION MODEL
    // ═══════════════════════════════════════════════════════════════
    predictionModel: {
        enabled: { type: Boolean, default: true },
        minimumDataPoints: { type: Number, default: 10 }, // Min converted leads needed
        weights: {
            score: { type: Number, default: 40 },
            timeToConversion: { type: Number, default: 20 },
            activityPattern: { type: Number, default: 20 },
            historicalSimilarity: { type: Number, default: 20 }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS & ALERTS
    // ═══════════════════════════════════════════════════════════════
    notifications: {
        scoreThresholds: [{
            threshold: Number, // Score value
            direction: { type: String, enum: ['above', 'below'] },
            notifyUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            message: String
        }],
        gradeChanges: {
            enabled: { type: Boolean, default: true },
            notifyOnUpgrade: { type: Boolean, default: true },
            notifyOnDowngrade: { type: Boolean, default: true }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: { type: Boolean, default: true },
    version: { type: String, default: '1.0' },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
leadScoringConfigSchema.index({ firmId: 1 }, { unique: true });
leadScoringConfigSchema.index({ isActive: 1 });

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════
leadScoringConfigSchema.pre('save', function(next) {
    // Validate weights sum to 100
    const totalWeight = this.weights.demographic + this.weights.bant +
                       this.weights.behavioral + this.weights.engagement;

    if (Math.abs(totalWeight - 100) > 0.01) {
        return next(new Error('Weights must sum to 100'));
    }

    // Validate grading thresholds don't overlap
    const grades = ['A', 'B', 'C', 'D', 'F'];
    for (let i = 0; i < grades.length - 1; i++) {
        const current = this.grading[grades[i]];
        const next = this.grading[grades[i + 1]];
        if (current.min <= next.max) {
            // This is expected - they should be adjacent
            continue;
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get or create default config for firm
leadScoringConfigSchema.statics.getOrCreateConfig = async function(firmId) {
    let config = await this.findOne({ firmId });

    if (!config) {
        // Create default configuration
        config = await this.create({
            firmId,
            // All defaults are set in schema
        });
    }

    return config;
};

// Get grade from score
leadScoringConfigSchema.methods.getGrade = function(score) {
    if (score >= this.grading.A.min) return 'A';
    if (score >= this.grading.B.min) return 'B';
    if (score >= this.grading.C.min) return 'C';
    if (score >= this.grading.D.min) return 'D';
    return 'F';
};

// Get grade info
leadScoringConfigSchema.methods.getGradeInfo = function(grade) {
    return this.grading[grade] || this.grading.F;
};

module.exports = mongoose.model('LeadScoringConfig', leadScoringConfigSchema);
