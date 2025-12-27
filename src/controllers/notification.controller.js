const { Notification, User } = require('../models');
const CustomException = require('../utils/CustomException');
const { emitNotification, emitNotificationCount } = require('../configs/socket');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper function to get user's firmId for IDOR protection
const getUserFirmId = async (userId) => {
    const user = await User.findOne({ _id: sanitizeObjectId(userId) }).select('firmId').lean();
    return user?.firmId || null;
};

// Get all notifications for user
const getNotifications = async (request, response) => {
    try {
        const { read, type, page = 1, limit = 50 } = request.query;

        // Input validation - ensure userId is set (IDOR protection)
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        // Validate pagination parameters
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50)); // Max 100, min 1

        // IDOR Protection: Fetch notifications using both userId and firmId
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            userId: sanitizeObjectId(request.userID)
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        // Optional filters with validation
        if (read !== undefined) {
            query.read = read === 'true';
        }

        // Validate type against allowed enum values
        const allowedTypes = [
            'order', 'proposal', 'proposal_accepted', 'task', 'task_assigned',
            'message', 'chatter', 'hearing', 'hearing_reminder', 'deadline',
            'case', 'case_update', 'event', 'review', 'payment', 'invoice',
            'invoice_approval_required', 'invoice_approved', 'invoice_rejected',
            'time_entry_submitted', 'time_entry_approved', 'time_entry_rejected',
            'expense_submitted', 'expense_approved', 'expense_rejected',
            'recurring_invoice', 'credit_note', 'debit_note', 'system', 'reminder', 'alert'
        ];

        if (type) {
            if (!allowedTypes.includes(type)) {
                throw CustomException('Invalid notification type', 400);
            }
            query.type = type;
        }

        // Get notifications with pagination
        const notifications = await Notification.find(query)
            .sort({ read: 1, createdAt: -1 }) // Unread first, then newest
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .lean();

        // Get unread count with firmId filter
        const unreadQuery = {
            userId: request.userID,
            read: false
        };
        if (firmId) {
            unreadQuery.firmId = sanitizeObjectId(firmId);
        }
        const unreadCount = await Notification.countDocuments(unreadQuery);

        return response.status(200).send({
            notifications,
            unreadCount,
            page: pageNum,
            limit: limitNum
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Mark single notification as read
const markAsRead = async (request, response) => {
    try {
        const { id } = request.params;

        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        if (!id) {
            throw CustomException('Notification ID is required', 400);
        }

        // Sanitize ID to prevent injection
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            throw CustomException('Invalid notification ID', 400);
        }

        // IDOR Protection: Use both userId and firmId in query
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            _id: sanitizedId,
            userId: sanitizeObjectId(request.userID)
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        const notification = await Notification.findOne(query);

        if (!notification) {
            throw CustomException('Notification not found', 404);
        }

        notification.read = true;
        notification.readAt = new Date();
        await notification.save();

        // Get updated unread count with firmId filter
        const unreadQuery = {
            userId: request.userID,
            read: false
        };
        if (firmId) {
            unreadQuery.firmId = sanitizeObjectId(firmId);
        }
        const unreadCount = await Notification.countDocuments(unreadQuery);

        // Emit updated count via Socket.io
        emitNotificationCount(request.userID, unreadCount);

        return response.status(200).send(notification);
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Mark all notifications as read
const markAllAsRead = async (request, response) => {
    try {
        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        // IDOR Protection: Use both userId and firmId in query
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            userId: sanitizeObjectId(request.userID),
            read: false
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        const result = await Notification.updateMany(
            query,
            { $set: { read: true, readAt: new Date() } }
        );

        // Emit updated count (0) via Socket.io
        emitNotificationCount(request.userID, 0);

        return response.status(200).send({
            success: true,
            modifiedCount: result.modifiedCount
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete notification
const deleteNotification = async (request, response) => {
    try {
        const { id } = request.params;

        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        if (!id) {
            throw CustomException('Notification ID is required', 400);
        }

        // Sanitize ID to prevent injection
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            throw CustomException('Invalid notification ID', 400);
        }

        // IDOR Protection: Use both userId and firmId in query
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            _id: sanitizedId,
            userId: sanitizeObjectId(request.userID)
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        const notification = await Notification.findOneAndDelete(query);

        if (!notification) {
            throw CustomException('Notification not found', 404);
        }

        // Get updated unread count with firmId filter
        const unreadQuery = {
            userId: request.userID,
            read: false
        };
        if (firmId) {
            unreadQuery.firmId = sanitizeObjectId(firmId);
        }
        const unreadCount = await Notification.countDocuments(unreadQuery);

        // Emit updated count via Socket.io
        emitNotificationCount(request.userID, unreadCount);

        return response.status(200).send({
            success: true,
            message: 'Notification deleted'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get unread count
const getUnreadCount = async (request, response) => {
    try {
        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        // IDOR Protection: Use both userId and firmId in query
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            userId: sanitizeObjectId(request.userID),
            read: false
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        const count = await Notification.countDocuments(query);

        return response.status(200).send({ count });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Helper function to create notification (called by other controllers)
const createNotification = async (notificationData) => {
    try {
        // Input validation
        if (!notificationData) {
            throw new Error('Notification data is required');
        }

        // Mass assignment protection - only allow specific fields
        const allowedFields = [
            'firmId', 'userId', 'type', 'title', 'titleAr', 'message', 'messageAr',
            'entityType', 'entityId', 'link', 'data', 'icon', 'priority',
            'channels', 'expiresAt', 'actionRequired', 'actionUrl', 'actionLabel', 'actionLabelAr'
        ];

        const sanitizedData = pickAllowedFields(notificationData, allowedFields);

        // Validate required fields
        if (!sanitizedData.userId) {
            throw new Error('userId is required for notification');
        }

        if (!sanitizedData.type) {
            throw new Error('type is required for notification');
        }

        if (!sanitizedData.title) {
            throw new Error('title is required for notification');
        }

        if (!sanitizedData.message) {
            throw new Error('message is required for notification');
        }

        // Validate type against allowed enum values (prevent injection)
        const allowedTypes = [
            'order', 'proposal', 'proposal_accepted', 'task', 'task_assigned',
            'message', 'chatter', 'hearing', 'hearing_reminder', 'deadline',
            'case', 'case_update', 'event', 'review', 'payment', 'invoice',
            'invoice_approval_required', 'invoice_approved', 'invoice_rejected',
            'time_entry_submitted', 'time_entry_approved', 'time_entry_rejected',
            'expense_submitted', 'expense_approved', 'expense_rejected',
            'recurring_invoice', 'credit_note', 'debit_note', 'system', 'reminder', 'alert'
        ];

        if (!allowedTypes.includes(sanitizedData.type)) {
            throw new Error('Invalid notification type');
        }

        // Validate entityType if provided
        if (sanitizedData.entityType) {
            const allowedEntityTypes = ['invoice', 'payment', 'case', 'task', 'time_entry', 'expense', 'client', 'document', 'event', 'order', 'proposal'];
            if (!allowedEntityTypes.includes(sanitizedData.entityType)) {
                throw new Error('Invalid entity type');
            }
        }

        // Validate priority if provided
        if (sanitizedData.priority) {
            const allowedPriorities = ['low', 'normal', 'high', 'urgent'];
            if (!allowedPriorities.includes(sanitizedData.priority)) {
                sanitizedData.priority = 'normal'; // Default to normal if invalid
            }
        }

        // Sanitize ObjectIds
        sanitizedData.userId = sanitizeObjectId(sanitizedData.userId);
        if (sanitizedData.firmId) {
            sanitizedData.firmId = sanitizeObjectId(sanitizedData.firmId);
        }
        if (sanitizedData.entityId) {
            sanitizedData.entityId = sanitizeObjectId(sanitizedData.entityId);
        }

        // Create notification with sanitized data
        const notification = new Notification(sanitizedData);
        await notification.save();

        // Emit notification via Socket.io
        emitNotification(sanitizedData.userId, notification.toObject());

        // Get and emit updated unread count with firmId filter
        const unreadQuery = {
            userId: sanitizedData.userId,
            read: false
        };
        if (sanitizedData.firmId) {
            unreadQuery.firmId = sanitizedData.firmId;
        }
        const unreadCount = await Notification.countDocuments(unreadQuery);
        emitNotificationCount(sanitizedData.userId, unreadCount);

        return notification;
    } catch (error) {
        logger.error('Error creating notification:', error);
        return null;
    }
};

// Bulk create notifications
const createBulkNotifications = async (notifications) => {
    try {
        // Input validation
        if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
            throw new Error('Notifications array is required and must not be empty');
        }

        // Limit bulk operations to prevent abuse
        if (notifications.length > 1000) {
            throw new Error('Cannot create more than 1000 notifications at once');
        }

        // Mass assignment protection - only allow specific fields
        const allowedFields = [
            'firmId', 'userId', 'type', 'title', 'titleAr', 'message', 'messageAr',
            'entityType', 'entityId', 'link', 'data', 'icon', 'priority',
            'channels', 'expiresAt', 'actionRequired', 'actionUrl', 'actionLabel', 'actionLabelAr'
        ];

        const allowedTypes = [
            'order', 'proposal', 'proposal_accepted', 'task', 'task_assigned',
            'message', 'chatter', 'hearing', 'hearing_reminder', 'deadline',
            'case', 'case_update', 'event', 'review', 'payment', 'invoice',
            'invoice_approval_required', 'invoice_approved', 'invoice_rejected',
            'time_entry_submitted', 'time_entry_approved', 'time_entry_rejected',
            'expense_submitted', 'expense_approved', 'expense_rejected',
            'recurring_invoice', 'credit_note', 'debit_note', 'system', 'reminder', 'alert'
        ];

        const allowedEntityTypes = ['invoice', 'payment', 'case', 'task', 'time_entry', 'expense', 'client', 'document', 'event', 'order', 'proposal'];
        const allowedPriorities = ['low', 'normal', 'high', 'urgent'];

        // Sanitize and validate each notification
        const sanitizedNotifications = notifications.map((notificationData, index) => {
            // Mass assignment protection
            const sanitizedData = pickAllowedFields(notificationData, allowedFields);

            // Validate required fields
            if (!sanitizedData.userId) {
                throw new Error(`Notification at index ${index}: userId is required`);
            }

            if (!sanitizedData.type) {
                throw new Error(`Notification at index ${index}: type is required`);
            }

            if (!sanitizedData.title) {
                throw new Error(`Notification at index ${index}: title is required`);
            }

            if (!sanitizedData.message) {
                throw new Error(`Notification at index ${index}: message is required`);
            }

            // Validate type (prevent injection)
            if (!allowedTypes.includes(sanitizedData.type)) {
                throw new Error(`Notification at index ${index}: Invalid notification type`);
            }

            // Validate entityType if provided
            if (sanitizedData.entityType && !allowedEntityTypes.includes(sanitizedData.entityType)) {
                throw new Error(`Notification at index ${index}: Invalid entity type`);
            }

            // Validate priority
            if (sanitizedData.priority && !allowedPriorities.includes(sanitizedData.priority)) {
                sanitizedData.priority = 'normal';
            }

            // Sanitize ObjectIds
            sanitizedData.userId = sanitizeObjectId(sanitizedData.userId);
            if (sanitizedData.firmId) {
                sanitizedData.firmId = sanitizeObjectId(sanitizedData.firmId);
            }
            if (sanitizedData.entityId) {
                sanitizedData.entityId = sanitizeObjectId(sanitizedData.entityId);
            }

            return sanitizedData;
        });

        // Insert sanitized notifications
        const result = await Notification.insertMany(sanitizedNotifications);

        // Emit each notification via Socket.io
        result.forEach(notification => {
            emitNotification(notification.userId, notification.toObject());
        });

        // Emit updated counts for all affected users with firmId filter
        const userIds = [...new Set(sanitizedNotifications.map(n => n.userId.toString()))];
        for (const userId of userIds) {
            // Find firmId for this user from the notifications
            const userNotification = sanitizedNotifications.find(n => n.userId.toString() === userId);
            const unreadQuery = {
                userId,
                read: false
            };
            if (userNotification?.firmId) {
                unreadQuery.firmId = userNotification.firmId;
            }
            const unreadCount = await Notification.countDocuments(unreadQuery);
            emitNotificationCount(userId, unreadCount);
        }

        return result;
    } catch (error) {
        logger.error('Error creating bulk notifications:', error);
        return [];
    }
};

// Get single notification by ID
const getNotification = async (request, response) => {
    try {
        const { id } = request.params;

        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        if (!id) {
            throw CustomException('Notification ID is required', 400);
        }

        // Sanitize ID to prevent injection
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            throw CustomException('Invalid notification ID', 400);
        }

        // IDOR Protection: Use both userId and firmId in query
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            _id: sanitizedId,
            userId: sanitizeObjectId(request.userID)
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        const notification = await Notification.findOne(query).lean();

        if (!notification) {
            throw CustomException('Notification not found | الإشعار غير موجود', 404);
        }

        return response.status(200).json({
            success: true,
            data: notification
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).json({
            success: false,
            error: { message }
        });
    }
};

// Mark multiple notifications as read
const markMultipleAsRead = async (request, response) => {
    try {
        const { ids } = request.body;

        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw CustomException('IDs array is required | قائمة المعرفات مطلوبة', 400);
        }

        // Limit bulk operations to prevent abuse
        if (ids.length > 100) {
            throw CustomException('Cannot process more than 100 notifications at once', 400);
        }

        // Sanitize all IDs
        const sanitizedIds = ids.map(id => sanitizeObjectId(id)).filter(Boolean);
        if (sanitizedIds.length === 0) {
            throw CustomException('No valid IDs provided', 400);
        }

        // IDOR Protection: Use both userId and firmId in query
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            _id: { $in: sanitizedIds },
            userId: sanitizeObjectId(request.userID),
            read: false
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        const result = await Notification.updateMany(
            query,
            { $set: { read: true, readAt: new Date() } }
        );

        // Get updated unread count with firmId filter
        const unreadQuery = {
            userId: request.userID,
            read: false
        };
        if (firmId) {
            unreadQuery.firmId = sanitizeObjectId(firmId);
        }
        const unreadCount = await Notification.countDocuments(unreadQuery);

        // Emit updated count via Socket.io
        emitNotificationCount(request.userID, unreadCount);

        return response.status(200).json({
            success: true,
            message: `${result.modifiedCount} notification(s) marked as read | تم تحديد ${result.modifiedCount} إشعار(ات) كمقروءة`,
            modifiedCount: result.modifiedCount,
            unreadCount
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).json({
            success: false,
            error: { message }
        });
    }
};

// Bulk delete notifications
const bulkDeleteNotifications = async (request, response) => {
    try {
        const { ids } = request.body;

        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw CustomException('IDs array is required | قائمة المعرفات مطلوبة', 400);
        }

        // Limit bulk operations to prevent abuse
        if (ids.length > 100) {
            throw CustomException('Cannot delete more than 100 notifications at once', 400);
        }

        // Sanitize all IDs
        const sanitizedIds = ids.map(id => sanitizeObjectId(id)).filter(Boolean);
        if (sanitizedIds.length === 0) {
            throw CustomException('No valid IDs provided', 400);
        }

        // IDOR Protection: Use both userId and firmId in query
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            _id: { $in: sanitizedIds },
            userId: sanitizeObjectId(request.userID)
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        const result = await Notification.deleteMany(query);

        // Get updated unread count with firmId filter
        const unreadQuery = {
            userId: request.userID,
            read: false
        };
        if (firmId) {
            unreadQuery.firmId = sanitizeObjectId(firmId);
        }
        const unreadCount = await Notification.countDocuments(unreadQuery);

        // Emit updated count via Socket.io
        emitNotificationCount(request.userID, unreadCount);

        return response.status(200).json({
            success: true,
            message: `${result.deletedCount} notification(s) deleted | تم حذف ${result.deletedCount} إشعار(ات)`,
            deletedCount: result.deletedCount,
            unreadCount
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).json({
            success: false,
            error: { message }
        });
    }
};

// Clear all read notifications
const clearReadNotifications = async (request, response) => {
    try {
        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        // IDOR Protection: Use both userId and firmId in query
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            userId: sanitizeObjectId(request.userID),
            read: true
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        const result = await Notification.deleteMany(query);

        return response.status(200).json({
            success: true,
            message: `${result.deletedCount} read notification(s) cleared | تم مسح ${result.deletedCount} إشعار(ات) مقروءة`,
            deletedCount: result.deletedCount
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).json({
            success: false,
            error: { message }
        });
    }
};

// Get notifications by type
const getNotificationsByType = async (request, response) => {
    try {
        const { type } = request.params;
        const { read, page = 1, limit = 50 } = request.query;

        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        // Validate type against allowed enum values
        const allowedTypes = [
            'order', 'proposal', 'proposal_accepted', 'task', 'task_assigned',
            'message', 'chatter', 'hearing', 'hearing_reminder', 'deadline',
            'case', 'case_update', 'event', 'review', 'payment', 'invoice',
            'invoice_approval_required', 'invoice_approved', 'invoice_rejected',
            'time_entry_submitted', 'time_entry_approved', 'time_entry_rejected',
            'expense_submitted', 'expense_approved', 'expense_rejected',
            'recurring_invoice', 'credit_note', 'debit_note', 'system', 'reminder', 'alert'
        ];

        if (!allowedTypes.includes(type)) {
            throw CustomException('Invalid notification type | نوع الإشعار غير صالح', 400);
        }

        // Validate pagination parameters
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

        // IDOR Protection: Use both userId and firmId in query
        const firmId = request.firmId || await getUserFirmId(request.userID);
        const query = {
            userId: sanitizeObjectId(request.userID),
            type
        };

        // Add firmId to query if user belongs to a firm
        if (firmId) {
            query.firmId = sanitizeObjectId(firmId);
        }

        if (read !== undefined) {
            query.read = read === 'true';
        }

        const notifications = await Notification.find(query)
            .sort({ read: 1, createdAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .lean();

        const total = await Notification.countDocuments(query);

        return response.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).json({
            success: false,
            error: { message }
        });
    }
};

// Create notification (admin endpoint)
const createNotificationEndpoint = async (request, response) => {
    try {
        // Input validation
        if (!request.userID) {
            throw CustomException('Unauthorized', 401);
        }

        // Get notification data from request body
        const notificationData = {
            ...request.body,
            firmId: request.firmId
        };

        // Use the helper function to create the notification
        const notification = await createNotification(notificationData);

        if (!notification) {
            throw CustomException('Failed to create notification | فشل في إنشاء الإشعار', 500);
        }

        return response.status(201).json({
            success: true,
            message: 'Notification created successfully | تم إنشاء الإشعار بنجاح',
            data: notification
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).json({
            success: false,
            error: { message }
        });
    }
};

module.exports = {
    getNotifications,
    getNotification,
    markAsRead,
    markAllAsRead,
    markMultipleAsRead,
    deleteNotification,
    bulkDeleteNotifications,
    clearReadNotifications,
    getNotificationsByType,
    getUnreadCount,
    createNotification,
    createNotificationEndpoint,
    createBulkNotifications
};
