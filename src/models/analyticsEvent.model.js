const mongoose = require('mongoose');

/**
 * Analytics Event Model - Event-based Analytics System
 *
 * Tracks all user interactions, page views, feature usage, and system events
 * for comprehensive analytics and insights.
 *
 * Features:
 * - Event tracking (page views, feature usage, actions, errors)
 * - User and firm-level analytics
 * - Session tracking
 * - Time-series optimization with TTL indexes
 * - Flexible properties and metadata storage
 */

const analyticsEventSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // EVENT CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    eventType: {
        type: String,
        required: true,
        enum: [
            'page_view',
            'feature_used',
            'action_completed',
            'error',
            'api_call',
            'search',
            'form_submit',
            'login',
            'logout',
            'signup',
            'user_action',
            'custom'
        ],
        index: true
    },
    eventName: {
        type: String,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTEXT & ATTRIBUTION
    // ═══════════════════════════════════════════════════════════════
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: false
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
     },

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    sessionId: {
        type: String,
        index: true,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // EVENT DATA
    // ═══════════════════════════════════════════════════════════════
    properties: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTEXT METADATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
        // Page context
        page: { type: String },
        referrer: { type: String },
        url: { type: String },

        // Device & browser
        device: { type: String },
        browser: { type: String },
        os: { type: String },
        userAgent: { type: String },

        // Network
        ip: { type: String },
        country: { type: String },
        city: { type: String },

        // Request info
        method: { type: String },
        statusCode: { type: Number },
        endpoint: { type: String },

        // Additional context
        custom: { type: mongoose.Schema.Types.Mixed }
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMING
    // ═══════════════════════════════════════════════════════════════
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    duration: {
        type: Number,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // DATA RETENTION
    // ═══════════════════════════════════════════════════════════════
    // Automatically delete events after 90 days (configurable)
    expiresAt: {
        type: Date,
        index: true
    }
}, {
    versionKey: false,
    timestamps: false,
    timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'hours'
    }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES FOR PERFORMANCE
// ═══════════════════════════════════════════════════════════════

// Compound index for firm-level analytics queries
analyticsEventSchema.index({ firmId: 1, eventType: 1, timestamp: -1 });

// Compound index for user-level analytics queries
analyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });

// Compound index for session analytics
analyticsEventSchema.index({ sessionId: 1, timestamp: -1 });

// Event type and name for feature tracking
analyticsEventSchema.index({ eventType: 1, eventName: 1, timestamp: -1 });

// TTL index for automatic data retention (expires after 90 days)
analyticsEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Text index for searching event names and properties
analyticsEventSchema.index({
    eventName: 'text',
    'properties.description': 'text'
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert event to plain object
 */
analyticsEventSchema.methods.toJSON = function() {
    const obj = this.toObject();
    return obj;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get events count by type for a firm
 */
analyticsEventSchema.statics.getEventCountByType = async function(firmId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                timestamp: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$eventType',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

/**
 * Get top events by name
 */
analyticsEventSchema.statics.getTopEvents = async function(firmId, startDate, endDate, limit = 10) {
    return this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                timestamp: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { eventType: '$eventType', eventName: '$eventName' },
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
    ]);
};

/**
 * Get unique users count (DAU, WAU, MAU)
 */
analyticsEventSchema.statics.getUniqueUsersCount = async function(firmId, startDate, endDate) {
    const result = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                timestamp: { $gte: startDate, $lte: endDate },
                userId: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$userId'
            }
        },
        {
            $count: 'uniqueUsers'
        }
    ]);

    return result.length > 0 ? result[0].uniqueUsers : 0;
};

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOK
// ═══════════════════════════════════════════════════════════════

analyticsEventSchema.pre('save', function(next) {
    // Set expiration date if not set (90 days from now)
    if (!this.expiresAt) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 90);
        this.expiresAt = expirationDate;
    }
    next();
});

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
