const express = require('express');
const { requireAdmin } = require('../middlewares');
const {
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
    createNotificationEndpoint
} = require('../controllers/notification.controller');

const app = express.Router();

// Static routes (must come before parameterized routes)

// Get all notifications
app.get('/', getNotifications);

// Get unread count
app.get('/unread-count', getUnreadCount);

// Mark all as read
app.patch('/mark-all-read', markAllAsRead);

// Mark multiple notifications as read
app.patch('/mark-multiple-read', markMultipleAsRead);

// Bulk delete notifications
app.delete('/bulk-delete', bulkDeleteNotifications);

// Clear all read notifications
app.delete('/clear-read', clearReadNotifications);

// Get notifications by type
app.get('/by-type/:type', getNotificationsByType);

// CRUD routes

// Create notification (admin only)
app.post('/', requireAdmin, createNotificationEndpoint);

// Get single notification
app.get('/:id', getNotification);

// Mark single notification as read
app.patch('/:id/read', markAsRead);

// Delete notification
app.delete('/:id', deleteNotification);

module.exports = app;
