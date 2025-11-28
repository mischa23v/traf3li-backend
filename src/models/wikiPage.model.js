const mongoose = require('mongoose');

// Content block schema (for structured content)
const contentBlockSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['paragraph', 'heading', 'list', 'table', 'code', 'quote', 'divider', 'image', 'file', 'embed'],
        required: true
    },
    data: mongoose.Schema.Types.Mixed,
    order: Number
}, { _id: true });

// Access permission schema
const permissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    level: {
        type: String,
        enum: ['view', 'comment', 'edit', 'admin'],
        default: 'view'
    },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grantedAt: { type: Date, default: Date.now }
}, { _id: true });

// Collaborator schema
const collaboratorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: {
        type: String,
        enum: ['author', 'editor', 'reviewer'],
        default: 'editor'
    },
    lastContributedAt: Date
}, { _id: false });

// Attachment schema
const wikiAttachmentSchema = new mongoose.Schema({
    fileName: String,
    fileUrl: String,
    fileKey: String,
    fileType: String,
    fileSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    isSealed: { type: Boolean, default: false }
}, { _id: true });

const wikiPageSchema = new mongoose.Schema({
    // Identification
    pageId: {
        type: String,
        unique: true,
        index: true
    },
    urlSlug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },

    // Content
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
    icon: String,
    coverImage: String,

    // Content storage (ProseMirror/Tiptap JSON)
    content: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    contentText: {
        type: String,
        maxlength: 100000
    },
    contentBlocks: [contentBlockSchema],

    // Summary/excerpt
    summary: {
        type: String,
        maxlength: 500
    },

    // Page type
    pageType: {
        type: String,
        enum: [
            'note',
            'timeline',
            'pleading',
            'evidence_log',
            'witness',
            'research',
            'precedent',
            'interview',
            'strategy',
            'correspondence',
            'meeting_minutes',
            'template',
            'other'
        ],
        default: 'note'
    },

    // Hierarchy
    parentPageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage'
    },
    folderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiFolder'
    },
    order: {
        type: Number,
        default: 0
    },
    depth: {
        type: Number,
        default: 0
    },
    path: {
        type: String,
        index: true
    },

    // Relationships
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

    // Cross-links to other entities
    linkedTasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    linkedEvents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }],
    linkedReminders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reminder'
    }],
    linkedDocuments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    }],
    linkedPages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage'
    }],

    // Version control
    version: {
        type: Number,
        default: 1
    },
    revisionCount: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', 'locked'],
        default: 'published',
        index: true
    },
    isTemplate: {
        type: Boolean,
        default: false
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage'
    },

    // Security
    isConfidential: {
        type: Boolean,
        default: false
    },
    isSealed: {
        type: Boolean,
        default: false
    },
    sealedAt: Date,
    sealedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sealReason: String,

    // Permissions
    visibility: {
        type: String,
        enum: ['private', 'team', 'case_team', 'public'],
        default: 'case_team'
    },
    permissions: [permissionSchema],
    inheritPermissions: {
        type: Boolean,
        default: true
    },

    // Tags & Categories
    tags: [{ type: String, trim: true }],
    categories: [{ type: String, trim: true }],

    // Attachments
    attachments: [wikiAttachmentSchema],

    // Metadata
    wordCount: Number,
    readingTime: Number,
    lastViewedAt: Date,
    viewCount: { type: Number, default: 0 },

    // Audit
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

    // Pinned/Favorite
    isPinned: { type: Boolean, default: false },
    pinnedAt: Date,
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Comments enabled
    allowComments: { type: Boolean, default: true },
    commentCount: { type: Number, default: 0 }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
wikiPageSchema.index({ caseId: 1, status: 1 });
wikiPageSchema.index({ lawyerId: 1, status: 1 });
wikiPageSchema.index({ caseId: 1, pageType: 1 });
wikiPageSchema.index({ parentPageId: 1, order: 1 });
wikiPageSchema.index({ folderId: 1, order: 1 });
wikiPageSchema.index({ urlSlug: 1, caseId: 1 }, { unique: true });
wikiPageSchema.index({ path: 1 });
wikiPageSchema.index({ tags: 1 });
wikiPageSchema.index({ isTemplate: 1, lawyerId: 1 });
wikiPageSchema.index({ title: 'text', contentText: 'text', summary: 'text' });

// Generate page ID and calculate metadata before saving
wikiPageSchema.pre('save', async function(next) {
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

    // Calculate word count and reading time
    if (this.contentText) {
        this.wordCount = this.contentText.split(/\s+/).filter(w => w.length > 0).length;
        this.readingTime = Math.ceil(this.wordCount / 200);
    }

    // Generate URL slug from title if not provided
    if (!this.urlSlug && this.title) {
        this.urlSlug = this.title
            .toLowerCase()
            .replace(/[^\w\s\u0600-\u06FF-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 100);
    }

    // Generate path
    if (!this.path) {
        if (this.parentPageId) {
            const parent = await this.constructor.findById(this.parentPageId);
            this.path = parent ? `${parent.path}/${this.urlSlug}` : `/${this.urlSlug}`;
            this.depth = parent ? parent.depth + 1 : 0;
        } else {
            this.path = `/${this.urlSlug}`;
            this.depth = 0;
        }
    }

    next();
});

// Virtual for full URL
wikiPageSchema.virtual('fullUrl').get(function() {
    return `/cases/${this.caseId}/wiki${this.path}`;
});

// Static: Get pages for a case
wikiPageSchema.statics.getCasePages = async function(caseId, options = {}) {
    const query = {
        caseId: new mongoose.Types.ObjectId(caseId),
        status: { $ne: 'archived' }
    };

    if (options.pageType) query.pageType = options.pageType;
    if (options.folderId) query.folderId = new mongoose.Types.ObjectId(options.folderId);
    if (options.parentPageId === null) query.parentPageId = { $exists: false };
    else if (options.parentPageId) query.parentPageId = new mongoose.Types.ObjectId(options.parentPageId);

    return await this.find(query)
        .sort({ order: 1, createdAt: -1 })
        .populate('createdBy', 'firstName lastName avatar')
        .populate('lastModifiedBy', 'firstName lastName avatar');
};

// Static: Get page tree for a case
wikiPageSchema.statics.getPageTree = async function(caseId) {
    const pages = await this.find({
        caseId: new mongoose.Types.ObjectId(caseId),
        status: { $ne: 'archived' }
    })
    .select('pageId title urlSlug pageType parentPageId folderId order depth path icon isPinned')
    .sort({ order: 1 })
    .lean();

    // Build tree structure
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

// Static: Search pages
wikiPageSchema.statics.searchPages = async function(caseId, searchTerm, options = {}) {
    const query = {
        caseId: new mongoose.Types.ObjectId(caseId),
        status: { $ne: 'archived' },
        $text: { $search: searchTerm }
    };

    if (options.pageType) query.pageType = options.pageType;

    return await this.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(options.limit || 20)
        .populate('createdBy', 'firstName lastName');
};

// Static: Get templates
wikiPageSchema.statics.getTemplates = async function(lawyerId) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        isTemplate: true,
        status: 'published'
    })
    .select('pageId title titleAr pageType summary icon tags')
    .sort({ title: 1 });
};

// Static: Create from template
wikiPageSchema.statics.createFromTemplate = async function(templateId, caseId, userId, overrides = {}) {
    const template = await this.findById(templateId);
    if (!template) throw new Error('Template not found');

    const newPage = new this({
        ...template.toObject(),
        _id: undefined,
        pageId: undefined,
        caseId,
        createdBy: userId,
        lastModifiedBy: userId,
        templateId: template._id,
        isTemplate: false,
        status: 'draft',
        version: 1,
        revisionCount: 0,
        viewCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: undefined,
        updatedAt: undefined,
        ...overrides
    });

    return await newPage.save();
};

// Static: Get recent pages
wikiPageSchema.statics.getRecentPages = async function(lawyerId, limit = 10) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'archived' }
    })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('caseId', 'title caseNumber')
    .select('pageId title pageType caseId updatedAt');
};

// Static: Get pinned pages for a case
wikiPageSchema.statics.getPinnedPages = async function(caseId) {
    return await this.find({
        caseId: new mongoose.Types.ObjectId(caseId),
        isPinned: true,
        status: { $ne: 'archived' }
    })
    .sort({ pinnedAt: -1 })
    .select('pageId title urlSlug pageType icon');
};

// Instance: Seal the page
wikiPageSchema.methods.seal = function(userId, reason) {
    this.isSealed = true;
    this.sealedAt = new Date();
    this.sealedBy = userId;
    this.sealReason = reason;
    this.status = 'locked';
    return this.save();
};

// Instance: Unseal the page
wikiPageSchema.methods.unseal = function(userId) {
    this.isSealed = false;
    this.sealedAt = undefined;
    this.sealedBy = undefined;
    this.sealReason = undefined;
    this.status = 'published';
    this.lastModifiedBy = userId;
    return this.save();
};

// Instance: Archive the page
wikiPageSchema.methods.archive = function(userId) {
    this.status = 'archived';
    this.lastModifiedBy = userId;
    return this.save();
};

// Instance: Increment view count
wikiPageSchema.methods.recordView = function() {
    this.viewCount += 1;
    this.lastViewedAt = new Date();
    return this.save();
};

// Instance: Check if user can edit
wikiPageSchema.methods.canEdit = function(userId) {
    if (this.isSealed) return false;
    if (this.status === 'locked' || this.status === 'archived') return false;

    // Owner can always edit
    if (this.lawyerId.toString() === userId.toString()) return true;
    if (this.createdBy.toString() === userId.toString()) return true;

    // Check permissions
    const permission = this.permissions.find(p =>
        p.userId && p.userId.toString() === userId.toString()
    );
    if (permission && ['edit', 'admin'].includes(permission.level)) return true;

    return false;
};

// Instance: Check if user can view
wikiPageSchema.methods.canView = function(userId) {
    // Owner can always view
    if (this.lawyerId.toString() === userId.toString()) return true;
    if (this.createdBy.toString() === userId.toString()) return true;

    // Check visibility
    if (this.visibility === 'public') return true;

    // Check permissions
    const permission = this.permissions.find(p =>
        p.userId && p.userId.toString() === userId.toString()
    );
    if (permission) return true;

    return false;
};

module.exports = mongoose.model('WikiPage', wikiPageSchema);
