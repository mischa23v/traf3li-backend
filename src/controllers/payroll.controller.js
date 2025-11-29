const { Payroll, Salary, Employee, Attendance, Leave } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');

/**
 * Create/Generate payroll for a period
 * POST /api/payroll
 */
const createPayroll = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const { periodMonth, periodYear, notes } = req.body;

    if (!periodMonth || !periodYear) {
        throw new CustomException('الشهر والسنة مطلوبان', 400);
    }

    // Check if payroll already exists for this period
    const existingPayroll = await Payroll.findOne({
        lawyerId,
        periodMonth,
        periodYear,
        status: { $ne: 'cancelled' }
    });

    if (existingPayroll) {
        throw new CustomException('يوجد مسير رواتب لهذه الفترة بالفعل', 400);
    }

    // Calculate period dates
    const periodStart = new Date(periodYear, periodMonth - 1, 1);
    const periodEnd = new Date(periodYear, periodMonth, 0); // Last day of month

    // Get all active employees
    const employees = await Employee.find({ lawyerId, status: 'active' });

    if (employees.length === 0) {
        throw new CustomException('لا يوجد موظفين نشطين', 400);
    }

    // Generate payroll items for each employee
    const payrollItems = [];

    for (const employee of employees) {
        // Get current salary for employee
        const salary = await Salary.getCurrentSalary(employee._id);

        if (!salary) continue; // Skip if no salary defined

        // Get attendance data for the period
        const attendanceRecords = await Attendance.find({
            employeeId: employee._id,
            date: { $gte: periodStart, $lte: periodEnd }
        });

        // Calculate working days and attendance stats
        let workingDays = 0;
        let actualWorkingDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let overtimeHours = 0;

        // Count expected working days (excluding weekends based on work schedule)
        const currentDate = new Date(periodStart);
        while (currentDate <= periodEnd) {
            const dayOfWeek = currentDate.getDay();
            // For Sunday-Thursday schedule: 0=Sun, 4=Thu are working days
            // For Monday-Friday schedule: 1=Mon, 5=Fri are working days
            if (employee.workSchedule === 'sunday_thursday') {
                if (dayOfWeek >= 0 && dayOfWeek <= 4) workingDays++;
            } else if (employee.workSchedule === 'monday_friday') {
                if (dayOfWeek >= 1 && dayOfWeek <= 5) workingDays++;
            } else {
                if (dayOfWeek >= 0 && dayOfWeek <= 4) workingDays++; // Default
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Process attendance records
        for (const att of attendanceRecords) {
            if (att.status === 'present' || att.status === 'work_from_home') {
                actualWorkingDays++;
            } else if (att.status === 'absent') {
                absentDays++;
            }
            if (att.isLate) lateDays++;
            if (att.overtimeApproved) {
                overtimeHours += att.overtimeHours || 0;
            }
        }

        // Get unpaid leaves for the period
        const unpaidLeaves = await Leave.find({
            employeeId: employee._id,
            leaveType: 'unpaid',
            status: 'approved',
            startDate: { $lte: periodEnd },
            endDate: { $gte: periodStart }
        });

        let unpaidLeaveDays = 0;
        for (const leave of unpaidLeaves) {
            const leaveStart = leave.startDate > periodStart ? leave.startDate : periodStart;
            const leaveEnd = leave.endDate < periodEnd ? leave.endDate : periodEnd;
            const days = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
            unpaidLeaveDays += days;
        }

        // Calculate salary components
        const dailyRate = salary.basicSalary / 30;
        const hourlyRate = dailyRate / (employee.workingHoursPerDay || 8);

        // Calculate allowances
        const allowanceItems = salary.allowances
            .filter(a => a.isActive)
            .map(a => ({
                name: a.name,
                type: a.type,
                amount: a.isPercentage ? (salary.basicSalary * a.amount / 100) : a.amount
            }));
        const totalAllowances = allowanceItems.reduce((sum, a) => sum + a.amount, 0);

        // Calculate deductions
        const deductionItems = salary.deductions
            .filter(d => d.isActive)
            .map(d => ({
                name: d.name,
                type: d.type,
                amount: d.isPercentage ? (salary.basicSalary * d.amount / 100) : d.amount
            }));

        // Calculate GOSI
        const gosiBase = salary.gosiBaseSalary || salary.basicSalary;
        const gosiEmployee = salary.gosiEnabled ? (gosiBase * salary.gosiEmployeePercentage / 100) : 0;
        const gosiEmployer = salary.gosiEnabled ? (gosiBase * salary.gosiEmployerPercentage / 100) : 0;

        // Add GOSI to deductions
        if (gosiEmployee > 0) {
            deductionItems.push({ name: 'التأمينات الاجتماعية', type: 'gosi', amount: gosiEmployee });
        }

        const totalDeductions = deductionItems.reduce((sum, d) => sum + d.amount, 0);

        // Calculate overtime
        const overtimeRate = hourlyRate * 1.5; // 150% for overtime
        const overtimeAmount = overtimeHours * overtimeRate;

        // Calculate unpaid leave deduction
        const unpaidLeaveDeduction = unpaidLeaveDays * dailyRate;

        // Calculate totals
        const grossSalary = salary.basicSalary + totalAllowances + overtimeAmount;
        const netSalary = grossSalary - totalDeductions - unpaidLeaveDeduction;

        payrollItems.push({
            employeeId: employee._id,
            salaryId: salary._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            employeeIdNumber: employee.employeeId,
            department: employee.department,
            position: employee.position,
            bankName: employee.bankName,
            bankAccountNumber: employee.bankAccountNumber,
            iban: employee.iban,
            basicSalary: salary.basicSalary,
            allowances: allowanceItems,
            totalAllowances,
            deductions: deductionItems,
            totalDeductions,
            gosiEmployee,
            gosiEmployer,
            workingDays,
            actualWorkingDays,
            absentDays,
            lateDays,
            overtimeHours,
            overtimeAmount,
            unpaidLeaveDays,
            unpaidLeaveDeduction,
            grossSalary,
            netSalary,
            paymentStatus: 'pending'
        });
    }

    if (payrollItems.length === 0) {
        throw new CustomException('لا يوجد موظفين لديهم رواتب محددة', 400);
    }

    // Create payroll
    const payroll = await Payroll.create({
        lawyerId,
        periodMonth,
        periodYear,
        periodStart,
        periodEnd,
        items: payrollItems,
        notes,
        createdBy: lawyerId
    });

    payroll.addHistory('created', lawyerId, 'تم إنشاء مسير الرواتب');
    await payroll.save();

    res.status(201).json({
        success: true,
        message: 'تم إنشاء مسير الرواتب بنجاح',
        data: payroll
    });
});

/**
 * Get all payrolls
 * GET /api/payroll
 */
const getPayrolls = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { year, status, page = 1, limit = 12 } = req.query;

    const query = { lawyerId };

    if (year) query.periodYear = parseInt(year);
    if (status) query.status = status;

    const payrolls = await Payroll.find(query)
        .select('-items')
        .sort({ periodYear: -1, periodMonth: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Payroll.countDocuments(query);

    res.status(200).json({
        success: true,
        data: payrolls,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get payroll by ID
 * GET /api/payroll/:id
 */
const getPayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.findById(id)
        .populate('items.employeeId', 'firstName lastName employeeId');

    if (!payroll) {
        throw new CustomException('مسير الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا المسير', 403);
    }

    res.status(200).json({
        success: true,
        data: payroll
    });
});

/**
 * Get payroll for specific period
 * GET /api/payroll/period/:year/:month
 */
const getPayrollByPeriod = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.getPayrollForPeriod(lawyerId, parseInt(year), parseInt(month));

    if (!payroll) {
        throw new CustomException('لم يتم العثور على مسير رواتب لهذه الفترة', 404);
    }

    res.status(200).json({
        success: true,
        data: payroll
    });
});

/**
 * Update payroll item
 * PATCH /api/payroll/:id/items/:itemId
 */
const updatePayrollItem = asyncHandler(async (req, res) => {
    const { id, itemId } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw new CustomException('مسير الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا المسير', 403);
    }

    if (payroll.status !== 'draft') {
        throw new CustomException('لا يمكن تعديل مسير رواتب غير مسودة', 400);
    }

    const item = payroll.items.id(itemId);
    if (!item) {
        throw new CustomException('عنصر الراتب غير موجود', 404);
    }

    // Update allowed fields
    const allowedFields = ['bonuses', 'commissions', 'penalties', 'advances', 'loans', 'notes'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            item[field] = req.body[field];
        }
    });

    // Recalculate net salary
    const additionalDeductions = (item.penalties || 0) + (item.advances || 0) + (item.loans || 0);
    const additionalEarnings = (item.bonuses || 0) + (item.commissions || 0);
    item.netSalary = item.grossSalary + additionalEarnings - item.totalDeductions - additionalDeductions - item.unpaidLeaveDeduction;

    payroll.addHistory('item_updated', lawyerId, `تم تحديث راتب ${item.employeeName}`);
    await payroll.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث عنصر الراتب بنجاح',
        data: payroll
    });
});

/**
 * Submit payroll for approval
 * POST /api/payroll/:id/submit
 */
const submitPayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw new CustomException('مسير الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا المسير', 403);
    }

    if (payroll.status !== 'draft') {
        throw new CustomException('لا يمكن إرسال مسير غير مسودة', 400);
    }

    payroll.status = 'pending_approval';
    payroll.submittedBy = lawyerId;
    payroll.submittedAt = new Date();
    payroll.addHistory('submitted', lawyerId, 'تم إرسال مسير الرواتب للموافقة');

    await payroll.save();

    res.status(200).json({
        success: true,
        message: 'تم إرسال مسير الرواتب للموافقة',
        data: payroll
    });
});

/**
 * Approve payroll
 * POST /api/payroll/:id/approve
 */
const approvePayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw new CustomException('مسير الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا المسير', 403);
    }

    if (payroll.status !== 'pending_approval') {
        throw new CustomException('مسير الرواتب ليس في انتظار الموافقة', 400);
    }

    payroll.status = 'approved';
    payroll.approvedBy = lawyerId;
    payroll.approvedAt = new Date();
    payroll.addHistory('approved', lawyerId, 'تمت الموافقة على مسير الرواتب');

    await payroll.save();

    res.status(200).json({
        success: true,
        message: 'تمت الموافقة على مسير الرواتب',
        data: payroll
    });
});

/**
 * Reject payroll
 * POST /api/payroll/:id/reject
 */
const rejectPayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { reason } = req.body;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw new CustomException('مسير الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا المسير', 403);
    }

    payroll.status = 'draft';
    payroll.rejectedBy = lawyerId;
    payroll.rejectedAt = new Date();
    payroll.rejectionReason = reason;
    payroll.addHistory('rejected', lawyerId, `تم رفض مسير الرواتب: ${reason || 'بدون سبب'}`);

    await payroll.save();

    res.status(200).json({
        success: true,
        message: 'تم رفض مسير الرواتب',
        data: payroll
    });
});

/**
 * Process payroll (mark as paid)
 * POST /api/payroll/:id/process
 */
const processPayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { paymentMethod, paymentReference } = req.body;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw new CustomException('مسير الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا المسير', 403);
    }

    if (payroll.status !== 'approved') {
        throw new CustomException('مسير الرواتب غير معتمد', 400);
    }

    // Update all items to paid
    payroll.items.forEach(item => {
        item.paymentStatus = 'paid';
        item.paymentDate = new Date();
        item.paymentMethod = paymentMethod || 'bank_transfer';
        item.paymentReference = paymentReference;
    });

    payroll.status = 'completed';
    payroll.processedBy = lawyerId;
    payroll.processedAt = new Date();
    payroll.completedAt = new Date();
    payroll.addHistory('completed', lawyerId, 'تم صرف الرواتب');

    await payroll.save();

    res.status(200).json({
        success: true,
        message: 'تم صرف الرواتب بنجاح',
        data: payroll
    });
});

/**
 * Get yearly summary
 * GET /api/payroll/summary/:year
 */
const getYearlySummary = asyncHandler(async (req, res) => {
    const { year } = req.params;
    const lawyerId = req.userID;

    const summary = await Payroll.getYearlySummary(lawyerId, parseInt(year));

    // Fill in missing months
    const fullSummary = [];
    for (let month = 1; month <= 12; month++) {
        const monthData = summary.find(s => s._id === month);
        fullSummary.push({
            month,
            totalNetSalary: monthData?.totalNetSalary || 0,
            totalGrossSalary: monthData?.totalGrossSalary || 0,
            totalGosiEmployer: monthData?.totalGosiEmployer || 0,
            totalEmployees: monthData?.totalEmployees || 0
        });
    }

    res.status(200).json({
        success: true,
        data: fullSummary
    });
});

/**
 * Delete payroll
 * DELETE /api/payroll/:id
 */
const deletePayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw new CustomException('مسير الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا المسير', 403);
    }

    if (payroll.status === 'completed') {
        throw new CustomException('لا يمكن حذف مسير رواتب مكتمل', 400);
    }

    await Payroll.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف مسير الرواتب بنجاح'
    });
});

module.exports = {
    createPayroll,
    getPayrolls,
    getPayroll,
    getPayrollByPeriod,
    updatePayrollItem,
    submitPayroll,
    approvePayroll,
    rejectPayroll,
    processPayroll,
    getYearlySummary,
    deletePayroll
};
