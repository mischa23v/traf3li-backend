const express = require('express');
const { userMiddleware, requireAdmin, firmFilter } = require('../middlewares');
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

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get all notifications
// GET /api/notifications?read=true|false&type=&page=1&limit=50
app.get('/', userMiddleware, getNotifications);

// Get unread count
// GET /api/notifications/unread-count
app.get('/unread-count', userMiddleware, getUnreadCount);

// Mark all as read
// PATCH /api/notifications/mark-all-read
app.patch('/mark-all-read', userMiddleware, markAllAsRead);

// Mark multiple notifications as read
// PATCH /api/notifications/mark-multiple-read
// Body: { ids: ['id1', 'id2', ...] }
app.patch('/mark-multiple-read', userMiddleware, markMultipleAsRead);

// Bulk delete notifications
// DELETE /api/notifications/bulk-delete
// Body: { ids: ['id1', 'id2', ...] }
app.delete('/bulk-delete', userMiddleware, bulkDeleteNotifications);

// Clear all read notifications
// DELETE /api/notifications/clear-read
app.delete('/clear-read', userMiddleware, clearReadNotifications);

// Get notifications by type
// GET /api/notifications/by-type/:type
app.get('/by-type/:type', userMiddleware, getNotificationsByType);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create notification (admin only)
// POST /api/notifications
// Body: { userId, type, title, message, ... }
app.post('/', userMiddleware, firmFilter, requireAdmin, createNotificationEndpoint);

// Get single notification
// GET /api/notifications/:id
app.get('/:id', userMiddleware, getNotification);

// Mark single notification as read
// PATCH /api/notifications/:id/read
app.patch('/:id/read', userMiddleware, markAsRead);

// Delete notification
// DELETE /api/notifications/:id
app.delete('/:id', userMiddleware, deleteNotification);

module.exports = app;
