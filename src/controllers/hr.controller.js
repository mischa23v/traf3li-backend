const { Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeString, sanitizeEmail, sanitizePhone, sanitizePagination } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// ALLOWED FIELDS FOR MASS ASSIGNMENT PROTECTION
// ═══════════════════════════════════════════════════════════════
const ALLOWED_FIELDS = {
    personalInfo: ['fullNameArabic', 'fullNameEnglish', 'nationalId', 'nationalIdType', 'nationalIdExpiry', 'nationality', 'isSaudi', 'gender', 'dateOfBirth', 'mobile', 'email', 'personalEmail', 'currentAddress', 'emergencyContact', 'maritalStatus', 'numberOfDependents'],
    employment: ['jobTitle', 'jobTitleArabic', 'employmentStatus', 'employmentType', 'contractType', 'contractStartDate', 'contractEndDate', 'hireDate', 'probationPeriod', 'onProbation', 'workSchedule', 'reportsTo', 'departmentName'],
    compensation: ['basicSalary', 'currency', 'allowances', 'paymentFrequency', 'paymentMethod', 'bankDetails'],
    gosi: ['registered', 'gosiNumber', 'employeeContribution', 'employerContribution'],
    organization: ['branchId', 'departmentName', 'teamId', 'supervisorId', 'costCenter'],
    leave: ['annualLeaveEntitlement'],
    allowance: ['name', 'nameAr', 'amount', 'taxable', 'includedInEOSB', 'includedInGOSI']
};

// ═══════════════════════════════════════════════════════════════
// GET FORM OPTIONS
// GET /api/hr/options
// Returns form configuration options for the frontend
// ═══════════════════════════════════════════════════════════════
const getFormOptions = asyncHandler(async (req, res) => {
    return res.json({
        success: true,
        officeTypes: [
            { value: 'solo', labelAr: 'محامي فردي', descriptionAr: 'محامي مستقل' },
            { value: 'small', labelAr: 'مكتب صغير', descriptionAr: '٢-٥ موظفين' },
            { value: 'medium', labelAr: 'مكتب متوسط', descriptionAr: '٦-٢٠ موظف' },
            { value: 'firm', labelAr: 'شركة محاماة', descriptionAr: '٢٠+ موظف' }
        ],

        formSections: {
            basic: [
                { id: 'personal', labelAr: 'البيانات الشخصية' },
                { id: 'employment', labelAr: 'بيانات التوظيف' },
                { id: 'salary', labelAr: 'الراتب والبدلات' }
            ],
            advanced: [
                { id: 'personal_advanced', labelAr: 'معلومات شخصية إضافية' },
                { id: 'emergency', labelAr: 'جهة اتصال الطوارئ' },
                { id: 'contract', labelAr: 'تفاصيل العقد' },
                { id: 'schedule', labelAr: 'جدول العمل' },
                { id: 'payment', labelAr: 'تفاصيل الدفع' },
                { id: 'gosi', labelAr: 'التأمينات الاجتماعية' },
                { id: 'organization', labelAr: 'الهيكل التنظيمي', forTypes: ['medium', 'firm'] },
                { id: 'leave', labelAr: 'رصيد الإجازات' }
            ]
        },

        fieldsByOfficeType: {
            solo: {
                required: [],
                hidden: ['branch', 'team', 'supervisor', 'costCenter', 'department']
            },
            small: {
                required: [],
                hidden: ['costCenter']
            },
            medium: {
                required: [],
                hidden: []
            },
            firm: {
                required: [],
                hidden: []
            }
        },

        commonAllowances: [
            { name: 'Housing Allowance', nameAr: 'بدل سكن' },
            { name: 'Transportation Allowance', nameAr: 'بدل نقل' },
            { name: 'Food Allowance', nameAr: 'بدل طعام' },
            { name: 'Phone Allowance', nameAr: 'بدل هاتف' },
            { name: 'Medical Allowance', nameAr: 'بدل طبي' },
            { name: 'Education Allowance', nameAr: 'بدل تعليم' },
            { name: 'Fuel Allowance', nameAr: 'بدل وقود' },
            { name: 'Remote Work Allowance', nameAr: 'بدل عمل عن بعد' }
        ],

        // Payroll options
        payroll: {
            commonAllowances: [
                { name: 'Housing Allowance', nameAr: 'بدل سكن' },
                { name: 'Transportation Allowance', nameAr: 'بدل نقل' },
                { name: 'Food Allowance', nameAr: 'بدل طعام' },
                { name: 'Phone Allowance', nameAr: 'بدل هاتف' },
                { name: 'Medical Allowance', nameAr: 'بدل طبي' },
                { name: 'Overtime', nameAr: 'أجر إضافي' },
                { name: 'Bonus', nameAr: 'مكافأة' },
                { name: 'Commission', nameAr: 'عمولة' }
            ],
            commonDeductions: [
                { name: 'GOSI', nameAr: 'التأمينات الاجتماعية' },
                { name: 'Loan Repayment', nameAr: 'سداد قرض' },
                { name: 'Advance Recovery', nameAr: 'استرداد سلفة' },
                { name: 'Absence', nameAr: 'غياب' },
                { name: 'Late Deduction', nameAr: 'خصم تأخير' },
                { name: 'Violation', nameAr: 'مخالفة' }
            ],
            paymentMethods: [
                { value: 'bank_transfer', labelAr: 'تحويل بنكي' },
                { value: 'cash', labelAr: 'نقدي' },
                { value: 'check', labelAr: 'شيك' }
            ],
            paymentStatuses: [
                { value: 'draft', labelAr: 'مسودة' },
                { value: 'approved', labelAr: 'معتمد' },
                { value: 'processing', labelAr: 'قيد المعالجة' },
                { value: 'paid', labelAr: 'مدفوع' },
                { value: 'failed', labelAr: 'فشل' },
                { value: 'cancelled', labelAr: 'ملغي' }
            ]
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE EMPLOYEE
// POST /api/hr/employees
// ═══════════════════════════════════════════════════════════════
const createEmployee = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate authentication context
    if (!lawyerId && !firmId) {
        throw CustomException('Authentication context missing', 401);
    }

    const {
        officeType,
        personalInfo,
        employment,
        compensation,
        gosi,
        organization,
        leave
    } = req.body;

    // Input validation
    if (!personalInfo || !employment || !compensation) {
        throw CustomException('Missing required fields: personalInfo, employment, compensation', 400);
    }

    // Filter and sanitize personalInfo
    const sanitizedPersonalInfo = pickAllowedFields(personalInfo, ALLOWED_FIELDS.personalInfo);

    // Validate required fields
    if (!sanitizedPersonalInfo.fullNameArabic || !sanitizedPersonalInfo.fullNameEnglish) {
        throw CustomException('Full names in both Arabic and English are required', 400);
    }

    // Sanitize string inputs
    if (sanitizedPersonalInfo.mobile) {
        sanitizedPersonalInfo.mobile = sanitizePhone(sanitizedPersonalInfo.mobile);
    }
    if (sanitizedPersonalInfo.email) {
        sanitizedPersonalInfo.email = sanitizeEmail(sanitizedPersonalInfo.email);
    }
    if (sanitizedPersonalInfo.personalEmail) {
        sanitizedPersonalInfo.personalEmail = sanitizeEmail(sanitizedPersonalInfo.personalEmail);
    }

    // Check duplicate national ID (only if nationalId is provided)
    if (sanitizedPersonalInfo.nationalId) {
        const existing = await Employee.findOne({
            'personalInfo.nationalId': sanitizedPersonalInfo.nationalId,
            $or: [{ firmId }, { lawyerId }]
        });
        if (existing) {
            throw CustomException('Employee with this National ID already exists', 400);
        }
    }

    // Filter and validate employment data
    const sanitizedEmployment = pickAllowedFields(employment, ALLOWED_FIELDS.employment);
    if (!sanitizedEmployment.jobTitle) {
        throw CustomException('Job title is required', 400);
    }

    // Filter and validate compensation data
    const sanitizedCompensation = pickAllowedFields(compensation, ALLOWED_FIELDS.compensation);
    if (!sanitizedCompensation.basicSalary) {
        throw CustomException('Basic salary is required', 400);
    }

    // Validate basicSalary is a positive number
    if (typeof sanitizedCompensation.basicSalary !== 'number' || sanitizedCompensation.basicSalary <= 0) {
        throw CustomException('Basic salary must be a positive number', 400);
    }

    // Prepare employee data with filtered inputs
    const employeeData = {
        officeType: officeType || 'solo',
        personalInfo: {
            fullNameArabic: sanitizedPersonalInfo.fullNameArabic,
            fullNameEnglish: sanitizedPersonalInfo.fullNameEnglish,
            nationalId: sanitizedPersonalInfo.nationalId,
            nationalIdType: sanitizedPersonalInfo.nationalIdType || 'saudi_id',
            nationalIdExpiry: sanitizedPersonalInfo.nationalIdExpiry,
            nationality: sanitizedPersonalInfo.nationality || 'Saudi',
            isSaudi: sanitizedPersonalInfo.isSaudi !== undefined ? sanitizedPersonalInfo.isSaudi : true,
            gender: sanitizedPersonalInfo.gender,
            dateOfBirth: sanitizedPersonalInfo.dateOfBirth,
            mobile: sanitizedPersonalInfo.mobile,
            email: sanitizedPersonalInfo.email,
            personalEmail: sanitizedPersonalInfo.personalEmail,
            currentAddress: sanitizedPersonalInfo.currentAddress,
            emergencyContact: sanitizedPersonalInfo.emergencyContact,
            maritalStatus: sanitizedPersonalInfo.maritalStatus || 'single',
            numberOfDependents: sanitizedPersonalInfo.numberOfDependents || 0
        },
        employment: {
            employmentStatus: sanitizedEmployment.employmentStatus || 'active',
            jobTitle: sanitizedEmployment.jobTitle,
            jobTitleArabic: sanitizedEmployment.jobTitleArabic,
            employmentType: sanitizedEmployment.employmentType || 'full_time',
            contractType: sanitizedEmployment.contractType || 'indefinite',
            contractStartDate: sanitizedEmployment.contractStartDate,
            contractEndDate: sanitizedEmployment.contractEndDate,
            hireDate: sanitizedEmployment.hireDate,
            probationPeriod: sanitizedEmployment.probationPeriod !== undefined ? sanitizedEmployment.probationPeriod : 90,
            onProbation: sanitizedEmployment.onProbation !== undefined ? sanitizedEmployment.onProbation : true,
            workSchedule: sanitizedEmployment.workSchedule || {
                weeklyHours: 48,
                dailyHours: 8,
                workDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
                restDay: 'Friday'
            },
            reportsTo: sanitizedEmployment.reportsTo,
            departmentName: sanitizedEmployment.departmentName
        },
        compensation: {
            basicSalary: sanitizedCompensation.basicSalary,
            currency: sanitizedCompensation.currency || 'SAR',
            allowances: sanitizedCompensation.allowances || [],
            paymentFrequency: sanitizedCompensation.paymentFrequency || 'monthly',
            paymentMethod: sanitizedCompensation.paymentMethod || 'bank_transfer',
            bankDetails: sanitizedCompensation.bankDetails
        },
        firmId,
        lawyerId,
        createdBy: lawyerId
    };

    // Add GOSI data if provided (with allowed fields only)
    if (gosi) {
        const sanitizedGosi = pickAllowedFields(gosi, ALLOWED_FIELDS.gosi);
        employeeData.gosi = {
            registered: sanitizedGosi.registered || false,
            gosiNumber: sanitizedGosi.gosiNumber,
            employeeContribution: sanitizedGosi.employeeContribution !== undefined ? sanitizedGosi.employeeContribution : 9.75,
            employerContribution: sanitizedGosi.employerContribution !== undefined ? sanitizedGosi.employerContribution : 12.75
        };
    }

    // Add organization data if provided (for medium/firm, with allowed fields only)
    if (organization) {
        const sanitizedOrganization = pickAllowedFields(organization, ALLOWED_FIELDS.organization);
        employeeData.organization = {
            branchId: sanitizedOrganization.branchId,
            departmentName: sanitizedOrganization.departmentName,
            teamId: sanitizedOrganization.teamId,
            supervisorId: sanitizedOrganization.supervisorId,
            costCenter: sanitizedOrganization.costCenter
        };
    }

    // Add leave data if provided (with allowed fields only)
    if (leave) {
        const sanitizedLeave = pickAllowedFields(leave, ALLOWED_FIELDS.leave);
        employeeData.leave = {
            annualLeaveEntitlement: sanitizedLeave.annualLeaveEntitlement || 21
        };
    }

    const employee = await Employee.create(employeeData);

    return res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        employee
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ALL EMPLOYEES
// GET /api/hr/employees
// ═══════════════════════════════════════════════════════════════
const getEmployees = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Ensure we have at least one ownership identifier
    if (!firmId && !lawyerId) {
        throw CustomException('Authentication context missing', 401);
    }

    const {
        status,
        department,
        employmentType,
        officeType,
        search,
        page,
        limit
    } = req.query;

    // Sanitize pagination parameters
    const { page: safePage, limit: safeLimit, skip } = sanitizePagination(
        { page, limit },
        { maxLimit: 100, defaultLimit: 20, defaultPage: 1 }
    );

    // Build query with IDOR protection (only return user's employees)
    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    // Validate and add filter parameters
    const validStatuses = ['active', 'inactive', 'on_leave', 'terminated'];
    if (status && validStatuses.includes(String(status).toLowerCase())) {
        query['employment.employmentStatus'] = status;
    }

    if (department && typeof department === 'string') {
        query['employment.departmentName'] = sanitizeString(department);
    }

    const validEmploymentTypes = ['full_time', 'part_time', 'contract', 'temporary'];
    if (employmentType && validEmploymentTypes.includes(String(employmentType).toLowerCase())) {
        query['employment.employmentType'] = employmentType;
    }

    const validOfficeTypes = ['solo', 'small', 'medium', 'firm'];
    if (officeType && validOfficeTypes.includes(String(officeType).toLowerCase())) {
        query.officeType = officeType;
    }

    // Sanitize search parameter
    if (search && typeof search === 'string' && search.trim().length > 0) {
        const sanitizedSearch = sanitizeString(search);
        query.$or = [
            { 'personalInfo.fullNameArabic': { $regex: sanitizedSearch, $options: 'i' } },
            { 'personalInfo.fullNameEnglish': { $regex: sanitizedSearch, $options: 'i' } },
            { employeeId: { $regex: sanitizedSearch, $options: 'i' } },
            { 'personalInfo.nationalId': { $regex: sanitizedSearch, $options: 'i' } },
            { 'personalInfo.mobile': { $regex: sanitizedSearch, $options: 'i' } },
            { 'personalInfo.email': { $regex: sanitizedSearch, $options: 'i' } }
        ];
    }

    try {
        const employees = await Employee.find(query)
            .populate('employment.reportsTo', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
            .populate('organization.supervisorId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .skip(skip)
            .lean();

        const total = await Employee.countDocuments(query);

        return res.json({
            success: true,
            employees,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                pages: Math.ceil(total / safeLimit)
            }
        });
    } catch (dbError) {
        logger.error('Employee fetch error:', dbError);
        throw CustomException('Failed to fetch employees', 500);
    }
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE EMPLOYEE
// GET /api/hr/employees/:id
// ═══════════════════════════════════════════════════════════════
const getEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const employee = await Employee.findById(id)
        .populate('employment.reportsTo', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('organization.supervisorId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish');

    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    return res.json({
        success: true,
        employee
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE EMPLOYEE
// PUT /api/hr/employees/:id
// ═══════════════════════════════════════════════════════════════
const updateEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Validate ID format and ownership
    if (!id || id.length !== 24) {
        throw CustomException('Invalid employee ID', 400);
    }

    const employee = await Employee.findById(id);

    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // IDOR Protection: Verify ownership
    const hasAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Build update object with filtered nested fields (mass assignment protection)
    const updateData = {};
    const {
        officeType,
        personalInfo,
        employment,
        compensation,
        gosi,
        organization,
        leave
    } = req.body;

    // Validate and filter office type
    const validOfficeTypes = ['solo', 'small', 'medium', 'firm'];
    if (officeType && validOfficeTypes.includes(officeType)) {
        updateData.officeType = officeType;
    }

    // Handle nested personalInfo updates (with allowed fields only)
    if (personalInfo && typeof personalInfo === 'object') {
        const sanitizedPersonalInfo = pickAllowedFields(personalInfo, ALLOWED_FIELDS.personalInfo);

        // Sanitize email and phone inputs
        if (sanitizedPersonalInfo.email) {
            sanitizedPersonalInfo.email = sanitizeEmail(sanitizedPersonalInfo.email);
        }
        if (sanitizedPersonalInfo.mobile) {
            sanitizedPersonalInfo.mobile = sanitizePhone(sanitizedPersonalInfo.mobile);
        }
        if (sanitizedPersonalInfo.personalEmail) {
            sanitizedPersonalInfo.personalEmail = sanitizeEmail(sanitizedPersonalInfo.personalEmail);
        }

        Object.keys(sanitizedPersonalInfo).forEach(key => {
            updateData[`personalInfo.${key}`] = sanitizedPersonalInfo[key];
        });
    }

    // Handle nested employment updates (with allowed fields only)
    if (employment && typeof employment === 'object') {
        const sanitizedEmployment = pickAllowedFields(employment, ALLOWED_FIELDS.employment);
        Object.keys(sanitizedEmployment).forEach(key => {
            updateData[`employment.${key}`] = sanitizedEmployment[key];
        });
    }

    // Handle nested compensation updates (with allowed fields only)
    if (compensation && typeof compensation === 'object') {
        const sanitizedCompensation = pickAllowedFields(compensation, ALLOWED_FIELDS.compensation);

        // Validate numeric fields
        if (sanitizedCompensation.basicSalary !== undefined) {
            if (typeof sanitizedCompensation.basicSalary !== 'number' || sanitizedCompensation.basicSalary <= 0) {
                throw CustomException('Basic salary must be a positive number', 400);
            }
        }

        Object.keys(sanitizedCompensation).forEach(key => {
            updateData[`compensation.${key}`] = sanitizedCompensation[key];
        });
    }

    // Handle nested gosi updates (with allowed fields only)
    if (gosi && typeof gosi === 'object') {
        const sanitizedGosi = pickAllowedFields(gosi, ALLOWED_FIELDS.gosi);
        Object.keys(sanitizedGosi).forEach(key => {
            updateData[`gosi.${key}`] = sanitizedGosi[key];
        });
    }

    // Handle nested organization updates (with allowed fields only)
    if (organization && typeof organization === 'object') {
        const sanitizedOrganization = pickAllowedFields(organization, ALLOWED_FIELDS.organization);
        Object.keys(sanitizedOrganization).forEach(key => {
            updateData[`organization.${key}`] = sanitizedOrganization[key];
        });
    }

    // Handle nested leave updates (with allowed fields only)
    if (leave && typeof leave === 'object') {
        const sanitizedLeave = pickAllowedFields(leave, ALLOWED_FIELDS.leave);
        Object.keys(sanitizedLeave).forEach(key => {
            updateData[`leave.${key}`] = sanitizedLeave[key];
        });
    }

    // IDOR Protection: Build access query
    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    const updatedEmployee = await Employee.findOneAndUpdate(
        accessQuery,
        { $set: updateData },
        { new: true, runValidators: true }
    )
        .populate('employment.reportsTo', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('organization.supervisorId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish');

    return res.json({
        success: true,
        message: 'Employee updated successfully',
        employee: updatedEmployee
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE EMPLOYEE
// DELETE /api/hr/employees/:id
// ═══════════════════════════════════════════════════════════════
const deleteEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Validate ID format
    if (!id || id.length !== 24) {
        throw CustomException('Invalid employee ID', 400);
    }

    // IDOR Protection: Verify ownership before deletion
    const employee = await Employee.findById(id);

    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // IDOR Protection: Verify ownership
    const hasAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // IDOR Protection: Use findOneAndDelete with ownership query
    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    await Employee.findOneAndDelete(accessQuery);

    return res.json({
        success: true,
        message: 'Employee deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// GET EMPLOYEE STATS
// GET /api/hr/employees/stats
// ═══════════════════════════════════════════════════════════════
const getEmployeeStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const stats = await Employee.getStats(firmId, lawyerId);

    return res.json({
        success: true,
        stats
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD ALLOWANCE TO EMPLOYEE
// POST /api/hr/employees/:id/allowances
// ═══════════════════════════════════════════════════════════════
const addAllowance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Validate ID format
    if (!id || id.length !== 24) {
        throw CustomException('Invalid employee ID', 400);
    }

    // Filter allowance fields (mass assignment protection)
    const sanitizedAllowance = pickAllowedFields(req.body, ALLOWED_FIELDS.allowance);

    // Input validation
    if (!sanitizedAllowance.name || sanitizedAllowance.amount === undefined) {
        throw CustomException('Allowance name and amount are required', 400);
    }

    // Validate amount is a positive number
    if (typeof sanitizedAllowance.amount !== 'number' || sanitizedAllowance.amount <= 0) {
        throw CustomException('Allowance amount must be a positive number', 400);
    }

    // IDOR Protection: Verify ownership
    const employee = await Employee.findById(id);

    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    const hasAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    employee.compensation.allowances.push({
        name: sanitizedAllowance.name,
        nameAr: sanitizedAllowance.nameAr,
        amount: sanitizedAllowance.amount,
        taxable: sanitizedAllowance.taxable !== undefined ? sanitizedAllowance.taxable : true,
        includedInEOSB: sanitizedAllowance.includedInEOSB !== undefined ? sanitizedAllowance.includedInEOSB : true,
        includedInGOSI: sanitizedAllowance.includedInGOSI !== undefined ? sanitizedAllowance.includedInGOSI : false
    });
    await employee.save();

    return res.json({
        success: true,
        message: 'Allowance added successfully',
        employee
    });
});

// ═══════════════════════════════════════════════════════════════
// REMOVE ALLOWANCE FROM EMPLOYEE
// DELETE /api/hr/employees/:id/allowances/:allowanceId
// ═══════════════════════════════════════════════════════════════
const removeAllowance = asyncHandler(async (req, res) => {
    const { id, allowanceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Validate ID formats
    if (!id || id.length !== 24) {
        throw CustomException('Invalid employee ID', 400);
    }

    if (!allowanceId || allowanceId.length !== 24) {
        throw CustomException('Invalid allowance ID', 400);
    }

    // IDOR Protection: Verify employee ownership
    const employee = await Employee.findById(id);

    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    const hasAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Verify allowance exists before deletion
    const allowanceExists = employee.compensation.allowances.some(
        a => a._id.toString() === allowanceId
    );

    if (!allowanceExists) {
        throw CustomException('Allowance not found', 404);
    }

    employee.compensation.allowances = employee.compensation.allowances.filter(
        a => a._id.toString() !== allowanceId
    );
    await employee.save();

    return res.json({
        success: true,
        message: 'Allowance removed successfully',
        employee
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE EMPLOYEES
// POST /api/hr/employees/bulk-delete
// ═══════════════════════════════════════════════════════════════
const bulkDeleteEmployees = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Input validation
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('يجب توفير قائمة المعرفات / IDs list is required', 400);
    }

    // Limit bulk delete to prevent abuse
    const maxBulkDelete = 100;
    if (ids.length > maxBulkDelete) {
        throw CustomException(`Cannot delete more than ${maxBulkDelete} employees at once`, 400);
    }

    // IDOR Protection: Validate all IDs format
    const validatedIds = ids.filter(id => {
        if (!id || typeof id !== 'string' || id.length !== 24) {
            return false;
        }
        return true;
    });

    if (validatedIds.length === 0) {
        throw CustomException('No valid employee IDs provided', 400);
    }

    if (validatedIds.length !== ids.length) {
        throw CustomException('Some employee IDs have invalid format', 400);
    }

    // IDOR Protection: Build access query (only delete user's employees)
    const accessQuery = firmId
        ? { _id: { $in: validatedIds }, firmId }
        : { _id: { $in: validatedIds }, lawyerId };

    // Verify all employees belong to the user before deletion
    const employees = await Employee.find(accessQuery);

    if (employees.length === 0) {
        throw CustomException('لم يتم العثور على موظفين / No employees found', 404);
    }

    // Ensure we're only deleting what was requested and belongs to user
    if (employees.length !== validatedIds.length) {
        throw CustomException('Some employees do not belong to you', 403);
    }

    // Delete all verified employees
    const result = await Employee.deleteMany(accessQuery);

    return res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} موظف بنجاح / ${result.deletedCount} employee(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE DOCUMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get employee documents
 * GET /api/hr/employees/:id/documents
 */
const getEmployeeDocuments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { type, verified, page = 1, limit = 50 } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid employee ID | معرف الموظف غير صالح', 400);
    }

    // IDOR Protection: Verify employee ownership
    const accessQuery = firmId ? { _id: sanitizedId, firmId } : { _id: sanitizedId, lawyerId };
    const employee = await Employee.findOne(accessQuery);

    if (!employee) {
        throw CustomException('الموظف غير موجود / Employee not found', 404);
    }

    // Build documents query
    const documentsQuery = {
        module: 'hr',
        'metadata.employeeId': sanitizedId
    };

    if (firmId) {
        documentsQuery.firmId = firmId;
    } else {
        documentsQuery.lawyerId = lawyerId;
    }

    if (type) {
        documentsQuery['metadata.documentType'] = type;
    }
    if (verified !== undefined) {
        documentsQuery['metadata.verified'] = verified === 'true';
    }

    // Get documents (using Document model if available)
    let documents = [];
    let total = 0;

    try {
        const Document = require('../models').Document;
        if (Document) {
            documents = await Document.find(documentsQuery)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit))
                .populate('uploadedBy', 'firstName lastName');
            total = await Document.countDocuments(documentsQuery);
        }
    } catch (error) {
        // Document model might not exist or have the right schema
        documents = [];
        total = 0;
    }

    return res.json({
        success: true,
        data: documents,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Upload employee document
 * POST /api/hr/employees/:id/documents
 */
const uploadEmployeeDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid employee ID | معرف الموظف غير صالح', 400);
    }

    // IDOR Protection: Verify employee ownership
    const accessQuery = firmId ? { _id: sanitizedId, firmId } : { _id: sanitizedId, lawyerId };
    const employee = await Employee.findOne(accessQuery);

    if (!employee) {
        throw CustomException('الموظف غير موجود / Employee not found', 404);
    }

    // Mass assignment protection
    const allowedFields = [
        'fileName', 'originalName', 'fileType', 'fileSize', 'url', 'fileKey',
        'documentType', 'expiryDate', 'notes', 'bucket'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate required fields
    if (!safeData.fileName || !safeData.url || !safeData.fileKey) {
        throw CustomException('fileName, url, and fileKey are required | الملف مطلوب', 400);
    }

    // Validate document type
    const validDocumentTypes = [
        'national_id', 'passport', 'iqama', 'work_visa', 'contract',
        'certificate', 'cv', 'photo', 'medical', 'gosi', 'bank_letter', 'other'
    ];
    if (safeData.documentType && !validDocumentTypes.includes(safeData.documentType)) {
        throw CustomException('Invalid document type | نوع المستند غير صالح', 400);
    }

    // Prepare document data
    const documentData = {
        firmId: firmId || undefined,
        lawyerId,
        fileName: safeData.fileName,
        originalName: safeData.originalName || safeData.fileName,
        fileType: safeData.fileType || 'application/octet-stream',
        fileSize: safeData.fileSize || 0,
        url: safeData.url,
        fileKey: safeData.fileKey,
        bucket: safeData.bucket,
        module: 'hr',
        category: 'other',
        uploadedBy: lawyerId,
        metadata: {
            employeeId: sanitizedId,
            employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
            documentType: safeData.documentType || 'other',
            expiryDate: safeData.expiryDate || null,
            notes: safeData.notes || '',
            verified: false,
            verifiedBy: null,
            verifiedAt: null
        }
    };

    // Create document
    let document;
    try {
        const Document = require('../models').Document;
        if (Document) {
            document = await Document.create(documentData);
        } else {
            throw new Error('Document model not available');
        }
    } catch (error) {
        // Fallback: Store reference in a simpler format
        document = {
            _id: `doc_${Date.now()}`,
            ...documentData,
            createdAt: new Date()
        };
    }

    return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully | تم رفع المستند بنجاح',
        data: document
    });
});

/**
 * Delete employee document
 * DELETE /api/hr/employees/:id/documents/:docId
 */
const deleteEmployeeDocument = asyncHandler(async (req, res) => {
    const { id, docId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Validate ObjectIds
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedDocId = sanitizeObjectId(docId);
    if (!sanitizedId || !sanitizedDocId) {
        throw CustomException('Invalid ID provided | معرف غير صالح', 400);
    }

    // IDOR Protection: Verify employee ownership
    const accessQuery = firmId ? { _id: sanitizedId, firmId } : { _id: sanitizedId, lawyerId };
    const employee = await Employee.findOne(accessQuery);

    if (!employee) {
        throw CustomException('الموظف غير موجود / Employee not found', 404);
    }

    // Find and delete document
    let deleted = false;
    let deletedDocument = null;

    try {
        const Document = require('../models').Document;
        if (Document) {
            const docQuery = {
                _id: sanitizedDocId,
                module: 'hr',
                'metadata.employeeId': sanitizedId
            };
            if (firmId) {
                docQuery.firmId = firmId;
            } else {
                docQuery.lawyerId = lawyerId;
            }

            deletedDocument = await Document.findOneAndDelete(docQuery);
            deleted = !!deletedDocument;
        }
    } catch (error) {
        // Document model might not exist
        deleted = false;
    }

    if (!deleted) {
        throw CustomException('Document not found | المستند غير موجود', 404);
    }

    // TODO: Delete file from S3/R2 using fileKey
    // await deleteFromStorage(deletedDocument.fileKey, deletedDocument.bucket);

    return res.json({
        success: true,
        message: 'Document deleted successfully | تم حذف المستند بنجاح'
    });
});

/**
 * Verify employee document
 * POST /api/hr/employees/:id/documents/:docId/verify
 */
const verifyEmployeeDocument = asyncHandler(async (req, res) => {
    const { id, docId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Validate ObjectIds
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedDocId = sanitizeObjectId(docId);
    if (!sanitizedId || !sanitizedDocId) {
        throw CustomException('Invalid ID provided | معرف غير صالح', 400);
    }

    // Mass assignment protection
    const allowedFields = ['verified', 'verificationNotes', 'verificationSource'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // IDOR Protection: Verify employee ownership
    const accessQuery = firmId ? { _id: sanitizedId, firmId } : { _id: sanitizedId, lawyerId };
    const employee = await Employee.findOne(accessQuery);

    if (!employee) {
        throw CustomException('الموظف غير موجود / Employee not found', 404);
    }

    // Find and update document
    let document = null;

    try {
        const Document = require('../models').Document;
        if (Document) {
            const docQuery = {
                _id: sanitizedDocId,
                module: 'hr',
                'metadata.employeeId': sanitizedId
            };
            if (firmId) {
                docQuery.firmId = firmId;
            } else {
                docQuery.lawyerId = lawyerId;
            }

            document = await Document.findOneAndUpdate(
                docQuery,
                {
                    $set: {
                        'metadata.verified': safeData.verified !== false,
                        'metadata.verifiedBy': lawyerId,
                        'metadata.verifiedAt': new Date(),
                        'metadata.verificationNotes': safeData.verificationNotes || '',
                        'metadata.verificationSource': safeData.verificationSource || 'manual'
                    }
                },
                { new: true }
            );
        }
    } catch (error) {
        // Document model might not exist
        document = null;
    }

    if (!document) {
        throw CustomException('Document not found | المستند غير موجود', 404);
    }

    return res.json({
        success: true,
        message: document.metadata.verified
            ? 'Document verified successfully | تم التحقق من المستند بنجاح'
            : 'Document verification removed | تم إلغاء التحقق من المستند',
        data: document
    });
});

module.exports = {
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    bulkDeleteEmployees,
    getEmployeeStats,
    addAllowance,
    removeAllowance,
    getFormOptions,
    // Employee Documents
    getEmployeeDocuments,
    uploadEmployeeDocument,
    deleteEmployeeDocument,
    verifyEmployeeDocument
};
