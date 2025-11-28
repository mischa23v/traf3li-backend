const mongoose = require('mongoose');

// Permission schema
const permissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    level: {
        type: String,
        enum: ['view', 'comment', 'edit', 'admin'],
        default: 'view'
    },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grantedAt: { type: Date, default: Date.now }
}, { _id: false });

// Collaborator schema
const collaboratorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: {
        type: String,
        enum: ['author', 'editor', 'reviewer', 'viewer'],
        default: 'editor'
    },
    lastEditedAt: Date,
    editCount: { type: Number, default: 0 }
}, { _id: false });

// Attachment version schema (embedded in attachment)
const attachmentVersionSchema = new mongoose.Schema({
    versionNumber: { type: Number, required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileKey: { type: String, required: true },
    fileType: String,
    fileSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    changeNote: String,
    isRestored: { type: Boolean, default: false },
    restoredFrom: Number
}, { _id: false });

// Voice memo schema
const voiceMemoSchema = new mongoose.Schema({
    memoId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    title: {
        type: String,
        maxlength: 200
    },
    titleAr: {
        type: String,
        maxlength: 200
    },
    fileUrl: { type: String, required: true },
    fileKey: { type: String, required: true },
    fileSize: Number, // in bytes
    duration: Number, // in seconds
    format: {
        type: String,
        enum: ['mp3', 'webm', 'ogg', 'wav'],
        default: 'mp3'
    },
    transcription: String, // Optional transcription text
    transcriptionAr: String,
    isTranscribed: { type: Boolean, default: false },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedAt: { type: Date, default: Date.now },
    // Metadata
    description: String,
    descriptionAr: String,
    isConfidential: { type: Boolean, default: false },
    isSealed: { type: Boolean, default: false },
    // Timestamps for when the memo was added/modified
    createdAt: { type: Date, default: Date.now },
    lastModifiedAt: Date,
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

// Attachment schema
const wikiAttachmentSchema = new mongoose.Schema({
    attachmentId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    fileName: { type: String, required: true },
    fileNameAr: String,
    fileUrl: { type: String, required: true },
    fileKey: String,
    fileType: String,
    fileSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    isSealed: { type: Boolean, default: false },
    isConfidential: { type: Boolean, default: false },
    documentCategory: {
        type: String,
        enum: ['pleading', 'evidence', 'exhibit', 'contract', 'correspondence', 'research', 'judgment', 'other'],
        default: 'other'
    },
    // Version tracking
    currentVersion: { type: Number, default: 1 },
    versionCount: { type: Number, default: 1 },
    versionHistory: [attachmentVersionSchema],
    // Metadata
    description: String,
    descriptionAr: String,
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: Date
}, { _id: false });

const wikiPageSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // 1. CORE IDENTIFICATION (5 fields)
    // ═══════════════════════════════════════════════════════════════
    pageId: {
        type: String,
        unique: true,
        index: true
    },
    urlSlug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 200
    },
    fullPath: {
        type: String,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // 2. CONTENT (9 fields)
    // ═══════════════════════════════════════════════════════════════
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    titleAr: {
        type: String,
        trim: true,
        maxlength: 300
    },
    icon: {
        type: String,
        default: '📄'
    },
    coverImage: String,
    content: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    contentText: {
        type: String,
        maxlength: 500000
    },
    contentHtml: {
        type: String
    },
    summary: {
        type: String,
        maxlength: 1000
    },
    summaryAr: {
        type: String,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // 3. PAGE TYPE & CLASSIFICATION (3 fields)
    // ═══════════════════════════════════════════════════════════════
    pageType: {
        type: String,
        enum: [
            // General
            'note',
            'general',
            // Legal Documents
            'pleading',
            'motion',
            'brief',
            'petition',
            // Case Management
            'timeline',
            'evidence_log',
            'witness_notes',
            'interview_notes',
            'deposition',
            // Research
            'legal_research',
            'precedent',
            'case_analysis',
            'strategy',
            // Communication
            'correspondence',
            'client_memo',
            'internal_memo',
            'meeting_notes',
            // Court
            'court_documents',
            'hearing_notes',
            'judgment_analysis',
            // Templates
            'template'
        ],
        default: 'note',
        index: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    categories: [{
        type: String,
        trim: true
    }],

    // ═══════════════════════════════════════════════════════════════
    // 4. HIERARCHY & ORGANIZATION (4 fields)
    // ═══════════════════════════════════════════════════════════════
    collectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiCollection',
        index: true
    },
    parentPageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage'
    },
    order: {
        type: Number,
        default: 0
    },
    depth: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },

    // ═══════════════════════════════════════════════════════════════
    // 5. RELATIONSHIPS (3 fields)
    // ═══════════════════════════════════════════════════════════════
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true,
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // 6. ENTITY LINKING (7 arrays)
    // ═══════════════════════════════════════════════════════════════
    linkedTaskIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    linkedEventIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }],
    linkedReminderIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reminder'
    }],
    linkedDocumentIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    }],
    linkedWikiPageIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage'
    }],
    linkedJudgmentIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Judgment'
    }],
    linkedLawIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Law'
    }],

    // ═══════════════════════════════════════════════════════════════
    // 7. VERSION CONTROL (3 fields)
    // ═══════════════════════════════════════════════════════════════
    version: {
        type: Number,
        default: 1
    },
    revisionCount: {
        type: Number,
        default: 0
    },
    lastAutoSavedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // 8. STATUS & WORKFLOW (7 fields)
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['draft', 'in_review', 'approved', 'published', 'archived', 'locked'],
        default: 'draft',
        index: true
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    publishedAt: Date,
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ═══════════════════════════════════════════════════════════════
    // 9. SECURITY & SEALING (8 fields)
    // ═══════════════════════════════════════════════════════════════
    isConfidential: {
        type: Boolean,
        default: false
    },
    confidentialityLevel: {
        type: String,
        enum: ['public', 'internal', 'confidential', 'highly_confidential'],
        default: 'internal'
    },
    isSealed: {
        type: Boolean,
        default: false
    },
    sealedAt: Date,
    sealedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sealReason: String,
    sealedVersion: Number,
    isClientVisible: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // 10. PERMISSIONS (3 fields)
    // ═══════════════════════════════════════════════════════════════
    visibility: {
        type: String,
        enum: ['private', 'case_team', 'firm_wide', 'client'],
        default: 'case_team'
    },
    permissions: [permissionSchema],
    inheritPermissions: {
        type: Boolean,
        default: true
    },

    // ═══════════════════════════════════════════════════════════════
    // 11. LOCKING (4 fields) - Prevent simultaneous edits
    // ═══════════════════════════════════════════════════════════════
    isLocked: {
        type: Boolean,
        default: false
    },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: Date,
    lockExpiresAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // 12. TEMPLATES (5 fields)
    // ═══════════════════════════════════════════════════════════════
    isTemplate: {
        type: Boolean,
        default: false
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage'
    },
    templateName: String,
    templateCategory: {
        type: String,
        enum: ['pleading', 'motion', 'memo', 'research', 'correspondence', 'general']
    },
    isPublicTemplate: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // 13. ATTACHMENTS (2 fields)
    // ═══════════════════════════════════════════════════════════════
    attachments: [wikiAttachmentSchema],
    attachmentCount: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // 13.5 VOICE MEMOS (2 fields)
    // ═══════════════════════════════════════════════════════════════
    voiceMemos: [voiceMemoSchema],
    voiceMemoCount: {
        type: Number,
        default: 0
    },
    totalVoiceMemoDuration: {
        type: Number,
        default: 0 // Total duration in seconds
    },

    // ═══════════════════════════════════════════════════════════════
    // 14. COLLABORATORS & AUDIT (3 fields)
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    collaborators: [collaboratorSchema],

    // ═══════════════════════════════════════════════════════════════
    // 15. METADATA & ANALYTICS (7 fields)
    // ═══════════════════════════════════════════════════════════════
    wordCount: {
        type: Number,
        default: 0
    },
    characterCount: {
        type: Number,
        default: 0
    },
    readingTimeMinutes: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    lastViewedAt: Date,
    lastViewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ═══════════════════════════════════════════════════════════════
    // 16. PINNING (3 fields)
    // ═══════════════════════════════════════════════════════════════
    isPinned: {
        type: Boolean,
        default: false
    },
    pinnedAt: Date,
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ═══════════════════════════════════════════════════════════════
    // 17. COMMENTS (2 fields)
    // ═══════════════════════════════════════════════════════════════
    allowComments: {
        type: Boolean,
        default: true
    },
    commentCount: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // 18. SEARCH & AI (2 fields)
    // ═══════════════════════════════════════════════════════════════
    searchKeywords: [{
        type: String,
        trim: true
    }],
    embedding: [{
        type: Number
    }],

    // ═══════════════════════════════════════════════════════════════
    // 19. CALENDAR INTEGRATION (4 fields)
    // ═══════════════════════════════════════════════════════════════
    showOnCalendar: {
        type: Boolean,
        default: false
    },
    calendarDate: Date,
    calendarEndDate: Date,
    calendarColor: {
        type: String,
        default: '#8b5cf6' // purple for wiki
    },

    // ═══════════════════════════════════════════════════════════════
    // 20. DOCUMENT EXPORT (4 fields)
    // ═══════════════════════════════════════════════════════════════
    lastExportedAt: Date,
    lastExportFormat: {
        type: String,
        enum: ['pdf', 'docx', 'latex', 'html', 'markdown']
    },
    exportCount: {
        type: Number,
        default: 0
    },
    cachedPdfUrl: String
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
wikiPageSchema.index({ caseId: 1, status: 1 });
wikiPageSchema.index({ lawyerId: 1, status: 1 });
wikiPageSchema.index({ caseId: 1, pageType: 1 });
wikiPageSchema.index({ collectionId: 1, order: 1 });
wikiPageSchema.index({ parentPageId: 1, order: 1 });
wikiPageSchema.index({ urlSlug: 1, caseId: 1 }, { unique: true });
wikiPageSchema.index({ fullPath: 1, caseId: 1 });
wikiPageSchema.index({ tags: 1 });
wikiPageSchema.index({ isTemplate: 1, lawyerId: 1 });
wikiPageSchema.index({ isSealed: 1 });
wikiPageSchema.index({ isLocked: 1, lockExpiresAt: 1 });
wikiPageSchema.index({ confidentialityLevel: 1 });
wikiPageSchema.index({ searchKeywords: 1 });
wikiPageSchema.index({ title: 'text', contentText: 'text', summary: 'text', searchKeywords: 'text' });
wikiPageSchema.index({ showOnCalendar: 1, calendarDate: 1 });
wikiPageSchema.index({ lawyerId: 1, showOnCalendar: 1, calendarDate: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
wikiPageSchema.pre('save', async function(next) {
    // Generate page ID
    if (!this.pageId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.pageId = `WIKI-${year}${month}-${String(count + 1).padStart(5, '0')}`;
    }

    // Calculate content metrics
    if (this.contentText) {
        const words = this.contentText.split(/\s+/).filter(w => w.length > 0);
        this.wordCount = words.length;
        this.characterCount = this.contentText.length;
        this.readingTimeMinutes = Math.ceil(this.wordCount / 200);
    }

    // Generate URL slug from title if not provided
    if (!this.urlSlug && this.title) {
        this.urlSlug = this.title
            .toLowerCase()
            .replace(/[^\w\s\u0600-\u06FF-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 200);
    }

    // Generate full path
    if (this.isModified('parentPageId') || this.isModified('urlSlug') || !this.fullPath) {
        if (this.parentPageId) {
            const parent = await this.constructor.findById(this.parentPageId);
            this.fullPath = parent ? `${parent.fullPath}/${this.urlSlug}` : `/${this.urlSlug}`;
            this.depth = parent ? Math.min(parent.depth + 1, 10) : 0;
        } else {
            this.fullPath = `/${this.urlSlug}`;
            this.depth = 0;
        }
    }

    // Update attachment count
    this.attachmentCount = this.attachments?.length || 0;

    // Update voice memo count and total duration
    this.voiceMemoCount = this.voiceMemos?.length || 0;
    this.totalVoiceMemoDuration = this.voiceMemos?.reduce((total, memo) => total + (memo.duration || 0), 0) || 0;

    // Auto-expire locks
    if (this.isLocked && this.lockExpiresAt && new Date() > this.lockExpiresAt) {
        this.isLocked = false;
        this.lockedBy = undefined;
        this.lockedAt = undefined;
        this.lockExpiresAt = undefined;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════
wikiPageSchema.virtual('fullUrl').get(function() {
    return `/cases/${this.caseId}/wiki${this.fullPath}`;
});

wikiPageSchema.virtual('isEditable').get(function() {
    return !this.isSealed && !this.isLocked && this.status !== 'locked' && this.status !== 'archived';
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get pages for a case
wikiPageSchema.statics.getCasePages = async function(caseId, options = {}) {
    const query = {
        caseId: new mongoose.Types.ObjectId(caseId),
        status: { $nin: ['archived'] }
    };

    if (options.pageType) query.pageType = options.pageType;
    if (options.collectionId) query.collectionId = new mongoose.Types.ObjectId(options.collectionId);
    if (options.status) query.status = options.status;
    if (options.parentPageId === null) query.parentPageId = { $exists: false };
    else if (options.parentPageId) query.parentPageId = new mongoose.Types.ObjectId(options.parentPageId);

    return await this.find(query)
        .sort({ order: 1, createdAt: -1 })
        .populate('createdBy', 'firstName lastName avatar')
        .populate('lastModifiedBy', 'firstName lastName avatar')
        .populate('collectionId', 'name nameAr icon color');
};

// Get page tree for a case
wikiPageSchema.statics.getPageTree = async function(caseId) {
    const pages = await this.find({
        caseId: new mongoose.Types.ObjectId(caseId),
        status: { $nin: ['archived'] }
    })
    .select('pageId title titleAr urlSlug pageType parentPageId collectionId order depth fullPath icon isPinned status isSealed isLocked')
    .sort({ order: 1 })
    .lean();

    const buildTree = (parentId = null) => {
        return pages
            .filter(p => {
                if (parentId === null) return !p.parentPageId;
                return p.parentPageId && p.parentPageId.toString() === parentId.toString();
            })
            .map(page => ({
                ...page,
                children: buildTree(page._id)
            }));
    };

    return buildTree();
};

// Search pages
wikiPageSchema.statics.searchPages = async function(caseId, searchTerm, options = {}) {
    const query = {
        caseId: new mongoose.Types.ObjectId(caseId),
        status: { $nin: ['archived'] },
        $text: { $search: searchTerm }
    };

    if (options.pageType) query.pageType = options.pageType;
    if (options.collectionId) query.collectionId = new mongoose.Types.ObjectId(options.collectionId);

    return await this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(options.limit || 20)
        .populate('createdBy', 'firstName lastName');
};

// Get templates
wikiPageSchema.statics.getTemplates = async function(lawyerId, options = {}) {
    const query = {
        isTemplate: true,
        status: 'published',
        $or: [
            { lawyerId: new mongoose.Types.ObjectId(lawyerId) },
            { isPublicTemplate: true }
        ]
    };

    if (options.templateCategory) query.templateCategory = options.templateCategory;

    return await this.find(query)
        .select('pageId title titleAr templateName templateCategory pageType summary icon tags isPublicTemplate')
        .sort({ templateName: 1, title: 1 });
};

// Create from template
wikiPageSchema.statics.createFromTemplate = async function(templateId, caseId, userId, overrides = {}) {
    const template = await this.findById(templateId);
    if (!template) throw new Error('Template not found');

    const newPage = new this({
        title: overrides.title || template.title,
        titleAr: overrides.titleAr || template.titleAr,
        content: template.content,
        contentText: template.contentText,
        contentHtml: template.contentHtml,
        summary: template.summary,
        summaryAr: template.summaryAr,
        pageType: template.pageType,
        icon: template.icon,
        tags: template.tags,
        caseId,
        lawyerId: userId,
        createdBy: userId,
        lastModifiedBy: userId,
        templateId: template._id,
        isTemplate: false,
        status: 'draft',
        version: 1,
        revisionCount: 0,
        viewCount: 0,
        commentCount: 0,
        ...overrides
    });

    return await newPage.save();
};

// Get recent pages
wikiPageSchema.statics.getRecentPages = async function(lawyerId, limit = 10) {
    if (!lawyerId || !mongoose.Types.ObjectId.isValid(lawyerId)) {
        return [];
    }

    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $nin: ['archived'] },
        isTemplate: false
    })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('caseId', 'title caseNumber')
    .select('pageId title pageType caseId updatedAt status');
};

// Get pinned pages
wikiPageSchema.statics.getPinnedPages = async function(caseId) {
    return await this.find({
        caseId: new mongoose.Types.ObjectId(caseId),
        isPinned: true,
        status: { $nin: ['archived'] }
    })
    .sort({ pinnedAt: -1 })
    .select('pageId title urlSlug pageType icon status');
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Seal the page
wikiPageSchema.methods.seal = function(userId, reason) {
    if (this.isSealed) throw new Error('Page is already sealed');

    this.isSealed = true;
    this.sealedAt = new Date();
    this.sealedBy = userId;
    this.sealReason = reason;
    this.sealedVersion = this.version;
    this.status = 'locked';
    return this.save();
};

// Unseal the page
wikiPageSchema.methods.unseal = function(userId) {
    if (!this.isSealed) throw new Error('Page is not sealed');

    this.isSealed = false;
    this.sealedAt = undefined;
    this.sealedBy = undefined;
    this.sealReason = undefined;
    this.sealedVersion = undefined;
    this.status = 'published';
    this.lastModifiedBy = userId;
    return this.save();
};

// Lock for editing
wikiPageSchema.methods.lock = function(userId, durationMinutes = 30) {
    if (this.isSealed) throw new Error('Cannot lock a sealed page');
    if (this.isLocked && this.lockedBy.toString() !== userId.toString()) {
        throw new Error('Page is locked by another user');
    }

    this.isLocked = true;
    this.lockedBy = userId;
    this.lockedAt = new Date();
    this.lockExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    return this.save();
};

// Unlock
wikiPageSchema.methods.unlock = function(userId) {
    if (!this.isLocked) return this;
    if (this.lockedBy && this.lockedBy.toString() !== userId.toString()) {
        throw new Error('Cannot unlock: page is locked by another user');
    }

    this.isLocked = false;
    this.lockedBy = undefined;
    this.lockedAt = undefined;
    this.lockExpiresAt = undefined;
    return this.save();
};

// Submit for review
wikiPageSchema.methods.submitForReview = function(userId) {
    if (this.status !== 'draft') throw new Error('Only draft pages can be submitted for review');

    this.status = 'in_review';
    this.lastModifiedBy = userId;
    return this.save();
};

// Approve
wikiPageSchema.methods.approve = function(userId) {
    if (this.status !== 'in_review') throw new Error('Only pages in review can be approved');

    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    return this.save();
};

// Publish
wikiPageSchema.methods.publish = function(userId) {
    if (!['draft', 'approved'].includes(this.status)) {
        throw new Error('Page must be draft or approved to publish');
    }

    this.status = 'published';
    this.publishedBy = userId;
    this.publishedAt = new Date();
    return this.save();
};

// Archive
wikiPageSchema.methods.archive = function(userId) {
    if (this.isSealed) throw new Error('Cannot archive a sealed page');

    this.status = 'archived';
    this.lastModifiedBy = userId;
    return this.save();
};

// Record view
wikiPageSchema.methods.recordView = function(userId) {
    this.viewCount += 1;
    this.lastViewedAt = new Date();
    this.lastViewedBy = userId;
    return this.save();
};

// Check permissions
wikiPageSchema.methods.canEdit = function(userId) {
    if (this.isSealed) return false;
    if (this.isLocked && this.lockedBy?.toString() !== userId.toString()) return false;
    if (this.status === 'locked' || this.status === 'archived') return false;
    if (this.lawyerId.toString() === userId.toString()) return true;
    if (this.createdBy.toString() === userId.toString()) return true;

    const permission = this.permissions.find(p => p.userId?.toString() === userId.toString());
    return permission && ['edit', 'admin'].includes(permission.level);
};

wikiPageSchema.methods.canView = function(userId) {
    if (this.lawyerId.toString() === userId.toString()) return true;
    if (this.createdBy.toString() === userId.toString()) return true;
    if (this.visibility === 'firm_wide' || this.visibility === 'client') return true;

    const permission = this.permissions.find(p => p.userId?.toString() === userId.toString());
    return !!permission;
};

module.exports = mongoose.model('WikiPage', wikiPageSchema);
