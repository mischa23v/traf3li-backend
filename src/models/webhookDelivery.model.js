const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============ DELIVERY STATUS ============
const DELIVERY_STATUSES = [
    'pending',
    'success',
    'failed',
    'retrying'
];

// ============ HTTP RESPONSE SCHEMA ============
const HttpResponseSchema = new Schema({
    status: {
        type: Number
    },
    statusText: {
        type: String
    },
    body: {
        type: String,
        maxlength: 5000 // Limit stored response body
    },
    headers: {
        type: Map,
        of: String
    }
}, { _id: false });

// ============ ATTEMPT SCHEMA ============
const AttemptSchema = new Schema({
    attemptNumber: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: DELIVERY_STATUSES,
        required: true
    },
    httpStatus: Number,
    duration: Number, // in milliseconds
    error: String,
    errorDetails: {
        type: String,
        maxlength: 2000
    }
}, { _id: true });

// ============ MAIN WEBHOOK DELIVERY SCHEMA ============
const webhookDeliverySchema = new Schema({
    // ============ FIRM (Multi-Tenancy) ============
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
    // ============ WEBHOOK REFERENCE ============
    webhookId: {
        type: Schema.Types.ObjectId,
        ref: 'Webhook',
        required: true,
        index: true
    },

    // ============ EVENT INFO ============
    event: {
        type: String,
        required: true,
        index: true
    },

    // ============ PAYLOAD ============
    payload: {
        type: Schema.Types.Mixed,
        required: true
    },

    // Payload metadata
    payloadSize: {
        type: Number // Size in bytes
    },

    // Entity references (for filtering/querying)
    entityType: {
        type: String,
        enum: ['client', 'case', 'invoice', 'payment', 'lead', null],
        index: true
    },

    entityId: {
        type: Schema.Types.ObjectId,
        index: true
    },

    // ============ HTTP DETAILS ============
    url: {
        type: String,
        required: true
    },

    method: {
        type: String,
        default: 'POST'
    },

    headers: {
        type: Map,
        of: String
    },

    // ============ RESPONSE ============
    response: HttpResponseSchema,

    // ============ STATUS ============
    status: {
        type: String,
        enum: DELIVERY_STATUSES,
        default: 'pending',
        index: true
    },

    // ============ ATTEMPTS ============
    attempts: [AttemptSchema],

    currentAttempt: {
        type: Number,
        default: 0
    },

    maxAttempts: {
        type: Number,
        default: 3
    },

    // ============ RETRY SCHEDULING ============
    nextRetry: {
        type: Date,
        index: true
    },

    lastAttemptAt: Date,

    completedAt: Date,

    // ============ DURATION ============
    duration: {
        type: Number, // Total time in milliseconds
        default: 0
    },

    // ============ ERROR TRACKING ============
    error: String,

    errorDetails: {
        code: String,
        message: String,
        stack: String
    },

    // ============ METADATA ============
    metadata: {
        type: Map,
        of: Schema.Types.Mixed
    },

    // ============ SIGNATURE ============
    signature: {
        type: String
    },

    // ============ TAGS ============
    tags: [String]

}, {
    timestamps: true,
    versionKey: false
});

// ============ INDEXES ============
webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
webhookDeliverySchema.index({ firmId: 1, status: 1 });
webhookDeliverySchema.index({ firmId: 1, event: 1 });
webhookDeliverySchema.index({ status: 1, nextRetry: 1 }); // For retry job
webhookDeliverySchema.index({ entityType: 1, entityId: 1 });
webhookDeliverySchema.index({ createdAt: -1 });

// ============ VIRTUALS ============
webhookDeliverySchema.virtual('isCompleted').get(function() {
    return this.status === 'success' || this.status === 'failed';
});

webhookDeliverySchema.virtual('canRetry').get(function() {
    return this.status === 'failed' && this.currentAttempt < this.maxAttempts;
});

webhookDeliverySchema.virtual('successRate').get(function() {
    if (this.attempts.length === 0) return 0;
    const successfulAttempts = this.attempts.filter(a => a.status === 'success').length;
    return (successfulAttempts / this.attempts.length) * 100;
});

// ============ STATICS ============

/**
 * Get deliveries for a webhook
 */
webhookDeliverySchema.statics.getDeliveriesForWebhook = async function(webhookId, options = {}) {
    const { page = 1, limit = 50, status, event } = options;

    const query = { webhookId: new mongoose.Types.ObjectId(webhookId) };
    if (status) query.status = status;
    if (event) query.event = event;

    const deliveries = await this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .select('-payload -errorDetails.stack'); // Exclude large fields

    const total = await this.countDocuments(query);

    return {
        deliveries,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get pending retries
 */
webhookDeliverySchema.statics.getPendingRetries = async function() {
    return await this.find({
        status: 'failed',
        nextRetry: { $lte: new Date() },
        currentAttempt: { $lt: this.maxAttempts }
    })
    .populate('webhookId')
    .limit(100); // Process in batches
};

/**
 * Get delivery statistics
 */
webhookDeliverySchema.statics.getDeliveryStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.webhookId) matchStage.webhookId = new mongoose.Types.ObjectId(filters.webhookId);
    if (filters.event) matchStage.event = filters.event;
    if (filters.startDate || filters.endDate) {
        matchStage.createdAt = {};
        if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalDeliveries: { $sum: 1 },
                successfulDeliveries: {
                    $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                },
                failedDeliveries: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                pendingDeliveries: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                averageDuration: { $avg: '$duration' },
                totalAttempts: { $sum: '$currentAttempt' }
            }
        }
    ]);

    return stats[0] || {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        pendingDeliveries: 0,
        averageDuration: 0,
        totalAttempts: 0
    };
};

/**
 * Get deliveries by event type
 */
webhookDeliverySchema.statics.getDeliveriesByEvent = async function(firmId, startDate, endDate) {
    return await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }
        },
        {
            $group: {
                _id: '$event',
                count: { $sum: 1 },
                successCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                },
                failCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                avgDuration: { $avg: '$duration' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// ============ METHODS ============

/**
 * Record a delivery attempt
 */
webhookDeliverySchema.methods.recordAttempt = async function(attemptResult) {
    const { status, httpStatus, duration, error, errorDetails } = attemptResult;

    this.currentAttempt += 1;
    this.lastAttemptAt = new Date();

    // Add attempt to history
    this.attempts.push({
        attemptNumber: this.currentAttempt,
        timestamp: new Date(),
        status,
        httpStatus,
        duration,
        error,
        errorDetails
    });

    // Update overall status
    this.status = status;
    this.duration += duration || 0;

    if (status === 'success') {
        this.completedAt = new Date();
        this.nextRetry = null;
    } else if (status === 'failed' && this.currentAttempt < this.maxAttempts) {
        // Schedule next retry
        this.status = 'retrying';
        const retryDelay = this.calculateRetryDelay();
        this.nextRetry = new Date(Date.now() + retryDelay);
    } else if (this.currentAttempt >= this.maxAttempts) {
        this.status = 'failed';
        this.completedAt = new Date();
        this.nextRetry = null;
    }

    if (error) {
        this.error = error;
    }

    if (errorDetails) {
        this.errorDetails = errorDetails;
    }

    await this.save();
    return this;
};

/**
 * Calculate retry delay based on attempt number
 */
webhookDeliverySchema.methods.calculateRetryDelay = function() {
    // Exponential backoff: 5min, 15min, 60min
    const delays = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000];
    const index = Math.min(this.currentAttempt - 1, delays.length - 1);
    return delays[index];
};

/**
 * Mark as completed
 */
webhookDeliverySchema.methods.markCompleted = async function(success, response, duration) {
    this.status = success ? 'success' : 'failed';
    this.completedAt = new Date();
    this.duration = duration;

    if (response) {
        this.response = {
            status: response.status,
            statusText: response.statusText,
            body: typeof response.body === 'string'
                ? response.body.substring(0, 5000) // Limit size
                : JSON.stringify(response.body).substring(0, 5000),
            headers: response.headers
        };
    }

    await this.save();
    return this;
};

/**
 * Get delivery summary
 */
webhookDeliverySchema.methods.getSummary = function() {
    return {
        id: this._id,
        event: this.event,
        status: this.status,
        attempts: this.currentAttempt,
        maxAttempts: this.maxAttempts,
        duration: this.duration,
        createdAt: this.createdAt,
        completedAt: this.completedAt,
        nextRetry: this.nextRetry,
        httpStatus: this.response?.status,
        error: this.error
    };
};

// ============ EXPORT ============
module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
module.exports.DELIVERY_STATUSES = DELIVERY_STATUSES;
