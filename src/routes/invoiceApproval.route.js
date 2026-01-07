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
const { authenticate, checkFirmPermission } = require('../middlewares');

// Apply authentication to all routes
router.use(authenticate);

router.get('/pending', getPendingApprovals);

router.get('/stats', checkFirmPermission('view_invoices'), getApprovalStats);

router.get('/needing-escalation', checkFirmPermission('manage_invoices'), getNeedingEscalation);

router.get('/', checkFirmPermission('view_invoices'), getInvoiceApprovals);

router.get('/:id', checkFirmPermission('view_invoices'), getInvoiceApproval);

router.post('/:id/approve', approveInvoice);

router.post('/:id/reject', rejectInvoice);

router.post('/:id/escalate', checkFirmPermission('manage_invoices'), escalateApproval);

router.post('/:id/cancel', cancelApproval);

module.exports = router;
