const express = require('express');
const { userMiddleware } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const {
    getUserProfile,
    getLawyerProfile,
    getLawyers,
    updateUserProfile,
    deleteUser,
    getTeamMembers
} = require('../controllers/user.controller');
const {
    savePushSubscription,
    deletePushSubscription,
    getPushSubscriptionStatus,
    updateNotificationPreferences,
    getVapidPublicKey
} = require('../controllers/pushSubscription.controller');
const {
    convertSoloToFirm
} = require('../controllers/firm.controller');

const app = express.Router();

// SECURITY: Removed public access - lawyers listing requires authentication and firm scope
// Get all lawyers with filters (protected - firm members only)
app.get('/lawyers', userMiddleware, getLawyers);

// Get team members (protected - must be before /:_id to avoid conflict)
app.get('/team', userMiddleware, getTeamMembers);

// ========== Push Notifications ==========
// Get VAPID public key (public - needed before login for service worker)
app.get('/vapid-public-key', getVapidPublicKey);

// Push subscription management (protected)
app.get('/push-subscription', userMiddleware, getPushSubscriptionStatus);
app.post('/push-subscription', userMiddleware, savePushSubscription);
app.delete('/push-subscription', userMiddleware, deletePushSubscription);

// Notification preferences (protected)
app.get('/notification-preferences', userMiddleware, getPushSubscriptionStatus);
app.put('/notification-preferences', userMiddleware, auditAction('update_notification_preferences', 'user', { severity: 'low', captureChanges: true }), updateNotificationPreferences);

// ========== Solo Lawyer to Firm Conversion ==========
// Convert solo lawyer to firm owner
app.post('/convert-to-firm', userMiddleware, auditAction('convert_to_firm', 'user', { severity: 'high', captureChanges: true }), convertSoloToFirm);

// SECURITY: Removed public access - user profiles require authentication
// Get user profile (protected - authenticated users only)
app.get('/:_id', userMiddleware, getUserProfile);

// SECURITY: Removed public access - lawyer profiles require authentication
// Get comprehensive lawyer profile with stats (protected - authenticated users only)
app.get('/lawyer/:username', userMiddleware, getLawyerProfile);

// Update user profile (protected - must be own profile)
app.patch('/:_id', userMiddleware, auditAction('update_profile', 'user', { severity: 'medium', captureChanges: true }), updateUserProfile);

// Delete user account (protected - must be own account)
app.delete('/:_id', userMiddleware, auditAction('delete_user', 'user', { severity: 'critical', captureChanges: true }), deleteUser);

module.exports = app;
