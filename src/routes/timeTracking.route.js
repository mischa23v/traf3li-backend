const express = require('express');
const router = express.Router();
const timeTrackingController = require('../controllers/timeTracking.controller');
const { authenticate } = require('../middlewares/authenticate');

// Create time entry
router.post(
  '/',
  authenticate,
  timeTrackingController.createTimeEntry
);

// Get all time entries with filters
router.get(
  '/',
  authenticate,
  timeTrackingController.getTimeEntries
);

// Get time statistics
router.get(
  '/stats',
  authenticate,
  timeTrackingController.getTimeStats
);

// Get time grouped by case
router.get(
  '/by-case',
  authenticate,
  timeTrackingController.getTimeByCase
);

// Get time grouped by day
router.get(
  '/by-day',
  authenticate,
  timeTrackingController.getTimeByDay
);

// Get unbilled time entries
router.get(
  '/unbilled',
  authenticate,
  timeTrackingController.getUnbilledTime
);

// Export time entries to CSV
router.get(
  '/export',
  authenticate,
  timeTrackingController.exportTimeEntries
);

// Get time entries by case
router.get(
  '/case/:caseId',
  authenticate,
  timeTrackingController.getTimeEntriesByCase
);

// Get single time entry
router.get(
  '/:id',
  authenticate,
  timeTrackingController.getTimeEntry
);

// Update time entry
router.put(
  '/:id',
  authenticate,
  timeTrackingController.updateTimeEntry
);

// Delete time entry
router.delete(
  '/:id',
  authenticate,
  timeTrackingController.deleteTimeEntry
);

// Mark time entries as billed
router.post(
  '/mark-billed',
  authenticate,
  timeTrackingController.markTimeAsBilled
);

module.exports = router;
