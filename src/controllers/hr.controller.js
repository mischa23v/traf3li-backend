const { Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// ═══════════════════════════════════════════════════════════════
// CREATE EMPLOYEE
// POST /api/hr/employees
// ═══════════════════════════════════════════════════════════════
const createEmployee = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        // Personal data
        firstName,
        lastName,
        firstNameAr,
        lastNameAr,
        idType,
        idNumber,
        nationality,
        gender,
        dateOfBirth,
        phone,
        email,
        address,
        maritalStatus,
        dependents,
        emergencyContact,

        // Employment data
        department,
        jobTitle,
        jobTitleAr,
        employmentType,
        contractType,
        hireDate,
        contractEndDate,
        probationDays,
        workSchedule,

        // Salary & allowances
        basicSalary,
        allowances,  // Array of { name, nameAr, amount }
        paymentFrequency,
        paymentMethod,
        bankDetails,

        // GOSI
        gosi,

        // Organizational (firm only)
        branch,
        team,
        supervisor,
        costCenter,

        // Leave
        leaveBalance,

        notes
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
        throw CustomException('First name and last name are required', 400);
    }
    if (!idNumber) {
        throw CustomException('ID number is required', 400);
    }
    if (!gender) {
        throw CustomException('Gender is required', 400);
    }
    if (!phone) {
        throw CustomException('Phone number is required', 400);
    }
    if (!jobTitle) {
        throw CustomException('Job title is required', 400);
    }
    if (!hireDate) {
        throw CustomException('Hire date is required', 400);
    }
    if (basicSalary === undefined || basicSalary < 0) {
        throw CustomException('Basic salary is required', 400);
    }

    // Check duplicate ID number
    const existing = await Employee.findOne({
        idNumber,
        $or: [{ firmId }, { lawyerId }]
    });
    if (existing) {
        throw CustomException('Employee with this ID number already exists', 400);
    }

    const employee = await Employee.create({
        // Personal
        firstName,
        lastName,
        firstNameAr,
        lastNameAr,
        idType,
        idNumber,
        nationality,
        gender,
        dateOfBirth,
        phone,
        email,
        address,
        maritalStatus,
        dependents,
        emergencyContact,

        // Employment
        department,
        jobTitle,
        jobTitleAr,
        employmentType,
        contractType,
        hireDate,
        contractEndDate,
        probationDays,
        workSchedule,

        // Salary
        basicSalary,
        allowances: allowances || [],
        paymentFrequency,
        paymentMethod,
        bankDetails,

        // GOSI
        gosi,

        // Organizational
        branch,
        team,
        supervisor,
        costCenter,

        // Leave
        leaveBalance,

        notes,

        // Ownership
        firmId,
        lawyerId,
        createdBy: lawyerId
    });

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
        search,
        page = 1,
        limit = 20
    } = req.query;

    // Build query
    const query = firmId ? { firmId } : { lawyerId };

    if (status) query.status = status;
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;

    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { firstNameAr: { $regex: search, $options: 'i' } },
            { lastNameAr: { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } },
            { idNumber: { $regex: search, $options: 'i' } }
        ];
    }

    const employees = await Employee.find(query)
        .populate('supervisor', 'firstName lastName')
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
        .populate('supervisor', 'firstName lastName');

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

    // Update fields
    const updatedEmployee = await Employee.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
    ).populate('supervisor', 'firstName lastName');

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
    const { name, nameAr, amount } = req.body;
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

    employee.allowances.push({ name, nameAr, amount });
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

    employee.allowances = employee.allowances.filter(
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
// GET FORM OPTIONS
// GET /api/hr/options
// ═══════════════════════════════════════════════════════════════
const getFormOptions = asyncHandler(async (req, res) => {
    return res.json({
        success: true,
        options: {
            // Office types - shown at top like invoice page
            officeTypes: [
                {
                    value: 'solo',
                    label: 'Solo Lawyer',
                    labelAr: 'محامي فردي',
                    description: 'Independent lawyer',
                    descriptionAr: 'محامي مستقل'
                },
                {
                    value: 'small',
                    label: 'Small Office',
                    labelAr: 'مكتب صغير',
                    description: '2-5 employees',
                    descriptionAr: '٢-٥ موظفين'
                },
                {
                    value: 'medium',
                    label: 'Medium Office',
                    labelAr: 'مكتب متوسط',
                    description: '6-20 employees',
                    descriptionAr: '٦-٢٠ موظف'
                },
                {
                    value: 'firm',
                    label: 'Law Firm',
                    labelAr: 'شركة محاماة',
                    description: '20+ employees',
                    descriptionAr: '٢٠+ موظف'
                }
            ],

            // Form sections with basic/advanced grouping
            formSections: {
                // BASIC SECTIONS - Always visible
                basic: [
                    {
                        id: 'personal',
                        label: 'Personal Data',
                        labelAr: 'البيانات الشخصية',
                        fields: ['firstName', 'lastName', 'idNumber', 'gender', 'phone', 'email']
                    },
                    {
                        id: 'employment',
                        label: 'Employment Data',
                        labelAr: 'بيانات التوظيف',
                        fields: ['jobTitle', 'employmentType', 'hireDate']
                    },
                    {
                        id: 'salary',
                        label: 'Salary & Allowances',
                        labelAr: 'الراتب والبدلات',
                        fields: ['basicSalary', 'allowances']
                    }
                ],

                // ADVANCED SECTIONS - Collapsed by default (click to expand)
                advanced: [
                    {
                        id: 'personal_advanced',
                        label: 'Additional Personal Info',
                        labelAr: 'معلومات شخصية إضافية',
                        fields: ['firstNameAr', 'lastNameAr', 'idType', 'nationality', 'dateOfBirth', 'address', 'maritalStatus', 'dependents']
                    },
                    {
                        id: 'emergency',
                        label: 'Emergency Contact',
                        labelAr: 'جهة اتصال الطوارئ',
                        fields: ['emergencyContact']
                    },
                    {
                        id: 'employment_advanced',
                        label: 'Contract Details',
                        labelAr: 'تفاصيل العقد',
                        fields: ['contractType', 'contractEndDate', 'probationDays', 'department', 'jobTitleAr']
                    },
                    {
                        id: 'work_schedule',
                        label: 'Work Schedule',
                        labelAr: 'جدول العمل',
                        fields: ['workSchedule']
                    },
                    {
                        id: 'payment',
                        label: 'Payment Details',
                        labelAr: 'تفاصيل الدفع',
                        fields: ['paymentFrequency', 'paymentMethod', 'bankDetails']
                    },
                    {
                        id: 'gosi',
                        label: 'GOSI (Social Insurance)',
                        labelAr: 'التأمينات الاجتماعية',
                        fields: ['gosi']
                    },
                    {
                        id: 'organization',
                        label: 'Organizational Structure',
                        labelAr: 'الهيكل التنظيمي',
                        forTypes: ['medium', 'firm'],  // Only for medium/firm
                        fields: ['branch', 'team', 'supervisor', 'costCenter']
                    },
                    {
                        id: 'leave',
                        label: 'Leave Balance',
                        labelAr: 'رصيد الإجازات',
                        fields: ['leaveBalance']
                    }
                ]
            },

            // Fields config by office type
            fieldsByOfficeType: {
                solo: {
                    required: ['firstName', 'lastName', 'idNumber', 'gender', 'phone', 'jobTitle', 'hireDate', 'basicSalary'],
                    hidden: ['branch', 'team', 'supervisor', 'costCenter', 'department']
                },
                small: {
                    required: ['firstName', 'lastName', 'idNumber', 'gender', 'phone', 'jobTitle', 'hireDate', 'basicSalary'],
                    hidden: ['branch', 'costCenter']
                },
                medium: {
                    required: ['firstName', 'lastName', 'idNumber', 'gender', 'phone', 'jobTitle', 'hireDate', 'basicSalary', 'department'],
                    hidden: []
                },
                firm: {
                    required: ['firstName', 'lastName', 'idNumber', 'gender', 'phone', 'jobTitle', 'hireDate', 'basicSalary', 'department', 'branch'],
                    hidden: []
                }
            },

            // Dropdown options
            idTypes: [
                { value: 'national_id', label: 'National ID', labelAr: 'هوية وطنية' },
                { value: 'iqama', label: 'Iqama', labelAr: 'إقامة' },
                { value: 'passport', label: 'Passport', labelAr: 'جواز سفر' }
            ],
            genders: [
                { value: 'male', label: 'Male', labelAr: 'ذكر' },
                { value: 'female', label: 'Female', labelAr: 'أنثى' }
            ],
            maritalStatuses: [
                { value: 'single', label: 'Single', labelAr: 'أعزب' },
                { value: 'married', label: 'Married', labelAr: 'متزوج' },
                { value: 'divorced', label: 'Divorced', labelAr: 'مطلق' },
                { value: 'widowed', label: 'Widowed', labelAr: 'أرمل' }
            ],
            employmentTypes: [
                { value: 'full_time', label: 'Full Time', labelAr: 'دوام كامل' },
                { value: 'part_time', label: 'Part Time', labelAr: 'دوام جزئي' },
                { value: 'contract', label: 'Contract', labelAr: 'عقد' },
                { value: 'temporary', label: 'Temporary', labelAr: 'مؤقت' },
                { value: 'intern', label: 'Intern', labelAr: 'متدرب' }
            ],
            contractTypes: [
                { value: 'unlimited', label: 'Unlimited', labelAr: 'غير محدد المدة' },
                { value: 'limited', label: 'Limited', labelAr: 'محدد المدة' },
                { value: 'seasonal', label: 'Seasonal', labelAr: 'موسمي' },
                { value: 'task_based', label: 'Task Based', labelAr: 'لمهمة محددة' }
            ],
            paymentFrequencies: [
                { value: 'monthly', label: 'Monthly', labelAr: 'شهري' },
                { value: 'bi_weekly', label: 'Bi-Weekly', labelAr: 'نصف شهري' },
                { value: 'weekly', label: 'Weekly', labelAr: 'أسبوعي' }
            ],
            paymentMethods: [
                { value: 'bank_transfer', label: 'Bank Transfer', labelAr: 'تحويل بنكي' },
                { value: 'cash', label: 'Cash', labelAr: 'نقدي' },
                { value: 'check', label: 'Check', labelAr: 'شيك' }
            ],
            statuses: [
                { value: 'active', label: 'Active', labelAr: 'نشط' },
                { value: 'on_leave', label: 'On Leave', labelAr: 'في إجازة' },
                { value: 'suspended', label: 'Suspended', labelAr: 'موقوف' },
                { value: 'terminated', label: 'Terminated', labelAr: 'منتهي' },
                { value: 'resigned', label: 'Resigned', labelAr: 'مستقيل' }
            ],
            relationships: [
                { value: 'spouse', label: 'Spouse', labelAr: 'زوج/زوجة' },
                { value: 'parent', label: 'Parent', labelAr: 'والد/والدة' },
                { value: 'sibling', label: 'Sibling', labelAr: 'أخ/أخت' },
                { value: 'child', label: 'Child', labelAr: 'ابن/ابنة' },
                { value: 'friend', label: 'Friend', labelAr: 'صديق' },
                { value: 'other', label: 'Other', labelAr: 'أخرى' }
            ],
            banks: [
                { value: 'alrajhi', label: 'Al Rajhi Bank', labelAr: 'مصرف الراجحي' },
                { value: 'ncb', label: 'Al Ahli Bank (SNB)', labelAr: 'البنك الأهلي' },
                { value: 'riyad', label: 'Riyad Bank', labelAr: 'بنك الرياض' },
                { value: 'sabb', label: 'SABB', labelAr: 'ساب' },
                { value: 'bsf', label: 'Banque Saudi Fransi', labelAr: 'البنك السعودي الفرنسي' },
                { value: 'alinma', label: 'Alinma Bank', labelAr: 'مصرف الإنماء' },
                { value: 'albilad', label: 'Bank Albilad', labelAr: 'بنك البلاد' },
                { value: 'aljazira', label: 'Bank AlJazira', labelAr: 'بنك الجزيرة' },
                { value: 'anb', label: 'Arab National Bank', labelAr: 'البنك العربي الوطني' },
                { value: 'gulf', label: 'Gulf International Bank', labelAr: 'بنك الخليج الدولي' }
            ],
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
            cities: [
                { value: 'riyadh', label: 'Riyadh', labelAr: 'الرياض' },
                { value: 'jeddah', label: 'Jeddah', labelAr: 'جدة' },
                { value: 'makkah', label: 'Makkah', labelAr: 'مكة المكرمة' },
                { value: 'madinah', label: 'Madinah', labelAr: 'المدينة المنورة' },
                { value: 'dammam', label: 'Dammam', labelAr: 'الدمام' },
                { value: 'khobar', label: 'Khobar', labelAr: 'الخبر' },
                { value: 'dhahran', label: 'Dhahran', labelAr: 'الظهران' },
                { value: 'taif', label: 'Taif', labelAr: 'الطائف' },
                { value: 'tabuk', label: 'Tabuk', labelAr: 'تبوك' },
                { value: 'buraidah', label: 'Buraidah', labelAr: 'بريدة' },
                { value: 'khamis', label: 'Khamis Mushait', labelAr: 'خميس مشيط' },
                { value: 'abha', label: 'Abha', labelAr: 'أبها' },
                { value: 'hail', label: 'Hail', labelAr: 'حائل' },
                { value: 'najran', label: 'Najran', labelAr: 'نجران' },
                { value: 'jizan', label: 'Jizan', labelAr: 'جازان' },
                { value: 'yanbu', label: 'Yanbu', labelAr: 'ينبع' },
                { value: 'jubail', label: 'Jubail', labelAr: 'الجبيل' }
            ],
            regions: [
                { value: 'riyadh', label: 'Riyadh Region', labelAr: 'منطقة الرياض' },
                { value: 'makkah', label: 'Makkah Region', labelAr: 'منطقة مكة المكرمة' },
                { value: 'madinah', label: 'Madinah Region', labelAr: 'منطقة المدينة المنورة' },
                { value: 'eastern', label: 'Eastern Province', labelAr: 'المنطقة الشرقية' },
                { value: 'qassim', label: 'Qassim Region', labelAr: 'منطقة القصيم' },
                { value: 'asir', label: 'Asir Region', labelAr: 'منطقة عسير' },
                { value: 'tabuk', label: 'Tabuk Region', labelAr: 'منطقة تبوك' },
                { value: 'hail', label: 'Hail Region', labelAr: 'منطقة حائل' },
                { value: 'northern', label: 'Northern Borders', labelAr: 'منطقة الحدود الشمالية' },
                { value: 'jazan', label: 'Jazan Region', labelAr: 'منطقة جازان' },
                { value: 'najran', label: 'Najran Region', labelAr: 'منطقة نجران' },
                { value: 'bahah', label: 'Al Bahah Region', labelAr: 'منطقة الباحة' },
                { value: 'jouf', label: 'Al Jouf Region', labelAr: 'منطقة الجوف' }
            ]
        }
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
