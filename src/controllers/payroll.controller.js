const { SalarySlip, Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, SENSITIVE_FIELDS } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// SALARY FIELD DEFINITIONS & VALIDATION
// ═══════════════════════════════════════════════════════════════

// Allowed fields for earnings - CRITICAL: MUST be explicit whitelist
const ALLOWED_EARNINGS_FIELDS = ['basicSalary', 'allowances', 'overtime', 'bonus', 'commission', 'arrears'];

// Allowed fields for deductions - CRITICAL: excludes calculated GOSI fields
const ALLOWED_DEDUCTIONS_FIELDS = ['loans', 'advances', 'absences', 'lateDeductions', 'violations', 'otherDeductions'];

// Allowed fields for payment info
const ALLOWED_PAYMENT_FIELDS = ['paymentMethod', 'bankName', 'iban'];

// Allowed fields for pay period
const ALLOWED_PAYPERIOD_FIELDS = ['month', 'year', 'calendarType', 'periodStart', 'periodEnd', 'paymentDate', 'workingDays', 'daysWorked'];

/**
 * Validate monetary amount
 * Ensures amount is a positive number and within reasonable limits
 *
 * @param {*} amount - Amount to validate
 * @param {number} maxAmount - Maximum allowed amount (default 10,000,000)
 * @returns {boolean} - True if valid
 * @throws {Error} - If amount is invalid
 */
const validateAmount = (amount, maxAmount = 10000000) => {
    // Check if it's a number
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
        throw new Error('Amount must be a valid number');
    }

    // Must be non-negative
    if (numAmount < 0) {
        throw new Error('Amount cannot be negative');
    }

    // Must not exceed max limit
    if (numAmount > maxAmount) {
        throw new Error(`Amount cannot exceed ${maxAmount}`);
    }

    // Check for excessive decimal places (max 2 for currency)
    if (!/^\d+(\.\d{1,2})?$/.test(numAmount.toString())) {
        throw new Error('Amount can have maximum 2 decimal places');
    }

    return true;
};

/**
 * Validate all monetary amounts in an object
 * Recursive validation of nested amount fields
 */
const validateAllAmounts = (obj, fieldsToCheck = []) => {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
        // Check if this field contains monetary data
        const isAmountField = fieldsToCheck.includes(key) ||
            /salary|amount|price|cost|rate|bonus|commission|arrears|advance|loan|deduction/i.test(key);

        if (isAmountField && value !== null && value !== undefined) {
            if (Array.isArray(value)) {
                // For arrays (like allowances), validate each item
                value.forEach((item, idx) => {
                    if (typeof item === 'object') {
                        validateAllAmounts(item, fieldsToCheck);
                    } else if (typeof item === 'number') {
                        validateAmount(item);
                    }
                });
            } else if (typeof value === 'object') {
                // Recursive validation for nested objects
                validateAllAmounts(value, fieldsToCheck);
            } else if (typeof value === 'number') {
                validateAmount(value);
            }
        }
    }
};

/**
 * Sanitize earnings object with allowlist and validation
 */
const sanitizeEarnings = (earnings) => {
    if (!earnings || typeof earnings !== 'object') {
        throw CustomException('Invalid earnings data', 400);
    }

    // Use strict allowlist - only these fields allowed
    const safeEarnings = pickAllowedFields(earnings, ALLOWED_EARNINGS_FIELDS);

    // Validate all monetary amounts
    validateAllAmounts(safeEarnings, ALLOWED_EARNINGS_FIELDS);

    return safeEarnings;
};

/**
 * Sanitize deductions object with allowlist and validation
 * CRITICAL: Never allow direct manipulation of calculated GOSI
 */
const sanitizeDeductions = (deductions) => {
    if (!deductions || typeof deductions !== 'object') {
        return {};
    }

    // Use strict allowlist - gosi/gosiEmployer are calculated, not user input
    const safeDeductions = pickAllowedFields(deductions, ALLOWED_DEDUCTIONS_FIELDS);

    // Validate all monetary amounts
    validateAllAmounts(safeDeductions, ALLOWED_DEDUCTIONS_FIELDS);

    return safeDeductions;
};

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
    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    if (month) query['payPeriod.month'] = parseInt(month);
    if (year) query['payPeriod.year'] = parseInt(year);
    if (status) query['payment.status'] = status;
    if (employeeId) query.employeeId = employeeId;
    if (department) query.department = department;

    if (search) {
        query.$or = [
            { employeeName: { $regex: escapeRegex(search), $options: 'i' } },
            { employeeNameAr: { $regex: escapeRegex(search), $options: 'i' } },
            { slipId: { $regex: escapeRegex(search), $options: 'i' } },
            { slipNumber: { $regex: escapeRegex(search), $options: 'i' } },
            { employeeNumber: { $regex: escapeRegex(search), $options: 'i' } }
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

    // SECURITY: IDOR Protection - Include ownership in query from the start
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: id };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const salarySlip = await SalarySlip.findOne(query)
        .populate('employeeId', 'employeeId personalInfo employment compensation')
        .populate('generatedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('payment.paidBy', 'firstName lastName');

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
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

    // SECURITY: Validate employeeId is provided and matches IDOR check
    if (!employeeId) {
        throw CustomException('Employee ID is required', 400);
    }

    // SECURITY: IDOR Protection - Fetch employee with ownership verification
    const isSoloLawyer = req.isSoloLawyer;
    const employeeQuery = { _id: employeeId };
    if (isSoloLawyer || !firmId) {
        employeeQuery.lawyerId = lawyerId;
    } else {
        employeeQuery.firmId = firmId;
    }

    const employee = await Employee.findOne(employeeQuery);
    if (!employee) {
        throw CustomException('Employee not found', 404);
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

    // SECURITY: Mass Assignment Protection - Sanitize and validate input
    let safeEarnings;
    try {
        safeEarnings = sanitizeEarnings(earnings);
    } catch (error) {
        throw CustomException(`Earnings validation failed: ${error.message}`, 400);
    }

    let safeDeductions;
    try {
        safeDeductions = sanitizeDeductions(deductions);
    } catch (error) {
        throw CustomException(`Deductions validation failed: ${error.message}`, 400);
    }

    // SECURITY: Validate pay period
    const safePeriod = pickAllowedFields(payPeriod, ALLOWED_PAYPERIOD_FIELDS);
    if (!safePeriod.month || !safePeriod.year) {
        throw CustomException('Month and year are required', 400);
    }

    // SECURITY: CRITICAL - Calculate GOSI on server-side ONLY
    // Never trust user input for calculations
    const isSaudi = employee.personalInfo?.isSaudi !== false;
    const gosiEmployeeRate = isSaudi ? 9.75 : 0;
    const gosiEmployerRate = isSaudi ? 12.75 : 2;
    const basicSalary = safeEarnings.basicSalary || 0;
    const gosi = Math.round(basicSalary * (gosiEmployeeRate / 100));
    const gosiEmployer = Math.round(basicSalary * (gosiEmployerRate / 100));

    // Prepare salary slip data with ONLY server-calculated and validated fields
    const slipData = {
        employeeId,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        nationalId: employee.personalInfo?.nationalId,
        jobTitle: employee.employment?.jobTitle || employee.employment?.jobTitleArabic,
        department: employee.employment?.departmentName || employee.organization?.departmentName,

        payPeriod: {
            month: safePeriod.month,
            year: safePeriod.year,
            calendarType: safePeriod.calendarType || 'gregorian',
            periodStart: safePeriod.periodStart,
            periodEnd: safePeriod.periodEnd,
            paymentDate: safePeriod.paymentDate,
            workingDays: safePeriod.workingDays || 22,
            daysWorked: safePeriod.daysWorked || safePeriod.workingDays || 22
        },

        // SECURITY: Only include user input that passed validation
        earnings: {
            basicSalary: safeEarnings.basicSalary || 0,
            allowances: safeEarnings.allowances || [],
            overtime: safeEarnings.overtime || { hours: 0, rate: 1.5 },
            bonus: safeEarnings.bonus || 0,
            commission: safeEarnings.commission || 0,
            arrears: safeEarnings.arrears || 0
        },

        // SECURITY: Never allow user input for GOSI - always calculated server-side
        deductions: {
            gosi,  // Server-calculated only
            gosiEmployer,  // Server-calculated only
            loans: safeDeductions.loans || 0,
            advances: safeDeductions.advances || 0,
            absences: safeDeductions.absences || 0,
            lateDeductions: safeDeductions.lateDeductions || 0,
            violations: safeDeductions.violations || 0,
            otherDeductions: safeDeductions.otherDeductions || 0
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

    // SECURITY: IDOR Protection - Include ownership in query from the start
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: id };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const salarySlip = await SalarySlip.findOne(query);

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
    }

    // Only allow updates if status is draft
    if (salarySlip.payment.status !== 'draft') {
        throw CustomException('Only draft salary slips can be updated', 400);
    }

    const { payPeriod, earnings, deductions, payment, notes } = req.body;

    // SECURITY: Mass Assignment Protection - Update payPeriod with allowlist only
    if (payPeriod) {
        const safePeriod = pickAllowedFields(payPeriod, ALLOWED_PAYPERIOD_FIELDS);
        Object.assign(salarySlip.payPeriod, safePeriod);
    }

    // SECURITY: Mass Assignment Protection - Update earnings with allowlist and validation
    if (earnings) {
        let safeEarnings;
        try {
            safeEarnings = sanitizeEarnings(earnings);
        } catch (error) {
            throw CustomException(`Earnings validation failed: ${error.message}`, 400);
        }

        // Update only allowed fields
        Object.assign(salarySlip.earnings, safeEarnings);

        // SECURITY: CRITICAL - Recalculate GOSI if basicSalary changed
        // Always calculated server-side, never from user input
        if (safeEarnings.basicSalary !== undefined) {
            const employee = await Employee.findOne({ _id: salarySlip.employeeId, ...req.firmQuery });
            const isSaudi = employee?.personalInfo?.isSaudi !== false;
            const gosiEmployeeRate = isSaudi ? 9.75 : 0;
            const gosiEmployerRate = isSaudi ? 12.75 : 2;
            salarySlip.deductions.gosi = Math.round(safeEarnings.basicSalary * (gosiEmployeeRate / 100));
            salarySlip.deductions.gosiEmployer = Math.round(safeEarnings.basicSalary * (gosiEmployerRate / 100));
        }
    }

    // SECURITY: Mass Assignment Protection - Update deductions with allowlist and validation
    // CRITICAL: NEVER allow direct manipulation of GOSI fields - they are calculated only
    if (deductions) {
        let safeDeductions;
        try {
            safeDeductions = sanitizeDeductions(deductions);
        } catch (error) {
            throw CustomException(`Deductions validation failed: ${error.message}`, 400);
        }

        // Update only allowed deduction fields, NEVER gosi/gosiEmployer
        Object.assign(salarySlip.deductions, safeDeductions);
    }

    // SECURITY: Mass Assignment Protection - Update payment with allowlist
    // CRITICAL: Never allow status update through this endpoint
    if (payment) {
        const safePayment = pickAllowedFields(payment, ALLOWED_PAYMENT_FIELDS);
        Object.assign(salarySlip.payment, safePayment);
        // Explicitly ensure status is NOT modified
        if (salarySlip.payment.status !== 'draft') {
            salarySlip.payment.status = 'draft';
        }
    }

    // SECURITY: Validate notes length to prevent excessively large updates
    if (notes !== undefined) {
        if (typeof notes !== 'string') {
            throw CustomException('Notes must be a string', 400);
        }
        if (notes.length > 5000) {
            throw CustomException('Notes cannot exceed 5000 characters', 400);
        }
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

    // SECURITY: IDOR Protection - Include ownership in query from the start
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: id };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const salarySlip = await SalarySlip.findOne(query);

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
    }

    // Only allow deletion if status is draft
    if (salarySlip.payment.status !== 'draft') {
        throw CustomException('Only draft salary slips can be deleted', 400);
    }

    await SalarySlip.findOneAndDelete(query);

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

    // SECURITY: IDOR Protection - Include ownership in query from the start
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: id };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const salarySlip = await SalarySlip.findOne(query);

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
    }

    // Only allow approval if status is draft
    if (salarySlip.payment.status !== 'draft') {
        throw CustomException('Only draft salary slips can be approved', 400);
    }

    // SECURITY: Validate comments length to prevent excessively large updates
    if (comments) {
        if (typeof comments !== 'string' || comments.length > 1000) {
            throw CustomException('Comments must be a string with max 1000 characters', 400);
        }
        salarySlip.notes = (salarySlip.notes ? salarySlip.notes + '\n' : '') + `Approval: ${comments}`;
    }

    salarySlip.payment.status = 'approved';
    salarySlip.approvedBy = lawyerId;
    salarySlip.approvedOn = new Date();

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

    // SECURITY: IDOR Protection - Include ownership in query from the start
    const isSoloLawyer = req.isSoloLawyer;
    const query = { _id: id };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const salarySlip = await SalarySlip.findOne(query);

    if (!salarySlip) {
        throw CustomException('Salary slip not found', 404);
    }

    // Only allow payment if status is approved or processing
    if (!['approved', 'processing'].includes(salarySlip.payment.status)) {
        throw CustomException('Only approved salary slips can be marked as paid', 400);
    }

    // SECURITY: Validate transaction reference if provided
    if (transactionReference) {
        if (typeof transactionReference !== 'string' || transactionReference.length < 3 || transactionReference.length > 100) {
            throw CustomException('Invalid transaction reference format', 400);
        }
    }

    // SECURITY: Validate paidOn date if provided
    if (paidOn) {
        const paidDate = new Date(paidOn);
        if (isNaN(paidDate.getTime())) {
            throw CustomException('Invalid date format for paidOn', 400);
        }
        // Ensure paidOn is not in the future
        if (paidDate > new Date()) {
            throw CustomException('Payment date cannot be in the future', 400);
        }
    }

    // SECURITY: Transaction Protection - Prevent amount manipulation
    // Never recalculate amounts during payment - use stored values
    const originalNetPay = salarySlip.netPay;
    if (!originalNetPay || originalNetPay <= 0) {
        throw CustomException('Invalid salary slip amount for payment', 400);
    }

    // SECURITY: Update payment with transaction protection
    salarySlip.payment.status = 'paid';
    salarySlip.payment.paidOn = paidOn ? new Date(paidOn) : new Date();
    salarySlip.payment.paidBy = lawyerId;
    if (transactionReference) {
        salarySlip.payment.transactionReference = transactionReference;
    }

    await salarySlip.save();

    // Post to General Ledger
    let glEntry = null;
    try {
        glEntry = await salarySlip.postToGL();
    } catch (error) {
        logger.error('Failed to post payroll to GL:', error.message);
        // Don't fail the payment if GL posting fails - log it for review
    }

    return res.json({
        success: true,
        message: 'Salary slip marked as paid',
        salarySlip,
        glEntryId: glEntry ? glEntry._id : null
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

    // SECURITY: Validate input - month and year
    if (!month || !year) {
        throw CustomException('Month and year are required', 400);
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw CustomException('Invalid month (must be 1-12)', 400);
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        throw CustomException('Invalid year (must be between 2000-2100)', 400);
    }

    // SECURITY: Validate employeeIds if provided
    if (employeeIds && Array.isArray(employeeIds)) {
        // Limit number of employees to process at once
        if (employeeIds.length > 1000) {
            throw CustomException('Maximum 1000 employees can be processed at once', 400);
        }
    }

    // Get employees (active only)
    const isSoloLawyer = req.isSoloLawyer;
    const employeeQuery = {};
    if (isSoloLawyer || !firmId) {
        employeeQuery.lawyerId = lawyerId;
    } else {
        employeeQuery.firmId = firmId;
    }
    employeeQuery['employment.employmentStatus'] = 'active';

    if (employeeIds && employeeIds.length > 0) {
        // SECURITY: Validate all employee IDs belong to user before using
        const validEmployees = await Employee.find({
            _id: { $in: employeeIds },
            ...employeeQuery
        });

        if (validEmployees.length === 0) {
            throw CustomException('No valid employees found for this user', 400);
        }

        employeeQuery._id = { $in: validEmployees.map(e => e._id) };
    }

    const employees = await Employee.find(employeeQuery);

    if (employees.length === 0) {
        throw CustomException('No active employees found', 400);
    }

    // Check for existing slips (prevent duplicates)
    const existingSlips = await SalarySlip.find({
        'payPeriod.month': monthNum,
        'payPeriod.year': yearNum,
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

    // SECURITY: Generate slips for each employee
    // All calculations are done server-side in generateFromEmployee
    const slipsToCreate = employeesToProcess.map(employee =>
        SalarySlip.generateFromEmployee(employee, monthNum, yearNum, lawyerId, firmId, lawyerId)
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

    // SECURITY: Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Salary slip IDs are required', 400);
    }

    // SECURITY: Limit bulk operations to prevent abuse
    if (ids.length > 1000) {
        throw CustomException('Maximum 1000 salary slips can be processed at once', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // SECURITY: Verify all slips belong to user and are in valid state before processing
    const slipsToProcess = await SalarySlip.find({
        _id: { $in: ids },
        ...baseQuery,
        'payment.status': 'draft'
    });

    if (slipsToProcess.length === 0) {
        throw CustomException('No valid salary slips found for approval', 400);
    }

    // SECURITY: Transaction Protection - Validate amounts before approval
    for (const slip of slipsToProcess) {
        if (!slip.netPay || slip.netPay <= 0) {
            throw CustomException(`Invalid amount in salary slip ${slip.slipNumber}`, 400);
        }
    }

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

    // SECURITY: Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Salary slip IDs are required', 400);
    }

    // SECURITY: Limit bulk operations to prevent abuse
    if (ids.length > 1000) {
        throw CustomException('Maximum 1000 salary slips can be processed at once', 400);
    }

    // SECURITY: Validate transaction reference if provided
    if (transactionReference) {
        if (typeof transactionReference !== 'string' || transactionReference.length < 3 || transactionReference.length > 100) {
            throw CustomException('Invalid transaction reference format', 400);
        }
    }

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // SECURITY: Verify all slips belong to user and are in valid state before processing
    const slipsToProcess = await SalarySlip.find({
        _id: { $in: ids },
        ...baseQuery,
        'payment.status': { $in: ['approved', 'processing'] }
    });

    if (slipsToProcess.length === 0) {
        throw CustomException('No valid salary slips found for payment', 400);
    }

    // SECURITY: Transaction Protection - Validate amounts before bulk update
    for (const slip of slipsToProcess) {
        if (!slip.netPay || slip.netPay <= 0) {
            throw CustomException(`Invalid amount in salary slip ${slip.slipNumber}`, 400);
        }
    }

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

    // Post each updated slip to GL
    const updatedSlips = await SalarySlip.find({
        _id: { $in: ids },
        ...baseQuery,
        'payment.status': 'paid'
    });

    let glSuccessCount = 0;
    let glFailCount = 0;
    for (const slip of updatedSlips) {
        try {
            // Only post if not already posted
            if (!slip.glEntryId) {
                await slip.postToGL();
                glSuccessCount++;
            }
        } catch (error) {
            logger.error(`Failed to post payroll to GL for slip ${slip.slipNumber}:`, error.message);
            glFailCount++;
        }
    }

    return res.json({
        success: true,
        message: `Marked ${result.modifiedCount} salary slips as paid`,
        paid: result.modifiedCount,
        glPosted: glSuccessCount,
        glFailed: glFailCount
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

    // SECURITY: Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Salary slip IDs are required', 400);
    }

    // SECURITY: Limit bulk operations to prevent abuse
    if (ids.length > 1000) {
        throw CustomException('Maximum 1000 salary slips can be submitted at once', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // SECURITY: Verify all slips belong to user and are in valid state before processing
    const slipsToProcess = await SalarySlip.find({
        _id: { $in: ids },
        ...baseQuery,
        'payment.status': { $in: ['approved', 'paid'] }
    });

    if (slipsToProcess.length === 0) {
        throw CustomException('No valid salary slips found for WPS submission', 400);
    }

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

// ═══════════════════════════════════════════════════════════════
// BULK DELETE SALARY SLIPS
// POST /api/hr/payroll/bulk-delete
// ═══════════════════════════════════════════════════════════════
const bulkDeleteSalarySlips = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('يجب توفير قائمة المعرفات / IDs list is required', 400);
    }

    // SECURITY: Limit bulk operations to prevent abuse
    if (ids.length > 1000) {
        throw CustomException('Maximum 1000 salary slips can be deleted at once / الحد الأقصى 1000 قسيمة راتب', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // SECURITY: IDOR Protection - Verify all slips belong to user and are in valid state before processing
    const slipsToDelete = await SalarySlip.find({
        _id: { $in: ids },
        ...baseQuery,
        'payment.status': 'draft'
    });

    if (slipsToDelete.length === 0) {
        throw CustomException('No valid draft salary slips found for deletion', 400);
    }

    // Build access query - only delete draft salary slips that belong to the user
    const accessQuery = {
        _id: { $in: ids },
        ...baseQuery,
        'payment.status': 'draft'
    };

    const result = await SalarySlip.deleteMany(accessQuery);

    return res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} قسيمة راتب بنجاح / ${result.deletedCount} salary slip(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

module.exports = {
    getSalarySlips,
    getSalarySlip,
    createSalarySlip,
    updateSalarySlip,
    deleteSalarySlip,
    bulkDeleteSalarySlips,
    approveSalarySlip,
    paySalarySlip,
    getPayrollStats,
    generateBulkPayroll,
    bulkApprove,
    bulkPay,
    submitToWPS
};
