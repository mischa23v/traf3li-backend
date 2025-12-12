const CaseNotionPage = require('../models/caseNotionPage.model');
const CaseNotionBlock = require('../models/caseNotionBlock.model');
const SyncedBlock = require('../models/syncedBlock.model');
const PageTemplate = require('../models/pageTemplate.model');
const BlockComment = require('../models/blockComment.model');
const PageActivity = require('../models/pageActivity.model');
const Task = require('../models/task.model');

// ═══════════════════════════════════════════════════════════════
// PAGE CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.listPages = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { pageType, search, isFavorite, isPinned, isArchived, page = 1, limit = 50 } = req.query;

        const query = {
            caseId,
            deletedAt: null
        };

        // Add firm/lawyer filter
        if (req.user.firmId) {
            query.firmId = req.user.firmId;
        } else {
            query.lawyerId = req.user._id;
        }

        if (pageType) query.pageType = pageType;
        if (isFavorite !== undefined) query.isFavorite = isFavorite === 'true';
        if (isPinned !== undefined) query.isPinned = isPinned === 'true';
        if (isArchived !== undefined) {
            query.archivedAt = isArchived === 'true' ? { $ne: null } : null;
        } else {
            query.archivedAt = null;
        }

        if (search) {
            query.$text = { $search: search };
        }

        const pages = await CaseNotionPage.find(query)
            .sort({ isPinned: -1, isFavorite: -1, updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('createdBy', 'firstName lastName')
            .populate('lastEditedBy', 'firstName lastName');

        const count = await CaseNotionPage.countDocuments(query);

        res.json({
            success: true,
            data: { pages, count, totalPages: Math.ceil(count / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.getPage = async (req, res) => {
    try {
        const { caseId, pageId } = req.params;

        const query = {
            _id: pageId,
            caseId,
            deletedAt: null
        };

        if (req.user.firmId) {
            query.firmId = req.user.firmId;
        } else {
            query.lawyerId = req.user._id;
        }

        const page = await CaseNotionPage.findOne(query)
            .populate('createdBy', 'firstName lastName')
            .populate('lastEditedBy', 'firstName lastName')
            .populate('parentPageId', 'title titleAr')
            .populate('childPageIds', 'title titleAr icon');

        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        // Get blocks for this page
        const blocks = await CaseNotionBlock.find({ pageId })
            .sort({ order: 1 })
            .populate('lastEditedBy', 'firstName lastName')
            .populate('lockedBy', 'firstName lastName');

        res.json({
            success: true,
            data: { ...page.toObject(), blocks }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.createPage = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { title, titleAr, pageType, icon, cover, parentPageId, templateId } = req.body;

        const pageData = {
            caseId,
            title,
            titleAr,
            pageType: pageType || 'general',
            icon,
            cover,
            parentPageId,
            createdBy: req.user._id,
            lastEditedBy: req.user._id
        };

        if (req.user.firmId) {
            pageData.firmId = req.user.firmId;
        } else {
            pageData.lawyerId = req.user._id;
        }

        const page = new CaseNotionPage(pageData);
        await page.save();

        // If templateId provided, apply template
        if (templateId) {
            await applyTemplateToPage(page._id, templateId, req.user._id);
        }

        // Update parent's childPageIds if has parent
        if (parentPageId) {
            await CaseNotionPage.findByIdAndUpdate(parentPageId, {
                $push: { childPageIds: page._id }
            });
        }

        // Log activity
        await PageActivity.create({
            pageId: page._id,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'created'
        });

        res.status(201).json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.updatePage = async (req, res) => {
    try {
        const { pageId } = req.params;
        const updateData = req.body;

        const page = await CaseNotionPage.findByIdAndUpdate(
            pageId,
            {
                ...updateData,
                lastEditedBy: req.user._id,
                version: { $inc: 1 },
                lastVersionAt: new Date()
            },
            { new: true }
        );

        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        // Log activity
        await PageActivity.create({
            pageId: page._id,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'edited',
            details: { fields: Object.keys(updateData) }
        });

        res.json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.deletePage = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findByIdAndUpdate(
            pageId,
            { deletedAt: new Date() },
            { new: true }
        );

        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        // Log activity
        await PageActivity.create({
            pageId: page._id,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'deleted'
        });

        res.json({ success: true, message: 'Page deleted' });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.archivePage = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findByIdAndUpdate(
            pageId,
            { archivedAt: new Date() },
            { new: true }
        );

        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        await PageActivity.create({
            pageId: page._id,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'archived'
        });

        res.json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.restorePage = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findByIdAndUpdate(
            pageId,
            { archivedAt: null, deletedAt: null },
            { new: true }
        );

        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        await PageActivity.create({
            pageId: page._id,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'restored'
        });

        res.json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.duplicatePage = async (req, res) => {
    try {
        const { caseId, pageId } = req.params;
        const { newTitle } = req.body;

        const originalPage = await CaseNotionPage.findById(pageId);
        if (!originalPage) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        // Create new page
        const pageData = {
            caseId,
            title: newTitle || `${originalPage.title} (Copy)`,
            titleAr: originalPage.titleAr ? `${originalPage.titleAr} (نسخة)` : undefined,
            pageType: originalPage.pageType,
            icon: originalPage.icon,
            cover: originalPage.cover,
            createdBy: req.user._id,
            lastEditedBy: req.user._id
        };

        if (req.user.firmId) {
            pageData.firmId = req.user.firmId;
        } else {
            pageData.lawyerId = req.user._id;
        }

        const newPage = await CaseNotionPage.create(pageData);

        // Copy blocks
        const blocks = await CaseNotionBlock.find({ pageId });
        let order = 0;
        for (const block of blocks) {
            const newBlock = block.toObject();
            delete newBlock._id;
            newBlock.pageId = newPage._id;
            newBlock.order = order++;
            await CaseNotionBlock.create(newBlock);
        }

        res.status(201).json({ success: true, data: newPage });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.toggleFavorite = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        page.isFavorite = !page.isFavorite;
        await page.save();

        await PageActivity.create({
            pageId: page._id,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'favorited',
            details: { isFavorite: page.isFavorite }
        });

        res.json({ success: true, data: { isFavorite: page.isFavorite } });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.togglePin = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        page.isPinned = !page.isPinned;
        await page.save();

        await PageActivity.create({
            pageId: page._id,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'pinned',
            details: { isPinned: page.isPinned }
        });

        res.json({ success: true, data: { isPinned: page.isPinned } });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.mergePages = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { sourcePageIds, targetTitle, deleteSourcePages } = req.body;

        const pageData = {
            caseId,
            title: targetTitle,
            pageType: 'general',
            createdBy: req.user._id,
            lastEditedBy: req.user._id
        };

        if (req.user.firmId) {
            pageData.firmId = req.user.firmId;
        } else {
            pageData.lawyerId = req.user._id;
        }

        const mergedPage = await CaseNotionPage.create(pageData);

        let blockOrder = 0;
        for (const sourcePageId of sourcePageIds) {
            const sourcePage = await CaseNotionPage.findById(sourcePageId);
            if (!sourcePage) continue;

            // Add page title as heading
            await CaseNotionBlock.create({
                pageId: mergedPage._id,
                type: 'heading_2',
                content: [{ type: 'text', text: { content: sourcePage.title }, plainText: sourcePage.title }],
                order: blockOrder++
            });

            // Copy blocks
            const blocks = await CaseNotionBlock.find({ pageId: sourcePageId }).sort({ order: 1 });
            for (const block of blocks) {
                const newBlock = block.toObject();
                delete newBlock._id;
                newBlock.pageId = mergedPage._id;
                newBlock.order = blockOrder++;
                await CaseNotionBlock.create(newBlock);
            }

            // Add divider
            await CaseNotionBlock.create({
                pageId: mergedPage._id,
                type: 'divider',
                content: [],
                order: blockOrder++
            });
        }

        if (deleteSourcePages) {
            await CaseNotionPage.updateMany(
                { _id: { $in: sourcePageIds } },
                { deletedAt: new Date() }
            );
        }

        res.json({ success: true, data: mergedPage });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// BLOCK CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.getBlocks = async (req, res) => {
    try {
        const { pageId } = req.params;

        const blocks = await CaseNotionBlock.find({ pageId })
            .sort({ order: 1 })
            .populate('lastEditedBy', 'firstName lastName')
            .populate('lockedBy', 'firstName lastName');

        res.json({ success: true, data: blocks });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.createBlock = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { type, content, properties, parentId, afterBlockId } = req.body;

        // Determine order
        let order = 0;
        if (afterBlockId) {
            const afterBlock = await CaseNotionBlock.findById(afterBlockId);
            if (afterBlock) {
                order = afterBlock.order + 1;
                // Shift subsequent blocks
                await CaseNotionBlock.updateMany(
                    { pageId, order: { $gte: order } },
                    { $inc: { order: 1 } }
                );
            }
        } else {
            const lastBlock = await CaseNotionBlock.findOne({ pageId }).sort({ order: -1 });
            order = lastBlock ? lastBlock.order + 1 : 0;
        }

        const block = await CaseNotionBlock.create({
            pageId,
            type,
            content,
            properties,
            parentId,
            order,
            lastEditedBy: req.user._id,
            lastEditedAt: new Date()
        });

        // Log activity
        await PageActivity.create({
            pageId,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'block_added',
            blockId: block._id,
            details: { blockType: type }
        });

        res.status(201).json({ success: true, data: block });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.updateBlock = async (req, res) => {
    try {
        const { blockId } = req.params;
        const updateData = req.body;

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        // Check if block is locked by another user
        if (block.lockedBy && block.lockedBy.toString() !== req.user._id.toString()) {
            return res.status(423).json({
                error: true,
                message: 'Block is being edited by another user'
            });
        }

        // Update block
        Object.assign(block, updateData, {
            lastEditedBy: req.user._id,
            lastEditedAt: new Date()
        });

        await block.save();

        // If this is a synced block original, update all synced copies
        if (block.isSyncedBlock) {
            await updateSyncedBlocks(block._id, updateData);
        }

        res.json({ success: true, data: block });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.deleteBlock = async (req, res) => {
    try {
        const { blockId } = req.params;

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        const pageId = block.pageId;
        await block.deleteOne();

        // Reorder remaining blocks
        await CaseNotionBlock.updateMany(
            { pageId, order: { $gt: block.order } },
            { $inc: { order: -1 } }
        );

        // Log activity
        await PageActivity.create({
            pageId,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'block_deleted',
            details: { blockType: block.type }
        });

        res.json({ success: true, message: 'Block deleted' });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.moveBlock = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { targetPageId, afterBlockId, parentId } = req.body;

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        const oldPageId = block.pageId;
        const oldOrder = block.order;

        // Determine new order
        let newOrder = 0;
        if (afterBlockId) {
            const afterBlock = await CaseNotionBlock.findById(afterBlockId);
            if (afterBlock) {
                newOrder = afterBlock.order + 1;
            }
        }

        // Update orders in old page
        await CaseNotionBlock.updateMany(
            { pageId: oldPageId, order: { $gt: oldOrder } },
            { $inc: { order: -1 } }
        );

        // Update orders in new page
        const newPageId = targetPageId || oldPageId;
        await CaseNotionBlock.updateMany(
            { pageId: newPageId, order: { $gte: newOrder } },
            { $inc: { order: 1 } }
        );

        // Update block
        block.pageId = newPageId;
        block.order = newOrder;
        if (parentId !== undefined) block.parentId = parentId;
        await block.save();

        // Log activity
        await PageActivity.create({
            pageId: newPageId,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'block_moved',
            blockId: block._id
        });

        res.json({ success: true, data: block });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.lockBlock = async (req, res) => {
    try {
        const { blockId } = req.params;

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        // Check if already locked by another user
        if (block.lockedBy && block.lockedBy.toString() !== req.user._id.toString()) {
            return res.status(423).json({
                error: true,
                message: 'Block is locked by another user'
            });
        }

        block.lockedBy = req.user._id;
        block.lockedAt = new Date();
        await block.save();

        res.json({ success: true, data: { locked: true } });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.unlockBlock = async (req, res) => {
    try {
        const { blockId } = req.params;

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        block.lockedBy = undefined;
        block.lockedAt = undefined;
        await block.save();

        res.json({ success: true, data: { locked: false } });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// SYNCED BLOCK CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.createSyncedBlock = async (req, res) => {
    try {
        const { originalBlockId, targetPageId } = req.body;

        const originalBlock = await CaseNotionBlock.findById(originalBlockId);
        if (!originalBlock) {
            return res.status(404).json({ error: true, message: 'Original block not found' });
        }

        // Mark original as synced block
        originalBlock.isSyncedBlock = true;
        await originalBlock.save();

        // Create synced copy in target page
        const syncedCopy = await CaseNotionBlock.create({
            pageId: targetPageId,
            type: originalBlock.type,
            content: originalBlock.content,
            properties: originalBlock.properties,
            syncedFromBlockId: originalBlockId,
            order: 0,
            lastEditedBy: req.user._id,
            lastEditedAt: new Date()
        });

        // Create or update synced block record
        let syncedRecord = await SyncedBlock.findOne({ originalBlockId });
        if (!syncedRecord) {
            syncedRecord = await SyncedBlock.create({
                originalBlockId,
                originalPageId: originalBlock.pageId,
                syncedToPages: [{ pageId: targetPageId, blockId: syncedCopy._id }],
                content: originalBlock.content,
                properties: originalBlock.properties,
                createdBy: req.user._id
            });
        } else {
            syncedRecord.syncedToPages.push({ pageId: targetPageId, blockId: syncedCopy._id });
            await syncedRecord.save();
        }

        res.status(201).json({ success: true, data: syncedCopy });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.getSyncedBlock = async (req, res) => {
    try {
        const { blockId } = req.params;

        const syncedRecord = await SyncedBlock.findOne({ originalBlockId: blockId })
            .populate('originalBlockId')
            .populate('syncedToPages.pageId', 'title');

        if (!syncedRecord) {
            return res.status(404).json({ error: true, message: 'Synced block not found' });
        }

        res.json({ success: true, data: syncedRecord });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.unsyncBlock = async (req, res) => {
    try {
        const { blockId } = req.params;

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        // Remove from synced block record
        if (block.syncedFromBlockId) {
            await SyncedBlock.updateOne(
                { originalBlockId: block.syncedFromBlockId },
                { $pull: { syncedToPages: { blockId } } }
            );
        }

        block.syncedFromBlockId = undefined;
        await block.save();

        res.json({ success: true, message: 'Block unsynced' });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// COMMENT CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.getComments = async (req, res) => {
    try {
        const { blockId } = req.params;

        const comments = await BlockComment.find({ blockId })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'firstName lastName')
            .populate('mentions', 'firstName lastName');

        res.json({ success: true, data: comments });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { content, parentCommentId, mentions } = req.body;

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        const comment = await BlockComment.create({
            blockId,
            pageId: block.pageId,
            content,
            parentCommentId,
            mentions,
            createdBy: req.user._id
        });

        await PageActivity.create({
            pageId: block.pageId,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'commented',
            blockId,
            details: { commentId: comment._id }
        });

        res.status(201).json({ success: true, data: comment });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.resolveComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        const comment = await BlockComment.findByIdAndUpdate(
            commentId,
            {
                isResolved: true,
                resolvedBy: req.user._id,
                resolvedAt: new Date()
            },
            { new: true }
        );

        if (!comment) {
            return res.status(404).json({ error: true, message: 'Comment not found' });
        }

        res.json({ success: true, data: comment });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        const comment = await BlockComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: true, message: 'Comment not found' });
        }

        // Only creator can delete
        if (comment.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: true, message: 'Not authorized' });
        }

        await comment.deleteOne();
        res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// ACTIVITY CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.getPageActivity = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const activities = await PageActivity.find({ pageId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('userId', 'firstName lastName');

        const count = await PageActivity.countDocuments({ pageId });

        res.json({
            success: true,
            data: { activities, count, totalPages: Math.ceil(count / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// SEARCH CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.search = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({ success: true, data: { results: [], count: 0 } });
        }

        const query = {
            caseId,
            deletedAt: null,
            archivedAt: null
        };

        if (req.user.firmId) {
            query.firmId = req.user.firmId;
        } else {
            query.lawyerId = req.user._id;
        }

        // Search in page titles
        const pageMatches = await CaseNotionPage.find({
            ...query,
            $text: { $search: q }
        }, { score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' } })
            .limit(10)
            .select('title titleAr');

        // Search in block content
        const pageIds = await CaseNotionPage.find(query).distinct('_id');
        const blockMatches = await CaseNotionBlock.find({
            pageId: { $in: pageIds },
            'content.plainText': { $regex: q, $options: 'i' }
        })
            .limit(20)
            .populate('pageId', 'title titleAr');

        const results = [
            ...pageMatches.map(p => ({
                pageId: p._id,
                pageTitle: p.title,
                matchType: 'title',
                score: p._doc.score || 1
            })),
            ...blockMatches
                .filter(b => b.pageId)
                .map(b => ({
                    pageId: b.pageId._id,
                    pageTitle: b.pageId.title,
                    blockId: b._id,
                    blockContent: b.content[0]?.plainText?.substring(0, 100),
                    matchType: 'content',
                    score: 0.5
                }))
        ];

        // Dedupe and sort
        const uniqueResults = [...new Map(results.map(r =>
            [r.pageId.toString() + (r.blockId || ''), r]
        )).values()].sort((a, b) => b.score - a.score);

        res.json({
            success: true,
            data: { results: uniqueResults, count: uniqueResults.length }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORT CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.exportPdf = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        const blocks = await CaseNotionBlock.find({ pageId }).sort({ order: 1 });
        const pageWithBlocks = { ...page.toObject(), blocks };

        const { exportPageToPdf } = require('../services/pdfExporter.service');
        const pdfBuffer = await exportPageToPdf(pageWithBlocks);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${page.title}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.exportMarkdown = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        const blocks = await CaseNotionBlock.find({ pageId }).sort({ order: 1 });
        const pageWithBlocks = { ...page.toObject(), blocks };

        const { exportPageToMarkdown } = require('../services/markdownExporter.service');
        const markdown = exportPageToMarkdown(pageWithBlocks);

        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${page.title}.md"`);
        res.send(markdown);
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.exportHtml = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        const blocks = await CaseNotionBlock.find({ pageId }).sort({ order: 1 });
        const pageWithBlocks = { ...page.toObject(), blocks };

        const { generateHtmlFromBlocks } = require('../services/pdfExporter.service');
        const html = generateHtmlFromBlocks(pageWithBlocks);

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${page.title}.html"`);
        res.send(html);
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.getTemplates = async (req, res) => {
    try {
        const { category } = req.query;

        const query = {
            isActive: true,
            $or: [
                { isGlobal: true }
            ]
        };

        if (req.user.firmId) {
            query.$or.push({ firmId: req.user.firmId });
        } else {
            query.$or.push({ lawyerId: req.user._id });
        }

        if (category) {
            query.category = category;
        }

        const templates = await PageTemplate.find(query)
            .sort({ usageCount: -1, name: 1 })
            .populate('createdBy', 'firstName lastName');

        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.applyTemplate = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { templateId } = req.body;

        await applyTemplateToPage(pageId, templateId, req.user._id);

        await PageActivity.create({
            pageId,
            userId: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            action: 'template_applied',
            details: { templateId }
        });

        const page = await CaseNotionPage.findById(pageId);
        const blocks = await CaseNotionBlock.find({ pageId }).sort({ order: 1 });

        res.json({ success: true, data: { ...page.toObject(), blocks } });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.saveAsTemplate = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { name, nameAr, description, descriptionAr, category, isGlobal } = req.body;

        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        const blocks = await CaseNotionBlock.find({ pageId }).sort({ order: 1 });

        const templateData = {
            name,
            nameAr,
            description,
            descriptionAr,
            category: category || 'custom',
            icon: page.icon,
            blocks: blocks.map(b => ({
                type: b.type,
                content: b.content,
                properties: b.properties,
                icon: b.icon,
                color: b.color
            })),
            isGlobal: isGlobal && req.user.role === 'admin',
            createdBy: req.user._id
        };

        if (req.user.firmId) {
            templateData.firmId = req.user.firmId;
        } else {
            templateData.lawyerId = req.user._id;
        }

        const template = await PageTemplate.create(templateData);

        res.status(201).json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// TASK LINKING CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.linkTask = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { taskId } = req.body;

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        if (!block.linkedTaskIds.includes(taskId)) {
            block.linkedTaskIds.push(taskId);
            await block.save();
        }

        res.json({ success: true, data: block });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.unlinkTask = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { taskId } = req.body;

        const block = await CaseNotionBlock.findByIdAndUpdate(
            blockId,
            { $pull: { linkedTaskIds: taskId } },
            { new: true }
        );

        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        res.json({ success: true, data: block });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.createTaskFromBlock = async (req, res) => {
    try {
        const { caseId, blockId } = req.params;
        const { title, dueDate, assignedTo, priority } = req.body;

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        const blockContent = block.content?.map(c => c.plainText || c.text?.content || '').join('') || '';

        const taskData = {
            caseId,
            title: title || blockContent.substring(0, 100),
            description: blockContent,
            dueDate,
            assignedTo,
            priority: priority || 'medium',
            status: 'pending',
            createdBy: req.user._id
        };

        if (req.user.firmId) {
            taskData.firmId = req.user.firmId;
        } else {
            taskData.lawyerId = req.user._id;
        }

        const task = await Task.create(taskData);

        // Link task to block
        block.linkedTaskIds.push(task._id);
        await block.save();

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function updateSyncedBlocks(originalBlockId, updateData) {
    const syncedRecord = await SyncedBlock.findOne({ originalBlockId });

    if (syncedRecord) {
        syncedRecord.content = updateData.content || syncedRecord.content;
        syncedRecord.properties = updateData.properties || syncedRecord.properties;
        await syncedRecord.save();

        for (const synced of syncedRecord.syncedToPages) {
            await CaseNotionBlock.findByIdAndUpdate(synced.blockId, {
                content: syncedRecord.content,
                properties: syncedRecord.properties,
                lastEditedAt: new Date()
            });
        }
    }
}

async function applyTemplateToPage(pageId, templateId, userId) {
    const template = await PageTemplate.findById(templateId);
    if (!template) return;

    // Get existing max order
    const lastBlock = await CaseNotionBlock.findOne({ pageId }).sort({ order: -1 });
    let order = lastBlock ? lastBlock.order + 1 : 0;

    for (const blockTemplate of template.blocks) {
        const block = { ...blockTemplate };
        delete block._id;
        block.pageId = pageId;
        block.order = order++;
        block.lastEditedBy = userId;
        block.lastEditedAt = new Date();
        await CaseNotionBlock.create(block);
    }

    await PageTemplate.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } });
}
