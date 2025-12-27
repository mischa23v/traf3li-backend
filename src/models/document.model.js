const mongoose = require('mongoose');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Document Version Schema
const documentVersionSchema = new mongoose.Schema({
    version: {
        type: Number,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    fileKey: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    changeNote: {
        type: String
    }
}, {
    timestamps: true
});

const documentSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fileName: {
        type: String,
        required: true,
        trim: true
    },
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    fileType: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    fileKey: {
        type: String,
        required: true
    },
    // Storage bucket (for R2/S3) - tracks which bucket the file is stored in
    bucket: {
        type: String,
        default: null
    },
    // Module type (crm, finance, hr, documents, etc.) - for routing to correct bucket
    module: {
        type: String,
        enum: ['crm', 'finance', 'hr', 'documents', 'tasks', 'judgments', 'general'],
        default: 'documents'
    },
    category: {
        type: String,
        enum: ['contract', 'judgment', 'evidence', 'correspondence', 'pleading', 'other'],
        required: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    description: {
        type: String,
        maxlength: 1000
    },
    tags: [{
        type: String
    }],
    isConfidential: {
        type: Boolean,
        default: false
    },
    isEncrypted: {
        type: Boolean,
        default: false
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    version: {
        type: Number,
        default: 1
    },
    parentDocumentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    },
    versions: [documentVersionSchema],
    shareToken: {
        type: String
    },
    shareExpiresAt: {
        type: Date
    },
    accessCount: {
        type: Number,
        default: 0
    },
    lastAccessedAt: {
        type: Date
    },
    metadata: {
        width: Number,
        height: Number,
        duration: Number,
        pageCount: Number
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
documentSchema.index({ lawyerId: 1, category: 1 });
documentSchema.index({ lawyerId: 1, caseId: 1 });
documentSchema.index({ lawyerId: 1, clientId: 1 });
documentSchema.index({ shareToken: 1 });
documentSchema.index({ fileName: 'text', originalName: 'text', description: 'text' });

// Static method: Generate share token
documentSchema.statics.generateShareToken = function() {
    return require('crypto').randomBytes(32).toString('hex');
};

// Static method: Get documents by case
documentSchema.statics.getDocumentsByCase = async function(lawyerId, caseId) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        caseId: new mongoose.Types.ObjectId(caseId)
    })
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'firstName lastName');
};

// Static method: Get documents by client
documentSchema.statics.getDocumentsByClient = async function(lawyerId, clientId) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        clientId: new mongoose.Types.ObjectId(clientId)
    })
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'firstName lastName');
};

// Static method: Search documents
documentSchema.statics.searchDocuments = async function(lawyerId, searchTerm, filters = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId)
    };

    if (searchTerm) {
        query.$or = [
            { fileName: { $regex: escapeRegex(searchTerm), $options: 'i' } },
            { originalName: { $regex: escapeRegex(searchTerm), $options: 'i' } },
            { description: { $regex: escapeRegex(searchTerm), $options: 'i' } }
        ];
    }

    if (filters.category) query.category = filters.category;
    if (filters.caseId) query.caseId = new mongoose.Types.ObjectId(filters.caseId);
    if (filters.clientId) query.clientId = new mongoose.Types.ObjectId(filters.clientId);

    return await this.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .populate('uploadedBy', 'firstName lastName');
};

module.exports = mongoose.model('Document', documentSchema);
