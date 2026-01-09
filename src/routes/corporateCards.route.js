/**
 * Corporate Cards Routes
 *
 * Routes for corporate card transactions at /api/corporate-cards
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

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ALLOWED_TRANSACTION_FIELDS = [
    'cardId', 'cardHolderId', 'amount', 'currency', 'merchantName',
    'merchantCategory', 'transactionDate', 'description', 'receiptUrl',
    'status', 'expenseCategory', 'costCenter', 'project', 'notes',
    'isPersonal', 'requiresReceipt'
];

const VALID_STATUSES = ['pending', 'reconciled', 'disputed', 'rejected', 'matched'];

/**
 * GET /api/corporate-cards/transactions
 * List all corporate card transactions
 */
router.get('/transactions', async (req, res) => {
    try {
        const { search, status, cardId, cardHolderId, startDate, endDate, category } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('corporateCards.transactions');

        let transactions = firm?.corporateCards?.transactions || [];

        if (status && VALID_STATUSES.includes(status)) {
            transactions = transactions.filter(t => t.status === status);
        }

        if (cardId) {
            const sanitizedCardId = sanitizeObjectId(cardId);
            if (sanitizedCardId) {
                transactions = transactions.filter(t =>
                    t.cardId?.toString() === sanitizedCardId
                );
            }
        }

        if (cardHolderId) {
            const sanitizedHolderId = sanitizeObjectId(cardHolderId);
            if (sanitizedHolderId) {
                transactions = transactions.filter(t =>
                    t.cardHolderId?.toString() === sanitizedHolderId
                );
            }
        }

        if (category) {
            transactions = transactions.filter(t => t.merchantCategory === category);
        }

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

        if (search && search.trim()) {
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            transactions = transactions.filter(t =>
                searchRegex.test(t.merchantName) ||
                searchRegex.test(t.description)
            );
        }

        transactions.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

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
 * GET /api/corporate-cards/transactions/:id
 * Get single transaction
 */
router.get('/transactions/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transaction ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('corporateCards.transactions');

        const transaction = (firm?.corporateCards?.transactions || [])
            .find(t => t._id.toString() === sanitizedId);

        if (!transaction) {
            throw CustomException('Transaction not found', 404);
        }

        return res.json({ success: true, data: transaction });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/corporate-cards/transactions
 * Create transaction (manual entry)
 */
router.post('/transactions', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_TRANSACTION_FIELDS);

        if (!allowedFields.amount || !allowedFields.merchantName) {
            throw CustomException('Amount and merchant name are required', 400);
        }

        if (allowedFields.cardHolderId) {
            allowedFields.cardHolderId = sanitizeObjectId(allowedFields.cardHolderId);
        }

        const transactionId = new mongoose.Types.ObjectId();
        const transactionData = {
            _id: transactionId,
            ...allowedFields,
            currency: allowedFields.currency || 'SAR',
            status: 'pending',
            source: 'manual',
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'corporateCards.transactions': transactionData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Transaction created',
            data: transactionData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/corporate-cards/transactions/:id
 * Update transaction
 */
router.patch('/transactions/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transaction ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_TRANSACTION_FIELDS);

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'corporateCards.transactions._id': sanitizedId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`corporateCards.transactions.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'corporateCards.transactions.$.updatedAt': new Date(),
                    'corporateCards.transactions.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Transaction not found', 404);
        }

        return res.json({
            success: true,
            message: 'Transaction updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/corporate-cards/transactions/:id
 * Delete transaction
 */
router.delete('/transactions/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transaction ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'corporateCards.transactions': { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Transaction deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/corporate-cards/transactions/:transactionId/reconcile
 * Reconcile transaction with expense
 */
router.post('/transactions/:transactionId/reconcile', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.transactionId);
        if (!sanitizedId) {
            throw CustomException('Invalid transaction ID format', 400);
        }

        const { expenseId, expenseCategory, costCenter, notes } = req.body;

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'corporateCards.transactions._id': sanitizedId
            },
            {
                $set: {
                    'corporateCards.transactions.$.status': 'reconciled',
                    'corporateCards.transactions.$.reconciledExpenseId': expenseId ? sanitizeObjectId(expenseId) : null,
                    'corporateCards.transactions.$.expenseCategory': expenseCategory,
                    'corporateCards.transactions.$.costCenter': costCenter,
                    'corporateCards.transactions.$.reconciliationNotes': notes,
                    'corporateCards.transactions.$.reconciledAt': new Date(),
                    'corporateCards.transactions.$.reconciledBy': req.userID
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Transaction not found', 404);
        }

        return res.json({
            success: true,
            message: 'Transaction reconciled'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/corporate-cards/transactions/bulk-reconcile
 * Bulk reconcile transactions
 */
router.post('/transactions/bulk-reconcile', async (req, res) => {
    try {
        const { transactionIds, expenseCategory, costCenter } = req.body;

        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            throw CustomException('Array of transaction IDs is required', 400);
        }

        if (transactionIds.length > 50) {
            throw CustomException('Maximum 50 transactions per bulk reconcile', 400);
        }

        const sanitizedIds = transactionIds.map(id => sanitizeObjectId(id)).filter(Boolean);
        let reconciledCount = 0;

        for (const transactionId of sanitizedIds) {
            const result = await Firm.findOneAndUpdate(
                {
                    _id: req.firmId,
                    'corporateCards.transactions._id': transactionId
                },
                {
                    $set: {
                        'corporateCards.transactions.$.status': 'reconciled',
                        'corporateCards.transactions.$.expenseCategory': expenseCategory,
                        'corporateCards.transactions.$.costCenter': costCenter,
                        'corporateCards.transactions.$.reconciledAt': new Date(),
                        'corporateCards.transactions.$.reconciledBy': req.userID
                    }
                }
            );
            if (result) reconciledCount++;
        }

        return res.json({
            success: true,
            message: `Reconciled ${reconciledCount} transactions`,
            data: { reconciledCount }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/corporate-cards/transactions/:transactionId/match
 * Match transaction with expense
 */
router.post('/transactions/:transactionId/match', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.transactionId);
        if (!sanitizedId) {
            throw CustomException('Invalid transaction ID format', 400);
        }

        const { expenseId, confidence } = req.body;

        if (!expenseId) {
            throw CustomException('Expense ID is required', 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'corporateCards.transactions._id': sanitizedId
            },
            {
                $set: {
                    'corporateCards.transactions.$.status': 'matched',
                    'corporateCards.transactions.$.matchedExpenseId': sanitizeObjectId(expenseId),
                    'corporateCards.transactions.$.matchConfidence': confidence,
                    'corporateCards.transactions.$.matchedAt': new Date(),
                    'corporateCards.transactions.$.matchedBy': req.userID
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Transaction not found', 404);
        }

        return res.json({
            success: true,
            message: 'Transaction matched with expense'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/corporate-cards/transactions/:transactionId/potential-matches
 * Get potential expense matches
 */
router.get('/transactions/:transactionId/potential-matches', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.transactionId);
        if (!sanitizedId) {
            throw CustomException('Invalid transaction ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('corporateCards.transactions expenses');

        const transaction = (firm?.corporateCards?.transactions || [])
            .find(t => t._id.toString() === sanitizedId);

        if (!transaction) {
            throw CustomException('Transaction not found', 404);
        }

        // Find potential matches based on amount and date
        const potentialMatches = [];
        const expenses = firm?.expenses || [];

        const amountTolerance = 0.05; // 5% tolerance
        const dateTolerance = 7; // 7 days

        expenses.forEach(expense => {
            const amountMatch = Math.abs(expense.amount - transaction.amount) / transaction.amount <= amountTolerance;
            const dateMatch = Math.abs(new Date(expense.date) - new Date(transaction.transactionDate)) <= dateTolerance * 24 * 60 * 60 * 1000;

            if (amountMatch && dateMatch) {
                let confidence = 0;
                if (expense.amount === transaction.amount) confidence += 50;
                else if (amountMatch) confidence += 25;

                if (expense.date.toDateString() === new Date(transaction.transactionDate).toDateString()) confidence += 30;
                else if (dateMatch) confidence += 15;

                if (expense.vendor?.toLowerCase().includes(transaction.merchantName?.toLowerCase())) confidence += 20;

                potentialMatches.push({
                    expense,
                    confidence: Math.min(100, confidence)
                });
            }
        });

        potentialMatches.sort((a, b) => b.confidence - a.confidence);

        return res.json({
            success: true,
            count: potentialMatches.length,
            data: potentialMatches.slice(0, 10)
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/corporate-cards/transactions/:transactionId/dispute
 * Dispute a transaction
 */
router.post('/transactions/:transactionId/dispute', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.transactionId);
        if (!sanitizedId) {
            throw CustomException('Invalid transaction ID format', 400);
        }

        const { reason, details } = req.body;

        if (!reason) {
            throw CustomException('Dispute reason is required', 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'corporateCards.transactions._id': sanitizedId
            },
            {
                $set: {
                    'corporateCards.transactions.$.status': 'disputed',
                    'corporateCards.transactions.$.disputeReason': reason,
                    'corporateCards.transactions.$.disputeDetails': details,
                    'corporateCards.transactions.$.disputedAt': new Date(),
                    'corporateCards.transactions.$.disputedBy': req.userID
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Transaction not found', 404);
        }

        return res.json({
            success: true,
            message: 'Transaction disputed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/corporate-cards/transactions/:transactionId/resolve-dispute
 * Resolve transaction dispute
 */
router.post('/transactions/:transactionId/resolve-dispute', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.transactionId);
        if (!sanitizedId) {
            throw CustomException('Invalid transaction ID format', 400);
        }

        const { resolution, newStatus, notes } = req.body;

        if (!resolution) {
            throw CustomException('Resolution is required', 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'corporateCards.transactions._id': sanitizedId,
                'corporateCards.transactions.status': 'disputed'
            },
            {
                $set: {
                    'corporateCards.transactions.$.status': newStatus || 'pending',
                    'corporateCards.transactions.$.disputeResolution': resolution,
                    'corporateCards.transactions.$.disputeResolvedAt': new Date(),
                    'corporateCards.transactions.$.disputeResolvedBy': req.userID,
                    'corporateCards.transactions.$.disputeResolutionNotes': notes
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Transaction not found or not disputed', 404);
        }

        return res.json({
            success: true,
            message: 'Dispute resolved'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/corporate-cards/transactions/import
 * Import transactions from CSV/file
 */
router.post('/transactions/import', async (req, res) => {
    try {
        const { transactions, format } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            throw CustomException('Array of transactions is required', 400);
        }

        if (transactions.length > 500) {
            throw CustomException('Maximum 500 transactions per import', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < transactions.length; i++) {
            try {
                const t = transactions[i];
                const transactionId = new mongoose.Types.ObjectId();
                const transactionData = {
                    _id: transactionId,
                    amount: parseFloat(t.amount),
                    merchantName: t.merchantName || t.merchant,
                    merchantCategory: t.merchantCategory || t.category,
                    transactionDate: new Date(t.transactionDate || t.date),
                    description: t.description,
                    currency: t.currency || 'SAR',
                    status: 'pending',
                    source: 'import',
                    importBatch: new Date().toISOString(),
                    createdAt: new Date(),
                    createdBy: req.userID
                };

                await Firm.findOneAndUpdate(
                    { _id: req.firmId },
                    { $push: { 'corporateCards.transactions': transactionData } }
                );

                results.push({ index: i, success: true, id: transactionId.toString() });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Imported ${results.length} transactions, ${errors.length} failed`,
            data: { imported: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/corporate-cards/transactions/csv-template
 * Get CSV import template
 */
router.get('/transactions/csv-template', async (req, res) => {
    try {
        const template = {
            columns: [
                { name: 'transactionDate', type: 'date', required: true, format: 'YYYY-MM-DD' },
                { name: 'amount', type: 'number', required: true },
                { name: 'currency', type: 'string', required: false, default: 'SAR' },
                { name: 'merchantName', type: 'string', required: true },
                { name: 'merchantCategory', type: 'string', required: false },
                { name: 'description', type: 'string', required: false },
                { name: 'cardNumber', type: 'string', required: false, note: 'Last 4 digits' }
            ],
            sampleData: [
                {
                    transactionDate: '2024-01-15',
                    amount: 250.00,
                    currency: 'SAR',
                    merchantName: 'Office Supplies Co',
                    merchantCategory: 'Office Supplies',
                    description: 'Printer paper and ink'
                }
            ]
        };

        return res.json({
            success: true,
            data: template
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/corporate-cards/statistics
 * Get card transaction statistics
 */
router.get('/statistics', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('corporateCards.transactions');

        let transactions = firm?.corporateCards?.transactions || [];

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

        const stats = {
            totalTransactions: transactions.length,
            totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
            byStatus: {},
            byCategory: {},
            pendingReconciliation: transactions.filter(t => t.status === 'pending').length,
            disputed: transactions.filter(t => t.status === 'disputed').length
        };

        VALID_STATUSES.forEach(status => {
            const statusTxs = transactions.filter(t => t.status === status);
            stats.byStatus[status] = {
                count: statusTxs.length,
                amount: statusTxs.reduce((sum, t) => sum + (t.amount || 0), 0)
            };
        });

        transactions.forEach(t => {
            const category = t.merchantCategory || 'Uncategorized';
            if (!stats.byCategory[category]) {
                stats.byCategory[category] = { count: 0, amount: 0 };
            }
            stats.byCategory[category].count++;
            stats.byCategory[category].amount += t.amount || 0;
        });

        return res.json({
            success: true,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/corporate-cards/reports/reconciliation
 * Get reconciliation report
 */
router.get('/reports/reconciliation', async (req, res) => {
    try {
        const { startDate, endDate, cardId } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('corporateCards.transactions');

        let transactions = firm?.corporateCards?.transactions || [];

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
        if (cardId) {
            const sanitizedCardId = sanitizeObjectId(cardId);
            if (sanitizedCardId) {
                transactions = transactions.filter(t =>
                    t.cardId?.toString() === sanitizedCardId
                );
            }
        }

        const report = {
            period: { startDate, endDate },
            summary: {
                total: transactions.length,
                totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
                reconciled: transactions.filter(t => t.status === 'reconciled').length,
                pending: transactions.filter(t => t.status === 'pending').length,
                disputed: transactions.filter(t => t.status === 'disputed').length,
                matched: transactions.filter(t => t.status === 'matched').length
            },
            reconciliationRate: transactions.length > 0
                ? (transactions.filter(t => t.status === 'reconciled' || t.status === 'matched').length / transactions.length * 100).toFixed(2)
                : 0,
            transactions: transactions.map(t => ({
                _id: t._id,
                date: t.transactionDate,
                merchant: t.merchantName,
                amount: t.amount,
                status: t.status,
                category: t.expenseCategory
            }))
        };

        return res.json({
            success: true,
            data: report
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/corporate-cards/reports/reconciliation/export
 * Export reconciliation report
 */
router.get('/reports/reconciliation/export', async (req, res) => {
    try {
        const { format, startDate, endDate } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('corporateCards.transactions name');

        let transactions = firm?.corporateCards?.transactions || [];

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

        const exportId = new mongoose.Types.ObjectId();

        return res.json({
            success: true,
            message: 'Export initiated',
            data: {
                exportId: exportId.toString(),
                format: format || 'xlsx',
                recordCount: transactions.length,
                firmName: firm?.name
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/corporate-cards/analytics/spending-by-category
 * Get spending breakdown by category
 */
router.get('/analytics/spending-by-category', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('corporateCards.transactions');

        let transactions = firm?.corporateCards?.transactions || [];

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

        const categorySpending = {};
        transactions.forEach(t => {
            const category = t.merchantCategory || t.expenseCategory || 'Uncategorized';
            if (!categorySpending[category]) {
                categorySpending[category] = { count: 0, amount: 0 };
            }
            categorySpending[category].count++;
            categorySpending[category].amount += t.amount || 0;
        });

        const sorted = Object.entries(categorySpending)
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.amount - a.amount);

        return res.json({
            success: true,
            data: sorted
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/corporate-cards/analytics/spending-by-card
 * Get spending breakdown by card
 */
router.get('/analytics/spending-by-card', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('corporateCards');

        let transactions = firm?.corporateCards?.transactions || [];
        const cards = firm?.corporateCards?.cards || [];

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

        const cardSpending = {};
        transactions.forEach(t => {
            const cardId = t.cardId?.toString() || 'unknown';
            if (!cardSpending[cardId]) {
                const card = cards.find(c => c._id?.toString() === cardId);
                cardSpending[cardId] = {
                    cardId,
                    cardName: card?.name || 'Unknown Card',
                    lastFour: card?.lastFour || '****',
                    count: 0,
                    amount: 0
                };
            }
            cardSpending[cardId].count++;
            cardSpending[cardId].amount += t.amount || 0;
        });

        const sorted = Object.values(cardSpending)
            .sort((a, b) => b.amount - a.amount);

        return res.json({
            success: true,
            data: sorted
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/corporate-cards/analytics/monthly-trend
 * Get monthly spending trend
 */
router.get('/analytics/monthly-trend', async (req, res) => {
    try {
        const { months } = req.query;
        const monthsBack = parseInt(months) || 12;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('corporateCards.transactions');

        const transactions = firm?.corporateCards?.transactions || [];

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const filtered = transactions.filter(t =>
            new Date(t.transactionDate) >= startDate
        );

        const monthlyData = {};
        filtered.forEach(t => {
            const date = new Date(t.transactionDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { count: 0, amount: 0 };
            }
            monthlyData[monthKey].count++;
            monthlyData[monthKey].amount += t.amount || 0;
        });

        const trend = Object.entries(monthlyData)
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => a.month.localeCompare(b.month));

        return res.json({
            success: true,
            data: trend
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
