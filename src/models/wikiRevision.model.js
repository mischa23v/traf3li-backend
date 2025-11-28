const mongoose = require('mongoose');

const wikiRevisionSchema = new mongoose.Schema({
    // Reference to the page
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage',
        required: true,
        index: true
    },

    // Version number
    version: {
        type: Number,
        required: true
    },

    // Content snapshot
    title: {
        type: String,
        required: true
    },
    titleAr: String,
    content: mongoose.Schema.Types.Mixed,
    contentText: String,
    summary: String,

    // Change tracking
    changeType: {
        type: String,
        enum: ['create', 'update', 'restore', 'seal', 'unseal', 'move', 'rename'],
        required: true
    },
    changeSummary: {
        type: String,
        maxlength: 500
    },

    // Diff statistics
    additions: {
        type: Number,
        default: 0
    },
    deletions: {
        type: Number,
        default: 0
    },

    // Previous version reference for comparison
    previousVersionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiRevision'
    },

    // Author
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Metadata
    wordCount: Number,

    // Request metadata for audit
    ipAddress: String,
    userAgent: String,

    // Case reference for easier querying
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
wikiRevisionSchema.index({ pageId: 1, version: -1 });
wikiRevisionSchema.index({ pageId: 1, createdAt: -1 });
wikiRevisionSchema.index({ createdBy: 1, createdAt: -1 });
wikiRevisionSchema.index({ caseId: 1, createdAt: -1 });

// Static: Create revision from page
wikiRevisionSchema.statics.createFromPage = async function(page, userId, changeType, changeSummary, metadata = {}) {
    // Get the previous revision to link
    const previousRevision = await this.findOne({ pageId: page._id })
        .sort({ version: -1 })
        .select('_id');

    // Calculate diff stats (simple word-based diff)
    let additions = 0;
    let deletions = 0;

    if (previousRevision) {
        const prev = await this.findById(previousRevision._id);
        if (prev && prev.contentText && page.contentText) {
            const prevWords = new Set(prev.contentText.split(/\s+/));
            const currentWords = new Set(page.contentText.split(/\s+/));

            // Count additions (words in current but not in previous)
            currentWords.forEach(word => {
                if (!prevWords.has(word)) additions++;
            });

            // Count deletions (words in previous but not in current)
            prevWords.forEach(word => {
                if (!currentWords.has(word)) deletions++;
            });
        }
    }

    return await this.create({
        pageId: page._id,
        version: page.version,
        title: page.title,
        titleAr: page.titleAr,
        content: page.content,
        contentText: page.contentText,
        summary: page.summary,
        changeType,
        changeSummary,
        additions,
        deletions,
        previousVersionId: previousRevision?._id,
        createdBy: userId,
        wordCount: page.wordCount,
        caseId: page.caseId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
    });
};

// Static: Get page history
wikiRevisionSchema.statics.getPageHistory = async function(pageId, options = {}) {
    const query = { pageId: new mongoose.Types.ObjectId(pageId) };

    let cursor = this.find(query)
        .sort({ version: -1 })
        .populate('createdBy', 'firstName lastName avatar');

    if (options.limit) cursor = cursor.limit(options.limit);
    if (options.skip) cursor = cursor.skip(options.skip);

    return await cursor;
};

// Static: Get specific version
wikiRevisionSchema.statics.getVersion = async function(pageId, version) {
    return await this.findOne({
        pageId: new mongoose.Types.ObjectId(pageId),
        version
    }).populate('createdBy', 'firstName lastName avatar');
};

// Static: Compare two versions
wikiRevisionSchema.statics.compareVersions = async function(pageId, version1, version2) {
    const [rev1, rev2] = await Promise.all([
        this.findOne({ pageId, version: version1 }),
        this.findOne({ pageId, version: version2 })
    ]);

    if (!rev1 || !rev2) {
        throw new Error('One or both versions not found');
    }

    return {
        before: rev1,
        after: rev2,
        versionDiff: version2 - version1
    };
};

// Static: Get revision count for a page
wikiRevisionSchema.statics.getRevisionCount = async function(pageId) {
    return await this.countDocuments({ pageId: new mongoose.Types.ObjectId(pageId) });
};

// Static: Get recent activity across all pages for a case
wikiRevisionSchema.statics.getCaseActivity = async function(caseId, limit = 20) {
    return await this.find({ caseId: new mongoose.Types.ObjectId(caseId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'firstName lastName avatar')
        .populate('pageId', 'title urlSlug pageType');
};

// Static: Get user contributions
wikiRevisionSchema.statics.getUserContributions = async function(userId, options = {}) {
    const query = { createdBy: new mongoose.Types.ObjectId(userId) };

    if (options.caseId) {
        query.caseId = new mongoose.Types.ObjectId(options.caseId);
    }

    return await this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .populate('pageId', 'title urlSlug caseId');
};

// Static: Get revision statistics for a page
wikiRevisionSchema.statics.getPageStats = async function(pageId) {
    const stats = await this.aggregate([
        { $match: { pageId: new mongoose.Types.ObjectId(pageId) } },
        {
            $group: {
                _id: null,
                totalRevisions: { $sum: 1 },
                totalAdditions: { $sum: '$additions' },
                totalDeletions: { $sum: '$deletions' },
                uniqueContributors: { $addToSet: '$createdBy' },
                firstRevision: { $min: '$createdAt' },
                lastRevision: { $max: '$createdAt' }
            }
        },
        {
            $project: {
                _id: 0,
                totalRevisions: 1,
                totalAdditions: 1,
                totalDeletions: 1,
                contributorCount: { $size: '$uniqueContributors' },
                firstRevision: 1,
                lastRevision: 1
            }
        }
    ]);

    return stats[0] || {
        totalRevisions: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        contributorCount: 0,
        firstRevision: null,
        lastRevision: null
    };
};

// Static: Delete old revisions (keep last N)
wikiRevisionSchema.statics.pruneOldRevisions = async function(pageId, keepCount = 100) {
    const revisions = await this.find({ pageId })
        .sort({ version: -1 })
        .skip(keepCount)
        .select('_id');

    if (revisions.length > 0) {
        const idsToDelete = revisions.map(r => r._id);
        await this.deleteMany({ _id: { $in: idsToDelete } });
    }

    return revisions.length;
};

module.exports = mongoose.model('WikiRevision', wikiRevisionSchema);
