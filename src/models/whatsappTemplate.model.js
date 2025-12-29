const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// WHATSAPP TEMPLATE MODEL - PRE-APPROVED MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════

const whatsappTemplateSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: false,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Internal name for reference
    name: {
        type: String,
        required: false,
        trim: true
    },

    // WhatsApp Business API template ID (from Meta/MSG91)
    templateId: {
        type: String,
        trim: true,
        index: true
    },

    // Namespace (for Meta Cloud API)
    namespace: String,

    // ═══════════════════════════════════════════════════════════════
    // TEMPLATE DETAILS
    // ═══════════════════════════════════════════════════════════════
    language: {
        type: String,
        default: 'ar', // Arabic
        enum: ['ar', 'en', 'ar_SA', 'en_US']
    },

    category: {
        type: String,
        required: false,
        enum: [
            'marketing',      // Promotional messages
            'utility',        // Transactional/utility messages (appointments, updates)
            'authentication'  // OTP and verification
        ],
        default: 'utility'
    },

    // ═══════════════════════════════════════════════════════════════
    // TEMPLATE CONTENT
    // ═══════════════════════════════════════════════════════════════
    header: {
        type: {
            type: String,
            enum: ['none', 'text', 'image', 'video', 'document'],
            default: 'none'
        },
        content: String, // Text content or variable placeholder
        mediaUrl: String, // URL for media (image, video, document)
        example: String // Example for variable
    },

    body: {
        text: {
            type: String,
            required: false,
            maxlength: 1024
        },
        // Variables in format {{1}}, {{2}}, etc.
        variables: [{
            position: { type: Number, required: false }, // 1, 2, 3, etc.
            name: String, // Friendly name: "client_name", "appointment_date"
            example: String, // Example value for approval
            description: String // What this variable represents
        }]
    },

    footer: {
        type: String,
        maxlength: 60
    },

    // ═══════════════════════════════════════════════════════════════
    // BUTTONS
    // ═══════════════════════════════════════════════════════════════
    buttons: [{
        type: {
            type: String,
            enum: ['quick_reply', 'url', 'phone'],
            required: false
        },
        text: {
            type: String,
            required: false,
            maxlength: 25
        },
        // For URL buttons
        url: String,
        urlType: {
            type: String,
            enum: ['static', 'dynamic'] // Dynamic includes variable at end
        },
        // For phone buttons
        phoneNumber: String,
        // Button index (0, 1, 2)
        index: Number
    }],

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected'],
        default: 'draft',
        index: true
    },

    submittedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,

    // ═══════════════════════════════════════════════════════════════
    // USAGE & ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    usage: {
        totalSent: { type: Number, default: 0 },
        totalDelivered: { type: Number, default: 0 },
        totalRead: { type: Number, default: 0 },
        totalFailed: { type: Number, default: 0 },
        lastUsedAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // USE CASES
    // ═══════════════════════════════════════════════════════════════
    useCase: {
        type: String,
        enum: [
            'appointment_reminder',
            'appointment_confirmation',
            'document_ready',
            'payment_reminder',
            'case_update',
            'welcome_message',
            'follow_up',
            'consultation_request',
            'meeting_invitation',
            'general_notification',
            'other'
        ]
    },

    // Tags for organization
    tags: [{ type: String, trim: true }],

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    isActive: { type: Boolean, default: true },
    isPredefined: { type: Boolean, default: false }, // System templates

    // Provider-specific data
    provider: {
        type: String,
        enum: ['meta', 'msg91', 'twilio'],
        default: 'meta'
    },
    providerData: mongoose.Schema.Types.Mixed,

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
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
whatsappTemplateSchema.index({ firmId: 1, name: 1 });
whatsappTemplateSchema.index({ firmId: 1, status: 1 });
whatsappTemplateSchema.index({ firmId: 1, category: 1 });
whatsappTemplateSchema.index({ firmId: 1, useCase: 1 });
whatsappTemplateSchema.index({ templateId: 1 });
whatsappTemplateSchema.index({ name: 'text' });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
whatsappTemplateSchema.virtual('deliveryRate').get(function() {
    if (this.usage.totalSent === 0) return 0;
    return ((this.usage.totalDelivered / this.usage.totalSent) * 100).toFixed(2);
});

whatsappTemplateSchema.virtual('readRate').get(function() {
    if (this.usage.totalDelivered === 0) return 0;
    return ((this.usage.totalRead / this.usage.totalDelivered) * 100).toFixed(2);
});

whatsappTemplateSchema.set('toJSON', { virtuals: true });
whatsappTemplateSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get approved templates
whatsappTemplateSchema.statics.getApprovedTemplates = async function(firmId, category = null) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        status: 'approved',
        isActive: true
    };

    if (category) {
        query.category = category;
    }

    return await this.find(query).sort({ name: 1 });
};

// Get template by use case
whatsappTemplateSchema.statics.getByUseCase = async function(firmId, useCase) {
    return await this.findOne({
        firmId: new mongoose.Types.ObjectId(firmId),
        useCase,
        status: 'approved',
        isActive: true
    });
};

// Get template analytics
whatsappTemplateSchema.statics.getAnalytics = async function(firmId, dateRange = {}) {
    const matchQuery = { firmId: new mongoose.Types.ObjectId(firmId) };

    const analytics = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalSent: { $sum: '$usage.totalSent' },
                totalDelivered: { $sum: '$usage.totalDelivered' },
                totalRead: { $sum: '$usage.totalRead' }
            }
        }
    ]);

    const byCategory = await this.aggregate([
        { $match: { ...matchQuery, status: 'approved' } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalSent: { $sum: '$usage.totalSent' }
            }
        }
    ]);

    return {
        byStatus: analytics,
        byCategory,
        total: await this.countDocuments(matchQuery)
    };
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Compile template with variables
whatsappTemplateSchema.methods.compile = function(variables = {}) {
    let compiledBody = this.body.text;

    // Replace variables {{1}}, {{2}}, etc.
    this.body.variables.forEach((variable, index) => {
        const placeholder = `{{${variable.position}}}`;
        const value = variables[variable.name] || variables[index] || variable.example || '';
        compiledBody = compiledBody.replace(new RegExp(placeholder, 'g'), value);
    });

    return {
        header: this.header.content,
        body: compiledBody,
        footer: this.footer,
        buttons: this.buttons
    };
};

// Increment usage stats
whatsappTemplateSchema.methods.incrementUsage = async function(status) {
    this.usage.totalSent += 1;
    if (status === 'delivered') this.usage.totalDelivered += 1;
    if (status === 'read') this.usage.totalRead += 1;
    if (status === 'failed') this.usage.totalFailed += 1;
    this.usage.lastUsedAt = new Date();
    await this.save();
};

module.exports = mongoose.model('WhatsAppTemplate', whatsappTemplateSchema);
