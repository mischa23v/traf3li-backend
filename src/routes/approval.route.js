/**
 * Approval Routes - Approval Workflow API
 *
 * All routes require authentication and firm membership.
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    getApprovalRules,
    updateApprovalRules,
    getPendingApprovals,
    getApprovalRequest,
    approveRequest,
    rejectRequest,
    cancelApproval,
    getApprovalHistory
} = require('../controllers/approval.controller');

const router = express.Router();

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

// ═══════════════════════════════════════════════════════════════
// APPROVAL RULES MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/approvals/rules - Get approval rules for the firm
router.get('/rules', getApprovalRules);

// PUT /api/approvals/rules - Update all approval rules
router.put('/rules', updateApprovalRules);

// ═══════════════════════════════════════════════════════════════
// PENDING APPROVALS
// ═══════════════════════════════════════════════════════════════

// GET /api/approvals/pending - Get pending approvals for current user
router.get('/pending', getPendingApprovals);

// GET /api/approvals/history - Get approval history
router.get('/history', getApprovalHistory);

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL APPROVAL REQUESTS
// ═══════════════════════════════════════════════════════════════

// GET /api/approvals/:id - Get approval request details
router.get('/:id', getApprovalRequest);

// POST /api/approvals/:id/approve - Approve a request
router.post('/:id/approve', approveRequest);

// POST /api/approvals/:id/reject - Reject a request
router.post('/:id/reject', rejectRequest);

// POST /api/approvals/:id/cancel - Cancel a request (by requester)
router.post('/:id/cancel', cancelApproval);

module.exports = router;
