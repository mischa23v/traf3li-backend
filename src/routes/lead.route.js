const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    validateCreateLead,
    validateUpdateLead,
    validateUpdateStatus,
    validateMoveToStage,
    validateConvertToClient,
    validateLogActivity,
    validateScheduleFollowUp,
    validateGetLeadsQuery,
    validateGetActivitiesQuery,
    validateLeadIdParam
} = require('../validators/lead.validator');

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

// ============================================
// LEAD ROUTES
// ============================================

// CRUD
router.post('/', validateCreateLead, leadController.createLead);
router.get('/', validateGetLeadsQuery, leadController.getLeads);
router.get('/stats', leadController.getStats);
router.get('/follow-up', leadController.getNeedingFollowUp);
router.get('/pipeline/:pipelineId?', leadController.getByPipeline);
router.get('/:id', validateLeadIdParam, leadController.getLead);
router.put('/:id', validateLeadIdParam, validateUpdateLead, leadController.updateLead);
router.delete('/:id', validateLeadIdParam, leadController.deleteLead);

// Status & Pipeline
router.post('/:id/status', validateLeadIdParam, validateUpdateStatus, leadController.updateStatus);
router.post('/:id/move', validateLeadIdParam, validateMoveToStage, leadController.moveToStage);

// Conversion
router.get('/:id/conversion-preview', validateLeadIdParam, leadController.previewConversion);
router.post('/:id/convert', validateLeadIdParam, validateConvertToClient, leadController.convertToClient);

// Activities
router.get('/:id/activities', validateLeadIdParam, validateGetActivitiesQuery, leadController.getActivities);
router.post('/:id/activities', validateLeadIdParam, validateLogActivity, leadController.logActivity);
router.post('/:id/follow-up', validateLeadIdParam, validateScheduleFollowUp, leadController.scheduleFollowUp);

module.exports = router;
