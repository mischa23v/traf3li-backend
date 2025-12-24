/**
 * Omnichannel Conversation/Inbox Controller
 *
 * Provides unified inbox endpoints for managing conversations across
 * multiple channels (email, WhatsApp, SMS, live chat, social media)
 */

const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const OmnichannelInboxService = require('../services/omnichannelInbox.service');
const { pickAllowedFields, sanitizeObjectId, sanitizeString } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Get unified inbox
 * GET /api/conversations
 */
const getInbox = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

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

    const result = await OmnichannelInboxService.getUnifiedInbox(firmId, null, filters);

    res.json({
        success: true,
        data: result.conversations,
        pagination: result.pagination
    });
});

/**
 * Get single conversation with full history
 * GET /api/conversations/:id
 */
const getConversation = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    const conversation = await OmnichannelInboxService.getConversation(sanitizedId, userId);

    // IDOR protection - verify conversation belongs to user's firm
    if (conversation.firmId.toString() !== firmId.toString()) {
        throw CustomException('Unauthorized access to this conversation', 403);
    }

    res.json({
        success: true,
        data: conversation
    });
});

/**
 * Add message to conversation
 * POST /api/conversations/:id/messages
 */
const addMessage = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

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

    const conversation = await OmnichannelInboxService.addMessage(sanitizedId, messageData, userId);

    // IDOR protection - verify conversation belongs to user's firm
    if (conversation.firmId.toString() !== firmId.toString()) {
        throw CustomException('Unauthorized access to this conversation', 403);
    }

    res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: conversation
    });
});

/**
 * Assign conversation to a user
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
    const firmId = req.firmId;

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

    const conversation = await OmnichannelInboxService.assignConversation(
        sanitizedId,
        sanitizedAssigneeId,
        userId
    );

    // IDOR protection - verify conversation belongs to user's firm
    if (conversation.firmId.toString() !== firmId.toString()) {
        throw CustomException('Unauthorized access to this conversation', 403);
    }

    res.json({
        success: true,
        message: sanitizedAssigneeId ? 'Conversation assigned successfully' : 'Conversation unassigned successfully',
        data: conversation
    });
});

/**
 * Snooze conversation until a specific date
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
    const firmId = req.firmId;

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

    const conversation = await OmnichannelInboxService.snoozeConversation(sanitizedId, snoozeDate, userId);

    // IDOR protection - verify conversation belongs to user's firm
    if (conversation.firmId.toString() !== firmId.toString()) {
        throw CustomException('Unauthorized access to this conversation', 403);
    }

    res.json({
        success: true,
        message: 'Conversation snoozed successfully',
        data: conversation
    });
});

/**
 * Close conversation
 * POST /api/conversations/:id/close
 */
const closeConversation = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

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

    const conversation = await OmnichannelInboxService.closeConversation(sanitizedId, userId, resolution);

    // IDOR protection - verify conversation belongs to user's firm
    if (conversation.firmId.toString() !== firmId.toString()) {
        throw CustomException('Unauthorized access to this conversation', 403);
    }

    res.json({
        success: true,
        message: 'Conversation closed successfully',
        data: conversation
    });
});

/**
 * Reopen a closed conversation
 * POST /api/conversations/:id/reopen
 */
const reopenConversation = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid conversation ID format', 400);
    }

    const conversation = await OmnichannelInboxService.reopenConversation(sanitizedId, userId);

    // IDOR protection - verify conversation belongs to user's firm
    if (conversation.firmId.toString() !== firmId.toString()) {
        throw CustomException('Unauthorized access to this conversation', 403);
    }

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

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('Firm ID is required', 400);
    }

    // If user wants their own stats, pass their userId
    const agentId = req.query.myStats === 'true' ? userId : null;

    const stats = await OmnichannelInboxService.getStats(firmId, agentId);

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Update conversation tags
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
    const firmId = req.firmId;

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

    const conversation = await OmnichannelInboxService.updateTags(sanitizedId, sanitizedTags, userId);

    // IDOR protection - verify conversation belongs to user's firm
    if (conversation.firmId.toString() !== firmId.toString()) {
        throw CustomException('Unauthorized access to this conversation', 403);
    }

    res.json({
        success: true,
        message: 'Tags updated successfully',
        data: conversation
    });
});

/**
 * Update conversation priority
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
    const firmId = req.firmId;

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

    const conversation = await OmnichannelInboxService.updatePriority(sanitizedId, priority, userId);

    // IDOR protection - verify conversation belongs to user's firm
    if (conversation.firmId.toString() !== firmId.toString()) {
        throw CustomException('Unauthorized access to this conversation', 403);
    }

    res.json({
        success: true,
        message: 'Priority updated successfully',
        data: conversation
    });
});

module.exports = {
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
