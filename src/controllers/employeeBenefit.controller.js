const EmployeeBenefit = require('../models/employeeBenefit.model');
const Employee = require('../models/employee.model');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// ═══════════════════════════════════════════════════════════════
// CONFIGURABLE POLICIES
// ═══════════════════════════════════════════════════════════════

const BENEFIT_POLICIES = {
    eligibility: {
        minServiceDays: 90,
        probationaryPeriodDays: 90
    },
    coverageLevels: ['employee_only', 'employee_spouse', 'employee_children', 'employee_family', 'employee_parents'],
    benefitTypes: [
        'health_insurance', 'life_insurance', 'disability_insurance', 'dental_insurance',
        'vision_insurance', 'pension', 'savings_plan', 'education_allowance',
        'transportation', 'housing', 'meal_allowance', 'mobile_allowance',
        'gym_membership', 'professional_membership', 'other'
    ],
    benefitCategories: ['insurance', 'allowance', 'retirement', 'perks', 'flexible_benefits', 'mandatory', 'voluntary'],
    costLimits: {
        healthInsurance: { maxEmployerCost: 50000, maxEmployeeCost: 10000 },
        lifeInsurance: { maxCoverage: 1000000 },
        allowances: { maxMonthly: 10000 }
    },
    renewalReminderDays: 30
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate unique member ID for dependents
 */
function generateMemberId() {
    return `MEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique beneficiary ID
 */
function generateBeneficiaryId() {
    return `BNF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique claim ID
 */
function generateClaimId() {
    return `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique pre-authorization ID
 */
function generatePreAuthId() {
    return `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique event ID
 */
function generateEventId() {
    return `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique communication ID
 */
function generateCommunicationId() {
    return `COM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

/**
 * Check employee eligibility for benefits
 */
async function checkEmployeeEligibility(employee) {
    const issues = [];

    if (!employee) {
        issues.push('Employee not found');
        return { eligible: false, issues };
    }

    // Check employment status
    if (employee.employment?.employmentStatus !== 'active') {
        issues.push('Employee is not active');
    }

    // Check service duration
    if (employee.employment?.hireDate) {
        const hireDate = new Date(employee.employment.hireDate);
        const today = new Date();
        const serviceDays = Math.floor((today - hireDate) / (1000 * 60 * 60 * 24));
        if (serviceDays < BENEFIT_POLICIES.eligibility.minServiceDays) {
            issues.push(`Employee must complete ${BENEFIT_POLICIES.eligibility.minServiceDays} days of service (current: ${serviceDays} days)`);
        }
    }

    return {
        eligible: issues.length === 0,
        issues
    };
}

/**
 * Validate beneficiary percentages
 */
function validateBeneficiaryPercentages(beneficiaries) {
    if (!beneficiaries || beneficiaries.length === 0) return { valid: true };

    const primaryTotal = beneficiaries
        .filter(b => b.beneficiaryType === 'primary')
        .reduce((sum, b) => sum + (b.percentage || 0), 0);

    const contingentTotal = beneficiaries
        .filter(b => b.beneficiaryType === 'contingent')
        .reduce((sum, b) => sum + (b.percentage || 0), 0);

    const issues = [];
    if (primaryTotal > 0 && primaryTotal !== 100) {
        issues.push(`Primary beneficiary percentages must total 100% (current: ${primaryTotal}%)`);
    }
    if (contingentTotal > 0 && contingentTotal !== 100) {
        issues.push(`Contingent beneficiary percentages must total 100% (current: ${contingentTotal}%)`);
    }

    return {
        valid: issues.length === 0,
        issues
    };
}

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all benefits with filtering, pagination, and sorting
 */
const getBenefits = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const {
        search,
        employeeId,
        benefitType,
        benefitCategory,
        status,
        enrollmentType,
        providerName,
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
            { benefitName: { $regex: search, $options: 'i' } },
            { benefitNameAr: { $regex: search, $options: 'i' } },
            { employeeName: { $regex: search, $options: 'i' } },
            { employeeNameAr: { $regex: search, $options: 'i' } },
            { enrollmentNumber: { $regex: search, $options: 'i' } },
            { benefitEnrollmentId: { $regex: search, $options: 'i' } }
        ];
    }

    // Field filters
    if (employeeId) query.employeeId = employeeId;
    if (benefitType) query.benefitType = benefitType;
    if (benefitCategory) query.benefitCategory = benefitCategory;
    if (status) query.status = status;
    if (enrollmentType) query.enrollmentType = enrollmentType;
    if (providerName) query.providerName = { $regex: providerName, $options: 'i' };

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

    const [benefits, total] = await Promise.all([
        EmployeeBenefit.find(query)
            .populate('employeeId', 'employeeId personalInfo employment')
            .sort({ [sortBy]: sortDirection })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        EmployeeBenefit.countDocuments(query)
    ]);

    return res.json({
        success: true,
        data: benefits,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
});

/**
 * Get single benefit by ID
 */
const getBenefit = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    }).populate('employeeId', 'employeeId personalInfo employment compensation');

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    return res.json({
        success: true,
        benefit
    });
});

/**
 * Get benefits by employee
 */
const getEmployeeBenefits = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { employeeId } = req.params;
    const { status } = req.query;

    const query = {
        ...baseQuery,
        employeeId
    };

    if (status) query.status = status;

    const benefits = await EmployeeBenefit.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .sort({ effectiveDate: -1 });

    return res.json({
        success: true,
        benefits,
        total: benefits.length
    });
});

/**
 * Get benefit statistics
 */
const getBenefitStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const [
        totalBenefits,
        activeEnrollments,
        pendingEnrollments,
        byType,
        byCategory,
        byStatus,
        costAggregation,
        expiringCount
    ] = await Promise.all([
        EmployeeBenefit.countDocuments(baseQuery),
        EmployeeBenefit.countDocuments({ ...baseQuery, status: 'active' }),
        EmployeeBenefit.countDocuments({ ...baseQuery, status: 'pending' }),
        EmployeeBenefit.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$benefitType', count: { $sum: 1 } } }
        ]),
        EmployeeBenefit.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$benefitCategory', count: { $sum: 1 } } }
        ]),
        EmployeeBenefit.aggregate([
            { $match: baseQuery },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        EmployeeBenefit.aggregate([
            { $match: { ...baseQuery, status: 'active' } },
            {
                $group: {
                    _id: null,
                    totalEmployerCost: { $sum: '$employerCost' },
                    totalEmployeeCost: { $sum: '$employeeCost' },
                    avgBenefitValue: { $avg: { $add: ['$employerCost', '$employeeCost'] } }
                }
            }
        ]),
        // Count benefits expiring in the next 30 days
        EmployeeBenefit.countDocuments({
            ...baseQuery,
            status: 'active',
            coverageEndDate: {
                $gte: new Date(),
                $lte: new Date(Date.now() + BENEFIT_POLICIES.renewalReminderDays * 24 * 60 * 60 * 1000)
            }
        })
    ]);

    return res.json({
        success: true,
        stats: {
            totalBenefits,
            activeEnrollments,
            pendingEnrollments,
            expiringWithin30Days: expiringCount,
            totalEmployerCost: costAggregation[0]?.totalEmployerCost || 0,
            totalEmployeeCost: costAggregation[0]?.totalEmployeeCost || 0,
            averageBenefitValue: Math.round(costAggregation[0]?.avgBenefitValue || 0),
            byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
            byCategory: Object.fromEntries(byCategory.map(c => [c._id, c.count])),
            byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
            coverageRate: totalBenefits > 0 ? Math.round((activeEnrollments / totalBenefits) * 100) : 0
        }
    });
});

/**
 * Create new benefit enrollment
 */
const createBenefit = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        employeeId,
        benefitType,
        benefitCategory,
        benefitName,
        enrollmentType,
        enrollmentDate,
        effectiveDate,
        employerCost,
        employeeCost,
        ...otherData
    } = req.body;

    // Validate employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // Check for duplicate active benefit of same type
    const existingBenefit = await EmployeeBenefit.findOne({
        employeeId,
        benefitType,
        status: { $in: ['active', 'pending'] }
    });

    if (existingBenefit) {
        throw CustomException(`Employee already has an active or pending ${benefitType.replace(/_/g, ' ')} benefit`, 400);
    }

    // Validate beneficiaries if provided
    if (otherData.beneficiaries && otherData.beneficiaries.length > 0) {
        const beneficiaryValidation = validateBeneficiaryPercentages(otherData.beneficiaries);
        if (!beneficiaryValidation.valid) {
            throw CustomException(beneficiaryValidation.issues.join('; '), 400);
        }

        // Add IDs to beneficiaries
        otherData.beneficiaries = otherData.beneficiaries.map(b => ({
            ...b,
            beneficiaryId: generateBeneficiaryId()
        }));
    }

    // Add IDs to covered dependents if provided
    if (otherData.coveredDependents && otherData.coveredDependents.length > 0) {
        otherData.coveredDependents = otherData.coveredDependents.map(d => ({
            ...d,
            memberId: generateMemberId(),
            startDate: d.startDate || effectiveDate,
            age: calculateAge(d.dateOfBirth)
        }));
    }

    // Extract employee info
    const employeeName = employee.personalInfo?.fullNameEnglish ||
        employee.personalInfo?.fullNameArabic ||
        employee.personalInfo?.firstName + ' ' + employee.personalInfo?.lastName;
    const employeeNameAr = employee.personalInfo?.fullNameArabic;
    const employeeNumber = employee.employeeId;
    const department = employee.employment?.department;

    // Create benefit
    const benefit = new EmployeeBenefit({
        firmId: firmId || undefined,
        lawyerId: !firmId ? lawyerId : undefined,
        employeeId,
        employeeName,
        employeeNameAr,
        employeeNumber,
        department,
        benefitType,
        benefitCategory,
        benefitName,
        enrollmentType,
        enrollmentDate: enrollmentDate || new Date(),
        effectiveDate,
        employerCost: employerCost || 0,
        employeeCost: employeeCost || 0,
        status: 'pending',
        statusDate: new Date(),
        createdBy: req.userID,
        ...otherData
    });

    await benefit.save();

    return res.status(201).json({
        success: true,
        message: 'Benefit enrollment created successfully',
        benefit
    });
});

/**
 * Update benefit enrollment
 */
const updateBenefit = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    // Prevent certain updates on terminated benefits
    if (benefit.status === 'terminated') {
        throw CustomException('Cannot update terminated benefit enrollment', 400);
    }

    // Validate beneficiaries if being updated
    if (req.body.beneficiaries) {
        const beneficiaryValidation = validateBeneficiaryPercentages(req.body.beneficiaries);
        if (!beneficiaryValidation.valid) {
            throw CustomException(beneficiaryValidation.issues.join('; '), 400);
        }
    }

    // Update fields
    const updateFields = { ...req.body, updatedBy: req.userID };
    delete updateFields.benefitEnrollmentId; // Prevent ID modification
    delete updateFields.firmId;
    delete updateFields.lawyerId;
    delete updateFields.employeeId;
    delete updateFields.createdBy;

    Object.assign(benefit, updateFields);
    await benefit.save();

    return res.json({
        success: true,
        message: 'Benefit enrollment updated successfully',
        benefit
    });
});

/**
 * Delete benefit enrollment
 */
const deleteBenefit = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    // Only allow deletion of pending benefits
    if (benefit.status !== 'pending') {
        throw CustomException('Only pending benefit enrollments can be deleted. Use termination for active benefits.', 400);
    }

    await EmployeeBenefit.deleteOne({ _id: req.params.id });

    return res.json({
        success: true,
        message: 'Benefit enrollment deleted successfully'
    });
});

/**
 * Bulk delete benefits
 */
const bulkDeleteBenefits = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Please provide an array of benefit IDs to delete', 400);
    }

    // Only delete pending benefits
    const result = await EmployeeBenefit.deleteMany({
        _id: { $in: ids },
        ...baseQuery,
        status: 'pending'
    });

    return res.json({
        success: true,
        message: `${result.deletedCount} benefit enrollment(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// STATUS ACTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Activate benefit enrollment
 */
const activateBenefit = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    if (benefit.status === 'active') {
        throw CustomException('Benefit is already active', 400);
    }

    if (benefit.status === 'terminated' || benefit.status === 'expired') {
        throw CustomException(`Cannot activate ${benefit.status} benefit. Create a new enrollment instead.`, 400);
    }

    benefit.status = 'active';
    benefit.statusDate = new Date();
    benefit.statusReason = req.body.notes || 'Benefit activated';
    benefit.updatedBy = req.userID;

    await benefit.save();

    return res.json({
        success: true,
        message: 'Benefit enrollment activated successfully',
        benefit
    });
});

/**
 * Suspend benefit enrollment
 */
const suspendBenefit = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    if (benefit.status !== 'active') {
        throw CustomException('Only active benefits can be suspended', 400);
    }

    benefit.status = 'suspended';
    benefit.statusDate = new Date();
    benefit.statusReason = req.body.reason || 'Benefit suspended';
    benefit.updatedBy = req.userID;

    await benefit.save();

    return res.json({
        success: true,
        message: 'Benefit enrollment suspended successfully',
        benefit
    });
});

/**
 * Terminate benefit enrollment
 */
const terminateBenefit = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    if (benefit.status === 'terminated') {
        throw CustomException('Benefit is already terminated', 400);
    }

    const terminationDate = req.body.terminationDate ? new Date(req.body.terminationDate) : new Date();

    benefit.status = 'terminated';
    benefit.statusDate = new Date();
    benefit.statusReason = req.body.reason || 'Benefit terminated';
    benefit.coverageEndDate = terminationDate;
    benefit.updatedBy = req.userID;

    // Set termination details
    benefit.termination = {
        terminated: true,
        terminationDate,
        terminationReason: req.body.terminationReason || 'other',
        terminationTriggeredBy: req.body.terminationTriggeredBy || 'hr',
        coverageEndDate: terminationDate,
        continuationOffered: req.body.continuationOffered || false,
        continuationNoticeDate: req.body.continuationOffered ? new Date() : undefined
    };

    await benefit.save();

    return res.json({
        success: true,
        message: 'Benefit enrollment terminated successfully',
        benefit
    });
});

// ═══════════════════════════════════════════════════════════════
// DEPENDENTS & BENEFICIARIES
// ═══════════════════════════════════════════════════════════════

/**
 * Add dependent to benefit
 */
const addDependent = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    if (benefit.status !== 'active' && benefit.status !== 'pending') {
        throw CustomException('Cannot add dependents to terminated or expired benefits', 400);
    }

    const dependent = {
        ...req.body,
        memberId: generateMemberId(),
        startDate: req.body.startDate || new Date(),
        active: true,
        age: calculateAge(req.body.dateOfBirth)
    };

    benefit.coveredDependents.push(dependent);
    benefit.updatedBy = req.userID;
    await benefit.save();

    return res.json({
        success: true,
        message: 'Dependent added successfully',
        dependent: benefit.coveredDependents[benefit.coveredDependents.length - 1]
    });
});

/**
 * Remove dependent from benefit
 */
const removeDependent = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    const dependentIndex = benefit.coveredDependents.findIndex(
        d => d.memberId === req.params.memberId
    );

    if (dependentIndex === -1) {
        throw CustomException('Dependent not found', 404);
    }

    // Mark as inactive instead of removing
    benefit.coveredDependents[dependentIndex].active = false;
    benefit.coveredDependents[dependentIndex].endDate = new Date();
    benefit.updatedBy = req.userID;

    await benefit.save();

    return res.json({
        success: true,
        message: 'Dependent removed successfully'
    });
});

/**
 * Add or update beneficiary
 */
const updateBeneficiary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    const { beneficiaryId } = req.params;
    const beneficiaryIndex = benefit.beneficiaries.findIndex(
        b => b.beneficiaryId === beneficiaryId
    );

    if (beneficiaryIndex === -1) {
        throw CustomException('Beneficiary not found', 404);
    }

    // Update beneficiary
    Object.assign(benefit.beneficiaries[beneficiaryIndex], req.body);

    // Validate percentages after update
    const validation = validateBeneficiaryPercentages(benefit.beneficiaries);
    if (!validation.valid) {
        throw CustomException(validation.issues.join('; '), 400);
    }

    benefit.updatedBy = req.userID;
    await benefit.save();

    return res.json({
        success: true,
        message: 'Beneficiary updated successfully',
        beneficiary: benefit.beneficiaries[beneficiaryIndex]
    });
});

/**
 * Add beneficiary
 */
const addBeneficiary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    const newBeneficiary = {
        ...req.body,
        beneficiaryId: generateBeneficiaryId()
    };

    // Validate percentages with new beneficiary
    const testBeneficiaries = [...benefit.beneficiaries, newBeneficiary];
    const validation = validateBeneficiaryPercentages(testBeneficiaries);
    if (!validation.valid) {
        throw CustomException(validation.issues.join('; '), 400);
    }

    benefit.beneficiaries.push(newBeneficiary);
    benefit.updatedBy = req.userID;
    await benefit.save();

    return res.json({
        success: true,
        message: 'Beneficiary added successfully',
        beneficiary: benefit.beneficiaries[benefit.beneficiaries.length - 1]
    });
});

/**
 * Remove beneficiary
 */
const removeBeneficiary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    const { beneficiaryId } = req.params;
    const beneficiaryIndex = benefit.beneficiaries.findIndex(
        b => b.beneficiaryId === beneficiaryId
    );

    if (beneficiaryIndex === -1) {
        throw CustomException('Beneficiary not found', 404);
    }

    benefit.beneficiaries.splice(beneficiaryIndex, 1);
    benefit.updatedBy = req.userID;
    await benefit.save();

    return res.json({
        success: true,
        message: 'Beneficiary removed successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// CLAIMS
// ═══════════════════════════════════════════════════════════════

/**
 * Submit health insurance claim
 */
const submitClaim = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    if (benefit.status !== 'active') {
        throw CustomException('Claims can only be submitted for active benefits', 400);
    }

    if (!benefit.healthInsurance) {
        throw CustomException('This is not a health insurance benefit', 400);
    }

    const claim = {
        claimId: generateClaimId(),
        claimNumber: `CLM-${Date.now()}`,
        claimDate: new Date(),
        serviceDate: req.body.serviceDate || new Date(),
        claimType: req.body.claimType,
        provider: req.body.provider,
        diagnosis: req.body.diagnosis,
        claimedAmount: req.body.claimedAmount || 0,
        claimStatus: 'submitted',
        statusDate: new Date(),
        claimDocument: req.body.claimDocument
    };

    if (!benefit.healthInsurance.claims) {
        benefit.healthInsurance.claims = [];
    }

    benefit.healthInsurance.claims.push(claim);
    benefit.healthInsurance.totalClaimsSubmitted = (benefit.healthInsurance.totalClaimsSubmitted || 0) + 1;
    benefit.updatedBy = req.userID;

    await benefit.save();

    return res.json({
        success: true,
        message: 'Claim submitted successfully',
        claim: benefit.healthInsurance.claims[benefit.healthInsurance.claims.length - 1]
    });
});

/**
 * Update claim status
 */
const updateClaimStatus = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    const { claimId } = req.params;
    const claimIndex = benefit.healthInsurance?.claims?.findIndex(
        c => c.claimId === claimId
    );

    if (claimIndex === -1 || claimIndex === undefined) {
        throw CustomException('Claim not found', 404);
    }

    const claim = benefit.healthInsurance.claims[claimIndex];
    const { status, approvedAmount, paidAmount, rejectionReason, approvalNumber } = req.body;

    claim.claimStatus = status;
    claim.statusDate = new Date();

    if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;
    if (paidAmount !== undefined) {
        claim.paidAmount = paidAmount;
        claim.paidDate = new Date();

        // Update totals
        benefit.healthInsurance.totalClaimsPaid = (benefit.healthInsurance.totalClaimsPaid || 0) + 1;
        benefit.healthInsurance.totalClaimsAmount = (benefit.healthInsurance.totalClaimsAmount || 0) + paidAmount;
    }
    if (rejectionReason) claim.rejectionReason = rejectionReason;
    if (approvalNumber) claim.approvalNumber = approvalNumber;

    benefit.updatedBy = req.userID;
    await benefit.save();

    return res.json({
        success: true,
        message: 'Claim status updated successfully',
        claim
    });
});

// ═══════════════════════════════════════════════════════════════
// PRE-AUTHORIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Request pre-authorization
 */
const requestPreAuth = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    if (benefit.status !== 'active') {
        throw CustomException('Pre-authorization can only be requested for active benefits', 400);
    }

    if (!benefit.healthInsurance) {
        throw CustomException('This is not a health insurance benefit', 400);
    }

    const preAuth = {
        authId: generatePreAuthId(),
        authNumber: `PAT-${Date.now()}`,
        authDate: new Date(),
        procedure: req.body.procedure,
        provider: req.body.provider,
        estimatedCost: req.body.estimatedCost || 0,
        validFrom: req.body.validFrom || new Date(),
        validUntil: req.body.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        used: false
    };

    if (!benefit.healthInsurance.preAuthorizations) {
        benefit.healthInsurance.preAuthorizations = [];
    }

    benefit.healthInsurance.preAuthorizations.push(preAuth);
    benefit.updatedBy = req.userID;

    await benefit.save();

    return res.json({
        success: true,
        message: 'Pre-authorization request submitted successfully',
        preAuthorization: benefit.healthInsurance.preAuthorizations[benefit.healthInsurance.preAuthorizations.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// QUALIFYING EVENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Report qualifying event
 */
const reportQualifyingEvent = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const benefit = await EmployeeBenefit.findOne({
        _id: req.params.id,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    const event = {
        eventId: generateEventId(),
        eventType: req.body.eventType,
        eventDate: req.body.eventDate || new Date(),
        reportedDate: new Date(),
        eventDescription: req.body.eventDescription,
        documentsRequired: req.body.documentsRequired || false,
        documents: req.body.documents || [],
        allowsBenefitChange: true,
        changeDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        processed: false
    };

    if (!benefit.qualifyingEvents) {
        benefit.qualifyingEvents = [];
    }

    benefit.qualifyingEvents.push(event);
    benefit.updatedBy = req.userID;

    await benefit.save();

    return res.json({
        success: true,
        message: 'Qualifying event reported successfully',
        event: benefit.qualifyingEvents[benefit.qualifyingEvents.length - 1]
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Export benefits to CSV/JSON
 */
const exportBenefits = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const { format = 'json', status, benefitType } = req.query;

    const query = { ...baseQuery };
    if (status) query.status = status;
    if (benefitType) query.benefitType = benefitType;

    const benefits = await EmployeeBenefit.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .lean();

    if (format === 'csv') {
        const headers = [
            'Enrollment ID', 'Employee Name', 'Employee Number', 'Department',
            'Benefit Type', 'Benefit Name', 'Category', 'Provider',
            'Enrollment Date', 'Effective Date', 'Coverage End Date', 'Status',
            'Employer Cost', 'Employee Cost', 'Total Cost', 'Currency'
        ];

        const rows = benefits.map(b => [
            b.benefitEnrollmentId,
            b.employeeName,
            b.employeeNumber,
            b.department,
            b.benefitType,
            b.benefitName,
            b.benefitCategory,
            b.providerName,
            b.enrollmentDate?.toISOString().split('T')[0],
            b.effectiveDate?.toISOString().split('T')[0],
            b.coverageEndDate?.toISOString().split('T')[0],
            b.status,
            b.employerCost,
            b.employeeCost,
            b.totalCost,
            b.currency
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=benefits-export.csv');
        return res.send(csv);
    }

    return res.json({
        success: true,
        data: benefits,
        total: benefits.length,
        exportedAt: new Date()
    });
});

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get expiring benefits
 */
const getExpiringBenefits = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const baseQuery = firmId ? { firmId } : { lawyerId };

    const daysAhead = parseInt(req.query.days) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const benefits = await EmployeeBenefit.find({
        ...baseQuery,
        status: 'active',
        coverageEndDate: {
            $gte: new Date(),
            $lte: futureDate
        }
    })
        .populate('employeeId', 'employeeId personalInfo')
        .sort({ coverageEndDate: 1 });

    return res.json({
        success: true,
        benefits,
        total: benefits.length,
        daysAhead
    });
});

/**
 * Get cost summary by department
 */
const getCostSummary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const matchQuery = firmId
        ? { firmId: new (require('mongoose').Types.ObjectId)(firmId) }
        : { lawyerId: new (require('mongoose').Types.ObjectId)(lawyerId) };

    const [byDepartment, byType, byCategory] = await Promise.all([
        EmployeeBenefit.aggregate([
            { $match: { ...matchQuery, status: 'active' } },
            {
                $group: {
                    _id: '$department',
                    totalEmployerCost: { $sum: '$employerCost' },
                    totalEmployeeCost: { $sum: '$employeeCost' },
                    totalCost: { $sum: '$totalCost' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalCost: -1 } }
        ]),
        EmployeeBenefit.aggregate([
            { $match: { ...matchQuery, status: 'active' } },
            {
                $group: {
                    _id: '$benefitType',
                    totalEmployerCost: { $sum: '$employerCost' },
                    totalEmployeeCost: { $sum: '$employeeCost' },
                    totalCost: { $sum: '$totalCost' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalCost: -1 } }
        ]),
        EmployeeBenefit.aggregate([
            { $match: { ...matchQuery, status: 'active' } },
            {
                $group: {
                    _id: '$benefitCategory',
                    totalEmployerCost: { $sum: '$employerCost' },
                    totalEmployeeCost: { $sum: '$employeeCost' },
                    totalCost: { $sum: '$totalCost' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalCost: -1 } }
        ])
    ]);

    return res.json({
        success: true,
        costSummary: {
            byDepartment,
            byType,
            byCategory
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // CRUD
    getBenefits,
    getBenefit,
    getEmployeeBenefits,
    getBenefitStats,
    createBenefit,
    updateBenefit,
    deleteBenefit,
    bulkDeleteBenefits,

    // Status Actions
    activateBenefit,
    suspendBenefit,
    terminateBenefit,

    // Dependents & Beneficiaries
    addDependent,
    removeDependent,
    addBeneficiary,
    updateBeneficiary,
    removeBeneficiary,

    // Claims
    submitClaim,
    updateClaimStatus,

    // Pre-Authorization
    requestPreAuth,

    // Qualifying Events
    reportQualifyingEvent,

    // Export & Reports
    exportBenefits,
    getExpiringBenefits,
    getCostSummary
};
