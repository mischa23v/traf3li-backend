/**
 * Campaign Model
 *
 * Multi-tenant marketing campaign tracking for legal CRM.
 * Security: Includes firmId for multi-tenant isolation.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CAMPAIGN_TYPES = [
    'email',
    'social',
    'event',
    'webinar',
    'referral',
    'advertising',
    'content',
    'other'
];

const CAMPAIGN_CHANNELS = [
    'email',
    'linkedin',
    'twitter',
    'facebook',
    'instagram',
    'google_ads',
    'whatsapp',
    'sms',
    'phone',
    'in_person',
    'website',
    'other'
];

const CAMPAIGN_STATUSES = [
    'draft',
    'scheduled',
    'active',
    'paused',
    'completed',
    'cancelled'
];

const CLIENT_TYPES = [
    'individual',
    'corporate',
    'government',
    'nonprofit'
];

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const campaignSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY (Required for firm isolation)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CAMPAIGN IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    campaignId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 5000
    },

    // ═══════════════════════════════════════════════════════════════
    // CAMPAIGN DETAILS
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: CAMPAIGN_TYPES,
        required: true,
        index: true
    },
    channel: {
        type: String,
        enum: CAMPAIGN_CHANNELS,
        index: true
    },
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        index: true
    },
    status: {
        type: String,
        enum: CAMPAIGN_STATUSES,
        default: 'draft',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BUDGET TRACKING
    // ═══════════════════════════════════════════════════════════════
    budget: {
        planned: {
            type: Number,
            min: 0,
            default: 0
        },
        actual: {
            type: Number,
            min: 0,
            default: 0
        },
        currency: {
            type: String,
            default: 'SAR',
            maxlength: 3
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TARGETS & GOALS
    // ═══════════════════════════════════════════════════════════════
    targets: {
        expectedLeads: {
            type: Number,
            min: 0,
            default: 0
        },
        expectedConversions: {
            type: Number,
            min: 0,
            default: 0
        },
        expectedRevenue: {
            type: Number,
            min: 0,
            default: 0
        },
        expectedResponseRate: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // UTM TRACKING
    // ═══════════════════════════════════════════════════════════════
    utm: {
        source: {
            type: String,
            trim: true,
            maxlength: 100
        },
        medium: {
            type: String,
            trim: true,
            maxlength: 100
        },
        campaign: {
            type: String,
            trim: true,
            maxlength: 100
        },
        term: {
            type: String,
            trim: true,
            maxlength: 100
        },
        content: {
            type: String,
            trim: true,
            maxlength: 100
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // CAMPAIGN HIERARCHY & OWNERSHIP
    // ═══════════════════════════════════════════════════════════════
    parentCampaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        index: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesTeam',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TARGET AUDIENCE
    // ═══════════════════════════════════════════════════════════════
    targetAudience: {
        territories: [{
            type: String,
            trim: true,
            maxlength: 100
        }],
        industries: [{
            type: String,
            trim: true,
            maxlength: 100
        }],
        practiceAreas: [{
            type: String,
            trim: true,
            maxlength: 100
        }],
        clientTypes: [{
            type: String,
            enum: CLIENT_TYPES
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // RESULTS & METRICS
    // ═══════════════════════════════════════════════════════════════
    results: {
        leadsGenerated: {
            type: Number,
            min: 0,
            default: 0
        },
        leadsConverted: {
            type: Number,
            min: 0,
            default: 0
        },
        opportunitiesCreated: {
            type: Number,
            min: 0,
            default: 0
        },
        dealsWon: {
            type: Number,
            min: 0,
            default: 0
        },
        revenueGenerated: {
            type: Number,
            min: 0,
            default: 0
        },
        emailsSent: {
            type: Number,
            min: 0,
            default: 0
        },
        emailsOpened: {
            type: Number,
            min: 0,
            default: 0
        },
        emailsClicked: {
            type: Number,
            min: 0,
            default: 0
        },
        unsubscribes: {
            type: Number,
            min: 0,
            default: 0
        },
        roi: {
            type: Number,
            default: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // EMAIL CAMPAIGN SETTINGS
    // ═══════════════════════════════════════════════════════════════
    emailSettings: {
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmailTemplate'
        },
        subject: {
            type: String,
            trim: true,
            maxlength: 200
        },
        senderName: {
            type: String,
            trim: true,
            maxlength: 100
        },
        senderEmail: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 100
        },
        replyTo: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 100
        },
        contactListId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ContactList'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TAGS & NOTES
    // ═══════════════════════════════════════════════════════════════
    tags: [{
        type: String,
        trim: true,
        maxlength: 50
    }],
    notes: {
        type: String,
        trim: true,
        maxlength: 5000
    },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOM FIELDS (Structured)
    // ═══════════════════════════════════════════════════════════════
    customFields: {
        field1: { type: String, trim: true },
        field2: { type: String, trim: true },
        field3: { type: String, trim: true },
        field4: { type: String, trim: true },
        field5: { type: String, trim: true },
        number1: { type: Number },
        number2: { type: Number },
        date1: Date,
        date2: Date,
        checkbox1: { type: Boolean, default: false },
        checkbox2: { type: Boolean, default: false },
        dropdown1: { type: String, trim: true },
        textarea1: { type: String, maxlength: 5000 }
    },

    // ═══════════════════════════════════════════════════════════════
    // TERRITORY & ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    territoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Territory',
        index: true
    },
    salesTeamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesTeam',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    integration: {
        externalId: { type: String, trim: true },
        sourceSystem: { type: String, trim: true },
        lastSyncDate: Date,
        syncStatus: {
            type: String,
            enum: ['synced', 'pending', 'failed', 'never']
        },
        syncErrors: [{ type: String }]
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    launchedAt: {
        type: Date
    },
    launchedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedAt: {
        type: Date
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Unique campaign ID per firm
campaignSchema.index({ firmId: 1, campaignId: 1 }, { unique: true });

// Common query patterns
campaignSchema.index({ firmId: 1, status: 1 });
campaignSchema.index({ firmId: 1, type: 1, status: 1 });
campaignSchema.index({ firmId: 1, ownerId: 1, status: 1 });
campaignSchema.index({ firmId: 1, teamId: 1 });
campaignSchema.index({ firmId: 1, startDate: 1, endDate: 1 });
campaignSchema.index({ firmId: 1, parentCampaignId: 1 });
campaignSchema.index({ firmId: 1, createdAt: -1 });

// Text search
campaignSchema.index({ name: 'text', nameAr: 'text', description: 'text' });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

campaignSchema.pre('save', async function(next) {
    // Generate campaign ID if new (CAMP-YYYY-####)
    if (!this.campaignId && this.isNew) {
        const date = new Date();
        const year = date.getFullYear();

        // Count campaigns created this year for this firm
        const count = await mongoose.model('Campaign').countDocuments({
            firmId: this.firmId,
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });

        this.campaignId = `CAMP-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate ROI if we have revenue and budget
    if (this.results && this.budget && this.budget.actual > 0) {
        const revenue = this.results.revenueGenerated || 0;
        const cost = this.budget.actual || 0;

        if (cost > 0) {
            this.results.roi = ((revenue - cost) / cost) * 100;
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get campaigns with filters
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Array of campaigns
 */
campaignSchema.statics.getCampaigns = async function(firmId, filters = {}) {
    if (!firmId) {
        throw new Error('firmId is required for multi-tenant isolation');
    }

    const query = { firmId };

    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.ownerId) query.ownerId = filters.ownerId;
    if (filters.teamId) query.teamId = filters.teamId;
    if (filters.parentCampaignId) query.parentCampaignId = filters.parentCampaignId;

    // Date range filters
    if (filters.startDate || filters.endDate) {
        query.startDate = {};
        if (filters.startDate) query.startDate.$gte = new Date(filters.startDate);
        if (filters.endDate) query.startDate.$lte = new Date(filters.endDate);
    }

    return this.find(query)
        .populate('ownerId', 'firstName lastName email avatar')
        .populate('teamId', 'name')
        .populate('parentCampaignId', 'name campaignId')
        .populate('createdBy', 'firstName lastName')
        .populate('emailSettings.templateId', 'name')
        .sort({ createdAt: -1 });
};

/**
 * Get campaign by ID with firm isolation
 * @param {String} campaignId - Campaign ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @returns {Promise<Object>} Campaign document
 */
campaignSchema.statics.getCampaignById = async function(campaignId, firmId) {
    if (!firmId) {
        throw new Error('firmId is required for multi-tenant isolation');
    }

    return this.findOne({ _id: campaignId, firmId })
        .populate('ownerId', 'firstName lastName email avatar phone')
        .populate('teamId', 'name members')
        .populate('parentCampaignId', 'name campaignId status')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .populate('launchedBy', 'firstName lastName')
        .populate('completedBy', 'firstName lastName')
        .populate('emailSettings.templateId', 'name subject');
};

/**
 * Update campaign results
 * @param {String} campaignId - Campaign ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @param {Object} results - Results data
 * @returns {Promise<Object>} Updated campaign
 */
campaignSchema.statics.updateResults = async function(campaignId, firmId, results) {
    if (!firmId) {
        throw new Error('firmId is required for multi-tenant isolation');
    }

    const campaign = await this.findOne({ _id: campaignId, firmId });
    if (!campaign) {
        return null;
    }

    // Update individual result fields
    Object.keys(results).forEach(key => {
        if (campaign.results[key] !== undefined) {
            campaign.results[key] = results[key];
        }
    });

    // Recalculate ROI
    if (campaign.budget && campaign.budget.actual > 0) {
        const revenue = campaign.results.revenueGenerated || 0;
        const cost = campaign.budget.actual || 0;

        if (cost > 0) {
            campaign.results.roi = ((revenue - cost) / cost) * 100;
        }
    }

    await campaign.save();
    return campaign;
};

/**
 * Calculate ROI for a campaign
 * @param {String} campaignId - Campaign ID
 * @param {ObjectId} firmId - Firm ID (REQUIRED for multi-tenant isolation)
 * @returns {Promise<Object>} ROI data
 */
campaignSchema.statics.calculateROI = async function(campaignId, firmId) {
    if (!firmId) {
        throw new Error('firmId is required for multi-tenant isolation');
    }

    const campaign = await this.findOne({ _id: campaignId, firmId });
    if (!campaign) {
        return null;
    }

    const revenue = campaign.results?.revenueGenerated || 0;
    const cost = campaign.budget?.actual || 0;
    const plannedBudget = campaign.budget?.planned || 0;

    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
    const budgetVariance = plannedBudget - cost;
    const budgetVariancePercent = plannedBudget > 0 ? (budgetVariance / plannedBudget) * 100 : 0;

    // Conversion metrics
    const leadsGenerated = campaign.results?.leadsGenerated || 0;
    const leadsConverted = campaign.results?.leadsConverted || 0;
    const conversionRate = leadsGenerated > 0 ? (leadsConverted / leadsGenerated) * 100 : 0;

    // Email metrics
    const emailsSent = campaign.results?.emailsSent || 0;
    const emailsOpened = campaign.results?.emailsOpened || 0;
    const emailsClicked = campaign.results?.emailsClicked || 0;
    const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
    const clickRate = emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0;
    const clickToOpenRate = emailsOpened > 0 ? (emailsClicked / emailsOpened) * 100 : 0;

    // Cost per metrics
    const costPerLead = leadsGenerated > 0 ? cost / leadsGenerated : 0;
    const costPerConversion = leadsConverted > 0 ? cost / leadsConverted : 0;

    return {
        campaignId: campaign.campaignId,
        name: campaign.name,
        status: campaign.status,

        // Financial metrics
        revenue,
        cost,
        plannedBudget,
        roi,
        budgetVariance,
        budgetVariancePercent,

        // Lead metrics
        leadsGenerated,
        leadsConverted,
        conversionRate,
        costPerLead,
        costPerConversion,

        // Email metrics
        emailsSent,
        emailsOpened,
        emailsClicked,
        openRate,
        clickRate,
        clickToOpenRate,

        // Other metrics
        opportunitiesCreated: campaign.results?.opportunitiesCreated || 0,
        dealsWon: campaign.results?.dealsWon || 0,
        unsubscribes: campaign.results?.unsubscribes || 0
    };
};

module.exports = mongoose.model('Campaign', campaignSchema);
