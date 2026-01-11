const EmployeeBenefit = require('../models/employeeBenefit.model');
const Employee = require('../models/employee.model');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId, escapeRegex } = require('../utils/securityUtils');

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

/**
 * Validate benefit type against allowed types
 */
function validateBenefitType(benefitType) {
    if (!benefitType) {
        return { valid: false, message: 'Benefit type is required' };
    }
    if (!BENEFIT_POLICIES.benefitTypes.includes(benefitType)) {
        return {
            valid: false,
            message: `Invalid benefit type. Allowed types: ${BENEFIT_POLICIES.benefitTypes.join(', ')}`
        };
    }
    return { valid: true };
}

/**
 * Validate benefit category
 */
function validateBenefitCategory(category) {
    if (!category) {
        return { valid: false, message: 'Benefit category is required' };
    }
    if (!BENEFIT_POLICIES.benefitCategories.includes(category)) {
        return {
            valid: false,
            message: `Invalid benefit category. Allowed categories: ${BENEFIT_POLICIES.benefitCategories.join(', ')}`
        };
    }
    return { valid: true };
}

/**
 * Validate benefit amounts based on type and policy limits
 */
function validateBenefitAmounts(benefitType, employerCost, employeeCost) {
    const issues = [];

    // Ensure amounts are non-negative
    if (employerCost < 0) {
        issues.push('Employer cost cannot be negative');
    }
    if (employeeCost < 0) {
        issues.push('Employee cost cannot be negative');
    }

    // Validate against policy limits
    if (benefitType === 'health_insurance') {
        const limits = BENEFIT_POLICIES.costLimits.healthInsurance;
        if (employerCost > limits.maxEmployerCost) {
            issues.push(`Employer cost for health insurance cannot exceed ${limits.maxEmployerCost}`);
        }
        if (employeeCost > limits.maxEmployeeCost) {
            issues.push(`Employee cost for health insurance cannot exceed ${limits.maxEmployeeCost}`);
        }
    } else if (benefitType === 'life_insurance') {
        const limits = BENEFIT_POLICIES.costLimits.lifeInsurance;
        const totalCost = (employerCost || 0) + (employeeCost || 0);
        if (totalCost > limits.maxCoverage) {
            issues.push(`Total life insurance coverage cannot exceed ${limits.maxCoverage}`);
        }
    } else if (['transportation', 'housing', 'meal_allowance', 'mobile_allowance'].includes(benefitType)) {
        const limits = BENEFIT_POLICIES.costLimits.allowances;
        const totalCost = (employerCost || 0) + (employeeCost || 0);
        if (totalCost > limits.maxMonthly) {
            issues.push(`Monthly allowance cannot exceed ${limits.maxMonthly}`);
        }
    }

    return {
        valid: issues.length === 0,
        issues
    };
}

/**
 * Verify employee belongs to firm/lawyer (IDOR protection)
 */
async function verifyEmployeeOwnership(employeeId, firmId, lawyerId) {
    // IDOR PROTECTION - Query includes firmId/lawyerId to ensure employee belongs to user
    const accessQuery = firmId
        ? { _id: employeeId, firmId }
        : { _id: employeeId, lawyerId };
    const employee = await Employee.findOne(accessQuery);

    if (!employee) {
        throw CustomException('Employee not found or access denied', 404);
    }

    return employee;
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
            { benefitName: { $regex: escapeRegex(search), $options: 'i' } },
            { benefitNameAr: { $regex: escapeRegex(search), $options: 'i' } },
            { employeeName: { $regex: escapeRegex(search), $options: 'i' } },
            { employeeNameAr: { $regex: escapeRegex(search), $options: 'i' } },
            { enrollmentNumber: { $regex: escapeRegex(search), $options: 'i' } },
            { benefitEnrollmentId: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    // Field filters
    if (employeeId) query.employeeId = employeeId;
    if (benefitType) query.benefitType = benefitType;
    if (benefitCategory) query.benefitCategory = benefitCategory;
    if (status) query.status = status;
    if (enrollmentType) query.enrollmentType = enrollmentType;
    // SECURITY: escape regex to prevent ReDoS injection
    if (providerName) query.providerName = { $regex: escapeRegex(providerName), $options: 'i' };

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const { employeeId } = req.params;

    // Sanitize employee ID
    const sanitizedEmployeeId = sanitizeObjectId(employeeId);
    if (!sanitizedEmployeeId) {
        throw CustomException('Invalid employee ID format', 400);
    }

    // IDOR Protection - Verify employee belongs to this firm/lawyer
    await verifyEmployeeOwnership(sanitizedEmployeeId, firmId, lawyerId);

    const { status } = req.query;

    const query = {
        ...baseQuery,
        employeeId: sanitizedEmployeeId
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'employeeId', 'benefitType', 'benefitCategory', 'benefitName', 'benefitNameAr',
        'enrollmentType', 'enrollmentDate', 'effectiveDate', 'coverageEndDate',
        'employerCost', 'employeeCost', 'currency', 'coverageLevel',
        'providerName', 'providerNameAr', 'policyNumber', 'groupNumber',
        'beneficiaries', 'coveredDependents', 'healthInsurance', 'lifeInsurance',
        'disabilityInsurance', 'retirementPlan', 'allowance', 'flexibleBenefits',
        'enrollmentMethod', 'evidenceOfInsurability', 'notes', 'notesAr',
        'enrollmentDocuments'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const {
        employeeId,
        benefitType,
        benefitCategory,
        benefitName,
        enrollmentType,
        enrollmentDate,
        effectiveDate,
        employerCost,
        employeeCost
    } = safeData;

    // Validate required fields
    if (!employeeId || !benefitType || !benefitCategory || !benefitName) {
        throw CustomException('Missing required fields: employeeId, benefitType, benefitCategory, benefitName', 400);
    }

    // Sanitize and validate employeeId
    const sanitizedEmployeeId = sanitizeObjectId(employeeId);
    if (!sanitizedEmployeeId) {
        throw CustomException('Invalid employee ID format', 400);
    }

    // IDOR Protection - Verify employee belongs to this firm/lawyer
    const employee = await verifyEmployeeOwnership(sanitizedEmployeeId, firmId, lawyerId);

    // Check employee eligibility
    const eligibility = await checkEmployeeEligibility(employee);
    if (!eligibility.eligible) {
        throw CustomException(`Employee is not eligible for benefits: ${eligibility.issues.join('; ')}`, 400);
    }

    // Validate benefit type
    const typeValidation = validateBenefitType(benefitType);
    if (!typeValidation.valid) {
        throw CustomException(typeValidation.message, 400);
    }

    // Validate benefit category
    const categoryValidation = validateBenefitCategory(benefitCategory);
    if (!categoryValidation.valid) {
        throw CustomException(categoryValidation.message, 400);
    }

    // Validate benefit amounts
    const costEmployer = parseFloat(employerCost) || 0;
    const costEmployee = parseFloat(employeeCost) || 0;
    const amountValidation = validateBenefitAmounts(benefitType, costEmployer, costEmployee);
    if (!amountValidation.valid) {
        throw CustomException(amountValidation.issues.join('; '), 400);
    }

    // Check for duplicate active benefit of same type
    const existingBenefit = await EmployeeBenefit.findOne({
        employeeId: sanitizedEmployeeId,
        benefitType,
        status: { $in: ['active', 'pending'] }
    });

    if (existingBenefit) {
        throw CustomException(`Employee already has an active or pending ${benefitType.replace(/_/g, ' ')} benefit`, 400);
    }

    // Validate beneficiaries if provided
    if (safeData.beneficiaries && safeData.beneficiaries.length > 0) {
        const beneficiaryValidation = validateBeneficiaryPercentages(safeData.beneficiaries);
        if (!beneficiaryValidation.valid) {
            throw CustomException(beneficiaryValidation.issues.join('; '), 400);
        }

        // Add IDs to beneficiaries
        safeData.beneficiaries = safeData.beneficiaries.map(b => ({
            ...pickAllowedFields(b, [
                'beneficiaryType', 'firstName', 'lastName', 'relationship',
                'dateOfBirth', 'nationalId', 'percentage', 'contactInfo'
            ]),
            beneficiaryId: generateBeneficiaryId()
        }));
    }

    // Add IDs to covered dependents if provided
    if (safeData.coveredDependents && safeData.coveredDependents.length > 0) {
        safeData.coveredDependents = safeData.coveredDependents.map(d => ({
            ...pickAllowedFields(d, [
                'firstName', 'lastName', 'relationship', 'dateOfBirth',
                'nationalId', 'startDate', 'endDate', 'relationship'
            ]),
            memberId: generateMemberId(),
            startDate: d.startDate || effectiveDate,
            age: calculateAge(d.dateOfBirth),
            active: true
        }));
    }

    // Extract employee info
    const employeeName = employee.personalInfo?.fullNameEnglish ||
        employee.personalInfo?.fullNameArabic ||
        employee.personalInfo?.firstName + ' ' + employee.personalInfo?.lastName;
    const employeeNameAr = employee.personalInfo?.fullNameArabic;
    const employeeNumber = employee.employeeId;
    const department = employee.employment?.department;

    // Create benefit with only safe data
    const benefit = new EmployeeBenefit({
        firmId: firmId || undefined,
        lawyerId: !firmId ? lawyerId : undefined,
        employeeId: sanitizedEmployeeId,
        employeeName,
        employeeNameAr,
        employeeNumber,
        department,
        benefitType,
        benefitCategory,
        benefitName,
        benefitNameAr: safeData.benefitNameAr,
        enrollmentType,
        enrollmentDate: enrollmentDate || new Date(),
        effectiveDate,
        coverageEndDate: safeData.coverageEndDate,
        employerCost: costEmployer,
        employeeCost: costEmployee,
        totalCost: costEmployer + costEmployee,
        currency: safeData.currency || 'SAR',
        coverageLevel: safeData.coverageLevel,
        providerName: safeData.providerName,
        providerNameAr: safeData.providerNameAr,
        policyNumber: safeData.policyNumber,
        groupNumber: safeData.groupNumber,
        beneficiaries: safeData.beneficiaries || [],
        coveredDependents: safeData.coveredDependents || [],
        healthInsurance: safeData.healthInsurance,
        lifeInsurance: safeData.lifeInsurance,
        disabilityInsurance: safeData.disabilityInsurance,
        retirementPlan: safeData.retirementPlan,
        allowance: safeData.allowance,
        flexibleBenefits: safeData.flexibleBenefits,
        enrollmentMethod: safeData.enrollmentMethod,
        evidenceOfInsurability: safeData.evidenceOfInsurability,
        notes: safeData.notes,
        notesAr: safeData.notesAr,
        enrollmentDocuments: safeData.enrollmentDocuments || [],
        status: 'pending',
        statusDate: new Date(),
        createdBy: req.userID
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    // Prevent certain updates on terminated benefits
    if (benefit.status === 'terminated') {
        throw CustomException('Cannot update terminated benefit enrollment', 400);
    }

    // Mass assignment protection - only allow specific fields to be updated
    const allowedUpdateFields = [
        'benefitName', 'benefitNameAr', 'enrollmentDate', 'effectiveDate',
        'coverageEndDate', 'employerCost', 'employeeCost', 'currency',
        'coverageLevel', 'providerName', 'providerNameAr', 'policyNumber',
        'groupNumber', 'beneficiaries', 'coveredDependents', 'healthInsurance',
        'lifeInsurance', 'disabilityInsurance', 'retirementPlan', 'allowance',
        'flexibleBenefits', 'enrollmentMethod', 'evidenceOfInsurability',
        'notes', 'notesAr', 'enrollmentDocuments', 'qualifyingEvents'
    ];
    const safeUpdateData = pickAllowedFields(req.body, allowedUpdateFields);

    // Validate benefit type if being updated (shouldn't change, but validate if present)
    if (req.body.benefitType && req.body.benefitType !== benefit.benefitType) {
        throw CustomException('Cannot change benefit type. Create a new enrollment instead.', 400);
    }

    // Validate benefit category if being updated (shouldn't change, but validate if present)
    if (req.body.benefitCategory && req.body.benefitCategory !== benefit.benefitCategory) {
        throw CustomException('Cannot change benefit category. Create a new enrollment instead.', 400);
    }

    // Validate benefit amounts if being updated
    if (safeUpdateData.employerCost !== undefined || safeUpdateData.employeeCost !== undefined) {
        const costEmployer = parseFloat(safeUpdateData.employerCost ?? benefit.employerCost) || 0;
        const costEmployee = parseFloat(safeUpdateData.employeeCost ?? benefit.employeeCost) || 0;

        const amountValidation = validateBenefitAmounts(benefit.benefitType, costEmployer, costEmployee);
        if (!amountValidation.valid) {
            throw CustomException(amountValidation.issues.join('; '), 400);
        }

        // Update costs and total
        safeUpdateData.employerCost = costEmployer;
        safeUpdateData.employeeCost = costEmployee;
        safeUpdateData.totalCost = costEmployer + costEmployee;
    }

    // Validate beneficiaries if being updated
    if (safeUpdateData.beneficiaries) {
        const beneficiaryValidation = validateBeneficiaryPercentages(safeUpdateData.beneficiaries);
        if (!beneficiaryValidation.valid) {
            throw CustomException(beneficiaryValidation.issues.join('; '), 400);
        }

        // Apply mass assignment protection to beneficiaries
        safeUpdateData.beneficiaries = safeUpdateData.beneficiaries.map(b => ({
            ...pickAllowedFields(b, [
                'beneficiaryId', 'beneficiaryType', 'firstName', 'lastName',
                'relationship', 'dateOfBirth', 'nationalId', 'percentage', 'contactInfo'
            ])
        }));
    }

    // Apply mass assignment protection to dependents
    if (safeUpdateData.coveredDependents) {
        safeUpdateData.coveredDependents = safeUpdateData.coveredDependents.map(d => ({
            ...pickAllowedFields(d, [
                'memberId', 'firstName', 'lastName', 'relationship', 'dateOfBirth',
                'nationalId', 'startDate', 'endDate', 'active', 'age'
            ])
        }));
    }

    // Update fields with system-managed fields
    safeUpdateData.updatedBy = req.userID;

    Object.assign(benefit, safeUpdateData);
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    // Only allow deletion of pending benefits
    if (benefit.status !== 'pending') {
        throw CustomException('Only pending benefit enrollments can be deleted. Use termination for active benefits.', 400);
    }

    await EmployeeBenefit.deleteOne({ _id: benefitId });

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('Please provide an array of benefit IDs to delete', 400);
    }

    // Sanitize all benefit IDs
    const sanitizedIds = ids.map(id => sanitizeObjectId(id)).filter(id => id !== null);

    if (sanitizedIds.length === 0) {
        throw CustomException('No valid benefit IDs provided', 400);
    }

    // Only delete pending benefits
    const result = await EmployeeBenefit.deleteMany({
        _id: { $in: sanitizedIds },
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    if (benefit.status === 'terminated') {
        throw CustomException('Benefit is already terminated', 400);
    }

    // Mass assignment protection for termination data
    const allowedTerminationFields = [
        'terminationDate', 'reason', 'terminationReason', 'terminationTriggeredBy',
        'continuationOffered'
    ];
    const safeTerminationData = pickAllowedFields(req.body, allowedTerminationFields);

    const terminationDate = safeTerminationData.terminationDate ? new Date(safeTerminationData.terminationDate) : new Date();

    benefit.status = 'terminated';
    benefit.statusDate = new Date();
    benefit.statusReason = safeTerminationData.reason || 'Benefit terminated';
    benefit.coverageEndDate = terminationDate;
    benefit.updatedBy = req.userID;

    // Set termination details
    benefit.termination = {
        terminated: true,
        terminationDate,
        terminationReason: safeTerminationData.terminationReason || 'other',
        terminationTriggeredBy: safeTerminationData.terminationTriggeredBy || 'hr',
        coverageEndDate: terminationDate,
        continuationOffered: safeTerminationData.continuationOffered || false,
        continuationNoticeDate: safeTerminationData.continuationOffered ? new Date() : undefined
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    if (benefit.status !== 'active' && benefit.status !== 'pending') {
        throw CustomException('Cannot add dependents to terminated or expired benefits', 400);
    }

    // Mass assignment protection for dependent data
    const allowedDependentFields = [
        'firstName', 'lastName', 'relationship', 'dateOfBirth',
        'nationalId', 'startDate'
    ];
    const safeDependent = pickAllowedFields(req.body, allowedDependentFields);

    // Validate required fields
    if (!safeDependent.firstName || !safeDependent.relationship || !safeDependent.dateOfBirth) {
        throw CustomException('Missing required dependent fields: firstName, relationship, dateOfBirth', 400);
    }

    const dependent = {
        ...safeDependent,
        memberId: generateMemberId(),
        startDate: safeDependent.startDate || new Date(),
        active: true,
        age: calculateAge(safeDependent.dateOfBirth)
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    const { memberId } = req.params;
    const dependentIndex = benefit.coveredDependents.findIndex(
        d => d.memberId === memberId
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
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

    // Mass assignment protection for beneficiary data
    const allowedBeneficiaryFields = [
        'beneficiaryType', 'firstName', 'lastName', 'relationship',
        'dateOfBirth', 'nationalId', 'percentage', 'contactInfo'
    ];
    const safeBeneficiaryData = pickAllowedFields(req.body, allowedBeneficiaryFields);

    // Update beneficiary with safe data only
    Object.assign(benefit.beneficiaries[beneficiaryIndex], safeBeneficiaryData);

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    // Mass assignment protection for beneficiary data
    const allowedBeneficiaryFields = [
        'beneficiaryType', 'firstName', 'lastName', 'relationship',
        'dateOfBirth', 'nationalId', 'percentage', 'contactInfo'
    ];
    const safeBeneficiaryData = pickAllowedFields(req.body, allowedBeneficiaryFields);

    // Validate required fields
    if (!safeBeneficiaryData.firstName || !safeBeneficiaryData.beneficiaryType || !safeBeneficiaryData.percentage) {
        throw CustomException('Missing required beneficiary fields: firstName, beneficiaryType, percentage', 400);
    }

    const newBeneficiary = {
        ...safeBeneficiaryData,
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
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

    // Mass assignment protection for claim data
    const allowedClaimFields = [
        'serviceDate', 'claimType', 'provider', 'diagnosis',
        'claimedAmount', 'claimDocument', 'treatmentDetails'
    ];
    const safeClaimData = pickAllowedFields(req.body, allowedClaimFields);

    // Validate required fields
    if (!safeClaimData.claimType || !safeClaimData.provider || !safeClaimData.claimedAmount) {
        throw CustomException('Missing required claim fields: claimType, provider, claimedAmount', 400);
    }

    // Validate claim amount
    const claimedAmount = parseFloat(safeClaimData.claimedAmount) || 0;
    if (claimedAmount <= 0) {
        throw CustomException('Claimed amount must be greater than zero', 400);
    }

    if (claimedAmount > 1000000) { // Maximum claim amount
        throw CustomException('Claimed amount exceeds maximum allowed limit', 400);
    }

    const claim = {
        claimId: generateClaimId(),
        claimNumber: `CLM-${Date.now()}`,
        claimDate: new Date(),
        serviceDate: safeClaimData.serviceDate || new Date(),
        claimType: safeClaimData.claimType,
        provider: safeClaimData.provider,
        diagnosis: safeClaimData.diagnosis,
        treatmentDetails: safeClaimData.treatmentDetails,
        claimedAmount,
        claimStatus: 'submitted',
        statusDate: new Date(),
        claimDocument: safeClaimData.claimDocument
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
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

    // Mass assignment protection for claim status update
    const allowedStatusFields = [
        'status', 'approvedAmount', 'paidAmount', 'rejectionReason', 'approvalNumber'
    ];
    const safeStatusData = pickAllowedFields(req.body, allowedStatusFields);

    const claim = benefit.healthInsurance.claims[claimIndex];
    const { status, approvedAmount, paidAmount, rejectionReason, approvalNumber } = safeStatusData;

    // Validate status
    const validStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'paid', 'partially_paid'];
    if (status && !validStatuses.includes(status)) {
        throw CustomException(`Invalid claim status. Valid statuses: ${validStatuses.join(', ')}`, 400);
    }

    if (status) {
        claim.claimStatus = status;
        claim.statusDate = new Date();
    }

    // Validate and update approved amount
    if (approvedAmount !== undefined) {
        const approved = parseFloat(approvedAmount);
        if (approved < 0) {
            throw CustomException('Approved amount cannot be negative', 400);
        }
        if (approved > claim.claimedAmount) {
            throw CustomException('Approved amount cannot exceed claimed amount', 400);
        }
        claim.approvedAmount = approved;
    }

    // Validate and update paid amount
    if (paidAmount !== undefined) {
        const paid = parseFloat(paidAmount);
        if (paid < 0) {
            throw CustomException('Paid amount cannot be negative', 400);
        }
        if (paid > (claim.approvedAmount || claim.claimedAmount)) {
            throw CustomException('Paid amount cannot exceed approved amount', 400);
        }

        claim.paidAmount = paid;
        claim.paidDate = new Date();

        // Update totals
        benefit.healthInsurance.totalClaimsPaid = (benefit.healthInsurance.totalClaimsPaid || 0) + 1;
        benefit.healthInsurance.totalClaimsAmount = (benefit.healthInsurance.totalClaimsAmount || 0) + paid;
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
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

    // Mass assignment protection for pre-authorization data
    const allowedPreAuthFields = [
        'procedure', 'provider', 'estimatedCost', 'validFrom', 'validUntil', 'urgency'
    ];
    const safePreAuthData = pickAllowedFields(req.body, allowedPreAuthFields);

    // Validate required fields
    if (!safePreAuthData.procedure || !safePreAuthData.provider) {
        throw CustomException('Missing required pre-authorization fields: procedure, provider', 400);
    }

    // Validate estimated cost
    const estimatedCost = parseFloat(safePreAuthData.estimatedCost) || 0;
    if (estimatedCost < 0) {
        throw CustomException('Estimated cost cannot be negative', 400);
    }

    const preAuth = {
        authId: generatePreAuthId(),
        authNumber: `PAT-${Date.now()}`,
        authDate: new Date(),
        procedure: safePreAuthData.procedure,
        provider: safePreAuthData.provider,
        estimatedCost,
        urgency: safePreAuthData.urgency,
        validFrom: safePreAuthData.validFrom || new Date(),
        validUntil: safePreAuthData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Sanitize benefit ID
    const benefitId = sanitizeObjectId(req.params.id);
    if (!benefitId) {
        throw CustomException('Invalid benefit ID format', 400);
    }

    const benefit = await EmployeeBenefit.findOne({
        _id: benefitId,
        ...baseQuery
    });

    if (!benefit) {
        throw CustomException('Benefit enrollment not found', 404);
    }

    // Mass assignment protection for qualifying event data
    const allowedEventFields = [
        'eventType', 'eventDate', 'eventDescription', 'documentsRequired', 'documents'
    ];
    const safeEventData = pickAllowedFields(req.body, allowedEventFields);

    // Validate required fields
    if (!safeEventData.eventType) {
        throw CustomException('Event type is required', 400);
    }

    // Validate event type
    const validEventTypes = [
        'marriage', 'divorce', 'birth', 'adoption', 'death',
        'employment_status_change', 'coverage_loss', 'relocation', 'other'
    ];
    if (!validEventTypes.includes(safeEventData.eventType)) {
        throw CustomException(`Invalid event type. Valid types: ${validEventTypes.join(', ')}`, 400);
    }

    const event = {
        eventId: generateEventId(),
        eventType: safeEventData.eventType,
        eventDate: safeEventData.eventDate || new Date(),
        reportedDate: new Date(),
        eventDescription: safeEventData.eventDescription,
        documentsRequired: safeEventData.documentsRequired || false,
        documents: safeEventData.documents || [],
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const { format = 'json', status, benefitType } = req.query;

    const query = { ...baseQuery };
    if (status) query.status = status;
    if (benefitType) query.benefitType = benefitType;

    const benefits = await EmployeeBenefit.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .lean();

    if (format === 'csv') {
        // SECURITY: Import sanitization function to prevent CSV injection
        const { sanitizeForCSV } = require('../utils/securityUtils');

        const headers = [
            'Enrollment ID', 'Employee Name', 'Employee Number', 'Department',
            'Benefit Type', 'Benefit Name', 'Category', 'Provider',
            'Enrollment Date', 'Effective Date', 'Coverage End Date', 'Status',
            'Employer Cost', 'Employee Cost', 'Total Cost', 'Currency'
        ];

        const rows = benefits.map(b => [
            sanitizeForCSV(b.benefitEnrollmentId),
            sanitizeForCSV(b.employeeName),
            sanitizeForCSV(b.employeeNumber),
            sanitizeForCSV(b.department),
            sanitizeForCSV(b.benefitType),
            sanitizeForCSV(b.benefitName),
            sanitizeForCSV(b.benefitCategory),
            sanitizeForCSV(b.providerName),
            sanitizeForCSV(b.enrollmentDate?.toISOString().split('T')[0]),
            sanitizeForCSV(b.effectiveDate?.toISOString().split('T')[0]),
            sanitizeForCSV(b.coverageEndDate?.toISOString().split('T')[0]),
            sanitizeForCSV(b.status),
            sanitizeForCSV(b.employerCost),
            sanitizeForCSV(b.employeeCost),
            sanitizeForCSV(b.totalCost),
            sanitizeForCSV(b.currency)
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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

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
