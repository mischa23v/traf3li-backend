const { SalarySlip, Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// ═══════════════════════════════════════════════════════════════
// GET ALL SALARY SLIPS
// GET /api/hr/payroll
// ═══════════════════════════════════════════════════════════════
const getSalarySlips = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        month,
        year,
        status,
        employeeId,
        department,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
    } = req.query;

    // Build query
    const query = firmId ? { firmId } : { lawyerId };

    if (month) query['payPeriod.month'] = parseInt(month);
    if (year) query['payPeriod.year'] = parseInt(year);
    if (status) query['payment.status'] = status;
    if (employeeId) query.employeeId = employeeId;
    if (department) query.department = department;

    if (search) {
        query.$or = [
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } },
            { slipId: { $regex: search, $options: 'i' } },
            { slipNumber: { $regex: search, $options: 'i' } },
            { employeeNumber: { $regex: search, $options: 'i' } }
        ];
    }

    // Build sort
    const sortField = sortBy === 'paymentDate' ? 'payPeriod.paymentDate' :
        sortBy === 'employeeName' ? 'employeeName' :
            sortBy === 'netPay' ? 'netPay' : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const salarySlips = await SalarySlip.find(query)
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('generatedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SalarySlip.countDocuments(query);

    return res.json({
        success: true,
        salarySlips,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE SALARY SLIP
// GET /api/hr/payroll/:id
// ═══════════════════════════════════════════════════════════════
const getSalarySlip = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const salarySlip = await SalarySlip.findById(id)
        .populate('employeeId', 'employeeId personalInfo employment compensation')
        .populate('generatedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('payment.paidBy', 'firstName lastName');

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? salarySlip.firmId?.toString() === firmId.toString()
        : salarySlip.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    return res.json({
        success: true,
        salarySlip
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE SALARY SLIP
// POST /api/hr/payroll
// ═══════════════════════════════════════════════════════════════
const createSalarySlip = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        employeeId,
        payPeriod,
        earnings,
        deductions,
        payment
    } = req.body;

    // Validate required fields
    if (!employeeId) {
        throw CustomException('Employee ID is required', 400);
    }
    if (!payPeriod?.month || !payPeriod?.year) {
        throw CustomException('Pay period month and year are required', 400);
    }
    if (!earnings?.basicSalary && earnings?.basicSalary !== 0) {
        throw CustomException('Basic salary is required', 400);
    }

    // Fetch employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // Check access to employee
    const hasEmployeeAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasEmployeeAccess) {
        throw CustomException('Access denied to this employee', 403);
    }

    // Check for existing slip
    const existingSlip = await SalarySlip.findOne({
        employeeId,
        'payPeriod.month': payPeriod.month,
        'payPeriod.year': payPeriod.year,
        $or: [{ firmId }, { lawyerId }]
    });

    if (existingSlip) {
        throw CustomException('Salary slip already exists for this employee in this period', 400);
    }

    // Calculate GOSI
    const isSaudi = employee.personalInfo?.isSaudi !== false;
    const gosiEmployeeRate = isSaudi ? 9.75 : 0;
    const gosiEmployerRate = isSaudi ? 12.75 : 2;
    const gosi = Math.round(earnings.basicSalary * (gosiEmployeeRate / 100));
    const gosiEmployer = Math.round(earnings.basicSalary * (gosiEmployerRate / 100));

    // Prepare salary slip data
    const slipData = {
        employeeId,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        nationalId: employee.personalInfo?.nationalId,
        jobTitle: employee.employment?.jobTitle || employee.employment?.jobTitleArabic,
        department: employee.employment?.departmentName || employee.organization?.departmentName,

        payPeriod: {
            month: payPeriod.month,
            year: payPeriod.year,
            calendarType: payPeriod.calendarType || 'gregorian',
            periodStart: payPeriod.periodStart,
            periodEnd: payPeriod.periodEnd,
            paymentDate: payPeriod.paymentDate,
            workingDays: payPeriod.workingDays || 22,
            daysWorked: payPeriod.daysWorked || payPeriod.workingDays || 22
        },

        earnings: {
            basicSalary: earnings.basicSalary,
            allowances: earnings.allowances || [],
            overtime: earnings.overtime || { hours: 0, rate: 1.5 },
            bonus: earnings.bonus || 0,
            commission: earnings.commission || 0,
            arrears: earnings.arrears || 0
        },

        deductions: {
            gosi,
            gosiEmployer,
            loans: deductions?.loans || 0,
            advances: deductions?.advances || 0,
            absences: deductions?.absences || 0,
            lateDeductions: deductions?.lateDeductions || 0,
            violations: deductions?.violations || 0,
            otherDeductions: deductions?.otherDeductions || 0
        },

        payment: {
            paymentMethod: payment?.paymentMethod || employee.compensation?.paymentMethod || 'bank_transfer',
            bankName: payment?.bankName || employee.compensation?.bankDetails?.bankName,
            iban: payment?.iban || employee.compensation?.bankDetails?.iban,
            status: 'draft'
        },

        wps: {
            required: true,
            submitted: false
        },

        generatedOn: new Date(),
        generatedBy: lawyerId,
        firmId,
        lawyerId
    };

    const salarySlip = await SalarySlip.create(slipData);

    return res.status(201).json({
        success: true,
        message: 'Salary slip created successfully',
        salarySlip
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE SALARY SLIP
// PUT /api/hr/payroll/:id
// ═══════════════════════════════════════════════════════════════
const updateSalarySlip = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const salarySlip = await SalarySlip.findById(id);

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? salarySlip.firmId?.toString() === firmId.toString()
        : salarySlip.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow updates if status is draft
    if (salarySlip.payment.status !== 'draft') {
        throw CustomException('Only draft salary slips can be updated', 400);
    }

    const { payPeriod, earnings, deductions, payment, notes } = req.body;

    // Update fields
    if (payPeriod) {
        Object.keys(payPeriod).forEach(key => {
            salarySlip.payPeriod[key] = payPeriod[key];
        });
    }

    if (earnings) {
        Object.keys(earnings).forEach(key => {
            salarySlip.earnings[key] = earnings[key];
        });

        // Recalculate GOSI if basicSalary changed
        if (earnings.basicSalary !== undefined) {
            const employee = await Employee.findById(salarySlip.employeeId);
            const isSaudi = employee?.personalInfo?.isSaudi !== false;
            const gosiEmployeeRate = isSaudi ? 9.75 : 0;
            const gosiEmployerRate = isSaudi ? 12.75 : 2;
            salarySlip.deductions.gosi = Math.round(earnings.basicSalary * (gosiEmployeeRate / 100));
            salarySlip.deductions.gosiEmployer = Math.round(earnings.basicSalary * (gosiEmployerRate / 100));
        }
    }

    if (deductions) {
        Object.keys(deductions).forEach(key => {
            if (key !== 'gosi' && key !== 'gosiEmployer') { // Don't override GOSI
                salarySlip.deductions[key] = deductions[key];
            }
        });
    }

    if (payment) {
        Object.keys(payment).forEach(key => {
            if (key !== 'status') { // Don't update status directly
                salarySlip.payment[key] = payment[key];
            }
        });
    }

    if (notes !== undefined) {
        salarySlip.notes = notes;
    }

    await salarySlip.save();

    return res.json({
        success: true,
        message: 'Salary slip updated successfully',
        salarySlip
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE SALARY SLIP
// DELETE /api/hr/payroll/:id
// ═══════════════════════════════════════════════════════════════
const deleteSalarySlip = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const salarySlip = await SalarySlip.findById(id);

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? salarySlip.firmId?.toString() === firmId.toString()
        : salarySlip.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow deletion if status is draft
    if (salarySlip.payment.status !== 'draft') {
        throw CustomException('Only draft salary slips can be deleted', 400);
    }

    await SalarySlip.findByIdAndDelete(id);

    return res.json({
        success: true,
        message: 'Salary slip deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE SALARY SLIP
// POST /api/hr/payroll/:id/approve
// ═══════════════════════════════════════════════════════════════
const approveSalarySlip = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { comments } = req.body;

    const salarySlip = await SalarySlip.findById(id);

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? salarySlip.firmId?.toString() === firmId.toString()
        : salarySlip.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow approval if status is draft
    if (salarySlip.payment.status !== 'draft') {
        throw CustomException('Only draft salary slips can be approved', 400);
    }

    salarySlip.payment.status = 'approved';
    salarySlip.approvedBy = lawyerId;
    salarySlip.approvedOn = new Date();
    if (comments) {
        salarySlip.notes = (salarySlip.notes ? salarySlip.notes + '\n' : '') + `Approval: ${comments}`;
    }

    await salarySlip.save();

    return res.json({
        success: true,
        message: 'Salary slip approved successfully',
        salarySlip
    });
});

// ═══════════════════════════════════════════════════════════════
// MARK SALARY SLIP AS PAID
// POST /api/hr/payroll/:id/pay
// ═══════════════════════════════════════════════════════════════
const paySalarySlip = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { transactionReference, paidOn } = req.body;

    const salarySlip = await SalarySlip.findById(id);

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? salarySlip.firmId?.toString() === firmId.toString()
        : salarySlip.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow payment if status is approved or processing
    if (!['approved', 'processing'].includes(salarySlip.payment.status)) {
        throw CustomException('Only approved salary slips can be marked as paid', 400);
    }

    salarySlip.payment.status = 'paid';
    salarySlip.payment.paidOn = paidOn ? new Date(paidOn) : new Date();
    salarySlip.payment.paidBy = lawyerId;
    if (transactionReference) {
        salarySlip.payment.transactionReference = transactionReference;
    }

    await salarySlip.save();

    return res.json({
        success: true,
        message: 'Salary slip marked as paid',
        salarySlip
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PAYROLL STATS
// GET /api/hr/payroll/stats
// ═══════════════════════════════════════════════════════════════
const getPayrollStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { month, year } = req.query;

    const stats = await SalarySlip.getStats(firmId, lawyerId, month, year);

    return res.json({
        success: true,
        stats
    });
});

// ═══════════════════════════════════════════════════════════════
// GENERATE BULK PAYROLL
// POST /api/hr/payroll/generate
// ═══════════════════════════════════════════════════════════════
const generateBulkPayroll = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { month, year, employeeIds } = req.body;

    if (!month || !year) {
        throw CustomException('Month and year are required', 400);
    }

    // Get employees (active only)
    const employeeQuery = firmId ? { firmId } : { lawyerId };
    employeeQuery['employment.employmentStatus'] = 'active';

    if (employeeIds && employeeIds.length > 0) {
        employeeQuery._id = { $in: employeeIds };
    }

    const employees = await Employee.find(employeeQuery);

    if (employees.length === 0) {
        throw CustomException('No active employees found', 400);
    }

    // Check for existing slips (prevent duplicates)
    const existingSlips = await SalarySlip.find({
        'payPeriod.month': parseInt(month),
        'payPeriod.year': parseInt(year),
        employeeId: { $in: employees.map(e => e._id) },
        $or: [{ firmId }, { lawyerId }]
    });
    const existingEmployeeIds = existingSlips.map(s => s.employeeId.toString());

    // Filter out employees with existing slips
    const employeesToProcess = employees.filter(e => !existingEmployeeIds.includes(e._id.toString()));

    if (employeesToProcess.length === 0) {
        return res.json({
            success: true,
            message: 'All employees already have salary slips for this period',
            generated: 0,
            skipped: employees.length,
            salarySlips: []
        });
    }

    // Generate slips for each employee
    const slipsToCreate = employeesToProcess.map(employee =>
        SalarySlip.generateFromEmployee(employee, parseInt(month), parseInt(year), lawyerId, firmId, lawyerId)
    );

    // Bulk insert
    const salarySlips = await SalarySlip.insertMany(slipsToCreate);

    return res.status(201).json({
        success: true,
        message: `Generated ${salarySlips.length} salary slips`,
        generated: salarySlips.length,
        skipped: existingEmployeeIds.length,
        salarySlips
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK APPROVE
// POST /api/hr/payroll/approve
// ═══════════════════════════════════════════════════════════════
const bulkApprove = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { ids } = req.body;

    if (!ids || ids.length === 0) {
        throw CustomException('Salary slip IDs are required', 400);
    }

    const baseQuery = firmId ? { firmId } : { lawyerId };

    const result = await SalarySlip.updateMany(
        {
            _id: { $in: ids },
            ...baseQuery,
            'payment.status': 'draft'
        },
        {
            $set: {
                'payment.status': 'approved',
                approvedBy: lawyerId,
                approvedOn: new Date()
            }
        }
    );

    return res.json({
        success: true,
        message: `Approved ${result.modifiedCount} salary slips`,
        approved: result.modifiedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK PAY
// POST /api/hr/payroll/pay
// ═══════════════════════════════════════════════════════════════
const bulkPay = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { ids, transactionReference } = req.body;

    if (!ids || ids.length === 0) {
        throw CustomException('Salary slip IDs are required', 400);
    }

    const baseQuery = firmId ? { firmId } : { lawyerId };

    const result = await SalarySlip.updateMany(
        {
            _id: { $in: ids },
            ...baseQuery,
            'payment.status': { $in: ['approved', 'processing'] }
        },
        {
            $set: {
                'payment.status': 'paid',
                'payment.paidOn': new Date(),
                'payment.paidBy': lawyerId,
                'payment.transactionReference': transactionReference
            }
        }
    );

    return res.json({
        success: true,
        message: `Marked ${result.modifiedCount} salary slips as paid`,
        paid: result.modifiedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT TO WPS
// POST /api/hr/payroll/wps/submit
// ═══════════════════════════════════════════════════════════════
const submitToWPS = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { ids } = req.body;

    if (!ids || ids.length === 0) {
        throw CustomException('Salary slip IDs are required', 400);
    }

    const baseQuery = firmId ? { firmId } : { lawyerId };

    // Generate WPS reference
    const wpsReference = `WPS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const result = await SalarySlip.updateMany(
        {
            _id: { $in: ids },
            ...baseQuery,
            'payment.status': { $in: ['approved', 'paid'] }
        },
        {
            $set: {
                'wps.submitted': true,
                'wps.submissionDate': new Date(),
                'wps.wpsReferenceNumber': wpsReference,
                'wps.status': 'pending'
            }
        }
    );

    return res.json({
        success: true,
        message: `Submitted ${result.modifiedCount} salary slips to WPS`,
        reference: wpsReference,
        submitted: result.modifiedCount,
        failed: ids.length - result.modifiedCount
    });
});

module.exports = {
    getSalarySlips,
    getSalarySlip,
    createSalarySlip,
    updateSalarySlip,
    deleteSalarySlip,
    approveSalarySlip,
    paySalarySlip,
    getPayrollStats,
    generateBulkPayroll,
    bulkApprove,
    bulkPay,
    submitToWPS
};
