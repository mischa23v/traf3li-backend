/**
 * Leave Allocation Routes
 *
 * Routes for leave allocations at /api/leave-allocations
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

const ALLOWED_FIELDS = [
    'employeeId', 'leaveTypeId', 'leavePeriodId', 'allocatedDays',
    'usedDays', 'pendingDays', 'balance', 'carryForwardDays',
    'carryForwardExpiry', 'adjustments', 'notes'
];

/**
 * GET /api/leave-allocations
 * List all leave allocations
 */
router.get('/', async (req, res) => {
    try {
        const { employeeId, leaveTypeId, leavePeriodId } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        let allocations = firm?.settings?.leaveAllocations || [];

        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId);
            if (sanitizedEmployeeId) {
                allocations = allocations.filter(a =>
                    a.employeeId?.toString() === sanitizedEmployeeId
                );
            }
        }

        if (leaveTypeId) {
            const sanitizedLeaveTypeId = sanitizeObjectId(leaveTypeId);
            if (sanitizedLeaveTypeId) {
                allocations = allocations.filter(a =>
                    a.leaveTypeId?.toString() === sanitizedLeaveTypeId
                );
            }
        }

        if (leavePeriodId) {
            const sanitizedLeavePeriodId = sanitizeObjectId(leavePeriodId);
            if (sanitizedLeavePeriodId) {
                allocations = allocations.filter(a =>
                    a.leavePeriodId?.toString() === sanitizedLeavePeriodId
                );
            }
        }

        const total = allocations.length;
        const paginatedAllocations = allocations.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedAllocations.length,
            data: paginatedAllocations,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-allocations/balance/:employeeId
 * Get leave balance for employee
 */
router.get('/balance/:employeeId', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations settings.leaveTypes');

        const allocations = (firm?.settings?.leaveAllocations || [])
            .filter(a =>
                a.employeeId?.toString() === sanitizedEmployeeId &&
                new Date(a.createdAt).getFullYear() === targetYear
            );

        const leaveTypes = firm?.settings?.leaveTypes || [];

        const balances = allocations.map(a => {
            const leaveType = leaveTypes.find(lt =>
                lt._id.toString() === a.leaveTypeId?.toString()
            );
            return {
                leaveType: leaveType?.name || 'Unknown',
                leaveTypeId: a.leaveTypeId,
                allocated: a.allocatedDays || 0,
                used: a.usedDays || 0,
                pending: a.pendingDays || 0,
                balance: a.balance || (a.allocatedDays - a.usedDays - a.pendingDays),
                carryForward: a.carryForwardDays || 0
            };
        });

        return res.json({
            success: true,
            data: {
                employeeId: sanitizedEmployeeId,
                year: targetYear,
                balances
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-allocations/employee/:employeeId/all
 * Get all allocations for employee
 */
router.get('/employee/:employeeId/all', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const allocations = (firm?.settings?.leaveAllocations || [])
            .filter(a => a.employeeId?.toString() === sanitizedEmployeeId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({
            success: true,
            count: allocations.length,
            data: allocations
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-allocations/history/:employeeId
 * Get allocation history for employee
 */
router.get('/history/:employeeId', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const history = (firm?.settings?.leaveAllocations || [])
            .filter(a => a.employeeId?.toString() === sanitizedEmployeeId)
            .map(a => ({
                ...a,
                adjustmentHistory: a.adjustments || []
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({
            success: true,
            count: history.length,
            data: history
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-allocations/summary/:leavePeriodId
 * Get allocation summary for a leave period
 */
router.get('/summary/:leavePeriodId', async (req, res) => {
    try {
        const sanitizedPeriodId = sanitizeObjectId(req.params.leavePeriodId);
        if (!sanitizedPeriodId) {
            throw CustomException('Invalid leave period ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const allocations = (firm?.settings?.leaveAllocations || [])
            .filter(a => a.leavePeriodId?.toString() === sanitizedPeriodId);

        const summary = {
            totalAllocations: allocations.length,
            totalAllocatedDays: allocations.reduce((sum, a) => sum + (a.allocatedDays || 0), 0),
            totalUsedDays: allocations.reduce((sum, a) => sum + (a.usedDays || 0), 0),
            totalPendingDays: allocations.reduce((sum, a) => sum + (a.pendingDays || 0), 0),
            totalBalance: allocations.reduce((sum, a) => sum + (a.balance || 0), 0),
            utilizationRate: 0
        };

        if (summary.totalAllocatedDays > 0) {
            summary.utilizationRate = (
                (summary.totalUsedDays / summary.totalAllocatedDays) * 100
            ).toFixed(2);
        }

        return res.json({ success: true, data: summary });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-allocations/low-balance
 * Get employees with low leave balance
 */
router.get('/low-balance', async (req, res) => {
    try {
        const { threshold = 5 } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const lowBalance = (firm?.settings?.leaveAllocations || [])
            .filter(a => (a.balance || 0) <= parseInt(threshold))
            .sort((a, b) => (a.balance || 0) - (b.balance || 0));

        return res.json({
            success: true,
            count: lowBalance.length,
            data: lowBalance
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-allocations/expiring-carry-forward
 * Get allocations with expiring carry forward
 */
router.get('/expiring-carry-forward', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(days));

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const expiring = (firm?.settings?.leaveAllocations || [])
            .filter(a =>
                a.carryForwardDays > 0 &&
                a.carryForwardExpiry &&
                new Date(a.carryForwardExpiry) <= expiryDate
            )
            .sort((a, b) => new Date(a.carryForwardExpiry) - new Date(b.carryForwardExpiry));

        return res.json({
            success: true,
            count: expiring.length,
            data: expiring
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-allocations/carry-forward/summary
 * Get carry forward summary
 */
router.get('/carry-forward/summary', async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const allocations = (firm?.settings?.leaveAllocations || [])
            .filter(a => a.carryForwardDays > 0);

        const summary = {
            totalCarryForwardDays: allocations.reduce((sum, a) => sum + (a.carryForwardDays || 0), 0),
            employeesWithCarryForward: [...new Set(allocations.map(a => a.employeeId?.toString()))].length,
            expiringThisMonth: allocations.filter(a => {
                const expiry = new Date(a.carryForwardExpiry);
                const now = new Date();
                return expiry.getMonth() === now.getMonth() && expiry.getFullYear() === now.getFullYear();
            }).length
        };

        return res.json({ success: true, data: summary });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-allocations/statistics
 * Get allocation statistics
 */
router.get('/statistics', async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const allocations = (firm?.settings?.leaveAllocations || [])
            .filter(a => new Date(a.createdAt).getFullYear() === targetYear);

        const stats = {
            year: targetYear,
            totalAllocations: allocations.length,
            uniqueEmployees: [...new Set(allocations.map(a => a.employeeId?.toString()))].length,
            totalAllocatedDays: allocations.reduce((sum, a) => sum + (a.allocatedDays || 0), 0),
            totalUsedDays: allocations.reduce((sum, a) => sum + (a.usedDays || 0), 0),
            averageUtilization: 0
        };

        if (stats.totalAllocatedDays > 0) {
            stats.averageUtilization = (
                (stats.totalUsedDays / stats.totalAllocatedDays) * 100
            ).toFixed(2);
        }

        return res.json({ success: true, data: stats });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-allocations/:id
 * Get single allocation
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid allocation ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const allocation = (firm?.settings?.leaveAllocations || [])
            .find(a => a._id.toString() === sanitizedId);

        if (!allocation) {
            throw CustomException('Leave allocation not found', 404);
        }

        return res.json({ success: true, data: allocation });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-allocations
 * Create leave allocation
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_FIELDS);

        if (!allowedFields.employeeId) {
            throw CustomException('Employee ID is required', 400);
        }

        if (!allowedFields.leaveTypeId) {
            throw CustomException('Leave type ID is required', 400);
        }

        allowedFields.employeeId = sanitizeObjectId(allowedFields.employeeId);
        allowedFields.leaveTypeId = sanitizeObjectId(allowedFields.leaveTypeId);

        if (allowedFields.leavePeriodId) {
            allowedFields.leavePeriodId = sanitizeObjectId(allowedFields.leavePeriodId);
        }

        const allocationId = new mongoose.Types.ObjectId();
        const allocationData = {
            _id: allocationId,
            ...allowedFields,
            usedDays: 0,
            pendingDays: 0,
            balance: allowedFields.allocatedDays || 0,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.leaveAllocations': allocationData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Leave allocation created',
            data: allocationData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-allocations/bulk
 * Bulk create allocations
 */
router.post('/bulk', async (req, res) => {
    try {
        const { allocations } = req.body;

        if (!Array.isArray(allocations) || allocations.length === 0) {
            throw CustomException('Array of allocations is required', 400);
        }

        if (allocations.length > 100) {
            throw CustomException('Maximum 100 allocations per bulk create', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < allocations.length; i++) {
            try {
                const fields = pickAllowedFields(allocations[i], ALLOWED_FIELDS);

                if (!fields.employeeId || !fields.leaveTypeId) {
                    throw new Error('Employee ID and Leave Type ID are required');
                }

                fields.employeeId = sanitizeObjectId(fields.employeeId);
                fields.leaveTypeId = sanitizeObjectId(fields.leaveTypeId);

                const allocationId = new mongoose.Types.ObjectId();
                const allocationData = {
                    _id: allocationId,
                    ...fields,
                    usedDays: 0,
                    pendingDays: 0,
                    balance: fields.allocatedDays || 0,
                    createdAt: new Date(),
                    createdBy: req.userID
                };

                await Firm.findOneAndUpdate(
                    { _id: req.firmId },
                    { $push: { 'settings.leaveAllocations': allocationData } }
                );

                results.push({ index: i, success: true, data: allocationData });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} allocations, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-allocations/carry-forward
 * Process carry forward for specific employee
 */
router.post('/carry-forward', async (req, res) => {
    try {
        const { employeeId, fromYear, toYear, maxDays } = req.body;

        const sanitizedEmployeeId = sanitizeObjectId(employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const sourceYear = fromYear || new Date().getFullYear() - 1;
        const targetYear = toYear || new Date().getFullYear();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const sourceAllocations = (firm?.settings?.leaveAllocations || [])
            .filter(a =>
                a.employeeId?.toString() === sanitizedEmployeeId &&
                new Date(a.createdAt).getFullYear() === sourceYear &&
                (a.balance || 0) > 0
            );

        const carryForwardData = sourceAllocations.map(a => ({
            leaveTypeId: a.leaveTypeId,
            carryForwardDays: Math.min(a.balance || 0, maxDays || 15),
            sourceYear,
            targetYear
        }));

        return res.json({
            success: true,
            message: 'Carry forward processed',
            data: {
                employeeId: sanitizedEmployeeId,
                carryForwardItems: carryForwardData
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-allocations/carry-forward/process-all
 * Process carry forward for all employees
 */
router.post('/carry-forward/process-all', async (req, res) => {
    try {
        const { fromYear, toYear, maxDays = 15 } = req.body;

        const sourceYear = fromYear || new Date().getFullYear() - 1;
        const targetYear = toYear || new Date().getFullYear();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const sourceAllocations = (firm?.settings?.leaveAllocations || [])
            .filter(a =>
                new Date(a.createdAt).getFullYear() === sourceYear &&
                (a.balance || 0) > 0
            );

        const processed = sourceAllocations.length;

        return res.json({
            success: true,
            message: `Carry forward processed for ${processed} allocations`,
            data: {
                sourceYear,
                targetYear,
                processedCount: processed
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-allocations/carry-forward/expire
 * Expire unused carry forward
 */
router.post('/carry-forward/expire', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const now = new Date();
        const expired = (firm?.settings?.leaveAllocations || [])
            .filter(a =>
                a.carryForwardDays > 0 &&
                a.carryForwardExpiry &&
                new Date(a.carryForwardExpiry) < now
            );

        // Zero out expired carry forward
        for (const allocation of expired) {
            await Firm.findOneAndUpdate(
                {
                    _id: req.firmId,
                    'settings.leaveAllocations._id': allocation._id
                },
                {
                    $set: {
                        'settings.leaveAllocations.$.carryForwardDays': 0,
                        'settings.leaveAllocations.$.carryForwardExpired': true,
                        'settings.leaveAllocations.$.carryForwardExpiredAt': now
                    }
                }
            );
        }

        return res.json({
            success: true,
            message: `Expired carry forward for ${expired.length} allocations`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/leave-allocations/:id
 * Update allocation
 */
router.patch('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid allocation ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_FIELDS);

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveAllocations._id': sanitizedId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`settings.leaveAllocations.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'settings.leaveAllocations.$.updatedAt': new Date(),
                    'settings.leaveAllocations.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Leave allocation not found', 404);
        }

        return res.json({
            success: true,
            message: 'Leave allocation updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/leave-allocations/:id/update-balance
 * Update allocation balance
 */
router.patch('/:id/update-balance', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid allocation ID format', 400);
        }

        const { usedDays, pendingDays } = req.body;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const allocation = (firm?.settings?.leaveAllocations || [])
            .find(a => a._id.toString() === sanitizedId);

        if (!allocation) {
            throw CustomException('Leave allocation not found', 404);
        }

        const newUsedDays = usedDays !== undefined ? usedDays : allocation.usedDays;
        const newPendingDays = pendingDays !== undefined ? pendingDays : allocation.pendingDays;
        const newBalance = allocation.allocatedDays - newUsedDays - newPendingDays;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveAllocations._id': sanitizedId
            },
            {
                $set: {
                    'settings.leaveAllocations.$.usedDays': newUsedDays,
                    'settings.leaveAllocations.$.pendingDays': newPendingDays,
                    'settings.leaveAllocations.$.balance': newBalance,
                    'settings.leaveAllocations.$.updatedAt': new Date()
                }
            }
        );

        return res.json({
            success: true,
            message: 'Leave balance updated',
            data: { usedDays: newUsedDays, pendingDays: newPendingDays, balance: newBalance }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-allocations/:id/adjust
 * Adjust allocation
 */
router.post('/:id/adjust', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid allocation ID format', 400);
        }

        const { days, reason, type } = req.body;

        if (!days || days === 0) {
            throw CustomException('Days adjustment is required', 400);
        }

        if (!reason) {
            throw CustomException('Adjustment reason is required', 400);
        }

        const adjustment = {
            _id: new mongoose.Types.ObjectId(),
            days,
            reason,
            type: type || (days > 0 ? 'credit' : 'debit'),
            adjustedAt: new Date(),
            adjustedBy: req.userID
        };

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveAllocations._id': sanitizedId
            },
            {
                $push: { 'settings.leaveAllocations.$.adjustments': adjustment },
                $inc: {
                    'settings.leaveAllocations.$.allocatedDays': days,
                    'settings.leaveAllocations.$.balance': days
                }
            }
        );

        return res.json({
            success: true,
            message: 'Leave allocation adjusted',
            data: adjustment
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-allocations/:id/encash
 * Encash leave from allocation
 */
router.post('/:id/encash', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid allocation ID format', 400);
        }

        const { days, reason } = req.body;

        if (!days || days <= 0) {
            throw CustomException('Days to encash must be greater than 0', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveAllocations');

        const allocation = (firm?.settings?.leaveAllocations || [])
            .find(a => a._id.toString() === sanitizedId);

        if (!allocation) {
            throw CustomException('Leave allocation not found', 404);
        }

        if ((allocation.balance || 0) < days) {
            throw CustomException('Insufficient leave balance', 400);
        }

        const adjustment = {
            _id: new mongoose.Types.ObjectId(),
            days: -days,
            reason: reason || 'Leave encashment',
            type: 'encashment',
            adjustedAt: new Date(),
            adjustedBy: req.userID
        };

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveAllocations._id': sanitizedId
            },
            {
                $push: { 'settings.leaveAllocations.$.adjustments': adjustment },
                $inc: {
                    'settings.leaveAllocations.$.balance': -days
                }
            }
        );

        return res.json({
            success: true,
            message: `${days} days encashed from allocation`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/leave-allocations/:id
 * Delete allocation
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid allocation ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'settings.leaveAllocations': { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Leave allocation deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
