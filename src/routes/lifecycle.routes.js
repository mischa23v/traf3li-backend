/**
 * Lifecycle Routes
 *
 * Routes for workflow lifecycle management.
 * Allows firms to create, manage, and execute workflows for various entities.
 *
 * Base route: /api/lifecycle
 */

const express = require('express');
const router = express.Router();
const lifecycleController = require('../controllers/lifecycle.controller');
const { authenticate } = require('../middlewares');
const { authorize } = require('../middlewares/authorize.middleware');

// ============ APPLY MIDDLEWARE ============
// All lifecycle routes require authentication
router.use(authenticate);

// ============================================
// WORKFLOW MANAGEMENT
// ============================================

// Get all workflows for the firm
router.get('/workflows', lifecycleController.listWorkflows);

// Create a new workflow (admin/owner only)
router.post('/workflows', authorize('admin', 'owner'), lifecycleController.createWorkflow);

// Get single workflow by ID
router.get('/workflows/:id', lifecycleController.getWorkflow);

// Update workflow (admin/owner only)
router.put('/workflows/:id', authorize('admin', 'owner'), lifecycleController.updateWorkflow);

// Delete workflow (admin/owner only)
router.delete('/workflows/:id', authorize('admin', 'owner'), lifecycleController.deleteWorkflow);

// ============================================
// WORKFLOW INSTANCES
// ============================================

// Initiate a new workflow instance
router.post('/initiate', lifecycleController.initiateWorkflow);

// Get active workflows for a specific entity
router.get('/:entityType/:entityId', lifecycleController.getActiveWorkflows);

// ============================================
// INSTANCE OPERATIONS
// ============================================

// Get workflow instance progress
router.get('/instance/:id/progress', lifecycleController.getProgress);

// Advance workflow to next stage
router.post('/instance/:id/advance', lifecycleController.advanceStage);

// Cancel workflow instance
router.post('/instance/:id/cancel', lifecycleController.cancelWorkflow);

module.exports = router;
