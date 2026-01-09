/**
 * Transactions Extended Routes
 *
 * Provides extended transaction management functionality.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /categories            - Get transaction categories
 * - POST /categories           - Create transaction category
 * - PUT /categories/:id        - Update transaction category
 * - DELETE /categories/:id     - Delete transaction category
 * - GET /pending               - Get pending transactions
 * - GET /unreconciled          - Get unreconciled transactions
 * - GET /stats                 - Get transaction statistics
 * - GET /search                - Search transactions
 * - GET /export                - Export transactions
 * - POST /:id/reconcile        - Mark transaction as reconciled
 * - POST /:id/unreconcile      - Mark transaction as unreconciled
 * - GET /:id/attachments       - Get transaction attachments
 * - POST /:id/attachments      - Add transaction attachment
 * - DELETE /:id/attachments/:attachmentId - Delete attachment
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Transaction = require('../models/transaction.model');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for categories
const ALLOWED_CATEGORY_FIELDS = [
    'name', 'description', 'type', 'parentCategory', 'color',
    'icon', 'isActive', 'taxRate', 'accountCode', 'sortOrder'
];

// Allowed fields for attachments
const ALLOWED_ATTACHMENT_FIELDS = [
    'name', 'url', 'type', 'size', 'description'
];

// Valid transaction types
const VALID_TRANSACTION_TYPES = ['income', 'expense', 'transfer', 'adjustment', 'refund'];
const VALID_CATEGORY_TYPES = ['income', 'expense', 'both'];

/**
 * GET /categories - Get transaction categories
 */
router.get('/categories', async (req, res, next) => {
    try {
        const { type, search, includeInactive } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('settings.transactionCategories').lean();

        // Default categories if none exist
        const defaultCategories = [
            { id: 'legal-fees', name: 'Legal Fees', type: 'income', icon: 'briefcase', color: '#4CAF50' },
            { id: 'retainer', name: 'Retainer', type: 'income', icon: 'clock', color: '#2196F3' },
            { id: 'consultation', name: 'Consultation', type: 'income', icon: 'users', color: '#9C27B0' },
            { id: 'office-supplies', name: 'Office Supplies', type: 'expense', icon: 'package', color: '#FF9800' },
            { id: 'utilities', name: 'Utilities', type: 'expense', icon: 'zap', color: '#F44336' },
            { id: 'travel', name: 'Travel', type: 'expense', icon: 'map', color: '#607D8B' },
            { id: 'software', name: 'Software', type: 'expense', icon: 'code', color: '#795548' },
            { id: 'other', name: 'Other', type: 'both', icon: 'more-horizontal', color: '#9E9E9E' }
        ];

        let categories = firm?.settings?.transactionCategories || defaultCategories;

        // Apply filters
        if (type && VALID_CATEGORY_TYPES.includes(type)) {
            categories = categories.filter(c => c.type === type || c.type === 'both');
        }
        if (search) {
            const searchPattern = escapeRegex(search).toLowerCase();
            categories = categories.filter(c =>
                c.name?.toLowerCase().includes(searchPattern) ||
                c.description?.toLowerCase().includes(searchPattern)
            );
        }
        if (!includeInactive) {
            categories = categories.filter(c => c.isActive !== false);
        }

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /categories - Create transaction category
 */
router.post('/categories', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_CATEGORY_FIELDS);

        if (!safeData.name) {
            throw CustomException('Category name is required', 400);
        }
        if (!safeData.type || !VALID_CATEGORY_TYPES.includes(safeData.type)) {
            throw CustomException(`Category type is required and must be one of: ${VALID_CATEGORY_TYPES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.settings) firm.settings = {};
        if (!firm.settings.transactionCategories) firm.settings.transactionCategories = [];

        // Check for duplicate
        const existing = firm.settings.transactionCategories.find(
            c => c.name.toLowerCase() === safeData.name.toLowerCase()
        );
        if (existing) {
            throw CustomException('Category with this name already exists', 400);
        }

        const category = {
            id: safeData.name.toLowerCase().replace(/\s+/g, '-'),
            ...safeData,
            isActive: safeData.isActive !== false,
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.settings.transactionCategories.push(category);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /categories/:id - Update transaction category
 */
router.put('/categories/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const safeData = pickAllowedFields(req.body, ALLOWED_CATEGORY_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const categoryIndex = firm.settings?.transactionCategories?.findIndex(c => c.id === id);
        if (categoryIndex === -1 || categoryIndex === undefined) {
            throw CustomException('Category not found', 404);
        }

        // Check for duplicate name if name is being changed
        if (safeData.name && safeData.name !== firm.settings.transactionCategories[categoryIndex].name) {
            const existing = firm.settings.transactionCategories.find(
                (c, i) => i !== categoryIndex && c.name.toLowerCase() === safeData.name.toLowerCase()
            );
            if (existing) {
                throw CustomException('Category with this name already exists', 400);
            }
        }

        Object.assign(firm.settings.transactionCategories[categoryIndex], safeData, { updatedAt: new Date() });
        await firm.save();

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: firm.settings.transactionCategories[categoryIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /categories/:id - Delete transaction category
 */
router.delete('/categories/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const categoryIndex = firm.settings?.transactionCategories?.findIndex(c => c.id === id);
        if (categoryIndex === -1 || categoryIndex === undefined) {
            throw CustomException('Category not found', 404);
        }

        // Check if category is in use
        const transactionsUsingCategory = await Transaction.countDocuments({
            ...req.firmQuery,
            category: firm.settings.transactionCategories[categoryIndex].name
        });

        if (transactionsUsingCategory > 0) {
            throw CustomException(`Cannot delete category. ${transactionsUsingCategory} transactions are using this category.`, 400);
        }

        firm.settings.transactionCategories.splice(categoryIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /pending - Get pending transactions
 */
router.get('/pending', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { type, dateFrom, dateTo } = req.query;

        const query = {
            ...req.firmQuery,
            status: { $in: ['pending', 'processing', 'awaiting_approval'] }
        };

        if (type && VALID_TRANSACTION_TYPES.includes(type)) {
            query.type = type;
        }
        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom);
            if (dateTo) query.date.$lte = new Date(dateTo);
        }

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'firstName lastName')
                .lean(),
            Transaction.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /unreconciled - Get unreconciled transactions
 */
router.get('/unreconciled', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { bankAccountId, type, dateFrom, dateTo, minAmount, maxAmount } = req.query;

        const query = {
            ...req.firmQuery,
            reconciled: { $ne: true }
        };

        if (bankAccountId) {
            query.bankAccountId = sanitizeObjectId(bankAccountId, 'bankAccountId');
        }
        if (type && VALID_TRANSACTION_TYPES.includes(type)) {
            query.type = type;
        }
        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom);
            if (dateTo) query.date.$lte = new Date(dateTo);
        }
        if (minAmount || maxAmount) {
            query.amount = {};
            if (minAmount) query.amount.$gte = parseFloat(minAmount);
            if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
        }

        const [transactions, total, totalAmount] = await Promise.all([
            Transaction.find(query)
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .populate('bankAccountId', 'name accountNumber')
                .lean(),
            Transaction.countDocuments(query),
            Transaction.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        res.json({
            success: true,
            data: transactions,
            summary: {
                totalUnreconciled: total,
                totalAmount: totalAmount[0]?.total || 0
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /stats - Get transaction statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { dateFrom, dateTo, groupBy = 'month' } = req.query;

        const matchQuery = { ...req.firmQuery };
        if (dateFrom || dateTo) {
            matchQuery.date = {};
            if (dateFrom) matchQuery.date.$gte = new Date(dateFrom);
            if (dateTo) matchQuery.date.$lte = new Date(dateTo);
        }

        // Group by period
        let dateGrouping;
        switch (groupBy) {
            case 'day':
                dateGrouping = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
                break;
            case 'week':
                dateGrouping = { $dateToString: { format: '%Y-W%V', date: '$date' } };
                break;
            case 'year':
                dateGrouping = { $dateToString: { format: '%Y', date: '$date' } };
                break;
            default: // month
                dateGrouping = { $dateToString: { format: '%Y-%m', date: '$date' } };
        }

        const [
            totals,
            byType,
            byCategory,
            byPeriod,
            reconciliationStats
        ] = await Promise.all([
            // Total counts and amounts
            Transaction.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalCount: { $sum: 1 },
                        totalAmount: { $sum: '$amount' },
                        avgAmount: { $avg: '$amount' }
                    }
                }
            ]),
            // By type
            Transaction.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        total: { $sum: '$amount' }
                    }
                }
            ]),
            // By category
            Transaction.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                        total: { $sum: '$amount' }
                    }
                },
                { $sort: { total: -1 } },
                { $limit: 10 }
            ]),
            // By period
            Transaction.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: dateGrouping,
                        count: { $sum: 1 },
                        income: {
                            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
                        },
                        expense: {
                            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
                        },
                        net: { $sum: '$amount' }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // Reconciliation stats
            Transaction.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        reconciled: { $sum: { $cond: ['$reconciled', 1, 0] } }
                    }
                }
            ])
        ]);

        const totalData = totals[0] || { totalCount: 0, totalAmount: 0, avgAmount: 0 };
        const reconStats = reconciliationStats[0] || { total: 0, reconciled: 0 };

        res.json({
            success: true,
            data: {
                summary: {
                    totalTransactions: totalData.totalCount,
                    totalAmount: totalData.totalAmount,
                    averageAmount: Math.round(totalData.avgAmount * 100) / 100,
                    reconciledPercentage: reconStats.total > 0
                        ? Math.round((reconStats.reconciled / reconStats.total) * 100)
                        : 0
                },
                byType: byType.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = { count: item.count, total: item.total };
                    return acc;
                }, {}),
                topCategories: byCategory.map(c => ({
                    category: c._id || 'Uncategorized',
                    count: c.count,
                    total: c.total
                })),
                byPeriod
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /search - Search transactions
 */
router.get('/search', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { q, type, category, status, minAmount, maxAmount, dateFrom, dateTo, sortBy, sortOrder } = req.query;

        if (!q && !type && !category && !status && !minAmount && !maxAmount && !dateFrom && !dateTo) {
            throw CustomException('At least one search parameter is required', 400);
        }

        const query = { ...req.firmQuery };

        if (q) {
            const searchPattern = escapeRegex(q);
            query.$or = [
                { description: { $regex: searchPattern, $options: 'i' } },
                { reference: { $regex: searchPattern, $options: 'i' } },
                { notes: { $regex: searchPattern, $options: 'i' } },
                { payee: { $regex: searchPattern, $options: 'i' } }
            ];
        }
        if (type) {
            query.type = type;
        }
        if (category) {
            query.category = category;
        }
        if (status) {
            query.status = status;
        }
        if (minAmount || maxAmount) {
            query.amount = {};
            if (minAmount) query.amount.$gte = parseFloat(minAmount);
            if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
        }
        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom);
            if (dateTo) query.date.$lte = new Date(dateTo);
        }

        // Build sort
        const validSortFields = ['date', 'amount', 'createdAt', 'type', 'category'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'date';
        const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('bankAccountId', 'name')
                .populate('createdBy', 'firstName lastName')
                .lean(),
            Transaction.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /export - Export transactions
 */
router.get('/export', async (req, res, next) => {
    try {
        const { format = 'json', type, category, dateFrom, dateTo, reconciled } = req.query;

        const query = { ...req.firmQuery };

        if (type) query.type = type;
        if (category) query.category = category;
        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom);
            if (dateTo) query.date.$lte = new Date(dateTo);
        }
        if (reconciled !== undefined) {
            query.reconciled = reconciled === 'true';
        }

        const transactions = await Transaction.find(query)
            .sort({ date: -1 })
            .limit(10000) // Safety limit
            .lean();

        if (format === 'csv') {
            const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Reference', 'Reconciled', 'Status'];
            const csvRows = [headers.join(',')];

            for (const t of transactions) {
                const row = [
                    t.date ? new Date(t.date).toISOString().split('T')[0] : '',
                    t.type || '',
                    `"${(t.category || '').replace(/"/g, '""')}"`,
                    `"${(t.description || '').replace(/"/g, '""')}"`,
                    t.amount || 0,
                    `"${(t.reference || '').replace(/"/g, '""')}"`,
                    t.reconciled ? 'Yes' : 'No',
                    t.status || ''
                ];
                csvRows.push(row.join(','));
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
            return res.send(csvRows.join('\n'));
        }

        res.json({
            success: true,
            data: transactions,
            exportedAt: new Date(),
            count: transactions.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/reconcile - Mark transaction as reconciled
 */
router.post('/:id/reconcile', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { reconciliationId, notes } = req.body;

        const transaction = await Transaction.findOne({ _id: id, ...req.firmQuery });

        if (!transaction) {
            throw CustomException('Transaction not found', 404);
        }

        if (transaction.reconciled) {
            throw CustomException('Transaction is already reconciled', 400);
        }

        transaction.reconciled = true;
        transaction.reconciledAt = new Date();
        transaction.reconciledBy = req.userID;
        if (reconciliationId) {
            transaction.reconciliationId = sanitizeObjectId(reconciliationId, 'reconciliationId');
        }
        if (notes) {
            transaction.reconciliationNotes = notes;
        }

        await transaction.save();

        res.json({
            success: true,
            message: 'Transaction reconciled successfully',
            data: transaction
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/unreconcile - Mark transaction as unreconciled
 */
router.post('/:id/unreconcile', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { reason } = req.body;

        const transaction = await Transaction.findOne({ _id: id, ...req.firmQuery });

        if (!transaction) {
            throw CustomException('Transaction not found', 404);
        }

        if (!transaction.reconciled) {
            throw CustomException('Transaction is not reconciled', 400);
        }

        // Store previous reconciliation info for audit
        const previousReconciliation = {
            reconciledAt: transaction.reconciledAt,
            reconciledBy: transaction.reconciledBy,
            reconciliationId: transaction.reconciliationId
        };

        transaction.reconciled = false;
        transaction.reconciledAt = undefined;
        transaction.reconciledBy = undefined;
        transaction.reconciliationId = undefined;
        transaction.reconciliationNotes = undefined;

        // Track unreconciliation
        if (!transaction.unreconciliationHistory) transaction.unreconciliationHistory = [];
        transaction.unreconciliationHistory.push({
            previousReconciliation,
            unreconciledAt: new Date(),
            unreconciledBy: req.userID,
            reason
        });

        await transaction.save();

        res.json({
            success: true,
            message: 'Transaction unreconciled successfully',
            data: transaction
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/attachments - Get transaction attachments
 */
router.get('/:id/attachments', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const transaction = await Transaction.findOne({ _id: id, ...req.firmQuery })
            .select('attachments')
            .lean();

        if (!transaction) {
            throw CustomException('Transaction not found', 404);
        }

        res.json({
            success: true,
            data: transaction.attachments || []
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/attachments - Add transaction attachment
 */
router.post('/:id/attachments', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_ATTACHMENT_FIELDS);

        if (!safeData.url) {
            throw CustomException('Attachment URL is required', 400);
        }

        const transaction = await Transaction.findOne({ _id: id, ...req.firmQuery });

        if (!transaction) {
            throw CustomException('Transaction not found', 404);
        }

        if (!transaction.attachments) transaction.attachments = [];

        // Limit attachments
        if (transaction.attachments.length >= 10) {
            throw CustomException('Maximum 10 attachments per transaction', 400);
        }

        const attachment = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            uploadedBy: req.userID,
            uploadedAt: new Date()
        };

        transaction.attachments.push(attachment);
        await transaction.save();

        res.status(201).json({
            success: true,
            message: 'Attachment added successfully',
            data: attachment
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id/attachments/:attachmentId - Delete transaction attachment
 */
router.delete('/:id/attachments/:attachmentId', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const attachmentId = sanitizeObjectId(req.params.attachmentId, 'attachmentId');

        const transaction = await Transaction.findOne({ _id: id, ...req.firmQuery });

        if (!transaction) {
            throw CustomException('Transaction not found', 404);
        }

        const attachmentIndex = (transaction.attachments || []).findIndex(
            a => a._id?.toString() === attachmentId.toString()
        );

        if (attachmentIndex === -1) {
            throw CustomException('Attachment not found', 404);
        }

        transaction.attachments.splice(attachmentIndex, 1);
        await transaction.save();

        res.json({
            success: true,
            message: 'Attachment deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
