const WikiPage = require('../models/wikiPage.model');
const WikiRevision = require('../models/wikiRevision.model');
const WikiBacklink = require('../models/wikiBacklink.model');
const WikiCollection = require('../models/wikiCollection.model');
const WikiComment = require('../models/wikiComment.model');
const Case = require('../models/case.model');
const { getUploadPresignedUrl, getDownloadPresignedUrl, deleteFile, generateFileKey, BUCKETS } = require('../configs/s3');
const crypto = require('crypto');

// Helper to extract links from content
const extractLinksFromContent = (content, contentText) => {
    const links = [];

    // Extract wiki-style links [[Page Title]] or [[pageId|Display Text]]
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;

    while ((match = wikiLinkRegex.exec(contentText || '')) !== null) {
        links.push({
            targetId: match[1].trim(),
            text: match[2] || match[1],
            type: 'reference'
        });
    }

    return links;
};

// ============================================
// PAGE OPERATIONS
// ============================================

// List pages for a case
exports.listPages = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { pageType, collectionId, parentPageId, search, status } = req.query;
        const userId = req.userID;

        // Verify case access
        const caseDoc = await Case.findOne({
            _id: caseId,
            lawyerId: userId
        });

        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        let pages;

        if (search) {
            pages = await WikiPage.searchPages(caseId, search, { pageType });
        } else {
            const options = {};
            if (pageType) options.pageType = pageType;
            if (collectionId) options.collectionId = collectionId;
            if (parentPageId === 'null') options.parentPageId = null;
            else if (parentPageId) options.parentPageId = parentPageId;

            pages = await WikiPage.getCasePages(caseId, options);
        }

        res.json({
            success: true,
            data: pages
        });
    } catch (error) {
        console.error('Error listing wiki pages:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing wiki pages',
            error: error.message
        });
    }
};

// Get page tree for a case
exports.getPageTree = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.userID;

        // Verify case access
        const caseDoc = await Case.findOne({
            _id: caseId,
            lawyerId: userId
        });

        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const [pageTree, collectionTree] = await Promise.all([
            WikiPage.getPageTree(caseId),
            WikiCollection.getCollectionTree(caseId)
        ]);

        res.json({
            success: true,
            data: {
                pages: pageTree,
                collections: collectionTree
            }
        });
    } catch (error) {
        console.error('Error getting page tree:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting page tree',
            error: error.message
        });
    }
};

// Create a new page
exports.createPage = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.userID;
        const {
            title,
            titleAr,
            content,
            contentText,
            summary,
            pageType,
            parentPageId,
            collectionId,
            linkedTasks,
            linkedEvents,
            linkedReminders,
            linkedDocuments,
            tags,
            isTemplate,
            visibility,
            isConfidential
        } = req.body;

        // Verify case access
        const caseDoc = await Case.findOne({
            _id: caseId,
            lawyerId: userId
        });

        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        // Create page
        const page = new WikiPage({
            title,
            titleAr,
            content,
            contentText,
            summary,
            pageType: pageType || 'note',
            parentPageId,
            collectionId,
            caseId,
            lawyerId: userId,
            clientId: caseDoc.clientId,
            linkedTasks,
            linkedEvents,
            linkedReminders,
            linkedDocuments,
            tags,
            isTemplate: isTemplate || false,
            visibility: visibility || 'case_team',
            isConfidential: isConfidential || false,
            createdBy: userId,
            lastModifiedBy: userId,
            collaborators: [{ userId, role: 'author', lastContributedAt: new Date() }]
        });

        await page.save();

        // Create initial revision
        await WikiRevision.createFromPage(page, userId, 'create', 'Initial version');

        // Update collection page count if in a collection
        if (collectionId) {
            await WikiCollection.updatePageCount(collectionId);
        }

        // Extract and sync backlinks
        const links = extractLinksFromContent(content, contentText);
        if (links.length > 0) {
            // Resolve link targets (by title or ID)
            const resolvedLinks = [];
            for (const link of links) {
                const targetPage = await WikiPage.findOne({
                    caseId,
                    $or: [
                        { _id: link.targetId },
                        { title: link.targetId },
                        { urlSlug: link.targetId.toLowerCase() }
                    ]
                });
                if (targetPage) {
                    resolvedLinks.push({
                        ...link,
                        targetId: targetPage._id
                    });
                }
            }
            await WikiBacklink.syncLinksFromPage(page, resolvedLinks);
        }

        // Populate for response
        await page.populate('createdBy', 'firstName lastName avatar');

        res.status(201).json({
            success: true,
            message: 'Page created successfully',
            data: page
        });
    } catch (error) {
        console.error('Error creating wiki page:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating wiki page',
            error: error.message
        });
    }
};

// Get a single page
exports.getPage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [
                { _id: pageId },
                { pageId: pageId }
            ]
        })
        .populate('createdBy', 'firstName lastName avatar')
        .populate('lastModifiedBy', 'firstName lastName avatar')
        .populate('collaborators.userId', 'firstName lastName avatar')
        .populate('parentPageId', 'title urlSlug')
        .populate('collectionId', 'name nameAr icon color collectionType')
        .populate('caseId', 'title caseNumber')
        .populate('linkedTasks', 'title status priority')
        .populate('linkedEvents', 'title startDateTime status')
        .populate('linkedReminders', 'title reminderDateTime status');

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check access
        if (!page.canView(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Record view
        await page.recordView();

        // Get backlinks
        const backlinks = await WikiBacklink.getBacklinks(page._id, { limit: 20 });

        // Get revision stats
        const revisionStats = await WikiRevision.getPageStats(page._id);

        res.json({
            success: true,
            data: {
                page,
                backlinks,
                revisionStats
            }
        });
    } catch (error) {
        console.error('Error getting wiki page:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting wiki page',
            error: error.message
        });
    }
};

// Update a page
exports.updatePage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.userID;
        const {
            title,
            titleAr,
            content,
            contentText,
            summary,
            pageType,
            parentPageId,
            collectionId,
            linkedTasks,
            linkedEvents,
            linkedReminders,
            linkedDocuments,
            linkedPages,
            tags,
            visibility,
            isConfidential,
            changeSummary
        } = req.body;

        const page = await WikiPage.findOne({
            $or: [
                { _id: pageId },
                { pageId: pageId }
            ]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check edit permission
        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: page.isSealed ? 'This page is sealed and cannot be edited' : 'You do not have permission to edit this page'
            });
        }

        const oldCollectionId = page.collectionId;

        // Update fields
        if (title !== undefined) page.title = title;
        if (titleAr !== undefined) page.titleAr = titleAr;
        if (content !== undefined) page.content = content;
        if (contentText !== undefined) page.contentText = contentText;
        if (summary !== undefined) page.summary = summary;
        if (pageType !== undefined) page.pageType = pageType;
        if (parentPageId !== undefined) page.parentPageId = parentPageId || undefined;
        if (collectionId !== undefined) page.collectionId = collectionId || undefined;
        if (linkedTasks !== undefined) page.linkedTasks = linkedTasks;
        if (linkedEvents !== undefined) page.linkedEvents = linkedEvents;
        if (linkedReminders !== undefined) page.linkedReminders = linkedReminders;
        if (linkedDocuments !== undefined) page.linkedDocuments = linkedDocuments;
        if (linkedPages !== undefined) page.linkedPages = linkedPages;
        if (tags !== undefined) page.tags = tags;
        if (visibility !== undefined) page.visibility = visibility;
        if (isConfidential !== undefined) page.isConfidential = isConfidential;

        page.version += 1;
        page.revisionCount += 1;
        page.lastModifiedBy = userId;

        // Update collaborators
        const existingCollaborator = page.collaborators.find(
            c => c.userId.toString() === userId.toString()
        );
        if (existingCollaborator) {
            existingCollaborator.lastContributedAt = new Date();
        } else {
            page.collaborators.push({
                userId,
                role: 'editor',
                lastContributedAt: new Date()
            });
        }

        await page.save();

        // Create revision
        await WikiRevision.createFromPage(
            page,
            userId,
            'update',
            changeSummary || 'Updated page content',
            { ipAddress: req.ip, userAgent: req.get('user-agent') }
        );

        // Update collection page counts if collection changed
        if (oldCollectionId && oldCollectionId.toString() !== (collectionId || '').toString()) {
            await WikiCollection.updatePageCount(oldCollectionId);
        }
        if (collectionId) {
            await WikiCollection.updatePageCount(collectionId);
        }

        // Sync backlinks
        const links = extractLinksFromContent(content, contentText);
        const resolvedLinks = [];
        for (const link of links) {
            const targetPage = await WikiPage.findOne({
                caseId: page.caseId,
                $or: [
                    { _id: link.targetId },
                    { title: link.targetId },
                    { urlSlug: link.targetId.toLowerCase() }
                ]
            });
            if (targetPage) {
                resolvedLinks.push({
                    ...link,
                    targetId: targetPage._id
                });
            }
        }
        await WikiBacklink.syncLinksFromPage(page, resolvedLinks);

        // Populate for response
        await page.populate('lastModifiedBy', 'firstName lastName avatar');

        res.json({
            success: true,
            message: 'Page updated successfully',
            data: page
        });
    } catch (error) {
        console.error('Error updating wiki page:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating wiki page',
            error: error.message
        });
    }
};

// Delete a page
exports.deletePage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { permanent } = req.query;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [
                { _id: pageId },
                { pageId: pageId }
            ]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check permission
        if (page.lawyerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the owner can delete this page'
            });
        }

        if (page.isSealed) {
            return res.status(403).json({
                success: false,
                message: 'Sealed pages cannot be deleted'
            });
        }

        const collectionId = page.collectionId;

        if (permanent === 'true') {
            // Permanent delete
            await WikiBacklink.deletePageLinks(page._id);
            await WikiRevision.deleteMany({ pageId: page._id });
            await WikiComment.deleteMany({ pageId: page._id });
            await page.deleteOne();
        } else {
            // Soft delete (archive)
            await page.archive(userId);
        }

        // Update collection count
        if (collectionId) {
            await WikiCollection.updatePageCount(collectionId);
        }

        res.json({
            success: true,
            message: permanent === 'true' ? 'Page permanently deleted' : 'Page archived'
        });
    } catch (error) {
        console.error('Error deleting wiki page:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting wiki page',
            error: error.message
        });
    }
};

// ============================================
// VERSION CONTROL
// ============================================

// Get page history
exports.getHistory = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        const history = await WikiRevision.getPageHistory(page._id, {
            limit: parseInt(limit),
            skip: parseInt(skip)
        });

        const stats = await WikiRevision.getPageStats(page._id);

        res.json({
            success: true,
            data: {
                history,
                stats
            }
        });
    } catch (error) {
        console.error('Error getting page history:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting page history',
            error: error.message
        });
    }
};

// Get specific revision
exports.getRevision = async (req, res) => {
    try {
        const { pageId, version } = req.params;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        const revision = await WikiRevision.getVersion(page._id, parseInt(version));

        if (!revision) {
            return res.status(404).json({
                success: false,
                message: 'Revision not found'
            });
        }

        res.json({
            success: true,
            data: revision
        });
    } catch (error) {
        console.error('Error getting revision:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting revision',
            error: error.message
        });
    }
};

// Compare versions
exports.compareVersions = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { v1, v2 } = req.query;

        if (!v1 || !v2) {
            return res.status(400).json({
                success: false,
                message: 'Both v1 and v2 query parameters are required'
            });
        }

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        const comparison = await WikiRevision.compareVersions(
            page._id,
            parseInt(v1),
            parseInt(v2)
        );

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('Error comparing versions:', error);
        res.status(500).json({
            success: false,
            message: 'Error comparing versions',
            error: error.message
        });
    }
};

// Restore version
exports.restoreVersion = async (req, res) => {
    try {
        const { pageId, version } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to restore this page'
            });
        }

        const revision = await WikiRevision.getVersion(page._id, parseInt(version));

        if (!revision) {
            return res.status(404).json({
                success: false,
                message: 'Revision not found'
            });
        }

        // Restore content from revision
        page.title = revision.title;
        page.titleAr = revision.titleAr;
        page.content = revision.content;
        page.contentText = revision.contentText;
        page.summary = revision.summary;
        page.version += 1;
        page.revisionCount += 1;
        page.lastModifiedBy = userId;

        await page.save();

        // Create revision record
        await WikiRevision.createFromPage(
            page,
            userId,
            'restore',
            `Restored to version ${version}`,
            { ipAddress: req.ip, userAgent: req.get('user-agent') }
        );

        res.json({
            success: true,
            message: `Page restored to version ${version}`,
            data: page
        });
    } catch (error) {
        console.error('Error restoring version:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring version',
            error: error.message
        });
    }
};

// ============================================
// COLLECTION OPERATIONS
// ============================================

// List collections
exports.listCollections = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { parentCollectionId } = req.query;
        const userId = req.userID;

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const options = {};
        if (parentCollectionId === 'null') options.parentCollectionId = null;
        else if (parentCollectionId) options.parentCollectionId = parentCollectionId;

        const collections = await WikiCollection.getCaseCollections(caseId, options);

        res.json({
            success: true,
            data: collections
        });
    } catch (error) {
        console.error('Error listing collections:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing collections',
            error: error.message
        });
    }
};

// Create collection
exports.createCollection = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.userID;
        const { name, nameAr, description, descriptionAr, icon, color, parentCollectionId, collectionType, defaultPageType, defaultConfidentialityLevel, visibility } = req.body;

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const collection = new WikiCollection({
            name,
            nameAr,
            description,
            descriptionAr,
            icon,
            color,
            parentCollectionId,
            collectionType: collectionType || 'custom',
            defaultPageType,
            defaultConfidentialityLevel,
            visibility,
            caseId,
            lawyerId: userId,
            createdBy: userId
        });

        await collection.save();

        // Update parent sub-collection count
        if (parentCollectionId) {
            await WikiCollection.updateSubCollectionCount(parentCollectionId);
        }

        res.status(201).json({
            success: true,
            message: 'Collection created successfully',
            data: collection
        });
    } catch (error) {
        console.error('Error creating collection:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating collection',
            error: error.message
        });
    }
};

// Update collection
exports.updateCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.userID;
        const { name, nameAr, description, descriptionAr, icon, color, collectionType, defaultPageType, defaultConfidentialityLevel, visibility } = req.body;

        const collection = await WikiCollection.findById(collectionId);
        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found'
            });
        }

        if (collection.lawyerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (name !== undefined) collection.name = name;
        if (nameAr !== undefined) collection.nameAr = nameAr;
        if (description !== undefined) collection.description = description;
        if (descriptionAr !== undefined) collection.descriptionAr = descriptionAr;
        if (icon !== undefined) collection.icon = icon;
        if (color !== undefined) collection.color = color;
        if (collectionType !== undefined) collection.collectionType = collectionType;
        if (defaultPageType !== undefined) collection.defaultPageType = defaultPageType;
        if (defaultConfidentialityLevel !== undefined) collection.defaultConfidentialityLevel = defaultConfidentialityLevel;
        if (visibility !== undefined) collection.visibility = visibility;
        collection.lastModifiedBy = userId;

        await collection.save();

        res.json({
            success: true,
            message: 'Collection updated successfully',
            data: collection
        });
    } catch (error) {
        console.error('Error updating collection:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating collection',
            error: error.message
        });
    }
};

// Delete collection
exports.deleteCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.userID;

        const collection = await WikiCollection.findById(collectionId);
        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found'
            });
        }

        if (collection.lawyerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (collection.isDefault) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete default collections'
            });
        }

        await collection.deleteAndMovePages();

        res.json({
            success: true,
            message: 'Collection deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting collection:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting collection',
            error: error.message
        });
    }
};

// ============================================
// BACKLINKS
// ============================================

// Get backlinks
exports.getBacklinks = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        const backlinks = await WikiBacklink.getBacklinks(page._id);

        res.json({
            success: true,
            data: backlinks
        });
    } catch (error) {
        console.error('Error getting backlinks:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting backlinks',
            error: error.message
        });
    }
};

// Get outgoing links
exports.getOutgoingLinks = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        const links = await WikiBacklink.getOutgoingLinks(page._id);

        res.json({
            success: true,
            data: links
        });
    } catch (error) {
        console.error('Error getting outgoing links:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting outgoing links',
            error: error.message
        });
    }
};

// Get link graph for visualization
exports.getLinkGraph = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.userID;

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const graph = await WikiBacklink.getLinkGraph(caseId);

        res.json({
            success: true,
            data: graph
        });
    } catch (error) {
        console.error('Error getting link graph:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting link graph',
            error: error.message
        });
    }
};

// ============================================
// COMMENTS
// ============================================

// Get comments
exports.getComments = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { isInline, status } = req.query;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        const options = {};
        if (isInline !== undefined) options.isInline = isInline === 'true';
        if (status) options.status = status;

        const comments = await WikiComment.getPageComments(page._id, options);

        res.json({
            success: true,
            data: comments
        });
    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting comments',
            error: error.message
        });
    }
};

// Add comment
exports.addComment = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.userID;
        const {
            content,
            parentCommentId,
            isInline,
            selectionStart,
            selectionEnd,
            quotedText,
            blockId,
            mentions
        } = req.body;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        if (!page.allowComments) {
            return res.status(400).json({
                success: false,
                message: 'Comments are disabled for this page'
            });
        }

        const comment = new WikiComment({
            pageId: page._id,
            userId,
            content,
            parentCommentId,
            isInline: isInline || false,
            selectionStart,
            selectionEnd,
            quotedText,
            blockId,
            mentions,
            caseId: page.caseId
        });

        await comment.save();

        // Update parent reply count
        if (parentCommentId) {
            await WikiComment.findByIdAndUpdate(parentCommentId, {
                $inc: { replyCount: 1 }
            });
        }

        await comment.populate('userId', 'firstName lastName avatar');

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: comment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding comment',
            error: error.message
        });
    }
};

// Update comment
exports.updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userID;
        const { content } = req.body;

        const comment = await WikiComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        if (comment.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own comments'
            });
        }

        await comment.edit(content);
        await comment.populate('userId', 'firstName lastName avatar');

        res.json({
            success: true,
            message: 'Comment updated successfully',
            data: comment
        });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating comment',
            error: error.message
        });
    }
};

// Delete comment
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userID;

        const comment = await WikiComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Check if user owns comment or page
        const page = await WikiPage.findById(comment.pageId);
        if (comment.userId.toString() !== userId.toString() &&
            page.lawyerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await comment.softDelete();

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting comment',
            error: error.message
        });
    }
};

// Resolve comment
exports.resolveComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userID;
        const { note } = req.body;

        const comment = await WikiComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        await comment.resolve(userId, note);
        await comment.populate('resolvedBy', 'firstName lastName');

        res.json({
            success: true,
            message: 'Comment resolved successfully',
            data: comment
        });
    } catch (error) {
        console.error('Error resolving comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error resolving comment',
            error: error.message
        });
    }
};

// ============================================
// SEAL/UNSEAL
// ============================================

// Seal page
exports.sealPage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.userID;
        const { reason } = req.body;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        if (page.lawyerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the owner can seal this page'
            });
        }

        await page.seal(userId, reason);

        // Create revision
        await WikiRevision.createFromPage(page, userId, 'seal', `Page sealed: ${reason}`);

        res.json({
            success: true,
            message: 'Page sealed successfully',
            data: page
        });
    } catch (error) {
        console.error('Error sealing page:', error);
        res.status(500).json({
            success: false,
            message: 'Error sealing page',
            error: error.message
        });
    }
};

// Unseal page
exports.unsealPage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        if (page.lawyerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the owner can unseal this page'
            });
        }

        await page.unseal(userId);

        // Create revision
        await WikiRevision.createFromPage(page, userId, 'unseal', 'Page unsealed');

        res.json({
            success: true,
            message: 'Page unsealed successfully',
            data: page
        });
    } catch (error) {
        console.error('Error unsealing page:', error);
        res.status(500).json({
            success: false,
            message: 'Error unsealing page',
            error: error.message
        });
    }
};

// ============================================
// TEMPLATES
// ============================================

// List templates
exports.listTemplates = async (req, res) => {
    try {
        const userId = req.userID;

        const templates = await WikiPage.getTemplates(userId);

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('Error listing templates:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing templates',
            error: error.message
        });
    }
};

// Create from template
exports.createFromTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;
        const { caseId, title, collectionId } = req.body;
        const userId = req.userID;

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const page = await WikiPage.createFromTemplate(templateId, caseId, userId, {
            title,
            collectionId,
            lawyerId: userId,
            clientId: caseDoc.clientId
        });

        res.status(201).json({
            success: true,
            message: 'Page created from template',
            data: page
        });
    } catch (error) {
        console.error('Error creating from template:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating from template',
            error: error.message
        });
    }
};

// ============================================
// SEARCH
// ============================================

// Search pages in case
exports.search = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { q, pageType, limit = 20 } = req.query;
        const userId = req.userID;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const results = await WikiPage.searchPages(caseId, q, {
            pageType,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error searching pages:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching pages',
            error: error.message
        });
    }
};

// Global search across all cases
exports.globalSearch = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        const userId = req.userID;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const results = await WikiPage.find({
            lawyerId: userId,
            status: { $ne: 'archived' },
            $text: { $search: q }
        }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(parseInt(limit))
        .populate('caseId', 'title caseNumber')
        .select('pageId title urlSlug pageType caseId summary updatedAt');

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error in global search:', error);
        res.status(500).json({
            success: false,
            message: 'Error in global search',
            error: error.message
        });
    }
};

// ============================================
// MISC
// ============================================

// Get recent pages
exports.getRecentPages = async (req, res) => {
    try {
        const userId = req.userID;
        const { limit = 10 } = req.query;

        const pages = await WikiPage.getRecentPages(userId, parseInt(limit));

        res.json({
            success: true,
            data: pages
        });
    } catch (error) {
        console.error('Error getting recent pages:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting recent pages',
            error: error.message
        });
    }
};

// Get pinned pages for a case
exports.getPinnedPages = async (req, res) => {
    try {
        const { caseId } = req.params;

        const pages = await WikiPage.getPinnedPages(caseId);

        res.json({
            success: true,
            data: pages
        });
    } catch (error) {
        console.error('Error getting pinned pages:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting pinned pages',
            error: error.message
        });
    }
};

// Toggle pin status
exports.togglePin = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        page.isPinned = !page.isPinned;
        page.pinnedAt = page.isPinned ? new Date() : undefined;
        page.pinnedBy = page.isPinned ? userId : undefined;

        await page.save();

        res.json({
            success: true,
            message: page.isPinned ? 'Page pinned' : 'Page unpinned',
            data: { isPinned: page.isPinned }
        });
    } catch (error) {
        console.error('Error toggling pin:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling pin',
            error: error.message
        });
    }
};

// Move page
exports.movePage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { parentPageId, collectionId, order } = req.body;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const oldCollectionId = page.collectionId;

        if (parentPageId !== undefined) page.parentPageId = parentPageId || undefined;
        if (collectionId !== undefined) page.collectionId = collectionId || undefined;
        if (order !== undefined) page.order = order;

        // Regenerate path
        if (page.parentPageId) {
            const parent = await WikiPage.findById(page.parentPageId);
            page.path = parent ? `${parent.path}/${page.urlSlug}` : `/${page.urlSlug}`;
            page.depth = parent ? parent.depth + 1 : 0;
        } else {
            page.path = `/${page.urlSlug}`;
            page.depth = 0;
        }

        await page.save();

        // Update collection counts
        if (oldCollectionId) await WikiCollection.updatePageCount(oldCollectionId);
        if (collectionId) await WikiCollection.updatePageCount(collectionId);

        res.json({
            success: true,
            message: 'Page moved successfully',
            data: page
        });
    } catch (error) {
        console.error('Error moving page:', error);
        res.status(500).json({
            success: false,
            message: 'Error moving page',
            error: error.message
        });
    }
};

// Initialize default collections for a case
exports.initializeDefaultCollections = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.userID;

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        // Check if default collections already exist
        const existingDefaults = await WikiCollection.countDocuments({
            caseId,
            isDefault: true
        });

        if (existingDefaults > 0) {
            return res.status(400).json({
                success: false,
                message: 'Default collections already exist for this case'
            });
        }

        const collections = await WikiCollection.createDefaultCollections(caseId, userId, userId);

        res.status(201).json({
            success: true,
            message: 'Default collections created successfully',
            data: collections
        });
    } catch (error) {
        console.error('Error initializing default collections:', error);
        res.status(500).json({
            success: false,
            message: 'Error initializing default collections',
            error: error.message
        });
    }
};

// ============================================
// ATTACHMENT OPERATIONS
// ============================================

// Get presigned URL for uploading attachment
exports.getAttachmentUploadUrl = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.userID;
        const { fileName, fileType, documentCategory, isConfidential } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({
                success: false,
                message: 'fileName and fileType are required'
            });
        }

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check edit permission
        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: page.isSealed ? 'Cannot add attachments to sealed pages' : 'Access denied'
            });
        }

        // Generate unique file key
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `wiki/${page.caseId}/${page._id}/${uniqueId}-${sanitizedFileName}`;

        // Get presigned URL
        const uploadUrl = await getUploadPresignedUrl(fileKey, fileType, 'general');

        res.json({
            success: true,
            data: {
                uploadUrl,
                fileKey,
                expiresIn: 3600
            }
        });
    } catch (error) {
        console.error('Error getting attachment upload URL:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting upload URL',
            error: error.message
        });
    }
};

// Confirm attachment upload and add to page
exports.confirmAttachmentUpload = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.userID;
        const {
            fileName,
            fileNameAr,
            fileKey,
            fileUrl,
            fileType,
            fileSize,
            documentCategory,
            isConfidential
        } = req.body;

        if (!fileName || !fileKey) {
            return res.status(400).json({
                success: false,
                message: 'fileName and fileKey are required'
            });
        }

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check edit permission
        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: page.isSealed ? 'Cannot add attachments to sealed pages' : 'Access denied'
            });
        }

        // Create attachment object
        const attachment = {
            fileName,
            fileNameAr,
            fileUrl: fileUrl || `https://${BUCKETS.general}.s3.amazonaws.com/${fileKey}`,
            fileKey,
            fileType,
            fileSize,
            uploadedBy: userId,
            uploadedAt: new Date(),
            isSealed: false,
            isConfidential: isConfidential || page.isConfidential,
            documentCategory: documentCategory || 'other'
        };

        // Add to page attachments
        page.attachments.push(attachment);
        page.lastModifiedBy = userId;
        await page.save();

        // Create revision for attachment
        await WikiRevision.createFromPage(
            page,
            userId,
            'update',
            `Added attachment: ${fileName}`,
            { ipAddress: req.ip, userAgent: req.get('user-agent') }
        );

        res.status(201).json({
            success: true,
            message: 'Attachment added successfully',
            data: {
                attachment: page.attachments[page.attachments.length - 1],
                attachmentCount: page.attachmentCount
            }
        });
    } catch (error) {
        console.error('Error confirming attachment upload:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding attachment',
            error: error.message
        });
    }
};

// Get attachment download URL
exports.getAttachmentDownloadUrl = async (req, res) => {
    try {
        const { pageId, attachmentId } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check view permission
        if (!page.canView(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Find attachment
        const attachment = page.attachments.find(
            a => a.attachmentId === attachmentId || a._id?.toString() === attachmentId
        );

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        // Get presigned download URL
        const downloadUrl = await getDownloadPresignedUrl(
            attachment.fileKey,
            'general',
            attachment.fileName
        );

        res.json({
            success: true,
            data: {
                downloadUrl,
                fileName: attachment.fileName,
                fileType: attachment.fileType,
                fileSize: attachment.fileSize,
                expiresIn: 3600
            }
        });
    } catch (error) {
        console.error('Error getting attachment download URL:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting download URL',
            error: error.message
        });
    }
};

// List attachments for a page
exports.listAttachments = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        })
        .populate('attachments.uploadedBy', 'firstName lastName avatar');

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check view permission
        if (!page.canView(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: {
                attachments: page.attachments,
                count: page.attachmentCount
            }
        });
    } catch (error) {
        console.error('Error listing attachments:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing attachments',
            error: error.message
        });
    }
};

// Delete attachment
exports.deleteAttachment = async (req, res) => {
    try {
        const { pageId, attachmentId } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check edit permission
        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: page.isSealed ? 'Cannot delete attachments from sealed pages' : 'Access denied'
            });
        }

        // Find attachment
        const attachmentIndex = page.attachments.findIndex(
            a => a.attachmentId === attachmentId || a._id?.toString() === attachmentId
        );

        if (attachmentIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        const attachment = page.attachments[attachmentIndex];

        // Check if attachment is sealed
        if (attachment.isSealed) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete sealed attachments'
            });
        }

        // Delete from S3
        try {
            await deleteFile(attachment.fileKey, 'general');
        } catch (s3Error) {
            console.error('S3 delete error:', s3Error);
            // Continue even if S3 delete fails
        }

        // Remove from page
        const deletedFileName = attachment.fileName;
        page.attachments.splice(attachmentIndex, 1);
        page.lastModifiedBy = userId;
        await page.save();

        // Create revision for deletion
        await WikiRevision.createFromPage(
            page,
            userId,
            'update',
            `Deleted attachment: ${deletedFileName}`,
            { ipAddress: req.ip, userAgent: req.get('user-agent') }
        );

        res.json({
            success: true,
            message: 'Attachment deleted successfully',
            data: {
                attachmentCount: page.attachmentCount
            }
        });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting attachment',
            error: error.message
        });
    }
};

// Update attachment metadata
exports.updateAttachment = async (req, res) => {
    try {
        const { pageId, attachmentId } = req.params;
        const userId = req.userID;
        const { fileName, fileNameAr, documentCategory, isConfidential } = req.body;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check edit permission
        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: page.isSealed ? 'Cannot update attachments on sealed pages' : 'Access denied'
            });
        }

        // Find attachment
        const attachment = page.attachments.find(
            a => a.attachmentId === attachmentId || a._id?.toString() === attachmentId
        );

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        // Check if attachment is sealed
        if (attachment.isSealed) {
            return res.status(403).json({
                success: false,
                message: 'Cannot update sealed attachments'
            });
        }

        // Update fields
        if (fileName !== undefined) attachment.fileName = fileName;
        if (fileNameAr !== undefined) attachment.fileNameAr = fileNameAr;
        if (documentCategory !== undefined) attachment.documentCategory = documentCategory;
        if (isConfidential !== undefined) attachment.isConfidential = isConfidential;

        page.lastModifiedBy = userId;
        await page.save();

        res.json({
            success: true,
            message: 'Attachment updated successfully',
            data: attachment
        });
    } catch (error) {
        console.error('Error updating attachment:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating attachment',
            error: error.message
        });
    }
};

// Seal/unseal attachment (for legal auditability)
exports.sealAttachment = async (req, res) => {
    try {
        const { pageId, attachmentId } = req.params;
        const { seal } = req.body; // true to seal, false to unseal
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Only page owner can seal/unseal
        if (page.lawyerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the page owner can seal/unseal attachments'
            });
        }

        // Find attachment
        const attachment = page.attachments.find(
            a => a.attachmentId === attachmentId || a._id?.toString() === attachmentId
        );

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        attachment.isSealed = seal !== false;
        await page.save();

        res.json({
            success: true,
            message: seal !== false ? 'Attachment sealed successfully' : 'Attachment unsealed successfully',
            data: attachment
        });
    } catch (error) {
        console.error('Error sealing/unsealing attachment:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating attachment seal status',
            error: error.message
        });
    }
};

// ============================================
// ATTACHMENT VERSIONING
// ============================================

// Get presigned URL for uploading new version of an attachment
exports.getAttachmentVersionUploadUrl = async (req, res) => {
    try {
        const { pageId, attachmentId } = req.params;
        const userId = req.userID;
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({
                success: false,
                message: 'fileName and fileType are required'
            });
        }

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check edit permission
        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: page.isSealed ? 'Cannot update attachments on sealed pages' : 'Access denied'
            });
        }

        // Find attachment
        const attachment = page.attachments.find(
            a => a.attachmentId === attachmentId || a._id?.toString() === attachmentId
        );

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        // Check if attachment is sealed
        if (attachment.isSealed) {
            return res.status(403).json({
                success: false,
                message: 'Cannot upload new versions of sealed attachments'
            });
        }

        // Generate unique file key for new version
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const nextVersion = (attachment.currentVersion || 1) + 1;
        const fileKey = `wiki/${page.caseId}/${page._id}/versions/${attachmentId}/v${nextVersion}-${uniqueId}-${sanitizedFileName}`;

        // Get presigned URL
        const uploadUrl = await getUploadPresignedUrl(fileKey, fileType, 'general');

        res.json({
            success: true,
            data: {
                uploadUrl,
                fileKey,
                nextVersion,
                expiresIn: 3600
            }
        });
    } catch (error) {
        console.error('Error getting attachment version upload URL:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting upload URL',
            error: error.message
        });
    }
};

// Confirm new version upload
exports.confirmAttachmentVersionUpload = async (req, res) => {
    try {
        const { pageId, attachmentId } = req.params;
        const userId = req.userID;
        const {
            fileName,
            fileKey,
            fileUrl,
            fileType,
            fileSize,
            changeNote
        } = req.body;

        if (!fileName || !fileKey) {
            return res.status(400).json({
                success: false,
                message: 'fileName and fileKey are required'
            });
        }

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check edit permission
        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: page.isSealed ? 'Cannot update attachments on sealed pages' : 'Access denied'
            });
        }

        // Find attachment
        const attachment = page.attachments.find(
            a => a.attachmentId === attachmentId || a._id?.toString() === attachmentId
        );

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        // Check if attachment is sealed
        if (attachment.isSealed) {
            return res.status(403).json({
                success: false,
                message: 'Cannot upload new versions of sealed attachments'
            });
        }

        // Save current version to history
        const currentVersionRecord = {
            versionNumber: attachment.currentVersion || 1,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileKey: attachment.fileKey,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            uploadedBy: attachment.lastModifiedBy || attachment.uploadedBy,
            uploadedAt: attachment.lastModifiedAt || attachment.uploadedAt,
            changeNote: null
        };

        // Initialize version history if not exists
        if (!attachment.versionHistory) {
            attachment.versionHistory = [];
        }

        // Add current version to history
        attachment.versionHistory.push(currentVersionRecord);

        // Update attachment with new version
        const newVersion = (attachment.currentVersion || 1) + 1;
        attachment.fileName = fileName;
        attachment.fileUrl = fileUrl || `https://${BUCKETS.general}.s3.amazonaws.com/${fileKey}`;
        attachment.fileKey = fileKey;
        attachment.fileType = fileType || attachment.fileType;
        attachment.fileSize = fileSize;
        attachment.currentVersion = newVersion;
        attachment.versionCount = newVersion;
        attachment.lastModifiedBy = userId;
        attachment.lastModifiedAt = new Date();

        // Add change note to the new current version record (will be saved in history on next update)
        if (changeNote) {
            attachment.description = changeNote;
        }

        page.lastModifiedBy = userId;
        await page.save();

        // Create revision for version update
        await WikiRevision.createFromPage(
            page,
            userId,
            'update',
            `Updated attachment "${attachment.fileName}" to version ${newVersion}${changeNote ? ': ' + changeNote : ''}`,
            { ipAddress: req.ip, userAgent: req.get('user-agent') }
        );

        res.json({
            success: true,
            message: 'New version uploaded successfully',
            data: {
                attachment,
                currentVersion: newVersion,
                versionCount: newVersion
            }
        });
    } catch (error) {
        console.error('Error confirming attachment version upload:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading new version',
            error: error.message
        });
    }
};

// Get attachment version history
exports.getAttachmentVersionHistory = async (req, res) => {
    try {
        const { pageId, attachmentId } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        })
        .populate('attachments.uploadedBy', 'firstName lastName avatar')
        .populate('attachments.lastModifiedBy', 'firstName lastName avatar')
        .populate('attachments.versionHistory.uploadedBy', 'firstName lastName avatar');

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check view permission
        if (!page.canView(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Find attachment
        const attachment = page.attachments.find(
            a => a.attachmentId === attachmentId || a._id?.toString() === attachmentId
        );

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        // Build version list (current + history)
        const versions = [];

        // Add current version
        versions.push({
            versionNumber: attachment.currentVersion || 1,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileKey: attachment.fileKey,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            uploadedBy: attachment.lastModifiedBy || attachment.uploadedBy,
            uploadedAt: attachment.lastModifiedAt || attachment.uploadedAt,
            changeNote: attachment.description,
            isCurrent: true
        });

        // Add history versions (sorted by version number descending)
        if (attachment.versionHistory && attachment.versionHistory.length > 0) {
            const historyVersions = attachment.versionHistory
                .map(v => ({
                    ...v.toObject ? v.toObject() : v,
                    isCurrent: false
                }))
                .sort((a, b) => b.versionNumber - a.versionNumber);

            versions.push(...historyVersions);
        }

        res.json({
            success: true,
            data: {
                attachmentId: attachment.attachmentId,
                fileName: attachment.fileName,
                currentVersion: attachment.currentVersion || 1,
                versionCount: attachment.versionCount || 1,
                versions
            }
        });
    } catch (error) {
        console.error('Error getting attachment version history:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting version history',
            error: error.message
        });
    }
};

// Download a specific version
exports.downloadAttachmentVersion = async (req, res) => {
    try {
        const { pageId, attachmentId, versionNumber } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check view permission
        if (!page.canView(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Find attachment
        const attachment = page.attachments.find(
            a => a.attachmentId === attachmentId || a._id?.toString() === attachmentId
        );

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        const version = parseInt(versionNumber);
        let fileKey, fileName, fileType, fileSize;

        // Check if requesting current version
        if (version === (attachment.currentVersion || 1)) {
            fileKey = attachment.fileKey;
            fileName = attachment.fileName;
            fileType = attachment.fileType;
            fileSize = attachment.fileSize;
        } else {
            // Find in history
            const historyVersion = attachment.versionHistory?.find(
                v => v.versionNumber === version
            );

            if (!historyVersion) {
                return res.status(404).json({
                    success: false,
                    message: 'Version not found'
                });
            }

            fileKey = historyVersion.fileKey;
            fileName = historyVersion.fileName;
            fileType = historyVersion.fileType;
            fileSize = historyVersion.fileSize;
        }

        // Get presigned download URL
        const downloadUrl = await getDownloadPresignedUrl(fileKey, 'general', fileName);

        res.json({
            success: true,
            data: {
                downloadUrl,
                fileName,
                fileType,
                fileSize,
                version,
                expiresIn: 3600
            }
        });
    } catch (error) {
        console.error('Error downloading attachment version:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting download URL',
            error: error.message
        });
    }
};

// Restore a previous version
exports.restoreAttachmentVersion = async (req, res) => {
    try {
        const { pageId, attachmentId, versionNumber } = req.params;
        const userId = req.userID;

        const page = await WikiPage.findOne({
            $or: [{ _id: pageId }, { pageId: pageId }]
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: 'Page not found'
            });
        }

        // Check edit permission
        if (!page.canEdit(userId)) {
            return res.status(403).json({
                success: false,
                message: page.isSealed ? 'Cannot restore attachments on sealed pages' : 'Access denied'
            });
        }

        // Find attachment
        const attachment = page.attachments.find(
            a => a.attachmentId === attachmentId || a._id?.toString() === attachmentId
        );

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        // Check if attachment is sealed
        if (attachment.isSealed) {
            return res.status(403).json({
                success: false,
                message: 'Cannot restore sealed attachments'
            });
        }

        const version = parseInt(versionNumber);

        // Cannot restore to current version
        if (version === (attachment.currentVersion || 1)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot restore to current version'
            });
        }

        // Find the version to restore
        const versionToRestore = attachment.versionHistory?.find(
            v => v.versionNumber === version
        );

        if (!versionToRestore) {
            return res.status(404).json({
                success: false,
                message: 'Version not found'
            });
        }

        // Save current version to history
        const currentVersionRecord = {
            versionNumber: attachment.currentVersion || 1,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileKey: attachment.fileKey,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            uploadedBy: attachment.lastModifiedBy || attachment.uploadedBy,
            uploadedAt: attachment.lastModifiedAt || attachment.uploadedAt,
            changeNote: attachment.description
        };

        // Initialize version history if not exists
        if (!attachment.versionHistory) {
            attachment.versionHistory = [];
        }

        // Add current to history
        attachment.versionHistory.push(currentVersionRecord);

        // Restore the old version as new current
        const newVersion = (attachment.currentVersion || 1) + 1;
        attachment.fileName = versionToRestore.fileName;
        attachment.fileUrl = versionToRestore.fileUrl;
        attachment.fileKey = versionToRestore.fileKey;
        attachment.fileType = versionToRestore.fileType;
        attachment.fileSize = versionToRestore.fileSize;
        attachment.currentVersion = newVersion;
        attachment.versionCount = newVersion;
        attachment.lastModifiedBy = userId;
        attachment.lastModifiedAt = new Date();
        attachment.description = `Restored from version ${version}`;

        // Update the restored version record to mark it
        const restoredIndex = attachment.versionHistory.findIndex(v => v.versionNumber === version);
        if (restoredIndex !== -1) {
            attachment.versionHistory[restoredIndex].isRestored = true;
            attachment.versionHistory[restoredIndex].restoredFrom = version;
        }

        page.lastModifiedBy = userId;
        await page.save();

        // Create revision for restore
        await WikiRevision.createFromPage(
            page,
            userId,
            'update',
            `Restored attachment "${attachment.fileName}" to version ${version}`,
            { ipAddress: req.ip, userAgent: req.get('user-agent') }
        );

        res.json({
            success: true,
            message: `Attachment restored to version ${version}`,
            data: {
                attachment,
                restoredFromVersion: version,
                newVersion
            }
        });
    } catch (error) {
        console.error('Error restoring attachment version:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring version',
            error: error.message
        });
    }
};
