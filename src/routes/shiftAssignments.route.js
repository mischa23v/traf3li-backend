/**
 * Shift Assignments Routes
 *
 * Manages employee shift assignments for HR scheduling.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /                     - Create shift assignment
 * - GET /                      - List shift assignments
 * - GET /:assignmentId         - Get assignment by ID
 * - PUT /:assignmentId         - Update assignment
 * - DELETE /:assignmentId      - Delete assignment
 * - POST /:assignmentId/activate   - Activate assignment
 * - POST /:assignmentId/deactivate - Deactivate assignment
 * - POST /bulk                 - Bulk create assignments
 * - DELETE /bulk               - Bulk delete assignments
 * - GET /employee/:employeeId/active - Get active assignment for employee
 * - GET /employee/:employeeId/current - Get current assignment
 * - GET /coverage-report       - Get shift coverage report
 * - GET /stats                 - Get shift assignment statistics
 * - POST /import               - Import assignments from file
 * - GET /export                - Export assignments
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for shift assignment creation/update
const ALLOWED_ASSIGNMENT_FIELDS = [
    'employeeId', 'shiftId', 'shiftName', 'startDate', 'endDate',
    'isRecurring', 'recurrencePattern', 'daysOfWeek', 'effectiveFrom',
    'effectiveUntil', 'status', 'notes', 'overtimeEligible',
    'breakDuration', 'graceMinutes', 'location', 'department'
];

// Valid statuses
const VALID_STATUSES = ['active', 'inactive', 'pending', 'expired'];
const VALID_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * POST / - Create new shift assignment
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_ASSIGNMENT_FIELDS);

        // Validate required fields
        if (!safeData.employeeId) {
            throw CustomException('Employee ID is required', 400);
        }
        if (!safeData.shiftId && !safeData.shiftName) {
            throw CustomException('Shift ID or shift name is required', 400);
        }
        if (!safeData.startDate) {
            throw CustomException('Start date is required', 400);
        }

        // Sanitize ObjectIds
        safeData.employeeId = sanitizeObjectId(safeData.employeeId, 'employeeId');
        if (safeData.shiftId) {
            safeData.shiftId = sanitizeObjectId(safeData.shiftId, 'shiftId');
        }

        // Validate dates
        const startDate = new Date(safeData.startDate);
        if (isNaN(startDate.getTime())) {
            throw CustomException('Invalid start date format', 400);
        }
        safeData.startDate = startDate;

        if (safeData.endDate) {
            const endDate = new Date(safeData.endDate);
            if (isNaN(endDate.getTime())) {
                throw CustomException('Invalid end date format', 400);
            }
            if (endDate <= startDate) {
                throw CustomException('End date must be after start date', 400);
            }
            safeData.endDate = endDate;
        }

        // Validate days of week
        if (safeData.daysOfWeek) {
            if (!Array.isArray(safeData.daysOfWeek)) {
                throw CustomException('Days of week must be an array', 400);
            }
            const invalidDays = safeData.daysOfWeek.filter(d => !VALID_DAYS.includes(d.toLowerCase()));
            if (invalidDays.length > 0) {
                throw CustomException(`Invalid days: ${invalidDays.join(', ')}`, 400);
            }
        }

        // Get firm to store assignment
        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Initialize settings if not exists
        if (!firm.hr) firm.hr = {};
        if (!firm.hr.shiftAssignments) firm.hr.shiftAssignments = [];

        // Check for overlapping assignments
        const overlapping = firm.hr.shiftAssignments.find(a => {
            if (a.employeeId.toString() !== safeData.employeeId.toString()) return false;
            if (a.status === 'inactive' || a.status === 'expired') return false;

            const existingStart = new Date(a.startDate);
            const existingEnd = a.endDate ? new Date(a.endDate) : new Date('2099-12-31');
            const newEnd = safeData.endDate || new Date('2099-12-31');

            return startDate <= existingEnd && newEnd >= existingStart;
        });

        if (overlapping) {
            throw CustomException('Employee already has an overlapping shift assignment', 400);
        }

        const assignment = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            status: safeData.status || 'active',
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.hr.shiftAssignments.push(assignment);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Shift assignment created successfully',
            data: assignment
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET / - List shift assignments
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { employeeId, shiftId, status, department, dateFrom, dateTo, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftAssignments').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let assignments = firm.hr?.shiftAssignments || [];

        // Apply filters
        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId, 'employeeId');
            assignments = assignments.filter(a => a.employeeId?.toString() === sanitizedEmployeeId.toString());
        }
        if (shiftId) {
            const sanitizedShiftId = sanitizeObjectId(shiftId, 'shiftId');
            assignments = assignments.filter(a => a.shiftId?.toString() === sanitizedShiftId.toString());
        }
        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
            }
            assignments = assignments.filter(a => a.status === status);
        }
        if (department) {
            const deptPattern = escapeRegex(department).toLowerCase();
            assignments = assignments.filter(a => a.department?.toLowerCase().includes(deptPattern));
        }
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            assignments = assignments.filter(a => new Date(a.startDate) >= fromDate);
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            assignments = assignments.filter(a => !a.endDate || new Date(a.endDate) <= toDate);
        }
        if (search) {
            const searchPattern = escapeRegex(search).toLowerCase();
            assignments = assignments.filter(a =>
                a.shiftName?.toLowerCase().includes(searchPattern) ||
                a.notes?.toLowerCase().includes(searchPattern)
            );
        }

        // Sort by start date descending
        assignments.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        const total = assignments.length;
        const paginatedAssignments = assignments.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedAssignments,
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
 * GET /coverage-report - Get shift coverage report
 */
router.get('/coverage-report', async (req, res, next) => {
    try {
        const { dateFrom, dateTo, department, shiftId } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftAssignments hr.shifts').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let assignments = firm.hr?.shiftAssignments || [];
        const shifts = firm.hr?.shifts || [];

        // Apply filters
        if (department) {
            assignments = assignments.filter(a => a.department === department);
        }
        if (shiftId) {
            const sanitizedShiftId = sanitizeObjectId(shiftId, 'shiftId');
            assignments = assignments.filter(a => a.shiftId?.toString() === sanitizedShiftId.toString());
        }

        // Filter active assignments within date range
        const fromDate = dateFrom ? new Date(dateFrom) : new Date();
        const toDate = dateTo ? new Date(dateTo) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const activeAssignments = assignments.filter(a => {
            if (a.status !== 'active') return false;
            const start = new Date(a.startDate);
            const end = a.endDate ? new Date(a.endDate) : new Date('2099-12-31');
            return start <= toDate && end >= fromDate;
        });

        // Group by shift
        const coverageByShift = {};
        for (const assignment of activeAssignments) {
            const shiftKey = assignment.shiftId?.toString() || assignment.shiftName || 'Unknown';
            if (!coverageByShift[shiftKey]) {
                const shift = shifts.find(s => s._id?.toString() === shiftKey);
                coverageByShift[shiftKey] = {
                    shiftId: shiftKey,
                    shiftName: shift?.name || assignment.shiftName || 'Unknown',
                    employees: [],
                    employeeCount: 0
                };
            }
            coverageByShift[shiftKey].employees.push(assignment.employeeId);
            coverageByShift[shiftKey].employeeCount++;
        }

        // Group by day of week
        const coverageByDay = {};
        for (const day of VALID_DAYS) {
            coverageByDay[day] = activeAssignments.filter(a =>
                !a.daysOfWeek || a.daysOfWeek.length === 0 || a.daysOfWeek.includes(day)
            ).length;
        }

        res.json({
            success: true,
            data: {
                dateRange: { from: fromDate, to: toDate },
                totalAssignments: activeAssignments.length,
                byShift: Object.values(coverageByShift),
                byDayOfWeek: coverageByDay
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /stats - Get shift assignment statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { dateFrom, dateTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftAssignments').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let assignments = firm.hr?.shiftAssignments || [];

        // Filter by date range if provided
        if (dateFrom || dateTo) {
            const fromDate = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const toDate = dateTo ? new Date(dateTo) : new Date();
            assignments = assignments.filter(a => {
                const created = new Date(a.createdAt);
                return created >= fromDate && created <= toDate;
            });
        }

        // Calculate statistics
        const statusCounts = {};
        const departmentCounts = {};
        const shiftCounts = {};

        for (const assignment of assignments) {
            // By status
            statusCounts[assignment.status] = (statusCounts[assignment.status] || 0) + 1;

            // By department
            if (assignment.department) {
                departmentCounts[assignment.department] = (departmentCounts[assignment.department] || 0) + 1;
            }

            // By shift
            const shiftKey = assignment.shiftName || assignment.shiftId?.toString() || 'Unknown';
            shiftCounts[shiftKey] = (shiftCounts[shiftKey] || 0) + 1;
        }

        res.json({
            success: true,
            data: {
                total: assignments.length,
                active: statusCounts.active || 0,
                inactive: statusCounts.inactive || 0,
                pending: statusCounts.pending || 0,
                expired: statusCounts.expired || 0,
                byStatus: statusCounts,
                byDepartment: departmentCounts,
                byShift: shiftCounts
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /employee/:employeeId/active - Get active shift assignment for employee
 */
router.get('/employee/:employeeId/active', async (req, res, next) => {
    try {
        const employeeId = sanitizeObjectId(req.params.employeeId, 'employeeId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftAssignments').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const now = new Date();
        const activeAssignment = (firm.hr?.shiftAssignments || []).find(a => {
            if (a.employeeId?.toString() !== employeeId.toString()) return false;
            if (a.status !== 'active') return false;
            const start = new Date(a.startDate);
            const end = a.endDate ? new Date(a.endDate) : new Date('2099-12-31');
            return start <= now && end >= now;
        });

        if (!activeAssignment) {
            throw CustomException('No active shift assignment found for employee', 404);
        }

        res.json({
            success: true,
            data: activeAssignment
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /employee/:employeeId/current - Get current shift assignment with details
 */
router.get('/employee/:employeeId/current', async (req, res, next) => {
    try {
        const employeeId = sanitizeObjectId(req.params.employeeId, 'employeeId');
        const { date } = req.query;

        const targetDate = date ? new Date(date) : new Date();

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftAssignments hr.shifts').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const assignment = (firm.hr?.shiftAssignments || []).find(a => {
            if (a.employeeId?.toString() !== employeeId.toString()) return false;
            if (a.status !== 'active') return false;
            const start = new Date(a.startDate);
            const end = a.endDate ? new Date(a.endDate) : new Date('2099-12-31');
            return start <= targetDate && end >= targetDate;
        });

        if (!assignment) {
            return res.json({
                success: true,
                data: null,
                message: 'No shift assignment found for this date'
            });
        }

        // Get shift details if shiftId exists
        let shiftDetails = null;
        if (assignment.shiftId) {
            shiftDetails = (firm.hr?.shifts || []).find(
                s => s._id?.toString() === assignment.shiftId.toString()
            );
        }

        res.json({
            success: true,
            data: {
                assignment,
                shiftDetails
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk - Bulk create shift assignments
 */
router.post('/bulk', async (req, res, next) => {
    try {
        const { assignments } = req.body;

        if (!Array.isArray(assignments) || assignments.length === 0) {
            throw CustomException('Assignments array is required', 400);
        }

        if (assignments.length > 50) {
            throw CustomException('Maximum 50 assignments per request', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.shiftAssignments) firm.hr.shiftAssignments = [];

        const results = { created: [], errors: [] };

        for (let i = 0; i < assignments.length; i++) {
            try {
                const safeData = pickAllowedFields(assignments[i], ALLOWED_ASSIGNMENT_FIELDS);

                if (!safeData.employeeId || (!safeData.shiftId && !safeData.shiftName) || !safeData.startDate) {
                    results.errors.push({ index: i, error: 'Missing required fields' });
                    continue;
                }

                safeData.employeeId = sanitizeObjectId(safeData.employeeId, 'employeeId');
                if (safeData.shiftId) {
                    safeData.shiftId = sanitizeObjectId(safeData.shiftId, 'shiftId');
                }
                safeData.startDate = new Date(safeData.startDate);
                if (safeData.endDate) safeData.endDate = new Date(safeData.endDate);

                const assignment = {
                    _id: new mongoose.Types.ObjectId(),
                    ...safeData,
                    status: safeData.status || 'active',
                    createdBy: req.userID,
                    createdAt: new Date()
                };

                firm.hr.shiftAssignments.push(assignment);
                results.created.push(assignment);
            } catch (err) {
                results.errors.push({ index: i, error: err.message });
            }
        }

        await firm.save();

        res.status(201).json({
            success: true,
            message: `Created ${results.created.length} assignments, ${results.errors.length} errors`,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /bulk - Bulk delete shift assignments
 */
router.delete('/bulk', async (req, res, next) => {
    try {
        const { assignmentIds } = req.body;

        if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
            throw CustomException('Assignment IDs array is required', 400);
        }

        if (assignmentIds.length > 50) {
            throw CustomException('Maximum 50 deletions per request', 400);
        }

        const sanitizedIds = assignmentIds.map(id => sanitizeObjectId(id, 'assignmentId').toString());

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const initialCount = firm.hr?.shiftAssignments?.length || 0;
        firm.hr.shiftAssignments = (firm.hr?.shiftAssignments || []).filter(
            a => !sanitizedIds.includes(a._id?.toString())
        );
        const deletedCount = initialCount - firm.hr.shiftAssignments.length;

        await firm.save();

        res.json({
            success: true,
            message: `Deleted ${deletedCount} assignments`,
            data: { deletedCount }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /import - Import shift assignments from data
 */
router.post('/import', async (req, res, next) => {
    try {
        const { data, format = 'json' } = req.body;

        if (!data) {
            throw CustomException('Import data is required', 400);
        }

        let assignments;
        if (format === 'json') {
            assignments = Array.isArray(data) ? data : [data];
        } else {
            throw CustomException('Unsupported import format. Use JSON.', 400);
        }

        if (assignments.length > 100) {
            throw CustomException('Maximum 100 assignments per import', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.shiftAssignments) firm.hr.shiftAssignments = [];

        const results = { imported: 0, skipped: 0, errors: [] };

        for (let i = 0; i < assignments.length; i++) {
            try {
                const safeData = pickAllowedFields(assignments[i], ALLOWED_ASSIGNMENT_FIELDS);

                if (!safeData.employeeId || !safeData.startDate) {
                    results.errors.push({ row: i + 1, error: 'Missing required fields' });
                    results.skipped++;
                    continue;
                }

                safeData.employeeId = sanitizeObjectId(safeData.employeeId, 'employeeId');
                safeData.startDate = new Date(safeData.startDate);
                if (safeData.endDate) safeData.endDate = new Date(safeData.endDate);
                if (safeData.shiftId) safeData.shiftId = sanitizeObjectId(safeData.shiftId, 'shiftId');

                const assignment = {
                    _id: new mongoose.Types.ObjectId(),
                    ...safeData,
                    status: safeData.status || 'active',
                    importedAt: new Date(),
                    importedBy: req.userID,
                    createdAt: new Date()
                };

                firm.hr.shiftAssignments.push(assignment);
                results.imported++;
            } catch (err) {
                results.errors.push({ row: i + 1, error: err.message });
                results.skipped++;
            }
        }

        await firm.save();

        res.json({
            success: true,
            message: `Imported ${results.imported} assignments, skipped ${results.skipped}`,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /export - Export shift assignments
 */
router.get('/export', async (req, res, next) => {
    try {
        const { status, department, format = 'json' } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftAssignments').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let assignments = firm.hr?.shiftAssignments || [];

        // Apply filters
        if (status) {
            assignments = assignments.filter(a => a.status === status);
        }
        if (department) {
            assignments = assignments.filter(a => a.department === department);
        }

        if (format === 'csv') {
            const headers = ['employeeId', 'shiftName', 'startDate', 'endDate', 'status', 'department', 'daysOfWeek'];
            const csvRows = [headers.join(',')];

            for (const a of assignments) {
                const row = [
                    a.employeeId,
                    `"${a.shiftName || ''}"`,
                    a.startDate ? new Date(a.startDate).toISOString() : '',
                    a.endDate ? new Date(a.endDate).toISOString() : '',
                    a.status || '',
                    `"${a.department || ''}"`,
                    `"${(a.daysOfWeek || []).join(';')}"`
                ];
                csvRows.push(row.join(','));
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=shift-assignments.csv');
            return res.send(csvRows.join('\n'));
        }

        res.json({
            success: true,
            data: assignments,
            exportedAt: new Date(),
            count: assignments.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:assignmentId - Get shift assignment by ID
 */
router.get('/:assignmentId', async (req, res, next) => {
    try {
        const assignmentId = sanitizeObjectId(req.params.assignmentId, 'assignmentId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftAssignments').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const assignment = (firm.hr?.shiftAssignments || []).find(
            a => a._id?.toString() === assignmentId.toString()
        );

        if (!assignment) {
            throw CustomException('Shift assignment not found', 404);
        }

        res.json({
            success: true,
            data: assignment
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:assignmentId - Update shift assignment
 */
router.put('/:assignmentId', async (req, res, next) => {
    try {
        const assignmentId = sanitizeObjectId(req.params.assignmentId, 'assignmentId');
        const safeData = pickAllowedFields(req.body, ALLOWED_ASSIGNMENT_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const assignmentIndex = (firm.hr?.shiftAssignments || []).findIndex(
            a => a._id?.toString() === assignmentId.toString()
        );

        if (assignmentIndex === -1) {
            throw CustomException('Shift assignment not found', 404);
        }

        // Sanitize ObjectIds
        if (safeData.employeeId) {
            safeData.employeeId = sanitizeObjectId(safeData.employeeId, 'employeeId');
        }
        if (safeData.shiftId) {
            safeData.shiftId = sanitizeObjectId(safeData.shiftId, 'shiftId');
        }

        // Validate dates
        if (safeData.startDate) {
            safeData.startDate = new Date(safeData.startDate);
        }
        if (safeData.endDate) {
            safeData.endDate = new Date(safeData.endDate);
        }

        // Validate status
        if (safeData.status && !VALID_STATUSES.includes(safeData.status)) {
            throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
        }

        Object.assign(firm.hr.shiftAssignments[assignmentIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Shift assignment updated successfully',
            data: firm.hr.shiftAssignments[assignmentIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:assignmentId - Delete shift assignment
 */
router.delete('/:assignmentId', async (req, res, next) => {
    try {
        const assignmentId = sanitizeObjectId(req.params.assignmentId, 'assignmentId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const assignmentIndex = (firm.hr?.shiftAssignments || []).findIndex(
            a => a._id?.toString() === assignmentId.toString()
        );

        if (assignmentIndex === -1) {
            throw CustomException('Shift assignment not found', 404);
        }

        firm.hr.shiftAssignments.splice(assignmentIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Shift assignment deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:assignmentId/activate - Activate shift assignment
 */
router.post('/:assignmentId/activate', async (req, res, next) => {
    try {
        const assignmentId = sanitizeObjectId(req.params.assignmentId, 'assignmentId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const assignmentIndex = (firm.hr?.shiftAssignments || []).findIndex(
            a => a._id?.toString() === assignmentId.toString()
        );

        if (assignmentIndex === -1) {
            throw CustomException('Shift assignment not found', 404);
        }

        if (firm.hr.shiftAssignments[assignmentIndex].status === 'active') {
            throw CustomException('Assignment is already active', 400);
        }

        firm.hr.shiftAssignments[assignmentIndex].status = 'active';
        firm.hr.shiftAssignments[assignmentIndex].activatedAt = new Date();
        firm.hr.shiftAssignments[assignmentIndex].activatedBy = req.userID;

        await firm.save();

        res.json({
            success: true,
            message: 'Shift assignment activated',
            data: firm.hr.shiftAssignments[assignmentIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:assignmentId/deactivate - Deactivate shift assignment
 */
router.post('/:assignmentId/deactivate', async (req, res, next) => {
    try {
        const assignmentId = sanitizeObjectId(req.params.assignmentId, 'assignmentId');
        const { reason } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const assignmentIndex = (firm.hr?.shiftAssignments || []).findIndex(
            a => a._id?.toString() === assignmentId.toString()
        );

        if (assignmentIndex === -1) {
            throw CustomException('Shift assignment not found', 404);
        }

        if (firm.hr.shiftAssignments[assignmentIndex].status === 'inactive') {
            throw CustomException('Assignment is already inactive', 400);
        }

        firm.hr.shiftAssignments[assignmentIndex].status = 'inactive';
        firm.hr.shiftAssignments[assignmentIndex].deactivatedAt = new Date();
        firm.hr.shiftAssignments[assignmentIndex].deactivatedBy = req.userID;
        if (reason) {
            firm.hr.shiftAssignments[assignmentIndex].deactivationReason = reason;
        }

        await firm.save();

        res.json({
            success: true,
            message: 'Shift assignment deactivated',
            data: firm.hr.shiftAssignments[assignmentIndex]
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
