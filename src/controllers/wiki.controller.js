const WikiPage = require('../models/wikiPage.model');
const WikiRevision = require('../models/wikiRevision.model');
const WikiBacklink = require('../models/wikiBacklink.model');
const WikiFolder = require('../models/wikiFolder.model');
const WikiComment = require('../models/wikiComment.model');
const Case = require('../models/case.model');

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
        const { pageType, folderId, parentPageId, search, status } = req.query;
        const userId = req.user._id;

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
            if (folderId) options.folderId = folderId;
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
        const userId = req.user._id;

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

        const [pageTree, folderTree] = await Promise.all([
            WikiPage.getPageTree(caseId),
            WikiFolder.getFolderTree(caseId)
        ]);

        res.json({
            success: true,
            data: {
                pages: pageTree,
                folders: folderTree
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
        const userId = req.user._id;
        const {
            title,
            titleAr,
            content,
            contentText,
            summary,
            pageType,
            parentPageId,
            folderId,
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
            folderId,
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

        // Update folder page count if in a folder
        if (folderId) {
            await WikiFolder.updatePageCount(folderId);
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
        const userId = req.user._id;

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
        .populate('folderId', 'name nameAr icon color')
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
        const userId = req.user._id;
        const {
            title,
            titleAr,
            content,
            contentText,
            summary,
            pageType,
            parentPageId,
            folderId,
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

        const oldFolderId = page.folderId;

        // Update fields
        if (title !== undefined) page.title = title;
        if (titleAr !== undefined) page.titleAr = titleAr;
        if (content !== undefined) page.content = content;
        if (contentText !== undefined) page.contentText = contentText;
        if (summary !== undefined) page.summary = summary;
        if (pageType !== undefined) page.pageType = pageType;
        if (parentPageId !== undefined) page.parentPageId = parentPageId || undefined;
        if (folderId !== undefined) page.folderId = folderId || undefined;
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

        // Update folder page counts if folder changed
        if (oldFolderId && oldFolderId.toString() !== (folderId || '').toString()) {
            await WikiFolder.updatePageCount(oldFolderId);
        }
        if (folderId) {
            await WikiFolder.updatePageCount(folderId);
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
        const userId = req.user._id;

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

        const folderId = page.folderId;

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

        // Update folder count
        if (folderId) {
            await WikiFolder.updatePageCount(folderId);
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
        const userId = req.user._id;

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
// FOLDER OPERATIONS
// ============================================

// List folders
exports.listFolders = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { parentFolderId } = req.query;
        const userId = req.user._id;

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const options = {};
        if (parentFolderId === 'null') options.parentFolderId = null;
        else if (parentFolderId) options.parentFolderId = parentFolderId;

        const folders = await WikiFolder.getCaseFolders(caseId, options);

        res.json({
            success: true,
            data: folders
        });
    } catch (error) {
        console.error('Error listing folders:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing folders',
            error: error.message
        });
    }
};

// Create folder
exports.createFolder = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.user._id;
        const { name, nameAr, description, icon, color, parentFolderId } = req.body;

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const folder = new WikiFolder({
            name,
            nameAr,
            description,
            icon,
            color,
            parentFolderId,
            caseId,
            lawyerId: userId,
            createdBy: userId
        });

        await folder.save();

        // Update parent subfolder count
        if (parentFolderId) {
            await WikiFolder.updateSubfolderCount(parentFolderId);
        }

        res.status(201).json({
            success: true,
            message: 'Folder created successfully',
            data: folder
        });
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating folder',
            error: error.message
        });
    }
};

// Update folder
exports.updateFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const userId = req.user._id;
        const { name, nameAr, description, icon, color } = req.body;

        const folder = await WikiFolder.findById(folderId);
        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        if (folder.lawyerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (name !== undefined) folder.name = name;
        if (nameAr !== undefined) folder.nameAr = nameAr;
        if (description !== undefined) folder.description = description;
        if (icon !== undefined) folder.icon = icon;
        if (color !== undefined) folder.color = color;
        folder.lastModifiedBy = userId;

        await folder.save();

        res.json({
            success: true,
            message: 'Folder updated successfully',
            data: folder
        });
    } catch (error) {
        console.error('Error updating folder:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating folder',
            error: error.message
        });
    }
};

// Delete folder
exports.deleteFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const userId = req.user._id;

        const folder = await WikiFolder.findById(folderId);
        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        if (folder.lawyerId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (folder.isDefault) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete default folders'
            });
        }

        await folder.deleteAndMovePages();

        res.json({
            success: true,
            message: 'Folder deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting folder',
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
        const userId = req.user._id;

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
        const userId = req.user._id;
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
        const userId = req.user._id;
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
        const userId = req.user._id;

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
        const userId = req.user._id;
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
        const userId = req.user._id;
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
        const userId = req.user._id;

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
        const userId = req.user._id;

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
        const { caseId, title, folderId } = req.body;
        const userId = req.user._id;

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const page = await WikiPage.createFromTemplate(templateId, caseId, userId, {
            title,
            folderId,
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
        const userId = req.user._id;

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
        const userId = req.user._id;

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
        const userId = req.user._id;
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
        const userId = req.user._id;

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
        const { parentPageId, folderId, order } = req.body;
        const userId = req.user._id;

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

        const oldFolderId = page.folderId;

        if (parentPageId !== undefined) page.parentPageId = parentPageId || undefined;
        if (folderId !== undefined) page.folderId = folderId || undefined;
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

        // Update folder counts
        if (oldFolderId) await WikiFolder.updatePageCount(oldFolderId);
        if (folderId) await WikiFolder.updatePageCount(folderId);

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

// Initialize default folders for a case
exports.initializeDefaultFolders = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.user._id;

        const caseDoc = await Case.findOne({ _id: caseId, lawyerId: userId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        // Check if default folders already exist
        const existingDefaults = await WikiFolder.countDocuments({
            caseId,
            isDefault: true
        });

        if (existingDefaults > 0) {
            return res.status(400).json({
                success: false,
                message: 'Default folders already exist for this case'
            });
        }

        const folders = await WikiFolder.createDefaultFolders(caseId, userId, userId);

        res.status(201).json({
            success: true,
            message: 'Default folders created successfully',
            data: folders
        });
    } catch (error) {
        console.error('Error initializing default folders:', error);
        res.status(500).json({
            success: false,
            message: 'Error initializing default folders',
            error: error.message
        });
    }
};
