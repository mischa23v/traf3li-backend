/**
 * Inter-Company Extended Routes
 *
 * Extended routes for inter-company at /api/inter-company
 * Adds reconciliation, matching, firms, exchange rates, reports
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

const ALLOWED_RECONCILIATION_FIELDS = [
    'name', 'firmIds', 'startDate', 'endDate', 'currency', 'status', 'notes'
];

/**
 * POST /api/inter-company/transactions/:id/post
 * Post transaction to ledger
 */
router.post('/transactions/:id/post', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transaction ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany.transactions');

        const transaction = (firm?.interCompany?.transactions || [])
            .find(t => t._id.toString() === sanitizedId);

        if (!transaction) {
            throw CustomException('Transaction not found', 404);
        }

        if (transaction.status !== 'pending' && transaction.status !== 'confirmed') {
            throw CustomException('Only pending or confirmed transactions can be posted', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'interCompany.transactions._id': sanitizedId
            },
            {
                $set: {
                    'interCompany.transactions.$.status': 'posted',
                    'interCompany.transactions.$.postedAt': new Date(),
                    'interCompany.transactions.$.postedBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Transaction posted to ledger'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/inter-company/balances/between
 * Get balances between two specific firms
 */
router.get('/balances/between', async (req, res) => {
    try {
        const { firmId1, firmId2, currency } = req.query;

        if (!firmId1 || !firmId2) {
            throw CustomException('Both firm IDs are required', 400);
        }

        const sanitizedFirmId1 = sanitizeObjectId(firmId1);
        const sanitizedFirmId2 = sanitizeObjectId(firmId2);

        if (!sanitizedFirmId1 || !sanitizedFirmId2) {
            throw CustomException('Invalid firm ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany.transactions');

        const transactions = (firm?.interCompany?.transactions || [])
            .filter(t =>
                t.status === 'posted' &&
                ((t.fromFirmId?.toString() === sanitizedFirmId1 && t.toFirmId?.toString() === sanitizedFirmId2) ||
                    (t.fromFirmId?.toString() === sanitizedFirmId2 && t.toFirmId?.toString() === sanitizedFirmId1))
            );

        let balance = 0;
        transactions.forEach(t => {
            if (t.fromFirmId?.toString() === sanitizedFirmId1) {
                balance -= t.amount;
            } else {
                balance += t.amount;
            }
        });

        return res.json({
            success: true,
            data: {
                firmId1: sanitizedFirmId1,
                firmId2: sanitizedFirmId2,
                balance,
                currency: currency || 'SAR',
                transactionCount: transactions.length
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/inter-company/transactions/between
 * Get transactions between two specific firms
 */
router.get('/transactions/between', async (req, res) => {
    try {
        const { firmId1, firmId2, startDate, endDate } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        if (!firmId1 || !firmId2) {
            throw CustomException('Both firm IDs are required', 400);
        }

        const sanitizedFirmId1 = sanitizeObjectId(firmId1);
        const sanitizedFirmId2 = sanitizeObjectId(firmId2);

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany.transactions');

        let transactions = (firm?.interCompany?.transactions || [])
            .filter(t =>
                (t.fromFirmId?.toString() === sanitizedFirmId1 && t.toFirmId?.toString() === sanitizedFirmId2) ||
                (t.fromFirmId?.toString() === sanitizedFirmId2 && t.toFirmId?.toString() === sanitizedFirmId1)
            );

        if (startDate) {
            transactions = transactions.filter(t =>
                new Date(t.transactionDate) >= new Date(startDate)
            );
        }

        if (endDate) {
            transactions = transactions.filter(t =>
                new Date(t.transactionDate) <= new Date(endDate)
            );
        }

        const total = transactions.length;
        const paginatedTransactions = transactions.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedTransactions.length,
            data: paginatedTransactions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/inter-company/reconciliations
 * List all reconciliations
 */
router.get('/reconciliations', async (req, res) => {
    try {
        const { status } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany.reconciliations');

        let reconciliations = firm?.interCompany?.reconciliations || [];

        if (status) {
            reconciliations = reconciliations.filter(r => r.status === status);
        }

        reconciliations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = reconciliations.length;
        const paginatedReconciliations = reconciliations.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedReconciliations.length,
            data: paginatedReconciliations,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/inter-company/reconciliations/:id
 * Get single reconciliation
 */
router.get('/reconciliations/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid reconciliation ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany.reconciliations');

        const reconciliation = (firm?.interCompany?.reconciliations || [])
            .find(r => r._id.toString() === sanitizedId);

        if (!reconciliation) {
            throw CustomException('Reconciliation not found', 404);
        }

        return res.json({ success: true, data: reconciliation });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/inter-company/reconciliations
 * Create new reconciliation
 */
router.post('/reconciliations', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_RECONCILIATION_FIELDS);

        if (!allowedFields.name) {
            throw CustomException('Reconciliation name is required', 400);
        }

        const reconciliationId = new mongoose.Types.ObjectId();
        const reconciliationData = {
            _id: reconciliationId,
            ...allowedFields,
            status: 'draft',
            matchedItems: [],
            unmatchedItems: [],
            adjustments: [],
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'interCompany.reconciliations': reconciliationData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Reconciliation created',
            data: reconciliationData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/inter-company/reconciliations/:reconciliationId/auto-match
 * Auto-match transactions in reconciliation
 */
router.post('/reconciliations/:reconciliationId/auto-match', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.reconciliationId);
        if (!sanitizedId) {
            throw CustomException('Invalid reconciliation ID format', 400);
        }

        const { tolerance } = req.body;
        const matchTolerance = tolerance || 0;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany');

        const reconciliation = (firm?.interCompany?.reconciliations || [])
            .find(r => r._id.toString() === sanitizedId);

        if (!reconciliation) {
            throw CustomException('Reconciliation not found', 404);
        }

        const transactions = firm?.interCompany?.transactions || [];
        const matched = [];
        const unmatched = [];

        // Group by amount for matching
        const grouped = {};
        transactions.forEach(t => {
            if (t.status === 'posted') {
                const key = Math.round(Math.abs(t.amount));
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(t);
            }
        });

        Object.entries(grouped).forEach(([amount, group]) => {
            if (group.length === 2) {
                const [t1, t2] = group;
                if (t1.fromFirmId?.toString() !== t2.fromFirmId?.toString()) {
                    matched.push({
                        _id: new mongoose.Types.ObjectId(),
                        transaction1Id: t1._id,
                        transaction2Id: t2._id,
                        amount: Math.abs(t1.amount),
                        matchType: 'auto',
                        matchedAt: new Date()
                    });
                } else {
                    group.forEach(t => unmatched.push(t._id));
                }
            } else {
                group.forEach(t => unmatched.push(t._id));
            }
        });

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'interCompany.reconciliations._id': sanitizedId
            },
            {
                $set: {
                    'interCompany.reconciliations.$.matchedItems': matched,
                    'interCompany.reconciliations.$.unmatchedItems': unmatched,
                    'interCompany.reconciliations.$.lastAutoMatchAt': new Date()
                }
            }
        );

        return res.json({
            success: true,
            message: 'Auto-matching completed',
            data: {
                matchedCount: matched.length,
                unmatchedCount: unmatched.length
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/inter-company/reconciliations/:reconciliationId/manual-match
 * Manually match transactions
 */
router.post('/reconciliations/:reconciliationId/manual-match', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.reconciliationId);
        if (!sanitizedId) {
            throw CustomException('Invalid reconciliation ID format', 400);
        }

        const { transaction1Id, transaction2Id } = req.body;

        if (!transaction1Id || !transaction2Id) {
            throw CustomException('Both transaction IDs are required', 400);
        }

        const match = {
            _id: new mongoose.Types.ObjectId(),
            transaction1Id: sanitizeObjectId(transaction1Id),
            transaction2Id: sanitizeObjectId(transaction2Id),
            matchType: 'manual',
            matchedAt: new Date(),
            matchedBy: req.userID
        };

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'interCompany.reconciliations._id': sanitizedId
            },
            {
                $push: { 'interCompany.reconciliations.$.matchedItems': match },
                $pull: {
                    'interCompany.reconciliations.$.unmatchedItems': {
                        $in: [match.transaction1Id, match.transaction2Id]
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Transactions matched manually',
            data: match
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/inter-company/reconciliations/:reconciliationId/unmatch
 * Unmatch previously matched transactions
 */
router.post('/reconciliations/:reconciliationId/unmatch', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.reconciliationId);
        if (!sanitizedId) {
            throw CustomException('Invalid reconciliation ID format', 400);
        }

        const { matchId } = req.body;
        const sanitizedMatchId = sanitizeObjectId(matchId);

        if (!sanitizedMatchId) {
            throw CustomException('Invalid match ID format', 400);
        }

        // Get the match to restore unmatched items
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany.reconciliations');

        const reconciliation = (firm?.interCompany?.reconciliations || [])
            .find(r => r._id.toString() === sanitizedId);

        const match = reconciliation?.matchedItems?.find(m => m._id.toString() === sanitizedMatchId);

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'interCompany.reconciliations._id': sanitizedId
            },
            {
                $pull: { 'interCompany.reconciliations.$.matchedItems': { _id: sanitizedMatchId } },
                $push: {
                    'interCompany.reconciliations.$.unmatchedItems': {
                        $each: match ? [match.transaction1Id, match.transaction2Id] : []
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Transactions unmatched'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/inter-company/reconciliations/:reconciliationId/adjustments
 * Add adjustment entry
 */
router.post('/reconciliations/:reconciliationId/adjustments', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.reconciliationId);
        if (!sanitizedId) {
            throw CustomException('Invalid reconciliation ID format', 400);
        }

        const { amount, currency, reason, transactionId } = req.body;

        if (!amount || !reason) {
            throw CustomException('Amount and reason are required', 400);
        }

        const adjustmentId = new mongoose.Types.ObjectId();
        const adjustment = {
            _id: adjustmentId,
            amount,
            currency: currency || 'SAR',
            reason,
            transactionId: transactionId ? sanitizeObjectId(transactionId) : null,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'interCompany.reconciliations._id': sanitizedId
            },
            {
                $push: { 'interCompany.reconciliations.$.adjustments': adjustment }
            }
        );

        return res.status(201).json({
            success: true,
            message: 'Adjustment added',
            data: adjustment
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/inter-company/reconciliations/:reconciliationId/complete
 * Complete reconciliation
 */
router.post('/reconciliations/:reconciliationId/complete', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.reconciliationId);
        if (!sanitizedId) {
            throw CustomException('Invalid reconciliation ID format', 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'interCompany.reconciliations._id': sanitizedId,
                'interCompany.reconciliations.status': { $ne: 'approved' }
            },
            {
                $set: {
                    'interCompany.reconciliations.$.status': 'completed',
                    'interCompany.reconciliations.$.completedAt': new Date(),
                    'interCompany.reconciliations.$.completedBy': req.userID
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Reconciliation not found or already approved', 404);
        }

        return res.json({
            success: true,
            message: 'Reconciliation marked as complete'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/inter-company/reconciliations/:reconciliationId/approve
 * Approve completed reconciliation
 */
router.post('/reconciliations/:reconciliationId/approve', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.reconciliationId);
        if (!sanitizedId) {
            throw CustomException('Invalid reconciliation ID format', 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'interCompany.reconciliations._id': sanitizedId,
                'interCompany.reconciliations.status': 'completed'
            },
            {
                $set: {
                    'interCompany.reconciliations.$.status': 'approved',
                    'interCompany.reconciliations.$.approvedAt': new Date(),
                    'interCompany.reconciliations.$.approvedBy': req.userID
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Reconciliation not found or not in completed status', 404);
        }

        return res.json({
            success: true,
            message: 'Reconciliation approved'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/inter-company/firms
 * Get related firms for inter-company transactions
 */
router.get('/firms', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany.relatedFirms');

        const relatedFirmIds = (firm?.interCompany?.relatedFirms || [])
            .map(f => f.firmId)
            .filter(Boolean);

        // Get firm details
        const firms = await Firm.find({
            _id: { $in: relatedFirmIds }
        }).select('name nameAr logo country currency');

        return res.json({
            success: true,
            count: firms.length,
            data: firms
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/inter-company/exchange-rate
 * Get exchange rate between currencies
 */
router.get('/exchange-rate', async (req, res) => {
    try {
        const { from, to, date } = req.query;

        if (!from || !to) {
            throw CustomException('From and to currencies are required', 400);
        }

        // Default exchange rates (SAR-based, for demo purposes)
        const baseRates = {
            SAR: 1,
            USD: 0.2667,
            EUR: 0.2449,
            GBP: 0.2106,
            AED: 0.9793,
            KWD: 0.0818,
            BHD: 0.1004,
            OMR: 0.1026,
            QAR: 0.9710,
            EGP: 8.26
        };

        const fromRate = baseRates[from.toUpperCase()] || 1;
        const toRate = baseRates[to.toUpperCase()] || 1;
        const rate = toRate / fromRate;

        return res.json({
            success: true,
            data: {
                from: from.toUpperCase(),
                to: to.toUpperCase(),
                rate: Math.round(rate * 10000) / 10000,
                date: date || new Date().toISOString().split('T')[0],
                source: 'internal'
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/inter-company/reports/summary
 * Get inter-company summary report
 */
router.get('/reports/summary', async (req, res) => {
    try {
        const { startDate, endDate, currency } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany');

        const transactions = firm?.interCompany?.transactions || [];

        let filtered = transactions.filter(t => t.status === 'posted');

        if (startDate) {
            filtered = filtered.filter(t =>
                new Date(t.transactionDate) >= new Date(startDate)
            );
        }
        if (endDate) {
            filtered = filtered.filter(t =>
                new Date(t.transactionDate) <= new Date(endDate)
            );
        }

        const currentFirmId = req.firmId?.toString();

        const summary = {
            totalTransactions: filtered.length,
            totalReceivables: filtered
                .filter(t => t.toFirmId?.toString() === currentFirmId)
                .reduce((sum, t) => sum + (t.amount || 0), 0),
            totalPayables: filtered
                .filter(t => t.fromFirmId?.toString() === currentFirmId)
                .reduce((sum, t) => sum + (t.amount || 0), 0),
            currency: currency || 'SAR',
            period: {
                start: startDate || null,
                end: endDate || null
            }
        };

        summary.netBalance = summary.totalReceivables - summary.totalPayables;

        return res.json({
            success: true,
            data: summary
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/inter-company/reports/export
 * Export inter-company report
 */
router.post('/reports/export', async (req, res) => {
    try {
        const { format, startDate, endDate, reportType, includeDetails } = req.body;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('interCompany name');

        let data = [];
        let reportName = 'inter-company-report';

        if (reportType === 'transactions') {
            data = firm?.interCompany?.transactions || [];
            reportName = 'transactions-report';
        } else if (reportType === 'reconciliations') {
            data = firm?.interCompany?.reconciliations || [];
            reportName = 'reconciliations-report';
        } else if (reportType === 'balances') {
            // Calculate balances per related firm
            const transactions = firm?.interCompany?.transactions || [];
            const balances = {};

            transactions.filter(t => t.status === 'posted').forEach(t => {
                const otherId = t.fromFirmId?.toString() === req.firmId?.toString()
                    ? t.toFirmId?.toString()
                    : t.fromFirmId?.toString();

                if (!balances[otherId]) {
                    balances[otherId] = { receivables: 0, payables: 0 };
                }

                if (t.toFirmId?.toString() === req.firmId?.toString()) {
                    balances[otherId].receivables += t.amount;
                } else {
                    balances[otherId].payables += t.amount;
                }
            });

            data = Object.entries(balances).map(([firmId, bal]) => ({
                firmId,
                receivables: bal.receivables,
                payables: bal.payables,
                net: bal.receivables - bal.payables
            }));
            reportName = 'balances-report';
        }

        if (startDate) {
            data = data.filter(d =>
                new Date(d.createdAt || d.transactionDate) >= new Date(startDate)
            );
        }
        if (endDate) {
            data = data.filter(d =>
                new Date(d.createdAt || d.transactionDate) <= new Date(endDate)
            );
        }

        const exportId = new mongoose.Types.ObjectId();

        return res.json({
            success: true,
            message: 'Export initiated',
            data: {
                exportId: exportId.toString(),
                format: format || 'xlsx',
                recordCount: data.length,
                reportName,
                firmName: firm?.name
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
