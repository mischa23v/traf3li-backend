const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount
} = require('../controllers/notification.controller');

const app = express.Router();

// Get all notifications
app.get('/', userMiddleware, getNotifications);

// Get unread count
app.get('/unread-count', userMiddleware, getUnreadCount);

// Mark single notification as read
app.patch('/:id/read', userMiddleware, markAsRead);

// Mark all as read
app.patch('/mark-all-read', userMiddleware, markAllAsRead);

// Delete notification
app.delete('/:id', userMiddleware, deleteNotification);

module.exports = app;
