/**
 * Automation Routes
 *
 * Routes for automation management and workflow automation.
 * Allows firms to create and manage automated workflows triggered by various events.
 *
 * Base route: /api/automations
 */

const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automation.controller');
const { userMiddleware } = require('../middlewares');
const { authorize } = require('../middlewares/authorize.middleware');

// ============ APPLY MIDDLEWARE ============
// All automation routes require authentication
router.use(userMiddleware);

// ============ CRUD OPERATIONS ============

// Get all automations for the firm
router.get('/', automationController.listAutomations);

// Create a new automation (admin/owner/partner only)
router.post('/', authorize('admin', 'owner', 'partner'), automationController.createAutomation);

// Get single automation by ID
router.get('/:id', automationController.getAutomation);

// Update automation (admin/owner/partner only)
router.put('/:id', authorize('admin', 'owner', 'partner'), automationController.updateAutomation);

// Delete automation (admin/owner/partner only)
router.delete('/:id', authorize('admin', 'owner', 'partner'), automationController.deleteAutomation);

// ============ AUTOMATION ACTIONS ============

// Enable automation (admin/owner/partner only)
router.post('/:id/enable', authorize('admin', 'owner', 'partner'), automationController.enableAutomation);

// Disable automation (admin/owner/partner only)
router.post('/:id/disable', authorize('admin', 'owner', 'partner'), automationController.disableAutomation);

// ============ TESTING AND MONITORING ============

// Test automation
router.post('/:id/test', automationController.testAutomation);

// Get automation statistics
router.get('/:id/stats', automationController.getAutomationStats);

// Get automation execution logs
router.get('/:id/logs', automationController.getExecutionLogs);

module.exports = router;
