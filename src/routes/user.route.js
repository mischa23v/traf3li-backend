const express = require('express');
const { userMiddleware } = require('../middlewares');
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

const app = express.Router();

// Get all lawyers with filters (public - no auth required)
app.get('/lawyers', getLawyers);

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
app.put('/notification-preferences', userMiddleware, updateNotificationPreferences);

// Get user profile (public - no auth required)
app.get('/:_id', getUserProfile);

// Get comprehensive lawyer profile with stats (public - no auth required)
app.get('/lawyer/:username', getLawyerProfile);

// Update user profile (protected - must be own profile)
app.patch('/:_id', userMiddleware, updateUserProfile);

// Delete user account (protected - must be own account)
app.delete('/:_id', userMiddleware, deleteUser);

module.exports = app;
