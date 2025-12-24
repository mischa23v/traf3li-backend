const CompensationReward = require('../models/compensationReward.model');
const Employee = require('../models/employee.model');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate unique IDs
 */
function generateAllowanceId() {
    return `ALW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateAwardId() {
    return `AWD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateChangeId() {
    return `CHG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateCommunicationId() {
    return `COM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateDocumentId() {
    return `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate service years and months
 */
function calculateServiceTime(hireDate) {
    if (!hireDate) return { years: 0, months: 0 };
    const today = new Date();
    const hire = new Date(hireDate);
    let years = today.getFullYear() - hire.getFullYear();
    let months = today.getMonth() - hire.getMonth();
    if (months < 0) {
        years--;
        months += 12;
    }
    return { years, months, totalMonths: years * 12 + months };
}

/**
 * Validate compensation amounts
 */
function validateCompensationAmount(amount, fieldName = 'Amount') {
    if (amount === undefined || amount === null) {
        return; // Allow undefined/null for optional fields
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
        throw CustomException(`${fieldName} must be a valid number`, 400);
    }

    if (amount < 0) {
        throw CustomException(`${fieldName} cannot be negative`, 400);
    }

    if (amount > 10000000) { // 10 million max
        throw CustomException(`${fieldName} exceeds maximum allowed value`, 400);
    }

    return true;
}

/**
 * Verify record ownership (IDOR protection)
 */
async function verifyRecordOwnership(recordId, firmId, lawyerId) {
    const record = await CompensationReward.findOne({
        $or: [
            { _id: sanitizeObjectId(recordId) },
            { compensationId: recordId }
        ]
    }).lean();

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    // Verify ownership
    if (firmId && record.firmId?.toString() !== firmId.toString()) {
        throw CustomException('غير مصرح لك بالوصول إلى هذا السجل', 403);
    }

    if (!firmId && record.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('غير مصرح لك بالوصول إلى هذا السجل', 403);
    }

    return record;
}

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all compensation records with filtering, pagination, and sorting
 */
const getCompensationRecords = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const {
        search,
        status,
        compaRatioCategory,
        payGrade,
        department,
        officeId,
        reviewStatus,
        fromDate,
        toDate,
        page = 1,
        limit = 20,
        sortBy = 'createdOn',
        sortOrder = 'desc'
    } = req.query;

    const query = { ...baseQuery };

    // Search filter
    if (search) {
        query.$or = [
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } },
            { recordNumber: { $regex: search, $options: 'i' } },
            { employeeNumber: { $regex: search, $options: 'i' } },
            { compensationId: { $regex: search, $options: 'i' } },
            { department: { $regex: search, $options: 'i' } },
            { jobTitle: { $regex: search, $options: 'i' } }
        ];
    }

    // Field filters
    if (status) query.status = status;
    if (compaRatioCategory) query.compaRatioCategory = compaRatioCategory;
    if (payGrade) query.payGrade = payGrade;
    if (department) query.department = department;
    if (officeId) query.officeId = officeId;
    if (reviewStatus) query['salaryReview.reviewStatus'] = reviewStatus;

    // Date range filter
    if (fromDate || toDate) {
        query.effectiveDate = {};
        if (fromDate) query.effectiveDate.$gte = new Date(fromDate);
        if (toDate) query.effectiveDate.$lte = new Date(toDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const [records, total] = await Promise.all([
        CompensationReward.find(query)
            .populate('employeeId', 'employeeId personalInfo employment')
            .sort({ [sortBy]: sortDirection })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        CompensationReward.countDocuments(query)
    ]);

    return res.json({
        success: true,
        data: records,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
});

/**
 * Get compensation statistics
 */
const getCompensationStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const { officeId } = req.query;
    if (officeId) baseQuery.officeId = officeId;

    const [stats] = await CompensationReward.aggregate([
        { $match: { ...baseQuery, status: 'active' } },
        {
            $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                activeRecords: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                averageBasicSalary: { $avg: '$basicSalary' },
                averageGrossSalary: { $avg: '$grossSalary' },
                averageCompaRatio: { $avg: '$compaRatio' },
                belowRangeCount: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'below_range'] }, 1, 0] } },
                aboveRangeCount: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'above_range'] }, 1, 0] } },
                pendingReviews: {
                    $sum: {
                        $cond: [
                            { $in: ['$salaryReview.reviewStatus', ['in_progress', 'pending_approval']] },
                            1,
                            0
                        ]
                    }
                },
                totalPayroll: { $sum: '$grossSalary' },
                minSalary: { $min: '$basicSalary' },
                maxSalary: { $max: '$basicSalary' }
            }
        }
    ]);

    // Get by department
    const byDepartment = await CompensationReward.aggregate([
        { $match: { ...baseQuery, status: 'active' } },
        {
            $group: {
                _id: '$department',
                count: { $sum: 1 },
                avgSalary: { $avg: '$basicSalary' },
                totalPayroll: { $sum: '$grossSalary' }
            }
        },
        { $sort: { totalPayroll: -1 } }
    ]);

    // Get by pay grade
    const byPayGrade = await CompensationReward.aggregate([
        { $match: { ...baseQuery, status: 'active' } },
        {
            $group: {
                _id: '$payGrade',
                count: { $sum: 1 },
                avgSalary: { $avg: '$basicSalary' },
                avgCompaRatio: { $avg: '$compaRatio' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Get by compa-ratio category
    const byCompaRatio = await CompensationReward.aggregate([
        { $match: { ...baseQuery, status: 'active' } },
        {
            $group: {
                _id: '$compaRatioCategory',
                count: { $sum: 1 }
            }
        }
    ]);

    return res.json({
        success: true,
        stats: stats || {
            totalRecords: 0,
            activeRecords: 0,
            averageBasicSalary: 0,
            averageGrossSalary: 0,
            averageCompaRatio: 1,
            belowRangeCount: 0,
            aboveRangeCount: 0,
            pendingReviews: 0,
            totalPayroll: 0,
            minSalary: 0,
            maxSalary: 0
        },
        byDepartment,
        byPayGrade,
        byCompaRatio: Object.fromEntries(byCompaRatio.map(c => [c._id, c.count]))
    });
});

/**
 * Get pay grade analysis
 */
const getPayGradeAnalysis = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { payGrade } = req.params;

    const match = firmId
        ? { firmId: new (require('mongoose').Types.ObjectId)(firmId) }
        : { lawyerId: new (require('mongoose').Types.ObjectId)(lawyerId) };
    match.status = 'active';
    match.payGrade = payGrade;

    const [analysis] = await CompensationReward.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                averageSalary: { $avg: '$basicSalary' },
                minSalary: { $min: '$basicSalary' },
                maxSalary: { $max: '$basicSalary' },
                averageCompaRatio: { $avg: '$compaRatio' },
                rangeMin: { $first: '$salaryRangeMin' },
                rangeMid: { $first: '$salaryRangeMid' },
                rangeMax: { $first: '$salaryRangeMax' },
                belowRange: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'below_range'] }, 1, 0] } },
                inRangeLow: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'in_range_low'] }, 1, 0] } },
                inRangeMid: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'in_range_mid'] }, 1, 0] } },
                inRangeHigh: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'in_range_high'] }, 1, 0] } },
                aboveRange: { $sum: { $cond: [{ $eq: ['$compaRatioCategory', 'above_range'] }, 1, 0] } }
            }
        }
    ]);

    // Get employees in this pay grade
    const employees = await CompensationReward.find({
        ...match
    })
        .select('employeeName employeeNumber basicSalary compaRatio compaRatioCategory')
        .sort({ basicSalary: -1 })
        .lean();

    return res.json({
        success: true,
        payGrade,
        analysis: analysis || { count: 0 },
        employees
    });
});

/**
 * Get single compensation record
 */
const getCompensationRecord = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [
            { _id: sanitizeObjectId(req.params.id) },
            { compensationId: req.params.id }
        ],
        ...baseQuery
    }).populate('employeeId', 'employeeId personalInfo employment compensation');

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    return res.json({
        success: true,
        record
    });
});

/**
 * Get compensation by employee
 */
const getEmployeeCompensation = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const { employeeId } = req.params;

    // Sanitize employeeId
    const sanitizedEmployeeId = sanitizeObjectId(employeeId);

    // IDOR protection - verify employee belongs to the same firm/lawyer
    const employee = await Employee.findById(sanitizedEmployeeId);
    if (employee) {
        if (firmId && employee.firmId?.toString() !== firmId.toString()) {
            throw CustomException('غير مصرح لك بالوصول إلى هذا الموظف', 403);
        }
        if (!firmId && employee.lawyerId?.toString() !== lawyerId.toString()) {
            throw CustomException('غير مصرح لك بالوصول إلى هذا الموظف', 403);
        }
    }

    const records = await CompensationReward.find({
        employeeId: sanitizedEmployeeId,
        ...baseQuery
    }).sort({ effectiveDate: -1 });

    return res.json({
        success: true,
        records,
        total: records.length
    });
});

/**
 * Create new compensation record
 */
const createCompensationRecord = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = [
        'employeeId', 'basicSalary', 'payGrade', 'salaryRangeMin', 'salaryRangeMid',
        'salaryRangeMax', 'effectiveDate', 'officeId', 'allowances', 'housingAllowance',
        'transportationAllowance', 'mobileAllowance', 'educationAllowance', 'mealAllowance',
        'currency', 'paymentFrequency', 'variableCompensation', 'deductions', 'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        employeeId,
        basicSalary,
        payGrade,
        salaryRangeMin,
        salaryRangeMid,
        salaryRangeMax,
        effectiveDate,
        ...otherData
    } = sanitizedData;

    // Input validation for compensation amounts
    validateCompensationAmount(basicSalary, 'Basic salary');
    validateCompensationAmount(salaryRangeMin, 'Salary range minimum');
    validateCompensationAmount(salaryRangeMid, 'Salary range midpoint');
    validateCompensationAmount(salaryRangeMax, 'Salary range maximum');

    // Validate employee and ownership
    const employee = await Employee.findById(sanitizeObjectId(employeeId));
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // IDOR protection - verify employee belongs to the same firm/lawyer
    if (firmId && employee.firmId?.toString() !== firmId.toString()) {
        throw CustomException('غير مصرح لك بالوصول إلى هذا الموظف', 403);
    }
    if (!firmId && employee.lawyerId?.toString() !== lawyerId.toString()) {
        throw CustomException('غير مصرح لك بالوصول إلى هذا الموظف', 403);
    }

    // Check for existing active compensation
    const existingActive = await CompensationReward.findOne({
        employeeId,
        status: 'active'
    });

    if (existingActive) {
        // Mark existing as historical
        existingActive.status = 'historical';
        await existingActive.save();
    }

    // Extract employee info
    const employeeName = employee.personalInfo?.fullNameEnglish ||
        employee.personalInfo?.fullNameArabic ||
        `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim();
    const employeeNameAr = employee.personalInfo?.fullNameArabic;
    const employeeNumber = employee.employeeId;
    const department = employee.employment?.department;
    const departmentId = employee.employment?.departmentId;
    const jobTitle = employee.employment?.jobTitle;
    const jobTitleAr = employee.employment?.jobTitleAr;

    // Calculate service time
    const serviceTime = calculateServiceTime(employee.employment?.hireDate);

    // Add allowance IDs
    if (otherData.allowances && otherData.allowances.length > 0) {
        otherData.allowances = otherData.allowances.map(a => ({
            ...a,
            allowanceId: generateAllowanceId()
        }));
    }

    // Create record
    const record = new CompensationReward({
        firmId: firmId || undefined,
        lawyerId: !firmId ? lawyerId : undefined,
        employeeId,
        employeeName,
        employeeNameAr,
        employeeNumber,
        department,
        departmentId,
        jobTitle,
        jobTitleAr,
        basicSalary,
        payGrade,
        salaryRangeMin,
        salaryRangeMid,
        salaryRangeMax,
        effectiveDate: effectiveDate || new Date(),
        status: 'active',
        employeeDetails: {
            employmentType: employee.employment?.employmentType,
            contractType: employee.employment?.contractType,
            hireDate: employee.employment?.hireDate,
            serviceYears: serviceTime.years,
            serviceMonths: serviceTime.months,
            isSaudi: employee.personalInfo?.nationality === 'Saudi' || employee.personalInfo?.isSaudi,
            nationality: employee.personalInfo?.nationality,
            maritalStatus: employee.personalInfo?.maritalStatus,
            numberOfDependents: employee.personalInfo?.numberOfDependents || 0
        },
        createdBy: req.userID,
        ...otherData
    });

    await record.save();

    return res.status(201).json({
        success: true,
        message: 'Compensation record created successfully',
        record
    });
});

/**
 * Update compensation record
 */
const updateCompensationRecord = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    // Prevent modification of historical records
    if (record.status === 'historical') {
        throw CustomException('Cannot modify historical compensation records', 400);
    }

    // Mass assignment protection
    const allowedUpdateFields = [
        'basicSalary', 'payGrade', 'salaryRangeMin', 'salaryRangeMid', 'salaryRangeMax',
        'effectiveDate', 'officeId', 'allowances', 'housingAllowance', 'transportationAllowance',
        'mobileAllowance', 'educationAllowance', 'mealAllowance', 'currency', 'paymentFrequency',
        'variableCompensation', 'deductions', 'notes', 'status'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedUpdateFields);

    // Input validation for compensation amounts if provided
    if (sanitizedData.basicSalary !== undefined) {
        validateCompensationAmount(sanitizedData.basicSalary, 'Basic salary');
    }
    if (sanitizedData.salaryRangeMin !== undefined) {
        validateCompensationAmount(sanitizedData.salaryRangeMin, 'Salary range minimum');
    }
    if (sanitizedData.salaryRangeMid !== undefined) {
        validateCompensationAmount(sanitizedData.salaryRangeMid, 'Salary range midpoint');
    }
    if (sanitizedData.salaryRangeMax !== undefined) {
        validateCompensationAmount(sanitizedData.salaryRangeMax, 'Salary range maximum');
    }

    // Update fields
    Object.assign(record, sanitizedData);
    record.updatedBy = req.userID;
    await record.save();

    return res.json({
        success: true,
        message: 'Compensation record updated successfully',
        record
    });
});

/**
 * Delete compensation record
 */
const deleteCompensationRecord = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    // Only allow deletion of pending/cancelled records
    if (record.status === 'active') {
        throw CustomException('Cannot delete active compensation records. Mark as cancelled first.', 400);
    }

    await CompensationReward.deleteOne({ _id: record._id });

    return res.json({
        success: true,
        message: 'تم حذف سجل التعويضات بنجاح'
    });
});

/**
 * Bulk delete compensation records
 */
const bulkDeleteRecords = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Please provide an array of record IDs to delete', 400);
    }

    // Limit bulk operations to prevent abuse
    if (ids.length > 100) {
        throw CustomException('Cannot delete more than 100 records at once', 400);
    }

    // Sanitize all IDs
    const sanitizedIds = ids.map(id => {
        try {
            return sanitizeObjectId(id);
        } catch (err) {
            return id; // Keep as string if not a valid ObjectId (might be compensationId)
        }
    });

    // Only delete non-active records
    const result = await CompensationReward.deleteMany({
        $or: [
            { _id: { $in: sanitizedIds } },
            { compensationId: { $in: sanitizedIds } }
        ],
        ...baseQuery,
        status: { $in: ['pending', 'cancelled'] }
    });

    return res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} سجل بنجاح`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// SALARY OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Process salary increase
 */
const processSalaryIncrease = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    // Mass assignment protection
    const allowedFields = [
        'increaseAmount', 'increasePercentage', 'changeType', 'changeReason',
        'effectiveDate', 'performanceRating', 'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        increaseAmount,
        increasePercentage,
        changeType,
        changeReason,
        effectiveDate,
        performanceRating,
        notes
    } = sanitizedData;

    // Input validation
    validateCompensationAmount(increaseAmount, 'Increase amount');
    if (increasePercentage !== undefined) {
        if (typeof increasePercentage !== 'number' || increasePercentage < 0 || increasePercentage > 100) {
            throw CustomException('Increase percentage must be between 0 and 100', 400);
        }
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const record = await CompensationReward.findOne({
            $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
            ...baseQuery
        }).session(session);

        if (!record) {
            throw CustomException('سجل التعويضات غير موجود', 404);
        }

        if (record.status !== 'active') {
            throw CustomException('Can only process increases for active compensation records', 400);
        }

        // Calculate new salary
        let newBasicSalary;
        let actualIncreaseAmount;

        if (increaseAmount) {
            newBasicSalary = record.basicSalary + increaseAmount;
            actualIncreaseAmount = increaseAmount;
        } else if (increasePercentage) {
            actualIncreaseAmount = record.basicSalary * (increasePercentage / 100);
            newBasicSalary = record.basicSalary + actualIncreaseAmount;
        } else {
            throw CustomException('Please provide increaseAmount or increasePercentage', 400);
        }

        // Validate new salary
        validateCompensationAmount(newBasicSalary, 'New basic salary');

        // Add to salary history
        record.salaryHistory.push({
            changeId: generateChangeId(),
            effectiveDate: effectiveDate || new Date(),
            previousBasicSalary: record.basicSalary,
            newBasicSalary,
            previousGrossSalary: record.grossSalary,
            grossSalary: newBasicSalary + record.totalAllowances,
            increaseAmount: actualIncreaseAmount,
            increasePercentage: (actualIncreaseAmount / record.basicSalary) * 100,
            changeType: changeType || 'merit_increase',
            changeReason,
            performanceRating,
            approvedBy: req.userID,
            approvedAt: new Date(),
            annualizedImpact: actualIncreaseAmount * 12,
            notes
        });

        // Update current values
        record.basicSalary = newBasicSalary;
        record.grossSalary = newBasicSalary + record.totalAllowances;
        record.effectiveDate = effectiveDate || new Date();
        record.updatedBy = req.userID;

        // Recalculate compa-ratio
        if (record.salaryRangeMid > 0) {
            record.compaRatio = parseFloat((newBasicSalary / record.salaryRangeMid).toFixed(2));
        }

        // Update salary review status
        if (record.salaryReview) {
            record.salaryReview.lastReviewDate = new Date();
            record.salaryReview.reviewStatus = 'implemented';
            record.salaryReview.implementationStatus = 'processed';
            record.salaryReview.implementationDate = new Date();
        }

        await record.save({ session });
        await session.commitTransaction();

        return res.json({
            success: true,
            message: 'Salary increase processed successfully',
            record,
            increase: {
                previousSalary: record.salaryHistory[record.salaryHistory.length - 1].previousBasicSalary,
                newSalary: newBasicSalary,
                increaseAmount: actualIncreaseAmount,
                increasePercentage: (actualIncreaseAmount / record.salaryHistory[record.salaryHistory.length - 1].previousBasicSalary) * 100
            }
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// ALLOWANCE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Add allowance
 */
const addAllowance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    // Mass assignment protection
    const allowedFields = [
        'allowanceType', 'allowanceName', 'amount', 'frequency', 'taxable',
        'startDate', 'endDate', 'isRecurring', 'description', 'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    validateCompensationAmount(sanitizedData.amount, 'Allowance amount');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    const allowance = {
        ...sanitizedData,
        allowanceId: generateAllowanceId(),
        startDate: sanitizedData.startDate || new Date()
    };

    record.allowances.push(allowance);
    record.updatedBy = req.userID;

    await record.save();

    return res.json({
        success: true,
        message: 'Allowance added successfully',
        record,
        allowance: record.allowances[record.allowances.length - 1]
    });
});

/**
 * Update allowance
 */
const updateAllowance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    // Mass assignment protection
    const allowedFields = [
        'allowanceType', 'allowanceName', 'amount', 'frequency', 'taxable',
        'startDate', 'endDate', 'isRecurring', 'description', 'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (sanitizedData.amount !== undefined) {
        validateCompensationAmount(sanitizedData.amount, 'Allowance amount');
    }

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    const allowanceIndex = record.allowances.findIndex(
        a => a.allowanceId === req.params.allowanceId
    );

    if (allowanceIndex === -1) {
        throw CustomException('البدل غير موجود', 404);
    }

    // Update allowance
    record.allowances[allowanceIndex] = {
        ...record.allowances[allowanceIndex].toObject(),
        ...sanitizedData
    };
    record.updatedBy = req.userID;

    await record.save();

    return res.json({
        success: true,
        message: 'Allowance updated successfully',
        record,
        allowance: record.allowances[allowanceIndex]
    });
});

/**
 * Remove allowance
 */
const removeAllowance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    const allowanceIndex = record.allowances.findIndex(
        a => a.allowanceId === req.params.allowanceId
    );

    if (allowanceIndex === -1) {
        throw CustomException('البدل غير موجود', 404);
    }

    record.allowances.splice(allowanceIndex, 1);
    record.updatedBy = req.userID;

    await record.save();

    return res.json({
        success: true,
        message: 'Allowance removed successfully',
        record
    });
});

// ═══════════════════════════════════════════════════════════════
// BONUS OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Process bonus
 */
const processBonus = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    // Mass assignment protection
    const allowedFields = [
        'year', 'fiscalYear', 'targetBonus', 'actualBonus', 'performanceRating',
        'individualPerformance', 'departmentPerformance', 'companyPerformance',
        'paymentDate', 'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        year,
        fiscalYear,
        targetBonus,
        actualBonus,
        performanceRating,
        individualPerformance,
        departmentPerformance,
        companyPerformance,
        paymentDate,
        notes
    } = sanitizedData;

    // Input validation
    validateCompensationAmount(targetBonus, 'Target bonus');
    validateCompensationAmount(actualBonus, 'Actual bonus');

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const record = await CompensationReward.findOne({
            $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
            ...baseQuery
        }).session(session);

        if (!record) {
            throw CustomException('سجل التعويضات غير موجود', 404);
        }

        // Initialize variable compensation if not exists
        if (!record.variableCompensation) {
            record.variableCompensation = { eligibleForVariablePay: true };
        }
        if (!record.variableCompensation.annualBonus) {
            record.variableCompensation.annualBonus = { eligible: true, bonusHistory: [] };
        }

        const bonusEntry = {
            bonusId: generateChangeId(),
            year: year || new Date().getFullYear(),
            fiscalYear,
            targetBonus,
            actualBonus,
            payoutPercentage: targetBonus > 0 ? (actualBonus / targetBonus) * 100 : 0,
            payoutDate: paymentDate || new Date(),
            performanceRating,
            individualPerformance,
            departmentPerformance,
            companyPerformance,
            paid: true,
            notes
        };

        record.variableCompensation.annualBonus.bonusHistory.push(bonusEntry);
        record.updatedBy = req.userID;

        await record.save({ session });
        await session.commitTransaction();

        return res.json({
            success: true,
            message: 'Bonus processed successfully',
            record,
            bonus: bonusEntry
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// SALARY REVIEW OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Submit for salary review
 */
const submitForReview = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    // Mass assignment protection
    const allowedFields = [
        'recommendationType', 'recommendedIncrease', 'recommendedPercentage', 'justification'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        recommendationType,
        recommendedIncrease,
        recommendedPercentage,
        justification
    } = sanitizedData;

    // Input validation
    validateCompensationAmount(recommendedIncrease, 'Recommended increase');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    // Initialize salary review if not exists
    if (!record.salaryReview) {
        record.salaryReview = { eligibleForReview: true };
    }

    record.salaryReview.reviewStatus = 'pending_approval';
    record.salaryReview.currentReview = {
        reviewId: generateChangeId(),
        reviewPeriod: new Date().getFullYear().toString(),
        recommendedBy: req.userID,
        recommendationDate: new Date(),
        recommendationType,
        recommendedIncrease,
        recommendedPercentage,
        recommendedNewSalary: record.basicSalary + (recommendedIncrease || record.basicSalary * (recommendedPercentage / 100)),
        justification
    };
    record.updatedBy = req.userID;

    await record.save();

    return res.json({
        success: true,
        message: 'Submitted for salary review successfully',
        record
    });
});

/**
 * Approve salary review
 */
const approveReview = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    // Mass assignment protection
    const allowedFields = [
        'approvedIncrease', 'approvedPercentage', 'effectiveDate', 'comments'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        approvedIncrease,
        approvedPercentage,
        effectiveDate,
        comments
    } = sanitizedData;

    // Input validation
    validateCompensationAmount(approvedIncrease, 'Approved increase');

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    if (record.salaryReview?.reviewStatus !== 'pending_approval') {
        throw CustomException('No pending review to approve', 400);
    }

    record.salaryReview.reviewStatus = 'approved';
    record.salaryReview.approvedIncrease = approvedIncrease;
    record.salaryReview.approvedPercentage = approvedPercentage;
    record.salaryReview.approvalDate = new Date();
    record.salaryReview.approvedBy = req.userID;
    record.salaryReview.implementationStatus = 'pending';

    if (comments) {
        record.notes = record.notes || {};
        record.notes.approvalNotes = comments;
    }

    record.updatedBy = req.userID;
    await record.save();

    return res.json({
        success: true,
        message: 'Salary review approved successfully',
        record
    });
});

/**
 * Decline salary review
 */
const declineReview = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    // Mass assignment protection
    const allowedFields = ['reason'];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);
    const { reason } = sanitizedData;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    record.salaryReview.reviewStatus = 'declined';
    if (reason) {
        record.notes = record.notes || {};
        record.notes.approvalNotes = reason;
    }
    record.updatedBy = req.userID;

    await record.save();

    return res.json({
        success: true,
        message: 'Salary review declined',
        record
    });
});

// ═══════════════════════════════════════════════════════════════
// RECOGNITION & AWARDS
// ═══════════════════════════════════════════════════════════════

/**
 * Add recognition award
 */
const addRecognition = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR protection - verify ownership
    await verifyRecordOwnership(req.params.id, firmId, lawyerId);

    // Mass assignment protection
    const allowedFields = [
        'awardType', 'awardName', 'awardCategory', 'description', 'monetaryValue',
        'awardDate', 'recognitionLevel', 'criteria', 'notes'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Input validation for monetary value if provided
    if (sanitizedData.monetaryValue !== undefined) {
        validateCompensationAmount(sanitizedData.monetaryValue, 'Monetary value');
    }

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }
    const record = await CompensationReward.findOne({
        $or: [{ _id: sanitizeObjectId(req.params.id) }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    if (!record.recognitionAwards) {
        record.recognitionAwards = [];
    }

    const award = {
        ...sanitizedData,
        awardId: generateAwardId(),
        awardDate: sanitizedData.awardDate || new Date(),
        awardedBy: req.userID
    };

    record.recognitionAwards.push(award);
    record.updatedBy = req.userID;

    await record.save();

    return res.json({
        success: true,
        message: 'Recognition award added successfully',
        record,
        award: record.recognitionAwards[record.recognitionAwards.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// TOTAL REWARDS STATEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Generate total rewards statement
 */
const generateTotalRewardsStatement = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    // Calculate total rewards
    const annualBasicSalary = record.basicSalary * 12;
    const annualAllowances = record.totalAllowances * 12;
    const totalCashCompensation = annualBasicSalary + annualAllowances;

    let bonusValue = 0;
    if (record.variableCompensation?.annualBonus?.targetAmount) {
        bonusValue = record.variableCompensation.annualBonus.targetAmount;
    }

    const benefitsValue = record.totalRewards?.benefitsValue || 0;
    const perksValue = record.totalRewards?.perksValue || 0;
    const ltiValue = record.longTermIncentives?.endOfServiceBenefit?.accrued || 0;

    const totalRewardsValue = totalCashCompensation + bonusValue + benefitsValue + perksValue + ltiValue;

    // Update record
    record.totalRewards = {
        ...record.totalRewards,
        annualBasicSalary,
        annualAllowances,
        totalCashCompensation: totalCashCompensation + bonusValue,
        targetBonus: bonusValue,
        benefitsValue,
        perksValue,
        longTermIncentivesValue: ltiValue,
        totalRewardsValue,
        cashPercentage: Math.round((totalCashCompensation / totalRewardsValue) * 100),
        benefitsPercentage: Math.round((benefitsValue / totalRewardsValue) * 100),
        perksPercentage: Math.round((perksValue / totalRewardsValue) * 100),
        lastStatementDate: new Date()
    };

    // Update communications
    record.compensationStatementSent = true;
    record.lastStatementDate = new Date();

    record.updatedBy = req.userID;
    await record.save();

    const statement = {
        employeeName: record.employeeName,
        employeeNumber: record.employeeNumber,
        department: record.department,
        jobTitle: record.jobTitle,
        generatedAt: new Date(),
        statementPeriod: new Date().getFullYear().toString(),
        compensation: {
            annualBasicSalary,
            annualAllowances,
            totalCashCompensation,
            breakdown: {
                basicSalary: annualBasicSalary,
                housing: (record.housingAllowance?.amount || 0) * 12,
                transportation: (record.transportationAllowance?.amount || 0) * 12,
                mobile: (record.mobileAllowance?.amount || 0) * 12,
                education: (record.educationAllowance?.totalAmount || 0) * 12,
                meal: (record.mealAllowance?.monthlyAmount || 0) * 12,
                other: record.allowances?.reduce((sum, a) => sum + ((a.amount || 0) * 12), 0) || 0
            }
        },
        variablePay: {
            bonusTarget: bonusValue,
            commissionTarget: record.variableCompensation?.commission?.ytdCommission || 0
        },
        benefits: {
            healthInsurance: record.totalRewards?.healthInsuranceValue || 0,
            lifeInsurance: record.totalRewards?.lifeInsuranceValue || 0,
            pension: record.totalRewards?.pensionContribution || 0,
            gosiEmployer: record.deductions?.gosiEmployerContribution * 12 || 0,
            totalBenefits: benefitsValue
        },
        perks: {
            total: perksValue
        },
        longTermIncentives: {
            endOfServiceBenefit: ltiValue,
            total: ltiValue
        },
        totalRewards: {
            totalCash: totalCashCompensation + bonusValue,
            totalBenefits: benefitsValue,
            totalPerks: perksValue,
            totalLTI: ltiValue,
            grandTotal: totalRewardsValue
        }
    };

    return res.json({
        success: true,
        message: 'Total rewards statement generated successfully',
        record,
        statement
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Export compensation records
 */
const exportCompensation = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const { format = 'json', status, department, payGrade } = req.query;

    const query = { ...baseQuery };
    if (status) query.status = status;
    if (department) query.department = department;
    if (payGrade) query.payGrade = payGrade;

    const records = await CompensationReward.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .lean();

    if (format === 'csv') {
        const headers = [
            'Record Number', 'Employee Name', 'Employee Number', 'Department',
            'Job Title', 'Pay Grade', 'Basic Salary', 'Total Allowances', 'Gross Salary',
            'Compa-Ratio', 'Compa-Ratio Category', 'Effective Date', 'Status', 'Currency'
        ];

        const rows = records.map(r => [
            r.recordNumber,
            r.employeeName,
            r.employeeNumber,
            r.department,
            r.jobTitle,
            r.payGrade,
            r.basicSalary,
            r.totalAllowances,
            r.grossSalary,
            r.compaRatio,
            r.compaRatioCategory,
            r.effectiveDate?.toISOString().split('T')[0],
            r.status,
            r.currency
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=compensation-export.csv');
        return res.send(csv);
    }

    return res.json({
        success: true,
        data: records,
        total: records.length,
        exportedAt: new Date()
    });
});

/**
 * Get pending salary reviews
 */
const getPendingReviews = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const records = await CompensationReward.find({
        ...baseQuery,
        status: 'active',
        'salaryReview.reviewStatus': { $in: ['in_progress', 'pending_approval'] }
    })
        .populate('employeeId', 'employeeId personalInfo')
        .sort({ 'salaryReview.currentReview.recommendationDate': -1 });

    return res.json({
        success: true,
        records,
        total: records.length
    });
});

/**
 * Get compensation by department summary
 */
const getDepartmentSummary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const matchQuery = firmId
        ? { firmId: new (require('mongoose').Types.ObjectId)(firmId) }
        : { lawyerId: new (require('mongoose').Types.ObjectId)(lawyerId) };
    matchQuery.status = 'active';

    const summary = await CompensationReward.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$department',
                headcount: { $sum: 1 },
                totalBasicSalary: { $sum: '$basicSalary' },
                totalGrossSalary: { $sum: '$grossSalary' },
                avgBasicSalary: { $avg: '$basicSalary' },
                avgGrossSalary: { $avg: '$grossSalary' },
                avgCompaRatio: { $avg: '$compaRatio' },
                minSalary: { $min: '$basicSalary' },
                maxSalary: { $max: '$basicSalary' }
            }
        },
        { $sort: { totalGrossSalary: -1 } }
    ]);

    return res.json({
        success: true,
        summary
    });
});

// ═══════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // CRUD
    getCompensationRecords,
    getCompensationRecord,
    getEmployeeCompensation,
    createCompensationRecord,
    updateCompensationRecord,
    deleteCompensationRecord,
    bulkDeleteRecords,

    // Statistics & Analysis
    getCompensationStats,
    getPayGradeAnalysis,
    getPendingReviews,
    getDepartmentSummary,

    // Salary Operations
    processSalaryIncrease,

    // Allowance Operations
    addAllowance,
    updateAllowance,
    removeAllowance,

    // Bonus Operations
    processBonus,

    // Salary Review
    submitForReview,
    approveReview,
    declineReview,

    // Recognition
    addRecognition,

    // Total Rewards
    generateTotalRewardsStatement,

    // Export
    exportCompensation
};
