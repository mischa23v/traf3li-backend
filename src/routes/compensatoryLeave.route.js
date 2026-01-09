/**
 * Compensatory Leave Routes
 *
 * Routes for compensatory leave requests at /api/compensatory-leave-requests
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
    'employeeId', 'workDate', 'workType', 'hoursWorked', 'reason',
    'compensatoryDays', 'expiryDate', 'status', 'notes', 'documents'
];

const VALID_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'used', 'expired', 'cancelled'];
const VALID_WORK_TYPES = ['holiday', 'weekend', 'overtime', 'emergency'];

/**
 * GET /api/compensatory-leave-requests
 * List all compensatory leave requests
 */
router.get('/', async (req, res) => {
    try {
        const { employeeId, status, workType } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeaveRequests');

        let requests = firm?.settings?.compensatoryLeaveRequests || [];

        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId);
            if (sanitizedEmployeeId) {
                requests = requests.filter(r =>
                    r.employeeId?.toString() === sanitizedEmployeeId
                );
            }
        }

        if (status && VALID_STATUSES.includes(status)) {
            requests = requests.filter(r => r.status === status);
        }

        if (workType && VALID_WORK_TYPES.includes(workType)) {
            requests = requests.filter(r => r.workType === workType);
        }

        const total = requests.length;
        const paginatedRequests = requests.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedRequests.length,
            data: paginatedRequests,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/compensatory-leave-requests/pending-approvals
 * Get pending approvals
 */
router.get('/pending-approvals', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeaveRequests');

        const pending = (firm?.settings?.compensatoryLeaveRequests || [])
            .filter(r => r.status === 'pending')
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
 * GET /api/compensatory-leave-requests/stats
 * Get compensatory leave statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeaveRequests');

        const requests = (firm?.settings?.compensatoryLeaveRequests || [])
            .filter(r => new Date(r.createdAt).getFullYear() === targetYear);

        const stats = {
            total: requests.length,
            pending: requests.filter(r => r.status === 'pending').length,
            approved: requests.filter(r => r.status === 'approved').length,
            used: requests.filter(r => r.status === 'used').length,
            expired: requests.filter(r => r.status === 'expired').length,
            totalDaysEarned: requests
                .filter(r => r.status === 'approved' || r.status === 'used')
                .reduce((sum, r) => sum + (r.compensatoryDays || 0), 0)
        };

        return res.json({ success: true, data: stats });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/compensatory-leave-requests/policy
 * Get compensatory leave policy
 */
router.get('/policy', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeavePolicy');

        return res.json({
            success: true,
            data: firm?.settings?.compensatoryLeavePolicy || {
                enabled: true,
                maxDaysPerYear: 30,
                expiryDays: 90,
                minHoursForDay: 8,
                workTypes: ['holiday', 'weekend'],
                requiresApproval: true
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/compensatory-leave-requests/balance/:employeeId
 * Get compensatory leave balance for employee
 */
router.get('/balance/:employeeId', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeaveRequests');

        const requests = (firm?.settings?.compensatoryLeaveRequests || [])
            .filter(r =>
                r.employeeId?.toString() === sanitizedEmployeeId &&
                r.status === 'approved'
            );

        const balance = {
            totalEarned: requests.reduce((sum, r) => sum + (r.compensatoryDays || 0), 0),
            totalUsed: requests.reduce((sum, r) => sum + (r.usedDays || 0), 0),
            expiringWithin30Days: requests.filter(r => {
                const expiry = new Date(r.expiryDate);
                const in30Days = new Date();
                in30Days.setDate(in30Days.getDate() + 30);
                return expiry <= in30Days && expiry > new Date();
            }).length
        };

        balance.available = balance.totalEarned - balance.totalUsed;

        return res.json({ success: true, data: balance });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/compensatory-leave-requests/holiday-work-records
 * Get holiday work records
 */
router.get('/holiday-work-records', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeaveRequests');

        let records = (firm?.settings?.compensatoryLeaveRequests || [])
            .filter(r => r.workType === 'holiday');

        if (startDate) {
            records = records.filter(r => new Date(r.workDate) >= new Date(startDate));
        }

        if (endDate) {
            records = records.filter(r => new Date(r.workDate) <= new Date(endDate));
        }

        return res.json({
            success: true,
            count: records.length,
            data: records
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/compensatory-leave-requests/expiring
 * Get expiring compensatory leave
 */
router.get('/expiring', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(days));

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeaveRequests');

        const expiring = (firm?.settings?.compensatoryLeaveRequests || [])
            .filter(r =>
                r.status === 'approved' &&
                r.expiryDate &&
                new Date(r.expiryDate) <= expiryDate &&
                new Date(r.expiryDate) > new Date()
            )
            .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

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
 * GET /api/compensatory-leave-requests/export
 * Export compensatory leave requests
 */
router.get('/export', async (req, res) => {
    try {
        const { format = 'json', startDate, endDate, status } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeaveRequests');

        let requests = firm?.settings?.compensatoryLeaveRequests || [];

        if (startDate) {
            requests = requests.filter(r => new Date(r.createdAt) >= new Date(startDate));
        }

        if (endDate) {
            requests = requests.filter(r => new Date(r.createdAt) <= new Date(endDate));
        }

        if (status && VALID_STATUSES.includes(status)) {
            requests = requests.filter(r => r.status === status);
        }

        if (format === 'csv') {
            const csv = requests.map(r =>
                `${r.employeeId},${r.workDate},${r.workType},${r.compensatoryDays},${r.status}`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=compensatory-leave.csv');
            return res.send('employeeId,workDate,workType,days,status\n' + csv);
        }

        return res.json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/compensatory-leave-requests/:id
 * Get single request
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid request ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeaveRequests');

        const request = (firm?.settings?.compensatoryLeaveRequests || [])
            .find(r => r._id.toString() === sanitizedId);

        if (!request) {
            throw CustomException('Compensatory leave request not found', 404);
        }

        return res.json({ success: true, data: request });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests
 * Create compensatory leave request
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_FIELDS);

        if (!allowedFields.employeeId) {
            throw CustomException('Employee ID is required', 400);
        }

        if (!allowedFields.workDate) {
            throw CustomException('Work date is required', 400);
        }

        if (!allowedFields.workType || !VALID_WORK_TYPES.includes(allowedFields.workType)) {
            throw CustomException(`Work type must be one of: ${VALID_WORK_TYPES.join(', ')}`, 400);
        }

        allowedFields.employeeId = sanitizeObjectId(allowedFields.employeeId);

        const requestId = new mongoose.Types.ObjectId();
        const requestData = {
            _id: requestId,
            ...allowedFields,
            status: 'draft',
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.compensatoryLeaveRequests': requestData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Compensatory leave request created',
            data: requestData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests/calculate-days
 * Calculate compensatory days for hours worked
 */
router.post('/calculate-days', async (req, res) => {
    try {
        const { hoursWorked, workType } = req.body;

        if (!hoursWorked || hoursWorked <= 0) {
            throw CustomException('Hours worked must be greater than 0', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeavePolicy');

        const policy = firm?.settings?.compensatoryLeavePolicy || {};
        const minHoursForDay = policy.minHoursForDay || 8;

        // Calculate days based on hours worked
        const fullDays = Math.floor(hoursWorked / minHoursForDay);
        const remainingHours = hoursWorked % minHoursForDay;
        const halfDay = remainingHours >= (minHoursForDay / 2) ? 0.5 : 0;

        return res.json({
            success: true,
            data: {
                hoursWorked,
                compensatoryDays: fullDays + halfDay,
                calculation: {
                    fullDays,
                    halfDay,
                    minHoursForDay
                }
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests/expire-unused
 * Expire unused compensatory leave
 */
router.post('/expire-unused', async (req, res) => {
    try {
        const now = new Date();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.compensatoryLeaveRequests');

        const expired = (firm?.settings?.compensatoryLeaveRequests || [])
            .filter(r =>
                r.status === 'approved' &&
                r.expiryDate &&
                new Date(r.expiryDate) < now
            );

        for (const request of expired) {
            await Firm.findOneAndUpdate(
                {
                    _id: req.firmId,
                    'settings.compensatoryLeaveRequests._id': request._id
                },
                {
                    $set: {
                        'settings.compensatoryLeaveRequests.$.status': 'expired',
                        'settings.compensatoryLeaveRequests.$.expiredAt': now
                    }
                }
            );
        }

        return res.json({
            success: true,
            message: `Expired ${expired.length} compensatory leave requests`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/compensatory-leave-requests/:id
 * Update compensatory leave request
 */
router.patch('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid request ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_FIELDS);

        if (allowedFields.workType && !VALID_WORK_TYPES.includes(allowedFields.workType)) {
            throw CustomException(`Work type must be one of: ${VALID_WORK_TYPES.join(', ')}`, 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.compensatoryLeaveRequests._id': sanitizedId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`settings.compensatoryLeaveRequests.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'settings.compensatoryLeaveRequests.$.updatedAt': new Date(),
                    'settings.compensatoryLeaveRequests.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Compensatory leave request not found', 404);
        }

        return res.json({
            success: true,
            message: 'Compensatory leave request updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/compensatory-leave-requests/:id
 * Delete compensatory leave request
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid request ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'settings.compensatoryLeaveRequests': { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Compensatory leave request deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests/:id/submit
 * Submit request for approval
 */
router.post('/:id/submit', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid request ID format', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.compensatoryLeaveRequests._id': sanitizedId
            },
            {
                $set: {
                    'settings.compensatoryLeaveRequests.$.status': 'pending',
                    'settings.compensatoryLeaveRequests.$.submittedAt': new Date()
                }
            }
        );

        return res.json({
            success: true,
            message: 'Request submitted for approval'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests/:id/approve
 * Approve request
 */
router.post('/:id/approve', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid request ID format', 400);
        }

        const { notes, expiryDate } = req.body;

        // Default expiry 90 days from now
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 90);

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.compensatoryLeaveRequests._id': sanitizedId
            },
            {
                $set: {
                    'settings.compensatoryLeaveRequests.$.status': 'approved',
                    'settings.compensatoryLeaveRequests.$.approvedAt': new Date(),
                    'settings.compensatoryLeaveRequests.$.approvedBy': req.userID,
                    'settings.compensatoryLeaveRequests.$.approvalNotes': notes,
                    'settings.compensatoryLeaveRequests.$.expiryDate': expiryDate || defaultExpiry
                }
            }
        );

        return res.json({
            success: true,
            message: 'Compensatory leave request approved'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests/:id/reject
 * Reject request
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid request ID format', 400);
        }

        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.compensatoryLeaveRequests._id': sanitizedId
            },
            {
                $set: {
                    'settings.compensatoryLeaveRequests.$.status': 'rejected',
                    'settings.compensatoryLeaveRequests.$.rejectedAt': new Date(),
                    'settings.compensatoryLeaveRequests.$.rejectedBy': req.userID,
                    'settings.compensatoryLeaveRequests.$.rejectionReason': reason
                }
            }
        );

        return res.json({
            success: true,
            message: 'Compensatory leave request rejected'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests/:id/cancel
 * Cancel request
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid request ID format', 400);
        }

        const { reason } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.compensatoryLeaveRequests._id': sanitizedId
            },
            {
                $set: {
                    'settings.compensatoryLeaveRequests.$.status': 'cancelled',
                    'settings.compensatoryLeaveRequests.$.cancelledAt': new Date(),
                    'settings.compensatoryLeaveRequests.$.cancelledBy': req.userID,
                    'settings.compensatoryLeaveRequests.$.cancelReason': reason
                }
            }
        );

        return res.json({
            success: true,
            message: 'Compensatory leave request cancelled'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests/:requestId/documents
 * Upload documents for request
 */
router.post('/:requestId/documents', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.requestId);
        if (!sanitizedId) {
            throw CustomException('Invalid request ID format', 400);
        }

        const { documents } = req.body;

        if (!Array.isArray(documents)) {
            throw CustomException('Documents array is required', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.compensatoryLeaveRequests._id': sanitizedId
            },
            {
                $push: {
                    'settings.compensatoryLeaveRequests.$.documents': {
                        $each: documents.map(doc => ({
                            ...doc,
                            uploadedAt: new Date(),
                            uploadedBy: req.userID
                        }))
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Documents uploaded successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests/bulk-approve
 * Bulk approve requests
 */
router.post('/bulk-approve', async (req, res) => {
    try {
        const { ids, notes } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw CustomException('Array of request IDs is required', 400);
        }

        if (ids.length > 50) {
            throw CustomException('Maximum 50 requests per bulk approve', 400);
        }

        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 90);

        let approved = 0;

        for (const id of ids) {
            const sanitizedId = sanitizeObjectId(id);
            if (sanitizedId) {
                await Firm.findOneAndUpdate(
                    {
                        _id: req.firmId,
                        'settings.compensatoryLeaveRequests._id': sanitizedId,
                        'settings.compensatoryLeaveRequests.status': 'pending'
                    },
                    {
                        $set: {
                            'settings.compensatoryLeaveRequests.$.status': 'approved',
                            'settings.compensatoryLeaveRequests.$.approvedAt': new Date(),
                            'settings.compensatoryLeaveRequests.$.approvedBy': req.userID,
                            'settings.compensatoryLeaveRequests.$.approvalNotes': notes,
                            'settings.compensatoryLeaveRequests.$.expiryDate': defaultExpiry
                        }
                    }
                );
                approved++;
            }
        }

        return res.json({
            success: true,
            message: `${approved} requests approved`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/compensatory-leave-requests/bulk-reject
 * Bulk reject requests
 */
router.post('/bulk-reject', async (req, res) => {
    try {
        const { ids, reason } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            throw CustomException('Array of request IDs is required', 400);
        }

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        if (ids.length > 50) {
            throw CustomException('Maximum 50 requests per bulk reject', 400);
        }

        let rejected = 0;

        for (const id of ids) {
            const sanitizedId = sanitizeObjectId(id);
            if (sanitizedId) {
                await Firm.findOneAndUpdate(
                    {
                        _id: req.firmId,
                        'settings.compensatoryLeaveRequests._id': sanitizedId,
                        'settings.compensatoryLeaveRequests.status': 'pending'
                    },
                    {
                        $set: {
                            'settings.compensatoryLeaveRequests.$.status': 'rejected',
                            'settings.compensatoryLeaveRequests.$.rejectedAt': new Date(),
                            'settings.compensatoryLeaveRequests.$.rejectedBy': req.userID,
                            'settings.compensatoryLeaveRequests.$.rejectionReason': reason
                        }
                    }
                );
                rejected++;
            }
        }

        return res.json({
            success: true,
            message: `${rejected} requests rejected`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
