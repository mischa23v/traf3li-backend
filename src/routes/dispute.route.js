const express = require('express');
const {
    createDispute,
    getDisputes,
    getDisputeById,
    lawyerRespond,
    escalateDispute,
    resolveDispute,
    addEvidence,
    getDisputeStats,
    getDisputesByType,
    addMediatorNote
} = require('../controllers/dispute.controller');
const { authenticate } = require('../middlewares');
const { requireFirm } = require('../middlewares/firmFilter.middleware');

const app = express.Router();

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES (require authentication only)
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new dispute
 * POST /api/disputes
 * Auth: Required
 */
app.post('/', authenticate, createDispute);

/**
 * Get all disputes (with filters)
 * GET /api/disputes
 * Auth: Required
 * Query params: firmId, status, type, priority, clientId, lawyerId, mediatorId,
 *               caseId, paymentId, startDate, endDate, page, limit, sortBy, sortOrder
 */
app.get('/', authenticate, getDisputes);

/**
 * Get dispute statistics
 * GET /api/disputes/stats
 * Auth: Required
 * Query params: firmId, lawyerId, clientId, startDate, endDate
 */
app.get('/stats', authenticate, getDisputeStats);

/**
 * Get disputes by type
 * GET /api/disputes/by-type
 * Auth: Required
 * Query params: firmId, startDate, endDate
 */
app.get('/by-type', authenticate, getDisputesByType);

/**
 * Get dispute by ID
 * GET /api/disputes/:id
 * Auth: Required
 */
app.get('/:id', authenticate, getDisputeById);

/**
 * Lawyer responds to dispute
 * POST /api/disputes/:id/respond
 * Auth: Required (must be the assigned lawyer)
 */
app.post('/:id/respond', authenticate, lawyerRespond);

/**
 * Escalate dispute
 * POST /api/disputes/:id/escalate
 * Auth: Required (must be client or lawyer)
 */
app.post('/:id/escalate', authenticate, escalateDispute);

/**
 * Resolve dispute
 * POST /api/disputes/:id/resolve
 * Auth: Required (admin or assigned mediator)
 */
app.post('/:id/resolve', authenticate, resolveDispute);

/**
 * Add evidence to dispute
 * POST /api/disputes/:id/evidence
 * Auth: Required (client or lawyer)
 * Body: { type, url, filename, fileKey, description, userRole }
 */
app.post('/:id/evidence', authenticate, addEvidence);

/**
 * Add mediator note
 * POST /api/disputes/:id/mediator-note
 * Auth: Required (assigned mediator only)
 * Body: { note }
 */
app.post('/:id/mediator-note', authenticate, addMediatorNote);

module.exports = app;
