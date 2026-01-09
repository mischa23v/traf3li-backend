/**
 * Shift Requests Routes
 *
 * Manages employee shift change/swap requests for HR scheduling.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /                     - Create shift request
 * - GET /                      - List shift requests
 * - GET /:requestId            - Get request by ID
 * - PUT /:requestId            - Update request
 * - DELETE /:requestId         - Delete request
 * - POST /:requestId/approve   - Approve request
 * - POST /:requestId/reject    - Reject request
 * - POST /check-conflicts      - Check for scheduling conflicts
 * - GET /pending-approvals     - Get pending approvals for manager
 * - GET /stats                 - Get shift request statistics
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for shift request creation/update
const ALLOWED_REQUEST_FIELDS = [
    'employeeId', 'requestType', 'currentShiftId', 'requestedShiftId',
    'swapWithEmployeeId', 'requestedDate', 'reason', 'notes',
    'priority', 'startDate', 'endDate', 'daysOfWeek'
];

// Valid request types and statuses
const VALID_REQUEST_TYPES = ['swap', 'change', 'overtime', 'day-off', 'schedule_change'];
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'expired'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * POST / - Create new shift request
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_REQUEST_FIELDS);

        // Validate required fields
        if (!safeData.requestType) {
            throw CustomException('Request type is required', 400);
        }
        if (!VALID_REQUEST_TYPES.includes(safeData.requestType)) {
            throw CustomException(`Invalid request type. Must be one of: ${VALID_REQUEST_TYPES.join(', ')}`, 400);
        }
        if (!safeData.requestedDate && !safeData.startDate) {
            throw CustomException('Requested date or start date is required', 400);
        }

        // Sanitize ObjectIds
        safeData.employeeId = safeData.employeeId
            ? sanitizeObjectId(safeData.employeeId, 'employeeId')
            : new mongoose.Types.ObjectId(req.userID);

        if (safeData.currentShiftId) {
            safeData.currentShiftId = sanitizeObjectId(safeData.currentShiftId, 'currentShiftId');
        }
        if (safeData.requestedShiftId) {
            safeData.requestedShiftId = sanitizeObjectId(safeData.requestedShiftId, 'requestedShiftId');
        }
        if (safeData.swapWithEmployeeId) {
            safeData.swapWithEmployeeId = sanitizeObjectId(safeData.swapWithEmployeeId, 'swapWithEmployeeId');
        }

        // Validate swap request has swap employee
        if (safeData.requestType === 'swap' && !safeData.swapWithEmployeeId) {
            throw CustomException('Swap with employee ID is required for swap requests', 400);
        }

        // Validate dates
        if (safeData.requestedDate) {
            safeData.requestedDate = new Date(safeData.requestedDate);
            if (isNaN(safeData.requestedDate.getTime())) {
                throw CustomException('Invalid requested date format', 400);
            }
        }
        if (safeData.startDate) {
            safeData.startDate = new Date(safeData.startDate);
            if (isNaN(safeData.startDate.getTime())) {
                throw CustomException('Invalid start date format', 400);
            }
        }
        if (safeData.endDate) {
            safeData.endDate = new Date(safeData.endDate);
            if (isNaN(safeData.endDate.getTime())) {
                throw CustomException('Invalid end date format', 400);
            }
        }

        // Validate priority
        if (safeData.priority && !VALID_PRIORITIES.includes(safeData.priority)) {
            throw CustomException(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.shiftRequests) firm.hr.shiftRequests = [];

        // Check for duplicate pending request
        const duplicateRequest = firm.hr.shiftRequests.find(r => {
            if (r.employeeId?.toString() !== safeData.employeeId.toString()) return false;
            if (r.status !== 'pending') return false;
            if (r.requestType !== safeData.requestType) return false;

            const existingDate = r.requestedDate || r.startDate;
            const newDate = safeData.requestedDate || safeData.startDate;
            if (!existingDate || !newDate) return false;

            return new Date(existingDate).toDateString() === new Date(newDate).toDateString();
        });

        if (duplicateRequest) {
            throw CustomException('A pending request for this date already exists', 400);
        }

        const request = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            status: 'pending',
            priority: safeData.priority || 'medium',
            requestedBy: req.userID,
            createdAt: new Date()
        };

        firm.hr.shiftRequests.push(request);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Shift request created successfully',
            data: request
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET / - List shift requests
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { employeeId, requestType, status, priority, dateFrom, dateTo, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftRequests').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let requests = firm.hr?.shiftRequests || [];

        // Apply filters
        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId, 'employeeId');
            requests = requests.filter(r => r.employeeId?.toString() === sanitizedEmployeeId.toString());
        }
        if (requestType) {
            if (!VALID_REQUEST_TYPES.includes(requestType)) {
                throw CustomException(`Invalid request type. Must be one of: ${VALID_REQUEST_TYPES.join(', ')}`, 400);
            }
            requests = requests.filter(r => r.requestType === requestType);
        }
        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
            }
            requests = requests.filter(r => r.status === status);
        }
        if (priority) {
            if (!VALID_PRIORITIES.includes(priority)) {
                throw CustomException(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`, 400);
            }
            requests = requests.filter(r => r.priority === priority);
        }
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            requests = requests.filter(r => {
                const date = r.requestedDate || r.startDate;
                return date && new Date(date) >= fromDate;
            });
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            requests = requests.filter(r => {
                const date = r.requestedDate || r.endDate || r.startDate;
                return date && new Date(date) <= toDate;
            });
        }
        if (search) {
            const searchPattern = escapeRegex(search).toLowerCase();
            requests = requests.filter(r =>
                r.reason?.toLowerCase().includes(searchPattern) ||
                r.notes?.toLowerCase().includes(searchPattern)
            );
        }

        // Sort by created date descending
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = requests.length;
        const paginatedRequests = requests.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedRequests,
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
 * POST /check-conflicts - Check for scheduling conflicts
 */
router.post('/check-conflicts', async (req, res, next) => {
    try {
        const { employeeId, shiftId, requestedDate, startDate, endDate } = req.body;

        if (!employeeId) {
            throw CustomException('Employee ID is required', 400);
        }
        if (!requestedDate && !startDate) {
            throw CustomException('Date is required', 400);
        }

        const sanitizedEmployeeId = sanitizeObjectId(employeeId, 'employeeId');
        const targetDate = new Date(requestedDate || startDate);
        const targetEndDate = endDate ? new Date(endDate) : targetDate;

        const firm = await Firm.findOne(req.firmQuery)
            .select('hr.shiftAssignments hr.shiftRequests')
            .lean();

        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const conflicts = [];

        // Check for existing assignments
        const existingAssignments = (firm.hr?.shiftAssignments || []).filter(a => {
            if (a.employeeId?.toString() !== sanitizedEmployeeId.toString()) return false;
            if (a.status !== 'active') return false;

            const assignStart = new Date(a.startDate);
            const assignEnd = a.endDate ? new Date(a.endDate) : new Date('2099-12-31');

            return targetDate <= assignEnd && targetEndDate >= assignStart;
        });

        if (existingAssignments.length > 0) {
            conflicts.push({
                type: 'existing_assignment',
                message: 'Employee already has a shift assignment for this period',
                details: existingAssignments.map(a => ({
                    shiftName: a.shiftName,
                    startDate: a.startDate,
                    endDate: a.endDate
                }))
            });
        }

        // Check for pending requests
        const pendingRequests = (firm.hr?.shiftRequests || []).filter(r => {
            if (r.employeeId?.toString() !== sanitizedEmployeeId.toString()) return false;
            if (r.status !== 'pending') return false;

            const reqDate = r.requestedDate || r.startDate;
            if (!reqDate) return false;

            return new Date(reqDate).toDateString() === targetDate.toDateString();
        });

        if (pendingRequests.length > 0) {
            conflicts.push({
                type: 'pending_request',
                message: 'Employee has pending requests for this date',
                details: pendingRequests.map(r => ({
                    requestType: r.requestType,
                    requestedDate: r.requestedDate || r.startDate
                }))
            });
        }

        res.json({
            success: true,
            data: {
                hasConflicts: conflicts.length > 0,
                conflicts
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /pending-approvals - Get pending approvals for manager
 */
router.get('/pending-approvals', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { department, priority, requestType } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftRequests').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let requests = (firm.hr?.shiftRequests || []).filter(r => r.status === 'pending');

        // Apply filters
        if (priority) {
            requests = requests.filter(r => r.priority === priority);
        }
        if (requestType) {
            requests = requests.filter(r => r.requestType === requestType);
        }

        // Sort by priority (urgent first) then by created date
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        requests.sort((a, b) => {
            const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        const total = requests.length;
        const paginatedRequests = requests.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedRequests,
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
 * GET /stats - Get shift request statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { dateFrom, dateTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftRequests').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let requests = firm.hr?.shiftRequests || [];

        // Filter by date range if provided
        if (dateFrom || dateTo) {
            const fromDate = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const toDate = dateTo ? new Date(dateTo) : new Date();
            requests = requests.filter(r => {
                const created = new Date(r.createdAt);
                return created >= fromDate && created <= toDate;
            });
        }

        // Calculate statistics
        const statusCounts = {};
        const typeCounts = {};
        const priorityCounts = {};
        let totalProcessingTime = 0;
        let processedCount = 0;

        for (const request of requests) {
            // By status
            statusCounts[request.status] = (statusCounts[request.status] || 0) + 1;

            // By type
            typeCounts[request.requestType] = (typeCounts[request.requestType] || 0) + 1;

            // By priority
            if (request.priority) {
                priorityCounts[request.priority] = (priorityCounts[request.priority] || 0) + 1;
            }

            // Processing time (for approved/rejected)
            if (request.processedAt && request.createdAt) {
                totalProcessingTime += new Date(request.processedAt) - new Date(request.createdAt);
                processedCount++;
            }
        }

        const avgProcessingTimeMs = processedCount > 0 ? totalProcessingTime / processedCount : 0;

        res.json({
            success: true,
            data: {
                total: requests.length,
                pending: statusCounts.pending || 0,
                approved: statusCounts.approved || 0,
                rejected: statusCounts.rejected || 0,
                cancelled: statusCounts.cancelled || 0,
                byStatus: statusCounts,
                byType: typeCounts,
                byPriority: priorityCounts,
                averageProcessingTimeHours: Math.round(avgProcessingTimeMs / (1000 * 60 * 60) * 10) / 10,
                approvalRate: requests.length > 0
                    ? Math.round(((statusCounts.approved || 0) / (requests.length - (statusCounts.pending || 0) - (statusCounts.cancelled || 0))) * 100) || 0
                    : 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:requestId - Get shift request by ID
 */
router.get('/:requestId', async (req, res, next) => {
    try {
        const requestId = sanitizeObjectId(req.params.requestId, 'requestId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftRequests').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const request = (firm.hr?.shiftRequests || []).find(
            r => r._id?.toString() === requestId.toString()
        );

        if (!request) {
            throw CustomException('Shift request not found', 404);
        }

        res.json({
            success: true,
            data: request
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:requestId - Update shift request
 */
router.put('/:requestId', async (req, res, next) => {
    try {
        const requestId = sanitizeObjectId(req.params.requestId, 'requestId');
        const safeData = pickAllowedFields(req.body, ALLOWED_REQUEST_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const requestIndex = (firm.hr?.shiftRequests || []).findIndex(
            r => r._id?.toString() === requestId.toString()
        );

        if (requestIndex === -1) {
            throw CustomException('Shift request not found', 404);
        }

        const existingRequest = firm.hr.shiftRequests[requestIndex];

        // Only allow updates to pending requests
        if (existingRequest.status !== 'pending') {
            throw CustomException('Can only update pending requests', 400);
        }

        // Sanitize ObjectIds if provided
        if (safeData.currentShiftId) {
            safeData.currentShiftId = sanitizeObjectId(safeData.currentShiftId, 'currentShiftId');
        }
        if (safeData.requestedShiftId) {
            safeData.requestedShiftId = sanitizeObjectId(safeData.requestedShiftId, 'requestedShiftId');
        }
        if (safeData.swapWithEmployeeId) {
            safeData.swapWithEmployeeId = sanitizeObjectId(safeData.swapWithEmployeeId, 'swapWithEmployeeId');
        }

        // Validate dates if provided
        if (safeData.requestedDate) {
            safeData.requestedDate = new Date(safeData.requestedDate);
        }
        if (safeData.startDate) {
            safeData.startDate = new Date(safeData.startDate);
        }
        if (safeData.endDate) {
            safeData.endDate = new Date(safeData.endDate);
        }

        Object.assign(firm.hr.shiftRequests[requestIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Shift request updated successfully',
            data: firm.hr.shiftRequests[requestIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:requestId - Delete/cancel shift request
 */
router.delete('/:requestId', async (req, res, next) => {
    try {
        const requestId = sanitizeObjectId(req.params.requestId, 'requestId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const requestIndex = (firm.hr?.shiftRequests || []).findIndex(
            r => r._id?.toString() === requestId.toString()
        );

        if (requestIndex === -1) {
            throw CustomException('Shift request not found', 404);
        }

        const existingRequest = firm.hr.shiftRequests[requestIndex];

        // Only allow deletion of pending or cancelled requests
        if (!['pending', 'cancelled'].includes(existingRequest.status)) {
            throw CustomException('Can only delete pending or cancelled requests', 400);
        }

        firm.hr.shiftRequests.splice(requestIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Shift request deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:requestId/approve - Approve shift request
 */
router.post('/:requestId/approve', async (req, res, next) => {
    try {
        const requestId = sanitizeObjectId(req.params.requestId, 'requestId');
        const { notes, effectiveDate } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const requestIndex = (firm.hr?.shiftRequests || []).findIndex(
            r => r._id?.toString() === requestId.toString()
        );

        if (requestIndex === -1) {
            throw CustomException('Shift request not found', 404);
        }

        const existingRequest = firm.hr.shiftRequests[requestIndex];

        if (existingRequest.status !== 'pending') {
            throw CustomException('Can only approve pending requests', 400);
        }

        // Update request status
        firm.hr.shiftRequests[requestIndex].status = 'approved';
        firm.hr.shiftRequests[requestIndex].approvedBy = req.userID;
        firm.hr.shiftRequests[requestIndex].processedAt = new Date();
        if (notes) {
            firm.hr.shiftRequests[requestIndex].approvalNotes = notes;
        }
        if (effectiveDate) {
            firm.hr.shiftRequests[requestIndex].effectiveDate = new Date(effectiveDate);
        }

        // For swap requests, create the swap assignment
        if (existingRequest.requestType === 'swap' && existingRequest.swapWithEmployeeId) {
            // TODO: Implement swap logic - update both employees' assignments
        }

        // For schedule change requests, update the assignment
        if (existingRequest.requestType === 'change' || existingRequest.requestType === 'schedule_change') {
            // TODO: Implement schedule change logic
        }

        await firm.save();

        res.json({
            success: true,
            message: 'Shift request approved',
            data: firm.hr.shiftRequests[requestIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:requestId/reject - Reject shift request
 */
router.post('/:requestId/reject', async (req, res, next) => {
    try {
        const requestId = sanitizeObjectId(req.params.requestId, 'requestId');
        const { reason, notes } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const requestIndex = (firm.hr?.shiftRequests || []).findIndex(
            r => r._id?.toString() === requestId.toString()
        );

        if (requestIndex === -1) {
            throw CustomException('Shift request not found', 404);
        }

        const existingRequest = firm.hr.shiftRequests[requestIndex];

        if (existingRequest.status !== 'pending') {
            throw CustomException('Can only reject pending requests', 400);
        }

        firm.hr.shiftRequests[requestIndex].status = 'rejected';
        firm.hr.shiftRequests[requestIndex].rejectedBy = req.userID;
        firm.hr.shiftRequests[requestIndex].processedAt = new Date();
        firm.hr.shiftRequests[requestIndex].rejectionReason = reason;
        if (notes) {
            firm.hr.shiftRequests[requestIndex].rejectionNotes = notes;
        }

        await firm.save();

        res.json({
            success: true,
            message: 'Shift request rejected',
            data: firm.hr.shiftRequests[requestIndex]
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
