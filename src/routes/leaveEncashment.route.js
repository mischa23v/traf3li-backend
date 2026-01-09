/**
 * Leave Encashment Routes
 *
 * Routes for leave encashment at /api/leave-encashments
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
const User = require('../models/user.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

const ALLOWED_FIELDS = [
    'employeeId', 'leaveType', 'daysRequested', 'dailyRate',
    'totalAmount', 'taxDeduction', 'netAmount', 'reason',
    'status', 'notes', 'paymentDate', 'payrollRunId'
];

const VALID_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled'];

/**
 * GET /api/leave-encashments
 * List all leave encashments
 */
router.get('/', async (req, res) => {
    try {
        const { employeeId, status, leaveType } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveEncashments');

        let encashments = firm?.settings?.leaveEncashments || [];

        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId);
            if (sanitizedEmployeeId) {
                encashments = encashments.filter(e =>
                    e.employeeId?.toString() === sanitizedEmployeeId
                );
            }
        }

        if (status && VALID_STATUSES.includes(status)) {
            encashments = encashments.filter(e => e.status === status);
        }

        if (leaveType) {
            encashments = encashments.filter(e => e.leaveType === leaveType);
        }

        const total = encashments.length;
        const paginatedEncashments = encashments.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedEncashments.length,
            data: paginatedEncashments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-encashments/pending-approvals
 * Get pending encashment approvals
 */
router.get('/pending-approvals', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveEncashments');

        const pending = (firm?.settings?.leaveEncashments || [])
            .filter(e => e.status === 'pending')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
 * GET /api/leave-encashments/stats
 * Get encashment statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveEncashments');

        const encashments = (firm?.settings?.leaveEncashments || [])
            .filter(e => new Date(e.createdAt).getFullYear() === targetYear);

        const stats = {
            total: encashments.length,
            pending: encashments.filter(e => e.status === 'pending').length,
            approved: encashments.filter(e => e.status === 'approved').length,
            paid: encashments.filter(e => e.status === 'paid').length,
            rejected: encashments.filter(e => e.status === 'rejected').length,
            totalAmount: encashments
                .filter(e => e.status === 'paid')
                .reduce((sum, e) => sum + (e.netAmount || 0), 0),
            totalDays: encashments
                .filter(e => e.status === 'paid')
                .reduce((sum, e) => sum + (e.daysRequested || 0), 0)
        };

        return res.json({ success: true, data: stats });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-encashments/policy
 * Get encashment policy
 */
router.get('/policy', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveEncashmentPolicy');

        return res.json({
            success: true,
            data: firm?.settings?.leaveEncashmentPolicy || {
                enabled: true,
                maxDaysPerYear: 15,
                minBalanceToKeep: 5,
                eligibleLeaveTypes: ['annual', 'vacation'],
                requiresApproval: true
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-encashments/eligibility/:employeeId
 * Check employee eligibility for encashment
 */
router.get('/eligibility/:employeeId', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        // Get employee leave balance (simplified)
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveEncashmentPolicy settings.leaveAllocations');

        const policy = firm?.settings?.leaveEncashmentPolicy || {};
        const allocations = (firm?.settings?.leaveAllocations || [])
            .filter(a => a.employeeId?.toString() === sanitizedEmployeeId);

        const eligibility = {
            eligible: true,
            maxDays: policy.maxDaysPerYear || 15,
            availableBalance: allocations.reduce((sum, a) => sum + (a.balance || 0), 0),
            minBalanceToKeep: policy.minBalanceToKeep || 5,
            eligibleLeaveTypes: policy.eligibleLeaveTypes || ['annual']
        };

        eligibility.encashableDays = Math.max(0,
            eligibility.availableBalance - eligibility.minBalanceToKeep
        );
        eligibility.encashableDays = Math.min(
            eligibility.encashableDays,
            eligibility.maxDays
        );

        return res.json({ success: true, data: eligibility });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-encashments/employee/:employeeId
 * Get encashments for specific employee
 */
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveEncashments');

        const encashments = (firm?.settings?.leaveEncashments || [])
            .filter(e => e.employeeId?.toString() === sanitizedEmployeeId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({
            success: true,
            count: encashments.length,
            data: encashments
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-encashments/export
 * Export encashments
 */
router.get('/export', async (req, res) => {
    try {
        const { format = 'json', startDate, endDate, status } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveEncashments');

        let encashments = firm?.settings?.leaveEncashments || [];

        if (startDate) {
            encashments = encashments.filter(e =>
                new Date(e.createdAt) >= new Date(startDate)
            );
        }

        if (endDate) {
            encashments = encashments.filter(e =>
                new Date(e.createdAt) <= new Date(endDate)
            );
        }

        if (status && VALID_STATUSES.includes(status)) {
            encashments = encashments.filter(e => e.status === status);
        }

        if (format === 'csv') {
            const csv = encashments.map(e =>
                `${e.employeeId},${e.leaveType},${e.daysRequested},${e.netAmount},${e.status},${e.createdAt}`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=leave-encashments.csv');
            return res.send('employeeId,leaveType,days,amount,status,date\n' + csv);
        }

        return res.json({
            success: true,
            count: encashments.length,
            data: encashments
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/leave-encashments/:id
 * Get single encashment
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid encashment ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leaveEncashments');

        const encashment = (firm?.settings?.leaveEncashments || [])
            .find(e => e._id.toString() === sanitizedId);

        if (!encashment) {
            throw CustomException('Leave encashment not found', 404);
        }

        return res.json({ success: true, data: encashment });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments
 * Create leave encashment request
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_FIELDS);

        if (!allowedFields.employeeId) {
            throw CustomException('Employee ID is required', 400);
        }

        if (!allowedFields.daysRequested || allowedFields.daysRequested <= 0) {
            throw CustomException('Days requested must be greater than 0', 400);
        }

        allowedFields.employeeId = sanitizeObjectId(allowedFields.employeeId);

        const encashmentId = new mongoose.Types.ObjectId();
        const encashmentData = {
            _id: encashmentId,
            ...allowedFields,
            status: 'draft',
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.leaveEncashments': encashmentData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Leave encashment request created',
            data: encashmentData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments/calculate
 * Calculate encashment amount
 */
router.post('/calculate', async (req, res) => {
    try {
        const { employeeId, leaveType, days } = req.body;

        const sanitizedEmployeeId = sanitizeObjectId(employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        if (!days || days <= 0) {
            throw CustomException('Days must be greater than 0', 400);
        }

        // Get employee salary info (simplified)
        const employee = await User.findOne({
            _id: sanitizedEmployeeId,
            ...req.firmQuery
        }).select('salary basicSalary');

        const dailyRate = (employee?.basicSalary || employee?.salary || 0) / 30;
        const grossAmount = dailyRate * days;
        const taxDeduction = 0; // Saudi has no income tax
        const netAmount = grossAmount - taxDeduction;

        return res.json({
            success: true,
            data: {
                days,
                dailyRate,
                grossAmount,
                taxDeduction,
                netAmount
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/leave-encashments/:id
 * Update encashment request
 */
router.patch('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid encashment ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_FIELDS);

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveEncashments._id': sanitizedId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`settings.leaveEncashments.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'settings.leaveEncashments.$.updatedAt': new Date(),
                    'settings.leaveEncashments.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Leave encashment not found', 404);
        }

        return res.json({
            success: true,
            message: 'Leave encashment updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/leave-encashments/:id
 * Delete encashment request
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid encashment ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'settings.leaveEncashments': { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Leave encashment deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments/:id/submit
 * Submit encashment for approval
 */
router.post('/:id/submit', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid encashment ID format', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveEncashments._id': sanitizedId
            },
            {
                $set: {
                    'settings.leaveEncashments.$.status': 'pending',
                    'settings.leaveEncashments.$.submittedAt': new Date(),
                    'settings.leaveEncashments.$.submittedBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Leave encashment submitted for approval'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments/:id/approve
 * Approve encashment
 */
router.post('/:id/approve', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid encashment ID format', 400);
        }

        const { notes } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveEncashments._id': sanitizedId
            },
            {
                $set: {
                    'settings.leaveEncashments.$.status': 'approved',
                    'settings.leaveEncashments.$.approvedAt': new Date(),
                    'settings.leaveEncashments.$.approvedBy': req.userID,
                    'settings.leaveEncashments.$.approvalNotes': notes
                }
            }
        );

        return res.json({
            success: true,
            message: 'Leave encashment approved'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments/:id/reject
 * Reject encashment
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid encashment ID format', 400);
        }

        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveEncashments._id': sanitizedId
            },
            {
                $set: {
                    'settings.leaveEncashments.$.status': 'rejected',
                    'settings.leaveEncashments.$.rejectedAt': new Date(),
                    'settings.leaveEncashments.$.rejectedBy': req.userID,
                    'settings.leaveEncashments.$.rejectionReason': reason
                }
            }
        );

        return res.json({
            success: true,
            message: 'Leave encashment rejected'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments/:id/mark-paid
 * Mark encashment as paid
 */
router.post('/:id/mark-paid', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid encashment ID format', 400);
        }

        const { paymentDate, payrollRunId, transactionRef } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveEncashments._id': sanitizedId
            },
            {
                $set: {
                    'settings.leaveEncashments.$.status': 'paid',
                    'settings.leaveEncashments.$.paidAt': new Date(),
                    'settings.leaveEncashments.$.paidBy': req.userID,
                    'settings.leaveEncashments.$.paymentDate': paymentDate || new Date(),
                    'settings.leaveEncashments.$.payrollRunId': payrollRunId,
                    'settings.leaveEncashments.$.transactionRef': transactionRef
                }
            }
        );

        return res.json({
            success: true,
            message: 'Leave encashment marked as paid'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments/:id/process
 * Process encashment (shortcut for approve + mark paid)
 */
router.post('/:id/process', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid encashment ID format', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveEncashments._id': sanitizedId
            },
            {
                $set: {
                    'settings.leaveEncashments.$.status': 'paid',
                    'settings.leaveEncashments.$.approvedAt': new Date(),
                    'settings.leaveEncashments.$.approvedBy': req.userID,
                    'settings.leaveEncashments.$.paidAt': new Date(),
                    'settings.leaveEncashments.$.paidBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Leave encashment processed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments/:id/cancel
 * Cancel encashment
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid encashment ID format', 400);
        }

        const { reason } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leaveEncashments._id': sanitizedId
            },
            {
                $set: {
                    'settings.leaveEncashments.$.status': 'cancelled',
                    'settings.leaveEncashments.$.cancelledAt': new Date(),
                    'settings.leaveEncashments.$.cancelledBy': req.userID,
                    'settings.leaveEncashments.$.cancelReason': reason
                }
            }
        );

        return res.json({
            success: true,
            message: 'Leave encashment cancelled'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments/bulk-approve
 * Bulk approve encashments
 */
router.post('/bulk-approve', async (req, res) => {
    try {
        const { ids, notes } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw CustomException('Array of encashment IDs is required', 400);
        }

        if (ids.length > 50) {
            throw CustomException('Maximum 50 encashments per bulk approve', 400);
        }

        let approved = 0;

        for (const id of ids) {
            const sanitizedId = sanitizeObjectId(id);
            if (sanitizedId) {
                await Firm.findOneAndUpdate(
                    {
                        _id: req.firmId,
                        'settings.leaveEncashments._id': sanitizedId,
                        'settings.leaveEncashments.status': 'pending'
                    },
                    {
                        $set: {
                            'settings.leaveEncashments.$.status': 'approved',
                            'settings.leaveEncashments.$.approvedAt': new Date(),
                            'settings.leaveEncashments.$.approvedBy': req.userID,
                            'settings.leaveEncashments.$.approvalNotes': notes
                        }
                    }
                );
                approved++;
            }
        }

        return res.json({
            success: true,
            message: `${approved} encashments approved`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/leave-encashments/bulk-reject
 * Bulk reject encashments
 */
router.post('/bulk-reject', async (req, res) => {
    try {
        const { ids, reason } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw CustomException('Array of encashment IDs is required', 400);
        }

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        if (ids.length > 50) {
            throw CustomException('Maximum 50 encashments per bulk reject', 400);
        }

        let rejected = 0;

        for (const id of ids) {
            const sanitizedId = sanitizeObjectId(id);
            if (sanitizedId) {
                await Firm.findOneAndUpdate(
                    {
                        _id: req.firmId,
                        'settings.leaveEncashments._id': sanitizedId,
                        'settings.leaveEncashments.status': 'pending'
                    },
                    {
                        $set: {
                            'settings.leaveEncashments.$.status': 'rejected',
                            'settings.leaveEncashments.$.rejectedAt': new Date(),
                            'settings.leaveEncashments.$.rejectedBy': req.userID,
                            'settings.leaveEncashments.$.rejectionReason': reason
                        }
                    }
                );
                rejected++;
            }
        }

        return res.json({
            success: true,
            message: `${rejected} encashments rejected`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
