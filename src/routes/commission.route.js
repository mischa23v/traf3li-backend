/**
 * Commission Entry Routes (ERPNext Parity)
 * Sales commission tracking for invoices
 *
 * Base route: /api/commissions
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const CommissionEntry = require('../models/commissionEntry.model');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get commission statistics for a sales person
// GET /api/commissions/stats/:salesPersonId
router.get('/stats/:salesPersonId', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const stats = await CommissionEntry.getCommissionStats(
            req.params.salesPersonId,
            startDate,
            endDate
        );
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get pending commissions for a sales person
// GET /api/commissions/pending/:salesPersonId
router.get('/pending/:salesPersonId', userMiddleware, firmFilter, async (req, res) => {
    try {
        const commissions = await CommissionEntry.getPendingCommissions(req.params.salesPersonId);
        res.json({ success: true, data: commissions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get commissions for an invoice
// GET /api/commissions/by-invoice/:invoiceId
router.get('/by-invoice/:invoiceId', userMiddleware, firmFilter, async (req, res) => {
    try {
        const commissions = await CommissionEntry.find({ invoiceId: req.params.invoiceId })
            .populate('salesPersonId', 'firstName lastName email')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: commissions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk approve commissions
// POST /api/commissions/bulk-approve
router.post('/bulk-approve', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { ids, notes } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'ids array is required' });
        }

        const result = await CommissionEntry.approveCommissions(ids, req.user._id, notes);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk mark commissions as paid
// POST /api/commissions/bulk-pay
router.post('/bulk-pay', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { ids, paymentReference, paymentMethod } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'ids array is required' });
        }

        const result = await CommissionEntry.markAsPaid(ids, req.user._id, {
            paymentReference,
            paymentMethod
        });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// List all commissions with filters
// GET /api/commissions
router.get('/', userMiddleware, firmFilter, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            salesPersonId,
            startDate,
            endDate
        } = req.query;

        const query = { firmId: req.firmId };
        if (req.lawyerId) query.lawyerId = req.lawyerId;
        if (status) query.status = status;
        if (salesPersonId) query.salesPersonId = salesPersonId;
        if (startDate || endDate) {
            query.commissionDate = {};
            if (startDate) query.commissionDate.$gte = new Date(startDate);
            if (endDate) query.commissionDate.$lte = new Date(endDate);
        }

        const commissions = await CommissionEntry.find(query)
            .populate('salesPersonId', 'firstName lastName email')
            .populate('invoiceId', 'invoiceNumber totalAmount')
            .populate('clientId', 'firstName lastName companyName')
            .sort({ commissionDate: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await CommissionEntry.countDocuments(query);

        res.json({
            success: true,
            data: commissions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single commission entry
// GET /api/commissions/:id
router.get('/:id', userMiddleware, firmFilter, async (req, res) => {
    try {
        const commission = await CommissionEntry.findById(req.params.id)
            .populate('salesPersonId', 'firstName lastName email')
            .populate('invoiceId', 'invoiceNumber totalAmount issueDate')
            .populate('clientId', 'firstName lastName companyName')
            .populate('approvedBy', 'firstName lastName')
            .populate('paidBy', 'firstName lastName');

        if (!commission) {
            return res.status(404).json({ success: false, error: 'Commission entry not found' });
        }

        res.json({ success: true, data: commission });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// STATUS ACTIONS
// ═══════════════════════════════════════════════════════════════

// Approve single commission
// POST /api/commissions/:id/approve
router.post('/:id/approve', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { notes } = req.body;
        const commission = await CommissionEntry.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: 'approved',
                    approvedBy: req.user._id,
                    approvedAt: new Date(),
                    approvalNotes: notes
                }
            },
            { new: true }
        );

        if (!commission) {
            return res.status(404).json({ success: false, error: 'Commission entry not found' });
        }

        res.json({ success: true, data: commission });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark single commission as paid
// POST /api/commissions/:id/pay
router.post('/:id/pay', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { paymentReference, paymentMethod } = req.body;
        const commission = await CommissionEntry.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: 'paid',
                    paidDate: new Date(),
                    paidBy: req.user._id,
                    paymentReference,
                    paymentMethod
                }
            },
            { new: true }
        );

        if (!commission) {
            return res.status(404).json({ success: false, error: 'Commission entry not found' });
        }

        res.json({ success: true, data: commission });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cancel commission
// POST /api/commissions/:id/cancel
router.post('/:id/cancel', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { reason } = req.body;
        const commission = await CommissionEntry.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: 'cancelled',
                    notes: reason
                }
            },
            { new: true }
        );

        if (!commission) {
            return res.status(404).json({ success: false, error: 'Commission entry not found' });
        }

        res.json({ success: true, data: commission });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
