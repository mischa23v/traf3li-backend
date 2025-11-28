const mongoose = require('mongoose');

const wikiBacklinkSchema = new mongoose.Schema({
    // Source page (the page containing the link)
    sourcePageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage',
        required: true,
        index: true
    },

    // Target page (the page being linked to)
    targetPageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WikiPage',
        required: true,
        index: true
    },

    // Context information
    anchorText: {
        type: String,
        maxlength: 200
    },
    context: {
        type: String,
        maxlength: 500
    },

    // Link type
    linkType: {
        type: String,
        enum: ['reference', 'related', 'parent', 'child', 'citation', 'see_also'],
        default: 'reference'
    },

    // Position in document (for inline linking)
    position: {
        blockIndex: Number,
        charOffset: Number
    },

    // Case association for faster queries
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════
    isValid: {
        type: Boolean,
        default: true,
        index: true
    },
    lastValidatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    versionKey: false
});

// Compound index for unique links
wikiBacklinkSchema.index({ sourcePageId: 1, targetPageId: 1 }, { unique: true });
wikiBacklinkSchema.index({ targetPageId: 1, createdAt: -1 });

// Static: Get all backlinks pointing to a page
wikiBacklinkSchema.statics.getBacklinks = async function(pageId, options = {}) {
    const query = { targetPageId: new mongoose.Types.ObjectId(pageId) };

    let cursor = this.find(query)
        .populate({
            path: 'sourcePageId',
            select: 'title urlSlug pageType caseId status icon',
            match: { status: { $ne: 'archived' } }
        })
        .sort({ createdAt: -1 });

    if (options.limit) cursor = cursor.limit(options.limit);

    const results = await cursor;

    // Filter out any null results (from archived pages)
    return results.filter(r => r.sourcePageId !== null);
};

// Static: Get all outgoing links from a page
wikiBacklinkSchema.statics.getOutgoingLinks = async function(pageId) {
    return await this.find({ sourcePageId: new mongoose.Types.ObjectId(pageId) })
        .populate({
            path: 'targetPageId',
            select: 'title urlSlug pageType status icon',
            match: { status: { $ne: 'archived' } }
        })
        .sort({ createdAt: -1 });
};

// Static: Sync links from page content
wikiBacklinkSchema.statics.syncLinksFromPage = async function(page, extractedLinks) {
    // Remove old links from this source
    await this.deleteMany({ sourcePageId: page._id });

    if (!extractedLinks || extractedLinks.length === 0) {
        return { created: 0, removed: 0 };
    }

    // Create new links
    const backlinks = extractedLinks.map(link => ({
        sourcePageId: page._id,
        targetPageId: link.targetId,
        anchorText: link.text?.substring(0, 200),
        context: link.context?.substring(0, 500),
        linkType: link.type || 'reference',
        position: link.position,
        caseId: page.caseId
    }));

    try {
        await this.insertMany(backlinks, { ordered: false });
        return { created: backlinks.length, removed: 0 };
    } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
            const inserted = error.result?.nInserted || 0;
            return { created: inserted, removed: 0, errors: error.writeErrors?.length || 0 };
        }
        throw error;
    }
};

// Static: Get link graph for visualization
wikiBacklinkSchema.statics.getLinkGraph = async function(caseId) {
    const links = await this.find({ caseId: new mongoose.Types.ObjectId(caseId) })
        .populate('sourcePageId', 'title urlSlug pageType')
        .populate('targetPageId', 'title urlSlug pageType')
        .lean();

    // Build nodes and edges for graph visualization
    const nodesMap = new Map();
    const edges = [];

    links.forEach(link => {
        if (link.sourcePageId && link.targetPageId) {
            // Add source node
            if (!nodesMap.has(link.sourcePageId._id.toString())) {
                nodesMap.set(link.sourcePageId._id.toString(), {
                    id: link.sourcePageId._id.toString(),
                    title: link.sourcePageId.title,
                    urlSlug: link.sourcePageId.urlSlug,
                    pageType: link.sourcePageId.pageType
                });
            }

            // Add target node
            if (!nodesMap.has(link.targetPageId._id.toString())) {
                nodesMap.set(link.targetPageId._id.toString(), {
                    id: link.targetPageId._id.toString(),
                    title: link.targetPageId.title,
                    urlSlug: link.targetPageId.urlSlug,
                    pageType: link.targetPageId.pageType
                });
            }

            // Add edge
            edges.push({
                source: link.sourcePageId._id.toString(),
                target: link.targetPageId._id.toString(),
                type: link.linkType
            });
        }
    });

    return {
        nodes: Array.from(nodesMap.values()),
        edges
    };
};

// Static: Find orphan pages (pages with no incoming links)
wikiBacklinkSchema.statics.findOrphanPages = async function(caseId) {
    const WikiPage = mongoose.model('WikiPage');

    // Get all page IDs in the case
    const allPages = await WikiPage.find({
        caseId: new mongoose.Types.ObjectId(caseId),
        status: { $ne: 'archived' }
    }).select('_id title urlSlug pageType');

    // Get all pages that are targets of links
    const linkedPageIds = await this.distinct('targetPageId', {
        caseId: new mongoose.Types.ObjectId(caseId)
    });

    const linkedSet = new Set(linkedPageIds.map(id => id.toString()));

    // Filter orphan pages
    return allPages.filter(page => !linkedSet.has(page._id.toString()));
};

// Static: Get most linked pages
wikiBacklinkSchema.statics.getMostLinkedPages = async function(caseId, limit = 10) {
    const results = await this.aggregate([
        { $match: { caseId: new mongoose.Types.ObjectId(caseId) } },
        { $group: { _id: '$targetPageId', linkCount: { $sum: 1 } } },
        { $sort: { linkCount: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'wikipages',
                localField: '_id',
                foreignField: '_id',
                as: 'page'
            }
        },
        { $unwind: '$page' },
        {
            $project: {
                _id: 1,
                linkCount: 1,
                title: '$page.title',
                urlSlug: '$page.urlSlug',
                pageType: '$page.pageType'
            }
        }
    ]);

    return results;
};

// Static: Delete all links for a page (when page is deleted)
wikiBacklinkSchema.statics.deletePageLinks = async function(pageId) {
    const pageObjectId = new mongoose.Types.ObjectId(pageId);

    const result = await this.deleteMany({
        $or: [
            { sourcePageId: pageObjectId },
            { targetPageId: pageObjectId }
        ]
    });

    return result.deletedCount;
};

// Static: Validate all links for a case (check if targets exist)
wikiBacklinkSchema.statics.validateLinks = async function(caseId) {
    const WikiPage = mongoose.model('WikiPage');

    const links = await this.find({
        caseId: new mongoose.Types.ObjectId(caseId)
    });

    let validCount = 0;
    let invalidCount = 0;

    for (const link of links) {
        const targetExists = await WikiPage.exists({
            _id: link.targetPageId,
            status: { $ne: 'archived' }
        });

        const isValid = !!targetExists;
        if (isValid !== link.isValid) {
            link.isValid = isValid;
            link.lastValidatedAt = new Date();
            await link.save();
        }

        if (isValid) validCount++;
        else invalidCount++;
    }

    return { total: links.length, valid: validCount, invalid: invalidCount };
};

// Static: Get broken links for a case
wikiBacklinkSchema.statics.getBrokenLinks = async function(caseId) {
    return await this.find({
        caseId: new mongoose.Types.ObjectId(caseId),
        isValid: false
    })
    .populate('sourcePageId', 'title urlSlug')
    .sort({ lastValidatedAt: -1 });
};

module.exports = mongoose.model('WikiBacklink', wikiBacklinkSchema);
