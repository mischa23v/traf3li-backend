const mongoose = require('mongoose');
const { Schema } = mongoose;
const { validateWebhookUrl } = require('../utils/urlValidator');
const logger = require('../utils/logger');

// ============ WEBHOOK EVENTS ============
const WEBHOOK_EVENTS = [
    // Client events
    'client.created',
    'client.updated',
    'client.deleted',

    // Case events
    'case.created',
    'case.updated',
    'case.status_changed',
    'case.closed',
    'case.deleted',

    // Invoice events
    'invoice.created',
    'invoice.updated',
    'invoice.sent',
    'invoice.paid',
    'invoice.voided',
    'invoice.overdue',

    // Payment events
    'payment.received',
    'payment.failed',
    'payment.refunded',

    // Lead events (if applicable)
    'lead.created',
    'lead.updated',
    'lead.converted',
    'lead.deleted'
];

// ============ RETRY POLICY SCHEMA ============
const RetryPolicySchema = new Schema({
    maxAttempts: {
        type: Number,
        default: 3,
        min: 1,
        max: 10
    },
    retryIntervals: {
        type: [Number], // In minutes: [5, 15, 60] = retry after 5min, 15min, 1hr
        default: [5, 15, 60]
    },
    exponentialBackoff: {
        type: Boolean,
        default: false
    }
}, { _id: false });

// ============ MAIN WEBHOOK SCHEMA ============
const webhookSchema = new Schema({
    // ============ FIRM (Multi-Tenancy) ============
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ============ BASIC INFO ============
    url: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                // In production, require HTTPS
                if (process.env.NODE_ENV === 'production') {
                    return /^https:\/\/.+/.test(v);
                }
                // In development, allow HTTP
                return /^https?:\/\/.+/.test(v);
            },
            message: props => process.env.NODE_ENV === 'production'
                ? 'Webhook URL must use HTTPS in production'
                : 'Invalid webhook URL'
        }
    },

    name: {
        type: String,
        trim: true,
        maxlength: 100
    },

    description: {
        type: String,
        trim: true,
        maxlength: 500
    },

    // ============ EVENT SUBSCRIPTIONS ============
    events: {
        type: [String],
        required: true,
        validate: {
            validator: function(events) {
                return events.length > 0 && events.every(e => WEBHOOK_EVENTS.includes(e));
            },
            message: 'Invalid event type(s) in subscription'
        },
        index: true
    },

    // ============ SECURITY ============
    secret: {
        type: String,
        required: true,
        select: false // Don't return by default
    },

    // ============ STATUS ============
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // ============ CUSTOM HEADERS ============
    headers: {
        type: Map,
        of: String,
        default: {}
    },

    // ============ RETRY POLICY ============
    retryPolicy: {
        type: RetryPolicySchema,
        default: () => ({})
    },

    // ============ STATISTICS ============
    lastTriggered: {
        type: Date,
        index: true
    },

    lastStatus: {
        type: String,
        enum: ['success', 'failed', 'pending', null],
        default: null
    },

    lastError: {
        type: String
    },

    statistics: {
        totalDeliveries: {
            type: Number,
            default: 0
        },
        successfulDeliveries: {
            type: Number,
            default: 0
        },
        failedDeliveries: {
            type: Number,
            default: 0
        },
        averageResponseTime: {
            type: Number,
            default: 0 // in milliseconds
        }
    },

    // ============ FILTERS (Optional) ============
    filters: {
        clientIds: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
        caseIds: [{ type: Schema.Types.ObjectId, ref: 'Case' }],
        statuses: [String],
        minAmount: Number,
        maxAmount: Number
    },

    // ============ RATE LIMITING ============
    rateLimit: {
        enabled: {
            type: Boolean,
            default: false
        },
        requestsPerMinute: {
            type: Number,
            default: 60,
            min: 1,
            max: 1000
        }
    },

    // ============ METADATA ============
    metadata: {
        type: Map,
        of: Schema.Types.Mixed
    },

    // ============ AUDIT ============
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    disabledAt: Date,
    disabledReason: String,
    disabledBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ============ INDEXES ============
webhookSchema.index({ firmId: 1, isActive: 1 });
webhookSchema.index({ firmId: 1, events: 1, isActive: 1 });
webhookSchema.index({ createdBy: 1 });
webhookSchema.index({ createdAt: -1 });

// ============ VIRTUALS ============
webhookSchema.virtual('successRate').get(function() {
    if (this.statistics.totalDeliveries === 0) return 0;
    return (this.statistics.successfulDeliveries / this.statistics.totalDeliveries) * 100;
});

webhookSchema.virtual('failureRate').get(function() {
    if (this.statistics.totalDeliveries === 0) return 0;
    return (this.statistics.failedDeliveries / this.statistics.totalDeliveries) * 100;
});

// ============ HOOKS ============

/**
 * Pre-save hook to validate webhook URL for SSRF vulnerabilities
 */
webhookSchema.pre('save', async function(next) {
    // Only validate URL if it's new or modified
    if (!this.isModified('url')) {
        return next();
    }

    try {
        // Validate URL and perform DNS resolution
        const validation = await validateWebhookUrl(this.url, {
            allowHttp: process.env.NODE_ENV !== 'production',
            resolveDNS: true
        });

        // URL is valid, continue with save
        logger.info(`Webhook URL validated: ${validation.hostname} resolves to ${validation.ips.join(', ')}`);
        next();
    } catch (error) {
        // URL validation failed, reject the save
        const validationError = new Error(`Webhook URL validation failed: ${error.message}`);
        validationError.name = 'ValidationError';
        next(validationError);
    }
});

// ============ STATICS ============

/**
 * Get active webhooks for a specific event and firm
 */
webhookSchema.statics.getActiveWebhooksForEvent = async function(event, firmId) {
    return await this.find({
        firmId,
        events: event,
        isActive: true
    }).select('+secret'); // Include secret for signature generation
};

/**
 * Get webhook statistics
 */
webhookSchema.statics.getWebhookStats = async function(firmId) {
    const stats = await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
        {
            $group: {
                _id: null,
                totalWebhooks: { $sum: 1 },
                activeWebhooks: {
                    $sum: { $cond: ['$isActive', 1, 0] }
                },
                inactiveWebhooks: {
                    $sum: { $cond: ['$isActive', 0, 1] }
                },
                totalDeliveries: { $sum: '$statistics.totalDeliveries' },
                successfulDeliveries: { $sum: '$statistics.successfulDeliveries' },
                failedDeliveries: { $sum: '$statistics.failedDeliveries' }
            }
        }
    ]);

    return stats[0] || {
        totalWebhooks: 0,
        activeWebhooks: 0,
        inactiveWebhooks: 0,
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0
    };
};

// ============ METHODS ============

/**
 * Update webhook statistics
 */
webhookSchema.methods.updateStatistics = async function(success, responseTime) {
    this.statistics.totalDeliveries += 1;

    if (success) {
        this.statistics.successfulDeliveries += 1;
        this.lastStatus = 'success';
        this.lastError = null;
    } else {
        this.statistics.failedDeliveries += 1;
        this.lastStatus = 'failed';
    }

    // Update average response time
    const totalResponseTime = this.statistics.averageResponseTime * (this.statistics.totalDeliveries - 1);
    this.statistics.averageResponseTime = (totalResponseTime + responseTime) / this.statistics.totalDeliveries;

    this.lastTriggered = new Date();

    await this.save();
};

/**
 * Disable webhook
 */
webhookSchema.methods.disable = async function(reason, userId) {
    this.isActive = false;
    this.disabledAt = new Date();
    this.disabledReason = reason;
    this.disabledBy = userId;
    this.updatedBy = userId;

    await this.save();
    return this;
};

/**
 * Enable webhook
 */
webhookSchema.methods.enable = async function(userId) {
    this.isActive = true;
    this.disabledAt = null;
    this.disabledReason = null;
    this.disabledBy = null;
    this.updatedBy = userId;

    await this.save();
    return this;
};

/**
 * Test webhook - returns validation without saving
 */
webhookSchema.methods.test = function() {
    return {
        url: this.url,
        events: this.events,
        isActive: this.isActive,
        hasCustomHeaders: this.headers && this.headers.size > 0,
        retryPolicy: this.retryPolicy
    };
};

// ============ EXPORT ============
module.exports = mongoose.model('Webhook', webhookSchema);
module.exports.WEBHOOK_EVENTS = WEBHOOK_EVENTS;
