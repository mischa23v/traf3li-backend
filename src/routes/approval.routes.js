/**
 * Approval Routes - Workflow and Approval Management API
 *
 * All routes require authentication.
 * Workflow management routes require admin or owner authorization.
 */

const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');
const authenticate = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize.middleware');

// Apply authentication to all routes
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// WORKFLOW MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/approval/workflows - List all workflows
router.get('/workflows', approvalController.listWorkflows);

// POST /api/approval/workflows - Create new workflow
router.post('/workflows', authorize('admin', 'owner'), approvalController.createWorkflow);

// GET /api/approval/workflows/:id - Get specific workflow
router.get('/workflows/:id', approvalController.getWorkflow);

// PUT /api/approval/workflows/:id - Update workflow
router.put('/workflows/:id', authorize('admin', 'owner'), approvalController.updateWorkflow);

// DELETE /api/approval/workflows/:id - Delete workflow
router.delete('/workflows/:id', authorize('admin', 'owner'), approvalController.deleteWorkflow);

// ═══════════════════════════════════════════════════════════════
// APPROVAL INSTANCE ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/approval/initiate - Initiate new approval process
router.post('/initiate', approvalController.initiateApproval);

// GET /api/approval/pending - Get pending approvals for current user
router.get('/pending', approvalController.getPendingApprovals);

// POST /api/approval/:id/decide - Record approval decision
router.post('/:id/decide', approvalController.recordDecision);

// POST /api/approval/:id/cancel - Cancel approval process
router.post('/:id/cancel', approvalController.cancelApproval);

// POST /api/approval/:id/delegate - Delegate approval to another user
router.post('/:id/delegate', approvalController.delegateApproval);

// ═══════════════════════════════════════════════════════════════
// HISTORY ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/approval/history/:entityType/:entityId - Get approval history for entity
router.get('/history/:entityType/:entityId', approvalController.getApprovalHistory);

module.exports = router;
