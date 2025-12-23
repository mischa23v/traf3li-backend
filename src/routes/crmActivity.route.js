const express = require('express');
const router = express.Router();
const crmActivityController = require('../controllers/crmActivity.controller');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Apply authentication to all routes
router.use(userMiddleware);

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// ============================================
// CRM ACTIVITY ROUTES
// ============================================

// Timeline & Stats (before :id routes)
router.get('/timeline', crmActivityController.getTimeline);
router.get('/stats', crmActivityController.getStats);
router.get('/tasks/upcoming', crmActivityController.getUpcomingTasks);

// Quick log methods
router.post('/log/call', crmActivityController.logCall);
router.post('/log/email', crmActivityController.logEmail);
router.post('/log/meeting', crmActivityController.logMeeting);
router.post('/log/note', crmActivityController.addNote);

// Entity activities
router.get('/entity/:entityType/:entityId', crmActivityController.getEntityActivities);

// CRUD
router.post('/', crmActivityController.createActivity);
router.get('/', crmActivityController.getActivities);
router.get('/:id', crmActivityController.getActivity);
router.put('/:id', crmActivityController.updateActivity);
router.delete('/:id', crmActivityController.deleteActivity);

// Task operations
router.post('/:id/complete', crmActivityController.completeTask);

module.exports = router;
