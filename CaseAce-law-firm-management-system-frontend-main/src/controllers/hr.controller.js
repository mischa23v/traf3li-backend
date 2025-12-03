const mongoose = require('mongoose');
const Employee = require('../models/employee.model');
const Salary = require('../models/salary.model');
const Payroll = require('../models/payroll.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create employee
 * POST /api/hr/employees
 */
const createEmployee = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const employeeData = { ...req.body, lawyerId };

    // Validate required fields
    if (!employeeData.firstName || !employeeData.lastName || !employeeData.position) {
        throw CustomException('الحقول المطلوبة: الاسم الأول، اسم العائلة، المنصب', 400);
    }

    // Check if email already exists
    if (employeeData.email) {
        const existingEmployee = await Employee.findOne({ lawyerId, email: employeeData.email });
        if (existingEmployee) {
            throw CustomException('يوجد موظف بهذا البريد الإلكتروني بالفعل', 400);
        }
    }

    const employee = await Employee.create(employeeData);

    res.status(201).json({
        success: true,
        message: 'تم إضافة الموظف بنجاح',
        data: employee
    });
});

/**
 * Get employees with filters
 * GET /api/hr/employees
 */
const getEmployees = asyncHandler(async (req, res) => {
    const {
        status,
        department,
        employmentType,
        search,
        page = 1,
        limit = 50
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (status) query.status = status;
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;

    // Search by name, email, or employee ID
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } },
            { position: { $regex: search, $options: 'i' } }
        ];
    }

    const employees = await Employee.find(query)
        .populate('managerId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Employee.countDocuments(query);

    res.status(200).json({
        success: true,
        data: employees,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single employee
 * GET /api/hr/employees/:id
 */
const getEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const employee = await Employee.findById(id).populate('managerId', 'firstName lastName');

    if (!employee) {
        throw CustomException('الموظف غير موجود', 404);
    }

    if (employee.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    // Get salary history
    const salaryHistory = await Salary.find({ employeeId: id, lawyerId })
        .sort({ 'period.year': -1, 'period.month': -1 })
        .limit(12);

    res.status(200).json({
        success: true,
        data: {
            employee,
            salaryHistory
        }
    });
});

/**
 * Update employee
 * PUT /api/hr/employees/:id
 */
const updateEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const employee = await Employee.findById(id);

    if (!employee) {
        throw CustomException('الموظف غير موجود', 404);
    }

    if (employee.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    // Check if email is being changed and already exists
    if (req.body.email && req.body.email !== employee.email) {
        const existingEmployee = await Employee.findOne({
            lawyerId,
            email: req.body.email,
            _id: { $ne: id }
        });
        if (existingEmployee) {
            throw CustomException('يوجد موظف بهذا البريد الإلكتروني بالفعل', 400);
        }
    }

    // Update allowed fields
    Object.keys(req.body).forEach(key => {
        if (key !== 'lawyerId' && key !== 'employeeId') {
            employee[key] = req.body[key];
        }
    });

    await employee.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث بيانات الموظف بنجاح',
        data: employee
    });
});

/**
 * Delete employee
 * DELETE /api/hr/employees/:id
 */
const deleteEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const employee = await Employee.findById(id);

    if (!employee) {
        throw CustomException('الموظف غير موجود', 404);
    }

    if (employee.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    // Check for salary records
    const salaryCount = await Salary.countDocuments({ employeeId: id });
    if (salaryCount > 0) {
        // Soft delete - mark as terminated instead
        employee.status = 'terminated';
        employee.terminationDate = new Date();
        await employee.save();

        return res.status(200).json({
            success: true,
            message: 'تم إنهاء خدمة الموظف (لديه سجلات رواتب)'
        });
    }

    await Employee.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف الموظف بنجاح'
    });
});

/**
 * Get employee statistics
 * GET /api/hr/employees/stats
 */
const getEmployeeStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const totalEmployees = await Employee.countDocuments({ lawyerId });
    const activeEmployees = await Employee.countDocuments({ lawyerId, status: 'active' });

    const byStatus = await Employee.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byDepartment = await Employee.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId) } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    const byEmploymentType = await Employee.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId) } },
        { $group: { _id: '$employmentType', count: { $sum: 1 } } }
    ]);

    // Total salary cost (active employees)
    const salaryCost = await Employee.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId), status: 'active' } },
        {
            $group: {
                _id: null,
                totalBaseSalary: { $sum: '$baseSalary' },
                avgSalary: { $avg: '$baseSalary' }
            }
        }
    ]);

    // New hires this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newHiresThisMonth = await Employee.countDocuments({
        lawyerId,
        hireDate: { $gte: startOfMonth }
    });

    res.status(200).json({
        success: true,
        data: {
            totalEmployees,
            activeEmployees,
            newHiresThisMonth,
            byStatus: byStatus.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byDepartment,
            byEmploymentType,
            salaryCost: {
                totalMonthly: salaryCost[0]?.totalBaseSalary || 0,
                averageSalary: salaryCost[0]?.avgSalary || 0
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SALARY CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create salary record
 * POST /api/hr/salaries
 */
const createSalary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { employeeId, period, baseSalary, allowances, deductions, overtime, bonus, commission } = req.body;

    // Validate employee
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw CustomException('الموظف غير موجود', 404);
    }

    // Check if salary record already exists for this period
    const existingSalary = await Salary.findOne({
        employeeId,
        lawyerId,
        'period.month': period.month,
        'period.year': period.year
    });

    if (existingSalary) {
        throw CustomException('يوجد سجل راتب لهذه الفترة بالفعل', 400);
    }

    const salary = await Salary.create({
        lawyerId,
        employeeId,
        period,
        baseSalary: baseSalary || employee.baseSalary,
        allowances: allowances || employee.allowances,
        deductions: deductions || [],
        overtime: overtime || { hours: 0, rate: 0, amount: 0 },
        bonus: bonus || 0,
        commission: commission || 0
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء سجل الراتب بنجاح',
        data: salary
    });
});

/**
 * Get salaries with filters
 * GET /api/hr/salaries
 */
const getSalaries = asyncHandler(async (req, res) => {
    const {
        employeeId,
        month,
        year,
        status,
        page = 1,
        limit = 50
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (employeeId) query.employeeId = employeeId;
    if (month) query['period.month'] = parseInt(month);
    if (year) query['period.year'] = parseInt(year);
    if (status) query.status = status;

    const salaries = await Salary.find(query)
        .populate('employeeId', 'firstName lastName employeeId department position')
        .sort({ 'period.year': -1, 'period.month': -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Salary.countDocuments(query);

    // Calculate totals
    const totals = await Salary.aggregate([
        { $match: { ...query, lawyerId: new mongoose.Types.ObjectId(lawyerId) } },
        {
            $group: {
                _id: null,
                totalGross: { $sum: '$grossSalary' },
                totalNet: { $sum: '$netSalary' },
                totalDeductions: { $sum: '$totalDeductions' }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: salaries,
        totals: totals[0] || { totalGross: 0, totalNet: 0, totalDeductions: 0 },
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single salary record
 * GET /api/hr/salaries/:id
 */
const getSalary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const salary = await Salary.findById(id)
        .populate('employeeId', 'firstName lastName employeeId department position bankDetails');

    if (!salary) {
        throw CustomException('سجل الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    res.status(200).json({
        success: true,
        data: salary
    });
});

/**
 * Update salary record
 * PUT /api/hr/salaries/:id
 */
const updateSalary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const salary = await Salary.findById(id);

    if (!salary) {
        throw CustomException('سجل الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    if (salary.status === 'paid') {
        throw CustomException('لا يمكن تعديل سجل راتب مدفوع', 400);
    }

    // Update allowed fields
    const allowedFields = ['baseSalary', 'allowances', 'deductions', 'overtime', 'bonus', 'commission', 'status', 'notes'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            salary[field] = req.body[field];
        }
    });

    await salary.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث سجل الراتب بنجاح',
        data: salary
    });
});

/**
 * Delete salary record
 * DELETE /api/hr/salaries/:id
 */
const deleteSalary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const salary = await Salary.findById(id);

    if (!salary) {
        throw CustomException('سجل الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    if (salary.status === 'paid') {
        throw CustomException('لا يمكن حذف سجل راتب مدفوع', 400);
    }

    await Salary.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف سجل الراتب بنجاح'
    });
});

/**
 * Approve salary
 * POST /api/hr/salaries/:id/approve
 */
const approveSalary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const salary = await Salary.findById(id);

    if (!salary) {
        throw CustomException('سجل الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    salary.status = 'approved';
    salary.approvedBy = lawyerId;
    salary.approvedAt = new Date();
    await salary.save();

    res.status(200).json({
        success: true,
        message: 'تمت الموافقة على الراتب بنجاح',
        data: salary
    });
});

/**
 * Mark salary as paid
 * POST /api/hr/salaries/:id/pay
 */
const paySalary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { paymentMethod, paymentReference } = req.body;

    const salary = await Salary.findById(id);

    if (!salary) {
        throw CustomException('سجل الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا السجل', 403);
    }

    if (salary.status !== 'approved') {
        throw CustomException('يجب الموافقة على الراتب أولاً', 400);
    }

    salary.status = 'paid';
    salary.paymentDate = new Date();
    salary.paymentMethod = paymentMethod || 'bank_transfer';
    salary.paymentReference = paymentReference;
    await salary.save();

    res.status(200).json({
        success: true,
        message: 'تم تسجيل دفع الراتب بنجاح',
        data: salary
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYROLL CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create payroll run
 * POST /api/hr/payroll
 */
const createPayroll = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { month, year } = req.body;

    if (!month || !year) {
        throw CustomException('الشهر والسنة مطلوبان', 400);
    }

    // Check if payroll already exists
    const existingPayroll = await Payroll.findOne({
        lawyerId,
        'period.month': month,
        'period.year': year
    });

    if (existingPayroll) {
        throw CustomException('يوجد كشف رواتب لهذه الفترة بالفعل', 400);
    }

    // Get all active employees
    const employees = await Employee.find({ lawyerId, status: 'active' });

    if (employees.length === 0) {
        throw CustomException('لا يوجد موظفين نشطين', 400);
    }

    // Create salary records for each employee
    const salaryRecords = [];
    for (const employee of employees) {
        // Check if salary record exists
        let salary = await Salary.findOne({
            employeeId: employee._id,
            lawyerId,
            'period.month': month,
            'period.year': year
        });

        if (!salary) {
            salary = await Salary.create({
                lawyerId,
                employeeId: employee._id,
                period: { month, year },
                baseSalary: employee.baseSalary,
                allowances: employee.allowances || []
            });
        }

        salaryRecords.push(salary._id);
    }

    // Create payroll
    const payroll = await Payroll.create({
        lawyerId,
        period: {
            month,
            year,
            startDate: new Date(year, month - 1, 1),
            endDate: new Date(year, month, 0)
        },
        salaryRecords,
        processedBy: lawyerId,
        processedAt: new Date()
    });

    await payroll.calculateSummary();
    await payroll.save();

    res.status(201).json({
        success: true,
        message: 'تم إنشاء كشف الرواتب بنجاح',
        data: payroll
    });
});

/**
 * Get payrolls
 * GET /api/hr/payroll
 */
const getPayrolls = asyncHandler(async (req, res) => {
    const { year, status, page = 1, limit = 12 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };

    if (year) query['period.year'] = parseInt(year);
    if (status) query.status = status;

    const payrolls = await Payroll.find(query)
        .populate('processedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .sort({ 'period.year': -1, 'period.month': -1 })
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
 * Get single payroll
 * GET /api/hr/payroll/:id
 */
const getPayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.findById(id)
        .populate('salaryRecords')
        .populate('processedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');

    if (!payroll) {
        throw CustomException('كشف الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا الكشف', 403);
    }

    // Populate employee details in salary records
    await Payroll.populate(payroll, {
        path: 'salaryRecords',
        populate: {
            path: 'employeeId',
            select: 'firstName lastName employeeId department position'
        }
    });

    res.status(200).json({
        success: true,
        data: payroll
    });
});

/**
 * Update payroll
 * PUT /api/hr/payroll/:id
 */
const updatePayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw CustomException('كشف الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا الكشف', 403);
    }

    if (payroll.status === 'paid') {
        throw CustomException('لا يمكن تعديل كشف رواتب مدفوع', 400);
    }

    const allowedFields = ['notes', 'status'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            payroll[field] = req.body[field];
        }
    });

    await payroll.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث كشف الرواتب بنجاح',
        data: payroll
    });
});

/**
 * Delete payroll
 * DELETE /api/hr/payroll/:id
 */
const deletePayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw CustomException('كشف الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا الكشف', 403);
    }

    if (payroll.status === 'paid') {
        throw CustomException('لا يمكن حذف كشف رواتب مدفوع', 400);
    }

    // Delete associated salary records if they are drafts
    await Salary.deleteMany({
        _id: { $in: payroll.salaryRecords },
        status: 'draft'
    });

    await Payroll.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف كشف الرواتب بنجاح'
    });
});

/**
 * Approve payroll
 * POST /api/hr/payroll/:id/approve
 */
const approvePayroll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw CustomException('كشف الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا الكشف', 403);
    }

    // Approve all salary records
    await Salary.updateMany(
        { _id: { $in: payroll.salaryRecords } },
        {
            status: 'approved',
            approvedBy: lawyerId,
            approvedAt: new Date()
        }
    );

    payroll.status = 'approved';
    payroll.approvedBy = lawyerId;
    payroll.approvedAt = new Date();
    await payroll.save();

    res.status(200).json({
        success: true,
        message: 'تمت الموافقة على كشف الرواتب بنجاح',
        data: payroll
    });
});

/**
 * Process payroll payment
 * POST /api/hr/payroll/:id/pay
 */
const processPayrollPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { paymentMethod, paymentReference } = req.body;

    const payroll = await Payroll.findById(id);

    if (!payroll) {
        throw CustomException('كشف الرواتب غير موجود', 404);
    }

    if (payroll.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا الكشف', 403);
    }

    if (payroll.status !== 'approved') {
        throw CustomException('يجب الموافقة على كشف الرواتب أولاً', 400);
    }

    // Mark all salary records as paid
    await Salary.updateMany(
        { _id: { $in: payroll.salaryRecords } },
        {
            status: 'paid',
            paymentDate: new Date(),
            paymentMethod: paymentMethod || 'bank_transfer',
            paymentReference
        }
    );

    payroll.status = 'paid';
    payroll.paymentDate = new Date();
    payroll.paymentMethod = paymentMethod || 'bank_transfer';
    payroll.paymentReference = paymentReference;
    await payroll.save();

    res.status(200).json({
        success: true,
        message: 'تم تسجيل دفع كشف الرواتب بنجاح',
        data: payroll
    });
});

/**
 * Get payroll statistics
 * GET /api/hr/payroll/stats
 */
const getPayrollStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Get current month payroll
    const currentPayroll = await Payroll.findOne({
        lawyerId,
        'period.month': currentMonth,
        'period.year': currentYear
    });

    // Get yearly totals
    const yearlyTotals = await Payroll.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                'period.year': currentYear,
                status: 'paid'
            }
        },
        {
            $group: {
                _id: null,
                totalPaid: { $sum: '$summary.totalNetSalary' },
                totalPayrolls: { $sum: 1 }
            }
        }
    ]);

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Payroll.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                status: 'paid',
                createdAt: { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    month: '$period.month',
                    year: '$period.year'
                },
                totalAmount: { $sum: '$summary.totalNetSalary' },
                employeeCount: { $first: '$summary.totalEmployees' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            currentMonth: {
                payroll: currentPayroll,
                status: currentPayroll?.status || 'not_created'
            },
            yearlyTotals: yearlyTotals[0] || { totalPaid: 0, totalPayrolls: 0 },
            monthlyTrend
        }
    });
});

module.exports = {
    // Employees
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
    // Salaries
    createSalary,
    getSalaries,
    getSalary,
    updateSalary,
    deleteSalary,
    approveSalary,
    paySalary,
    // Payroll
    createPayroll,
    getPayrolls,
    getPayroll,
    updatePayroll,
    deletePayroll,
    approvePayroll,
    processPayrollPayment,
    getPayrollStats
};
