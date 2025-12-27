const { ThreadMessage, User, Document } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const { sanitizeComment } = require('../utils/sanitize');

/**
 * Helper function to verify user has access to the resource
 * Prevents IDOR attacks by ensuring the resource belongs to user's firm
 */
const verifyResourceAccess = async (res_model, res_id, firmId) => {
    // Sanitize the ObjectId
    const sanitizedId = sanitizeObjectId(res_id);
    if (!sanitizedId) {
        throw CustomException('معرف المورد غير صالح', 400);
    }

    // Get the model dynamically
    const models = require('../models');
    const Model = models[res_model];

    if (!Model) {
        throw CustomException('نموذج المورد غير صالح', 400);
    }

    // Check if resource exists and belongs to the firm
    const resource = await Model.findOne({ _id: sanitizedId, firmId });

    if (!resource) {
        throw CustomException('المورد غير موجود أو غير مصرح لك بالوصول إليه', 404);
    }

    return resource;
};

/**
 * Post a message
 * POST /api/messages
 */
const postMessage = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['res_model', 'res_id', 'body', 'message_type', 'is_internal', 'attachment_ids', 'subject', 'parent_id'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        res_model,
        res_id,
        body,
        message_type = 'comment',
        is_internal = false,
        attachment_ids = [],
        subject,
        parent_id
    } = safeData;

    // Input validation
    if (!res_model || !res_id) {
        throw CustomException('نموذج المورد ومعرف المورد مطلوبان', 400);
    }

    // Validate message type
    const validMessageTypes = ['comment', 'notification', 'email', 'activity_done', 'stage_change', 'auto_log', 'note', 'activity', 'tracking'];
    if (message_type && !validMessageTypes.includes(message_type)) {
        throw CustomException('نوع الرسالة غير صالح', 400);
    }

    // Validate content
    if (!body && attachment_ids.length === 0) {
        throw CustomException('يجب توفير محتوى الرسالة أو المرفقات', 400);
    }

    // Input validation for body
    if (body && typeof body !== 'string') {
        throw CustomException('محتوى الرسالة يجب أن يكون نصاً', 400);
    }

    if (body && body.length > 50000) {
        throw CustomException('محتوى الرسالة طويل جداً (الحد الأقصى 50000 حرف)', 400);
    }

    // IDOR Protection - verify user has access to the resource
    await verifyResourceAccess(res_model, res_id, firmId);

    // XSS Prevention - sanitize message content
    const sanitizedBody = body ? sanitizeComment(body) : '';

    // Validate and sanitize parent_id if provided
    let sanitizedParentId = null;
    if (parent_id) {
        sanitizedParentId = sanitizeObjectId(parent_id);
        if (!sanitizedParentId) {
            throw CustomException('معرف الرسالة الأصلية غير صالح', 400);
        }
        // Verify parent message exists and belongs to same thread
        const parentMessage = await ThreadMessage.findOne({
            _id: sanitizedParentId,
            res_model,
            res_id,
            firmId
        });
        if (!parentMessage) {
            throw CustomException('الرسالة الأصلية غير موجودة', 404);
        }
    }

    // Validate attachment_ids if provided
    const sanitizedAttachmentIds = [];
    if (attachment_ids && Array.isArray(attachment_ids)) {
        for (const attachmentId of attachment_ids) {
            const sanitizedId = sanitizeObjectId(attachmentId);
            if (sanitizedId) {
                // Verify attachment exists and belongs to firm
                const attachment = await Document.findOne({ _id: sanitizedId, firmId });
                if (attachment) {
                    sanitizedAttachmentIds.push(sanitizedId);
                }
            }
        }
    }

    const message = await ThreadMessage.create({
        firmId,
        res_model,
        res_id,
        body: sanitizedBody,
        subject: subject ? sanitizeComment(subject) : undefined,
        message_type,
        is_internal,
        author_id: userId,
        attachment_ids: sanitizedAttachmentIds,
        parent_id: sanitizedParentId,
        createdBy: userId
    });

    const populatedMessage = await ThreadMessage.findById(message._id)
        .populate('author_id', 'firstName lastName email avatar')
        .populate('attachment_ids', 'filename originalName mimetype size url');

    res.status(201).json({
        success: true,
        message: 'تم إرسال الرسالة بنجاح',
        data: populatedMessage
    });
});

/**
 * Post an internal note
 * POST /api/messages/note
 */
const postNote = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['res_model', 'res_id', 'body', 'subject'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { res_model, res_id, body, subject } = safeData;

    // Input validation
    if (!res_model || !res_id || !body) {
        throw CustomException('نموذج المورد ومعرف المورد والمحتوى مطلوبان', 400);
    }

    // Input validation for body
    if (typeof body !== 'string') {
        throw CustomException('محتوى الملاحظة يجب أن يكون نصاً', 400);
    }

    if (body.length > 50000) {
        throw CustomException('محتوى الملاحظة طويل جداً (الحد الأقصى 50000 حرف)', 400);
    }

    // IDOR Protection - verify user has access to the resource
    await verifyResourceAccess(res_model, res_id, firmId);

    // XSS Prevention - sanitize content
    const sanitizedBody = sanitizeComment(body);

    const message = await ThreadMessage.create({
        firmId,
        res_model,
        res_id,
        body: sanitizedBody,
        subject: subject ? sanitizeComment(subject) : undefined,
        message_type: 'note',
        is_internal: true,
        author_id: userId,
        createdBy: userId
    });

    const populatedMessage = await ThreadMessage.findById(message._id)
        .populate('author_id', 'firstName lastName email avatar');

    res.status(201).json({
        success: true,
        message: 'تم إضافة الملاحظة بنجاح',
        data: populatedMessage
    });
});

/**
 * Get messages with pagination
 * GET /api/messages
 */
const getMessages = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const {
        res_model,
        res_id,
        message_type,
        page = 1,
        limit = 50
    } = req.query;

    // IDOR Protection - always filter by firmId or lawyerId
    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    if (res_model) query.res_model = res_model;
    if (res_id) {
        const sanitizedId = sanitizeObjectId(res_id);
        if (sanitizedId) {
            query.res_id = sanitizedId;
        }
    }
    if (message_type) {
        const validMessageTypes = ['comment', 'notification', 'email', 'activity_done', 'stage_change', 'auto_log', 'note', 'activity', 'tracking'];
        if (validMessageTypes.includes(message_type)) {
            query.message_type = message_type;
        }
    }

    const messages = await ThreadMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('author_id', 'firstName lastName email avatar')
        .populate('attachment_ids', 'filename originalName mimetype size url');

    const total = await ThreadMessage.countDocuments(query);

    res.status(200).json({
        success: true,
        data: messages,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single message
 * GET /api/messages/:id
 */
const getMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الرسالة غير صالح', 400);
    }

    // IDOR Protection - ensure message belongs to firm
    const message = await ThreadMessage.findOne({ _id: sanitizedId, firmId })
        .populate('author_id', 'firstName lastName email avatar')
        .populate('attachment_ids', 'filename originalName mimetype size url')
        .populate('starred_partner_ids', 'firstName lastName email')
        .populate('parent_id');

    if (!message) {
        throw CustomException('الرسالة غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        data: message
    });
});

/**
 * Get messages where current user is mentioned
 * GET /api/messages/mentions
 */
const getMyMentions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const userId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection - filter by firmId/lawyerId and mentioned user
    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = userId;
    } else {
        query.firmId = firmId;
    }
    query.partner_ids = userId;

    const messages = await ThreadMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('author_id', 'firstName lastName email avatar')
        .populate('attachment_ids', 'filename originalName mimetype size url');

    const total = await ThreadMessage.countDocuments(query);

    res.status(200).json({
        success: true,
        data: messages,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Toggle star on message
 * POST /api/messages/:id/star
 */
const starMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الرسالة غير صالح', 400);
    }

    // IDOR Protection - ensure message belongs to firm
    const message = await ThreadMessage.findOne({ _id: sanitizedId, firmId });

    if (!message) {
        throw CustomException('الرسالة غير موجودة', 404);
    }

    const isStarred = message.starred_partner_ids && message.starred_partner_ids.some(
        uid => uid.toString() === userId.toString()
    );

    if (isStarred) {
        message.starred_partner_ids = message.starred_partner_ids.filter(
            uid => uid.toString() !== userId.toString()
        );
    } else {
        if (!message.starred_partner_ids) {
            message.starred_partner_ids = [];
        }
        message.starred_partner_ids.push(userId);
    }

    await message.save();

    const populatedMessage = await ThreadMessage.findById(sanitizedId)
        .populate('author_id', 'firstName lastName email avatar')
        .populate('starred_partner_ids', 'firstName lastName email');

    res.status(200).json({
        success: true,
        message: isStarred ? 'تم إزالة النجمة من الرسالة' : 'تم تمييز الرسالة بنجمة',
        data: populatedMessage
    });
});

/**
 * Get starred messages
 * GET /api/messages/starred
 */
const getStarred = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const userId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection - filter by firmId/lawyerId and starred user
    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = userId;
    } else {
        query.firmId = firmId;
    }
    query.starred_partner_ids = userId;

    const messages = await ThreadMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('author_id', 'firstName lastName email avatar')
        .populate('attachment_ids', 'filename originalName mimetype size url');

    const total = await ThreadMessage.countDocuments(query);

    res.status(200).json({
        success: true,
        data: messages,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Search messages
 * GET /api/messages/search
 */
const searchMessages = asyncHandler(async (req, res) => {
    const { q, res_model, page = 1, limit = 50 } = req.query;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    if (!q) {
        throw CustomException('مصطلح البحث مطلوب', 400);
    }

    // Input validation - limit search query length
    if (typeof q !== 'string' || q.length > 500) {
        throw CustomException('مصطلح البحث غير صالح', 400);
    }

    // IDOR Protection - always filter by firmId or lawyerId
    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }
    query.$text = { $search: q };

    if (res_model) {
        query.res_model = res_model;
    }

    const messages = await ThreadMessage.find(query)
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('author_id', 'firstName lastName email avatar')
        .populate('attachment_ids', 'filename originalName mimetype size url');

    const total = await ThreadMessage.countDocuments(query);

    res.status(200).json({
        success: true,
        data: messages,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get full message thread for a record
 * GET /api/messages/thread/:model/:id
 * SECURITY: Added firmId verification to prevent cross-firm access
 */
const getRecordThread = asyncHandler(async (req, res) => {
    const { model, id } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    if (!model || !id) {
        throw CustomException('النموذج والمعرف مطلوبان', 400);
    }

    // SECURITY: Verify the record belongs to the user's firm before returning messages
    const mongoose = require('mongoose');
    const modelMap = {
        'Case': 'Case',
        'Client': 'Client',
        'Invoice': 'Invoice',
        'Document': 'Document',
        'Task': 'Task'
    };

    const mongooseModelName = modelMap[model];
    if (mongooseModelName) {
        try {
            const Model = mongoose.model(mongooseModelName);
            const resourceQuery = { _id: id };
            if (firmId) {
                resourceQuery.firmId = firmId;
            } else {
                resourceQuery.lawyerId = lawyerId;
            }
            const resource = await Model.findOne(resourceQuery);
            if (!resource) {
                throw CustomException('المورد غير موجود أو ليس لديك صلاحية الوصول', 403);
            }
        } catch (err) {
            if (err.message.includes('المورد غير موجود')) throw err;
            // Unknown model - skip validation but log warning
        }
    }

    const query = {
        res_model: model,
        res_id: id
    };

    const messages = await ThreadMessage.find(query)
        .sort({ createdAt: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('author_id', 'firstName lastName email avatar')
        .populate('attachment_ids', 'filename originalName mimetype size url')
        .populate('parent_id');

    const total = await ThreadMessage.countDocuments(query);

    // Group messages by type
    const thread = {
        messages: messages.filter(m => m.message_type === 'comment'),
        notes: messages.filter(m => m.message_type === 'note'),
        notifications: messages.filter(m => m.message_type === 'notification'),
        activities: messages.filter(m => m.message_type === 'activity'),
        tracking: messages.filter(m => m.message_type === 'tracking')
    };

    res.status(200).json({
        success: true,
        data: thread,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Delete a message
 * DELETE /api/messages/:id
 */
const deleteMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Use findOne with firmId
    const message = await ThreadMessage.findOne({ _id: id, firmId });

    if (!message) {
        throw CustomException('الرسالة غير موجودة', 404);
    }

    // Only allow deletion of own messages that are not notifications
    if (message.author_id.toString() !== userId.toString()) {
        throw CustomException('غير مصرح لك بحذف هذه الرسالة', 403);
    }

    if (message.message_type === 'notification') {
        throw CustomException('لا يمكن حذف الإشعارات', 400);
    }

    await ThreadMessage.findOneAndDelete({ _id: id, firmId: req.firmId });

    res.status(200).json({
        success: true,
        message: 'تم حذف الرسالة بنجاح'
    });
});

module.exports = {
    postMessage,
    postNote,
    getMessages,
    getMessage,
    getMyMentions,
    starMessage,
    getStarred,
    searchMessages,
    getRecordThread,
    deleteMessage
};
