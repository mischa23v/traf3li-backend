const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    contractId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false  // Optional for external cases
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: false  // Optional for external cases
    },
    clientName: {
        type: String,
        required: false  // For external clients not on platform
    },
    clientPhone: {
        type: String,
        required: false  // For external clients
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    category: {
        type: String,
        required: true
    },
    
    // ✅ NEW: Labor case specific details
    laborCaseDetails: {
        plaintiff: {
            name: { type: String, required: false },
            nationalId: { type: String, required: false },
            phone: { type: String, required: false },
            address: { type: String, required: false },
            city: { type: String, required: false }
        },
        company: {
            name: { type: String, required: false },
            registrationNumber: { type: String, required: false },
            address: { type: String, required: false },
            city: { type: String, required: false }
        }
    },
    
    // ✅ NEW: Case number and court
    caseNumber: {
        type: String,
        required: false
    },
    court: {
        type: String,
        required: false
    },
    judge: {
        type: String,
        required: false
    },
    nextHearing: {
        type: Date,
        required: false
    },

    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'closed', 'appeal', 'settlement', 'on-hold', 'completed', 'won', 'lost', 'settled'],
        default: 'active'
    },
    outcome: {
        type: String,
        enum: ['won', 'lost', 'settled', 'ongoing'],
        default: 'ongoing'
    },
    claimAmount: {
        type: Number,
        default: 0
    },
    expectedWinAmount: {
        type: Number,
        default: 0
    },
    timeline: [{
        event: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ['court', 'filing', 'deadline', 'general'],
            default: 'general'
        },
        status: {
            type: String,
            enum: ['upcoming', 'completed'],
            default: 'upcoming'
        }
    }],
    claims: [{
        type: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        period: String,
        description: String
    }],
    notes: [{
        text: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: { type: Date, default: Date.now }
    }],
    documents: [{
        filename: String,
        url: String,
        fileKey: String,
        type: String,
        size: Number,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: { type: Date, default: Date.now },
        category: {
            type: String,
            enum: ['contract', 'evidence', 'correspondence', 'pleading', 'judgment', 'other'],
            default: 'other'
        },
        bucket: {
            type: String,
            enum: ['general', 'judgments'],
            default: 'general'
        },
        description: String
    }],

    // Rich text documents (editable with CKEditor, Arabic RTL support)
    richDocuments: [{
        // Basic Info
        title: {
            type: String,
            required: true
        },
        titleAr: String,  // Arabic title

        // Content (HTML from CKEditor)
        content: {
            type: String,
            default: ''
        },
        contentPlainText: String,  // For search indexing

        // Document Type
        documentType: {
            type: String,
            enum: ['legal_memo', 'contract_draft', 'pleading', 'motion', 'brief', 'letter', 'notice', 'agreement', 'report', 'notes', 'other'],
            default: 'other'
        },

        // Status
        status: {
            type: String,
            enum: ['draft', 'review', 'final', 'archived'],
            default: 'draft'
        },

        // Language & Direction
        language: {
            type: String,
            enum: ['ar', 'en', 'mixed'],
            default: 'ar'
        },
        textDirection: {
            type: String,
            enum: ['rtl', 'ltr', 'auto'],
            default: 'rtl'
        },

        // Versioning
        version: {
            type: Number,
            default: 1
        },
        previousVersions: [{
            content: String,
            version: Number,
            editedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            editedAt: Date,
            changeNote: String
        }],

        // Metadata
        wordCount: {
            type: Number,
            default: 0
        },
        characterCount: {
            type: Number,
            default: 0
        },

        // Export tracking
        lastExportedAt: Date,
        lastExportFormat: {
            type: String,
            enum: ['pdf', 'docx', 'latex', 'html', 'markdown']
        },
        exportCount: {
            type: Number,
            default: 0
        },

        // Calendar integration (optional)
        showOnCalendar: {
            type: Boolean,
            default: false
        },
        calendarDate: Date,
        calendarColor: {
            type: String,
            default: '#3b82f6'
        },

        // Audit
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lastEditedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: Date
    }],
    hearings: [{
        date: Date,
        location: String,
        notes: String,
        status: {
            type: String,
            enum: ['scheduled', 'attended', 'missed'],
            default: 'scheduled'
        },
        attended: {
            type: Boolean,
            default: false
        }
    }],
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: false
    },
    source: {
        type: String,
        enum: ['platform', 'external'],
        default: 'external'  // Track where case came from
    }
}, {
    versionKey: false,
    timestamps: true
});

caseSchema.index({ lawyerId: 1, status: 1 });
caseSchema.index({ clientId: 1, status: 1 });
caseSchema.index({ 'richDocuments.showOnCalendar': 1, 'richDocuments.calendarDate': 1 });
caseSchema.index({ 'richDocuments.documentType': 1 });
caseSchema.index({ 'richDocuments.status': 1 });

module.exports = mongoose.model('Case', caseSchema);
