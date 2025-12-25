const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { userMiddleware, firmFilter } = require('../middlewares');
const { sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
router.use(userMiddleware);
router.use(firmFilter);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Report validation
router.post('/validate', reportController.validateReport);

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List all reports
router.get('/', reportController.listReports);

// Create new report
router.post('/', reportController.createReport);

// ═══════════════════════════════════════════════════════════════
// SINGLE REPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get single report
router.get('/:id', reportController.getReport);

// Update report
router.put('/:id', reportController.updateReport);

// Delete report
router.delete('/:id', reportController.deleteReport);

// ═══════════════════════════════════════════════════════════════
// REPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Execute report
router.get('/:id/execute', sensitiveRateLimiter, reportController.executeReport);

// Clone/Duplicate report
router.post('/:id/clone', reportController.cloneReport);

// Update schedule
router.put('/:id/schedule', reportController.updateSchedule);

// Export report
router.get('/:id/export/:format', sensitiveRateLimiter, reportController.exportReport);

module.exports = router;
