const express = require('express');
const router = express.Router();
const analyticsReportController = require('../controllers/analyticsReport.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Statistics & Dashboard
router.get('/stats', analyticsReportController.getStats);
router.get('/favorites', analyticsReportController.getFavorites);
router.get('/pinned', analyticsReportController.getPinnedReports);
router.get('/templates', analyticsReportController.getTemplates);

// Section-specific reports
router.get('/section/:section', analyticsReportController.getBySection);

// Create from template
router.post('/from-template/:templateId', analyticsReportController.createFromTemplate);

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List all reports
router.get('/', analyticsReportController.getReports);

// Create new report
router.post('/', analyticsReportController.createReport);

// Bulk delete
router.post('/bulk-delete', analyticsReportController.bulkDeleteReports);

// ═══════════════════════════════════════════════════════════════
// SINGLE REPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get single report
router.get('/:id', analyticsReportController.getReport);

// Update report
router.patch('/:id', analyticsReportController.updateReport);
router.put('/:id', analyticsReportController.updateReport);

// Delete report
router.delete('/:id', analyticsReportController.deleteReport);

// ═══════════════════════════════════════════════════════════════
// REPORT EXECUTION
// ═══════════════════════════════════════════════════════════════

// Run/Execute report
router.post('/:id/run', sensitiveRateLimiter, analyticsReportController.runReport);

// Clone/Duplicate report
router.post('/:id/clone', analyticsReportController.cloneReport);

// Export report
router.post('/:id/export', sensitiveRateLimiter, analyticsReportController.exportReport);

// ═══════════════════════════════════════════════════════════════
// FAVORITES & PINNING
// ═══════════════════════════════════════════════════════════════

// Toggle favorite
router.post('/:id/favorite', analyticsReportController.toggleFavorite);

// Toggle pinned
router.post('/:id/pin', analyticsReportController.togglePinned);

// ═══════════════════════════════════════════════════════════════
// SCHEDULING
// ═══════════════════════════════════════════════════════════════

// Schedule report
router.post('/:id/schedule', analyticsReportController.scheduleReport);

// Unschedule report
router.delete('/:id/schedule', analyticsReportController.unscheduleReport);

module.exports = router;
