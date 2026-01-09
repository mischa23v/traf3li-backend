/**
 * HR Retention Bonus Routes
 *
 * Routes for retention bonuses at /api/hr/retention-bonuses
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

const ALLOWED_BONUS_FIELDS = [
    'employeeId', 'amount', 'currency', 'reason', 'vestingSchedule',
    'vestingStartDate', 'vestingEndDate', 'conditions', 'clawbackTerms',
    'paymentDate', 'notes', 'departmentId'
];

const VALID_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled', 'clawback'];

/**
 * GET /api/hr/retention-bonuses
 * List all retention bonuses
 */
router.get('/', async (req, res) => {
    try {
        const { search, status, employeeId, departmentId } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.retentionBonuses');

        let bonuses = firm?.hr?.retentionBonuses || [];

        if (status && VALID_STATUSES.includes(status)) {
            bonuses = bonuses.filter(b => b.status === status);
        }

        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId);
            if (sanitizedEmployeeId) {
                bonuses = bonuses.filter(b =>
                    b.employeeId?.toString() === sanitizedEmployeeId
                );
            }
        }

        if (departmentId) {
            const sanitizedDeptId = sanitizeObjectId(departmentId);
            if (sanitizedDeptId) {
                bonuses = bonuses.filter(b =>
                    b.departmentId?.toString() === sanitizedDeptId
                );
            }
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            bonuses = bonuses.filter(b =>
                searchRegex.test(b.reason) ||
                searchRegex.test(b.notes)
            );
        }

        bonuses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = bonuses.length;
        const paginatedBonuses = bonuses.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedBonuses.length,
            data: paginatedBonuses,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/retention-bonuses/:id
 * Get single retention bonus
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.retentionBonuses');

        const bonus = (firm?.hr?.retentionBonuses || [])
            .find(b => b._id.toString() === sanitizedId);

        if (!bonus) {
            throw CustomException('Retention bonus not found', 404);
        }

        return res.json({ success: true, data: bonus });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/retention-bonuses
 * Create retention bonus
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_BONUS_FIELDS);

        if (!allowedFields.employeeId || !allowedFields.amount) {
            throw CustomException('Employee ID and amount are required', 400);
        }

        allowedFields.employeeId = sanitizeObjectId(allowedFields.employeeId);
        if (!allowedFields.employeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const bonusId = new mongoose.Types.ObjectId();
        const bonusData = {
            _id: bonusId,
            ...allowedFields,
            currency: allowedFields.currency || 'SAR',
            status: 'draft',
            vestingProgress: 0,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'hr.retentionBonuses': bonusData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Retention bonus created',
            data: bonusData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/retention-bonuses/:id
 * Update retention bonus
 */
router.patch('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_BONUS_FIELDS);

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.retentionBonuses._id': sanitizedId,
                'hr.retentionBonuses.status': { $in: ['draft', 'pending'] }
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`hr.retentionBonuses.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'hr.retentionBonuses.$.updatedAt': new Date(),
                    'hr.retentionBonuses.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Bonus not found or cannot be edited', 404);
        }

        return res.json({
            success: true,
            message: 'Retention bonus updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/retention-bonuses/:id
 * Delete retention bonus
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'hr.retentionBonuses': { _id: sanitizedId, status: 'draft' } } }
        );

        return res.json({
            success: true,
            message: 'Retention bonus deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/retention-bonuses/bulk-delete
 * Bulk delete retention bonuses
 */
router.post('/bulk-delete', async (req, res) => {
    try {
        const { bonusIds } = req.body;

        if (!Array.isArray(bonusIds) || bonusIds.length === 0) {
            throw CustomException('Array of bonus IDs is required', 400);
        }

        if (bonusIds.length > 50) {
            throw CustomException('Maximum 50 bonuses per bulk delete', 400);
        }

        const sanitizedIds = bonusIds.map(id => sanitizeObjectId(id)).filter(Boolean);

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            {
                $pull: {
                    'hr.retentionBonuses': {
                        _id: { $in: sanitizedIds },
                        status: 'draft'
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Bonuses deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/retention-bonuses/:id/submit
 * Submit bonus for approval
 */
router.post('/:id/submit', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.retentionBonuses._id': sanitizedId,
                'hr.retentionBonuses.status': 'draft'
            },
            {
                $set: {
                    'hr.retentionBonuses.$.status': 'pending',
                    'hr.retentionBonuses.$.submittedAt': new Date(),
                    'hr.retentionBonuses.$.submittedBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Bonus submitted for approval'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/retention-bonuses/:id/approve
 * Approve retention bonus
 */
router.post('/:id/approve', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        const { notes } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.retentionBonuses._id': sanitizedId,
                'hr.retentionBonuses.status': 'pending'
            },
            {
                $set: {
                    'hr.retentionBonuses.$.status': 'approved',
                    'hr.retentionBonuses.$.approvedAt': new Date(),
                    'hr.retentionBonuses.$.approvedBy': req.userID,
                    'hr.retentionBonuses.$.approvalNotes': notes
                }
            }
        );

        return res.json({
            success: true,
            message: 'Retention bonus approved'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/retention-bonuses/:id/reject
 * Reject retention bonus
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.retentionBonuses._id': sanitizedId,
                'hr.retentionBonuses.status': 'pending'
            },
            {
                $set: {
                    'hr.retentionBonuses.$.status': 'rejected',
                    'hr.retentionBonuses.$.rejectedAt': new Date(),
                    'hr.retentionBonuses.$.rejectedBy': req.userID,
                    'hr.retentionBonuses.$.rejectionReason': reason
                }
            }
        );

        return res.json({
            success: true,
            message: 'Retention bonus rejected'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/retention-bonuses/:id/mark-paid
 * Mark bonus as paid
 */
router.post('/:id/mark-paid', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        const { paymentDate, paymentReference, notes } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.retentionBonuses._id': sanitizedId,
                'hr.retentionBonuses.status': 'approved'
            },
            {
                $set: {
                    'hr.retentionBonuses.$.status': 'paid',
                    'hr.retentionBonuses.$.paidAt': paymentDate ? new Date(paymentDate) : new Date(),
                    'hr.retentionBonuses.$.paymentReference': paymentReference,
                    'hr.retentionBonuses.$.paymentNotes': notes,
                    'hr.retentionBonuses.$.markedPaidBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Bonus marked as paid'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/retention-bonuses/:id/clawback
 * Initiate clawback
 */
router.post('/:id/clawback', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        const { reason, amount, effectiveDate } = req.body;

        if (!reason) {
            throw CustomException('Clawback reason is required', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.retentionBonuses._id': sanitizedId,
                'hr.retentionBonuses.status': 'paid'
            },
            {
                $set: {
                    'hr.retentionBonuses.$.status': 'clawback',
                    'hr.retentionBonuses.$.clawback': {
                        reason,
                        amount,
                        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
                        initiatedAt: new Date(),
                        initiatedBy: req.userID
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Clawback initiated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/retention-bonuses/:id/cancel
 * Cancel retention bonus
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        const { reason } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.retentionBonuses._id': sanitizedId,
                'hr.retentionBonuses.status': { $in: ['draft', 'pending', 'approved'] }
            },
            {
                $set: {
                    'hr.retentionBonuses.$.status': 'cancelled',
                    'hr.retentionBonuses.$.cancelledAt': new Date(),
                    'hr.retentionBonuses.$.cancelledBy': req.userID,
                    'hr.retentionBonuses.$.cancelReason': reason
                }
            }
        );

        return res.json({
            success: true,
            message: 'Retention bonus cancelled'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/retention-bonuses/employee/:employeeId/history
 * Get employee bonus history
 */
router.get('/employee/:employeeId/history', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.retentionBonuses');

        const history = (firm?.hr?.retentionBonuses || [])
            .filter(b => b.employeeId?.toString() === sanitizedId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const summary = {
            totalBonuses: history.length,
            totalAmount: history.reduce((sum, b) => sum + (b.amount || 0), 0),
            paidAmount: history
                .filter(b => b.status === 'paid')
                .reduce((sum, b) => sum + (b.amount || 0), 0),
            pendingAmount: history
                .filter(b => ['draft', 'pending', 'approved'].includes(b.status))
                .reduce((sum, b) => sum + (b.amount || 0), 0)
        };

        return res.json({
            success: true,
            count: history.length,
            data: history,
            summary
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/retention-bonuses/:id/vesting-status
 * Get vesting status
 */
router.get('/:id/vesting-status', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid bonus ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.retentionBonuses');

        const bonus = (firm?.hr?.retentionBonuses || [])
            .find(b => b._id.toString() === sanitizedId);

        if (!bonus) {
            throw CustomException('Retention bonus not found', 404);
        }

        // Calculate vesting progress
        const now = new Date();
        const startDate = bonus.vestingStartDate ? new Date(bonus.vestingStartDate) : new Date(bonus.createdAt);
        const endDate = bonus.vestingEndDate ? new Date(bonus.vestingEndDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

        const totalDays = (endDate - startDate) / (24 * 60 * 60 * 1000);
        const elapsedDays = Math.max(0, (now - startDate) / (24 * 60 * 60 * 1000));
        const progress = Math.min(100, (elapsedDays / totalDays) * 100);

        const vestedAmount = (bonus.amount || 0) * (progress / 100);

        return res.json({
            success: true,
            data: {
                bonusId: bonus._id,
                totalAmount: bonus.amount,
                vestedAmount: Math.round(vestedAmount * 100) / 100,
                unvestedAmount: Math.round((bonus.amount - vestedAmount) * 100) / 100,
                progress: Math.round(progress * 100) / 100,
                vestingStartDate: startDate,
                vestingEndDate: endDate,
                schedule: bonus.vestingSchedule
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/retention-bonuses/pending-approvals
 * Get pending approvals
 */
router.get('/pending-approvals', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.retentionBonuses');

        const pending = (firm?.hr?.retentionBonuses || [])
            .filter(b => b.status === 'pending')
            .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

        return res.json({
            success: true,
            count: pending.length,
            data: pending
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/retention-bonuses/department-summary
 * Get department summary
 */
router.get('/department-summary', async (req, res) => {
    try {
        const { departmentId } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.retentionBonuses');

        let bonuses = firm?.hr?.retentionBonuses || [];

        if (departmentId) {
            const sanitizedDeptId = sanitizeObjectId(departmentId);
            if (sanitizedDeptId) {
                bonuses = bonuses.filter(b =>
                    b.departmentId?.toString() === sanitizedDeptId
                );
            }
        }

        const summary = {
            total: bonuses.length,
            totalAmount: bonuses.reduce((sum, b) => sum + (b.amount || 0), 0),
            byStatus: {}
        };

        VALID_STATUSES.forEach(status => {
            const statusBonuses = bonuses.filter(b => b.status === status);
            summary.byStatus[status] = {
                count: statusBonuses.length,
                amount: statusBonuses.reduce((sum, b) => sum + (b.amount || 0), 0)
            };
        });

        return res.json({
            success: true,
            data: summary
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
