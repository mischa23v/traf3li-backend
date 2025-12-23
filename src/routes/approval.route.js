/**
 * Approval Routes - Approval Workflow API
 *
 * All routes require authentication and firm membership.
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    getApprovalRules,
    updateApprovalRules,
    addApprovalRule,
    deleteApprovalRule,
    getRuleTemplates,
    getPendingApprovals,
    getMyRequests,
    getApprovalRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    getApprovalStats,
    checkApprovalRequired
} = require('../controllers/approval.controller');

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

// ═══════════════════════════════════════════════════════════════
// APPROVAL RULES MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/approvals/rules - Get approval rules for the firm
router.get('/rules', getApprovalRules);

// PUT /api/approvals/rules - Update all approval rules
router.put('/rules', updateApprovalRules);

// POST /api/approvals/rules - Add a new approval rule
router.post('/rules', addApprovalRule);

// DELETE /api/approvals/rules/:ruleId - Delete an approval rule
router.delete('/rules/:ruleId', deleteApprovalRule);

// GET /api/approvals/templates - Get default rule templates
router.get('/templates', getRuleTemplates);

// ═══════════════════════════════════════════════════════════════
// PENDING APPROVALS
// ═══════════════════════════════════════════════════════════════

// GET /api/approvals/pending - Get pending approvals for current user
router.get('/pending', getPendingApprovals);

// GET /api/approvals/my-requests - Get my submitted requests
router.get('/my-requests', getMyRequests);

// GET /api/approvals/stats - Get approval statistics
router.get('/stats', getApprovalStats);

// POST /api/approvals/check - Check if action requires approval
router.post('/check', checkApprovalRequired);

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
router.post('/:id/cancel', cancelRequest);

module.exports = router;
