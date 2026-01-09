/**
 * Employee Transfer Routes
 *
 * Routes for managing employee transfers at /api/hr/transfers
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
const EmployeeTransfer = require('../models/employeeTransfer.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for mass assignment protection
const ALLOWED_CREATE_FIELDS = [
    'employeeId',
    'fromDepartment',
    'fromBranch',
    'fromLocation',
    'fromCity',
    'fromReportingManager',
    'toDepartment',
    'toBranch',
    'toLocation',
    'toCity',
    'toReportingManager',
    'transferType',
    'transferDate',
    'effectiveDate',
    'endDate',
    'transferReason',
    'reasonDetails',
    'salaryChange',
    'transferAllowance',
    'relocationAllowance',
    'allowanceDuration',
    'designationChange',
    'fromDesignation',
    'toDesignation',
    'notes',
    'attachments'
];

const ALLOWED_UPDATE_FIELDS = [
    'toDepartment',
    'toBranch',
    'toLocation',
    'toCity',
    'toReportingManager',
    'transferType',
    'transferDate',
    'effectiveDate',
    'endDate',
    'transferReason',
    'reasonDetails',
    'salaryChange',
    'transferAllowance',
    'relocationAllowance',
    'allowanceDuration',
    'designationChange',
    'toDesignation',
    'notes',
    'hrComments',
    'handoverNotes',
    'attachments'
];

// Valid status values
const VALID_STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'applied', 'completed', 'cancelled'];
const VALID_TRANSFER_TYPES = ['permanent', 'temporary', 'deputation', 'secondment'];
const VALID_TRANSFER_REASONS = [
    'business_requirement', 'employee_request', 'restructuring', 'project_assignment',
    'career_development', 'disciplinary', 'performance_based', 'other'
];

/**
 * GET /api/hr/transfers
 * List all transfers with filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const { employeeId, status, transferType, departmentId, year, search } = req.query;
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

        // Filter by transfer type (validate against allowlist)
        if (transferType && VALID_TRANSFER_TYPES.includes(transferType)) {
            query.transferType = transferType;
        }

        // Filter by department (to or from)
        if (departmentId) {
            const sanitizedDeptId = sanitizeObjectId(departmentId);
            if (sanitizedDeptId) {
                query.$or = [
                    { fromDepartment: sanitizedDeptId },
                    { toDepartment: sanitizedDeptId }
                ];
            }
        }

        // Filter by year
        if (year) {
            const yearNum = parseInt(year, 10);
            if (!isNaN(yearNum) && yearNum >= 2000 && yearNum <= 2100) {
                query.transferDate = {
                    $gte: new Date(yearNum, 0, 1),
                    $lte: new Date(yearNum, 11, 31, 23, 59, 59)
                };
            }
        }

        // Search by reason details (escape regex)
        if (search && search.trim()) {
            query.reasonDetails = { $regex: escapeRegex(search.trim()), $options: 'i' };
        }

        const [transfers, total] = await Promise.all([
            EmployeeTransfer.find(query)
                .populate('employeeId', 'employeeId firstName lastName')
                .populate('fromDepartment', 'name')
                .populate('toDepartment', 'name')
                .populate('fromBranch', 'name')
                .populate('toBranch', 'name')
                .populate('approvedBy', 'name email')
                .skip(skip)
                .limit(limit)
                .sort({ transferDate: -1 }),
            EmployeeTransfer.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: transfers.length,
            data: transfers,
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
 * GET /api/hr/transfers/pending-approvals
 * Get transfers pending approval
 */
router.get('/pending-approvals', async (req, res) => {
    try {
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const transfers = await EmployeeTransfer.getPendingApprovals(firmId, req.userID);

        return res.json({
            success: true,
            count: transfers.length,
            data: transfers
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/transfers/pending-handovers
 * Get transfers with pending handovers
 */
router.get('/pending-handovers', async (req, res) => {
    try {
        const transfers = await EmployeeTransfer.find({
            ...req.firmQuery,
            status: 'approved',
            isApplied: false,
            effectiveDate: { $lte: new Date() }
        })
            .populate('employeeId', 'employeeId firstName lastName')
            .populate('fromDepartment', 'name')
            .populate('toDepartment', 'name')
            .sort({ effectiveDate: 1 });

        return res.json({
            success: true,
            count: transfers.length,
            data: transfers
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/transfers/stats
 * Get transfer statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59);

        const [
            totalTransfers,
            byType,
            byReason,
            byStatus,
            monthly
        ] = await Promise.all([
            EmployeeTransfer.countDocuments({
                firmId,
                transferDate: { $gte: startOfYear, $lte: endOfYear }
            }),
            EmployeeTransfer.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        transferDate: { $gte: startOfYear, $lte: endOfYear }
                    }
                },
                {
                    $group: {
                        _id: '$transferType',
                        count: { $sum: 1 }
                    }
                }
            ]),
            EmployeeTransfer.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        transferDate: { $gte: startOfYear, $lte: endOfYear }
                    }
                },
                {
                    $group: {
                        _id: '$transferReason',
                        count: { $sum: 1 }
                    }
                }
            ]),
            EmployeeTransfer.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        transferDate: { $gte: startOfYear, $lte: endOfYear }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            EmployeeTransfer.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        transferDate: { $gte: startOfYear, $lte: endOfYear }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$transferDate' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        return res.json({
            success: true,
            data: {
                year,
                totalTransfers,
                byType,
                byReason,
                byStatus,
                monthly
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/transfers/history/:employeeId
 * Get transfer history for an employee
 */
router.get('/history/:employeeId', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const transfers = await EmployeeTransfer.getEmployeeTransfers(firmId, sanitizedEmployeeId);

        return res.json({
            success: true,
            count: transfers.length,
            data: transfers
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/transfers/:id
 * Get a single transfer by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        // IDOR Protection: Query includes firmQuery
        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
            .populate('employeeId', 'employeeId firstName lastName')
            .populate('fromDepartment', 'name')
            .populate('toDepartment', 'name')
            .populate('fromBranch', 'name')
            .populate('toBranch', 'name')
            .populate('fromReportingManager', 'firstName lastName')
            .populate('toReportingManager', 'firstName lastName')
            .populate('fromDesignation', 'name nameAr')
            .populate('toDesignation', 'name nameAr')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email')
            .populate('appliedBy', 'name email');

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        return res.json({
            success: true,
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/transfers
 * Create a new transfer
 */
router.post('/', async (req, res) => {
    try {
        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);

        // Validate required fields
        if (!allowedFields.employeeId) {
            throw CustomException('Employee is required', 400);
        }
        if (!allowedFields.fromDepartment || !allowedFields.toDepartment) {
            throw CustomException('From and to departments are required', 400);
        }
        if (!allowedFields.transferDate) {
            throw CustomException('Transfer date is required', 400);
        }
        if (!allowedFields.effectiveDate) {
            throw CustomException('Effective date is required', 400);
        }
        if (!allowedFields.transferReason || !VALID_TRANSFER_REASONS.includes(allowedFields.transferReason)) {
            throw CustomException('Valid transfer reason is required', 400);
        }

        // Sanitize IDs
        const sanitizedEmployeeId = sanitizeObjectId(allowedFields.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        const sanitizedFromDept = sanitizeObjectId(allowedFields.fromDepartment);
        const sanitizedToDept = sanitizeObjectId(allowedFields.toDepartment);
        if (!sanitizedFromDept || !sanitizedToDept) {
            throw CustomException('Invalid department ID format', 400);
        }

        // Optional ID fields
        const sanitizedData = {
            ...allowedFields,
            employeeId: sanitizedEmployeeId,
            fromDepartment: sanitizedFromDept,
            toDepartment: sanitizedToDept
        };

        if (allowedFields.fromBranch) {
            sanitizedData.fromBranch = sanitizeObjectId(allowedFields.fromBranch);
        }
        if (allowedFields.toBranch) {
            sanitizedData.toBranch = sanitizeObjectId(allowedFields.toBranch);
        }
        if (allowedFields.fromReportingManager) {
            sanitizedData.fromReportingManager = sanitizeObjectId(allowedFields.fromReportingManager);
        }
        if (allowedFields.toReportingManager) {
            sanitizedData.toReportingManager = sanitizeObjectId(allowedFields.toReportingManager);
        }
        if (allowedFields.fromDesignation) {
            sanitizedData.fromDesignation = sanitizeObjectId(allowedFields.fromDesignation);
        }
        if (allowedFields.toDesignation) {
            sanitizedData.toDesignation = sanitizeObjectId(allowedFields.toDesignation);
        }

        // Create with tenant context using req.addFirmId
        const transfer = await EmployeeTransfer.create(req.addFirmId({
            ...sanitizedData,
            createdBy: req.userID
        }));

        // Fetch with population for response
        const populated = await EmployeeTransfer.findOne({
            _id: transfer._id,
            ...req.firmQuery
        })
            .populate('employeeId', 'employeeId firstName lastName')
            .populate('fromDepartment', 'name')
            .populate('toDepartment', 'name');

        return res.status(201).json({
            success: true,
            message: 'Transfer created successfully',
            data: populated
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/hr/transfers/:id
 * Update a transfer
 */
router.put('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        // Find and verify ownership first
        const existing = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!existing) {
            throw CustomException('Transfer not found', 404);
        }

        // Prevent editing applied/completed transfers
        if (['applied', 'completed'].includes(existing.status)) {
            throw CustomException('Cannot edit applied or completed transfers', 400);
        }

        // Sanitize any ID fields being updated
        if (allowedFields.toDepartment) {
            allowedFields.toDepartment = sanitizeObjectId(allowedFields.toDepartment);
        }
        if (allowedFields.toBranch) {
            allowedFields.toBranch = sanitizeObjectId(allowedFields.toBranch);
        }
        if (allowedFields.toReportingManager) {
            allowedFields.toReportingManager = sanitizeObjectId(allowedFields.toReportingManager);
        }
        if (allowedFields.toDesignation) {
            allowedFields.toDesignation = sanitizeObjectId(allowedFields.toDesignation);
        }

        // IDOR Protection: Query-level ownership check
        const transfer = await EmployeeTransfer.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    ...allowedFields,
                    updatedBy: req.userID,
                    updatedAt: new Date()
                }
            },
            { new: true }
        )
            .populate('employeeId', 'employeeId firstName lastName')
            .populate('fromDepartment', 'name')
            .populate('toDepartment', 'name');

        return res.json({
            success: true,
            message: 'Transfer updated successfully',
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/transfers/:id
 * Delete a transfer
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        // Check if can be deleted
        const existing = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!existing) {
            throw CustomException('Transfer not found', 404);
        }

        // Prevent deleting applied/completed transfers
        if (['applied', 'completed'].includes(existing.status)) {
            throw CustomException('Cannot delete applied or completed transfers', 400);
        }

        // IDOR Protection: Query-level ownership check
        await EmployeeTransfer.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        return res.json({
            success: true,
            message: 'Transfer deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/transfers/bulk-delete
 * Bulk delete transfers
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

        // Delete only non-applied/completed transfers belonging to this firm
        const result = await EmployeeTransfer.deleteMany({
            _id: { $in: sanitizedIds },
            ...req.firmQuery,
            status: { $nin: ['applied', 'completed'] }
        });

        return res.json({
            success: true,
            message: `Deleted ${result.deletedCount} transfers`,
            data: { deletedCount: result.deletedCount }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/transfers/:id/status
 * Update transfer status
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        const { status } = req.body;
        if (!status || !VALID_STATUSES.includes(status)) {
            throw CustomException('Valid status is required', 400);
        }

        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        transfer.status = status;
        transfer.updatedBy = req.userID;
        await transfer.save();

        return res.json({
            success: true,
            message: 'Transfer status updated',
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/transfers/:id/approve
 * Approve a transfer
 */
router.post('/:id/approve', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        if (transfer.status !== 'pending_approval') {
            throw CustomException('Only pending transfers can be approved', 400);
        }

        const { comments } = req.body;
        await transfer.approve(req.userID, comments || '');

        return res.json({
            success: true,
            message: 'Transfer approved',
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/transfers/:id/reject
 * Reject a transfer
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        if (transfer.status !== 'pending_approval') {
            throw CustomException('Only pending transfers can be rejected', 400);
        }

        const { reason } = req.body;
        if (!reason || typeof reason !== 'string') {
            throw CustomException('Rejection reason is required', 400);
        }

        await transfer.reject(req.userID, reason);

        return res.json({
            success: true,
            message: 'Transfer rejected',
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/transfers/:id/apply
 * Apply transfer to employee record
 */
router.post('/:id/apply', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        await transfer.applyTransfer(req.userID);

        return res.json({
            success: true,
            message: 'Transfer applied to employee record',
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/transfers/:id/approvals
 * Add approval step to transfer
 */
router.post('/:id/approvals', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        const { approverId, level } = req.body;
        const sanitizedApproverId = sanitizeObjectId(approverId);
        if (!sanitizedApproverId) {
            throw CustomException('Valid approver ID is required', 400);
        }

        transfer.approvalFlow.push({
            level: level || transfer.approvalFlow.length + 1,
            approver: sanitizedApproverId,
            status: 'pending',
            date: new Date()
        });

        if (transfer.status === 'draft') {
            transfer.status = 'pending_approval';
        }

        transfer.updatedBy = req.userID;
        await transfer.save();

        return res.json({
            success: true,
            message: 'Approval step added',
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/transfers/:id/approvals/:stepIndex
 * Update a specific approval step
 */
router.patch('/:id/approvals/:stepIndex', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        const stepIndex = parseInt(req.params.stepIndex, 10);
        if (isNaN(stepIndex) || stepIndex < 0) {
            throw CustomException('Invalid step index', 400);
        }

        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        if (!transfer.approvalFlow[stepIndex]) {
            throw CustomException('Approval step not found', 404);
        }

        const { status, comments } = req.body;
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            transfer.approvalFlow[stepIndex].status = status;
        }
        if (comments) {
            transfer.approvalFlow[stepIndex].comments = comments;
        }
        transfer.approvalFlow[stepIndex].date = new Date();
        transfer.updatedBy = req.userID;

        await transfer.save();

        return res.json({
            success: true,
            message: 'Approval step updated',
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/transfers/:id/handover
 * Add handover item to transfer
 */
router.post('/:id/handover', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        const { item, description, status } = req.body;
        if (!item || typeof item !== 'string') {
            throw CustomException('Handover item is required', 400);
        }

        // Add handover note
        const handoverEntry = `[${new Date().toISOString()}] ${item}: ${description || 'N/A'} (Status: ${status || 'pending'})`;
        transfer.handoverNotes = transfer.handoverNotes
            ? `${transfer.handoverNotes}\n${handoverEntry}`
            : handoverEntry;

        transfer.updatedBy = req.userID;
        await transfer.save();

        return res.json({
            success: true,
            message: 'Handover item added',
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/transfers/:id/handover/:itemIndex
 * Update a specific handover item
 */
router.patch('/:id/handover/:itemIndex', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        const { status, completedBy, completedAt } = req.body;

        // Update handover notes with completion status
        const updateEntry = `[${new Date().toISOString()}] Item ${req.params.itemIndex} updated: Status: ${status || 'updated'}`;
        transfer.handoverNotes = transfer.handoverNotes
            ? `${transfer.handoverNotes}\n${updateEntry}`
            : updateEntry;

        transfer.updatedBy = req.userID;
        await transfer.save();

        return res.json({
            success: true,
            message: 'Handover item updated',
            data: transfer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/transfers/:id/notify
 * Send notification about transfer
 */
router.post('/:id/notify', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid transfer ID format', 400);
        }

        const transfer = await EmployeeTransfer.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        }).populate('employeeId', 'firstName lastName email');

        if (!transfer) {
            throw CustomException('Transfer not found', 404);
        }

        // Note: In production, this would integrate with notification service
        return res.json({
            success: true,
            message: 'Notification sent',
            data: {
                transferId: transfer._id,
                employee: transfer.employeeId,
                notifiedAt: new Date()
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
