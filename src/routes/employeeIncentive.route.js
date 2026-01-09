/**
 * Employee Incentive Routes
 *
 * Routes for managing employee incentives at /api/hr/employee-incentives
 * Follows enterprise security patterns (OWASP, AWS, Google)
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 * - Regex injection prevention via escapeRegex
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const EmployeeIncentive = require('../models/employeeIncentive.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for mass assignment protection
const ALLOWED_CREATE_FIELDS = [
    'employeeId',
    'incentiveType',
    'incentiveName',
    'description',
    'amount',
    'currency',
    'calculationBasis',
    'percentage',
    'baseAmount',
    'periodType',
    'periodStartDate',
    'periodEndDate',
    'awardDate',
    'paymentDate',
    'performanceMetrics',
    'projectId',
    'referredEmployee',
    'salesAmount',
    'reason',
    'notes',
    'attachments'
];

const ALLOWED_UPDATE_FIELDS = [
    'incentiveName',
    'description',
    'amount',
    'currency',
    'calculationBasis',
    'percentage',
    'baseAmount',
    'periodType',
    'periodStartDate',
    'periodEndDate',
    'awardDate',
    'paymentDate',
    'performanceMetrics',
    'reason',
    'notes',
    'hrComments',
    'attachments'
];

// Valid status values
const VALID_STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'processed', 'cancelled'];
const VALID_INCENTIVE_TYPES = [
    'performance_bonus', 'spot_award', 'referral_bonus', 'project_bonus',
    'sales_commission', 'annual_bonus', 'quarterly_bonus', 'recognition_award',
    'innovation_award', 'team_bonus', 'other'
];

/**
 * GET /api/hr/employee-incentives
 * List all incentives with filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const { employeeId, status, incentiveType, year, search } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        // Build query with tenant isolation
        const query = { ...req.firmQuery };

        // Filter by employee (sanitize ID)
        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId);
            if (!sanitizedEmployeeId) {
                throw CustomException('Invalid employeeId format', 400);
            }
            query.employeeId = sanitizedEmployeeId;
        }

        // Filter by status (validate against allowlist)
        if (status && VALID_STATUSES.includes(status)) {
            query.status = status;
        }

        // Filter by incentive type (validate against allowlist)
        if (incentiveType && VALID_INCENTIVE_TYPES.includes(incentiveType)) {
            query.incentiveType = incentiveType;
        }

        // Filter by year
        if (year) {
            const yearNum = parseInt(year, 10);
            if (!isNaN(yearNum) && yearNum >= 2000 && yearNum <= 2100) {
                query.awardDate = {
                    $gte: new Date(yearNum, 0, 1),
                    $lte: new Date(yearNum, 11, 31, 23, 59, 59)
                };
            }
        }

        // Search by name (escape regex)
        if (search && search.trim()) {
            query.incentiveName = { $regex: escapeRegex(search.trim()), $options: 'i' };
        }

        const [incentives, total] = await Promise.all([
            EmployeeIncentive.find(query)
                .populate('employeeId', 'employeeId firstName lastName')
                .populate('approvedBy', 'name email')
                .skip(skip)
                .limit(limit)
                .sort({ awardDate: -1 }),
            EmployeeIncentive.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: incentives.length,
            data: incentives,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-incentives/pending
 * Get incentives pending approval
 */
router.get('/pending', async (req, res) => {
    try {
        const incentives = await EmployeeIncentive.getPendingApprovals(
            req.firmQuery.firmId || req.firmQuery.lawyerId,
            req.userID
        );

        return res.json({
            success: true,
            count: incentives.length,
            data: incentives
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-incentives/awaiting-processing
 * Get approved incentives awaiting payroll processing
 */
router.get('/awaiting-processing', async (req, res) => {
    try {
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const incentives = await EmployeeIncentive.getUnprocessedForPayroll(firmId);

        return res.json({
            success: true,
            count: incentives.length,
            data: incentives
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-incentives/payroll/:payrollDate
 * Get incentives for a specific payroll date
 */
router.get('/payroll/:payrollDate', async (req, res) => {
    try {
        const payrollDate = new Date(req.params.payrollDate);
        if (isNaN(payrollDate.getTime())) {
            throw CustomException('Invalid payroll date format', 400);
        }

        const startOfMonth = new Date(payrollDate.getFullYear(), payrollDate.getMonth(), 1);
        const endOfMonth = new Date(payrollDate.getFullYear(), payrollDate.getMonth() + 1, 0, 23, 59, 59);

        const incentives = await EmployeeIncentive.find({
            ...req.firmQuery,
            status: 'approved',
            payrollProcessed: false,
            paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
        })
            .populate('employeeId', 'employeeId firstName lastName')
            .sort({ paymentDate: 1 });

        return res.json({
            success: true,
            count: incentives.length,
            data: incentives
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-incentives/employee/:employeeId/history
 * Get incentive history for an employee
 */
router.get('/employee/:employeeId/history', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        const { year, status, incentiveType } = req.query;
        const options = {};

        if (status && VALID_STATUSES.includes(status)) options.status = status;
        if (incentiveType && VALID_INCENTIVE_TYPES.includes(incentiveType)) options.incentiveType = incentiveType;
        if (year) {
            const yearNum = parseInt(year, 10);
            if (!isNaN(yearNum)) options.year = yearNum;
        }

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const incentives = await EmployeeIncentive.getEmployeeIncentives(firmId, sanitizedEmployeeId, options);

        return res.json({
            success: true,
            count: incentives.length,
            data: incentives
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-incentives/stats
 * Get incentive statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const stats = await EmployeeIncentive.getIncentiveStats(firmId, year);

        return res.json({
            success: true,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-incentives/:id
 * Get a single incentive by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid incentive ID format', 400);
        }

        // IDOR Protection: Query includes firmQuery
        const incentive = await EmployeeIncentive.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
            .populate('employeeId', 'employeeId firstName lastName')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email')
            .populate('payrollRunId', 'runNumber runDate');

        if (!incentive) {
            throw CustomException('Incentive not found', 404);
        }

        return res.json({
            success: true,
            data: incentive
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-incentives
 * Create a new incentive
 */
router.post('/', async (req, res) => {
    try {
        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);

        // Validate required fields
        if (!allowedFields.employeeId) {
            throw CustomException('Employee is required', 400);
        }
        if (!allowedFields.incentiveType || !VALID_INCENTIVE_TYPES.includes(allowedFields.incentiveType)) {
            throw CustomException('Valid incentive type is required', 400);
        }
        if (!allowedFields.incentiveName || typeof allowedFields.incentiveName !== 'string') {
            throw CustomException('Incentive name is required', 400);
        }
        if (typeof allowedFields.amount !== 'number' || allowedFields.amount < 0) {
            throw CustomException('Valid amount is required', 400);
        }
        if (!allowedFields.awardDate) {
            throw CustomException('Award date is required', 400);
        }

        // Sanitize employee ID
        const sanitizedEmployeeId = sanitizeObjectId(allowedFields.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        // Create with tenant context using req.addFirmId
        const incentive = await EmployeeIncentive.create(req.addFirmId({
            ...allowedFields,
            employeeId: sanitizedEmployeeId,
            createdBy: req.userID
        }));

        // Fetch with population for response
        const populated = await EmployeeIncentive.findOne({
            _id: incentive._id,
            ...req.firmQuery
        }).populate('employeeId', 'employeeId firstName lastName');

        return res.status(201).json({
            success: true,
            message: 'Incentive created successfully',
            data: populated
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-incentives/bulk-create
 * Bulk create incentives
 */
router.post('/bulk-create', async (req, res) => {
    try {
        const { incentives } = req.body;

        if (!Array.isArray(incentives) || incentives.length === 0) {
            throw CustomException('Array of incentives is required', 400);
        }

        if (incentives.length > 100) {
            throw CustomException('Maximum 100 incentives per bulk operation', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < incentives.length; i++) {
            try {
                const allowedFields = pickAllowedFields(incentives[i], ALLOWED_CREATE_FIELDS);

                const sanitizedEmployeeId = sanitizeObjectId(allowedFields.employeeId);
                if (!sanitizedEmployeeId) {
                    throw new Error('Invalid employeeId');
                }

                const incentive = await EmployeeIncentive.create(req.addFirmId({
                    ...allowedFields,
                    employeeId: sanitizedEmployeeId,
                    createdBy: req.userID
                }));

                results.push({ index: i, success: true, data: incentive });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} incentives, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/employee-incentives/:id
 * Update an incentive
 */
router.patch('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid incentive ID format', 400);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        // Find and verify ownership first
        const existing = await EmployeeIncentive.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!existing) {
            throw CustomException('Incentive not found', 404);
        }

        // Prevent editing processed/approved incentives
        if (['approved', 'processed'].includes(existing.status)) {
            throw CustomException('Cannot edit approved or processed incentives', 400);
        }

        // IDOR Protection: Query-level ownership check
        const incentive = await EmployeeIncentive.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    ...allowedFields,
                    updatedBy: req.userID,
                    updatedAt: new Date()
                }
            },
            { new: true }
        ).populate('employeeId', 'employeeId firstName lastName');

        return res.json({
            success: true,
            message: 'Incentive updated successfully',
            data: incentive
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/employee-incentives/:id
 * Delete an incentive
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid incentive ID format', 400);
        }

        // Check if can be deleted
        const existing = await EmployeeIncentive.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!existing) {
            throw CustomException('Incentive not found', 404);
        }

        // Prevent deleting processed incentives
        if (existing.status === 'processed') {
            throw CustomException('Cannot delete processed incentives', 400);
        }

        // IDOR Protection: Query-level ownership check
        await EmployeeIncentive.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        return res.json({
            success: true,
            message: 'Incentive deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-incentives/bulk-delete
 * Bulk delete incentives
 */
router.post('/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw CustomException('Array of IDs is required', 400);
        }

        if (ids.length > 100) {
            throw CustomException('Maximum 100 items per bulk delete', 400);
        }

        // Sanitize all IDs
        const sanitizedIds = ids.map(id => sanitizeObjectId(id)).filter(Boolean);

        if (sanitizedIds.length === 0) {
            throw CustomException('No valid IDs provided', 400);
        }

        // Delete only non-processed incentives belonging to this firm
        const result = await EmployeeIncentive.deleteMany({
            _id: { $in: sanitizedIds },
            ...req.firmQuery,
            status: { $ne: 'processed' }
        });

        return res.json({
            success: true,
            message: `Deleted ${result.deletedCount} incentives`,
            data: { deletedCount: result.deletedCount }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-incentives/:id/submit
 * Submit incentive for approval
 */
router.post('/:id/submit', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid incentive ID format', 400);
        }

        const incentive = await EmployeeIncentive.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!incentive) {
            throw CustomException('Incentive not found', 404);
        }

        if (incentive.status !== 'draft') {
            throw CustomException('Only draft incentives can be submitted', 400);
        }

        // Setup approval flow (simplified - can be enhanced with multi-level approval)
        incentive.status = 'pending_approval';
        incentive.approvalFlow = [{
            level: 1,
            status: 'pending',
            date: new Date()
        }];
        incentive.updatedBy = req.userID;

        await incentive.save();

        return res.json({
            success: true,
            message: 'Incentive submitted for approval',
            data: incentive
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-incentives/:id/approve
 * Approve an incentive
 */
router.post('/:id/approve', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid incentive ID format', 400);
        }

        const incentive = await EmployeeIncentive.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!incentive) {
            throw CustomException('Incentive not found', 404);
        }

        if (incentive.status !== 'pending_approval') {
            throw CustomException('Only pending incentives can be approved', 400);
        }

        const { comments } = req.body;
        await incentive.approve(req.userID, comments || '');

        return res.json({
            success: true,
            message: 'Incentive approved',
            data: incentive
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-incentives/bulk-approve
 * Bulk approve incentives
 */
router.post('/bulk-approve', async (req, res) => {
    try {
        const { ids, comments } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw CustomException('Array of IDs is required', 400);
        }

        if (ids.length > 50) {
            throw CustomException('Maximum 50 items per bulk approval', 400);
        }

        const results = [];
        const errors = [];

        for (const id of ids) {
            try {
                const sanitizedId = sanitizeObjectId(id);
                if (!sanitizedId) throw new Error('Invalid ID');

                const incentive = await EmployeeIncentive.findOne({
                    _id: sanitizedId,
                    ...req.firmQuery,
                    status: 'pending_approval'
                });

                if (!incentive) {
                    throw new Error('Not found or not pending');
                }

                await incentive.approve(req.userID, comments || '');
                results.push({ id, success: true });
            } catch (error) {
                errors.push({ id, success: false, error: error.message });
            }
        }

        return res.json({
            success: true,
            message: `Approved ${results.length} incentives, ${errors.length} failed`,
            data: { approved: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-incentives/:id/reject
 * Reject an incentive
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid incentive ID format', 400);
        }

        const incentive = await EmployeeIncentive.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!incentive) {
            throw CustomException('Incentive not found', 404);
        }

        if (incentive.status !== 'pending_approval') {
            throw CustomException('Only pending incentives can be rejected', 400);
        }

        const { reason } = req.body;
        if (!reason || typeof reason !== 'string') {
            throw CustomException('Rejection reason is required', 400);
        }

        await incentive.reject(req.userID, reason);

        return res.json({
            success: true,
            message: 'Incentive rejected',
            data: incentive
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-incentives/:id/process
 * Mark incentive as processed (for payroll integration)
 */
router.post('/:id/process', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid incentive ID format', 400);
        }

        const incentive = await EmployeeIncentive.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!incentive) {
            throw CustomException('Incentive not found', 404);
        }

        if (incentive.status !== 'approved') {
            throw CustomException('Only approved incentives can be processed', 400);
        }

        const { payrollRunId } = req.body;
        const sanitizedPayrollRunId = payrollRunId ? sanitizeObjectId(payrollRunId) : null;

        await incentive.markAsProcessed(sanitizedPayrollRunId, req.userID);

        return res.json({
            success: true,
            message: 'Incentive marked as processed',
            data: incentive
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
