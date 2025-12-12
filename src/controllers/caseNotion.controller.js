const mongoose = require('mongoose');
const CaseNotionPage = require('../models/caseNotionPage.model');
const CaseNotionBlock = require('../models/caseNotionBlock.model');
const BlockConnection = require('../models/blockConnection.model');
const SyncedBlock = require('../models/syncedBlock.model');
const PageTemplate = require('../models/pageTemplate.model');
const BlockComment = require('../models/blockComment.model');
const PageActivity = require('../models/pageActivity.model');
const Task = require('../models/task.model');
const Case = require('../models/case.model');
const PageHistory = require('../models/pageHistory.model');

// ═══════════════════════════════════════════════════════════════
// CASE LIST WITH NOTION STATS (for /dashboard/notion page)
// ═══════════════════════════════════════════════════════════════

exports.listCasesWithNotion = async (req, res) => {
    try {
        const { search, status, sortBy = 'updatedAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
        const userId = req.userID || req.user?._id;

        const matchStage = {
            deletedAt: null
        };

        // Add firm/lawyer filter - include cases from firm OR where user is the lawyer
        if (req.user?.firmId) {
            matchStage.$or = [
                { firmId: new mongoose.Types.ObjectId(req.user.firmId) },
                { lawyerId: new mongoose.Types.ObjectId(userId) }
            ];
        } else {
            matchStage.lawyerId = new mongoose.Types.ObjectId(userId);
        }

        if (search) {
            // If we already have $or for firm/lawyer filter, we need to use $and
            const searchCondition = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { caseNumber: { $regex: search, $options: 'i' } }
                ]
            };
            if (matchStage.$or) {
                matchStage.$and = [{ $or: matchStage.$or }, searchCondition];
                delete matchStage.$or;
            } else {
                matchStage.$or = searchCondition.$or;
            }
        }

        if (status && status !== 'all') {
            matchStage.status = status;
        }

        // Sort options
        const sortStage = {};
        sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const cases = await Case.aggregate([
            { $match: matchStage },
            { $sort: sortStage },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'clients',
                    localField: 'clientId',
                    foreignField: '_id',
                    as: 'client'
                }
            },
            { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lawyerId',
                    foreignField: '_id',
                    as: 'assignedTo'
                }
            },
            { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'casenotionpages',
                    let: { caseId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$caseId', '$$caseId'] },
                                deletedAt: null,
                                archivedAt: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    as: 'notionStats'
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    caseNumber: 1,
                    status: 1,
                    category: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    clientId: {
                        _id: '$client._id',
                        name: { $ifNull: ['$client.companyName', { $concat: ['$client.firstName', ' ', '$client.lastName'] }] }
                    },
                    assignedTo: {
                        _id: '$assignedTo._id',
                        firstName: '$assignedTo.firstName',
                        lastName: '$assignedTo.lastName'
                    },
                    notionPagesCount: {
                        $ifNull: [{ $arrayElemAt: ['$notionStats.count', 0] }, 0]
                    }
                }
            }
        ]);

        const total = await Case.countDocuments(matchStage);

        res.json({
            success: true,
            data: {
                cases,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// PAGE CONTROLLERS
// ═══════════════════════════════════════════════════════════════

exports.listPages = async (req, res) => {
    try {
        const { caseId } = req.params;
        const { pageType, search, isFavorite, isPinned, isArchived, page = 1, limit = 50 } = req.query;
        const userId = req.userID || req.user?._id;

        // DEBUG: Log all inputs
        console.log('=== caseNotion.listPages DEBUG ===');
        console.log('URL:', req.originalUrl);
        console.log('caseId:', caseId);
        console.log('req.userID:', req.userID);
        console.log('req.user?._id:', req.user?._id?.toString());
        console.log('userId resolved to:', userId?.toString());
        console.log('req.user?.firmId:', req.user?.firmId?.toString());
        console.log('req.case (from middleware):', req.case?._id?.toString());

        const query = {
            caseId,
            deletedAt: null
        };

        // Add firm/lawyer filter - include pages from firm OR created by user
        if (req.user?.firmId) {
            query.$or = [
                { firmId: req.user.firmId },
                { lawyerId: userId },
                { createdBy: userId }
            ];
            console.log('Firm user - using $or filter');
        } else {
            query.$or = [
                { lawyerId: userId },
                { createdBy: userId }
            ];
            console.log('Non-firm user - using $or filter with lawyerId/createdBy');
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

        console.log('Final query:', JSON.stringify(query, null, 2));

        const pages = await CaseNotionPage.find(query)
            .sort({ isPinned: -1, isFavorite: -1, updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('createdBy', 'firstName lastName')
            .populate('lastEditedBy', 'firstName lastName');

        const count = await CaseNotionPage.countDocuments(query);

        console.log('Found', count, 'pages');

        res.json({
            success: true,
            data: { pages, count, totalPages: Math.ceil(count / limit) }
        });
    } catch (error) {
        console.log('listPages ERROR:', error.message);
        res.status(500).json({ error: true, message: error.message });
    }
};

exports.getPage = async (req, res) => {
    try {
        const { caseId, pageId } = req.params;
        const userId = req.userID || req.user?._id;

        const query = {
            _id: pageId,
            caseId,
            deletedAt: null
        };

        // Add firm/lawyer filter - include pages from firm OR created by user
        if (req.user?.firmId) {
            query.$or = [
                { firmId: req.user.firmId },
                { lawyerId: userId },
                { createdBy: userId }
            ];
        } else {
            query.$or = [
                { lawyerId: userId },
                { createdBy: userId }
            ];
        }

        const page = await CaseNotionPage.findOne(query)
            .populate('createdBy', 'firstName lastName')
            .populate('lastEditedBy', 'firstName lastName')
            .populate('parentPageId', 'title titleAr')
            .populate('childPageIds', 'title titleAr icon');

        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        // Get blocks with all whiteboard fields
        // Sort by zIndex for whiteboard, by order for document
        const sortField = page.viewMode === 'whiteboard' ? { zIndex: 1, order: 1 } : { order: 1 };

        const blocks = await CaseNotionBlock.find({
            pageId,
            isDeleted: { $ne: true }
        })
            .sort(sortField)
            .populate('lastEditedBy', 'firstName lastName')
            .populate('lockedBy', 'firstName lastName')
            .populate('linkedTaskId', 'title status priority')
            .populate('boundElements.id')
            .populate('frameChildren', 'canvasX canvasY canvasWidth canvasHeight shapeType');

        // Get connections with populated source/target
        const connections = await BlockConnection.find({
            pageId,
            isDeleted: { $ne: true }
        })
            .populate('sourceBlockId', 'canvasX canvasY canvasWidth canvasHeight handles shapeType')
            .populate('targetBlockId', 'canvasX canvasY canvasWidth canvasHeight handles shapeType')
            .populate('createdBy', 'firstName lastName');

        // Transform blocks for frontend
        const transformedBlocks = blocks.map(block => {
            const blockObj = block.toObject();

            // For whiteboard mode, ensure all canvas fields are present
            if (page.viewMode === 'whiteboard') {
                return {
                    ...blockObj,
                    // Ensure these fields exist with defaults
                    canvasX: blockObj.canvasX ?? 0,
                    canvasY: blockObj.canvasY ?? 0,
                    canvasWidth: blockObj.canvasWidth ?? 200,
                    canvasHeight: blockObj.canvasHeight ?? 150,
                    angle: blockObj.angle ?? 0,
                    opacity: blockObj.opacity ?? 100,
                    zIndex: blockObj.zIndex ?? 'a0',
                    shapeType: blockObj.shapeType ?? 'note',
                    strokeColor: blockObj.strokeColor ?? '#000000',
                    strokeWidth: blockObj.strokeWidth ?? 2,
                    fillStyle: blockObj.fillStyle ?? 'solid',
                    handles: blockObj.handles ?? [
                        { id: 'top', position: 'top', type: 'both' },
                        { id: 'right', position: 'right', type: 'both' },
                        { id: 'bottom', position: 'bottom', type: 'both' },
                        { id: 'left', position: 'left', type: 'both' }
                    ],
                    boundElements: blockObj.boundElements ?? []
                };
            }

            return blockObj;
        });

        res.json({
            success: true,
            data: {
                ...page.toObject(),
                blocks: transformedBlocks,
                connections,
                // Include whiteboard config with defaults
                whiteboardConfig: {
                    canvasWidth: 5000,
                    canvasHeight: 5000,
                    zoom: 1,
                    panX: 0,
                    panY: 0,
                    gridEnabled: true,
                    snapToGrid: true,
                    gridSize: 20,
                    ...page.whiteboardConfig
                }
            }
        });
    } catch (error) {
        console.error('Error getting page:', error);
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
                $set: {
                    ...updateData,
                    lastEditedBy: req.user._id,
                    lastVersionAt: new Date()
                },
                $inc: { version: 1 }
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
        const { type, content, properties, parentId, afterBlockId, canvasX, canvasY, canvasWidth, canvasHeight, blockColor } = req.body;

        // Get page to check if it's whiteboard mode
        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

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

        // Build block data
        const blockData = {
            pageId,
            type,
            content,
            properties,
            parentId,
            order,
            lastEditedBy: req.user._id,
            lastEditedAt: new Date()
        };

        // Auto-calculate canvas position for whiteboard mode if not provided
        if (page.viewMode === 'whiteboard') {
            const GRID_COLS = 4;
            const BLOCK_WIDTH = 250;
            const BLOCK_HEIGHT = 200;
            const GAP_X = 50;
            const GAP_Y = 50;
            const START_X = 100;
            const START_Y = 100;

            // Use provided position or calculate based on order
            blockData.canvasX = canvasX !== undefined ? canvasX : START_X + (order % GRID_COLS) * (BLOCK_WIDTH + GAP_X);
            blockData.canvasY = canvasY !== undefined ? canvasY : START_Y + Math.floor(order / GRID_COLS) * (BLOCK_HEIGHT + GAP_Y);
            blockData.canvasWidth = canvasWidth || 200;
            blockData.canvasHeight = canvasHeight || 150;
            blockData.blockColor = blockColor || 'default';
        }

        const block = await CaseNotionBlock.create(blockData);

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

        // Handle both formats: direct fields or wrapped in 'data' object
        const inputData = req.body.data || req.body;

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

        // Build update object
        const updateData = {
            lastEditedBy: req.user._id,
            lastEditedAt: new Date()
        };

        // Handle standard block fields
        if (inputData.content !== undefined) updateData.content = inputData.content;
        if (inputData.type !== undefined) updateData.type = inputData.type;
        if (inputData.order !== undefined) updateData.order = inputData.order;
        if (inputData.indent !== undefined) updateData.indent = inputData.indent;
        if (inputData.isCollapsed !== undefined) updateData.isCollapsed = inputData.isCollapsed;
        if (inputData.checked !== undefined) updateData.checked = inputData.checked;
        if (inputData.language !== undefined) updateData.language = inputData.language;
        if (inputData.icon !== undefined) updateData.icon = inputData.icon;
        if (inputData.color !== undefined) updateData.color = inputData.color;
        if (inputData.tableData !== undefined) updateData.tableData = inputData.tableData;
        if (inputData.fileUrl !== undefined) updateData.fileUrl = inputData.fileUrl;
        if (inputData.fileName !== undefined) updateData.fileName = inputData.fileName;
        if (inputData.caption !== undefined) updateData.caption = inputData.caption;

        // Handle whiteboard fields from top-level
        if (inputData.canvasX !== undefined) updateData.canvasX = inputData.canvasX;
        if (inputData.canvasY !== undefined) updateData.canvasY = inputData.canvasY;
        if (inputData.canvasWidth !== undefined) updateData.canvasWidth = inputData.canvasWidth;
        if (inputData.canvasHeight !== undefined) updateData.canvasHeight = inputData.canvasHeight;
        if (inputData.blockColor !== undefined) updateData.blockColor = inputData.blockColor;
        if (inputData.priority !== undefined) updateData.priority = inputData.priority;
        if (inputData.linkedEventId !== undefined) updateData.linkedEventId = inputData.linkedEventId;
        if (inputData.linkedTaskId !== undefined) updateData.linkedTaskId = inputData.linkedTaskId;
        if (inputData.linkedHearingId !== undefined) updateData.linkedHearingId = inputData.linkedHearingId;
        if (inputData.linkedDocumentId !== undefined) updateData.linkedDocumentId = inputData.linkedDocumentId;
        if (inputData.groupId !== undefined) updateData.groupId = inputData.groupId;
        if (inputData.groupName !== undefined) updateData.groupName = inputData.groupName;

        // Handle legal-specific fields
        if (inputData.partyType !== undefined) updateData.partyType = inputData.partyType;
        if (inputData.statementDate !== undefined) updateData.statementDate = inputData.statementDate;
        if (inputData.evidenceType !== undefined) updateData.evidenceType = inputData.evidenceType;
        if (inputData.evidenceDate !== undefined) updateData.evidenceDate = inputData.evidenceDate;
        if (inputData.evidenceSource !== undefined) updateData.evidenceSource = inputData.evidenceSource;
        if (inputData.citationType !== undefined) updateData.citationType = inputData.citationType;
        if (inputData.citationReference !== undefined) updateData.citationReference = inputData.citationReference;
        if (inputData.eventDate !== undefined) updateData.eventDate = inputData.eventDate;
        if (inputData.eventType !== undefined) updateData.eventType = inputData.eventType;

        // Also handle nested 'properties' object for backwards compatibility
        if (inputData.properties) {
            const props = inputData.properties;
            if (props.canvasX !== undefined) updateData.canvasX = props.canvasX;
            if (props.canvasY !== undefined) updateData.canvasY = props.canvasY;
            if (props.canvasWidth !== undefined) updateData.canvasWidth = props.canvasWidth;
            if (props.canvasHeight !== undefined) updateData.canvasHeight = props.canvasHeight;
            if (props.blockColor !== undefined) updateData.blockColor = props.blockColor;
            if (props.priority !== undefined) updateData.priority = props.priority;
            if (props.linkedEventId !== undefined) updateData.linkedEventId = props.linkedEventId;
            if (props.linkedTaskId !== undefined) updateData.linkedTaskId = props.linkedTaskId;
            if (props.linkedHearingId !== undefined) updateData.linkedHearingId = props.linkedHearingId;
            if (props.linkedDocumentId !== undefined) updateData.linkedDocumentId = props.linkedDocumentId;
            if (props.groupId !== undefined) updateData.groupId = props.groupId;
            if (props.groupName !== undefined) updateData.groupName = props.groupName;
            if (props.eventDate !== undefined) updateData.eventDate = props.eventDate;
            if (props.partyType !== undefined) updateData.partyType = props.partyType;
            if (props.evidenceType !== undefined) updateData.evidenceType = props.evidenceType;
        }

        Object.assign(block, updateData);
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

        // Delete all connections associated with this block (whiteboard feature)
        await deleteBlockConnections(blockId);

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
        const userId = req.userID || req.user?._id;

        if (!q || q.length < 2) {
            return res.json({ success: true, data: { results: [], count: 0 } });
        }

        const query = {
            caseId,
            deletedAt: null,
            archivedAt: null
        };

        // Add firm/lawyer filter - include pages from firm OR created by user
        if (req.user?.firmId) {
            query.$or = [
                { firmId: req.user.firmId },
                { lawyerId: userId },
                { createdBy: userId }
            ];
        } else {
            query.$or = [
                { lawyerId: userId },
                { createdBy: userId }
            ];
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
// WHITEBOARD - BLOCK POSITION/SIZE/STYLING CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Update block canvas position
 * PATCH /api/v1/cases/:caseId/notion/blocks/:blockId/position
 */
exports.updateBlockPosition = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { canvasX, canvasY } = req.body;

        // Validate coordinates
        if (canvasX < 0 || canvasX > 10000 || canvasY < 0 || canvasY > 10000) {
            return res.status(400).json({
                error: true,
                message: 'Invalid position coordinates. Must be between 0 and 10000.'
            });
        }

        const block = await CaseNotionBlock.findByIdAndUpdate(
            blockId,
            {
                canvasX: Math.round(canvasX),
                canvasY: Math.round(canvasY),
                lastEditedBy: req.user._id,
                lastEditedAt: new Date()
            },
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

/**
 * Update block canvas size
 * PATCH /api/v1/cases/:caseId/notion/blocks/:blockId/size
 */
exports.updateBlockSize = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { canvasWidth, canvasHeight } = req.body;

        // Validate dimensions
        if (canvasWidth !== undefined && (canvasWidth < 150 || canvasWidth > 800)) {
            return res.status(400).json({
                error: true,
                message: 'Width must be between 150 and 800 pixels'
            });
        }
        if (canvasHeight !== undefined && (canvasHeight < 100 || canvasHeight > 600)) {
            return res.status(400).json({
                error: true,
                message: 'Height must be between 100 and 600 pixels'
            });
        }

        const updateData = {
            lastEditedBy: req.user._id,
            lastEditedAt: new Date()
        };

        if (canvasWidth !== undefined) updateData.canvasWidth = Math.round(canvasWidth);
        if (canvasHeight !== undefined) updateData.canvasHeight = Math.round(canvasHeight);

        const block = await CaseNotionBlock.findByIdAndUpdate(
            blockId,
            updateData,
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

/**
 * Update block color
 * PATCH /api/v1/cases/:caseId/notion/blocks/:blockId/color
 */
exports.updateBlockColor = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { blockColor } = req.body;

        const validColors = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];
        if (!validColors.includes(blockColor)) {
            return res.status(400).json({
                error: true,
                message: `Invalid color. Must be one of: ${validColors.join(', ')}`
            });
        }

        const block = await CaseNotionBlock.findByIdAndUpdate(
            blockId,
            {
                blockColor,
                lastEditedBy: req.user._id,
                lastEditedAt: new Date()
            },
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

/**
 * Update block priority
 * PATCH /api/v1/cases/:caseId/notion/blocks/:blockId/priority
 */
exports.updateBlockPriority = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { priority } = req.body;

        const validPriorities = ['low', 'medium', 'high', 'urgent', null];
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid priority. Must be one of: low, medium, high, urgent, or null'
            });
        }

        const block = await CaseNotionBlock.findByIdAndUpdate(
            blockId,
            {
                priority,
                lastEditedBy: req.user._id,
                lastEditedAt: new Date()
            },
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

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - ENTITY LINKING CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Link block to a case event
 * POST /api/v1/cases/:caseId/notion/blocks/:blockId/link-event
 */
exports.linkBlockToEvent = async (req, res) => {
    try {
        const { caseId, blockId } = req.params;
        const { eventId } = req.body;

        // Verify event belongs to this case
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            return res.status(404).json({ error: true, message: 'Case not found' });
        }

        const eventExists = caseDoc.timeline?.some(e => e._id.toString() === eventId);
        if (!eventExists) {
            return res.status(400).json({
                error: true,
                message: 'Event not found in this case'
            });
        }

        const block = await CaseNotionBlock.findByIdAndUpdate(
            blockId,
            {
                linkedEventId: eventId,
                lastEditedBy: req.user._id,
                lastEditedAt: new Date()
            },
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

/**
 * Link block to a case hearing
 * POST /api/v1/cases/:caseId/notion/blocks/:blockId/link-hearing
 */
exports.linkBlockToHearing = async (req, res) => {
    try {
        const { caseId, blockId } = req.params;
        const { hearingId } = req.body;

        // Verify hearing belongs to this case
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            return res.status(404).json({ error: true, message: 'Case not found' });
        }

        const hearingExists = caseDoc.hearings?.some(h => h._id.toString() === hearingId);
        if (!hearingExists) {
            return res.status(400).json({
                error: true,
                message: 'Hearing not found in this case'
            });
        }

        const block = await CaseNotionBlock.findByIdAndUpdate(
            blockId,
            {
                linkedHearingId: hearingId,
                lastEditedBy: req.user._id,
                lastEditedAt: new Date()
            },
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

/**
 * Link block to a case document
 * POST /api/v1/cases/:caseId/notion/blocks/:blockId/link-document
 */
exports.linkBlockToDocument = async (req, res) => {
    try {
        const { caseId, blockId } = req.params;
        const { documentId } = req.body;

        // Verify document belongs to this case
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            return res.status(404).json({ error: true, message: 'Case not found' });
        }

        const documentExists = caseDoc.documents?.some(d => d._id.toString() === documentId);
        if (!documentExists) {
            return res.status(400).json({
                error: true,
                message: 'Document not found in this case'
            });
        }

        const block = await CaseNotionBlock.findByIdAndUpdate(
            blockId,
            {
                linkedDocumentId: documentId,
                lastEditedBy: req.user._id,
                lastEditedAt: new Date()
            },
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

/**
 * Remove all entity links from a block
 * DELETE /api/v1/cases/:caseId/notion/blocks/:blockId/unlink
 */
exports.unlinkBlock = async (req, res) => {
    try {
        const { blockId } = req.params;

        const block = await CaseNotionBlock.findByIdAndUpdate(
            blockId,
            {
                linkedEventId: null,
                linkedTaskId: null,
                linkedHearingId: null,
                linkedDocumentId: null,
                lastEditedBy: req.user._id,
                lastEditedAt: new Date()
            },
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

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - CONNECTION CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all connections for a page
 * GET /api/v1/cases/:caseId/notion/pages/:pageId/connections
 */
exports.getConnections = async (req, res) => {
    try {
        const { pageId } = req.params;

        const connections = await BlockConnection.find({ pageId })
            .populate('sourceBlockId', 'type content')
            .populate('targetBlockId', 'type content')
            .populate('createdBy', 'firstName lastName');

        res.json({ success: true, data: connections });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Create connection with bidirectional binding
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/connections
 */
exports.createConnection = async (req, res) => {
    try {
        const { pageId } = req.params;
        const {
            sourceBlockId,
            targetBlockId,
            sourceHandle,
            targetHandle,
            connectionType,
            pathType,
            label,
            color,
            strokeWidth,
            animated,
            markerStart,
            markerEnd
        } = req.body;

        // Validate blocks exist
        const [sourceBlock, targetBlock] = await Promise.all([
            CaseNotionBlock.findById(sourceBlockId),
            CaseNotionBlock.findById(targetBlockId)
        ]);

        if (!sourceBlock || !targetBlock) {
            return res.status(404).json({ error: true, message: 'Source or target block not found' });
        }

        // Prevent self-connection
        if (sourceBlockId === targetBlockId) {
            return res.status(400).json({ error: true, message: 'Cannot connect block to itself' });
        }

        // Check for existing connection
        const existingConnection = await BlockConnection.findOne({
            pageId,
            sourceBlockId,
            targetBlockId,
            isDeleted: { $ne: true }
        });

        if (existingConnection) {
            return res.status(400).json({ error: true, message: 'Connection already exists' });
        }

        // Create connection
        const connection = await BlockConnection.create({
            pageId,
            sourceBlockId,
            targetBlockId,
            sourceHandle: sourceHandle || { position: 'right' },
            targetHandle: targetHandle || { position: 'left' },
            connectionType: connectionType || 'arrow',
            pathType: pathType || 'bezier',
            label,
            color: color || '#6b7280',
            strokeWidth: strokeWidth || 2,
            animated: animated || false,
            markerStart: markerStart || { type: 'none' },
            markerEnd: markerEnd || { type: 'arrow' },
            createdBy: req.user._id,
            version: 1
        });

        // Update boundElements on both blocks (bidirectional binding)
        await Promise.all([
            CaseNotionBlock.findByIdAndUpdate(sourceBlockId, {
                $push: { boundElements: { id: connection._id, type: 'arrow' } },
                $inc: { version: 1 }
            }),
            CaseNotionBlock.findByIdAndUpdate(targetBlockId, {
                $push: { boundElements: { id: connection._id, type: 'arrow' } },
                $inc: { version: 1 }
            })
        ]);

        // Populate and return
        const populatedConnection = await BlockConnection.findById(connection._id)
            .populate('sourceBlockId', 'canvasX canvasY canvasWidth canvasHeight handles')
            .populate('targetBlockId', 'canvasX canvasY canvasWidth canvasHeight handles');

        res.status(201).json({ success: true, data: populatedConnection });
    } catch (error) {
        console.error('Error creating connection:', error);
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Update a connection
 * PATCH /api/v1/cases/:caseId/notion/connections/:connectionId
 */
exports.updateConnection = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { connectionType, label, color } = req.body;

        const updateData = {};
        if (connectionType !== undefined) updateData.connectionType = connectionType;
        if (label !== undefined) updateData.label = label;
        if (color !== undefined) updateData.color = color;

        const connection = await BlockConnection.findByIdAndUpdate(
            connectionId,
            updateData,
            { new: true }
        );

        if (!connection) {
            return res.status(404).json({ error: true, message: 'Connection not found' });
        }

        res.json({ success: true, data: connection });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Delete connection and remove from boundElements
 * DELETE /api/v1/cases/:caseId/notion/connections/:connectionId
 */
exports.deleteConnection = async (req, res) => {
    try {
        const { connectionId } = req.params;

        const connection = await BlockConnection.findById(connectionId);
        if (!connection) {
            return res.status(404).json({ error: true, message: 'Connection not found' });
        }

        // Remove from boundElements on both blocks
        await Promise.all([
            CaseNotionBlock.findByIdAndUpdate(connection.sourceBlockId, {
                $pull: { boundElements: { id: connection._id } },
                $inc: { version: 1 }
            }),
            CaseNotionBlock.findByIdAndUpdate(connection.targetBlockId, {
                $pull: { boundElements: { id: connection._id } },
                $inc: { version: 1 }
            })
        ]);

        // Soft delete or hard delete
        await BlockConnection.findByIdAndDelete(connectionId);

        res.json({ success: true, message: 'Connection deleted' });
    } catch (error) {
        console.error('Error deleting connection:', error);
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Update connection path when connected elements move
 * This should be called when dragging elements
 * GET /api/v1/cases/:caseId/notion/blocks/:blockId/connections
 */
exports.updateConnectionPaths = async (req, res) => {
    try {
        const { blockId } = req.params;

        // Find all connections where this block is source or target
        const connections = await BlockConnection.find({
            $or: [
                { sourceBlockId: blockId },
                { targetBlockId: blockId }
            ],
            isDeleted: { $ne: true }
        }).populate('sourceBlockId targetBlockId');

        // Return updated connection data for frontend to recalculate paths
        res.json({ success: true, data: connections });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - PAGE VIEW MODE CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Update page view mode
 * PATCH /api/v1/cases/:caseId/notion/pages/:pageId/view-mode
 */
exports.updateViewMode = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { viewMode } = req.body;

        if (!['document', 'whiteboard'].includes(viewMode)) {
            return res.status(400).json({
                error: true,
                message: 'viewMode must be either "document" or "whiteboard"'
            });
        }

        const page = await CaseNotionPage.findByIdAndUpdate(
            pageId,
            {
                viewMode,
                lastEditedBy: req.user._id
            },
            { new: true }
        );

        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        // When switching to whiteboard mode, auto-position blocks that are all at 0,0
        let updatedBlocks = [];
        if (viewMode === 'whiteboard') {
            const blocks = await CaseNotionBlock.find({ pageId }).sort({ order: 1 });

            // Check if all blocks are stacked at 0,0 (need repositioning)
            const allAtOrigin = blocks.every(b => (b.canvasX === 0 || b.canvasX === undefined) && (b.canvasY === 0 || b.canvasY === undefined));

            if (allAtOrigin && blocks.length > 0) {
                const GRID_COLS = 4;
                const BLOCK_WIDTH = 250;
                const BLOCK_HEIGHT = 200;
                const GAP_X = 50;
                const GAP_Y = 50;
                const START_X = 100;
                const START_Y = 100;

                // Spread blocks across the canvas
                const bulkOps = blocks.map((block, i) => ({
                    updateOne: {
                        filter: { _id: block._id },
                        update: {
                            $set: {
                                canvasX: START_X + (i % GRID_COLS) * (BLOCK_WIDTH + GAP_X),
                                canvasY: START_Y + Math.floor(i / GRID_COLS) * (BLOCK_HEIGHT + GAP_Y),
                                canvasWidth: block.canvasWidth || 200,
                                canvasHeight: block.canvasHeight || 150,
                                blockColor: block.blockColor || 'default'
                            }
                        }
                    }
                }));

                await CaseNotionBlock.bulkWrite(bulkOps);
            }

            // Fetch updated blocks with new positions
            updatedBlocks = await CaseNotionBlock.find({ pageId })
                .sort({ order: 1 })
                .populate('lastEditedBy', 'firstName lastName')
                .populate('lockedBy', 'firstName lastName')
                .populate('linkedTaskId', 'title status priority');
        }

        // Get connections for whiteboard view
        const connections = viewMode === 'whiteboard'
            ? await BlockConnection.find({ pageId })
            : [];

        res.json({
            success: true,
            data: {
                ...page.toObject(),
                blocks: updatedBlocks,
                connections
            }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Update whiteboard configuration
 * PATCH /api/v1/cases/:caseId/notion/pages/:pageId/whiteboard-config
 */
exports.updateWhiteboardConfig = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { canvasWidth, canvasHeight, zoom, panX, panY, gridEnabled, snapToGrid, gridSize } = req.body;

        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        // Merge with existing config
        const whiteboardConfig = {
            ...page.whiteboardConfig?.toObject?.() || {},
        };

        if (canvasWidth !== undefined) whiteboardConfig.canvasWidth = canvasWidth;
        if (canvasHeight !== undefined) whiteboardConfig.canvasHeight = canvasHeight;
        if (zoom !== undefined) whiteboardConfig.zoom = Math.max(0.25, Math.min(2, zoom));
        if (panX !== undefined) whiteboardConfig.panX = panX;
        if (panY !== undefined) whiteboardConfig.panY = panY;
        if (gridEnabled !== undefined) whiteboardConfig.gridEnabled = gridEnabled;
        if (snapToGrid !== undefined) whiteboardConfig.snapToGrid = snapToGrid;
        if (gridSize !== undefined) whiteboardConfig.gridSize = Math.max(10, Math.min(50, gridSize));

        page.whiteboardConfig = whiteboardConfig;
        page.lastEditedBy = req.user._id;
        await page.save();

        res.json({ success: true, data: page });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - FRAME MANAGEMENT CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Add element to frame
 * POST /api/v1/cases/:caseId/notion/frames/:frameId/children
 */
exports.addToFrame = async (req, res) => {
    try {
        const { frameId } = req.params;
        const { elementId } = req.body;

        const frame = await CaseNotionBlock.findById(frameId);
        if (!frame || !frame.isFrame) {
            return res.status(404).json({ error: true, message: 'Frame not found' });
        }

        const element = await CaseNotionBlock.findById(elementId);
        if (!element) {
            return res.status(404).json({ error: true, message: 'Element not found' });
        }

        // Add to frame children if not already there
        if (!frame.frameChildren.includes(elementId)) {
            frame.frameChildren.push(elementId);
            frame.version += 1;
            await frame.save();
        }

        res.json({ success: true, data: frame });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Remove element from frame
 * DELETE /api/v1/cases/:caseId/notion/frames/:frameId/children/:elementId
 */
exports.removeFromFrame = async (req, res) => {
    try {
        const { frameId, elementId } = req.params;

        const frame = await CaseNotionBlock.findById(frameId);
        if (!frame || !frame.isFrame) {
            return res.status(404).json({ error: true, message: 'Frame not found' });
        }

        frame.frameChildren = frame.frameChildren.filter(
            id => id.toString() !== elementId
        );
        frame.version += 1;
        await frame.save();

        res.json({ success: true, data: frame });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Get all elements in a frame
 * GET /api/v1/cases/:caseId/notion/frames/:frameId/children
 */
exports.getFrameChildren = async (req, res) => {
    try {
        const { frameId } = req.params;

        const frame = await CaseNotionBlock.findById(frameId)
            .populate('frameChildren');

        if (!frame || !frame.isFrame) {
            return res.status(404).json({ error: true, message: 'Frame not found' });
        }

        res.json({ success: true, data: frame.frameChildren });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Auto-detect elements inside frame bounds
 * POST /api/v1/cases/:caseId/notion/frames/:frameId/auto-detect
 */
exports.autoDetectFrameChildren = async (req, res) => {
    try {
        const { frameId } = req.params;

        const frame = await CaseNotionBlock.findById(frameId);
        if (!frame || !frame.isFrame) {
            return res.status(404).json({ error: true, message: 'Frame not found' });
        }

        // Find all elements that are within the frame bounds
        const elementsInBounds = await CaseNotionBlock.find({
            pageId: frame.pageId,
            _id: { $ne: frameId },
            isFrame: { $ne: true },
            isDeleted: { $ne: true },
            canvasX: { $gte: frame.canvasX, $lte: frame.canvasX + frame.canvasWidth },
            canvasY: { $gte: frame.canvasY, $lte: frame.canvasY + frame.canvasHeight }
        });

        // Update frame children
        frame.frameChildren = elementsInBounds.map(e => e._id);
        frame.version += 1;
        await frame.save();

        res.json({
            success: true,
            data: frame,
            childCount: elementsInBounds.length
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Move frame with all children
 * PATCH /api/v1/cases/:caseId/notion/frames/:frameId/move
 */
exports.moveFrameWithChildren = async (req, res) => {
    try {
        const { frameId } = req.params;
        const { deltaX, deltaY } = req.body;

        const frame = await CaseNotionBlock.findById(frameId)
            .populate('frameChildren');

        if (!frame || !frame.isFrame) {
            return res.status(404).json({ error: true, message: 'Frame not found' });
        }

        // Move frame
        const bulkOps = [{
            updateOne: {
                filter: { _id: frameId },
                update: {
                    $set: {
                        canvasX: frame.canvasX + deltaX,
                        canvasY: frame.canvasY + deltaY
                    },
                    $inc: { version: 1 }
                }
            }
        }];

        // Move all children
        for (const child of frame.frameChildren) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: child._id },
                    update: {
                        $set: {
                            canvasX: child.canvasX + deltaX,
                            canvasY: child.canvasY + deltaY
                        },
                        $inc: { version: 1 }
                    }
                }
            });
        }

        await CaseNotionBlock.bulkWrite(bulkOps);

        // Return updated frame with children
        const updatedFrame = await CaseNotionBlock.findById(frameId)
            .populate('frameChildren');

        res.json({ success: true, data: updatedFrame });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - UNDO/REDO CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Record an action for undo/redo
 * Internal helper function
 */
async function recordHistory(pageId, userId, actionType, elementIds, connectionIds, previousState, newState) {
    try {
        // Get next sequence number
        const lastHistory = await PageHistory.findOne({ pageId, userId })
            .sort({ sequence: -1 });
        const sequence = (lastHistory?.sequence || 0) + 1;

        // Clear any redo stack (actions after current position)
        await PageHistory.deleteMany({
            pageId,
            userId,
            isUndone: true
        });

        // Create history entry
        await PageHistory.create({
            pageId,
            userId,
            actionType,
            elementIds,
            connectionIds,
            previousState,
            newState,
            sequence
        });

        // Cleanup old history
        await PageHistory.cleanupOldHistory(pageId, userId);
    } catch (error) {
        console.error('Error recording history:', error);
    }
}

/**
 * Undo last action
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/undo
 */
exports.undo = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.user._id;

        // Get last non-undone action
        const lastAction = await PageHistory.findOne({
            pageId,
            userId,
            isUndone: false
        }).sort({ sequence: -1 });

        if (!lastAction) {
            return res.status(400).json({
                error: true,
                message: 'Nothing to undo'
            });
        }

        // Apply previous state
        const { actionType, elementIds, connectionIds, previousState } = lastAction;

        switch (actionType) {
            case 'create_element':
                // Delete the created elements
                await CaseNotionBlock.updateMany(
                    { _id: { $in: elementIds } },
                    { $set: { isDeleted: true } }
                );
                break;

            case 'delete_element':
                // Restore deleted elements
                await CaseNotionBlock.updateMany(
                    { _id: { $in: elementIds } },
                    { $set: { isDeleted: false } }
                );
                break;

            case 'update_element':
            case 'move_element':
            case 'resize_element':
            case 'rotate_element':
            case 'style_element':
                // Restore previous state for each element
                for (const state of previousState) {
                    await CaseNotionBlock.findByIdAndUpdate(
                        state._id,
                        { $set: state }
                    );
                }
                break;

            case 'create_connection':
                await BlockConnection.updateMany(
                    { _id: { $in: connectionIds } },
                    { $set: { isDeleted: true } }
                );
                break;

            case 'delete_connection':
                await BlockConnection.updateMany(
                    { _id: { $in: connectionIds } },
                    { $set: { isDeleted: false } }
                );
                break;

            case 'batch_update':
                for (const state of previousState) {
                    await CaseNotionBlock.findByIdAndUpdate(
                        state._id,
                        { $set: state }
                    );
                }
                break;

            case 'group':
                await CaseNotionBlock.updateMany(
                    { _id: { $in: elementIds } },
                    { $set: { groupId: null, groupName: null } }
                );
                break;

            case 'ungroup':
                for (const state of previousState) {
                    await CaseNotionBlock.findByIdAndUpdate(
                        state._id,
                        { $set: { groupId: state.groupId, groupName: state.groupName } }
                    );
                }
                break;
        }

        // Mark action as undone
        lastAction.isUndone = true;
        await lastAction.save();

        res.json({
            success: true,
            message: `Undid: ${actionType}`,
            actionType
        });
    } catch (error) {
        console.error('Error in undo:', error);
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Redo last undone action
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/redo
 */
exports.redo = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.user._id;

        // Get last undone action
        const lastUndone = await PageHistory.findOne({
            pageId,
            userId,
            isUndone: true
        }).sort({ sequence: -1 });

        if (!lastUndone) {
            return res.status(400).json({
                error: true,
                message: 'Nothing to redo'
            });
        }

        // Apply new state
        const { actionType, elementIds, connectionIds, newState } = lastUndone;

        switch (actionType) {
            case 'create_element':
                await CaseNotionBlock.updateMany(
                    { _id: { $in: elementIds } },
                    { $set: { isDeleted: false } }
                );
                break;

            case 'delete_element':
                await CaseNotionBlock.updateMany(
                    { _id: { $in: elementIds } },
                    { $set: { isDeleted: true } }
                );
                break;

            case 'update_element':
            case 'move_element':
            case 'resize_element':
            case 'rotate_element':
            case 'style_element':
            case 'batch_update':
                for (const state of newState) {
                    await CaseNotionBlock.findByIdAndUpdate(
                        state._id,
                        { $set: state }
                    );
                }
                break;

            case 'create_connection':
                await BlockConnection.updateMany(
                    { _id: { $in: connectionIds } },
                    { $set: { isDeleted: false } }
                );
                break;

            case 'delete_connection':
                await BlockConnection.updateMany(
                    { _id: { $in: connectionIds } },
                    { $set: { isDeleted: true } }
                );
                break;

            case 'group':
                for (const state of newState) {
                    await CaseNotionBlock.findByIdAndUpdate(
                        state._id,
                        { $set: { groupId: state.groupId, groupName: state.groupName } }
                    );
                }
                break;

            case 'ungroup':
                await CaseNotionBlock.updateMany(
                    { _id: { $in: elementIds } },
                    { $set: { groupId: null, groupName: null } }
                );
                break;
        }

        // Mark action as not undone
        lastUndone.isUndone = false;
        await lastUndone.save();

        res.json({
            success: true,
            message: `Redid: ${actionType}`,
            actionType
        });
    } catch (error) {
        console.error('Error in redo:', error);
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Get undo/redo stack status
 * GET /api/v1/cases/:caseId/notion/pages/:pageId/history-status
 */
exports.getHistoryStatus = async (req, res) => {
    try {
        const { pageId } = req.params;
        const userId = req.user._id;

        const [undoStack, redoStack] = await Promise.all([
            PageHistory.getUndoStack(pageId, userId, 10),
            PageHistory.getRedoStack(pageId, userId, 10)
        ]);

        res.json({
            success: true,
            data: {
                canUndo: undoStack.length > 0,
                canRedo: redoStack.length > 0,
                undoCount: undoStack.length,
                redoCount: redoStack.length,
                lastUndoAction: undoStack[0]?.actionType || null,
                lastRedoAction: redoStack[0]?.actionType || null
            }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};


// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - MULTI-SELECT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Duplicate selected elements
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/duplicate
 */
exports.duplicateElements = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { elementIds, offsetX = 50, offsetY = 50 } = req.body;

        if (!Array.isArray(elementIds) || elementIds.length === 0) {
            return res.status(400).json({ error: true, message: 'elementIds array required' });
        }

        const elements = await CaseNotionBlock.find({
            _id: { $in: elementIds },
            pageId
        });

        if (elements.length === 0) {
            return res.status(404).json({ error: true, message: 'No elements found' });
        }

        // Generate new IDs and offset positions
        const duplicates = elements.map(el => {
            const duplicate = el.toObject();
            delete duplicate._id;
            delete duplicate.__v;
            duplicate.canvasX = (duplicate.canvasX || 0) + offsetX;
            duplicate.canvasY = (duplicate.canvasY || 0) + offsetY;
            duplicate.zIndex = incrementZIndex(duplicate.zIndex || 'a0');
            duplicate.version = 1;
            duplicate.versionNonce = Math.floor(Math.random() * 1000000);
            duplicate.lastEditedBy = req.user._id;
            duplicate.lastEditedAt = new Date();
            duplicate.boundElements = []; // Don't copy connections
            return duplicate;
        });

        const newElements = await CaseNotionBlock.insertMany(duplicates);

        res.status(201).json({ success: true, data: newElements });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Delete selected elements
 * DELETE /api/v1/cases/:caseId/notion/pages/:pageId/bulk-delete
 */
exports.bulkDeleteElements = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { elementIds, permanent = false } = req.body;

        if (!Array.isArray(elementIds) || elementIds.length === 0) {
            return res.status(400).json({ error: true, message: 'elementIds array required' });
        }

        // Get all connections involving these elements
        const connections = await BlockConnection.find({
            pageId,
            $or: [
                { sourceBlockId: { $in: elementIds } },
                { targetBlockId: { $in: elementIds } }
            ]
        });

        // Remove connections from boundElements of connected blocks
        const connectionIds = connections.map(c => c._id);
        await CaseNotionBlock.updateMany(
            { pageId, boundElements: { $elemMatch: { id: { $in: connectionIds } } } },
            { $pull: { boundElements: { id: { $in: connectionIds } } } }
        );

        if (permanent) {
            // Hard delete
            await CaseNotionBlock.deleteMany({
                _id: { $in: elementIds },
                pageId
            });
            await BlockConnection.deleteMany({
                _id: { $in: connectionIds }
            });
        } else {
            // Soft delete
            await CaseNotionBlock.updateMany(
                { _id: { $in: elementIds }, pageId },
                { $set: { isDeleted: true }, $inc: { version: 1 } }
            );
            await BlockConnection.updateMany(
                { _id: { $in: connectionIds } },
                { $set: { isDeleted: true } }
            );
        }

        res.json({
            success: true,
            message: `Deleted ${elementIds.length} elements and ${connections.length} connections`
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Group selected elements
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/group
 */
exports.groupElements = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { elementIds, groupName } = req.body;

        if (!Array.isArray(elementIds) || elementIds.length < 2) {
            return res.status(400).json({ error: true, message: 'At least 2 elements required to group' });
        }

        // Generate group ID
        const groupId = new mongoose.Types.ObjectId().toString();

        // Update all elements with group info
        await CaseNotionBlock.updateMany(
            { _id: { $in: elementIds }, pageId },
            {
                $set: {
                    groupId,
                    groupName: groupName || 'Group'
                },
                $inc: { version: 1 }
            }
        );

        // Get updated elements
        const elements = await CaseNotionBlock.find({
            _id: { $in: elementIds },
            pageId
        });

        res.json({ success: true, data: { groupId, elements } });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Ungroup elements
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/ungroup
 */
exports.ungroupElements = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { groupId } = req.body;

        if (!groupId) {
            return res.status(400).json({ error: true, message: 'groupId required' });
        }

        await CaseNotionBlock.updateMany(
            { groupId, pageId },
            {
                $set: { groupId: null, groupName: null },
                $inc: { version: 1 }
            }
        );

        res.json({ success: true, message: 'Elements ungrouped' });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Align selected elements
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/align
 */
exports.alignElements = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { elementIds, alignment } = req.body;
        // alignment: 'left', 'right', 'top', 'bottom', 'center-h', 'center-v'

        if (!Array.isArray(elementIds) || elementIds.length < 2) {
            return res.status(400).json({ error: true, message: 'At least 2 elements required' });
        }

        const elements = await CaseNotionBlock.find({
            _id: { $in: elementIds },
            pageId
        });

        if (elements.length < 2) {
            return res.status(404).json({ error: true, message: 'Elements not found' });
        }

        // Calculate alignment reference
        let referenceValue;
        const bulkOps = [];

        switch (alignment) {
            case 'left':
                referenceValue = Math.min(...elements.map(e => e.canvasX));
                elements.forEach(el => {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: el._id },
                            update: { $set: { canvasX: referenceValue }, $inc: { version: 1 } }
                        }
                    });
                });
                break;
            case 'right':
                referenceValue = Math.max(...elements.map(e => e.canvasX + e.canvasWidth));
                elements.forEach(el => {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: el._id },
                            update: { $set: { canvasX: referenceValue - el.canvasWidth }, $inc: { version: 1 } }
                        }
                    });
                });
                break;
            case 'top':
                referenceValue = Math.min(...elements.map(e => e.canvasY));
                elements.forEach(el => {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: el._id },
                            update: { $set: { canvasY: referenceValue }, $inc: { version: 1 } }
                        }
                    });
                });
                break;
            case 'bottom':
                referenceValue = Math.max(...elements.map(e => e.canvasY + e.canvasHeight));
                elements.forEach(el => {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: el._id },
                            update: { $set: { canvasY: referenceValue - el.canvasHeight }, $inc: { version: 1 } }
                        }
                    });
                });
                break;
            case 'center-h':
                const avgX = elements.reduce((sum, e) => sum + e.canvasX + e.canvasWidth / 2, 0) / elements.length;
                elements.forEach(el => {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: el._id },
                            update: { $set: { canvasX: avgX - el.canvasWidth / 2 }, $inc: { version: 1 } }
                        }
                    });
                });
                break;
            case 'center-v':
                const avgY = elements.reduce((sum, e) => sum + e.canvasY + e.canvasHeight / 2, 0) / elements.length;
                elements.forEach(el => {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: el._id },
                            update: { $set: { canvasY: avgY - el.canvasHeight / 2 }, $inc: { version: 1 } }
                        }
                    });
                });
                break;
            default:
                return res.status(400).json({ error: true, message: 'Invalid alignment' });
        }

        await CaseNotionBlock.bulkWrite(bulkOps);

        const updatedElements = await CaseNotionBlock.find({
            _id: { $in: elementIds },
            pageId
        });

        res.json({ success: true, data: updatedElements });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Distribute elements evenly
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/distribute
 */
exports.distributeElements = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { elementIds, direction } = req.body;
        // direction: 'horizontal', 'vertical'

        if (!Array.isArray(elementIds) || elementIds.length < 3) {
            return res.status(400).json({ error: true, message: 'At least 3 elements required' });
        }

        const elements = await CaseNotionBlock.find({
            _id: { $in: elementIds },
            pageId
        });

        if (elements.length < 3) {
            return res.status(404).json({ error: true, message: 'Elements not found' });
        }

        const bulkOps = [];

        if (direction === 'horizontal') {
            // Sort by X position
            elements.sort((a, b) => a.canvasX - b.canvasX);
            const first = elements[0];
            const last = elements[elements.length - 1];
            const totalWidth = elements.reduce((sum, e) => sum + e.canvasWidth, 0);
            const availableSpace = (last.canvasX + last.canvasWidth) - first.canvasX - totalWidth;
            const gap = availableSpace / (elements.length - 1);

            let currentX = first.canvasX;
            elements.forEach((el, idx) => {
                if (idx > 0) {
                    currentX += elements[idx - 1].canvasWidth + gap;
                }
                bulkOps.push({
                    updateOne: {
                        filter: { _id: el._id },
                        update: { $set: { canvasX: currentX }, $inc: { version: 1 } }
                    }
                });
            });
        } else if (direction === 'vertical') {
            // Sort by Y position
            elements.sort((a, b) => a.canvasY - b.canvasY);
            const first = elements[0];
            const last = elements[elements.length - 1];
            const totalHeight = elements.reduce((sum, e) => sum + e.canvasHeight, 0);
            const availableSpace = (last.canvasY + last.canvasHeight) - first.canvasY - totalHeight;
            const gap = availableSpace / (elements.length - 1);

            let currentY = first.canvasY;
            elements.forEach((el, idx) => {
                if (idx > 0) {
                    currentY += elements[idx - 1].canvasHeight + gap;
                }
                bulkOps.push({
                    updateOne: {
                        filter: { _id: el._id },
                        update: { $set: { canvasY: currentY }, $inc: { version: 1 } }
                    }
                });
            });
        } else {
            return res.status(400).json({ error: true, message: 'Invalid direction' });
        }

        await CaseNotionBlock.bulkWrite(bulkOps);

        const updatedElements = await CaseNotionBlock.find({
            _id: { $in: elementIds },
            pageId
        });

        res.json({ success: true, data: updatedElements });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};
// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Delete all connections for a block (helper function)
 */
async function deleteBlockConnections(blockId) {
    await BlockConnection.deleteMany({
        $or: [
            { sourceBlockId: blockId },
            { targetBlockId: blockId }
        ]
    });
}

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

// Export recordHistory for use by other controllers
exports.recordHistory = recordHistory;

// ═══════════════════════════════════════════════════════════════
// WHITEBOARD - SHAPE CREATION CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a canvas shape (not a document block)
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/shapes
 */
exports.createShape = async (req, res) => {
    try {
        const { pageId } = req.params;
        const {
            shapeType, x, y, width, height,
            angle, opacity, strokeColor, fillStyle, strokeWidth,
            blockColor, text, handles
        } = req.body;

        // Validate page exists and is in whiteboard mode
        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }
        if (page.viewMode !== 'whiteboard') {
            return res.status(400).json({
                error: true,
                message: 'Page must be in whiteboard mode to create shapes'
            });
        }

        // Generate fractional zIndex
        const lastBlock = await CaseNotionBlock.findOne({ pageId, isDeleted: { $ne: true } })
            .sort({ zIndex: -1 });
        const newZIndex = lastBlock?.zIndex ? incrementZIndex(lastBlock.zIndex) : 'a0';

        // Default handles based on shape type
        const defaultHandles = [
            { id: 'top', position: 'top', type: 'both' },
            { id: 'right', position: 'right', type: 'both' },
            { id: 'bottom', position: 'bottom', type: 'both' },
            { id: 'left', position: 'left', type: 'both' }
        ];

        const shape = await CaseNotionBlock.create({
            pageId,
            type: 'text',  // Base type for content
            shapeType: shapeType || 'rectangle',
            canvasX: x || 100,
            canvasY: y || 100,
            canvasWidth: width || 200,
            canvasHeight: height || 150,
            angle: angle || 0,
            opacity: opacity ?? 100,
            strokeColor: strokeColor || '#000000',
            fillStyle: fillStyle || 'solid',
            strokeWidth: strokeWidth || 2,
            blockColor: blockColor || 'default',
            zIndex: newZIndex,
            handles: handles || defaultHandles,
            content: text ? [{ type: 'text', text: { content: text } }] : [],
            lastEditedBy: req.user._id,
            lastEditedAt: new Date(),
            version: 1,
            versionNonce: Math.floor(Math.random() * 1000000)
        });

        res.status(201).json({ success: true, data: shape });
    } catch (error) {
        console.error('Error creating shape:', error);
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Create an arrow/connector shape
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/arrows
 */
exports.createArrow = async (req, res) => {
    try {
        const { pageId } = req.params;
        const {
            startX, startY, endX, endY,
            startType, endType,
            strokeColor, strokeWidth,
            sourceBlockId, targetBlockId,
            sourceHandle, targetHandle
        } = req.body;

        const page = await CaseNotionPage.findById(pageId);
        if (!page || page.viewMode !== 'whiteboard') {
            return res.status(400).json({ error: true, message: 'Invalid page or not in whiteboard mode' });
        }

        // Calculate arrow points
        const arrowPoints = [
            { x: 0, y: 0 },  // Relative start
            { x: (endX || 100) - (startX || 0), y: (endY || 100) - (startY || 0) }  // Relative end
        ];

        // Generate zIndex
        const lastBlock = await CaseNotionBlock.findOne({ pageId, isDeleted: { $ne: true } })
            .sort({ zIndex: -1 });
        const newZIndex = lastBlock?.zIndex ? incrementZIndex(lastBlock.zIndex) : 'a0';

        const arrow = await CaseNotionBlock.create({
            pageId,
            type: 'text',
            shapeType: 'arrow',
            canvasX: startX || 0,
            canvasY: startY || 0,
            canvasWidth: Math.abs((endX || 100) - (startX || 0)) || 100,
            canvasHeight: Math.abs((endY || 100) - (startY || 0)) || 100,
            strokeColor: strokeColor || '#000000',
            strokeWidth: strokeWidth || 2,
            zIndex: newZIndex,
            arrowStart: {
                type: startType || 'none',
                boundElementId: sourceBlockId || null
            },
            arrowEnd: {
                type: endType || 'arrow',
                boundElementId: targetBlockId || null
            },
            arrowPoints,
            lastEditedBy: req.user._id,
            version: 1
        });

        // Update bound elements on source and target if specified
        if (sourceBlockId) {
            await CaseNotionBlock.findByIdAndUpdate(sourceBlockId, {
                $push: { boundElements: { id: arrow._id, type: 'arrow' } }
            });
        }
        if (targetBlockId) {
            await CaseNotionBlock.findByIdAndUpdate(targetBlockId, {
                $push: { boundElements: { id: arrow._id, type: 'arrow' } }
            });
        }

        res.status(201).json({ success: true, data: arrow });
    } catch (error) {
        console.error('Error creating arrow:', error);
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Create a frame (container for other elements)
 * POST /api/v1/cases/:caseId/notion/pages/:pageId/frames
 */
exports.createFrame = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { x, y, width, height, name, backgroundColor } = req.body;

        const page = await CaseNotionPage.findById(pageId);
        if (!page || page.viewMode !== 'whiteboard') {
            return res.status(400).json({ error: true, message: 'Invalid page or not in whiteboard mode' });
        }

        // Frames should be at the back (low zIndex)
        const frame = await CaseNotionBlock.create({
            pageId,
            type: 'text',
            shapeType: 'frame',
            isFrame: true,
            frameName: name || 'Frame',
            canvasX: x || 0,
            canvasY: y || 0,
            canvasWidth: width || 500,
            canvasHeight: height || 400,
            blockColor: backgroundColor || 'default',
            zIndex: '0',  // Frames at back
            strokeColor: '#d1d5db',
            strokeWidth: 2,
            fillStyle: 'none',
            lastEditedBy: req.user._id,
            version: 1
        });

        res.status(201).json({ success: true, data: frame });
    } catch (error) {
        console.error('Error creating frame:', error);
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Update element z-index (bring to front, send to back)
 * PATCH /api/v1/cases/:caseId/notion/blocks/:blockId/z-index
 */
exports.updateZIndex = async (req, res) => {
    try {
        const { blockId } = req.params;
        const { action } = req.body;  // 'front', 'back', 'forward', 'backward'

        const block = await CaseNotionBlock.findById(blockId);
        if (!block) {
            return res.status(404).json({ error: true, message: 'Block not found' });
        }

        let newZIndex;
        const pageBlocks = await CaseNotionBlock.find({
            pageId: block.pageId,
            isDeleted: { $ne: true }
        }).sort({ zIndex: 1 });

        switch (action) {
            case 'front':
                const lastBlock = pageBlocks[pageBlocks.length - 1];
                newZIndex = lastBlock ? incrementZIndex(lastBlock.zIndex) : 'z9';
                break;
            case 'back':
                newZIndex = '0';
                break;
            case 'forward':
                const currentIdx = pageBlocks.findIndex(b => b._id.equals(block._id));
                if (currentIdx < pageBlocks.length - 1) {
                    const nextBlock = pageBlocks[currentIdx + 1];
                    newZIndex = incrementZIndex(block.zIndex);
                } else {
                    newZIndex = block.zIndex;
                }
                break;
            case 'backward':
                const curIdx = pageBlocks.findIndex(b => b._id.equals(block._id));
                if (curIdx > 0) {
                    const prevBlock = pageBlocks[curIdx - 1];
                    newZIndex = decrementZIndex(block.zIndex);
                } else {
                    newZIndex = block.zIndex;
                }
                break;
            default:
                return res.status(400).json({ error: true, message: 'Invalid action' });
        }

        block.zIndex = newZIndex;
        block.version += 1;
        block.versionNonce = Math.floor(Math.random() * 1000000);
        await block.save();

        res.json({ success: true, data: block });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Batch update multiple elements (for efficient drag operations)
 * PATCH /api/v1/cases/:caseId/notion/pages/:pageId/batch-update
 */
exports.batchUpdateElements = async (req, res) => {
    try {
        const { pageId } = req.params;
        const { updates } = req.body;  // Array of { id, changes: { canvasX, canvasY, ... } }

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: true, message: 'Updates array required' });
        }

        const bulkOps = updates.map(({ id, changes }) => ({
            updateOne: {
                filter: { _id: id, pageId },
                update: {
                    $set: {
                        ...changes,
                        lastEditedBy: req.user._id,
                        lastEditedAt: new Date()
                    },
                    $inc: { version: 1 }
                }
            }
        }));

        await CaseNotionBlock.bulkWrite(bulkOps);

        res.json({ success: true, message: `Updated ${updates.length} elements` });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// Helper function for fractional indexing
function incrementZIndex(current) {
    if (!current) return 'a0';
    const lastChar = current.slice(-1);
    if (lastChar === '9') {
        return current + 'a0';
    } else if (lastChar >= 'a' && lastChar < 'z') {
        return current.slice(0, -1) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
    } else if (lastChar >= '0' && lastChar < '9') {
        return current.slice(0, -1) + String(parseInt(lastChar) + 1);
    }
    return current + '0';
}

function decrementZIndex(current) {
    if (!current || current === '0' || current === 'a0') return '0';
    const lastChar = current.slice(-1);
    if (lastChar === '0') {
        return current.slice(0, -2) || '0';
    } else if (lastChar > 'a' && lastChar <= 'z') {
        return current.slice(0, -1) + String.fromCharCode(lastChar.charCodeAt(0) - 1);
    } else if (lastChar > '0' && lastChar <= '9') {
        return current.slice(0, -1) + String(parseInt(lastChar) - 1);
    }
    return '0';
}
