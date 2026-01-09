/**
 * HR Shift Types Extended Routes
 *
 * Extended shift type management with stats, defaults, and bulk operations.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /stats                      - Get shift type statistics
 * - GET /default                    - Get default shift type
 * - POST /:shiftTypeId/set-default  - Set as default shift type
 * - POST /:shiftTypeId/activate     - Activate shift type
 * - POST /:shiftTypeId/deactivate   - Deactivate shift type
 * - POST /:shiftTypeId/duplicate    - Duplicate shift type
 * - GET /:shiftTypeId/assignments   - Get employees with this shift
 * - GET /:shiftTypeId/schedule      - Get shift schedule preview
 * - POST /bulk-activate             - Bulk activate shift types
 * - POST /bulk-deactivate           - Bulk deactivate shift types
 * - POST /bulk-delete               - Bulk delete shift types
 * - GET /export                     - Export shift types
 * - POST /import                    - Import shift types
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Allowed fields for shift types
const ALLOWED_SHIFT_FIELDS = [
    'name', 'code', 'description', 'startTime', 'endTime',
    'breakDuration', 'workDays', 'color', 'isNightShift',
    'allowOvertime', 'maxOvertimeHours', 'isActive'
];

/**
 * GET /stats - Get shift type statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes hr.employees').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shiftTypes = firm.hr?.shiftTypes || [];
        const employees = firm.hr?.employees || [];

        const activeShifts = shiftTypes.filter(s => s.isActive !== false);
        const inactiveShifts = shiftTypes.filter(s => s.isActive === false);

        // Count employees per shift type
        const employeesPerShift = {};
        shiftTypes.forEach(shift => {
            employeesPerShift[shift._id?.toString()] = employees.filter(
                e => e.shiftTypeId?.toString() === shift._id?.toString()
            ).length;
        });

        const nightShifts = shiftTypes.filter(s => s.isNightShift);
        const dayShifts = shiftTypes.filter(s => !s.isNightShift);

        res.json({
            success: true,
            data: {
                total: shiftTypes.length,
                active: activeShifts.length,
                inactive: inactiveShifts.length,
                nightShifts: nightShifts.length,
                dayShifts: dayShifts.length,
                employeesPerShift,
                mostUsed: Object.entries(employeesPerShift)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([shiftId, count]) => {
                        const shift = shiftTypes.find(s => s._id?.toString() === shiftId);
                        return {
                            shiftId,
                            name: shift?.name || 'Unknown',
                            employeeCount: count
                        };
                    })
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /default - Get default shift type
 */
router.get('/default', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes settings.defaultShiftTypeId').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const defaultId = firm.settings?.defaultShiftTypeId;
        let defaultShift = null;

        if (defaultId) {
            defaultShift = (firm.hr?.shiftTypes || []).find(
                s => s._id?.toString() === defaultId.toString()
            );
        }

        // If no default set, return the first active shift
        if (!defaultShift) {
            defaultShift = (firm.hr?.shiftTypes || []).find(s => s.isActive !== false);
        }

        res.json({
            success: true,
            data: defaultShift || null
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /export - Export shift types
 */
router.get('/export', async (req, res, next) => {
    try {
        const { format = 'json' } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shiftTypes = firm.hr?.shiftTypes || [];

        if (format === 'csv') {
            const headers = ['Name', 'Code', 'Start Time', 'End Time', 'Break Duration', 'Work Days', 'Night Shift', 'Active'];
            const csvRows = [headers.join(',')];

            for (const shift of shiftTypes) {
                const row = [
                    `"${(shift.name || '').replace(/"/g, '""')}"`,
                    shift.code || '',
                    shift.startTime || '',
                    shift.endTime || '',
                    shift.breakDuration || 0,
                    (shift.workDays || []).join(';'),
                    shift.isNightShift ? 'Yes' : 'No',
                    shift.isActive !== false ? 'Yes' : 'No'
                ];
                csvRows.push(row.join(','));
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=shift-types.csv');
            return res.send(csvRows.join('\n'));
        }

        res.json({
            success: true,
            data: shiftTypes,
            exportedAt: new Date(),
            count: shiftTypes.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:shiftTypeId/assignments - Get employees with this shift
 */
router.get('/:shiftTypeId/assignments', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes hr.employees').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shiftType = (firm.hr?.shiftTypes || []).find(
            s => s._id?.toString() === shiftTypeId.toString()
        );

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        const assignedEmployees = (firm.hr?.employees || []).filter(
            e => e.shiftTypeId?.toString() === shiftTypeId.toString()
        ).map(e => ({
            _id: e._id,
            name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
            email: e.email,
            department: e.department,
            position: e.position
        }));

        res.json({
            success: true,
            data: {
                shiftType: {
                    _id: shiftType._id,
                    name: shiftType.name
                },
                employees: assignedEmployees,
                count: assignedEmployees.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:shiftTypeId/schedule - Get shift schedule preview
 */
router.get('/:shiftTypeId/schedule', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');
        const { weekStart } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shiftType = (firm.hr?.shiftTypes || []).find(
            s => s._id?.toString() === shiftTypeId.toString()
        );

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        // Generate a week's schedule preview
        const startDate = weekStart ? new Date(weekStart) : new Date();
        startDate.setHours(0, 0, 0, 0);

        // Adjust to start of week (Sunday)
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);

        const workDays = shiftType.workDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        const schedule = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dayName = dayNames[i];
            const isWorkDay = workDays.map(d => d.toLowerCase()).includes(dayName);

            schedule.push({
                date: date.toISOString().slice(0, 10),
                dayName,
                isWorkDay,
                startTime: isWorkDay ? shiftType.startTime : null,
                endTime: isWorkDay ? shiftType.endTime : null,
                breakDuration: isWorkDay ? shiftType.breakDuration : null
            });
        }

        res.json({
            success: true,
            data: {
                shiftType: {
                    _id: shiftType._id,
                    name: shiftType.name,
                    isNightShift: shiftType.isNightShift
                },
                weekStart: startDate.toISOString().slice(0, 10),
                schedule
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:shiftTypeId/set-default - Set as default shift type
 */
router.post('/:shiftTypeId/set-default', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shiftType = (firm.hr?.shiftTypes || []).find(
            s => s._id?.toString() === shiftTypeId.toString()
        );

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        if (shiftType.isActive === false) {
            throw CustomException('Cannot set inactive shift type as default', 400);
        }

        if (!firm.settings) firm.settings = {};
        firm.settings.defaultShiftTypeId = shiftTypeId;
        await firm.save();

        res.json({
            success: true,
            message: 'Default shift type updated',
            data: shiftType
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:shiftTypeId/activate - Activate shift type
 */
router.post('/:shiftTypeId/activate', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shiftType = (firm.hr?.shiftTypes || []).find(
            s => s._id?.toString() === shiftTypeId.toString()
        );

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        shiftType.isActive = true;
        shiftType.updatedAt = new Date();
        shiftType.updatedBy = req.userID;
        await firm.save();

        res.json({
            success: true,
            message: 'Shift type activated',
            data: shiftType
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:shiftTypeId/deactivate - Deactivate shift type
 */
router.post('/:shiftTypeId/deactivate', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shiftType = (firm.hr?.shiftTypes || []).find(
            s => s._id?.toString() === shiftTypeId.toString()
        );

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        // Check if this is the default shift type
        if (firm.settings?.defaultShiftTypeId?.toString() === shiftTypeId.toString()) {
            throw CustomException('Cannot deactivate the default shift type', 400);
        }

        // Check if employees are assigned to this shift
        const assignedEmployees = (firm.hr?.employees || []).filter(
            e => e.shiftTypeId?.toString() === shiftTypeId.toString()
        ).length;

        if (assignedEmployees > 0) {
            throw CustomException(`Cannot deactivate: ${assignedEmployees} employee(s) are assigned to this shift`, 400);
        }

        shiftType.isActive = false;
        shiftType.updatedAt = new Date();
        shiftType.updatedBy = req.userID;
        await firm.save();

        res.json({
            success: true,
            message: 'Shift type deactivated',
            data: shiftType
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:shiftTypeId/duplicate - Duplicate shift type
 */
router.post('/:shiftTypeId/duplicate', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');
        const { name } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const originalShift = (firm.hr?.shiftTypes || []).find(
            s => s._id?.toString() === shiftTypeId.toString()
        );

        if (!originalShift) {
            throw CustomException('Shift type not found', 404);
        }

        const newShift = {
            ...JSON.parse(JSON.stringify(originalShift)),
            _id: new mongoose.Types.ObjectId(),
            name: name || `${originalShift.name} (Copy)`,
            code: `${originalShift.code || 'SHIFT'}_COPY`,
            createdBy: req.userID,
            createdAt: new Date(),
            updatedAt: null,
            updatedBy: null
        };

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.shiftTypes) firm.hr.shiftTypes = [];
        firm.hr.shiftTypes.push(newShift);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Shift type duplicated',
            data: newShift
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-activate - Bulk activate shift types
 */
router.post('/bulk-activate', async (req, res, next) => {
    try {
        const { shiftTypeIds } = req.body;

        if (!Array.isArray(shiftTypeIds) || shiftTypeIds.length === 0) {
            throw CustomException('Shift type IDs array is required', 400);
        }

        if (shiftTypeIds.length > 50) {
            throw CustomException('Maximum 50 shift types per request', 400);
        }

        const sanitizedIds = shiftTypeIds.map(id => sanitizeObjectId(id, 'shiftTypeId').toString());

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let activatedCount = 0;
        (firm.hr?.shiftTypes || []).forEach(shift => {
            if (sanitizedIds.includes(shift._id?.toString()) && shift.isActive === false) {
                shift.isActive = true;
                shift.updatedAt = new Date();
                shift.updatedBy = req.userID;
                activatedCount++;
            }
        });

        await firm.save();

        res.json({
            success: true,
            message: `Activated ${activatedCount} shift types`,
            activated: activatedCount
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-deactivate - Bulk deactivate shift types
 */
router.post('/bulk-deactivate', async (req, res, next) => {
    try {
        const { shiftTypeIds } = req.body;

        if (!Array.isArray(shiftTypeIds) || shiftTypeIds.length === 0) {
            throw CustomException('Shift type IDs array is required', 400);
        }

        if (shiftTypeIds.length > 50) {
            throw CustomException('Maximum 50 shift types per request', 400);
        }

        const sanitizedIds = shiftTypeIds.map(id => sanitizeObjectId(id, 'shiftTypeId').toString());

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Check for default shift type
        const defaultId = firm.settings?.defaultShiftTypeId?.toString();
        if (defaultId && sanitizedIds.includes(defaultId)) {
            throw CustomException('Cannot deactivate the default shift type', 400);
        }

        // Check for assigned employees
        const employeeAssignments = {};
        (firm.hr?.employees || []).forEach(e => {
            const shiftId = e.shiftTypeId?.toString();
            if (shiftId && sanitizedIds.includes(shiftId)) {
                employeeAssignments[shiftId] = (employeeAssignments[shiftId] || 0) + 1;
            }
        });

        const shiftsWithEmployees = Object.entries(employeeAssignments)
            .filter(([, count]) => count > 0);

        if (shiftsWithEmployees.length > 0) {
            throw CustomException(
                `Cannot deactivate shift types with assigned employees: ${shiftsWithEmployees.map(([id, count]) => `${id} (${count} employees)`).join(', ')}`,
                400
            );
        }

        let deactivatedCount = 0;
        (firm.hr?.shiftTypes || []).forEach(shift => {
            if (sanitizedIds.includes(shift._id?.toString()) && shift.isActive !== false) {
                shift.isActive = false;
                shift.updatedAt = new Date();
                shift.updatedBy = req.userID;
                deactivatedCount++;
            }
        });

        await firm.save();

        res.json({
            success: true,
            message: `Deactivated ${deactivatedCount} shift types`,
            deactivated: deactivatedCount
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-delete - Bulk delete shift types
 */
router.post('/bulk-delete', async (req, res, next) => {
    try {
        const { shiftTypeIds } = req.body;

        if (!Array.isArray(shiftTypeIds) || shiftTypeIds.length === 0) {
            throw CustomException('Shift type IDs array is required', 400);
        }

        if (shiftTypeIds.length > 50) {
            throw CustomException('Maximum 50 shift types per request', 400);
        }

        const sanitizedIds = shiftTypeIds.map(id => sanitizeObjectId(id, 'shiftTypeId').toString());

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Check for default shift type
        const defaultId = firm.settings?.defaultShiftTypeId?.toString();
        if (defaultId && sanitizedIds.includes(defaultId)) {
            throw CustomException('Cannot delete the default shift type', 400);
        }

        // Check for assigned employees
        const hasAssignedEmployees = (firm.hr?.employees || []).some(
            e => e.shiftTypeId && sanitizedIds.includes(e.shiftTypeId.toString())
        );

        if (hasAssignedEmployees) {
            throw CustomException('Cannot delete shift types with assigned employees', 400);
        }

        const initialCount = (firm.hr?.shiftTypes || []).length;
        firm.hr.shiftTypes = (firm.hr?.shiftTypes || []).filter(
            s => !sanitizedIds.includes(s._id?.toString())
        );
        const deletedCount = initialCount - firm.hr.shiftTypes.length;

        await firm.save();

        res.json({
            success: true,
            message: `Deleted ${deletedCount} shift types`,
            deleted: deletedCount
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /import - Import shift types
 */
router.post('/import', async (req, res, next) => {
    try {
        const { shiftTypes } = req.body;

        if (!Array.isArray(shiftTypes) || shiftTypes.length === 0) {
            throw CustomException('Shift types array is required', 400);
        }

        if (shiftTypes.length > 50) {
            throw CustomException('Maximum 50 shift types per request', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.shiftTypes) firm.hr.shiftTypes = [];

        const results = { created: 0, errors: [] };

        for (let i = 0; i < shiftTypes.length; i++) {
            try {
                const safeData = pickAllowedFields(shiftTypes[i], ALLOWED_SHIFT_FIELDS);

                if (!safeData.name) {
                    results.errors.push({ index: i, error: 'Shift name is required' });
                    continue;
                }

                // Check for duplicate name
                const existing = firm.hr.shiftTypes.find(
                    s => s.name?.toLowerCase() === safeData.name.toLowerCase()
                );
                if (existing) {
                    results.errors.push({ index: i, error: `Shift type "${safeData.name}" already exists` });
                    continue;
                }

                const newShift = {
                    _id: new mongoose.Types.ObjectId(),
                    ...safeData,
                    isActive: true,
                    createdBy: req.userID,
                    createdAt: new Date()
                };

                firm.hr.shiftTypes.push(newShift);
                results.created++;
            } catch (err) {
                results.errors.push({ index: i, error: err.message });
            }
        }

        await firm.save();

        res.status(201).json({
            success: true,
            message: `Imported ${results.created} shift types, ${results.errors.length} errors`,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
