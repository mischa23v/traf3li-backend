const CompensationReward = require('../models/compensationReward.model');
const Employee = require('../models/employee.model');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

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

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all compensation records with filtering, pagination, and sorting
 */
const getCompensationRecords = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

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
    const baseQuery = firmId ? { firmId } : { lawyerId };

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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const record = await CompensationReward.findOne({
        $or: [
            { _id: req.params.id },
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
    const baseQuery = firmId ? { firmId } : { lawyerId };
    const { employeeId } = req.params;

    const records = await CompensationReward.find({
        employeeId,
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

    const {
        employeeId,
        basicSalary,
        payGrade,
        salaryRangeMin,
        salaryRangeMid,
        salaryRangeMax,
        effectiveDate,
        ...otherData
    } = req.body;

    // Validate employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    // Prevent modification of historical records
    if (record.status === 'historical') {
        throw CustomException('Cannot modify historical compensation records', 400);
    }

    // Update fields
    const updateFields = { ...req.body, updatedBy: req.userID };
    delete updateFields.compensationId;
    delete updateFields.recordNumber;
    delete updateFields.firmId;
    delete updateFields.lawyerId;
    delete updateFields.employeeId;
    delete updateFields.createdBy;

    Object.assign(record, updateFields);
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
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
    const baseQuery = firmId ? { firmId } : { lawyerId };
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Please provide an array of record IDs to delete', 400);
    }

    // Only delete non-active records
    const result = await CompensationReward.deleteMany({
        $or: [
            { _id: { $in: ids } },
            { compensationId: { $in: ids } }
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const {
        increaseAmount,
        increasePercentage,
        changeType,
        changeReason,
        effectiveDate,
        performanceRating,
        notes
    } = req.body;

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
        ...baseQuery
    });

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

    await record.save();

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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    const allowance = {
        ...req.body,
        allowanceId: generateAllowanceId(),
        startDate: req.body.startDate || new Date()
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
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
        ...req.body
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

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
    } = req.body;

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
        ...baseQuery
    });

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

    await record.save();

    return res.json({
        success: true,
        message: 'Bonus processed successfully',
        record,
        bonus: bonusEntry
    });
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const {
        recommendationType,
        recommendedIncrease,
        recommendedPercentage,
        justification
    } = req.body;

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const {
        approvedIncrease,
        approvedPercentage,
        effectiveDate,
        comments
    } = req.body;

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { reason } = req.body;

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const record = await CompensationReward.findOne({
        $or: [{ _id: req.params.id }, { compensationId: req.params.id }],
        ...baseQuery
    });

    if (!record) {
        throw CustomException('سجل التعويضات غير موجود', 404);
    }

    if (!record.recognitionAwards) {
        record.recognitionAwards = [];
    }

    const award = {
        ...req.body,
        awardId: generateAwardId(),
        awardDate: req.body.awardDate || new Date(),
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
    const baseQuery = firmId ? { firmId } : { lawyerId };

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
    const baseQuery = firmId ? { firmId } : { lawyerId };

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
    const baseQuery = firmId ? { firmId } : { lawyerId };

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
