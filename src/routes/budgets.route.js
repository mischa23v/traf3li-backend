/**
 * Budgets Routes
 *
 * Comprehensive budget management for financial planning.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                       - List budgets
 * - POST /                      - Create budget
 * - GET /check                  - Check budget availability
 * - GET /stats                  - Get budget statistics
 * - GET /:id                    - Get budget by ID
 * - PUT /:id                    - Update budget
 * - DELETE /:id                 - Delete budget
 * - POST /:id/submit            - Submit budget for approval
 * - POST /:id/approve           - Approve budget
 * - POST /:id/reject            - Reject budget
 * - POST /:id/close             - Close budget
 * - POST /:id/duplicate         - Duplicate budget
 * - GET /:budgetId/distribution - Get budget distribution
 * - GET /:budgetId/vs-actual    - Get budget vs actual comparison
 * - GET /:budgetId/lines        - Get budget lines
 * - POST /:budgetId/lines       - Add budget line
 * - PUT /:budgetId/lines/:lineId - Update budget line
 * - DELETE /:budgetId/lines/:lineId - Delete budget line
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields
const ALLOWED_BUDGET_FIELDS = [
    'name', 'description', 'fiscalYear', 'startDate', 'endDate',
    'type', 'category', 'totalAmount', 'currency', 'department',
    'project', 'notes', 'tags'
];

const ALLOWED_LINE_FIELDS = [
    'category', 'description', 'amount', 'period', 'notes',
    'accountCode', 'department', 'costCenter'
];

// Valid statuses and types
const VALID_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'active', 'closed'];
const VALID_TYPES = ['annual', 'quarterly', 'monthly', 'project', 'department'];

/**
 * GET / - List budgets
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, type, fiscalYear, department, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('finance.budgets').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let budgets = firm.finance?.budgets || [];

        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
            }
            budgets = budgets.filter(b => b.status === status);
        }
        if (type) {
            budgets = budgets.filter(b => b.type === type);
        }
        if (fiscalYear) {
            budgets = budgets.filter(b => b.fiscalYear === parseInt(fiscalYear));
        }
        if (department) {
            budgets = budgets.filter(b => b.department === department);
        }
        if (search) {
            const pattern = escapeRegex(search).toLowerCase();
            budgets = budgets.filter(b =>
                b.name?.toLowerCase().includes(pattern) ||
                b.description?.toLowerCase().includes(pattern)
            );
        }

        budgets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = budgets.length;
        const paginatedBudgets = budgets.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedBudgets,
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
 * POST / - Create budget
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_BUDGET_FIELDS);

        if (!safeData.name) {
            throw CustomException('Budget name is required', 400);
        }
        if (!safeData.fiscalYear) {
            throw CustomException('Fiscal year is required', 400);
        }
        if (!safeData.totalAmount || safeData.totalAmount <= 0) {
            throw CustomException('Valid total amount is required', 400);
        }

        if (safeData.type && !VALID_TYPES.includes(safeData.type)) {
            throw CustomException(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.finance) firm.finance = {};
        if (!firm.finance.budgets) firm.finance.budgets = [];

        const budget = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            fiscalYear: parseInt(safeData.fiscalYear),
            startDate: safeData.startDate ? new Date(safeData.startDate) : new Date(safeData.fiscalYear, 0, 1),
            endDate: safeData.endDate ? new Date(safeData.endDate) : new Date(safeData.fiscalYear, 11, 31),
            status: 'draft',
            spent: 0,
            remaining: safeData.totalAmount,
            lines: [],
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.finance.budgets.push(budget);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Budget created',
            data: budget
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /check - Check budget availability
 */
router.get('/check', async (req, res, next) => {
    try {
        const { budgetId, category, amount, department } = req.query;

        if (!amount) {
            throw CustomException('Amount is required', 400);
        }

        const requestedAmount = parseFloat(amount);

        const firm = await Firm.findOne(req.firmQuery).select('finance.budgets').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let budget;
        if (budgetId) {
            const sanitizedBudgetId = sanitizeObjectId(budgetId, 'budgetId');
            budget = (firm.finance?.budgets || []).find(
                b => b._id?.toString() === sanitizedBudgetId.toString() && b.status === 'active'
            );
        } else {
            // Find active budget for category/department
            budget = (firm.finance?.budgets || []).find(b => {
                if (b.status !== 'active') return false;
                if (category && b.category !== category) return false;
                if (department && b.department !== department) return false;
                return true;
            });
        }

        if (!budget) {
            return res.json({
                success: true,
                data: {
                    available: false,
                    reason: 'No active budget found',
                    requestedAmount
                }
            });
        }

        const available = budget.remaining >= requestedAmount;

        res.json({
            success: true,
            data: {
                available,
                budgetId: budget._id,
                budgetName: budget.name,
                totalBudget: budget.totalAmount,
                spent: budget.spent,
                remaining: budget.remaining,
                requestedAmount,
                shortfall: available ? 0 : requestedAmount - budget.remaining
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /stats - Get budget statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { fiscalYear } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('finance.budgets').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let budgets = firm.finance?.budgets || [];

        if (fiscalYear) {
            budgets = budgets.filter(b => b.fiscalYear === parseInt(fiscalYear));
        }

        const statusCounts = {};
        const typeCounts = {};
        let totalBudgeted = 0;
        let totalSpent = 0;

        for (const budget of budgets) {
            statusCounts[budget.status] = (statusCounts[budget.status] || 0) + 1;
            if (budget.type) {
                typeCounts[budget.type] = (typeCounts[budget.type] || 0) + 1;
            }
            if (budget.status === 'active' || budget.status === 'closed') {
                totalBudgeted += budget.totalAmount || 0;
                totalSpent += budget.spent || 0;
            }
        }

        res.json({
            success: true,
            data: {
                totalBudgets: budgets.length,
                byStatus: statusCounts,
                byType: typeCounts,
                totalBudgeted,
                totalSpent,
                totalRemaining: totalBudgeted - totalSpent,
                utilizationRate: totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id - Get budget by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('finance.budgets').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budget = (firm.finance?.budgets || []).find(
            b => b._id?.toString() === id.toString()
        );

        if (!budget) {
            throw CustomException('Budget not found', 404);
        }

        res.json({
            success: true,
            data: budget
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:id - Update budget
 */
router.put('/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_BUDGET_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budgetIndex = (firm.finance?.budgets || []).findIndex(
            b => b._id?.toString() === id.toString()
        );

        if (budgetIndex === -1) {
            throw CustomException('Budget not found', 404);
        }

        const budget = firm.finance.budgets[budgetIndex];

        if (!['draft', 'rejected'].includes(budget.status)) {
            throw CustomException('Can only update draft or rejected budgets', 400);
        }

        if (safeData.startDate) safeData.startDate = new Date(safeData.startDate);
        if (safeData.endDate) safeData.endDate = new Date(safeData.endDate);
        if (safeData.fiscalYear) safeData.fiscalYear = parseInt(safeData.fiscalYear);

        // Update remaining if total changes
        if (safeData.totalAmount) {
            safeData.remaining = safeData.totalAmount - (budget.spent || 0);
        }

        Object.assign(firm.finance.budgets[budgetIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Budget updated',
            data: firm.finance.budgets[budgetIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete budget
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budgetIndex = (firm.finance?.budgets || []).findIndex(
            b => b._id?.toString() === id.toString()
        );

        if (budgetIndex === -1) {
            throw CustomException('Budget not found', 404);
        }

        const budget = firm.finance.budgets[budgetIndex];

        if (!['draft', 'rejected'].includes(budget.status)) {
            throw CustomException('Can only delete draft or rejected budgets', 400);
        }

        firm.finance.budgets.splice(budgetIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Budget deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/submit - Submit budget for approval
 */
router.post('/:id/submit', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budgetIndex = (firm.finance?.budgets || []).findIndex(
            b => b._id?.toString() === id.toString()
        );

        if (budgetIndex === -1) {
            throw CustomException('Budget not found', 404);
        }

        if (!['draft', 'rejected'].includes(firm.finance.budgets[budgetIndex].status)) {
            throw CustomException('Can only submit draft or rejected budgets', 400);
        }

        firm.finance.budgets[budgetIndex].status = 'pending';
        firm.finance.budgets[budgetIndex].submittedBy = req.userID;
        firm.finance.budgets[budgetIndex].submittedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Budget submitted for approval',
            data: firm.finance.budgets[budgetIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/approve - Approve budget
 */
router.post('/:id/approve', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { notes } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budgetIndex = (firm.finance?.budgets || []).findIndex(
            b => b._id?.toString() === id.toString()
        );

        if (budgetIndex === -1) {
            throw CustomException('Budget not found', 404);
        }

        if (firm.finance.budgets[budgetIndex].status !== 'pending') {
            throw CustomException('Can only approve pending budgets', 400);
        }

        firm.finance.budgets[budgetIndex].status = 'active';
        firm.finance.budgets[budgetIndex].approvedBy = req.userID;
        firm.finance.budgets[budgetIndex].approvedAt = new Date();
        if (notes) firm.finance.budgets[budgetIndex].approvalNotes = notes;

        await firm.save();

        res.json({
            success: true,
            message: 'Budget approved and activated',
            data: firm.finance.budgets[budgetIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/reject - Reject budget
 */
router.post('/:id/reject', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budgetIndex = (firm.finance?.budgets || []).findIndex(
            b => b._id?.toString() === id.toString()
        );

        if (budgetIndex === -1) {
            throw CustomException('Budget not found', 404);
        }

        if (firm.finance.budgets[budgetIndex].status !== 'pending') {
            throw CustomException('Can only reject pending budgets', 400);
        }

        firm.finance.budgets[budgetIndex].status = 'rejected';
        firm.finance.budgets[budgetIndex].rejectedBy = req.userID;
        firm.finance.budgets[budgetIndex].rejectedAt = new Date();
        firm.finance.budgets[budgetIndex].rejectionReason = reason;

        await firm.save();

        res.json({
            success: true,
            message: 'Budget rejected',
            data: firm.finance.budgets[budgetIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/close - Close budget
 */
router.post('/:id/close', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { notes } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budgetIndex = (firm.finance?.budgets || []).findIndex(
            b => b._id?.toString() === id.toString()
        );

        if (budgetIndex === -1) {
            throw CustomException('Budget not found', 404);
        }

        if (firm.finance.budgets[budgetIndex].status !== 'active') {
            throw CustomException('Can only close active budgets', 400);
        }

        firm.finance.budgets[budgetIndex].status = 'closed';
        firm.finance.budgets[budgetIndex].closedBy = req.userID;
        firm.finance.budgets[budgetIndex].closedAt = new Date();
        if (notes) firm.finance.budgets[budgetIndex].closingNotes = notes;

        await firm.save();

        res.json({
            success: true,
            message: 'Budget closed',
            data: firm.finance.budgets[budgetIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/duplicate - Duplicate budget
 */
router.post('/:id/duplicate', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { newName, newFiscalYear } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budget = (firm.finance?.budgets || []).find(
            b => b._id?.toString() === id.toString()
        );

        if (!budget) {
            throw CustomException('Budget not found', 404);
        }

        const duplicate = {
            ...budget,
            _id: new mongoose.Types.ObjectId(),
            name: newName || `${budget.name} (Copy)`,
            fiscalYear: newFiscalYear ? parseInt(newFiscalYear) : budget.fiscalYear + 1,
            status: 'draft',
            spent: 0,
            remaining: budget.totalAmount,
            createdBy: req.userID,
            createdAt: new Date(),
            duplicatedFrom: budget._id
        };

        // Clear approval/submission data
        delete duplicate.submittedBy;
        delete duplicate.submittedAt;
        delete duplicate.approvedBy;
        delete duplicate.approvedAt;
        delete duplicate.rejectedBy;
        delete duplicate.rejectedAt;
        delete duplicate.closedBy;
        delete duplicate.closedAt;

        // Update dates for new fiscal year
        if (newFiscalYear) {
            const yearDiff = parseInt(newFiscalYear) - budget.fiscalYear;
            duplicate.startDate = new Date(new Date(budget.startDate).setFullYear(new Date(budget.startDate).getFullYear() + yearDiff));
            duplicate.endDate = new Date(new Date(budget.endDate).setFullYear(new Date(budget.endDate).getFullYear() + yearDiff));
        }

        firm.finance.budgets.push(duplicate);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Budget duplicated',
            data: duplicate
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:budgetId/distribution - Get budget distribution
 */
router.get('/:budgetId/distribution', async (req, res, next) => {
    try {
        const budgetId = sanitizeObjectId(req.params.budgetId, 'budgetId');

        const firm = await Firm.findOne(req.firmQuery).select('finance.budgets').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budget = (firm.finance?.budgets || []).find(
            b => b._id?.toString() === budgetId.toString()
        );

        if (!budget) {
            throw CustomException('Budget not found', 404);
        }

        // Calculate distribution by category
        const distribution = {};
        for (const line of (budget.lines || [])) {
            const category = line.category || 'Uncategorized';
            if (!distribution[category]) {
                distribution[category] = { budgeted: 0, spent: 0, count: 0 };
            }
            distribution[category].budgeted += line.amount || 0;
            distribution[category].spent += line.spent || 0;
            distribution[category].count++;
        }

        res.json({
            success: true,
            data: {
                budgetId: budget._id,
                totalBudget: budget.totalAmount,
                distribution: Object.entries(distribution).map(([category, data]) => ({
                    category,
                    ...data,
                    remaining: data.budgeted - data.spent,
                    percentOfTotal: Math.round((data.budgeted / budget.totalAmount) * 100)
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:budgetId/vs-actual - Get budget vs actual comparison
 */
router.get('/:budgetId/vs-actual', async (req, res, next) => {
    try {
        const budgetId = sanitizeObjectId(req.params.budgetId, 'budgetId');

        const firm = await Firm.findOne(req.firmQuery).select('finance.budgets').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budget = (firm.finance?.budgets || []).find(
            b => b._id?.toString() === budgetId.toString()
        );

        if (!budget) {
            throw CustomException('Budget not found', 404);
        }

        const comparison = (budget.lines || []).map(line => ({
            lineId: line._id,
            category: line.category,
            description: line.description,
            budgeted: line.amount || 0,
            actual: line.spent || 0,
            variance: (line.amount || 0) - (line.spent || 0),
            variancePercent: line.amount > 0
                ? Math.round(((line.amount - (line.spent || 0)) / line.amount) * 100)
                : 0,
            status: (line.spent || 0) > (line.amount || 0) ? 'over_budget' : 'within_budget'
        }));

        const summary = {
            totalBudgeted: budget.totalAmount,
            totalActual: budget.spent || 0,
            totalVariance: (budget.totalAmount || 0) - (budget.spent || 0),
            overBudgetLines: comparison.filter(c => c.status === 'over_budget').length,
            withinBudgetLines: comparison.filter(c => c.status === 'within_budget').length
        };

        res.json({
            success: true,
            data: {
                budget: {
                    id: budget._id,
                    name: budget.name,
                    fiscalYear: budget.fiscalYear
                },
                summary,
                comparison
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:budgetId/lines - Get budget lines
 */
router.get('/:budgetId/lines', async (req, res, next) => {
    try {
        const budgetId = sanitizeObjectId(req.params.budgetId, 'budgetId');

        const firm = await Firm.findOne(req.firmQuery).select('finance.budgets').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budget = (firm.finance?.budgets || []).find(
            b => b._id?.toString() === budgetId.toString()
        );

        if (!budget) {
            throw CustomException('Budget not found', 404);
        }

        res.json({
            success: true,
            data: budget.lines || []
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:budgetId/lines - Add budget line
 */
router.post('/:budgetId/lines', async (req, res, next) => {
    try {
        const budgetId = sanitizeObjectId(req.params.budgetId, 'budgetId');
        const safeData = pickAllowedFields(req.body, ALLOWED_LINE_FIELDS);

        if (!safeData.category) {
            throw CustomException('Line category is required', 400);
        }
        if (!safeData.amount || safeData.amount <= 0) {
            throw CustomException('Valid amount is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budgetIndex = (firm.finance?.budgets || []).findIndex(
            b => b._id?.toString() === budgetId.toString()
        );

        if (budgetIndex === -1) {
            throw CustomException('Budget not found', 404);
        }

        if (!firm.finance.budgets[budgetIndex].lines) {
            firm.finance.budgets[budgetIndex].lines = [];
        }

        const line = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            spent: 0,
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.finance.budgets[budgetIndex].lines.push(line);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Budget line added',
            data: line
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:budgetId/lines/:lineId - Update budget line
 */
router.put('/:budgetId/lines/:lineId', async (req, res, next) => {
    try {
        const budgetId = sanitizeObjectId(req.params.budgetId, 'budgetId');
        const lineId = sanitizeObjectId(req.params.lineId, 'lineId');
        const safeData = pickAllowedFields(req.body, ALLOWED_LINE_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budgetIndex = (firm.finance?.budgets || []).findIndex(
            b => b._id?.toString() === budgetId.toString()
        );

        if (budgetIndex === -1) {
            throw CustomException('Budget not found', 404);
        }

        const lineIndex = (firm.finance.budgets[budgetIndex].lines || []).findIndex(
            l => l._id?.toString() === lineId.toString()
        );

        if (lineIndex === -1) {
            throw CustomException('Budget line not found', 404);
        }

        Object.assign(firm.finance.budgets[budgetIndex].lines[lineIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Budget line updated',
            data: firm.finance.budgets[budgetIndex].lines[lineIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:budgetId/lines/:lineId - Delete budget line
 */
router.delete('/:budgetId/lines/:lineId', async (req, res, next) => {
    try {
        const budgetId = sanitizeObjectId(req.params.budgetId, 'budgetId');
        const lineId = sanitizeObjectId(req.params.lineId, 'lineId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const budgetIndex = (firm.finance?.budgets || []).findIndex(
            b => b._id?.toString() === budgetId.toString()
        );

        if (budgetIndex === -1) {
            throw CustomException('Budget not found', 404);
        }

        const lineIndex = (firm.finance.budgets[budgetIndex].lines || []).findIndex(
            l => l._id?.toString() === lineId.toString()
        );

        if (lineIndex === -1) {
            throw CustomException('Budget line not found', 404);
        }

        firm.finance.budgets[budgetIndex].lines.splice(lineIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Budget line deleted'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
