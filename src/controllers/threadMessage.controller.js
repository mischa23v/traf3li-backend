const { ThreadMessage, User, Document } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Post a message
 * POST /api/messages
 */
const postMessage = asyncHandler(async (req, res) => {
    const {
        res_model,
        res_id,
        body,
        message_type = 'comment',
        is_internal = false,
        attachment_ids = []
    } = req.body;
    const userId = req.userID;

    if (!res_model || !res_id) {
        throw CustomException('نموذج المورد ومعرف المورد مطلوبان', 400);
    }

    if (!body && attachment_ids.length === 0) {
        throw CustomException('يجب توفير محتوى الرسالة أو المرفقات', 400);
    }

    const message = await ThreadMessage.create({
        res_model,
        res_id,
        body,
        message_type,
        is_internal,
        author_id: userId,
        attachment_ids,
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
    const { res_model, res_id, body } = req.body;
    const userId = req.userID;

    if (!res_model || !res_id || !body) {
        throw CustomException('نموذج المورد ومعرف المورد والمحتوى مطلوبان', 400);
    }

    const message = await ThreadMessage.create({
        res_model,
        res_id,
        body,
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
    const {
        res_model,
        res_id,
        message_type,
        page = 1,
        limit = 50
    } = req.query;

    const query = {};

    if (res_model) query.res_model = res_model;
    if (res_id) query.res_id = res_id;
    if (message_type) query.message_type = message_type;

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

    const message = await ThreadMessage.findById(id)
        .populate('author_id', 'firstName lastName email avatar')
        .populate('attachment_ids', 'filename originalName mimetype size url')
        .populate('starred_by', 'firstName lastName email')
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

    const query = {
        mentioned_users: userId
    };

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

    const message = await ThreadMessage.findById(id);

    if (!message) {
        throw CustomException('الرسالة غير موجودة', 404);
    }

    const isStarred = message.starred_by.includes(userId);

    if (isStarred) {
        message.starred_by = message.starred_by.filter(
            uid => uid.toString() !== userId.toString()
        );
    } else {
        message.starred_by.push(userId);
    }

    await message.save();

    const populatedMessage = await ThreadMessage.findById(id)
        .populate('author_id', 'firstName lastName email avatar')
        .populate('starred_by', 'firstName lastName email');

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

    const query = {
        starred_by: userId
    };

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

    if (!q) {
        throw CustomException('مصطلح البحث مطلوب', 400);
    }

    const query = {
        $text: { $search: q }
    };

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
 */
const getRecordThread = asyncHandler(async (req, res) => {
    const { model, id } = req.params;
    const { page = 1, limit = 100 } = req.query;

    if (!model || !id) {
        throw CustomException('النموذج والمعرف مطلوبان', 400);
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

    const message = await ThreadMessage.findById(id);

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

    await ThreadMessage.findByIdAndDelete(id);

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
