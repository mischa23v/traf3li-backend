const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

// ============================================
// LEAD ROUTES
// ============================================

// CRUD
router.post('/', leadController.createLead);
router.get('/', leadController.getLeads);
router.get('/stats', leadController.getStats);
router.get('/follow-up', leadController.getNeedingFollowUp);
router.get('/pipeline/:pipelineId?', leadController.getByPipeline);
router.get('/:id', leadController.getLead);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);

// Status & Pipeline
router.post('/:id/status', leadController.updateStatus);
router.post('/:id/move', leadController.moveToStage);

// Conversion
router.get('/:id/conversion-preview', leadController.previewConversion);
router.post('/:id/convert', leadController.convertToClient);

// Activities
router.get('/:id/activities', leadController.getActivities);
router.post('/:id/activities', leadController.logActivity);
router.post('/:id/follow-up', leadController.scheduleFollowUp);

module.exports = router;
