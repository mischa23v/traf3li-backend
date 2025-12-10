const mongoose = require('mongoose');

// Icon schema
const iconSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['emoji', 'image', 'lucide'],
        required: true
    },
    value: {
        type: String,
        required: true
    }
}, { _id: false });

// Cover schema
const coverSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['color', 'gradient', 'image'],
        required: true
    },
    value: {
        type: String,
        required: true
    },
    position: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    }
}, { _id: false });

// Properties schema
const propertiesSchema = new mongoose.Schema({
    fullWidth: {
        type: Boolean,
        default: false
    },
    smallText: {
        type: Boolean,
        default: false
    },
    locked: {
        type: Boolean,
        default: false
    },
    archived: {
        type: Boolean,
        default: false
    }
}, { _id: false });

// Permissions schema
const permissionsSchema = new mongoose.Schema({
    visibility: {
        type: String,
        enum: ['private', 'team', 'firm'],
        default: 'team'
    },
    editors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    viewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { _id: false });

// Backlink schema
const backlinkSchema = new mongoose.Schema({
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage',
        required: true
    },
    blockId: {
        type: mongoose.Schema.Types.ObjectId
    }
}, { _id: false });

// Forward link schema
const forwardLinkSchema = new mongoose.Schema({
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage',
        required: true
    },
    anchor: {
        type: String
    }
}, { _id: false });

// Metadata schema
const metadataSchema = new mongoose.Schema({
    wordCount: {
        type: Number,
        default: 0
    },
    blockCount: {
        type: Number,
        default: 0
    },
    lastViewed: {
        type: Map,
        of: Date
    },
    viewCount: {
        type: Number,
        default: 0
    }
}, { _id: false });

// CaseNotion Page Schema
const caseNotionPageSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    icon: iconSchema,
    cover: coverSchema,
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage',
        default: null,
        index: true
    },
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage'
    }],
    path: {
        type: String,
        index: true
    },
    slug: {
        type: String,
        index: true
    },
    order: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastEditedAt: {
        type: Date,
        default: Date.now
    },
    properties: {
        type: propertiesSchema,
        default: () => ({})
    },
    permissions: {
        type: permissionsSchema,
        default: () => ({})
    },
    backlinks: [backlinkSchema],
    forwardLinks: [forwardLinkSchema],
    isFavorite: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isTemplate: {
        type: Boolean,
        default: false,
        index: true
    },
    templateCategory: {
        type: String,
        enum: [
            'case-brief',
            'research-notes',
            'meeting-notes',
            'deposition-prep',
            'witness-interview',
            'legal-memo',
            'discovery-plan',
            'trial-strategy',
            'settlement-negotiation',
            'chronology',
            'evidence-log',
            'fact-summary',
            'custom'
        ]
    },
    duplicatedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CaseNotionPage'
    },
    version: {
        type: Number,
        default: 1
    },
    metadata: {
        type: metadataSchema,
        default: () => ({})
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    }
}, {
    timestamps: true,
    versionKey: false
});

// Compound indexes for performance
caseNotionPageSchema.index({ caseId: 1, order: 1 });
caseNotionPageSchema.index({ firmId: 1, caseId: 1 });
caseNotionPageSchema.index({ slug: 1, caseId: 1 }, { unique: true, sparse: true });
caseNotionPageSchema.index({ isTemplate: 1, templateCategory: 1 });

// Text index for search
caseNotionPageSchema.index({ title: 'text' });

// Virtual: isRoot - Check if page is a root page
caseNotionPageSchema.virtual('isRoot').get(function() {
    return this.parentId === null || this.parentId === undefined;
});

// Virtual: hasChildren - Check if page has children
caseNotionPageSchema.virtual('hasChildren').get(function() {
    return this.children && this.children.length > 0;
});

// Virtual: breadcrumb - Get breadcrumb navigation
caseNotionPageSchema.virtual('breadcrumb').get(function() {
    if (!this.path) return [];

    const pathSegments = this.path.split('/').filter(Boolean);
    return pathSegments.map((segment, index) => ({
        title: segment,
        path: '/' + pathSegments.slice(0, index + 1).join('/')
    }));
});

// Generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Pre-save hook: Generate slug and update path
caseNotionPageSchema.pre('save', async function(next) {
    try {
        // Generate slug from title if not exists or title changed
        if (this.isModified('title') || !this.slug) {
            let baseSlug = generateSlug(this.title);
            let slug = baseSlug;
            let counter = 1;

            // Ensure slug is unique within the case
            while (true) {
                const existing = await this.constructor.findOne({
                    _id: { $ne: this._id },
                    caseId: this.caseId,
                    slug: slug
                });

                if (!existing) break;
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            this.slug = slug;
        }

        // Update path based on parent chain
        if (this.isModified('parentId') || this.isModified('title') || !this.path) {
            await this.updatePath();
        }

        // Update lastEditedAt
        if (this.isModified() && !this.isNew) {
            this.lastEditedAt = new Date();
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save hook: Update parent's children array
caseNotionPageSchema.pre('save', async function(next) {
    try {
        if (this.isModified('parentId')) {
            // Remove from old parent's children
            if (this._original && this._original.parentId) {
                await this.constructor.findByIdAndUpdate(
                    this._original.parentId,
                    { $pull: { children: this._id } }
                );
            }

            // Add to new parent's children
            if (this.parentId) {
                await this.constructor.findByIdAndUpdate(
                    this.parentId,
                    { $addToSet: { children: this._id } }
                );
            }
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Post-init hook: Store original values for comparison
caseNotionPageSchema.post('init', function() {
    this._original = {
        parentId: this.parentId,
        title: this.title
    };
});

// Instance method: Update path based on parent chain
caseNotionPageSchema.methods.updatePath = async function() {
    if (!this.parentId) {
        this.path = `/${this.slug}`;
        return this.path;
    }

    const parent = await this.constructor.findById(this.parentId);
    if (!parent) {
        this.path = `/${this.slug}`;
        return this.path;
    }

    this.path = `${parent.path}/${this.slug}`;
    return this.path;
};

// Instance method: Add child page
caseNotionPageSchema.methods.addChildPage = async function(pageData) {
    const childPage = new this.constructor({
        ...pageData,
        parentId: this._id,
        caseId: this.caseId,
        firmId: this.firmId
    });

    await childPage.save();

    // Add to children array
    this.children.push(childPage._id);
    await this.save();

    return childPage;
};

// Instance method: Move page to new parent
caseNotionPageSchema.methods.moveTo = async function(newParentId) {
    const oldParentId = this.parentId;

    // Update parentId
    this.parentId = newParentId;
    await this.save();

    // Update paths for this page and all descendants
    await this.updateDescendantPaths();

    return this;
};

// Instance method: Update paths for all descendants
caseNotionPageSchema.methods.updateDescendantPaths = async function() {
    const descendants = await this.getDescendants();

    for (const descendant of descendants) {
        await descendant.updatePath();
        await descendant.save();
    }
};

// Instance method: Duplicate page
caseNotionPageSchema.methods.duplicate = async function(userId) {
    const duplicateData = {
        caseId: this.caseId,
        firmId: this.firmId,
        title: `${this.title} (Copy)`,
        icon: this.icon,
        cover: this.cover,
        parentId: this.parentId,
        properties: this.properties,
        permissions: this.permissions,
        isTemplate: false,
        duplicatedFrom: this._id,
        createdBy: userId,
        lastEditedBy: userId
    };

    const duplicate = new this.constructor(duplicateData);
    await duplicate.save();

    // Duplicate children recursively
    for (const childId of this.children) {
        const child = await this.constructor.findById(childId);
        if (child) {
            const duplicateChild = await child.duplicate(userId);
            duplicateChild.parentId = duplicate._id;
            await duplicateChild.save();
        }
    }

    return duplicate;
};

// Instance method: Archive page
caseNotionPageSchema.methods.archive = async function() {
    this.properties.archived = true;
    this.status = 'archived';
    await this.save();

    // Archive all descendants
    const descendants = await this.getDescendants();
    for (const descendant of descendants) {
        descendant.properties.archived = true;
        descendant.status = 'archived';
        await descendant.save();
    }

    return this;
};

// Instance method: Restore archived page
caseNotionPageSchema.methods.restore = async function() {
    this.properties.archived = false;
    this.status = 'draft';
    await this.save();

    // Restore all descendants
    const descendants = await this.getDescendants();
    for (const descendant of descendants) {
        descendant.properties.archived = false;
        descendant.status = 'draft';
        await descendant.save();
    }

    return this;
};

// Instance method: Get all ancestor pages
caseNotionPageSchema.methods.getAncestors = async function() {
    const ancestors = [];
    let currentPage = this;

    while (currentPage.parentId) {
        const parent = await this.constructor.findById(currentPage.parentId);
        if (!parent) break;

        ancestors.unshift(parent);
        currentPage = parent;
    }

    return ancestors;
};

// Instance method: Get all descendant pages recursively
caseNotionPageSchema.methods.getDescendants = async function() {
    const descendants = [];

    const getChildren = async (pageId) => {
        const children = await this.constructor.find({ parentId: pageId });

        for (const child of children) {
            descendants.push(child);
            await getChildren(child._id);
        }
    };

    await getChildren(this._id);
    return descendants;
};

// Instance method: Add backlink
caseNotionPageSchema.methods.addBacklink = async function(pageId, blockId = null) {
    const backlinkExists = this.backlinks.some(
        bl => bl.pageId.toString() === pageId.toString() &&
        (!blockId || bl.blockId?.toString() === blockId.toString())
    );

    if (!backlinkExists) {
        this.backlinks.push({ pageId, blockId });
        await this.save();
    }

    return this;
};

// Instance method: Remove backlink
caseNotionPageSchema.methods.removeBacklink = async function(pageId, blockId = null) {
    this.backlinks = this.backlinks.filter(
        bl => !(bl.pageId.toString() === pageId.toString() &&
        (!blockId || bl.blockId?.toString() === blockId.toString()))
    );

    await this.save();
    return this;
};

// Instance method: Update word count
caseNotionPageSchema.methods.updateWordCount = async function() {
    // This would require integration with CaseNotionBlock model
    // For now, we'll assume blocks are stored separately
    const CaseNotionBlock = mongoose.model('CaseNotionBlock');

    if (CaseNotionBlock) {
        const blocks = await CaseNotionBlock.find({ pageId: this._id });

        let wordCount = 0;
        let blockCount = blocks.length;

        for (const block of blocks) {
            if (block.content && block.content.text) {
                const words = block.content.text.trim().split(/\s+/);
                wordCount += words.filter(w => w.length > 0).length;
            }
        }

        this.metadata.wordCount = wordCount;
        this.metadata.blockCount = blockCount;
        await this.save();
    }

    return this;
};

// Instance method: Record page view
caseNotionPageSchema.methods.recordView = async function(userId) {
    if (!this.metadata.lastViewed) {
        this.metadata.lastViewed = new Map();
    }

    this.metadata.lastViewed.set(userId.toString(), new Date());
    this.metadata.viewCount = (this.metadata.viewCount || 0) + 1;

    await this.save();
    return this;
};

// Static method: Get all pages for a case (with hierarchy)
caseNotionPageSchema.statics.getCasePages = async function(caseId, options = {}) {
    const {
        includeArchived = false,
        populate = false,
        sortBy = 'order',
        sortOrder = 1
    } = options;

    const query = {
        caseId: new mongoose.Types.ObjectId(caseId)
    };

    if (!includeArchived) {
        query['properties.archived'] = { $ne: true };
    }

    let queryBuilder = this.find(query).sort({ [sortBy]: sortOrder });

    if (populate) {
        queryBuilder = queryBuilder
            .populate('createdBy', 'firstName lastName email')
            .populate('lastEditedBy', 'firstName lastName email')
            .populate('parentId', 'title slug path');
    }

    const pages = await queryBuilder;
    return pages;
};

// Static method: Get root pages only
caseNotionPageSchema.statics.getRootPages = async function(caseId, options = {}) {
    const { includeArchived = false } = options;

    const query = {
        caseId: new mongoose.Types.ObjectId(caseId),
        $or: [
            { parentId: null },
            { parentId: { $exists: false } }
        ]
    };

    if (!includeArchived) {
        query['properties.archived'] = { $ne: true };
    }

    return await this.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastEditedBy', 'firstName lastName email')
        .sort({ order: 1 });
};

// Static method: Get page with all blocks
caseNotionPageSchema.statics.getPageWithBlocks = async function(pageId) {
    const page = await this.findById(pageId)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastEditedBy', 'firstName lastName email')
        .populate('parentId', 'title slug path');

    if (!page) return null;

    // Try to get blocks if CaseNotionBlock model exists
    try {
        const CaseNotionBlock = mongoose.model('CaseNotionBlock');
        const blocks = await CaseNotionBlock.find({ pageId })
            .sort({ order: 1 });

        return {
            ...page.toObject(),
            blocks
        };
    } catch (error) {
        // CaseNotionBlock model doesn't exist yet
        return page;
    }
};

// Static method: Search pages by title or content
caseNotionPageSchema.statics.searchPages = async function(caseId, query, options = {}) {
    const { limit = 20, includeArchived = false } = options;

    const searchQuery = {
        caseId: new mongoose.Types.ObjectId(caseId),
        $text: { $search: query }
    };

    if (!includeArchived) {
        searchQuery['properties.archived'] = { $ne: true };
    }

    return await this.find(searchQuery, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .populate('createdBy', 'firstName lastName email')
        .populate('parentId', 'title slug');
};

// Static method: Get available templates
caseNotionPageSchema.statics.getTemplates = async function(firmId, category = null) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        isTemplate: true
    };

    if (category) {
        query.templateCategory = category;
    }

    return await this.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort({ title: 1 });
};

// Static method: Get recently viewed pages
caseNotionPageSchema.statics.getRecentPages = async function(userId, limit = 10) {
    const pages = await this.find({
        [`metadata.lastViewed.${userId}`]: { $exists: true }
    })
    .populate('caseId', 'title caseNumber')
    .populate('parentId', 'title slug')
    .limit(limit * 2); // Get more to sort properly

    // Sort by last viewed date
    const sorted = pages
        .map(page => ({
            ...page.toObject(),
            lastViewedAt: page.metadata.lastViewed.get(userId.toString())
        }))
        .sort((a, b) => new Date(b.lastViewedAt) - new Date(a.lastViewedAt))
        .slice(0, limit);

    return sorted;
};

// Static method: Get user's favorite pages
caseNotionPageSchema.statics.getFavorites = async function(userId) {
    return await this.find({
        isFavorite: new mongoose.Types.ObjectId(userId),
        'properties.archived': { $ne: true }
    })
    .populate('caseId', 'title caseNumber')
    .populate('parentId', 'title slug')
    .sort({ title: 1 });
};

// Static method: Create page from template
caseNotionPageSchema.statics.createFromTemplate = async function(templateId, caseId, userId) {
    const template = await this.findById(templateId);
    if (!template || !template.isTemplate) {
        throw new Error('Template not found');
    }

    const pageData = {
        caseId,
        firmId: template.firmId,
        title: template.title,
        icon: template.icon,
        cover: template.cover,
        properties: template.properties,
        permissions: template.permissions,
        duplicatedFrom: templateId,
        createdBy: userId,
        lastEditedBy: userId
    };

    const page = new this(pageData);
    await page.save();

    // Copy template blocks if they exist
    try {
        const CaseNotionBlock = mongoose.model('CaseNotionBlock');
        const templateBlocks = await CaseNotionBlock.find({ pageId: templateId });

        for (const block of templateBlocks) {
            const newBlock = new CaseNotionBlock({
                ...block.toObject(),
                _id: new mongoose.Types.ObjectId(),
                pageId: page._id,
                createdBy: userId,
                lastEditedBy: userId
            });
            await newBlock.save();
        }
    } catch (error) {
        // CaseNotionBlock model doesn't exist yet
    }

    return page;
};

// Static method: Get page hierarchy tree
caseNotionPageSchema.statics.getPageTree = async function(caseId, options = {}) {
    const { includeArchived = false } = options;

    const pages = await this.getCasePages(caseId, { includeArchived });

    // Build tree structure
    const pageMap = new Map();
    const rootPages = [];

    // First pass: create map
    pages.forEach(page => {
        pageMap.set(page._id.toString(), {
            ...page.toObject(),
            children: []
        });
    });

    // Second pass: build tree
    pages.forEach(page => {
        const pageObj = pageMap.get(page._id.toString());

        if (!page.parentId) {
            rootPages.push(pageObj);
        } else {
            const parent = pageMap.get(page.parentId.toString());
            if (parent) {
                parent.children.push(pageObj);
            }
        }
    });

    return rootPages;
};

// Static method: Get page statistics
caseNotionPageSchema.statics.getPageStats = async function(caseId) {
    const stats = await this.aggregate([
        { $match: { caseId: new mongoose.Types.ObjectId(caseId) } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                published: {
                    $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
                },
                draft: {
                    $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
                },
                archived: {
                    $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
                },
                templates: {
                    $sum: { $cond: ['$isTemplate', 1, 0] }
                },
                totalWords: { $sum: '$metadata.wordCount' },
                totalViews: { $sum: '$metadata.viewCount' }
            }
        }
    ]);

    return stats[0] || {
        total: 0,
        published: 0,
        draft: 0,
        archived: 0,
        templates: 0,
        totalWords: 0,
        totalViews: 0
    };
};

module.exports = mongoose.model('CaseNotionPage', caseNotionPageSchema);
