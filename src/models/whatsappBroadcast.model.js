const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// WHATSAPP BROADCAST MODEL - BULK MESSAGING CAMPAIGNS
// ═══════════════════════════════════════════════════════════════

const whatsappBroadcastSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },

    // Unique broadcast ID
    broadcastId: {
        type: String,
        unique: true,
        index: true
    },

    name: {
        type: String,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BROADCAST TYPE & STATUS
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: ['template', 'text', 'media', 'location'],
        default: 'template'
    },

    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled', 'failed'],
        default: 'draft',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE CONTENT
    // ═══════════════════════════════════════════════════════════════
    // For template messages
    template: {
        templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
        templateName: String,
        language: { type: String, default: 'ar' },
        // Variables can be static or dynamic (from recipient data)
        variables: [{
            position: Number,
            type: { type: String, enum: ['static', 'dynamic'], default: 'static' },
            value: String, // Static value or field name for dynamic
            fieldName: String // Field from recipient data (e.g., 'firstName', 'companyName')
        }]
    },

    // For text messages (only works within 24-hour window)
    textContent: {
        text: String,
        // Support for personalization
        usePersonalization: { type: Boolean, default: false },
        personalizedFields: [String] // e.g., ['firstName', 'companyName']
    },

    // For media messages
    mediaContent: {
        type: { type: String, enum: ['image', 'video', 'document', 'audio'] },
        mediaUrl: String,
        caption: String,
        fileName: String
    },

    // For location messages
    locationContent: {
        latitude: Number,
        longitude: Number,
        name: String,
        address: String
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIENCE / RECIPIENTS
    // ═══════════════════════════════════════════════════════════════
    audienceType: {
        type: String,
        enum: ['all_leads', 'all_clients', 'segment', 'custom', 'tags', 'csv_import'],
        default: 'custom'
    },

    // For segment-based targeting
    segmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmailSegment' // Reuse email segments
    },

    // For tag-based targeting
    targetTags: [{ type: String, trim: true }],
    tagLogic: {
        type: String,
        enum: ['AND', 'OR'],
        default: 'OR'
    },

    // Custom recipient list
    recipients: [{
        phoneNumber: { type: String, trim: true },
        name: String,
        leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
        customData: mongoose.Schema.Types.Mixed, // For personalization
        status: {
            type: String,
            enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'skipped'],
            default: 'pending'
        },
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppMessage' },
        sentAt: Date,
        deliveredAt: Date,
        readAt: Date,
        failedAt: Date,
        errorCode: String,
        errorMessage: String
    }],

    // Exclusion list
    excludeNumbers: [{ type: String, trim: true }],
    excludeLeads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
    excludeClients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],

    // ═══════════════════════════════════════════════════════════════
    // SCHEDULING
    // ═══════════════════════════════════════════════════════════════
    scheduledAt: {
        type: Date,
        index: true
    },

    timezone: {
        type: String,
        default: 'Asia/Riyadh'
    },

    startedAt: Date,
    completedAt: Date,
    pausedAt: Date,
    cancelledAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // SENDING OPTIONS
    // ═══════════════════════════════════════════════════════════════
    sendingOptions: {
        // Rate limiting
        messagesPerMinute: { type: Number, default: 30, min: 1, max: 100 },

        // Batch processing
        batchSize: { type: Number, default: 100 },
        delayBetweenBatches: { type: Number, default: 60 }, // seconds

        // Retry settings
        maxRetries: { type: Number, default: 3 },
        retryDelay: { type: Number, default: 300 }, // seconds

        // Skip invalid numbers
        skipInvalidNumbers: { type: Boolean, default: true },

        // Only send to contacts with open 24-hour window (for non-template)
        respectWindowOnly: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        totalRecipients: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        sent: { type: Number, default: 0 },
        delivered: { type: Number, default: 0 },
        read: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        skipped: { type: Number, default: 0 }
    },

    // Calculated rates
    deliveryRate: { type: Number, default: 0 },
    readRate: { type: Number, default: 0 },
    failureRate: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // COST TRACKING
    // ═══════════════════════════════════════════════════════════════
    cost: {
        estimatedCost: { type: Number, default: 0 },
        actualCost: { type: Number, default: 0 },
        currency: { type: String, default: 'SAR' },
        costPerMessage: { type: Number, default: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    tags: [{ type: String, trim: true }],
    notes: String,

    // Provider
    provider: {
        type: String,
        enum: ['meta', 'msg91', 'twilio'],
        default: 'meta'
    },

    // Audit trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledBy: {
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
whatsappBroadcastSchema.index({ firmId: 1, status: 1, createdAt: -1 });
whatsappBroadcastSchema.index({ firmId: 1, scheduledAt: 1 });
whatsappBroadcastSchema.index({ firmId: 1, type: 1 });
whatsappBroadcastSchema.index({ broadcastId: 1 }, { unique: true });
whatsappBroadcastSchema.index({ 'recipients.phoneNumber': 1 });
whatsappBroadcastSchema.index({ 'recipients.status': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
whatsappBroadcastSchema.pre('save', async function(next) {
    // Generate broadcast ID if not exists
    if (!this.broadcastId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), date.getDate()),
                $lt: new Date(year, date.getMonth(), date.getDate() + 1)
            }
        });
        this.broadcastId = `BC-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate statistics
    if (this.recipients && this.recipients.length > 0) {
        this.stats.totalRecipients = this.recipients.length;
        this.stats.pending = this.recipients.filter(r => r.status === 'pending').length;
        this.stats.sent = this.recipients.filter(r => r.status === 'sent').length;
        this.stats.delivered = this.recipients.filter(r => r.status === 'delivered').length;
        this.stats.read = this.recipients.filter(r => r.status === 'read').length;
        this.stats.failed = this.recipients.filter(r => r.status === 'failed').length;
        this.stats.skipped = this.recipients.filter(r => r.status === 'skipped').length;

        // Calculate rates
        const sent = this.stats.sent + this.stats.delivered + this.stats.read;
        if (sent > 0) {
            this.deliveryRate = ((this.stats.delivered + this.stats.read) / sent * 100).toFixed(2);
            this.readRate = (this.stats.read / sent * 100).toFixed(2);
        }
        if (this.stats.totalRecipients > 0) {
            this.failureRate = (this.stats.failed / this.stats.totalRecipients * 100).toFixed(2);
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get broadcasts by status
whatsappBroadcastSchema.statics.getByStatus = async function(firmId, status, options = {}) {
    const query = { firmId: new mongoose.Types.ObjectId(firmId) };
    if (status) query.status = status;

    return await this.find(query)
        .populate('template.templateId', 'name category')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

// Get scheduled broadcasts ready to send
whatsappBroadcastSchema.statics.getScheduledBroadcasts = async function() {
    return await this.find({
        status: 'scheduled',
        scheduledAt: { $lte: new Date() }
    }).populate('template.templateId');
};

// Get broadcast statistics for firm
whatsappBroadcastSchema.statics.getFirmStats = async function(firmId, dateRange = {}) {
    const matchQuery = { firmId: new mongoose.Types.ObjectId(firmId) };

    if (dateRange.start) {
        matchQuery.createdAt = { $gte: new Date(dateRange.start) };
    }
    if (dateRange.end) {
        matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(dateRange.end) };
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalRecipients: { $sum: '$stats.totalRecipients' },
                totalSent: { $sum: '$stats.sent' },
                totalDelivered: { $sum: '$stats.delivered' },
                totalRead: { $sum: '$stats.read' },
                totalFailed: { $sum: '$stats.failed' }
            }
        }
    ]);

    const total = await this.countDocuments(matchQuery);

    return { total, byStatus: stats };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Add recipients from leads
whatsappBroadcastSchema.methods.addLeadRecipients = async function(leadIds) {
    const Lead = mongoose.model('Lead');
    const leads = await Lead.find({
        _id: { $in: leadIds },
        $or: [
            { phone: { $exists: true, $ne: '' } },
            { whatsapp: { $exists: true, $ne: '' } }
        ]
    }).select('firstName lastName phone whatsapp companyName');

    const newRecipients = leads.map(lead => ({
        phoneNumber: lead.whatsapp || lead.phone,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
        leadId: lead._id,
        customData: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            companyName: lead.companyName
        },
        status: 'pending'
    }));

    // Filter out duplicates and excluded numbers
    const existingNumbers = this.recipients.map(r => r.phoneNumber);
    const filtered = newRecipients.filter(r =>
        !existingNumbers.includes(r.phoneNumber) &&
        !this.excludeNumbers.includes(r.phoneNumber)
    );

    this.recipients.push(...filtered);
    return filtered.length;
};

// Add recipients from clients
whatsappBroadcastSchema.methods.addClientRecipients = async function(clientIds) {
    const Client = mongoose.model('Client');
    const clients = await Client.find({
        _id: { $in: clientIds },
        $or: [
            { phone: { $exists: true, $ne: '' } },
            { whatsapp: { $exists: true, $ne: '' } }
        ]
    }).select('firstName lastName phone whatsapp companyName');

    const newRecipients = clients.map(client => ({
        phoneNumber: client.whatsapp || client.phone,
        name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        clientId: client._id,
        customData: {
            firstName: client.firstName,
            lastName: client.lastName,
            companyName: client.companyName
        },
        status: 'pending'
    }));

    const existingNumbers = this.recipients.map(r => r.phoneNumber);
    const filtered = newRecipients.filter(r =>
        !existingNumbers.includes(r.phoneNumber) &&
        !this.excludeNumbers.includes(r.phoneNumber)
    );

    this.recipients.push(...filtered);
    return filtered.length;
};

// Update recipient status
whatsappBroadcastSchema.methods.updateRecipientStatus = async function(phoneNumber, status, data = {}) {
    const recipient = this.recipients.find(r => r.phoneNumber === phoneNumber);
    if (recipient) {
        recipient.status = status;
        if (data.messageId) recipient.messageId = data.messageId;
        if (status === 'sent') recipient.sentAt = new Date();
        if (status === 'delivered') recipient.deliveredAt = new Date();
        if (status === 'read') recipient.readAt = new Date();
        if (status === 'failed') {
            recipient.failedAt = new Date();
            recipient.errorCode = data.errorCode;
            recipient.errorMessage = data.errorMessage;
        }
        await this.save();
    }
    return recipient;
};

// Get pending recipients for sending
whatsappBroadcastSchema.methods.getPendingRecipients = function(limit = 100) {
    return this.recipients
        .filter(r => r.status === 'pending')
        .slice(0, limit);
};

// Pause broadcast
whatsappBroadcastSchema.methods.pause = async function(userId) {
    this.status = 'paused';
    this.pausedAt = new Date();
    this.updatedBy = userId;
    return await this.save();
};

// Resume broadcast
whatsappBroadcastSchema.methods.resume = async function(userId) {
    this.status = 'sending';
    this.updatedBy = userId;
    return await this.save();
};

// Cancel broadcast
whatsappBroadcastSchema.methods.cancel = async function(userId) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = userId;

    // Mark pending recipients as skipped
    this.recipients.forEach(r => {
        if (r.status === 'pending') {
            r.status = 'skipped';
        }
    });

    return await this.save();
};

// Complete broadcast
whatsappBroadcastSchema.methods.complete = async function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return await this.save();
};

// Get progress percentage
whatsappBroadcastSchema.methods.getProgress = function() {
    if (this.stats.totalRecipients === 0) return 0;
    const processed = this.stats.sent + this.stats.delivered + this.stats.read + this.stats.failed + this.stats.skipped;
    return Math.round((processed / this.stats.totalRecipients) * 100);
};

module.exports = mongoose.model('WhatsAppBroadcast', whatsappBroadcastSchema);
