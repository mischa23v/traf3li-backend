const { Staff } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create staff member
 * POST /api/lawyers (or /api/staff)
 */
const createStaff = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;

    const staffData = {
        ...req.body,
        lawyerId,
        firmId,
        createdBy: lawyerId
    };

    // Validate required fields
    if (!staffData.firstName || !staffData.lastName) {
        throw CustomException('الاسم الأول والأخير مطلوبان', 400);
    }
    if (!staffData.email) {
        throw CustomException('البريد الإلكتروني مطلوب', 400);
    }
    if (!staffData.role) {
        throw CustomException('الدور الوظيفي مطلوب', 400);
    }

    const staff = await Staff.create(staffData);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء عضو الفريق بنجاح',
        data: staff
    });
});

/**
 * Get all staff with filters
 * GET /api/lawyers (or /api/staff)
 */
const getStaff = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;
    const {
        role, status, department, search, practiceArea,
        page = 1, limit = 50, sortBy = 'lastName', sortOrder = 'asc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedPage = parseInt(page) || 1;

    const filters = {
        firmId,
        role,
        status,
        department,
        search,
        practiceArea,
        sortBy,
        sortOrder,
        limit: parsedLimit,
        skip: (parsedPage - 1) * parsedLimit
    };

    const staff = await Staff.getStaff(lawyerId, filters);

    // Count query
    const countQuery = firmId ? { firmId } : { lawyerId };
    if (role) countQuery.role = role;
    if (status) countQuery.status = status;
    if (department) countQuery.department = department;
    const total = await Staff.countDocuments(countQuery);

    res.json({
        success: true,
        data: staff,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single staff member
 * GET /api/lawyers/:id (or /api/staff/:id)
 */
const getStaffById = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const accessQuery = firmId
        ? { $or: [{ _id: id }, { staffId: id }], firmId }
        : { $or: [{ _id: id }, { staffId: id }], lawyerId };

    const staff = await Staff.findOne(accessQuery)
        .populate('reportsTo', 'firstName lastName email')
        .populate('userId', 'avatar email');

    if (!staff) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    res.json({
        success: true,
        data: staff
    });
});

/**
 * Update staff member
 * PUT /api/lawyers/:id (or /api/staff/:id)
 */
const updateStaff = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const accessQuery = firmId
        ? { $or: [{ _id: id }, { staffId: id }], firmId }
        : { $or: [{ _id: id }, { staffId: id }], lawyerId };

    const staff = await Staff.findOne(accessQuery);

    if (!staff) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    const allowedFields = [
        'salutation', 'firstName', 'middleName', 'lastName', 'preferredName', 'avatar',
        'email', 'workEmail', 'phone', 'mobilePhone', 'officePhone', 'extension',
        'role', 'status', 'employmentType', 'department', 'reportsTo', 'officeLocation',
        'hireDate', 'startDate', 'terminationDate',
        'barLicenses', 'practiceAreas', 'education', 'certifications', 'languages',
        'hourlyRate', 'standardRate', 'discountedRate', 'premiumRate', 'costRate',
        'billableHoursTarget', 'revenueTarget', 'utilizationTarget',
        'canBillTime', 'canApproveTime', 'canViewRates', 'canEditRates',
        'bio', 'bioAr', 'notes', 'tags'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            staff[field] = req.body[field];
        }
    });

    staff.updatedBy = lawyerId;
    await staff.save();

    res.json({
        success: true,
        message: 'تم تحديث عضو الفريق بنجاح',
        data: staff
    });
});

/**
 * Delete staff member
 * DELETE /api/lawyers/:id (or /api/staff/:id)
 */
const deleteStaff = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const accessQuery = firmId
        ? { $or: [{ _id: id }, { staffId: id }], firmId }
        : { $or: [{ _id: id }, { staffId: id }], lawyerId };

    const staff = await Staff.findOneAndDelete(accessQuery);

    if (!staff) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    res.json({
        success: true,
        message: 'تم حذف عضو الفريق بنجاح'
    });
});

/**
 * Get active team members (for dropdowns)
 * GET /api/lawyers/team
 */
const getTeam = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { attorneysOnly, billableOnly } = req.query;

    const filters = {
        firmId,
        attorneysOnly: attorneysOnly === 'true',
        billableOnly: billableOnly === 'true'
    };

    const team = await Staff.getTeam(lawyerId, filters);

    res.json({
        success: true,
        data: team.map(member => ({
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            role: member.role,
            avatar: member.avatar
        }))
    });
});

/**
 * Get staff statistics
 * GET /api/lawyers/stats
 */
const getStats = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;

    const stats = await Staff.getStats(lawyerId, { firmId });

    res.json({
        success: true,
        stats
    });
});

module.exports = {
    createStaff,
    getStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    getTeam,
    getStats
};
