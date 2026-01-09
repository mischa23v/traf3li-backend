/**
 * Attendance Extended Routes
 *
 * Extended attendance management including approvals, reports, and statistics.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /:recordId/approve-early-departure - Approve early departure
 * - POST /:recordId/approve-overtime        - Approve overtime
 * - POST /:recordId/approve-timesheet       - Approve timesheet
 * - POST /:recordId/reject-timesheet        - Reject timesheet
 * - POST /:recordId/excuse-late             - Excuse late arrival
 * - POST /:recordId/violations/:violationId/confirm - Confirm violation
 * - POST /:recordId/violations/:violationId/dismiss - Dismiss violation
 * - POST /bulk                              - Bulk attendance entry
 * - GET /compliance-report                  - Get compliance report
 * - GET /daily-summary                      - Get daily attendance summary
 * - GET /employee-summary/:employeeId       - Get employee attendance summary
 * - POST /lock-for-payroll                  - Lock attendance for payroll
 * - GET /stats                              - Get attendance statistics
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/attendance.model');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Allowed fields for bulk entry
const ALLOWED_BULK_FIELDS = [
    'employeeId', 'date', 'checkIn', 'checkOut', 'status',
    'notes', 'shiftId', 'location'
];

/**
 * POST /:recordId/approve-early-departure - Approve early departure
 */
router.post('/:recordId/approve-early-departure', async (req, res, next) => {
    try {
        const recordId = sanitizeObjectId(req.params.recordId, 'recordId');
        const { reason, notes } = req.body;

        const attendance = await Attendance.findOne({ _id: recordId, ...req.firmQuery });
        if (!attendance) {
            throw CustomException('Attendance record not found', 404);
        }

        if (!attendance.earlyDeparture) {
            throw CustomException('No early departure to approve', 400);
        }

        if (attendance.earlyDeparture.approved) {
            throw CustomException('Early departure already approved', 400);
        }

        attendance.earlyDeparture.approved = true;
        attendance.earlyDeparture.approvedBy = req.userID;
        attendance.earlyDeparture.approvedAt = new Date();
        if (reason) attendance.earlyDeparture.approvalReason = reason;
        if (notes) attendance.earlyDeparture.approvalNotes = notes;

        await attendance.save();

        res.json({
            success: true,
            message: 'Early departure approved',
            data: attendance
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:recordId/approve-overtime - Approve overtime
 */
router.post('/:recordId/approve-overtime', async (req, res, next) => {
    try {
        const recordId = sanitizeObjectId(req.params.recordId, 'recordId');
        const { hours, rate, notes } = req.body;

        const attendance = await Attendance.findOne({ _id: recordId, ...req.firmQuery });
        if (!attendance) {
            throw CustomException('Attendance record not found', 404);
        }

        if (!attendance.overtime || attendance.overtime.minutes === 0) {
            throw CustomException('No overtime to approve', 400);
        }

        if (attendance.overtime.approved) {
            throw CustomException('Overtime already approved', 400);
        }

        attendance.overtime.approved = true;
        attendance.overtime.approvedBy = req.userID;
        attendance.overtime.approvedAt = new Date();
        if (hours !== undefined) attendance.overtime.approvedHours = hours;
        if (rate !== undefined) attendance.overtime.rate = rate;
        if (notes) attendance.overtime.approvalNotes = notes;

        await attendance.save();

        res.json({
            success: true,
            message: 'Overtime approved',
            data: attendance
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:recordId/approve-timesheet - Approve timesheet
 */
router.post('/:recordId/approve-timesheet', async (req, res, next) => {
    try {
        const recordId = sanitizeObjectId(req.params.recordId, 'recordId');
        const { notes } = req.body;

        const attendance = await Attendance.findOne({ _id: recordId, ...req.firmQuery });
        if (!attendance) {
            throw CustomException('Attendance record not found', 404);
        }

        if (attendance.timesheetStatus === 'approved') {
            throw CustomException('Timesheet already approved', 400);
        }
        if (attendance.timesheetStatus === 'rejected') {
            throw CustomException('Cannot approve a rejected timesheet. Please resubmit.', 400);
        }

        attendance.timesheetStatus = 'approved';
        attendance.timesheetApprovedBy = req.userID;
        attendance.timesheetApprovedAt = new Date();
        if (notes) attendance.timesheetApprovalNotes = notes;

        await attendance.save();

        res.json({
            success: true,
            message: 'Timesheet approved',
            data: attendance
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:recordId/reject-timesheet - Reject timesheet
 */
router.post('/:recordId/reject-timesheet', async (req, res, next) => {
    try {
        const recordId = sanitizeObjectId(req.params.recordId, 'recordId');
        const { reason, notes } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        const attendance = await Attendance.findOne({ _id: recordId, ...req.firmQuery });
        if (!attendance) {
            throw CustomException('Attendance record not found', 404);
        }

        if (attendance.timesheetStatus === 'approved') {
            throw CustomException('Cannot reject an approved timesheet', 400);
        }

        attendance.timesheetStatus = 'rejected';
        attendance.timesheetRejectedBy = req.userID;
        attendance.timesheetRejectedAt = new Date();
        attendance.timesheetRejectionReason = reason;
        if (notes) attendance.timesheetRejectionNotes = notes;

        await attendance.save();

        res.json({
            success: true,
            message: 'Timesheet rejected',
            data: attendance
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:recordId/excuse-late - Excuse late arrival
 */
router.post('/:recordId/excuse-late', async (req, res, next) => {
    try {
        const recordId = sanitizeObjectId(req.params.recordId, 'recordId');
        const { reason, notes } = req.body;

        if (!reason) {
            throw CustomException('Excuse reason is required', 400);
        }

        const attendance = await Attendance.findOne({ _id: recordId, ...req.firmQuery });
        if (!attendance) {
            throw CustomException('Attendance record not found', 404);
        }

        if (!attendance.lateArrival || attendance.lateArrival.minutes === 0) {
            throw CustomException('No late arrival to excuse', 400);
        }

        if (attendance.lateArrival.excused) {
            throw CustomException('Late arrival already excused', 400);
        }

        attendance.lateArrival.excused = true;
        attendance.lateArrival.excusedBy = req.userID;
        attendance.lateArrival.excusedAt = new Date();
        attendance.lateArrival.excuseReason = reason;
        if (notes) attendance.lateArrival.excuseNotes = notes;

        await attendance.save();

        res.json({
            success: true,
            message: 'Late arrival excused',
            data: attendance
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:recordId/violations/:violationId/confirm - Confirm attendance violation
 */
router.post('/:recordId/violations/:violationId/confirm', async (req, res, next) => {
    try {
        const recordId = sanitizeObjectId(req.params.recordId, 'recordId');
        const { violationId } = req.params;
        const { penalty, notes } = req.body;

        const attendance = await Attendance.findOne({ _id: recordId, ...req.firmQuery });
        if (!attendance) {
            throw CustomException('Attendance record not found', 404);
        }

        const violationIndex = (attendance.violations || []).findIndex(
            v => v._id?.toString() === violationId || v.id === violationId
        );

        if (violationIndex === -1) {
            throw CustomException('Violation not found', 404);
        }

        if (attendance.violations[violationIndex].status === 'confirmed') {
            throw CustomException('Violation already confirmed', 400);
        }

        attendance.violations[violationIndex].status = 'confirmed';
        attendance.violations[violationIndex].confirmedBy = req.userID;
        attendance.violations[violationIndex].confirmedAt = new Date();
        if (penalty !== undefined) attendance.violations[violationIndex].penalty = penalty;
        if (notes) attendance.violations[violationIndex].confirmationNotes = notes;

        await attendance.save();

        res.json({
            success: true,
            message: 'Violation confirmed',
            data: attendance.violations[violationIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:recordId/violations/:violationId/dismiss - Dismiss attendance violation
 */
router.post('/:recordId/violations/:violationId/dismiss', async (req, res, next) => {
    try {
        const recordId = sanitizeObjectId(req.params.recordId, 'recordId');
        const { violationId } = req.params;
        const { reason, notes } = req.body;

        if (!reason) {
            throw CustomException('Dismissal reason is required', 400);
        }

        const attendance = await Attendance.findOne({ _id: recordId, ...req.firmQuery });
        if (!attendance) {
            throw CustomException('Attendance record not found', 404);
        }

        const violationIndex = (attendance.violations || []).findIndex(
            v => v._id?.toString() === violationId || v.id === violationId
        );

        if (violationIndex === -1) {
            throw CustomException('Violation not found', 404);
        }

        if (attendance.violations[violationIndex].status === 'dismissed') {
            throw CustomException('Violation already dismissed', 400);
        }

        attendance.violations[violationIndex].status = 'dismissed';
        attendance.violations[violationIndex].dismissedBy = req.userID;
        attendance.violations[violationIndex].dismissedAt = new Date();
        attendance.violations[violationIndex].dismissalReason = reason;
        if (notes) attendance.violations[violationIndex].dismissalNotes = notes;

        await attendance.save();

        res.json({
            success: true,
            message: 'Violation dismissed',
            data: attendance.violations[violationIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk - Bulk attendance entry
 */
router.post('/bulk', async (req, res, next) => {
    try {
        const { entries } = req.body;

        if (!Array.isArray(entries) || entries.length === 0) {
            throw CustomException('Entries array is required', 400);
        }

        if (entries.length > 50) {
            throw CustomException('Maximum 50 entries per request', 400);
        }

        const results = { created: [], updated: [], errors: [] };

        for (let i = 0; i < entries.length; i++) {
            try {
                const safeData = pickAllowedFields(entries[i], ALLOWED_BULK_FIELDS);

                if (!safeData.employeeId || !safeData.date) {
                    results.errors.push({ index: i, error: 'employeeId and date are required' });
                    continue;
                }

                safeData.employeeId = sanitizeObjectId(safeData.employeeId, 'employeeId');
                const recordDate = new Date(safeData.date);
                recordDate.setHours(0, 0, 0, 0);

                // Check for existing record
                const existing = await Attendance.findOne({
                    ...req.firmQuery,
                    employeeId: safeData.employeeId,
                    date: recordDate
                });

                if (existing) {
                    // Update existing
                    if (safeData.checkIn) existing.checkIn = new Date(safeData.checkIn);
                    if (safeData.checkOut) existing.checkOut = new Date(safeData.checkOut);
                    if (safeData.status) existing.status = safeData.status;
                    if (safeData.notes) existing.notes = safeData.notes;
                    existing.updatedBy = req.userID;
                    await existing.save();
                    results.updated.push({ index: i, id: existing._id });
                } else {
                    // Create new
                    const record = await Attendance.create(req.addFirmId({
                        ...safeData,
                        date: recordDate,
                        checkIn: safeData.checkIn ? new Date(safeData.checkIn) : undefined,
                        checkOut: safeData.checkOut ? new Date(safeData.checkOut) : undefined,
                        createdBy: req.userID
                    }));
                    results.created.push({ index: i, id: record._id });
                }
            } catch (err) {
                results.errors.push({ index: i, error: err.message });
            }
        }

        res.status(201).json({
            success: true,
            message: `Created ${results.created.length}, updated ${results.updated.length}, errors ${results.errors.length}`,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /compliance-report - Get attendance compliance report
 */
router.get('/compliance-report', async (req, res, next) => {
    try {
        const { dateFrom, dateTo, department, employeeId } = req.query;

        if (!dateFrom || !dateTo) {
            throw CustomException('Date range is required', 400);
        }

        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);

        const matchQuery = {
            ...req.firmQuery,
            date: { $gte: fromDate, $lte: toDate }
        };

        if (employeeId) {
            matchQuery.employeeId = sanitizeObjectId(employeeId, 'employeeId');
        }

        const [records, stats] = await Promise.all([
            Attendance.find(matchQuery)
                .populate('employeeId', 'firstName lastName department')
                .lean(),
            Attendance.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalRecords: { $sum: 1 },
                        totalLateArrivals: {
                            $sum: { $cond: [{ $gt: ['$lateArrival.minutes', 0] }, 1, 0] }
                        },
                        totalEarlyDepartures: {
                            $sum: { $cond: ['$earlyDeparture', 1, 0] }
                        },
                        totalAbsences: {
                            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                        },
                        totalOvertimeMinutes: {
                            $sum: { $ifNull: ['$overtime.minutes', 0] }
                        },
                        totalLateMinutes: {
                            $sum: { $ifNull: ['$lateArrival.minutes', 0] }
                        }
                    }
                }
            ])
        ]);

        const summary = stats[0] || {
            totalRecords: 0,
            totalLateArrivals: 0,
            totalEarlyDepartures: 0,
            totalAbsences: 0,
            totalOvertimeMinutes: 0,
            totalLateMinutes: 0
        };

        // Calculate compliance rate
        const complianceIssues = summary.totalLateArrivals + summary.totalEarlyDepartures + summary.totalAbsences;
        const complianceRate = summary.totalRecords > 0
            ? Math.round(((summary.totalRecords - complianceIssues) / summary.totalRecords) * 100)
            : 100;

        res.json({
            success: true,
            data: {
                dateRange: { from: fromDate, to: toDate },
                summary: {
                    ...summary,
                    totalOvertimeHours: Math.round(summary.totalOvertimeMinutes / 60 * 10) / 10,
                    totalLateHours: Math.round(summary.totalLateMinutes / 60 * 10) / 10,
                    complianceRate
                },
                recordCount: records.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /daily-summary - Get daily attendance summary
 */
router.get('/daily-summary', async (req, res, next) => {
    try {
        const { date } = req.query;

        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const [summary, records] = await Promise.all([
            Attendance.aggregate([
                {
                    $match: {
                        ...req.firmQuery,
                        date: { $gte: targetDate, $lt: nextDay }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            Attendance.find({
                ...req.firmQuery,
                date: { $gte: targetDate, $lt: nextDay }
            })
                .populate('employeeId', 'firstName lastName')
                .sort({ checkIn: 1 })
                .lean()
        ]);

        const statusCounts = summary.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                date: targetDate,
                summary: {
                    total: records.length,
                    present: statusCounts.present || 0,
                    absent: statusCounts.absent || 0,
                    late: statusCounts.late || 0,
                    leave: statusCounts.leave || 0,
                    halfDay: statusCounts.half_day || 0
                },
                records
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /employee-summary/:employeeId - Get employee attendance summary
 */
router.get('/employee-summary/:employeeId', async (req, res, next) => {
    try {
        const employeeId = sanitizeObjectId(req.params.employeeId, 'employeeId');
        const { dateFrom, dateTo } = req.query;

        // Default to current month
        const now = new Date();
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
        const toDate = dateTo ? new Date(dateTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const [summary, records] = await Promise.all([
            Attendance.aggregate([
                {
                    $match: {
                        ...req.firmQuery,
                        employeeId: new mongoose.Types.ObjectId(employeeId),
                        date: { $gte: fromDate, $lte: toDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalDays: { $sum: 1 },
                        presentDays: {
                            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                        },
                        absentDays: {
                            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                        },
                        lateDays: {
                            $sum: { $cond: [{ $gt: ['$lateArrival.minutes', 0] }, 1, 0] }
                        },
                        totalWorkedMinutes: { $sum: { $ifNull: ['$workedMinutes', 0] } },
                        totalOvertimeMinutes: { $sum: { $ifNull: ['$overtime.minutes', 0] } },
                        totalLateMinutes: { $sum: { $ifNull: ['$lateArrival.minutes', 0] } }
                    }
                }
            ]),
            Attendance.find({
                ...req.firmQuery,
                employeeId,
                date: { $gte: fromDate, $lte: toDate }
            })
                .sort({ date: -1 })
                .lean()
        ]);

        const data = summary[0] || {
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            totalWorkedMinutes: 0,
            totalOvertimeMinutes: 0,
            totalLateMinutes: 0
        };

        res.json({
            success: true,
            data: {
                employeeId,
                dateRange: { from: fromDate, to: toDate },
                summary: {
                    ...data,
                    totalWorkedHours: Math.round(data.totalWorkedMinutes / 60 * 10) / 10,
                    totalOvertimeHours: Math.round(data.totalOvertimeMinutes / 60 * 10) / 10,
                    totalLateHours: Math.round(data.totalLateMinutes / 60 * 10) / 10,
                    attendanceRate: data.totalDays > 0
                        ? Math.round((data.presentDays / data.totalDays) * 100)
                        : 0
                },
                recentRecords: records.slice(0, 10)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /lock-for-payroll - Lock attendance records for payroll processing
 */
router.post('/lock-for-payroll', async (req, res, next) => {
    try {
        const { dateFrom, dateTo, payrollRunId } = req.body;

        if (!dateFrom || !dateTo) {
            throw CustomException('Date range is required', 400);
        }

        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);

        // Update all records in the date range
        const result = await Attendance.updateMany(
            {
                ...req.firmQuery,
                date: { $gte: fromDate, $lte: toDate },
                lockedForPayroll: { $ne: true }
            },
            {
                $set: {
                    lockedForPayroll: true,
                    lockedAt: new Date(),
                    lockedBy: req.userID,
                    payrollRunId: payrollRunId ? sanitizeObjectId(payrollRunId, 'payrollRunId') : undefined
                }
            }
        );

        res.json({
            success: true,
            message: `Locked ${result.modifiedCount} attendance records for payroll`,
            data: {
                dateRange: { from: fromDate, to: toDate },
                lockedCount: result.modifiedCount
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /stats - Get attendance statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { dateFrom, dateTo, groupBy = 'day' } = req.query;

        // Default to last 30 days
        const now = new Date();
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const toDate = dateTo ? new Date(dateTo) : now;

        let dateGrouping;
        switch (groupBy) {
            case 'week':
                dateGrouping = { $dateToString: { format: '%Y-W%V', date: '$date' } };
                break;
            case 'month':
                dateGrouping = { $dateToString: { format: '%Y-%m', date: '$date' } };
                break;
            default:
                dateGrouping = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        }

        const [overallStats, byPeriod, byStatus] = await Promise.all([
            Attendance.aggregate([
                {
                    $match: {
                        ...req.firmQuery,
                        date: { $gte: fromDate, $lte: toDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRecords: { $sum: 1 },
                        uniqueEmployees: { $addToSet: '$employeeId' },
                        avgWorkedMinutes: { $avg: '$workedMinutes' },
                        totalOvertimeMinutes: { $sum: { $ifNull: ['$overtime.minutes', 0] } },
                        totalLateMinutes: { $sum: { $ifNull: ['$lateArrival.minutes', 0] } }
                    }
                }
            ]),
            Attendance.aggregate([
                {
                    $match: {
                        ...req.firmQuery,
                        date: { $gte: fromDate, $lte: toDate }
                    }
                },
                {
                    $group: {
                        _id: dateGrouping,
                        count: { $sum: 1 },
                        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Attendance.aggregate([
                {
                    $match: {
                        ...req.firmQuery,
                        date: { $gte: fromDate, $lte: toDate }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const overall = overallStats[0] || {
            totalRecords: 0,
            uniqueEmployees: [],
            avgWorkedMinutes: 0,
            totalOvertimeMinutes: 0,
            totalLateMinutes: 0
        };

        res.json({
            success: true,
            data: {
                dateRange: { from: fromDate, to: toDate },
                overall: {
                    totalRecords: overall.totalRecords,
                    uniqueEmployees: overall.uniqueEmployees?.length || 0,
                    averageWorkedHours: Math.round((overall.avgWorkedMinutes || 0) / 60 * 10) / 10,
                    totalOvertimeHours: Math.round(overall.totalOvertimeMinutes / 60 * 10) / 10,
                    totalLateHours: Math.round(overall.totalLateMinutes / 60 * 10) / 10
                },
                byPeriod,
                byStatus: byStatus.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
