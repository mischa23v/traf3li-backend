const { Attendance, Employee, Leave } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');

/**
 * Check in employee
 * POST /api/attendance/check-in
 */
const checkIn = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const {
        employeeId,
        checkInMethod,
        checkInLocation,
        checkInNote
    } = req.body;

    if (!employeeId) {
        throw new CustomException('الموظف مطلوب', 400);
    }

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.hasAttendanceForDate(employeeId, today);
    if (existingAttendance) {
        throw new CustomException('الموظف قام بتسجيل الحضور اليوم بالفعل', 400);
    }

    // Check if employee is on leave
    const onLeave = await Leave.findOne({
        employeeId,
        status: 'approved',
        startDate: { $lte: today },
        endDate: { $gte: today }
    });

    // Calculate expected check-in time (default 8 AM)
    const expectedCheckIn = new Date(today);
    expectedCheckIn.setHours(8, 0, 0, 0);

    // Calculate expected check-out time
    const expectedCheckOut = new Date(today);
    expectedCheckOut.setHours(8 + (employee.workingHoursPerDay || 8), 0, 0, 0);

    const checkInTime = new Date();

    // Check if late
    const isLate = checkInTime > expectedCheckIn;
    const lateMinutes = isLate ? Math.round((checkInTime - expectedCheckIn) / (1000 * 60)) : 0;

    const attendance = await Attendance.create({
        lawyerId,
        employeeId,
        date: today,
        checkIn: checkInTime,
        checkInMethod: checkInMethod || 'manual',
        checkInLocation,
        checkInNote,
        expectedCheckIn,
        expectedCheckOut,
        expectedWorkHours: employee.workingHoursPerDay || 8,
        status: onLeave ? 'on_leave' : (isLate ? 'late' : 'present'),
        isLate,
        lateMinutes,
        leaveId: onLeave?._id,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: isLate ? `تم تسجيل الحضور - متأخر ${lateMinutes} دقيقة` : 'تم تسجيل الحضور بنجاح',
        data: attendance
    });
});

/**
 * Check out employee
 * POST /api/attendance/check-out
 */
const checkOut = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const {
        employeeId,
        checkOutMethod,
        checkOutLocation,
        checkOutNote
    } = req.body;

    if (!employeeId) {
        throw new CustomException('الموظف مطلوب', 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance
    const attendance = await Attendance.findOne({
        employeeId,
        date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
        throw new CustomException('لم يتم تسجيل حضور اليوم', 400);
    }

    if (attendance.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    if (attendance.checkOut) {
        throw new CustomException('تم تسجيل الانصراف مسبقاً', 400);
    }

    const checkOutTime = new Date();

    // Check if early leave
    const isEarlyLeave = checkOutTime < attendance.expectedCheckOut;
    const earlyLeaveMinutes = isEarlyLeave ? Math.round((attendance.expectedCheckOut - checkOutTime) / (1000 * 60)) : 0;

    attendance.checkOut = checkOutTime;
    attendance.checkOutMethod = checkOutMethod || 'manual';
    attendance.checkOutLocation = checkOutLocation;
    attendance.checkOutNote = checkOutNote;
    attendance.isEarlyLeave = isEarlyLeave;
    attendance.earlyLeaveMinutes = earlyLeaveMinutes;

    // Update status if early leave
    if (isEarlyLeave && !attendance.isLate) {
        attendance.status = 'early_leave';
    }

    await attendance.save();

    res.status(200).json({
        success: true,
        message: isEarlyLeave ? `تم تسجيل الانصراف - انصراف مبكر ${earlyLeaveMinutes} دقيقة` : 'تم تسجيل الانصراف بنجاح',
        data: attendance
    });
});

/**
 * Get attendance records
 * GET /api/attendance
 */
const getAttendance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const {
        employeeId,
        status,
        date,
        startDate,
        endDate,
        page = 1,
        limit = 50
    } = req.query;

    const query = { lawyerId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    if (date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);
        query.date = { $gte: targetDate, $lt: nextDate };
    } else if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .sort({ date: -1, checkIn: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Attendance.countDocuments(query);

    res.status(200).json({
        success: true,
        data: attendance,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get attendance by ID
 * GET /api/attendance/:id
 */
const getAttendanceById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const attendance = await Attendance.findById(id)
        .populate('employeeId', 'firstName lastName employeeId department position')
        .populate('verifiedBy', 'firstName lastName')
        .populate('adjustedBy', 'firstName lastName');

    if (!attendance) {
        throw new CustomException('سجل الحضور غير موجود', 404);
    }

    if (attendance.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    res.status(200).json({
        success: true,
        data: attendance
    });
});

/**
 * Get today's attendance
 * GET /api/attendance/today
 */
const getTodayAttendance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.getAttendanceForDate(lawyerId, today);

    // Get all active employees
    const totalEmployees = await Employee.countDocuments({ lawyerId, status: 'active' });
    const presentCount = attendance.filter(a => ['present', 'late', 'work_from_home'].includes(a.status)).length;
    const lateCount = attendance.filter(a => a.isLate).length;
    const absentCount = totalEmployees - attendance.length;

    res.status(200).json({
        success: true,
        data: {
            attendance,
            summary: {
                totalEmployees,
                present: presentCount,
                late: lateCount,
                absent: absentCount,
                onLeave: attendance.filter(a => a.status === 'on_leave').length
            }
        }
    });
});

/**
 * Update attendance record
 * PUT /api/attendance/:id
 */
const updateAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
        throw new CustomException('سجل الحضور غير موجود', 404);
    }

    if (attendance.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    // Store original values if being adjusted
    if (req.body.checkIn || req.body.checkOut) {
        if (!attendance.isManuallyAdjusted) {
            attendance.originalCheckIn = attendance.checkIn;
            attendance.originalCheckOut = attendance.checkOut;
        }
        attendance.isManuallyAdjusted = true;
        attendance.adjustedBy = lawyerId;
        attendance.adjustmentReason = req.body.adjustmentReason || 'تعديل يدوي';
    }

    const allowedFields = [
        'checkIn', 'checkOut', 'status', 'lateExcused', 'earlyLeaveApproved',
        'lateReason', 'earlyLeaveReason', 'overtimeApproved', 'notes'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            attendance[field] = req.body[field];
        }
    });

    await attendance.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث سجل الحضور بنجاح',
        data: attendance
    });
});

/**
 * Create manual attendance record
 * POST /api/attendance/manual
 */
const createManualAttendance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const {
        employeeId,
        date,
        checkIn,
        checkOut,
        status,
        notes
    } = req.body;

    if (!employeeId || !date || !checkIn) {
        throw new CustomException('الحقول المطلوبة: الموظف، التاريخ، وقت الحضور', 400);
    }

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists
    const existingAttendance = await Attendance.hasAttendanceForDate(employeeId, targetDate);
    if (existingAttendance) {
        throw new CustomException('يوجد سجل حضور لهذا التاريخ بالفعل', 400);
    }

    const checkInTime = new Date(checkIn);
    const checkOutTime = checkOut ? new Date(checkOut) : null;

    // Calculate expected times
    const expectedCheckIn = new Date(targetDate);
    expectedCheckIn.setHours(8, 0, 0, 0);

    const expectedCheckOut = new Date(targetDate);
    expectedCheckOut.setHours(8 + (employee.workingHoursPerDay || 8), 0, 0, 0);

    const attendance = await Attendance.create({
        lawyerId,
        employeeId,
        date: targetDate,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        checkInMethod: 'manual',
        checkOutMethod: checkOutTime ? 'manual' : undefined,
        expectedCheckIn,
        expectedCheckOut,
        expectedWorkHours: employee.workingHoursPerDay || 8,
        status: status || 'present',
        isManuallyAdjusted: true,
        adjustedBy: lawyerId,
        adjustmentReason: 'إدخال يدوي',
        notes,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء سجل الحضور بنجاح',
        data: attendance
    });
});

/**
 * Start break
 * POST /api/attendance/:id/break/start
 */
const startBreak = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { type } = req.body;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
        throw new CustomException('سجل الحضور غير موجود', 404);
    }

    if (attendance.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    // Check if there's an active break
    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (activeBreak) {
        throw new CustomException('يوجد استراحة نشطة بالفعل', 400);
    }

    attendance.startBreak(type || 'other');
    await attendance.save();

    res.status(200).json({
        success: true,
        message: 'تم بدء الاستراحة',
        data: attendance
    });
});

/**
 * End break
 * POST /api/attendance/:id/break/end
 */
const endBreak = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
        throw new CustomException('سجل الحضور غير موجود', 404);
    }

    if (attendance.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    // Check if there's an active break
    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (!activeBreak) {
        throw new CustomException('لا توجد استراحة نشطة', 400);
    }

    attendance.endBreak();
    await attendance.save();

    res.status(200).json({
        success: true,
        message: 'تم إنهاء الاستراحة',
        data: attendance
    });
});

/**
 * Approve overtime
 * POST /api/attendance/:id/overtime/approve
 */
const approveOvertime = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
        throw new CustomException('سجل الحضور غير موجود', 404);
    }

    if (attendance.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    attendance.overtimeApproved = true;
    attendance.overtimeApprovedBy = lawyerId;
    await attendance.save();

    res.status(200).json({
        success: true,
        message: 'تمت الموافقة على العمل الإضافي',
        data: attendance
    });
});

/**
 * Get attendance summary for period
 * GET /api/attendance/summary
 */
const getAttendanceSummary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const {
        startDate,
        endDate,
        employeeId
    } = req.query;

    if (!startDate || !endDate) {
        throw new CustomException('تاريخ البدء والانتهاء مطلوبان', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        date: { $gte: start, $lte: end }
    };

    if (employeeId) {
        query.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    const summary = await Attendance.aggregate([
        { $match: query },
        {
            $group: {
                _id: employeeId ? null : '$employeeId',
                totalDays: { $sum: 1 },
                presentDays: {
                    $sum: { $cond: [{ $in: ['$status', ['present', 'work_from_home']] }, 1, 0] }
                },
                lateDays: { $sum: { $cond: ['$isLate', 1, 0] } },
                absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                earlyLeaveDays: { $sum: { $cond: ['$isEarlyLeave', 1, 0] } },
                totalLateMinutes: { $sum: '$lateMinutes' },
                totalOvertimeHours: { $sum: { $cond: ['$overtimeApproved', '$overtimeHours', 0] } },
                totalWorkHours: { $sum: '$totalWorkHours' },
                totalNetWorkHours: { $sum: '$netWorkHours' }
            }
        }
    ]);

    if (!employeeId) {
        // Populate employee info
        await Attendance.populate(summary, {
            path: '_id',
            select: 'firstName lastName employeeId department',
            model: 'Employee'
        });
    }

    res.status(200).json({
        success: true,
        data: summary
    });
});

/**
 * Get late arrivals report
 * GET /api/attendance/late-report
 */
const getLateReport = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const {
        startDate,
        endDate
    } = req.query;

    if (!startDate || !endDate) {
        throw new CustomException('تاريخ البدء والانتهاء مطلوبان', 400);
    }

    const report = await Attendance.getLateArrivalsSummary(
        lawyerId,
        new Date(startDate),
        new Date(endDate)
    );

    res.status(200).json({
        success: true,
        data: report
    });
});

/**
 * Delete attendance record
 * DELETE /api/attendance/:id
 */
const deleteAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
        throw new CustomException('سجل الحضور غير موجود', 404);
    }

    if (attendance.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    await Attendance.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف سجل الحضور بنجاح'
    });
});

/**
 * Mark employee as absent
 * POST /api/attendance/mark-absent
 */
const markAbsent = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { employeeId, date, notes } = req.body;

    if (!employeeId || !date) {
        throw new CustomException('الموظف والتاريخ مطلوبان', 400);
    }

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists
    const existingAttendance = await Attendance.hasAttendanceForDate(employeeId, targetDate);
    if (existingAttendance) {
        throw new CustomException('يوجد سجل حضور لهذا التاريخ بالفعل', 400);
    }

    const attendance = await Attendance.create({
        lawyerId,
        employeeId,
        date: targetDate,
        checkIn: targetDate, // Placeholder
        status: 'absent',
        notes,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم تسجيل الغياب',
        data: attendance
    });
});

module.exports = {
    checkIn,
    checkOut,
    getAttendance,
    getAttendanceById,
    getTodayAttendance,
    updateAttendance,
    createManualAttendance,
    startBreak,
    endBreak,
    approveOvertime,
    getAttendanceSummary,
    getLateReport,
    deleteAttendance,
    markAbsent
};
