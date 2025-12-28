const mongoose = require('mongoose');
const encryptionPlugin = require('./plugins/encryption.plugin');

/**
 * DocuSign Integration Model
 *
 * Stores OAuth tokens and settings for DocuSign e-signature integration
 * per user and firm. Critical for law firms to get documents signed by clients.
 *
 * Security Features:
 * - Encrypted access/refresh tokens (AES-256-GCM)
 * - Token expiry tracking
 * - Envelope tracking
 * - Webhook event handling
 */

const docusignIntegrationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // USER & FIRM ASSOCIATION
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
        index: true
        // null for personal integrations, set for firm-wide
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // OAUTH TOKENS (encrypted)
    // ═══════════════════════════════════════════════════════════════
    accessToken: {
        type: String,
        required: true,
        select: false  // Never return in queries by default
        // Will be encrypted by plugin
    },

    refreshToken: {
        type: String,
        required: true,
        select: false  // Never return in queries by default
        // Will be encrypted by plugin
    },

    tokenType: {
        type: String,
        default: 'Bearer'
    },

    tokenExpiresAt: {
        type: Date,
        required: true,
        index: true
        // When the access token expires
    },

    scope: {
        type: String
        // Granted OAuth scopes
    },

    // ═══════════════════════════════════════════════════════════════
    // DOCUSIGN ACCOUNT INFO
    // ═══════════════════════════════════════════════════════════════
    accountId: {
        type: String,
        required: true,
        index: true
        // DocuSign account ID
    },

    accountName: {
        type: String
        // DocuSign account name
    },

    baseUri: {
        type: String,
        required: true
        // DocuSign API base URI (varies by account)
    },

    email: {
        type: String
        // DocuSign account email
    },

    userName: {
        type: String
        // DocuSign account user name
    },

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    connectedAt: {
        type: Date,
        default: Date.now
    },

    disconnectedAt: {
        type: Date
    },

    disconnectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    disconnectReason: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT TEMPLATES
    // ═══════════════════════════════════════════════════════════════
    defaultTemplates: [{
        templateId: {
            type: String,
            required: true
            // DocuSign template ID
        },
        templateName: String,
        description: String,
        // Template type for categorization
        type: {
            type: String,
            enum: ['contract', 'nda', 'agreement', 'consent_form', 'retainer', 'other'],
            default: 'other'
        },
        isDefault: {
            type: Boolean,
            default: false
            // Mark as default template for its type
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATION SETTINGS
    // ═══════════════════════════════════════════════════════════════
    notificationSettings: {
        // Enable webhook notifications
        webhooksEnabled: {
            type: Boolean,
            default: true
        },
        // Events to notify about
        events: {
            envelopeSent: {
                type: Boolean,
                default: true
            },
            envelopeDelivered: {
                type: Boolean,
                default: true
            },
            envelopeCompleted: {
                type: Boolean,
                default: true
            },
            envelopeDeclined: {
                type: Boolean,
                default: true
            },
            envelopeVoided: {
                type: Boolean,
                default: true
            },
            recipientSigned: {
                type: Boolean,
                default: true
            },
            recipientDelivered: {
                type: Boolean,
                default: false
            },
            recipientCompleted: {
                type: Boolean,
                default: false
            }
        },
        // Email notifications
        emailNotifications: {
            type: Boolean,
            default: true
        },
        // In-app notifications
        inAppNotifications: {
            type: Boolean,
            default: true
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ENVELOPE TRACKING (Recent envelopes)
    // ═══════════════════════════════════════════════════════════════
    envelopes: [{
        envelopeId: {
            type: String,
            required: true,
            index: true
            // DocuSign envelope ID
        },
        subject: String,
        status: {
            type: String,
            enum: ['created', 'sent', 'delivered', 'signed', 'completed', 'declined', 'voided'],
            default: 'created'
        },
        // Link to case/client in the system
        linkedTo: {
            type: {
                type: String,
                enum: ['case', 'client', 'contact', 'deal', 'other']
            },
            id: mongoose.Schema.Types.ObjectId,
            name: String
        },
        // Recipients
        recipients: [{
            name: String,
            email: String,
            role: String,
            status: String,
            signedAt: Date
        }],
        createdAt: {
            type: Date,
            default: Date.now
        },
        sentAt: Date,
        completedAt: Date,
        lastStatusChange: Date
    }],

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    webhook: {
        connectId: String,
        configurationId: String,
        status: {
            type: String,
            enum: ['active', 'inactive', 'error'],
            default: 'inactive'
        },
        createdAt: Date,
        lastEventAt: Date,
        errorCount: {
            type: Number,
            default: 0
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // USAGE STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        totalEnvelopesSent: {
            type: Number,
            default: 0
        },
        totalEnvelopesCompleted: {
            type: Number,
            default: 0
        },
        totalEnvelopesDeclined: {
            type: Number,
            default: 0
        },
        totalEnvelopesVoided: {
            type: Number,
            default: 0
        },
        totalDocumentsSigned: {
            type: Number,
            default: 0
        },
        lastEnvelopeSentAt: Date,
        lastEnvelopeCompletedAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    lastSyncedAt: {
        type: Date
    },

    lastSyncError: {
        type: String
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
docusignIntegrationSchema.index({ userId: 1, firmId: 1 }, { unique: true });
docusignIntegrationSchema.index({ userId: 1, isActive: 1 });
docusignIntegrationSchema.index({ accountId: 1 });
docusignIntegrationSchema.index({ tokenExpiresAt: 1 });
docusignIntegrationSchema.index({ 'envelopes.envelopeId': 1 });
docusignIntegrationSchema.index({ 'envelopes.status': 1 });
docusignIntegrationSchema.index({ 'envelopes.linkedTo.type': 1, 'envelopes.linkedTo.id': 1 });

// ═══════════════════════════════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════════════════════════════
// Apply encryption to sensitive fields
docusignIntegrationSchema.plugin(encryptionPlugin, {
    fields: ['accessToken', 'refreshToken']
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if access token is expired
 */
docusignIntegrationSchema.methods.isTokenExpired = function() {
    return this.tokenExpiresAt && new Date() >= this.tokenExpiresAt;
};

/**
 * Check if token will expire soon (within 5 minutes)
 */
docusignIntegrationSchema.methods.isTokenExpiringSoon = function() {
    if (!this.tokenExpiresAt) return true;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return fiveMinutesFromNow >= this.tokenExpiresAt;
};

/**
 * Mark as disconnected
 */
docusignIntegrationSchema.methods.disconnect = function(userId, reason) {
    this.isActive = false;
    this.disconnectedAt = new Date();
    this.disconnectedBy = userId;
    this.disconnectReason = reason;
    if (this.webhook) {
        this.webhook.status = 'inactive';
    }
    return this.save();
};

/**
 * Update envelope tracking
 */
docusignIntegrationSchema.methods.trackEnvelope = function(envelopeData) {
    const existingIndex = this.envelopes.findIndex(e => e.envelopeId === envelopeData.envelopeId);

    const envelopeDoc = {
        envelopeId: envelopeData.envelopeId,
        subject: envelopeData.subject || envelopeData.emailSubject,
        status: envelopeData.status || 'created',
        linkedTo: envelopeData.linkedTo,
        recipients: envelopeData.recipients || [],
        createdAt: envelopeData.createdAt || new Date(),
        sentAt: envelopeData.sentAt,
        completedAt: envelopeData.completedAt,
        lastStatusChange: new Date()
    };

    if (existingIndex >= 0) {
        // Update existing envelope
        this.envelopes[existingIndex] = { ...this.envelopes[existingIndex].toObject(), ...envelopeDoc };
    } else {
        // Add new envelope (keep only last 100)
        this.envelopes.unshift(envelopeDoc);
        if (this.envelopes.length > 100) {
            this.envelopes = this.envelopes.slice(0, 100);
        }
    }

    this.markModified('envelopes');
    return this.save();
};

/**
 * Update envelope status
 */
docusignIntegrationSchema.methods.updateEnvelopeStatus = function(envelopeId, status, additionalData = {}) {
    const envelope = this.envelopes.find(e => e.envelopeId === envelopeId);

    if (envelope) {
        envelope.status = status;
        envelope.lastStatusChange = new Date();

        if (additionalData.completedAt) {
            envelope.completedAt = additionalData.completedAt;
        }
        if (additionalData.sentAt) {
            envelope.sentAt = additionalData.sentAt;
        }
        if (additionalData.recipients) {
            envelope.recipients = additionalData.recipients;
        }

        this.markModified('envelopes');
    }

    return this.save();
};

/**
 * Update statistics
 */
docusignIntegrationSchema.methods.updateStats = function(eventType, data = {}) {
    if (!this.stats) this.stats = {};

    switch (eventType) {
        case 'envelope_sent':
            this.stats.totalEnvelopesSent = (this.stats.totalEnvelopesSent || 0) + 1;
            this.stats.lastEnvelopeSentAt = new Date();
            break;

        case 'envelope_completed':
            this.stats.totalEnvelopesCompleted = (this.stats.totalEnvelopesCompleted || 0) + 1;
            this.stats.lastEnvelopeCompletedAt = new Date();
            if (data.documentCount) {
                this.stats.totalDocumentsSigned = (this.stats.totalDocumentsSigned || 0) + data.documentCount;
            }
            break;

        case 'envelope_declined':
            this.stats.totalEnvelopesDeclined = (this.stats.totalEnvelopesDeclined || 0) + 1;
            break;

        case 'envelope_voided':
            this.stats.totalEnvelopesVoided = (this.stats.totalEnvelopesVoided || 0) + 1;
            break;

        case 'recipient_signed':
            this.stats.totalDocumentsSigned = (this.stats.totalDocumentsSigned || 0) + 1;
            break;
    }

    this.markModified('stats');
    return this.save();
};

/**
 * Add or update default template
 */
docusignIntegrationSchema.methods.addTemplate = function(templateData) {
    const existing = this.defaultTemplates.find(t => t.templateId === templateData.templateId);

    if (existing) {
        Object.assign(existing, templateData);
    } else {
        this.defaultTemplates.push({
            templateId: templateData.templateId,
            templateName: templateData.templateName,
            description: templateData.description,
            type: templateData.type || 'other',
            isDefault: templateData.isDefault || false,
            addedAt: new Date()
        });
    }

    this.markModified('defaultTemplates');
    return this.save();
};

/**
 * Remove template
 */
docusignIntegrationSchema.methods.removeTemplate = function(templateId) {
    this.defaultTemplates = this.defaultTemplates.filter(t => t.templateId !== templateId);
    this.markModified('defaultTemplates');
    return this.save();
};

/**
 * Update notification settings
 */
docusignIntegrationSchema.methods.updateNotificationSettings = function(settings) {
    if (!this.notificationSettings) {
        this.notificationSettings = {
            webhooksEnabled: true,
            events: {},
            emailNotifications: true,
            inAppNotifications: true
        };
    }

    Object.keys(settings).forEach(key => {
        if (key === 'events' && settings.events) {
            Object.keys(settings.events).forEach(eventKey => {
                this.notificationSettings.events[eventKey] = settings.events[eventKey];
            });
        } else if (this.notificationSettings[key] !== undefined) {
            this.notificationSettings[key] = settings[key];
        }
    });

    this.markModified('notificationSettings');
    return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find active integration for user
 */
docusignIntegrationSchema.statics.findActiveIntegration = async function(userId, firmId = null) {
    return await this.findOne({
        userId,
        firmId,
        isActive: true
    }).select('+accessToken +refreshToken');
};

/**
 * Find integrations with expired tokens
 */
docusignIntegrationSchema.statics.findExpiredTokens = async function() {
    return await this.find({
        isActive: true,
        tokenExpiresAt: { $lte: new Date() }
    }).select('+refreshToken');
};

/**
 * Find integration by account ID
 */
docusignIntegrationSchema.statics.findByAccountId = async function(accountId) {
    return await this.findOne({
        accountId,
        isActive: true
    });
};

/**
 * Find envelope by ID
 */
docusignIntegrationSchema.statics.findByEnvelopeId = async function(envelopeId) {
    return await this.findOne({
        'envelopes.envelopeId': envelopeId,
        isActive: true
    });
};

/**
 * Get integration stats
 */
docusignIntegrationSchema.statics.getStats = async function(firmId = null) {
    const match = firmId ? { firmId } : {};

    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ['$isActive', 1, 0] } },
                totalEnvelopesSent: { $sum: '$stats.totalEnvelopesSent' },
                totalEnvelopesCompleted: { $sum: '$stats.totalEnvelopesCompleted' },
                totalEnvelopesDeclined: { $sum: '$stats.totalEnvelopesDeclined' },
                totalEnvelopesVoided: { $sum: '$stats.totalEnvelopesVoided' },
                totalDocumentsSigned: { $sum: '$stats.totalDocumentsSigned' }
            }
        }
    ]);

    return stats[0] || {
        total: 0,
        active: 0,
        totalEnvelopesSent: 0,
        totalEnvelopesCompleted: 0,
        totalEnvelopesDeclined: 0,
        totalEnvelopesVoided: 0,
        totalDocumentsSigned: 0
    };
};

module.exports = mongoose.model('DocuSignIntegration', docusignIntegrationSchema);
