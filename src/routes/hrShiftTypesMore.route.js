/**
 * HR Shift Types More Routes
 *
 * Additional shift type operations - cloning, calculations, queries.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /:shiftTypeId/clone          - Clone shift type
 * - POST /:shiftTypeId/calculate-hours - Calculate working hours
 * - GET /by-day/:day                  - Get shift types by day
 * - GET /active                       - Get active shift types
 * - GET /:shiftTypeId/coverage        - Get shift coverage stats
 * - POST /:shiftTypeId/validate       - Validate shift configuration
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Days of week
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * POST /:shiftTypeId/clone - Clone shift type
 */
router.post('/:shiftTypeId/clone', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');
        const { newName, adjustments } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const sourceShift = (firm.hr?.shiftTypes || []).find(
            s => s._id?.toString() === shiftTypeId.toString()
        );

        if (!sourceShift) {
            throw CustomException('Shift type not found', 404);
        }

        const name = newName || `${sourceShift.name} (Copy)`;

        // Check for duplicate name
        const existing = (firm.hr?.shiftTypes || []).find(
            s => s.name?.toLowerCase() === name.toLowerCase()
        );

        if (existing) {
            throw CustomException('A shift type with this name already exists', 400);
        }

        // Clone shift type
        const cloned = {
            _id: new mongoose.Types.ObjectId(),
            name,
            code: sourceShift.code ? `${sourceShift.code}_COPY` : undefined,
            description: sourceShift.description,
            startTime: adjustments?.startTime || sourceShift.startTime,
            endTime: adjustments?.endTime || sourceShift.endTime,
            breakDuration: adjustments?.breakDuration ?? sourceShift.breakDuration,
            workingDays: adjustments?.workingDays || [...(sourceShift.workingDays || [])],
            color: sourceShift.color,
            allowOvertime: sourceShift.allowOvertime,
            overtimeThreshold: sourceShift.overtimeThreshold,
            isNightShift: sourceShift.isNightShift,
            isActive: true,
            isDefault: false,
            createdBy: req.userID,
            createdAt: new Date()
        };

        if (!firm.hr.shiftTypes) firm.hr.shiftTypes = [];
        firm.hr.shiftTypes.push(cloned);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Shift type cloned',
            data: cloned
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:shiftTypeId/calculate-hours - Calculate working hours
 */
router.post('/:shiftTypeId/calculate-hours', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');
        const { startDate, endDate, excludeHolidays } = req.body;

        if (!startDate || !endDate) {
            throw CustomException('Start date and end date are required', 400);
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end < start) {
            throw CustomException('End date must be after start date', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes hr.holidays').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shiftType = (firm.hr?.shiftTypes || []).find(
            s => s._id?.toString() === shiftTypeId.toString()
        );

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        // Parse shift times
        const [startHour, startMin] = (shiftType.startTime || '09:00').split(':').map(Number);
        const [endHour, endMin] = (shiftType.endTime || '17:00').split(':').map(Number);

        // Calculate daily working minutes
        let dailyMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        if (dailyMinutes < 0) dailyMinutes += 24 * 60; // Handle overnight shifts

        // Subtract break
        dailyMinutes -= shiftType.breakDuration || 0;

        // Get holidays in range
        const holidays = new Set();
        if (excludeHolidays) {
            (firm.hr?.holidays || []).forEach(h => {
                const holidayDate = new Date(h.date);
                if (holidayDate >= start && holidayDate <= end) {
                    holidays.add(holidayDate.toISOString().split('T')[0]);
                }
            });
        }

        // Calculate working days
        const workingDays = shiftType.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const workingDaysSet = new Set(workingDays.map(d => d.toLowerCase()));

        let totalWorkingDays = 0;
        let holidaysSkipped = 0;
        const current = new Date(start);

        while (current <= end) {
            const dayName = DAYS_OF_WEEK[current.getDay()];
            const dateStr = current.toISOString().split('T')[0];

            if (workingDaysSet.has(dayName)) {
                if (holidays.has(dateStr)) {
                    holidaysSkipped++;
                } else {
                    totalWorkingDays++;
                }
            }

            current.setDate(current.getDate() + 1);
        }

        const totalMinutes = totalWorkingDays * dailyMinutes;
        const totalHours = Math.round(totalMinutes / 60 * 100) / 100;

        res.json({
            success: true,
            data: {
                shiftTypeId,
                shiftTypeName: shiftType.name,
                dateRange: { startDate, endDate },
                calculations: {
                    dailyWorkingHours: Math.round(dailyMinutes / 60 * 100) / 100,
                    workingDaysPerWeek: workingDays.length,
                    totalWorkingDays,
                    holidaysSkipped,
                    totalWorkingHours: totalHours,
                    totalWorkingMinutes: totalMinutes
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /by-day/:day - Get shift types by day
 */
router.get('/by-day/:day', async (req, res, next) => {
    try {
        const { day } = req.params;
        const dayLower = day.toLowerCase();

        if (!DAYS_OF_WEEK.includes(dayLower)) {
            throw CustomException(`Invalid day. Must be one of: ${DAYS_OF_WEEK.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shifts = (firm.hr?.shiftTypes || []).filter(s => {
            const workingDays = (s.workingDays || []).map(d => d.toLowerCase());
            return workingDays.includes(dayLower) && s.isActive !== false;
        });

        // Sort by start time
        shifts.sort((a, b) => {
            const aTime = a.startTime || '00:00';
            const bTime = b.startTime || '00:00';
            return aTime.localeCompare(bTime);
        });

        res.json({
            success: true,
            data: shifts,
            day: dayLower,
            count: shifts.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /active - Get active shift types
 */
router.get('/active', async (req, res, next) => {
    try {
        const { department, location } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let shifts = (firm.hr?.shiftTypes || []).filter(s => s.isActive !== false);

        // Apply optional filters
        if (department) {
            shifts = shifts.filter(s =>
                !s.departments || s.departments.length === 0 || s.departments.includes(department)
            );
        }

        if (location) {
            shifts = shifts.filter(s =>
                !s.locations || s.locations.length === 0 || s.locations.includes(location)
            );
        }

        // Add computed fields
        const enrichedShifts = shifts.map(s => {
            const [startHour, startMin] = (s.startTime || '09:00').split(':').map(Number);
            const [endHour, endMin] = (s.endTime || '17:00').split(':').map(Number);

            let dailyMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
            if (dailyMinutes < 0) dailyMinutes += 24 * 60;
            dailyMinutes -= s.breakDuration || 0;

            return {
                ...s,
                computed: {
                    dailyWorkingHours: Math.round(dailyMinutes / 60 * 100) / 100,
                    workingDaysCount: (s.workingDays || []).length,
                    weeklyHours: Math.round((dailyMinutes / 60) * (s.workingDays || []).length * 100) / 100
                }
            };
        });

        res.json({
            success: true,
            data: enrichedShifts,
            count: enrichedShifts.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:shiftTypeId/coverage - Get shift coverage stats
 */
router.get('/:shiftTypeId/coverage', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.shiftTypes hr.employees hr.shiftAssignments').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const shiftType = (firm.hr?.shiftTypes || []).find(
            s => s._id?.toString() === shiftTypeId.toString()
        );

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        // Count employees assigned to this shift
        const assignments = (firm.hr?.shiftAssignments || []).filter(
            a => a.shiftTypeId?.toString() === shiftTypeId.toString() && a.status === 'active'
        );

        const assignedEmployeeIds = new Set(assignments.map(a => a.employeeId?.toString()));

        // Get employee details
        const employees = (firm.hr?.employees || []).filter(
            e => assignedEmployeeIds.has(e._id?.toString())
        );

        // Group by department
        const byDepartment = {};
        employees.forEach(e => {
            const dept = e.department || 'Unassigned';
            if (!byDepartment[dept]) byDepartment[dept] = 0;
            byDepartment[dept]++;
        });

        // Calculate coverage per day
        const coverageByDay = {};
        DAYS_OF_WEEK.forEach(day => {
            const isWorkingDay = (shiftType.workingDays || []).map(d => d.toLowerCase()).includes(day);
            coverageByDay[day] = {
                isWorkingDay,
                employeesScheduled: isWorkingDay ? employees.length : 0
            };
        });

        res.json({
            success: true,
            data: {
                shiftTypeId,
                shiftTypeName: shiftType.name,
                coverage: {
                    totalAssigned: employees.length,
                    byDepartment,
                    byDay: coverageByDay
                },
                shiftDetails: {
                    startTime: shiftType.startTime,
                    endTime: shiftType.endTime,
                    workingDays: shiftType.workingDays
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:shiftTypeId/validate - Validate shift configuration
 */
router.post('/:shiftTypeId/validate', async (req, res, next) => {
    try {
        const shiftTypeId = sanitizeObjectId(req.params.shiftTypeId, 'shiftTypeId');

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

        const errors = [];
        const warnings = [];

        // Validate required fields
        if (!shiftType.name) {
            errors.push('Shift type name is required');
        }

        if (!shiftType.startTime) {
            errors.push('Start time is required');
        }

        if (!shiftType.endTime) {
            errors.push('End time is required');
        }

        // Validate working days
        if (!shiftType.workingDays || shiftType.workingDays.length === 0) {
            warnings.push('No working days specified');
        } else {
            const invalidDays = shiftType.workingDays.filter(
                d => !DAYS_OF_WEEK.includes(d.toLowerCase())
            );
            if (invalidDays.length > 0) {
                errors.push(`Invalid working days: ${invalidDays.join(', ')}`);
            }
        }

        // Validate times
        if (shiftType.startTime && shiftType.endTime) {
            const [startH, startM] = shiftType.startTime.split(':').map(Number);
            const [endH, endM] = shiftType.endTime.split(':').map(Number);

            if (isNaN(startH) || isNaN(startM) || startH < 0 || startH > 23 || startM < 0 || startM > 59) {
                errors.push('Invalid start time format');
            }

            if (isNaN(endH) || isNaN(endM) || endH < 0 || endH > 23 || endM < 0 || endM > 59) {
                errors.push('Invalid end time format');
            }

            // Check if overnight shift
            if (shiftType.startTime > shiftType.endTime && !shiftType.isNightShift) {
                warnings.push('Start time is after end time - consider marking as night shift');
            }
        }

        // Validate break duration
        if (shiftType.breakDuration) {
            if (shiftType.breakDuration < 0) {
                errors.push('Break duration cannot be negative');
            }
            if (shiftType.breakDuration > 240) {
                warnings.push('Break duration seems unusually long (> 4 hours)');
            }
        }

        // Check for overtime configuration
        if (shiftType.allowOvertime && !shiftType.overtimeThreshold) {
            warnings.push('Overtime allowed but no threshold specified');
        }

        const isValid = errors.length === 0;

        res.json({
            success: true,
            data: {
                shiftTypeId,
                shiftTypeName: shiftType.name,
                isValid,
                errors,
                warnings,
                checksPerformed: [
                    'Required fields',
                    'Working days',
                    'Time format',
                    'Break duration',
                    'Overtime configuration'
                ]
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
