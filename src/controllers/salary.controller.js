const { Salary, Employee } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create salary structure for employee
 * POST /api/salaries
 */
const createSalary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const {
        employeeId,
        basicSalary,
        currency,
        paymentFrequency,
        allowances,
        deductions,
        gosiEnabled,
        gosiEmployeePercentage,
        gosiEmployerPercentage,
        gosiBaseSalary,
        effectiveFrom,
        effectiveTo,
        notes
    } = req.body;

    // Validate required fields
    if (!employeeId || !basicSalary || !effectiveFrom) {
        throw new CustomException('الحقول المطلوبة: الموظف، الراتب الأساسي، تاريخ السريان', 400);
    }

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    // Mark any existing active salary as superseded
    await Salary.updateMany(
        { employeeId, status: 'active' },
        { $set: { status: 'superseded', effectiveTo: new Date(effectiveFrom) } }
    );

    const salary = await Salary.create({
        lawyerId,
        employeeId,
        basicSalary,
        currency: currency || 'SAR',
        paymentFrequency: paymentFrequency || 'monthly',
        allowances: allowances || [],
        deductions: deductions || [],
        gosiEnabled: gosiEnabled !== false,
        gosiEmployeePercentage: gosiEmployeePercentage || 9.75,
        gosiEmployerPercentage: gosiEmployerPercentage || 11.75,
        gosiBaseSalary,
        effectiveFrom,
        effectiveTo,
        notes,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء هيكل الراتب بنجاح',
        data: salary
    });
});

/**
 * Get all salaries
 * GET /api/salaries
 */
const getSalaries = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { employeeId, status, page = 1, limit = 50 } = req.query;

    const query = { lawyerId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const salaries = await Salary.find(query)
        .populate('employeeId', 'firstName lastName employeeId department position')
        .sort({ effectiveFrom: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Salary.countDocuments(query);

    res.status(200).json({
        success: true,
        data: salaries,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get salary by ID
 * GET /api/salaries/:id
 */
const getSalary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const salary = await Salary.findById(id)
        .populate('employeeId', 'firstName lastName employeeId department position');

    if (!salary) {
        throw new CustomException('الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الراتب', 403);
    }

    res.status(200).json({
        success: true,
        data: salary
    });
});

/**
 * Get current salary for employee
 * GET /api/salaries/employee/:employeeId/current
 */
const getCurrentSalary = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const lawyerId = req.userID;

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    const salary = await Salary.getCurrentSalary(employeeId);

    if (!salary) {
        throw new CustomException('لم يتم تعريف راتب لهذا الموظف', 404);
    }

    res.status(200).json({
        success: true,
        data: salary
    });
});

/**
 * Get salary history for employee
 * GET /api/salaries/employee/:employeeId/history
 */
const getSalaryHistory = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const lawyerId = req.userID;

    // Verify employee belongs to lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('الموظف غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    const history = await Salary.getSalaryHistory(employeeId);

    res.status(200).json({
        success: true,
        data: history
    });
});

/**
 * Update salary
 * PUT /api/salaries/:id
 */
const updateSalary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const salary = await Salary.findById(id);

    if (!salary) {
        throw new CustomException('الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الراتب', 403);
    }

    const allowedFields = [
        'basicSalary', 'currency', 'paymentFrequency', 'allowances',
        'deductions', 'gosiEnabled', 'gosiEmployeePercentage',
        'gosiEmployerPercentage', 'gosiBaseSalary', 'effectiveTo',
        'status', 'notes'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            salary[field] = req.body[field];
        }
    });

    salary.updatedBy = lawyerId;
    await salary.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث الراتب بنجاح',
        data: salary
    });
});

/**
 * Delete salary
 * DELETE /api/salaries/:id
 */
const deleteSalary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const salary = await Salary.findById(id);

    if (!salary) {
        throw new CustomException('الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الراتب', 403);
    }

    await Salary.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف الراتب بنجاح'
    });
});

/**
 * Add allowance to salary
 * POST /api/salaries/:id/allowances
 */
const addAllowance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { name, nameAr, type, amount, isPercentage, isTaxable } = req.body;

    const salary = await Salary.findById(id);

    if (!salary) {
        throw new CustomException('الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الراتب', 403);
    }

    if (!name || !type || amount === undefined) {
        throw new CustomException('الحقول المطلوبة: الاسم، النوع، المبلغ', 400);
    }

    salary.allowances.push({
        name,
        nameAr,
        type,
        amount,
        isPercentage: isPercentage || false,
        isTaxable: isTaxable !== false,
        isActive: true
    });

    await salary.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة البدل بنجاح',
        data: salary
    });
});

/**
 * Add deduction to salary
 * POST /api/salaries/:id/deductions
 */
const addDeduction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { name, nameAr, type, amount, isPercentage } = req.body;

    const salary = await Salary.findById(id);

    if (!salary) {
        throw new CustomException('الراتب غير موجود', 404);
    }

    if (salary.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الراتب', 403);
    }

    if (!name || !type || amount === undefined) {
        throw new CustomException('الحقول المطلوبة: الاسم، النوع، المبلغ', 400);
    }

    salary.deductions.push({
        name,
        nameAr,
        type,
        amount,
        isPercentage: isPercentage || false,
        isActive: true
    });

    await salary.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة الاستقطاع بنجاح',
        data: salary
    });
});

/**
 * Get salary statistics
 * GET /api/salaries/stats
 */
const getSalaryStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const mongoose = require('mongoose');

    const stats = await Salary.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                status: 'active'
            }
        },
        {
            $group: {
                _id: null,
                totalBasicSalary: { $sum: '$basicSalary' },
                totalGrossSalary: { $sum: '$grossSalary' },
                totalNetSalary: { $sum: '$netSalary' },
                totalAllowances: { $sum: '$totalAllowances' },
                totalDeductions: { $sum: '$totalDeductions' },
                avgBasicSalary: { $avg: '$basicSalary' },
                minBasicSalary: { $min: '$basicSalary' },
                maxBasicSalary: { $max: '$basicSalary' },
                employeeCount: { $sum: 1 }
            }
        }
    ]);

    const byDepartment = await Salary.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                status: 'active'
            }
        },
        {
            $lookup: {
                from: 'employees',
                localField: 'employeeId',
                foreignField: '_id',
                as: 'employee'
            }
        },
        { $unwind: '$employee' },
        {
            $group: {
                _id: '$employee.department',
                totalBasicSalary: { $sum: '$basicSalary' },
                totalGrossSalary: { $sum: '$grossSalary' },
                employeeCount: { $sum: 1 }
            }
        },
        { $sort: { totalGrossSalary: -1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            summary: stats[0] || {
                totalBasicSalary: 0,
                totalGrossSalary: 0,
                totalNetSalary: 0,
                totalAllowances: 0,
                totalDeductions: 0,
                avgBasicSalary: 0,
                minBasicSalary: 0,
                maxBasicSalary: 0,
                employeeCount: 0
            },
            byDepartment
        }
    });
});

module.exports = {
    createSalary,
    getSalaries,
    getSalary,
    getCurrentSalary,
    getSalaryHistory,
    updateSalary,
    deleteSalary,
    addAllowance,
    addDeduction,
    getSalaryStats
};
