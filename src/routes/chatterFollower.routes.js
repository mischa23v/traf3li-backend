/**
 * Chatter Follower Routes
 *
 * Routes for managing followers on records across different models.
 * Allows users to follow/unfollow records and manage notification preferences.
 *
 * Base route: /api/chatter-followers
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getFollowers,
    addFollower,
    bulkAddFollowers,
    removeFollower,
    updateNotificationPreference,
    toggleFollow,
    getMyFollowedRecords
} = require('../controllers/chatterFollower.controller');

const router = express.Router();

// ============ APPLY MIDDLEWARE ============
// All chatter follower routes require authentication
router.use(userMiddleware);

// ============ USER-SPECIFIC ROUTES ============
// These should come before /:model routes to avoid conflicts

// Get current user's followed records
router.get('/my-followed', getMyFollowedRecords);

// ============ FOLLOWER MANAGEMENT ROUTES ============

// Get followers for a record
router.get('/:model/:recordId/followers', getFollowers);

// Add follower
router.post('/:model/:recordId/followers', addFollower);

// Bulk add followers
router.post('/:model/:recordId/followers/bulk', bulkAddFollowers);

// Remove follower
router.delete('/:model/:recordId/followers/:userId', removeFollower);

// Update notification preference
router.patch('/:model/:recordId/followers/:userId/preferences', updateNotificationPreference);

// Toggle follow for current user
router.post('/:model/:recordId/toggle-follow', toggleFollow);

module.exports = router;
