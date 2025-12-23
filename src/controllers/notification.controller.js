const { Notification } = require('../models');
const CustomException = require('../utils/CustomException');
const { emitNotification, emitNotificationCount } = require('../configs/socket');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

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

        // IDOR Protection: Only fetch notifications for authenticated user
        const query = { userId: sanitizeObjectId(request.userID) };

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

        // Get unread count
        const unreadCount = await Notification.countDocuments({
            userId: request.userID,
            read: false
        });

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

        // IDOR Protection: Only allow user to access their own notifications
        const notification = await Notification.findOne({
            _id: sanitizedId,
            userId: sanitizeObjectId(request.userID)
        });

        if (!notification) {
            throw CustomException('Notification not found', 404);
        }

        notification.read = true;
        notification.readAt = new Date();
        await notification.save();

        // Get updated unread count
        const unreadCount = await Notification.countDocuments({
            userId: request.userID,
            read: false
        });

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

        // IDOR Protection: Only update notifications for authenticated user
        const result = await Notification.updateMany(
            { userId: sanitizeObjectId(request.userID), read: false },
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

        // IDOR Protection: Only allow user to delete their own notifications
        const notification = await Notification.findOneAndDelete({
            _id: sanitizedId,
            userId: sanitizeObjectId(request.userID)
        });

        if (!notification) {
            throw CustomException('Notification not found', 404);
        }

        // Get updated unread count
        const unreadCount = await Notification.countDocuments({
            userId: request.userID,
            read: false
        });

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

        // IDOR Protection: Only count notifications for authenticated user
        const count = await Notification.countDocuments({
            userId: sanitizeObjectId(request.userID),
            read: false
        });

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

        // Get and emit updated unread count
        const unreadCount = await Notification.countDocuments({
            userId: sanitizedData.userId,
            read: false
        });
        emitNotificationCount(sanitizedData.userId, unreadCount);

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
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

        // Emit updated counts for all affected users
        const userIds = [...new Set(sanitizedNotifications.map(n => n.userId.toString()))];
        for (const userId of userIds) {
            const unreadCount = await Notification.countDocuments({
                userId,
                read: false
            });
            emitNotificationCount(userId, unreadCount);
        }

        return result;
    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        return [];
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    createNotification,
    createBulkNotifications
};
