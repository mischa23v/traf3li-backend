/**
 * Conversation Controller
 *
 * This controller handles TWO distinct features:
 *
 * 1. MARKETPLACE CONVERSATIONS (seller/buyer chat)
 *    - Routes: /api/conversation (singular - old route)
 *    - Functions: getConversations, createConversation, getSingleConversation, updateConversation
 *
 * 2. OMNICHANNEL INBOX (CRM unified inbox)
 *    - Routes: /api/conversations (plural - new route)
 *    - Functions: getInbox, getConversation, addMessage, assignConversation, etc.
 */

const { Conversation } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const OmnichannelInboxService = require('../services/omnichannelInbox.service');
const { pickAllowedFields, sanitizeObjectId, sanitizeString } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETPLACE CONVERSATION FUNCTIONS (Seller/Buyer)
// Used by: /api/conversation routes (conversation.route.js)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new marketplace conversation
 * POST /api/conversation
 */
const createConversation = async (request, response) => {
    try {
        // Mass assignment protection - only allow specific fields
        const allowedFields = pickAllowedFields(request.body, ['to', 'from']);
        const { to, from } = allowedFields;

        // Input validation
        if (!to || !from) {
            throw CustomException('Both "to" and "from" fields are required', 400);
        }

        // Sanitize ObjectIds to prevent injection
        const sanitizedTo = sanitizeObjectId(to);
        const sanitizedFrom = sanitizeObjectId(from);

        if (!sanitizedTo || !sanitizedFrom) {
            throw CustomException('Invalid user IDs provided', 400);
        }

        // IDOR protection - ensure the authenticated user is part of the conversation
        if (request.isSeller && sanitizedFrom !== request.userID) {
            throw CustomException('Unauthorized: You can only create conversations as yourself', 403);
        }
        if (!request.isSeller && sanitizedTo !== request.userID && sanitizedFrom !== request.userID) {
            throw CustomException('Unauthorized: You must be part of the conversation', 403);
        }

        const conversation = new Conversation({
            sellerID: request.isSeller ? request.userID : sanitizedTo,
            buyerID: request.isSeller ? sanitizedFrom : request.userID,
            readBySeller: request.isSeller,
            readByBuyer: !request.isSeller
        });

        await conversation.save();
        return response.status(201).send(conversation);
    }
    catch ({message, status = 500}) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Get all marketplace conversations for current user
 * GET /api/conversation
 */
const getConversations = async (request, response) => {
    try {
        const conversation = await Conversation.find(request.isSeller ? { sellerID: request.userID } : { buyerID: request.userID }).populate(request.isSeller ? 'buyerID' : 'sellerID', 'username image email').sort({ updatedAt: -1 });
        return response.send(conversation);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Get a single marketplace conversation by seller and buyer IDs
 * GET /api/conversation/single/:sellerID/:buyerID
 */
const getSingleConversation = async (request, response) => {
    try {
        const { sellerID, buyerID } = request.params;

        // Input validation
        if (!sellerID || !buyerID) {
            throw CustomException('Both sellerID and buyerID are required', 400);
        }

        // Sanitize ObjectIds to prevent injection
        const sanitizedSellerID = sanitizeObjectId(sellerID);
        const sanitizedBuyerID = sanitizeObjectId(buyerID);

        if (!sanitizedSellerID || !sanitizedBuyerID) {
            throw CustomException('Invalid IDs provided', 400);
        }

        // IDOR protection - include authorization in the query itself
        const conversation = await Conversation.findOne({
            sellerID: sanitizedSellerID,
            buyerID: sanitizedBuyerID,
            $or: [
                { sellerID: request.userID },
                { buyerID: request.userID }
            ]
        });

        if (!conversation) {
            throw CustomException('No such conversation found!', 404);
        }

        return response.send(conversation);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Update a marketplace conversation (mark as read)
 * PATCH /api/conversation/:conversationID
 */
const updateConversation = async (request, response) => {
    try {
        const { conversationID } = request.params;

        // Input validation
        if (!conversationID) {
            throw CustomException('conversationID is required', 400);
        }

        // Sanitize ObjectId to prevent injection
        const sanitizedConversationID = sanitizeObjectId(conversationID);

        if (!sanitizedConversationID) {
            throw CustomException('Invalid conversationID provided', 400);
        }

        // Mass assignment protection - only allow specific fields to be updated
        const allowedFields = pickAllowedFields(request.body, ['readBySeller', 'readByBuyer']);

        // Build update object with only allowed fields
        const updateData = {};
        if (allowedFields.readBySeller !== undefined) {
            updateData.readBySeller = Boolean(allowedFields.readBySeller);
        }
        if (allowedFields.readByBuyer !== undefined) {
            updateData.readByBuyer = Boolean(allowedFields.readByBuyer);
        }

        // If no valid fields to update, use default behavior (mark as read)
        if (Object.keys(updateData).length === 0) {
            updateData.readBySeller = true;
            updateData.readByBuyer = true;
        }

        // IDOR protection - include authorization in the query itself
        const conversation = await Conversation.findOneAndUpdate(
            {
                _id: sanitizedConversationID,
                $or: [
                    { sellerID: request.userID },
                    { buyerID: request.userID }
                ]
            },
            { $set: updateData },
            { new: true }
        );

        if (!conversation) {
            throw CustomException('Conversation not found', 404);
        }

        return response.send(conversation);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// OMNICHANNEL INBOX FUNCTIONS (CRM Unified Inbox)
// Used by: /api/conversations routes (conversation.routes.js)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get unified inbox
 * GET /api/conversations
 */
const getInbox = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const userId = req.userID;

    // Extract and sanitize filters
    const filters = {
        assignedTo: req.query.assignedTo,
        channels: req.query.channels ? (Array.isArray(req.query.channels) ? req.query.channels : [req.query.channels]) : undefined,
        priority: req.query.priority ? (Array.isArray(req.query.priority) ? req.query.priority : [req.query.priority]) : undefined,
        status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : undefined,
        search: req.query.search ? sanitizeString(req.query.search) : undefined,
        contactId: req.query.contactId ? sanitizeObjectId(req.query.contactId) : undefined,
        team: req.query.team ? sanitizeObjectId(req.query.team) : undefined,
        tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : undefined,
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 100)
    };

    // If user wants to see only their conversations, set assignedTo filter
    if (req.query.myConversations === 'true') {
        filters.assignedTo = userId;
    }

    // Use firmQuery for proper multi-tenant isolation (supports both firm members and solo lawyers)
    const result = await OmnichannelInboxService.getUnifiedInbox(req.firmQuery, null, filters);

    res.json({
        success: true,
        data: result.conversations,
        pagination: result.pagination
    });
});

/**
 * Get single omnichannel conversation with full history
 * GET /api/conversations/:id
 */
const getConversation = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const userId = req.userID;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    const conversation = await OmnichannelInboxService.getOmnichannelConversation(sanitizedId, req.firmQuery, userId);

    res.json({
        success: true,
        data: conversation
    });
});

/**
 * Add message to omnichannel conversation
 * POST /api/conversations/:id/messages
 */
const addMessage = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const userId = req.userID;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['content', 'contentType', 'attachments', 'metadata'];
    const messageData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!messageData.content) {
        throw CustomException('Message content is required', 400);
    }

    // Sanitize content
    messageData.content = sanitizeString(messageData.content);

    // Set direction to outbound for user-sent messages
    messageData.direction = 'outbound';

    const conversation = await OmnichannelInboxService.addMessage(sanitizedId, req.firmQuery, messageData, userId);

    res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: conversation
    });
});

/**
 * Assign omnichannel conversation to a user
 * POST /api/conversations/:id/assign
 */
const assignConversation = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const { assigneeId } = req.body;
    const userId = req.userID;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    // Validate assigneeId if provided
    let sanitizedAssigneeId = null;
    if (assigneeId && assigneeId !== 'unassign') {
        sanitizedAssigneeId = sanitizeObjectId(assigneeId);
        if (!sanitizedAssigneeId) {
            throw CustomException('Invalid assignee ID format', 400);
        }
    }

    const conversation = await OmnichannelInboxService.assignOmnichannelConversation(
        sanitizedId,
        req.firmQuery,
        sanitizedAssigneeId,
        userId
    );

    res.json({
        success: true,
        message: sanitizedAssigneeId ? 'Conversation assigned successfully' : 'Conversation unassigned successfully',
        data: conversation
    });
});

/**
 * Snooze omnichannel conversation until a specific date
 * POST /api/conversations/:id/snooze
 */
const snoozeConversation = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const { until } = req.body;
    const userId = req.userID;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    // Validate until date
    if (!until) {
        throw CustomException('Snooze until date is required', 400);
    }

    const snoozeDate = new Date(until);
    if (isNaN(snoozeDate.getTime())) {
        throw CustomException('Invalid date format', 400);
    }

    if (snoozeDate <= new Date()) {
        throw CustomException('Snooze date must be in the future', 400);
    }

    const conversation = await OmnichannelInboxService.snoozeOmnichannelConversation(sanitizedId, req.firmQuery, snoozeDate, userId);

    res.json({
        success: true,
        message: 'Conversation snoozed successfully',
        data: conversation
    });
});

/**
 * Close omnichannel conversation
 * POST /api/conversations/:id/close
 */
const closeConversation = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const userId = req.userID;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    // Mass assignment protection - only allow specific resolution fields
    const allowedFields = ['reason', 'notes', 'satisfactionRating'];
    const resolution = pickAllowedFields(req.body, allowedFields);

    // Sanitize resolution notes if provided
    if (resolution.notes) {
        resolution.notes = sanitizeString(resolution.notes);
    }

    const conversation = await OmnichannelInboxService.closeOmnichannelConversation(sanitizedId, req.firmQuery, userId, resolution);

    res.json({
        success: true,
        message: 'Conversation closed successfully',
        data: conversation
    });
});

/**
 * Reopen a closed omnichannel conversation
 * POST /api/conversations/:id/reopen
 */
const reopenConversation = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const userId = req.userID;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    const conversation = await OmnichannelInboxService.reopenOmnichannelConversation(sanitizedId, req.firmQuery, userId);

    res.json({
        success: true,
        message: 'Conversation reopened successfully',
        data: conversation
    });
});

/**
 * Get inbox statistics
 * GET /api/conversations/stats
 */
const getStats = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const userId = req.userID;

    // If user wants their own stats, pass their userId
    const agentId = req.query.myStats === 'true' ? userId : null;

    // Use firmQuery for proper multi-tenant isolation
    const stats = await OmnichannelInboxService.getStats(req.firmQuery, agentId);

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Update omnichannel conversation tags
 * PUT /api/conversations/:id/tags
 */
const updateTags = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const { tags } = req.body;
    const userId = req.userID;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    // Validate tags
    if (!Array.isArray(tags)) {
        throw CustomException('Tags must be an array', 400);
    }

    // Sanitize tags
    const sanitizedTags = tags.map(tag => sanitizeString(tag)).filter(Boolean);

    const conversation = await OmnichannelInboxService.updateTags(sanitizedId, req.firmQuery, sanitizedTags, userId);

    res.json({
        success: true,
        message: 'Tags updated successfully',
        data: conversation
    });
});

/**
 * Update omnichannel conversation priority
 * PUT /api/conversations/:id/priority
 */
const updatePriority = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const { priority } = req.body;
    const userId = req.userID;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    // Validate priority
    const validPriorities = ['urgent', 'high', 'normal', 'low'];
    if (!priority || !validPriorities.includes(priority)) {
        throw CustomException(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`, 400);
    }

    const conversation = await OmnichannelInboxService.updatePriority(sanitizedId, req.firmQuery, priority, userId);

    res.json({
        success: true,
        message: 'Priority updated successfully',
        data: conversation
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
    // Marketplace functions (used by conversation.route.js)
    createConversation,
    getConversations,
    getSingleConversation,
    updateConversation,

    // Omnichannel inbox functions (used by conversation.routes.js)
    getInbox,
    getConversation,
    addMessage,
    assignConversation,
    snoozeConversation,
    closeConversation,
    reopenConversation,
    getStats,
    updateTags,
    updatePriority
};
