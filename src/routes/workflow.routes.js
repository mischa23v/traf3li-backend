/**
 * Workflow Automation Routes
 *
 * Routes for workflow template and instance management.
 * Allows firms to create and execute automated workflows for common business processes.
 *
 * Base route: /api/workflows
 */

const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');
const { userMiddleware } = require('../middlewares');
const { authorize } = require('../middlewares/authorize.middleware');

// ============ APPLY MIDDLEWARE ============
// All workflow routes require authentication
router.use(userMiddleware);

// ============================================
// WORKFLOW TEMPLATES
// ============================================

// List all workflow templates (including system templates)
router.get('/templates', workflowController.listTemplates);

// Create a new workflow template (admin/owner only)
router.post('/templates', authorize('admin', 'owner'), workflowController.createTemplate);

// Get single template by ID
router.get('/templates/:id', workflowController.getTemplate);

// Update workflow template (admin/owner only)
router.put('/templates/:id', authorize('admin', 'owner'), workflowController.updateTemplate);

// Delete workflow template (admin/owner only)
router.delete('/templates/:id', authorize('admin', 'owner'), workflowController.deleteTemplate);

// ============================================
// WORKFLOW INSTANCES
// ============================================

// List all workflow instances
router.get('/instances', workflowController.listInstances);

// Start a new workflow instance
router.post('/instances', workflowController.startWorkflow);

// Get workflow instance status
router.get('/instances/:id', workflowController.getWorkflowStatus);

// Pause workflow instance
router.post('/instances/:id/pause', workflowController.pauseWorkflow);

// Resume workflow instance
router.post('/instances/:id/resume', workflowController.resumeWorkflow);

// Cancel workflow instance
router.post('/instances/:id/cancel', workflowController.cancelWorkflow);

// Advance workflow to next step
router.post('/instances/:id/advance', workflowController.advanceStep);

// Get active workflows for a specific entity
router.get('/entity/:entityType/:entityId', workflowController.getActiveWorkflows);

module.exports = router;
