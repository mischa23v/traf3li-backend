/**
 * Email Tracking Model
 * Security: Includes firmId for multi-tenant isolation
 *
 * Tracks email opens and clicks for Lead/Contact/Client communications
 */

const mongoose = require('mongoose');

// Open event subdocument schema
const openEventSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    ip: {
        type: String,
        trim: true,
        maxlength: 45  // IPv6 max length
    },
    userAgent: {
        type: String,
        trim: true,
        maxlength: 500
    },
    device: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
        default: 'unknown'
    },
    location: {
        country: String,
        city: String,
        region: String
    }
}, { _id: false });

// Click event subdocument schema
const clickEventSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    url: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    linkId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    ip: {
        type: String,
        trim: true,
        maxlength: 45
    },
    userAgent: {
        type: String,
        trim: true,
        maxlength: 500
    },
    device: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
        default: 'unknown'
    }
}, { _id: false });

// Main email tracking schema
const emailTrackingSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TRACKING IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    trackingId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        maxlength: 64
    },

    // ═══════════════════════════════════════════════════════════════
    // EMAIL REFERENCE
    // ═══════════════════════════════════════════════════════════════
    emailId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
        // Can reference different email types (EmailCampaign, etc.)
    },

    // ═══════════════════════════════════════════════════════════════
    // RECIPIENT INFORMATION (Polymorphic)
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        enum: ['lead', 'contact', 'client'],
        required: true,
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
        // References Lead, Contact, or Client based on entityType
    },
    recipientEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 255,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TRACKING DATA
    // ═══════════════════════════════════════════════════════════════
    opens: {
        type: [openEventSchema],
        default: []
    },
    openCount: {
        type: Number,
        default: 0,
        min: 0
    },
    firstOpenedAt: {
        type: Date,
        index: true
    },
    lastOpenedAt: {
        type: Date,
        index: true
    },

    clicks: {
        type: [clickEventSchema],
        default: []
    },
    clickCount: {
        type: Number,
        default: 0,
        min: 0
    },
    firstClickedAt: {
        type: Date,
        index: true
    },
    lastClickedAt: {
        type: Date,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EMAIL METADATA
    // ═══════════════════════════════════════════════════════════════
    subject: {
        type: String,
        trim: true,
        maxlength: 500
    },
    sentAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Campaign/Template reference (optional)
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmailCampaign',
        index: true
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmailTemplate',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ENGAGEMENT METRICS
    // ═══════════════════════════════════════════════════════════════
    engagementScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
emailTrackingSchema.index({ firmId: 1, entityType: 1, entityId: 1 });
emailTrackingSchema.index({ firmId: 1, emailId: 1 });
emailTrackingSchema.index({ firmId: 1, campaignId: 1 });
emailTrackingSchema.index({ firmId: 1, sentAt: -1 });
emailTrackingSchema.index({ firmId: 1, openCount: -1 });
emailTrackingSchema.index({ firmId: 1, clickCount: -1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
emailTrackingSchema.virtual('wasOpened').get(function() {
    return this.openCount > 0;
});

emailTrackingSchema.virtual('wasClicked').get(function() {
    return this.clickCount > 0;
});

emailTrackingSchema.virtual('isEngaged').get(function() {
    return this.openCount > 0 || this.clickCount > 0;
});

emailTrackingSchema.virtual('uniqueOpens').get(function() {
    if (!this.opens || this.opens.length === 0) return 0;
    const uniqueIps = new Set(this.opens.map(o => o.ip).filter(Boolean));
    return uniqueIps.size;
});

emailTrackingSchema.virtual('uniqueClicks').get(function() {
    if (!this.clicks || this.clicks.length === 0) return 0;
    const uniqueIps = new Set(this.clicks.map(c => c.ip).filter(Boolean));
    return uniqueIps.size;
});

// Ensure virtuals are included in JSON/Object output
emailTrackingSchema.set('toJSON', { virtuals: true });
emailTrackingSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate engagement score based on opens and clicks
 */
emailTrackingSchema.methods.calculateEngagementScore = function() {
    let score = 0;

    // Points for opening (max 40 points)
    if (this.openCount > 0) {
        score += Math.min(40, this.openCount * 10);
    }

    // Points for clicking (max 60 points)
    if (this.clickCount > 0) {
        score += Math.min(60, this.clickCount * 20);
    }

    // Bonus for quick engagement (opened within 1 hour of sending)
    if (this.firstOpenedAt && this.sentAt) {
        const minutesToOpen = (this.firstOpenedAt - this.sentAt) / (1000 * 60);
        if (minutesToOpen <= 60) {
            score += 10;
        }
    }

    this.engagementScore = Math.min(100, score);
    return this.engagementScore;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get tracking stats for an entity (Lead/Contact/Client)
 * @param {String} entityType - Type of entity
 * @param {ObjectId} entityId - Entity ID
 * @param {ObjectId} firmId - Firm ID for isolation (REQUIRED)
 */
emailTrackingSchema.statics.getEntityStats = async function(entityType, entityId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    const stats = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                entityType,
                entityId: new mongoose.Types.ObjectId(entityId)
            }
        },
        {
            $group: {
                _id: null,
                totalEmails: { $sum: 1 },
                totalOpens: { $sum: '$openCount' },
                totalClicks: { $sum: '$clickCount' },
                emailsOpened: { $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] } },
                emailsClicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
                avgEngagementScore: { $avg: '$engagementScore' }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            totalEmails: 0,
            totalOpens: 0,
            totalClicks: 0,
            emailsOpened: 0,
            emailsClicked: 0,
            openRate: 0,
            clickRate: 0,
            avgEngagementScore: 0
        };
    }

    const result = stats[0];
    return {
        totalEmails: result.totalEmails,
        totalOpens: result.totalOpens,
        totalClicks: result.totalClicks,
        emailsOpened: result.emailsOpened,
        emailsClicked: result.emailsClicked,
        openRate: result.totalEmails > 0 ? (result.emailsOpened / result.totalEmails * 100).toFixed(2) : 0,
        clickRate: result.totalEmails > 0 ? (result.emailsClicked / result.totalEmails * 100).toFixed(2) : 0,
        avgEngagementScore: result.avgEngagementScore ? result.avgEngagementScore.toFixed(2) : 0
    };
};

/**
 * Get campaign tracking stats
 * @param {ObjectId} campaignId - Campaign ID
 * @param {ObjectId} firmId - Firm ID for isolation (REQUIRED)
 */
emailTrackingSchema.statics.getCampaignStats = async function(campaignId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                campaignId: new mongoose.Types.ObjectId(campaignId)
            }
        },
        {
            $group: {
                _id: null,
                totalRecipients: { $sum: 1 },
                totalOpens: { $sum: '$openCount' },
                totalClicks: { $sum: '$clickCount' },
                recipientsOpened: { $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] } },
                recipientsClicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
                avgEngagementScore: { $avg: '$engagementScore' }
            }
        },
        {
            $project: {
                _id: 0,
                totalRecipients: 1,
                totalOpens: 1,
                totalClicks: 1,
                recipientsOpened: 1,
                recipientsClicked: 1,
                openRate: {
                    $multiply: [
                        { $divide: ['$recipientsOpened', '$totalRecipients'] },
                        100
                    ]
                },
                clickRate: {
                    $multiply: [
                        { $divide: ['$recipientsClicked', '$totalRecipients'] },
                        100
                    ]
                },
                avgEngagementScore: 1
            }
        }
    ]);
};

/**
 * Get device breakdown for campaign
 * @param {ObjectId} campaignId - Campaign ID
 * @param {ObjectId} firmId - Firm ID for isolation (REQUIRED)
 */
emailTrackingSchema.statics.getDeviceBreakdown = async function(campaignId, firmId) {
    if (!firmId) throw new Error('firmId is required');

    return await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                campaignId: new mongoose.Types.ObjectId(campaignId)
            }
        },
        { $unwind: '$opens' },
        {
            $group: {
                _id: '$opens.device',
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                device: '$_id',
                count: 1
            }
        },
        { $sort: { count: -1 } }
    ]);
};

/**
 * Get most clicked links
 * @param {ObjectId} campaignId - Campaign ID
 * @param {ObjectId} firmId - Firm ID for isolation (REQUIRED)
 * @param {Number} limit - Number of top links to return
 */
emailTrackingSchema.statics.getTopLinks = async function(campaignId, firmId, limit = 10) {
    if (!firmId) throw new Error('firmId is required');

    return await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                campaignId: new mongoose.Types.ObjectId(campaignId)
            }
        },
        { $unwind: '$clicks' },
        {
            $group: {
                _id: '$clicks.url',
                totalClicks: { $sum: 1 },
                uniqueRecipients: { $addToSet: '$entityId' }
            }
        },
        {
            $project: {
                _id: 0,
                url: '$_id',
                totalClicks: 1,
                uniqueClicks: { $size: '$uniqueRecipients' }
            }
        },
        { $sort: { totalClicks: -1 } },
        { $limit: limit }
    ]);
};

module.exports = mongoose.model('EmailTracking', emailTrackingSchema);
