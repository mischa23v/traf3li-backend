const express = require('express');
const router = express.Router();
const timelineController = require('../controllers/timeline.controller');
const { userMiddleware } = require('../middlewares');

// Apply authentication to all routes
router.use(userMiddleware);

// ============================================
// TIMELINE ROUTES
// ============================================

// Timeline endpoints
router.get('/:entityType/:entityId', timelineController.getTimeline);
router.get('/:entityType/:entityId/summary', timelineController.getTimelineSummary);

module.exports = router;
