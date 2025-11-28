const mongoose = require('mongoose');

const wikiRevisionSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // REFERENCE
    // ═══════════════════════════════════════════════════════════════
    pageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // VERSION INFO
    // ═══════════════════════════════════════════════════════════════
    version: {
        type: Number,
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTENT SNAPSHOT
    // ═══════════════════════════════════════════════════════════════
    title: {
        type: String,
        required: true
    },
    titleAr: String,
    content: mongoose.Schema.Types.Mixed,
    contentText: String,
    summary: String,
    summaryAr: String,

    // ═══════════════════════════════════════════════════════════════
    // CHANGE TRACKING
    // ═══════════════════════════════════════════════════════════════
    changeType: {
        type: String,
        enum: ['create', 'update', 'restore', 'seal', 'unseal', 'auto_save', 'publish', 'archive'],
        required: true
    },
    changeSummary: {
        type: String,
        maxlength: 500
    },
    changeSummaryAr: {
        type: String,
        maxlength: 500
    },

    // ═══════════════════════════════════════════════════════════════
    // DIFF STATISTICS
    // ═══════════════════════════════════════════════════════════════
    additions: {
        type: Number,
        default: 0
    },
    deletions: {
        type: Number,
        default: 0
    },
    wordCountChange: {
        type: Number,
        default: 0
    },
    wordCount: Number,

    // ═══════════════════════════════════════════════════════════════
    // RESTORATION TRACKING
    // ═══════════════════════════════════════════════════════════════
    isRestoration: {
        type: Boolean,
        default: false
    },
    restoredFromVersion: Number,

    // ═══════════════════════════════════════════════════════════════
    // AUTHOR & AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
wikiRevisionSchema.index({ pageId: 1, version: -1 });
wikiRevisionSchema.index({ pageId: 1, createdAt: -1 });
wikiRevisionSchema.index({ createdBy: 1, createdAt: -1 });
wikiRevisionSchema.index({ caseId: 1, createdAt: -1 });
wikiRevisionSchema.index({ changeType: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Create revision from page
wikiRevisionSchema.statics.createFromPage = async function(page, userId, changeType, changeSummary, metadata = {}) {
    // Get previous revision for diff calculation
    const previousRevision = await this.findOne({ pageId: page._id })
        .sort({ version: -1 })
        .select('contentText wordCount');

    // Calculate diff stats
    let additions = 0;
    let deletions = 0;
    let wordCountChange = 0;

    if (previousRevision && previousRevision.contentText && page.contentText) {
        const prevWords = new Set(previousRevision.contentText.split(/\s+/));
        const currentWords = new Set(page.contentText.split(/\s+/));

        currentWords.forEach(word => {
            if (!prevWords.has(word)) additions++;
        });

        prevWords.forEach(word => {
            if (!currentWords.has(word)) deletions++;
        });

        wordCountChange = (page.wordCount || 0) - (previousRevision.wordCount || 0);
    }

    return await this.create({
        pageId: page._id,
        caseId: page.caseId,
        version: page.version,
        title: page.title,
        titleAr: page.titleAr,
        content: page.content,
        contentText: page.contentText,
        summary: page.summary,
        summaryAr: page.summaryAr,
        changeType,
        changeSummary,
        changeSummaryAr: metadata.changeSummaryAr,
        additions,
        deletions,
        wordCountChange,
        wordCount: page.wordCount,
        isRestoration: metadata.isRestoration || false,
        restoredFromVersion: metadata.restoredFromVersion,
        createdBy: userId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
    });
};

// Get page history
wikiRevisionSchema.statics.getPageHistory = async function(pageId, options = {}) {
    const query = { pageId: new mongoose.Types.ObjectId(pageId) };

    if (options.changeType) query.changeType = options.changeType;

    let cursor = this.find(query)
        .sort({ version: -1 })
        .populate('createdBy', 'firstName lastName avatar');

    if (options.limit) cursor = cursor.limit(options.limit);
    if (options.skip) cursor = cursor.skip(options.skip);

    return await cursor;
};

// Get specific version
wikiRevisionSchema.statics.getVersion = async function(pageId, version) {
    return await this.findOne({
        pageId: new mongoose.Types.ObjectId(pageId),
        version
    }).populate('createdBy', 'firstName lastName avatar');
};

// Compare two versions
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

// Get revision count for a page
wikiRevisionSchema.statics.getRevisionCount = async function(pageId) {
    return await this.countDocuments({ pageId: new mongoose.Types.ObjectId(pageId) });
};

// Get recent activity across all pages for a case
wikiRevisionSchema.statics.getCaseActivity = async function(caseId, limit = 20) {
    return await this.find({ caseId: new mongoose.Types.ObjectId(caseId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'firstName lastName avatar')
        .populate('pageId', 'title urlSlug pageType');
};

// Get user contributions
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

// Get revision statistics for a page
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

// Get activity by change type
wikiRevisionSchema.statics.getActivityByType = async function(caseId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.aggregate([
        {
            $match: {
                caseId: new mongoose.Types.ObjectId(caseId),
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$changeType',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Delete old revisions (keep last N)
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
