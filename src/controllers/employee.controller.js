const { Employee } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create employee
 * POST /api/employees
 */
const createEmployee = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const {
        firstName,
        lastName,
        firstNameAr,
        lastNameAr,
        email,
        phone,
        alternatePhone,
        dateOfBirth,
        gender,
        nationality,
        nationalId,
        passportNumber,
        passportExpiry,
        maritalStatus,
        numberOfDependents,
        address,
        department,
        position,
        positionAr,
        employmentType,
        hireDate,
        probationEndDate,
        contractEndDate,
        workSchedule,
        workingHoursPerDay,
        managerId,
        userId,
        bankName,
        bankAccountNumber,
        iban,
        emergencyContact,
        notes,
        tags
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !gender || !department || !position || !hireDate) {
        throw new CustomException('الحقول المطلوبة: الاسم الأول، الاسم الأخير، البريد الإلكتروني، الهاتف، الجنس، القسم، المنصب، تاريخ التعيين', 400);
    }

    // Check if employee with same email exists
    const existingEmployee = await Employee.findOne({ lawyerId, email });
    if (existingEmployee) {
        throw new CustomException('يوجد موظف بهذا البريد الإلكتروني بالفعل', 400);
    }

    const employee = await Employee.create({
        lawyerId,
        firstName,
        lastName,
        firstNameAr,
        lastNameAr,
        email,
        phone,
        alternatePhone,
        dateOfBirth,
        gender,
        nationality,
        nationalId,
        passportNumber,
        passportExpiry,
        maritalStatus,
        numberOfDependents,
        address,
        department,
        position,
        positionAr,
        employmentType,
        hireDate,
        probationEndDate,
        contractEndDate,
        workSchedule,
        workingHoursPerDay,
        managerId,
        userId,
        bankName,
        bankAccountNumber,
        iban,
        emergencyContact,
        notes,
        tags
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الموظف بنجاح',
        data: employee
    });
});

/**
 * Get all employees
 * GET /api/employees
 */
const getEmployees = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const {
        status,
        department,
        employmentType,
        search,
        page = 1,
        limit = 50
    } = req.query;

    const query = { lawyerId };

    if (status) query.status = status;
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;

    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { employeeId: { $regex: search, $options: 'i' } }
        ];
    }

    const employees = await Employee.find(query)
        .populate('managerId', 'firstName lastName employeeId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Employee.countDocuments(query);

    res.status(200).json({
        success: true,
        data: employees,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single employee
 * GET /api/employees/:id
 */
const getEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const employee = await Employee.findById(id)
        .populate('managerId', 'firstName lastName employeeId position');

    if (!employee) {
        throw new CustomException('الموظف غير موجود', 404);
    }

    if (employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    // Get subordinates
    const subordinates = await Employee.find({ managerId: id, status: 'active' })
        .select('firstName lastName employeeId position department');

    res.status(200).json({
        success: true,
        data: {
            employee,
            subordinates
        }
    });
});

/**
 * Update employee
 * PUT /api/employees/:id
 */
const updateEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const employee = await Employee.findById(id);

    if (!employee) {
        throw new CustomException('الموظف غير موجود', 404);
    }

    if (employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    // Check if email is being changed and already exists
    if (req.body.email && req.body.email !== employee.email) {
        const existingEmployee = await Employee.findOne({
            lawyerId,
            email: req.body.email,
            _id: { $ne: id }
        });
        if (existingEmployee) {
            throw new CustomException('يوجد موظف بهذا البريد الإلكتروني بالفعل', 400);
        }
    }

    const allowedFields = [
        'firstName', 'lastName', 'firstNameAr', 'lastNameAr',
        'email', 'phone', 'alternatePhone', 'dateOfBirth', 'gender',
        'nationality', 'nationalId', 'passportNumber', 'passportExpiry',
        'maritalStatus', 'numberOfDependents', 'address', 'department',
        'position', 'positionAr', 'employmentType', 'hireDate',
        'probationEndDate', 'contractEndDate', 'workSchedule',
        'workingHoursPerDay', 'managerId', 'userId', 'bankName',
        'bankAccountNumber', 'iban', 'leaveBalances', 'emergencyContact',
        'status', 'terminationDate', 'terminationReason', 'image', 'notes', 'tags'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            employee[field] = req.body[field];
        }
    });

    await employee.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث الموظف بنجاح',
        data: employee
    });
});

/**
 * Delete employee
 * DELETE /api/employees/:id
 */
const deleteEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const employee = await Employee.findById(id);

    if (!employee) {
        throw new CustomException('الموظف غير موجود', 404);
    }

    if (employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    // Check if employee has subordinates
    const subordinates = await Employee.countDocuments({ managerId: id, status: 'active' });
    if (subordinates > 0) {
        throw new CustomException('لا يمكن حذف موظف لديه مرؤوسين نشطين', 400);
    }

    await Employee.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف الموظف بنجاح'
    });
});

/**
 * Search employees
 * GET /api/employees/search
 */
const searchEmployees = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const lawyerId = req.userID;

    if (!q || q.length < 2) {
        throw new CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
    }

    const employees = await Employee.searchEmployees(lawyerId, q);

    res.status(200).json({
        success: true,
        data: employees,
        count: employees.length
    });
});

/**
 * Get employee statistics
 * GET /api/employees/stats
 */
const getEmployeeStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const totalEmployees = await Employee.countDocuments({ lawyerId, status: 'active' });

    const byDepartment = await Employee.getDepartmentStats(lawyerId);

    const byStatus = await Employee.aggregate([
        { $match: { lawyerId: new (require('mongoose').Types.ObjectId)(lawyerId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byEmploymentType = await Employee.aggregate([
        { $match: { lawyerId: new (require('mongoose').Types.ObjectId)(lawyerId), status: 'active' } },
        { $group: { _id: '$employmentType', count: { $sum: 1 } } }
    ]);

    const byGender = await Employee.aggregate([
        { $match: { lawyerId: new (require('mongoose').Types.ObjectId)(lawyerId), status: 'active' } },
        { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalEmployees,
            byDepartment,
            byStatus,
            byEmploymentType,
            byGender
        }
    });
});

/**
 * Update employee leave balance
 * PATCH /api/employees/:id/leave-balance
 */
const updateLeaveBalance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { leaveType, amount, operation } = req.body;

    const employee = await Employee.findById(id);

    if (!employee) {
        throw new CustomException('الموظف غير موجود', 404);
    }

    if (employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    if (!leaveType || amount === undefined) {
        throw new CustomException('نوع الإجازة والمبلغ مطلوبان', 400);
    }

    if (!employee.leaveBalances[leaveType] && employee.leaveBalances[leaveType] !== 0) {
        throw new CustomException('نوع الإجازة غير صالح', 400);
    }

    if (operation === 'add') {
        employee.leaveBalances[leaveType] += amount;
    } else if (operation === 'subtract') {
        employee.leaveBalances[leaveType] -= amount;
    } else {
        employee.leaveBalances[leaveType] = amount;
    }

    await employee.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث رصيد الإجازات بنجاح',
        data: employee.leaveBalances
    });
});

/**
 * Upload employee document
 * POST /api/employees/:id/documents
 */
const addDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const { name, type, fileUrl, fileKey, expiryDate } = req.body;

    const employee = await Employee.findById(id);

    if (!employee) {
        throw new CustomException('الموظف غير موجود', 404);
    }

    if (employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    if (!name || !type) {
        throw new CustomException('اسم المستند ونوعه مطلوبان', 400);
    }

    employee.documents.push({
        name,
        type,
        fileUrl,
        fileKey,
        expiryDate,
        uploadedAt: new Date()
    });

    await employee.save();

    res.status(201).json({
        success: true,
        message: 'تم إضافة المستند بنجاح',
        data: employee.documents
    });
});

/**
 * Delete employee document
 * DELETE /api/employees/:id/documents/:docId
 */
const deleteDocument = asyncHandler(async (req, res) => {
    const { id, docId } = req.params;
    const lawyerId = req.userID;

    const employee = await Employee.findById(id);

    if (!employee) {
        throw new CustomException('الموظف غير موجود', 404);
    }

    if (employee.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    employee.documents = employee.documents.filter(doc => doc._id.toString() !== docId);
    await employee.save();

    res.status(200).json({
        success: true,
        message: 'تم حذف المستند بنجاح'
    });
});

/**
 * Get org chart (hierarchy)
 * GET /api/employees/org-chart
 */
const getOrgChart = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const employees = await Employee.find({ lawyerId, status: 'active' })
        .select('firstName lastName employeeId position department managerId image')
        .lean();

    // Build hierarchy
    const buildHierarchy = (employees, managerId = null) => {
        return employees
            .filter(e => {
                if (managerId === null) {
                    return !e.managerId;
                }
                return e.managerId && e.managerId.toString() === managerId;
            })
            .map(e => ({
                ...e,
                subordinates: buildHierarchy(employees, e._id.toString())
            }));
    };

    const orgChart = buildHierarchy(employees);

    res.status(200).json({
        success: true,
        data: orgChart
    });
});

module.exports = {
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
    getEmployeeStats,
    updateLeaveBalance,
    addDocument,
    deleteDocument,
    getOrgChart
};
