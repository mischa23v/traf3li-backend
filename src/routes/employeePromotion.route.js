/**
 * Employee Promotion Routes
 *
 * Routes for managing employee promotions at /api/hr/employee-promotions
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
const EmployeePromotion = require('../models/employeePromotion.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for mass assignment protection
const ALLOWED_CREATE_FIELDS = [
    'employeeId',
    'fromDesignation',
    'fromDepartment',
    'fromGrade',
    'fromSalary',
    'toDesignation',
    'toDepartment',
    'toGrade',
    'toSalary',
    'incrementType',
    'allowanceChanges',
    'promotionDate',
    'effectiveDate',
    'promotionType',
    'promotionReason',
    'performanceRating',
    'achievements',
    'notes',
    'attachments'
];

const ALLOWED_UPDATE_FIELDS = [
    'toDesignation',
    'toDepartment',
    'toGrade',
    'toSalary',
    'incrementType',
    'allowanceChanges',
    'promotionDate',
    'effectiveDate',
    'promotionType',
    'promotionReason',
    'performanceRating',
    'achievements',
    'notes',
    'hrComments',
    'attachments'
];

// Valid status values
const VALID_STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'applied', 'cancelled'];
const VALID_PROMOTION_TYPES = ['regular', 'merit', 'position_change', 'acting', 'interim'];

/**
 * GET /api/hr/employee-promotions
 * List all promotions with filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const { employeeId, status, promotionType, year, search } = req.query;
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

        // Filter by promotion type (validate against allowlist)
        if (promotionType && VALID_PROMOTION_TYPES.includes(promotionType)) {
            query.promotionType = promotionType;
        }

        // Filter by year
        if (year) {
            const yearNum = parseInt(year, 10);
            if (!isNaN(yearNum) && yearNum >= 2000 && yearNum <= 2100) {
                query.promotionDate = {
                    $gte: new Date(yearNum, 0, 1),
                    $lte: new Date(yearNum, 11, 31, 23, 59, 59)
                };
            }
        }

        // Search by reason (escape regex)
        if (search && search.trim()) {
            query.promotionReason = { $regex: escapeRegex(search.trim()), $options: 'i' };
        }

        const [promotions, total] = await Promise.all([
            EmployeePromotion.find(query)
                .populate('employeeId', 'employeeId firstName lastName')
                .populate('fromDesignation', 'name nameAr')
                .populate('toDesignation', 'name nameAr')
                .populate('fromDepartment', 'name')
                .populate('toDepartment', 'name')
                .populate('approvedBy', 'name email')
                .skip(skip)
                .limit(limit)
                .sort({ promotionDate: -1 }),
            EmployeePromotion.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: promotions.length,
            data: promotions,
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
 * GET /api/hr/employee-promotions/pending
 * Get promotions pending approval
 */
router.get('/pending', async (req, res) => {
    try {
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const promotions = await EmployeePromotion.getPendingApprovals(firmId, req.userID);

        return res.json({
            success: true,
            count: promotions.length,
            data: promotions
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-promotions/awaiting-application
 * Get approved promotions awaiting application to employee records
 */
router.get('/awaiting-application', async (req, res) => {
    try {
        const promotions = await EmployeePromotion.find({
            ...req.firmQuery,
            status: 'approved',
            isApplied: false
        })
            .populate('employeeId', 'employeeId firstName lastName')
            .populate('toDesignation', 'name nameAr')
            .populate('toDepartment', 'name')
            .sort({ effectiveDate: 1 });

        return res.json({
            success: true,
            count: promotions.length,
            data: promotions
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-promotions/stats
 * Get promotion statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const stats = await EmployeePromotion.getPromotionStats(firmId, year);

        return res.json({
            success: true,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-promotions/employee/:employeeId/history
 * Get promotion history for an employee
 */
router.get('/employee/:employeeId/history', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const promotions = await EmployeePromotion.getEmployeePromotions(firmId, sanitizedEmployeeId);

        return res.json({
            success: true,
            count: promotions.length,
            data: promotions
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-promotions/upcoming
 * Get upcoming promotions
 */
router.get('/upcoming', async (req, res) => {
    try {
        const daysAhead = parseInt(req.query.days) || 30;
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const promotions = await EmployeePromotion.getUpcomingPromotions(firmId, daysAhead);

        return res.json({
            success: true,
            count: promotions.length,
            data: promotions
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/employee-promotions/:id
 * Get a single promotion by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        // IDOR Protection: Query includes firmQuery
        const promotion = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
            .populate('employeeId', 'employeeId firstName lastName')
            .populate('fromDesignation', 'name nameAr')
            .populate('toDesignation', 'name nameAr')
            .populate('fromDepartment', 'name')
            .populate('toDepartment', 'name')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email')
            .populate('appliedBy', 'name email');

        if (!promotion) {
            throw CustomException('Promotion not found', 404);
        }

        return res.json({
            success: true,
            data: promotion
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-promotions
 * Create a new promotion
 */
router.post('/', async (req, res) => {
    try {
        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);

        // Validate required fields
        if (!allowedFields.employeeId) {
            throw CustomException('Employee is required', 400);
        }
        if (!allowedFields.fromDesignation || !allowedFields.toDesignation) {
            throw CustomException('From and to designations are required', 400);
        }
        if (typeof allowedFields.fromSalary !== 'number' || allowedFields.fromSalary < 0) {
            throw CustomException('Valid from salary is required', 400);
        }
        if (typeof allowedFields.toSalary !== 'number' || allowedFields.toSalary < 0) {
            throw CustomException('Valid to salary is required', 400);
        }
        if (!allowedFields.promotionDate) {
            throw CustomException('Promotion date is required', 400);
        }
        if (!allowedFields.effectiveDate) {
            throw CustomException('Effective date is required', 400);
        }
        if (!allowedFields.promotionReason || typeof allowedFields.promotionReason !== 'string') {
            throw CustomException('Promotion reason is required', 400);
        }

        // Sanitize IDs
        const sanitizedEmployeeId = sanitizeObjectId(allowedFields.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employeeId format', 400);
        }

        const sanitizedFromDesignation = sanitizeObjectId(allowedFields.fromDesignation);
        const sanitizedToDesignation = sanitizeObjectId(allowedFields.toDesignation);
        if (!sanitizedFromDesignation || !sanitizedToDesignation) {
            throw CustomException('Invalid designation ID format', 400);
        }

        // Optional department IDs
        let sanitizedFromDepartment = null;
        let sanitizedToDepartment = null;
        if (allowedFields.fromDepartment) {
            sanitizedFromDepartment = sanitizeObjectId(allowedFields.fromDepartment);
        }
        if (allowedFields.toDepartment) {
            sanitizedToDepartment = sanitizeObjectId(allowedFields.toDepartment);
        }

        // Create with tenant context using req.addFirmId
        const promotion = await EmployeePromotion.create(req.addFirmId({
            ...allowedFields,
            employeeId: sanitizedEmployeeId,
            fromDesignation: sanitizedFromDesignation,
            toDesignation: sanitizedToDesignation,
            fromDepartment: sanitizedFromDepartment,
            toDepartment: sanitizedToDepartment,
            createdBy: req.userID
        }));

        // Fetch with population for response
        const populated = await EmployeePromotion.findOne({
            _id: promotion._id,
            ...req.firmQuery
        })
            .populate('employeeId', 'employeeId firstName lastName')
            .populate('fromDesignation', 'name nameAr')
            .populate('toDesignation', 'name nameAr');

        return res.status(201).json({
            success: true,
            message: 'Promotion created successfully',
            data: populated
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/employee-promotions/:id
 * Update a promotion
 */
router.patch('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        // Find and verify ownership first
        const existing = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!existing) {
            throw CustomException('Promotion not found', 404);
        }

        // Prevent editing applied promotions
        if (existing.status === 'applied') {
            throw CustomException('Cannot edit applied promotions', 400);
        }

        // Sanitize any ID fields being updated
        if (allowedFields.toDesignation) {
            allowedFields.toDesignation = sanitizeObjectId(allowedFields.toDesignation);
        }
        if (allowedFields.toDepartment) {
            allowedFields.toDepartment = sanitizeObjectId(allowedFields.toDepartment);
        }

        // IDOR Protection: Query-level ownership check
        const promotion = await EmployeePromotion.findOneAndUpdate(
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
            .populate('toDesignation', 'name nameAr');

        return res.json({
            success: true,
            message: 'Promotion updated successfully',
            data: promotion
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/employee-promotions/:id
 * Delete a promotion
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        // Check if can be deleted
        const existing = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!existing) {
            throw CustomException('Promotion not found', 404);
        }

        // Prevent deleting applied promotions
        if (existing.status === 'applied') {
            throw CustomException('Cannot delete applied promotions', 400);
        }

        // IDOR Protection: Query-level ownership check
        await EmployeePromotion.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        return res.json({
            success: true,
            message: 'Promotion deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-promotions/bulk-delete
 * Bulk delete promotions
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

        // Delete only non-applied promotions belonging to this firm
        const result = await EmployeePromotion.deleteMany({
            _id: { $in: sanitizedIds },
            ...req.firmQuery,
            status: { $ne: 'applied' }
        });

        return res.json({
            success: true,
            message: `Deleted ${result.deletedCount} promotions`,
            data: { deletedCount: result.deletedCount }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-promotions/:id/submit
 * Submit promotion for approval
 */
router.post('/:id/submit', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        const promotion = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!promotion) {
            throw CustomException('Promotion not found', 404);
        }

        if (promotion.status !== 'draft') {
            throw CustomException('Only draft promotions can be submitted', 400);
        }

        // Setup approval flow
        promotion.status = 'pending_approval';
        promotion.approvalFlow = [{
            level: 1,
            status: 'pending',
            date: new Date()
        }];
        promotion.updatedBy = req.userID;

        await promotion.save();

        return res.json({
            success: true,
            message: 'Promotion submitted for approval',
            data: promotion
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-promotions/:id/approve
 * Approve a promotion
 */
router.post('/:id/approve', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        const promotion = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!promotion) {
            throw CustomException('Promotion not found', 404);
        }

        if (promotion.status !== 'pending_approval') {
            throw CustomException('Only pending promotions can be approved', 400);
        }

        const { comments } = req.body;
        await promotion.approve(req.userID, comments || '');

        return res.json({
            success: true,
            message: 'Promotion approved',
            data: promotion
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-promotions/:id/reject
 * Reject a promotion
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        const promotion = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!promotion) {
            throw CustomException('Promotion not found', 404);
        }

        if (promotion.status !== 'pending_approval') {
            throw CustomException('Only pending promotions can be rejected', 400);
        }

        const { reason } = req.body;
        if (!reason || typeof reason !== 'string') {
            throw CustomException('Rejection reason is required', 400);
        }

        await promotion.reject(req.userID, reason);

        return res.json({
            success: true,
            message: 'Promotion rejected',
            data: promotion
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-promotions/:id/cancel
 * Cancel a promotion
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        const promotion = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!promotion) {
            throw CustomException('Promotion not found', 404);
        }

        if (promotion.status === 'applied') {
            throw CustomException('Cannot cancel applied promotions', 400);
        }

        promotion.status = 'cancelled';
        promotion.updatedBy = req.userID;
        await promotion.save();

        return res.json({
            success: true,
            message: 'Promotion cancelled',
            data: promotion
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-promotions/:id/apply
 * Apply promotion to employee record
 */
router.post('/:id/apply', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        const promotion = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!promotion) {
            throw CustomException('Promotion not found', 404);
        }

        await promotion.applyPromotion(req.userID);

        return res.json({
            success: true,
            message: 'Promotion applied to employee record',
            data: promotion
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-promotions/:id/notify
 * Send notification about promotion
 */
router.post('/:id/notify', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        const promotion = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        }).populate('employeeId', 'firstName lastName email');

        if (!promotion) {
            throw CustomException('Promotion not found', 404);
        }

        // Note: In production, this would integrate with notification service
        // For now, we just return success
        return res.json({
            success: true,
            message: 'Notification sent',
            data: {
                promotionId: promotion._id,
                employee: promotion.employeeId,
                notifiedAt: new Date()
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/employee-promotions/:id/acknowledge
 * Employee acknowledges promotion
 */
router.post('/:id/acknowledge', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid promotion ID format', 400);
        }

        const promotion = await EmployeePromotion.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!promotion) {
            throw CustomException('Promotion not found', 404);
        }

        // Add acknowledgment field if not exists
        promotion.acknowledgedAt = new Date();
        promotion.acknowledgedBy = req.userID;
        promotion.updatedBy = req.userID;
        await promotion.save();

        return res.json({
            success: true,
            message: 'Promotion acknowledged',
            data: promotion
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
