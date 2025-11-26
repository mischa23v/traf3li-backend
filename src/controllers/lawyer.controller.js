const { User, Staff } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// Get all lawyers
const getLawyers = async (request, response) => {
    try {
        const lawyers = await User.find({
            isSeller: true,
            role: 'lawyer'
        })
            .select('firstName lastName email phone image lawyerProfile role city createdAt')
            .sort({ firstName: 1 });

        return response.send({
            error: false,
            lawyers
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single lawyer by ID
const getLawyer = async (request, response) => {
    const { _id } = request.params;
    try {
        const lawyer = await User.findOne({
            _id,
            isSeller: true
        }).select('-password');

        if (!lawyer) {
            throw CustomException('Lawyer not found!', 404);
        }

        return response.send({
            error: false,
            lawyer
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get active team members for task assignment
const getTeamMembers = async (request, response) => {
    try {
        const lawyerId = request.userID;

        // Get staff members for this lawyer's firm
        const staffMembers = await Staff.find({
            lawyerId,
            status: 'active'
        })
            .select('firstName lastName email role specialization avatar')
            .sort({ firstName: 1 });

        return response.send({
            data: staffMembers,
            total: staffMembers.length,
            page: 1,
            limit: staffMembers.length
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Get all staff members with filters
 * GET /api/lawyers
 */
const getStaff = asyncHandler(async (req, res) => {
    const {
        status,
        role,
        search,
        page = 1,
        limit = 10
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (status) query.status = status;
    if (role) query.role = role;

    // Search by name, email, phone
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [staffMembers, total] = await Promise.all([
        Staff.find(query)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum),
        Staff.countDocuments(query)
    ]);

    res.status(200).json({
        data: staffMembers,
        total,
        page: pageNum,
        limit: limitNum
    });
});

/**
 * Get single staff member
 * GET /api/lawyers/:id
 */
const getStaffMember = asyncHandler(async (req, res) => {
    const { _id } = req.params;
    const lawyerId = req.userID;

    const staff = await Staff.findById(_id);

    if (!staff) {
        throw new CustomException('الموظف غير موجود', 404);
    }

    if (staff.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    res.status(200).json({
        data: [staff],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Create staff member
 * POST /api/lawyers
 */
const createStaff = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        phone,
        avatar,
        role,
        specialization,
        status = 'active'
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!firstName || !lastName || !email) {
        throw new CustomException('الحقول المطلوبة: الاسم الأول، الاسم الأخير، البريد الإلكتروني', 400);
    }

    // Check if email already exists for this lawyer
    const existingStaff = await Staff.findOne({ lawyerId, email });
    if (existingStaff) {
        throw new CustomException('يوجد موظف بهذا البريد الإلكتروني بالفعل', 400);
    }

    const staff = await Staff.create({
        lawyerId,
        firstName,
        lastName,
        email,
        phone,
        avatar,
        role,
        specialization,
        status
    });

    res.status(201).json({
        data: staff,
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Update staff member
 * PATCH /api/lawyers/:id
 */
const updateStaff = asyncHandler(async (req, res) => {
    const { _id } = req.params;
    const lawyerId = req.userID;

    const staff = await Staff.findById(_id);

    if (!staff) {
        throw new CustomException('الموظف غير موجود', 404);
    }

    if (staff.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    // Check if email is being changed and already exists
    if (req.body.email && req.body.email !== staff.email) {
        const existingStaff = await Staff.findOne({
            lawyerId,
            email: req.body.email,
            _id: { $ne: _id }
        });
        if (existingStaff) {
            throw new CustomException('يوجد موظف بهذا البريد الإلكتروني بالفعل', 400);
        }
    }

    const allowedFields = [
        'firstName',
        'lastName',
        'email',
        'phone',
        'avatar',
        'role',
        'specialization',
        'status'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            staff[field] = req.body[field];
        }
    });

    await staff.save();

    res.status(200).json({
        data: [staff],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Delete staff member
 * DELETE /api/lawyers/:id
 */
const deleteStaff = asyncHandler(async (req, res) => {
    const { _id } = req.params;
    const lawyerId = req.userID;

    const staff = await Staff.findById(_id);

    if (!staff) {
        throw new CustomException('الموظف غير موجود', 404);
    }

    if (staff.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الموظف', 403);
    }

    await Staff.findByIdAndDelete(_id);

    res.status(200).json({
        data: [],
        total: 0,
        page: 1,
        limit: 1
    });
});

/**
 * Bulk delete staff members
 * POST /api/lawyers/bulk-delete
 */
const bulkDeleteStaff = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException('معرفات الموظفين مطلوبة', 400);
    }

    // Verify all staff belong to lawyer
    const staffMembers = await Staff.find({
        _id: { $in: ids },
        lawyerId
    });

    if (staffMembers.length !== ids.length) {
        throw new CustomException('بعض الموظفين غير صالحين للحذف', 400);
    }

    await Staff.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
        data: [],
        total: staffMembers.length,
        page: 1,
        limit: staffMembers.length
    });
});

module.exports = {
    getLawyers,
    getLawyer,
    getTeamMembers,
    getStaff,
    getStaffMember,
    createStaff,
    updateStaff,
    deleteStaff,
    bulkDeleteStaff
};
