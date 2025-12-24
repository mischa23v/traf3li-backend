const express = require('express');
const router = express.Router();
const timelineController = require('../controllers/timeline.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// Apply authentication and firm filtering to all routes
router.use(userMiddleware);
router.use(firmFilter);

// ============================================
// TIMELINE ROUTES
// ============================================

// Timeline endpoints
router.get('/:entityType/:entityId', timelineController.getTimeline);
router.get('/:entityType/:entityId/summary', timelineController.getTimelineSummary);

module.exports = router;
