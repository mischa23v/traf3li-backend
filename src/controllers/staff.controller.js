const { Staff } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeString, sanitizeEmail, sanitizePhone } = require('../utils/securityUtils');

/**
 * Create staff member
 * POST /api/lawyers (or /api/staff)
 *
 * SECURITY:
 * - Uses allowlist approach for field filtering
 * - Validates all input fields
 * - IDOR protected: staff must belong to user's firm
 */
const createStaff = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Only allow specific fields for creation (role will be set by admin/system)
    const allowedCreateFields = ['firstName', 'lastName', 'email', 'phone', 'jobTitle', 'department', 'role'];
    const filteredData = pickAllowedFields(req.body, allowedCreateFields);

    // Input validation
    if (!filteredData.firstName || sanitizeString(filteredData.firstName).trim() === '') {
        throw CustomException('الاسم الأول مطلوب', 400);
    }
    if (!filteredData.lastName || sanitizeString(filteredData.lastName).trim() === '') {
        throw CustomException('الاسم الأخير مطلوب', 400);
    }
    if (!filteredData.email || sanitizeEmail(filteredData.email).trim() === '') {
        throw CustomException('البريد الإلكتروني مطلوب', 400);
    }
    if (!filteredData.role || sanitizeString(filteredData.role).trim() === '') {
        throw CustomException('الدور الوظيفي مطلوب', 400);
    }

    // Sanitize string fields
    const staffData = {
        firstName: sanitizeString(filteredData.firstName),
        lastName: sanitizeString(filteredData.lastName),
        email: sanitizeEmail(filteredData.email),
        phone: filteredData.phone ? sanitizePhone(filteredData.phone) : undefined,
        jobTitle: filteredData.jobTitle ? sanitizeString(filteredData.jobTitle) : undefined,
        department: filteredData.department ? sanitizeString(filteredData.department) : undefined,
        role: sanitizeString(filteredData.role),
        lawyerId,
        firmId,
        createdBy: lawyerId
    };

    // Remove undefined fields
    Object.keys(staffData).forEach(key =>
        staffData[key] === undefined && delete staffData[key]
    );

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
 *
 * SECURITY:
 * - IDOR protected: filters by firmId/lawyerId
 * - Only returns staff that belong to user's firm/lawyer
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
 *
 * SECURITY:
 * - IDOR protected: staff must belong to user's firm/lawyer
 * - Returns 404 if staff doesn't exist or user doesn't have access
 */
const getStaffById = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Query includes firmId/lawyerId to ensure staff belongs to user
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
 *
 * SECURITY:
 * - Uses strict allowlist approach (only 6 fields allowed)
 * - NEVER allows: role, permissions, salary, rates, billing permissions
 * - IDOR protected: staff must belong to user's firm/lawyer
 * - Validates and sanitizes all input
 */
const updateStaff = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Ensure staff belongs to user's firm/lawyer
    const accessQuery = firmId
        ? { $or: [{ _id: id }, { staffId: id }], firmId }
        : { $or: [{ _id: id }, { staffId: id }], lawyerId };

    const staff = await Staff.findOne(accessQuery);

    if (!staff) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    // STRICT ALLOWLIST: Only these 6 fields can be updated
    // NEVER allow: role, permissions, salary, rates, billing permissions, other sensitive fields
    const allowedUpdateFields = ['firstName', 'lastName', 'email', 'phone', 'jobTitle', 'department'];
    const filteredData = pickAllowedFields(req.body, allowedUpdateFields);

    // Input validation and sanitization
    const updates = {};

    if (filteredData.firstName !== undefined) {
        const sanitized = sanitizeString(filteredData.firstName);
        if (!sanitized || sanitized.trim() === '') {
            throw CustomException('الاسم الأول لا يمكن أن يكون فارغاً', 400);
        }
        updates.firstName = sanitized;
    }

    if (filteredData.lastName !== undefined) {
        const sanitized = sanitizeString(filteredData.lastName);
        if (!sanitized || sanitized.trim() === '') {
            throw CustomException('الاسم الأخير لا يمكن أن يكون فارغاً', 400);
        }
        updates.lastName = sanitized;
    }

    if (filteredData.email !== undefined) {
        const sanitized = sanitizeEmail(filteredData.email);
        if (!sanitized || sanitized.trim() === '') {
            throw CustomException('البريد الإلكتروني غير صحيح', 400);
        }
        updates.email = sanitized;
    }

    if (filteredData.phone !== undefined) {
        const sanitized = sanitizePhone(filteredData.phone);
        if (sanitized && sanitized.trim() !== '') {
            updates.phone = sanitized;
        }
    }

    if (filteredData.jobTitle !== undefined) {
        const sanitized = sanitizeString(filteredData.jobTitle);
        if (sanitized && sanitized.trim() !== '') {
            updates.jobTitle = sanitized;
        }
    }

    if (filteredData.department !== undefined) {
        const sanitized = sanitizeString(filteredData.department);
        if (sanitized && sanitized.trim() !== '') {
            updates.department = sanitized;
        }
    }

    // Apply updates
    Object.assign(staff, updates);
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
 *
 * SECURITY:
 * - IDOR protected: staff must belong to user's firm/lawyer
 * - Returns 404 if staff doesn't exist or user doesn't have access
 */
const deleteStaff = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR Protection: Query includes firmId/lawyerId to ensure staff belongs to user
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

/**
 * Bulk delete staff members
 * POST /api/staff/bulk-delete
 *
 * SECURITY:
 * - IDOR protected: only deletes staff that belong to user's firm/lawyer
 * - Validates that IDs is an array and not empty
 * - Only deletes the count of staff that user actually has access to
 */
const bulkDeleteStaff = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('يجب توفير قائمة المعرفات / IDs list is required', 400);
    }

    // Build access query with IDOR Protection
    // Only deletes staff that belong to user's firm/lawyer
    const accessQuery = firmId
        ? { _id: { $in: ids }, firmId }
        : { _id: { $in: ids }, lawyerId };

    const result = await Staff.deleteMany(accessQuery);

    res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} عضو فريق بنجاح / ${result.deletedCount} staff member(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

module.exports = {
    createStaff,
    getStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    bulkDeleteStaff,
    getTeam,
    getStats
};
