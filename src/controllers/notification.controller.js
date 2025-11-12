const { Notification } = require('../models');
const CustomException = require('../utils/CustomException');
const { emitNotification, emitNotificationCount } = require('../configs/socket');

// Get all notifications for user
const getNotifications = async (request, response) => {
    try {
        const { read, type, page = 1, limit = 50 } = request.query;
        
        const query = { userId: request.userID };
        
        // Optional filters
        if (read !== undefined) {
            query.read = read === 'true';
        }
        
        if (type) {
            query.type = type;
        }
        
        // Get notifications with pagination
        const notifications = await Notification.find(query)
            .sort({ read: 1, createdAt: -1 }) // Unread first, then newest
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();
        
        // Get unread count
        const unreadCount = await Notification.countDocuments({
            userId: request.userID,
            read: false
        });
        
        return response.status(200).send({
            notifications,
            unreadCount,
            page: parseInt(page),
            limit: parseInt(limit)
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
        
        const notification = await Notification.findOne({
            _id: id,
            userId: request.userID
        });
        
        if (!notification) {
            throw new CustomException('Notification not found', 404);
        }
        
        notification.read = true;
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
        const result = await Notification.updateMany(
            { userId: request.userID, read: false },
            { $set: { read: true } }
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
        
        const notification = await Notification.findOneAndDelete({
            _id: id,
            userId: request.userID
        });
        
        if (!notification) {
            throw new CustomException('Notification not found', 404);
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
        const count = await Notification.countDocuments({
            userId: request.userID,
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
        const notification = new Notification(notificationData);
        await notification.save();
        
        // Emit notification via Socket.io
        emitNotification(notificationData.userId, notification.toObject());
        
        // Get and emit updated unread count
        const unreadCount = await Notification.countDocuments({
            userId: notificationData.userId,
            read: false
        });
        emitNotificationCount(notificationData.userId, unreadCount);
        
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

// Bulk create notifications
const createBulkNotifications = async (notifications) => {
    try {
        const result = await Notification.insertMany(notifications);
        
        // Emit each notification via Socket.io
        result.forEach(notification => {
            emitNotification(notification.userId, notification.toObject());
        });
        
        // Emit updated counts for all affected users
        const userIds = [...new Set(notifications.map(n => n.userId))];
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
