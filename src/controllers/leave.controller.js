const { Leave, Employee } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');

/**
 * Create leave request
 * POST /api/leaves
 */
const createLeave = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const {
        employeeId,
        leaveType,
        startDate,
        endDate,
        isHalfDay,
        halfDayType,
        reason,
        substituteId
    } = req.body;

    // Validate required fields
    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
        throw new CustomException('الحقول المطلوبة: الموظف، نوع الإجازة، تاريخ البدء، تاريخ الانتهاء، السبب', 400);
    }

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
        throw new CustomException('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء', 400);
    }

    // Calculate total days
    let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isHalfDay) {
        totalDays = 0.5;
    }

    // Check for overlapping leaves
    const overlap = await Leave.checkOverlap(employeeId, start, end);
    if (overlap) {
        throw new CustomException('يوجد طلب إجازة متداخل مع هذه الفترة', 400);
    }

    // Get current balance
    const year = start.getFullYear();
    const balance = await Leave.getLeaveBalance(employeeId, leaveType, year);

    // Check if enough balance (except for unpaid and certain types)
    const balanceRequiredTypes = ['annual', 'sick', 'personal'];
    if (balanceRequiredTypes.includes(leaveType) && balance.available < totalDays) {
        throw new CustomException(`رصيد الإجازات غير كافٍ. المتاح: ${balance.available} أيام`, 400);
    }

    const leave = await Leave.create({
        lawyerId,
        employeeId,
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        isHalfDay: isHalfDay || false,
        halfDayType: isHalfDay ? halfDayType : null,
        reason,
        substituteId,
        balanceBeforeRequest: balance.available,
        isPaid: leaveType !== 'unpaid',
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء طلب الإجازة بنجاح',
        data: leave
    });
});

/**
 * Get all leave requests
 * GET /api/leaves
 */
const getLeaves = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const {
        employeeId,
        leaveType,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 50
    } = req.query;

    const query = { lawyerId };

    if (employeeId) query.employeeId = employeeId;
    if (leaveType) query.leaveType = leaveType;
    if (status) query.status = status;

    if (startDate || endDate) {
        query.startDate = {};
        if (startDate) query.startDate.$gte = new Date(startDate);
        if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const leaves = await Leave.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .populate('substituteId', 'firstName lastName employeeId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Leave.countDocuments(query);

    res.status(200).json({
        success: true,
        data: leaves,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get leave by ID
 * GET /api/leaves/:id
 */
const getLeave = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const leave = await Leave.findById(id)
        .populate('employeeId', 'firstName lastName employeeId department position')
        .populate('substituteId', 'firstName lastName employeeId')
        .populate('approvedBy', 'firstName lastName');

    if (!leave) {
        throw new CustomException('طلب الإجازة غير موجود', 404);
    }

    if (leave.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الطلب', 403);
    }

    res.status(200).json({
        success: true,
        data: leave
    });
});

/**
 * Update leave request
 * PUT /api/leaves/:id
 */
const updateLeave = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const leave = await Leave.findById(id);

    if (!leave) {
        throw new CustomException('طلب الإجازة غير موجود', 404);
    }

    if (leave.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الطلب', 403);
    }

    if (leave.status !== 'pending') {
        throw new CustomException('لا يمكن تعديل طلب غير معلق', 400);
    }

    // If dates are being changed, recalculate and check overlap
    if (req.body.startDate || req.body.endDate) {
        const start = req.body.startDate ? new Date(req.body.startDate) : leave.startDate;
        const end = req.body.endDate ? new Date(req.body.endDate) : leave.endDate;

        if (end < start) {
            throw new CustomException('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء', 400);
        }

        const overlap = await Leave.checkOverlap(leave.employeeId, start, end, id);
        if (overlap) {
            throw new CustomException('يوجد طلب إجازة متداخل مع هذه الفترة', 400);
        }

        leave.startDate = start;
        leave.endDate = end;
        leave.totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    const allowedFields = ['leaveType', 'reason', 'substituteId', 'isHalfDay', 'halfDayType', 'notes'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            leave[field] = req.body[field];
        }
    });

    if (leave.isHalfDay) {
        leave.totalDays = 0.5;
    }

    await leave.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث طلب الإجازة بنجاح',
        data: leave
    });
});

/**
 * Approve leave request
 * POST /api/leaves/:id/approve
 */
const approveLeave = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const leave = await Leave.findById(id);

    if (!leave) {
        throw new CustomException('طلب الإجازة غير موجود', 404);
    }

    if (leave.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الطلب', 403);
    }

    if (leave.status !== 'pending') {
        throw new CustomException('طلب الإجازة ليس في انتظار الموافقة', 400);
    }

    // Update employee leave balance
    const employee = await Employee.findById(leave.employeeId);
    if (employee && employee.leaveBalances[leave.leaveType] !== undefined) {
        employee.leaveBalances[leave.leaveType] -= leave.totalDays;
        await employee.save();
        leave.balanceAfterApproval = employee.leaveBalances[leave.leaveType];
    }

    leave.status = 'approved';
    leave.approvedBy = lawyerId;
    leave.approvedAt = new Date();
    leave.returnDate = new Date(leave.endDate);
    leave.returnDate.setDate(leave.returnDate.getDate() + 1);

    await leave.save();

    res.status(200).json({
        success: true,
        message: 'تمت الموافقة على طلب الإجازة',
        data: leave
    });
});

/**
 * Reject leave request
 * POST /api/leaves/:id/reject
 */
const rejectLeave = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { reason } = req.body;

    const leave = await Leave.findById(id);

    if (!leave) {
        throw new CustomException('طلب الإجازة غير موجود', 404);
    }

    if (leave.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الطلب', 403);
    }

    if (leave.status !== 'pending') {
        throw new CustomException('طلب الإجازة ليس في انتظار الموافقة', 400);
    }

    leave.status = 'rejected';
    leave.rejectedBy = lawyerId;
    leave.rejectedAt = new Date();
    leave.rejectionReason = reason;

    await leave.save();

    res.status(200).json({
        success: true,
        message: 'تم رفض طلب الإجازة',
        data: leave
    });
});

/**
 * Cancel leave request
 * POST /api/leaves/:id/cancel
 */
const cancelLeave = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { reason } = req.body;

    const leave = await Leave.findById(id);

    if (!leave) {
        throw new CustomException('طلب الإجازة غير موجود', 404);
    }

    if (leave.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الطلب', 403);
    }

    if (leave.status === 'cancelled') {
        throw new CustomException('طلب الإجازة ملغي بالفعل', 400);
    }

    // If was approved, restore the balance
    if (leave.status === 'approved') {
        const employee = await Employee.findById(leave.employeeId);
        if (employee && employee.leaveBalances[leave.leaveType] !== undefined) {
            employee.leaveBalances[leave.leaveType] += leave.totalDays;
            await employee.save();
        }
    }

    leave.status = 'cancelled';
    leave.cancelledAt = new Date();
    leave.cancellationReason = reason;

    await leave.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء طلب الإجازة',
        data: leave
    });
});

/**
 * Get leave balance for employee
 * GET /api/leaves/balance/:employeeId
 */
const getLeaveBalance = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const { year = new Date().getFullYear() } = req.query;
    const lawyerId = req.userID;

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    const leaveTypes = ['annual', 'sick', 'personal', 'unpaid', 'maternity', 'paternity', 'hajj', 'marriage', 'bereavement'];
    const balances = {};

    for (const type of leaveTypes) {
        balances[type] = await Leave.getLeaveBalance(employeeId, type, parseInt(year));
    }

    res.status(200).json({
        success: true,
        data: {
            employeeId,
            year: parseInt(year),
            balances
        }
    });
});

/**
 * Get employees on leave today
 * GET /api/leaves/today
 */
const getEmployeesOnLeaveToday = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const onLeave = await Leave.getEmployeesOnLeaveToday(lawyerId);

    res.status(200).json({
        success: true,
        data: onLeave,
        count: onLeave.length
    });
});

/**
 * Get leave statistics
 * GET /api/leaves/stats
 */
const getLeaveStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { year = new Date().getFullYear() } = req.query;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const byType = await Leave.getLeaveStats(lawyerId, startDate, endDate);

    const byStatus = await Leave.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                startDate: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalDays: { $sum: '$totalDays' }
            }
        }
    ]);

    const byMonth = await Leave.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                status: 'approved',
                startDate: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { $month: '$startDate' },
                count: { $sum: 1 },
                totalDays: { $sum: '$totalDays' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            year: parseInt(year),
            byType,
            byStatus,
            byMonth
        }
    });
});

/**
 * Delete leave request
 * DELETE /api/leaves/:id
 */
const deleteLeave = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const leave = await Leave.findById(id);

    if (!leave) {
        throw new CustomException('طلب الإجازة غير موجود', 404);
    }

    if (leave.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الطلب', 403);
    }

    if (leave.status === 'approved') {
        throw new CustomException('لا يمكن حذف طلب إجازة معتمد. يرجى إلغاؤه أولاً', 400);
    }

    await Leave.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف طلب الإجازة بنجاح'
    });
});

/**
 * Add attachment to leave
 * POST /api/leaves/:id/attachments
 */
const addAttachment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { fileName, fileUrl, fileKey, fileType } = req.body;

    const leave = await Leave.findById(id);

    if (!leave) {
        throw new CustomException('طلب الإجازة غير موجود', 404);
    }

    if (leave.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الطلب', 403);
    }

    leave.attachments.push({
        fileName,
        fileUrl,
        fileKey,
        fileType,
        uploadedAt: new Date()
    });

    await leave.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة المرفق بنجاح',
        data: leave.attachments
    });
});

module.exports = {
    createLeave,
    getLeaves,
    getLeave,
    updateLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getLeaveBalance,
    getEmployeesOnLeaveToday,
    getLeaveStats,
    deleteLeave,
    addAttachment
};
