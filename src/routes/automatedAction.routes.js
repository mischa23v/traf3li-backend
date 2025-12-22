/**
 * Automated Action Routes
 *
 * Routes for automated action management and workflow automation.
 * Allows firms to create and manage automated actions triggered by model events.
 *
 * Base route: /api/automated-actions
 */

const express = require('express');
const { userMiddleware, firmFilter, firmAdminOnly } = require('../middlewares');
const {
    getActions,
    createAction,
    getAvailableModels,
    getModelFields,
    getAction,
    updateAction,
    deleteAction,
    toggleActive,
    testAction,
    getActionLogs
} = require('../controllers/automatedAction.controller');

const router = express.Router();

// ============ APPLY MIDDLEWARE ============
// All automated action routes require authentication and firm filtering
router.use(userMiddleware);
router.use(firmFilter);

// ============ INFORMATIONAL ENDPOINTS ============
// These should come before /:id routes to avoid conflicts

// Get available models for automation
router.get('/models', getAvailableModels);

// Get fields for a specific model
router.get('/models/:modelName/fields', getModelFields);

// ============ CRUD OPERATIONS ============

// Get all automated actions for the firm
router.get('/', getActions);

// Create a new automated action (admin/manager only)
router.post('/', firmAdminOnly, createAction);

// Get single automated action by ID
router.get('/:id', getAction);

// Update automated action (admin/manager only)
router.patch('/:id', firmAdminOnly, updateAction);

// Delete automated action (admin/manager only)
router.delete('/:id', firmAdminOnly, deleteAction);

// ============ ACTION OPERATIONS ============

// Toggle action active status
router.post('/:id/toggle', firmAdminOnly, toggleActive);

// Test automated action
router.post('/:id/test', testAction);

// Get action execution logs
router.get('/:id/logs', getActionLogs);

module.exports = router;
