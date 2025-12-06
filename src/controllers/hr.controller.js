const { Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

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
                required: ['fullNameArabic', 'nationalId', 'gender', 'mobile', 'email', 'jobTitleArabic', 'hireDate', 'basicSalary'],
                hidden: ['branch', 'team', 'supervisor', 'costCenter', 'department']
            },
            small: {
                required: ['fullNameArabic', 'nationalId', 'gender', 'mobile', 'email', 'jobTitleArabic', 'hireDate', 'basicSalary'],
                hidden: ['costCenter']
            },
            medium: {
                required: ['fullNameArabic', 'nationalId', 'gender', 'mobile', 'email', 'jobTitleArabic', 'hireDate', 'basicSalary', 'department'],
                hidden: []
            },
            firm: {
                required: ['fullNameArabic', 'nationalId', 'gender', 'mobile', 'email', 'jobTitleArabic', 'hireDate', 'basicSalary', 'department', 'branch'],
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

    const {
        officeType,
        personalInfo,
        employment,
        compensation,
        gosi,
        organization,
        leave
    } = req.body;

    // Validate required fields from personalInfo
    if (!personalInfo?.fullNameArabic) {
        throw CustomException('Full name in Arabic is required', 400);
    }
    if (!personalInfo?.nationalId) {
        throw CustomException('National ID is required', 400);
    }
    if (!personalInfo?.gender) {
        throw CustomException('Gender is required', 400);
    }
    if (!personalInfo?.mobile) {
        throw CustomException('Mobile number is required', 400);
    }
    if (!personalInfo?.email) {
        throw CustomException('Email is required', 400);
    }

    // Validate required fields from employment
    if (!employment?.jobTitleArabic) {
        throw CustomException('Job title in Arabic is required', 400);
    }
    if (!employment?.hireDate) {
        throw CustomException('Hire date is required', 400);
    }

    // Validate required fields from compensation
    if (compensation?.basicSalary === undefined || compensation?.basicSalary < 0) {
        throw CustomException('Basic salary is required and must be a positive number', 400);
    }

    // Check duplicate national ID
    const existing = await Employee.findOne({
        'personalInfo.nationalId': personalInfo.nationalId,
        $or: [{ firmId }, { lawyerId }]
    });
    if (existing) {
        throw CustomException('Employee with this National ID already exists', 400);
    }

    // Prepare employee data
    const employeeData = {
        officeType: officeType || 'solo',
        personalInfo: {
            fullNameArabic: personalInfo.fullNameArabic,
            fullNameEnglish: personalInfo.fullNameEnglish,
            nationalId: personalInfo.nationalId,
            nationalIdType: personalInfo.nationalIdType || 'saudi_id',
            nationalIdExpiry: personalInfo.nationalIdExpiry,
            nationality: personalInfo.nationality || 'Saudi',
            isSaudi: personalInfo.isSaudi !== undefined ? personalInfo.isSaudi : true,
            gender: personalInfo.gender,
            dateOfBirth: personalInfo.dateOfBirth,
            mobile: personalInfo.mobile,
            email: personalInfo.email,
            personalEmail: personalInfo.personalEmail,
            currentAddress: personalInfo.currentAddress,
            emergencyContact: personalInfo.emergencyContact,
            maritalStatus: personalInfo.maritalStatus || 'single',
            numberOfDependents: personalInfo.numberOfDependents || 0
        },
        employment: {
            employmentStatus: employment.employmentStatus || 'active',
            jobTitle: employment.jobTitle,
            jobTitleArabic: employment.jobTitleArabic,
            employmentType: employment.employmentType || 'full_time',
            contractType: employment.contractType || 'indefinite',
            contractStartDate: employment.contractStartDate,
            contractEndDate: employment.contractEndDate,
            hireDate: employment.hireDate,
            probationPeriod: employment.probationPeriod !== undefined ? employment.probationPeriod : 90,
            onProbation: employment.onProbation !== undefined ? employment.onProbation : true,
            workSchedule: employment.workSchedule || {
                weeklyHours: 48,
                dailyHours: 8,
                workDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
                restDay: 'Friday'
            },
            reportsTo: employment.reportsTo,
            departmentName: employment.departmentName
        },
        compensation: {
            basicSalary: compensation.basicSalary,
            currency: compensation.currency || 'SAR',
            allowances: compensation.allowances || [],
            paymentFrequency: compensation.paymentFrequency || 'monthly',
            paymentMethod: compensation.paymentMethod || 'bank_transfer',
            bankDetails: compensation.bankDetails
        },
        firmId,
        lawyerId,
        createdBy: lawyerId
    };

    // Add GOSI data if provided
    if (gosi) {
        employeeData.gosi = {
            registered: gosi.registered || false,
            gosiNumber: gosi.gosiNumber,
            employeeContribution: gosi.employeeContribution !== undefined ? gosi.employeeContribution : 9.75,
            employerContribution: gosi.employerContribution !== undefined ? gosi.employerContribution : 12.75
        };
    }

    // Add organization data if provided (for medium/firm)
    if (organization) {
        employeeData.organization = {
            branchId: organization.branchId,
            departmentName: organization.departmentName,
            teamId: organization.teamId,
            supervisorId: organization.supervisorId,
            costCenter: organization.costCenter
        };
    }

    // Add leave data if provided
    if (leave) {
        employeeData.leave = {
            annualLeaveEntitlement: leave.annualLeaveEntitlement || 21
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

    const {
        status,
        department,
        employmentType,
        officeType,
        search,
        page = 1,
        limit = 20
    } = req.query;

    // Build query
    const query = firmId ? { firmId } : { lawyerId };

    if (status) query['employment.employmentStatus'] = status;
    if (department) query['employment.departmentName'] = department;
    if (employmentType) query['employment.employmentType'] = employmentType;
    if (officeType) query.officeType = officeType;

    if (search) {
        query.$or = [
            { 'personalInfo.fullNameArabic': { $regex: search, $options: 'i' } },
            { 'personalInfo.fullNameEnglish': { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } },
            { 'personalInfo.nationalId': { $regex: search, $options: 'i' } },
            { 'personalInfo.mobile': { $regex: search, $options: 'i' } },
            { 'personalInfo.email': { $regex: search, $options: 'i' } }
        ];
    }

    const employees = await Employee.find(query)
        .populate('employment.reportsTo', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('organization.supervisorId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Employee.countDocuments(query);

    return res.json({
        success: true,
        employees,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
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

    const employee = await Employee.findById(id);

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

    // Build update object with nested fields
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

    if (officeType) updateData.officeType = officeType;

    // Handle nested personalInfo updates
    if (personalInfo) {
        Object.keys(personalInfo).forEach(key => {
            updateData[`personalInfo.${key}`] = personalInfo[key];
        });
    }

    // Handle nested employment updates
    if (employment) {
        Object.keys(employment).forEach(key => {
            updateData[`employment.${key}`] = employment[key];
        });
    }

    // Handle nested compensation updates
    if (compensation) {
        Object.keys(compensation).forEach(key => {
            updateData[`compensation.${key}`] = compensation[key];
        });
    }

    // Handle nested gosi updates
    if (gosi) {
        Object.keys(gosi).forEach(key => {
            updateData[`gosi.${key}`] = gosi[key];
        });
    }

    // Handle nested organization updates
    if (organization) {
        Object.keys(organization).forEach(key => {
            updateData[`organization.${key}`] = organization[key];
        });
    }

    // Handle nested leave updates
    if (leave) {
        Object.keys(leave).forEach(key => {
            updateData[`leave.${key}`] = leave[key];
        });
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
        id,
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

    const employee = await Employee.findById(id);

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

    await Employee.findByIdAndDelete(id);

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
    const { name, nameAr, amount, taxable, includedInEOSB, includedInGOSI } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!name || amount === undefined) {
        throw CustomException('Allowance name and amount are required', 400);
    }

    const employee = await Employee.findById(id);

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

    employee.compensation.allowances.push({
        name,
        nameAr,
        amount,
        taxable: taxable !== undefined ? taxable : true,
        includedInEOSB: includedInEOSB !== undefined ? includedInEOSB : true,
        includedInGOSI: includedInGOSI !== undefined ? includedInGOSI : false
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

    const employee = await Employee.findById(id);

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

module.exports = {
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
    addAllowance,
    removeAllowance,
    getFormOptions
};
