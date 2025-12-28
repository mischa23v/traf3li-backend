/**
 * CRM Transaction Model
 *
 * Comprehensive audit trail for all CRM operations.
 * Tracks lead lifecycle, deal progression, and revenue events.
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 *
 * TTL: Transactions are automatically deleted after 2 years (configurable)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const crmTransactionSchema = new Schema({
    // Multi-tenant isolation (REQUIRED)
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Transaction type
    type: {
        type: String,
        enum: [
            // Lead lifecycle
            'lead_created', 'lead_updated', 'lead_viewed', 'lead_assigned',
            'lead_qualified', 'lead_disqualified', 'lead_converted', 'lead_lost',
            'lead_reopened', 'lead_merged', 'lead_duplicated',

            // Contact events
            'contact_created', 'contact_updated', 'contact_linked', 'contact_unlinked',

            // Organization events
            'org_created', 'org_updated', 'org_linked',

            // Stage/Pipeline events
            'stage_changed', 'stage_entered', 'stage_exited',
            'pipeline_changed', 'probability_updated',

            // Deal events
            'deal_created', 'deal_updated', 'deal_won', 'deal_lost',
            'deal_value_changed', 'deal_close_date_changed',

            // Activity events
            'activity_created', 'activity_completed', 'activity_cancelled',
            'call_logged', 'email_logged', 'meeting_logged', 'note_added',

            // Communication events
            'email_sent', 'email_opened', 'email_clicked', 'email_bounced',
            'sms_sent', 'whatsapp_sent',

            // Quote events
            'quote_created', 'quote_sent', 'quote_viewed',
            'quote_accepted', 'quote_rejected', 'quote_expired',

            // Campaign events
            'campaign_enrolled', 'campaign_completed', 'campaign_removed',

            // Scoring events
            'score_updated', 'grade_changed', 'temperature_changed',

            // Duplicate events
            'duplicate_detected', 'duplicate_merged', 'duplicate_dismissed',

            // Assignment events
            'assigned', 'reassigned', 'unassigned',

            // Custom events
            'custom_event'
        ],
        required: true,
        index: true
    },

    // Event category for filtering
    category: {
        type: String,
        enum: ['lead', 'contact', 'organization', 'activity', 'deal',
               'quote', 'campaign', 'scoring', 'duplicate', 'assignment', 'system'],
        required: true,
        index: true
    },

    // Related entity
    entityType: {
        type: String,
        enum: ['lead', 'contact', 'organization', 'activity', 'quote', 'campaign', 'case'],
        required: true
    },
    entityId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    entityName: {
        type: String,
        maxlength: 200
    },

    // Description
    description: {
        type: String,
        maxlength: 500
    },
    descriptionAr: {
        type: String,
        maxlength: 500
    },

    // Value tracking (for revenue-related transactions)
    value: {
        type: Number
    },
    previousValue: {
        type: Number
    },
    valueDelta: {
        type: Number
    },
    currency: {
        type: String,
        default: 'SAR'
    },

    // Stage tracking
    fromStage: {
        stageId: { type: Schema.Types.ObjectId, ref: 'PipelineStage' },
        stageName: String
    },
    toStage: {
        stageId: { type: Schema.Types.ObjectId, ref: 'PipelineStage' },
        stageName: String
    },
    timeInPreviousStage: {
        type: Number // milliseconds
    },

    // Change tracking
    changedFields: [{
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed
    }],

    // Related entities
    relatedEntities: [{
        entityType: String,
        entityId: Schema.Types.ObjectId,
        entityName: String,
        relationship: String
    }],

    // User who performed the action
    performedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    performedByName: String,

    // Source of the action
    source: {
        type: String,
        enum: ['web', 'mobile', 'api', 'automation', 'import', 'system', 'integration'],
        default: 'web'
    },

    // IP and device info (for security audit)
    ipAddress: String,
    userAgent: String,

    // Additional metadata
    metadata: {
        type: Schema.Types.Mixed
    },

    // Visibility
    isSystemEvent: {
        type: Boolean,
        default: false
    },
    isVisible: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }, // Only createdAt needed
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// TTL index - auto-delete after 2 years
crmTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Compound indexes for common queries
crmTransactionSchema.index({ firmId: 1, createdAt: -1 });
crmTransactionSchema.index({ firmId: 1, type: 1, createdAt: -1 });
crmTransactionSchema.index({ firmId: 1, entityType: 1, entityId: 1, createdAt: -1 });
crmTransactionSchema.index({ firmId: 1, category: 1, createdAt: -1 });
crmTransactionSchema.index({ firmId: 1, performedBy: 1, createdAt: -1 });
crmTransactionSchema.index({ lawyerId: 1, createdAt: -1 });
crmTransactionSchema.index({ lawyerId: 1, entityType: 1, entityId: 1, createdAt: -1 });

// Virtual: Time ago
crmTransactionSchema.virtual('timeAgo').get(function() {
    const now = new Date();
    const diff = now - this.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
});

// Static: Log transaction (main entry point)
crmTransactionSchema.statics.log = async function(data) {
    const transaction = new this({
        firmId: data.firmId,
        lawyerId: data.lawyerId,
        type: data.type,
        category: data.category || this.getCategoryFromType(data.type),
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        description: data.description,
        descriptionAr: data.descriptionAr,
        value: data.value,
        previousValue: data.previousValue,
        valueDelta: data.value && data.previousValue ? data.value - data.previousValue : undefined,
        currency: data.currency,
        fromStage: data.fromStage,
        toStage: data.toStage,
        timeInPreviousStage: data.timeInPreviousStage,
        changedFields: data.changedFields,
        relatedEntities: data.relatedEntities,
        performedBy: data.performedBy,
        performedByName: data.performedByName,
        source: data.source || 'web',
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
        isSystemEvent: data.isSystemEvent || false,
        isVisible: data.isVisible !== false
    });

    return transaction.save();
};

// Static: Get category from type
crmTransactionSchema.statics.getCategoryFromType = function(type) {
    if (type.startsWith('lead_')) return 'lead';
    if (type.startsWith('contact_')) return 'contact';
    if (type.startsWith('org_')) return 'organization';
    if (type.startsWith('activity_') || type.includes('_logged') || type === 'note_added') return 'activity';
    if (type.startsWith('deal_') || type.startsWith('stage_') || type.startsWith('pipeline_')) return 'deal';
    if (type.startsWith('quote_')) return 'quote';
    if (type.startsWith('campaign_')) return 'campaign';
    if (type.startsWith('score_') || type.includes('_changed') && type.includes('grade')) return 'scoring';
    if (type.startsWith('duplicate_')) return 'duplicate';
    if (type.includes('assigned')) return 'assignment';
    return 'system';
};

// Static: Get entity timeline
crmTransactionSchema.statics.getEntityTimeline = async function(entityType, entityId, firmId, options = {}) {
    const { limit = 50, offset = 0, types = null, startDate = null, endDate = null } = options;

    const query = {
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        isVisible: true
    };

    if (firmId) query.firmId = new mongoose.Types.ObjectId(firmId);
    if (types && types.length > 0) query.type = { $in: types };
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
        this.find(query)
            .populate('performedBy', 'firstName lastName email avatar')
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    return { transactions, total };
};

// Static: Get summary by type
crmTransactionSchema.statics.getSummary = async function(firmId, options = {}) {
    const { startDate, endDate, entityType } = options;

    const match = { firmId: new mongoose.Types.ObjectId(firmId) };

    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    if (entityType) match.entityType = entityType;

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalValue: { $sum: { $ifNull: ['$value', 0] } }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Static: Get user activity
crmTransactionSchema.statics.getUserActivity = async function(userId, firmId, options = {}) {
    const { limit = 20, days = 30 } = options;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.find({
        performedBy: new mongoose.Types.ObjectId(userId),
        firmId: new mongoose.Types.ObjectId(firmId),
        createdAt: { $gte: startDate },
        isVisible: true
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// Static: Get revenue events
crmTransactionSchema.statics.getRevenueEvents = async function(firmId, options = {}) {
    const { startDate, endDate } = options;

    const match = {
        firmId: new mongoose.Types.ObjectId(firmId),
        type: { $in: ['deal_won', 'deal_value_changed', 'quote_accepted'] },
        value: { $exists: true, $ne: null }
    };

    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    type: '$type'
                },
                count: { $sum: 1 },
                totalValue: { $sum: '$value' }
            }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);
};

const CRMTransaction = mongoose.model('CRMTransaction', crmTransactionSchema);

module.exports = CRMTransaction;
