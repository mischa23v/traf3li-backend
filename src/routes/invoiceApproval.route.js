const express = require('express');
const router = express.Router();
const {
    getPendingApprovals,
    getInvoiceApprovals,
    getInvoiceApproval,
    approveInvoice,
    rejectInvoice,
    escalateApproval,
    cancelApproval,
    getApprovalStats,
    getNeedingEscalation
} = require('../controllers/invoiceApproval.controller');
const { authenticate, firmFilter, checkFirmPermission } = require('../middlewares');

// Apply authentication and firm filter to all routes
router.use(authenticate);
router.use(firmFilter);

/**
 * @swagger
 * /api/invoice-approvals/pending:
 *   get:
 *     summary: Get pending approvals for current user
 *     tags: [Invoice Approvals]
 */
router.get('/pending', getPendingApprovals);

/**
 * @swagger
 * /api/invoice-approvals/stats:
 *   get:
 *     summary: Get approval statistics
 *     tags: [Invoice Approvals]
 */
router.get('/stats', checkFirmPermission('view_invoices'), getApprovalStats);

/**
 * @swagger
 * /api/invoice-approvals/needing-escalation:
 *   get:
 *     summary: Get approvals needing escalation
 *     tags: [Invoice Approvals]
 */
router.get('/needing-escalation', checkFirmPermission('manage_invoices'), getNeedingEscalation);

/**
 * @swagger
 * /api/invoice-approvals:
 *   get:
 *     summary: Get all invoice approvals
 *     tags: [Invoice Approvals]
 */
router.get('/', checkFirmPermission('view_invoices'), getInvoiceApprovals);

/**
 * @swagger
 * /api/invoice-approvals/:id:
 *   get:
 *     summary: Get single invoice approval
 *     tags: [Invoice Approvals]
 */
router.get('/:id', checkFirmPermission('view_invoices'), getInvoiceApproval);

/**
 * @swagger
 * /api/invoice-approvals/:id/approve:
 *   post:
 *     summary: Approve invoice at current level
 *     tags: [Invoice Approvals]
 */
router.post('/:id/approve', approveInvoice);

/**
 * @swagger
 * /api/invoice-approvals/:id/reject:
 *   post:
 *     summary: Reject invoice approval
 *     tags: [Invoice Approvals]
 */
router.post('/:id/reject', rejectInvoice);

/**
 * @swagger
 * /api/invoice-approvals/:id/escalate:
 *   post:
 *     summary: Escalate invoice approval
 *     tags: [Invoice Approvals]
 */
router.post('/:id/escalate', checkFirmPermission('manage_invoices'), escalateApproval);

/**
 * @swagger
 * /api/invoice-approvals/:id/cancel:
 *   post:
 *     summary: Cancel invoice approval
 *     tags: [Invoice Approvals]
 */
router.post('/:id/cancel', cancelApproval);

module.exports = router;
