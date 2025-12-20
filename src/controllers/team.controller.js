/**
 * Team Controller - Enterprise User Management System
 *
 * Implements comprehensive team management with:
 * - Tenant isolation (firmId filtering)
 * - Role-based permissions (Salesforce/SAP style)
 * - Activity logging
 * - Invitation workflow
 * - Departure processing
 *
 * All endpoints REQUIRE firmId for tenant isolation.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const { Staff, User, Firm, TeamActivityLog, FirmInvitation } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { ROLE_PERMISSIONS, getDefaultPermissions } = require('../config/permissions.config');

// ═══════════════════════════════════════════════════════════════
// ROLE-BASED DEFAULT PERMISSIONS (Salesforce/SAP style)
// ═══════════════════════════════════════════════════════════════
const ROLE_DEFAULTS = {
    owner: { cases: 'full', clients: 'full', finance: 'full', hr: 'full', reports: 'full' },
    admin: { cases: 'full', clients: 'full', finance: 'full', hr: 'full', reports: 'full' },
    partner: { cases: 'full', clients: 'full', finance: 'view', hr: 'view', reports: 'edit' },
    senior_lawyer: { cases: 'edit', clients: 'edit', finance: 'view', hr: 'none', reports: 'view' },
    lawyer: { cases: 'edit', clients: 'view', finance: 'none', hr: 'none', reports: 'view' },
    paralegal: { cases: 'view', clients: 'view', finance: 'none', hr: 'none', reports: 'none' },
    secretary: { cases: 'view', clients: 'view', finance: 'none', hr: 'none', reports: 'none' },
    accountant: { cases: 'none', clients: 'view', finance: 'full', hr: 'none', reports: 'full' },
    intern: { cases: 'view', clients: 'none', finance: 'none', hr: 'none', reports: 'none' }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Log team activity
 */
const logActivity = async (firmId, userId, action, targetType, targetId, details = {}) => {
    try {
        await TeamActivityLog.log({
            firmId,
            userId,
            action,
            targetType,
            targetId,
            details,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Failed to log team activity:', error.message);
    }
};

/**
 * Generate secure invitation token
 */
const generateInvitationToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Get role display name
 */
const getRoleDisplayName = (role) => {
    const roleNames = {
        owner: 'مالك',
        admin: 'مدير',
        partner: 'شريك',
        senior_lawyer: 'محامي أول',
        lawyer: 'محامي',
        paralegal: 'مساعد قانوني',
        secretary: 'سكرتير',
        accountant: 'محاسب',
        intern: 'متدرب'
    };
    return roleNames[role] || role;
};

/**
 * Get status display name
 */
const getStatusDisplayName = (status) => {
    const statusNames = {
        active: 'نشط',
        inactive: 'غير نشط',
        pending_approval: 'في انتظار الموافقة',
        suspended: 'معلق',
        departed: 'مغادر',
        on_leave: 'في إجازة',
        terminated: 'منتهي',
        probation: 'فترة تجريبية'
    };
    return statusNames[status] || status;
};

// ═══════════════════════════════════════════════════════════════
// TEAM MEMBER CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all team members (filtered by firmId!)
 * GET /api/team
 *
 * CRITICAL: Always filters by firmId for tenant isolation
 */
const getTeam = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    // CRITICAL: Solo lawyers should use /api/staff endpoint
    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول إلى هذه الخدمة', 403);
    }

    const {
        role, status, department, search, employmentType,
        page = 1, limit = 50, sortBy = 'lastName', sortOrder = 'asc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedPage = parseInt(page) || 1;

    // CRITICAL: Always filter by firmId
    const query = { firmId };

    if (role) query.role = role;
    if (status) query.status = status;
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;

    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { staffId: { $regex: search, $options: 'i' } }
        ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [team, total] = await Promise.all([
        Staff.find(query)
            .populate('userId', 'avatar email firstName lastName')
            .populate('reportsTo', 'firstName lastName')
            .populate('invitedBy', 'firstName lastName')
            .sort(sort)
            .limit(parsedLimit)
            .skip((parsedPage - 1) * parsedLimit)
            .lean(),
        Staff.countDocuments(query)
    ]);

    // Ensure firstName/lastName are always present (fix UI errors)
    const formattedTeam = team.map(member => ({
        ...member,
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        fullName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown',
        displayName: member.preferredName || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        statusDisplay: getStatusDisplayName(member.status),
        roleDisplay: getRoleDisplayName(member.role)
    }));

    res.json({
        success: true,
        data: formattedTeam,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single team member with activity log
 * GET /api/team/:id
 */
const getTeamMember = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // CRITICAL: Ensure firmId matches for tenant isolation
    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId
    })
        .populate('userId', 'avatar email firstName lastName')
        .populate('reportsTo', 'firstName lastName email')
        .populate('invitedBy', 'firstName lastName')
        .populate('departureProcessedBy', 'firstName lastName')
        .lean();

    if (!member) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    // Get activity log for this member
    const activityLog = await TeamActivityLog.getTargetActivity(firmId, 'staff', member._id, { limit: 20 });

    // Format response
    const response = {
        ...member,
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        fullName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown',
        displayName: member.preferredName || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        statusDisplay: getStatusDisplayName(member.status),
        roleDisplay: getRoleDisplayName(member.role),
        activityLog
    };

    res.json({
        success: true,
        data: response
    });
});

/**
 * Invite new team member
 * POST /api/team/invite
 */
const inviteTeamMember = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب لدعوة أعضاء جدد', 403);
    }

    // Check permission to invite
    if (!req.hasSpecialPermission('canManageTeam') && !['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لدعوة أعضاء جدد', 403);
    }

    const {
        email,
        firstName,
        lastName,
        role = 'lawyer',
        phone,
        department,
        employmentType = 'full_time',
        message
    } = req.body;

    // Validate required fields
    if (!email) {
        throw CustomException('البريد الإلكتروني مطلوب', 400);
    }
    if (!firstName || !lastName) {
        throw CustomException('الاسم الأول والأخير مطلوبان', 400);
    }

    // Check if email already exists in this firm
    const existingMember = await Staff.findOne({ firmId, email: email.toLowerCase() });
    if (existingMember) {
        throw CustomException('يوجد عضو بهذا البريد الإلكتروني بالفعل', 400);
    }

    // Check for pending invitation
    const existingInvitation = await FirmInvitation.hasActiveInvitation(firmId, email);
    if (existingInvitation) {
        throw CustomException('يوجد دعوة معلقة لهذا البريد الإلكتروني', 400);
    }

    // Generate invitation token
    const invitationToken = generateInvitationToken();
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setHours(invitationExpiresAt.getHours() + 72); // 72 hours expiry

    // Get default permissions for role
    const defaultPermissions = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.lawyer;
    const modulePermissions = Object.entries(defaultPermissions).map(([name, access]) => ({
        name,
        access,
        requiresApproval: false
    }));

    // Create staff record with pending status
    const staffData = {
        firmId,
        lawyerId: userId, // Creator
        email: email.toLowerCase(),
        firstName,
        lastName,
        phone,
        role,
        status: 'pending_approval',
        employmentType,
        department,
        permissions: {
            modules: modulePermissions,
            customPermissions: []
        },
        invitedBy: userId,
        invitedAt: new Date(),
        invitationStatus: 'pending',
        invitationToken,
        invitationExpiresAt
    };

    const newMember = await Staff.create(staffData);

    // Create FirmInvitation record for tracking
    const invitationCode = FirmInvitation.generateCode();
    await FirmInvitation.create({
        code: invitationCode,
        firmId,
        email: email.toLowerCase(),
        role,
        invitedBy: userId,
        message,
        expiresAt: invitationExpiresAt
    });

    // Log activity
    await logActivity(firmId, userId, 'invite', 'staff', newMember._id, {
        email,
        role,
        invitationCode
    });

    // TODO: Send invitation email here

    res.status(201).json({
        success: true,
        message: 'تم إرسال الدعوة بنجاح',
        data: {
            ...newMember.toObject(),
            firstName: newMember.firstName || '',
            lastName: newMember.lastName || '',
            invitationCode
        }
    });
});

/**
 * Resend invitation
 * POST /api/team/:id/resend-invite
 */
const resendInvitation = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId,
        invitationStatus: 'pending'
    });

    if (!member) {
        throw CustomException('لا توجد دعوة معلقة لهذا العضو', 404);
    }

    // Generate new token
    const newToken = generateInvitationToken();
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 72);

    member.invitationToken = newToken;
    member.invitationExpiresAt = newExpiresAt;
    await member.save();

    // Update FirmInvitation record
    await FirmInvitation.findOneAndUpdate(
        { firmId, email: member.email, status: 'pending' },
        { expiresAt: newExpiresAt }
    );

    // Log activity
    await logActivity(firmId, userId, 'resend_invite', 'staff', member._id, {
        email: member.email
    });

    // TODO: Resend invitation email

    res.json({
        success: true,
        message: 'تم إعادة إرسال الدعوة بنجاح'
    });
});

/**
 * Revoke pending invitation
 * DELETE /api/team/:id/revoke-invite
 */
const revokeInvitation = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId,
        invitationStatus: 'pending'
    });

    if (!member) {
        throw CustomException('لا توجد دعوة معلقة لهذا العضو', 404);
    }

    // Update invitation status
    member.invitationStatus = 'revoked';
    member.status = 'inactive';
    await member.save();

    // Cancel FirmInvitation
    await FirmInvitation.findOneAndUpdate(
        { firmId, email: member.email, status: 'pending' },
        { status: 'cancelled', cancelledBy: userId, cancelledAt: new Date() }
    );

    // Log activity
    await logActivity(firmId, userId, 'revoke_invite', 'staff', member._id, {
        email: member.email
    });

    res.json({
        success: true,
        message: 'تم إلغاء الدعوة بنجاح'
    });
});

/**
 * Update team member
 * PATCH /api/team/:id
 */
const updateTeamMember = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId
    });

    if (!member) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    // Track changes for audit
    const changes = [];

    const allowedFields = [
        'salutation', 'firstName', 'middleName', 'lastName', 'preferredName', 'avatar',
        'email', 'workEmail', 'phone', 'mobilePhone', 'officePhone', 'extension',
        'employmentType', 'department', 'reportsTo', 'officeLocation',
        'hireDate', 'startDate', 'specialization', 'barNumber', 'barAdmissionDate',
        'barLicenses', 'practiceAreas', 'education', 'certifications', 'languages',
        'hourlyRate', 'standardRate', 'discountedRate', 'premiumRate', 'costRate',
        'billableHoursTarget', 'revenueTarget', 'utilizationTarget',
        'canBillTime', 'canApproveTime', 'canViewRates', 'canEditRates',
        'bio', 'bioAr', 'notes', 'tags'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== member[field]) {
            changes.push({
                field,
                oldValue: member[field],
                newValue: req.body[field]
            });
            member[field] = req.body[field];
        }
    });

    member.updatedBy = userId;
    await member.save();

    // Log activity with changes
    if (changes.length > 0) {
        await logActivity(firmId, userId, 'update', 'staff', member._id, { changes });
    }

    res.json({
        success: true,
        message: 'تم تحديث عضو الفريق بنجاح',
        data: {
            ...member.toObject(),
            firstName: member.firstName || '',
            lastName: member.lastName || ''
        }
    });
});

/**
 * Update member permissions
 * PATCH /api/team/:id/permissions
 */
const updatePermissions = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    // Only owner/admin can update permissions
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('فقط المالك أو المدير يمكنه تعديل الصلاحيات', 403);
    }

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId
    });

    if (!member) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    const { modules, customPermissions } = req.body;

    // Track changes
    const oldPermissions = member.permissions?.modules || [];
    const newPermissions = modules || [];

    member.permissions = {
        modules: newPermissions,
        customPermissions: customPermissions || member.permissions?.customPermissions || []
    };

    member.updatedBy = userId;
    await member.save();

    // Log activity
    await logActivity(firmId, userId, 'update_permissions', 'staff', member._id, {
        oldPermissions,
        newPermissions
    });

    res.json({
        success: true,
        message: 'تم تحديث الصلاحيات بنجاح',
        data: member
    });
});

/**
 * Change member role
 * PATCH /api/team/:id/role
 */
const changeRole = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    // Only owner can change roles
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تغيير الأدوار', 403);
    }

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId
    });

    if (!member) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    const { role } = req.body;

    if (!role) {
        throw CustomException('الدور الجديد مطلوب', 400);
    }

    // Cannot change owner to another role without transferring ownership
    if (member.role === 'owner') {
        throw CustomException('لا يمكن تغيير دور المالك. يجب نقل الملكية أولاً', 400);
    }

    const oldRole = member.role;
    member.role = role;

    // Update permissions based on new role
    const defaultPermissions = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.lawyer;
    member.permissions = {
        modules: Object.entries(defaultPermissions).map(([name, access]) => ({
            name,
            access,
            requiresApproval: false
        })),
        customPermissions: []
    };

    member.updatedBy = userId;
    await member.save();

    // Update User's firmRole if linked
    if (member.userId) {
        await User.findByIdAndUpdate(member.userId, { firmRole: role });
    }

    // Log activity
    await logActivity(firmId, userId, 'update_role', 'staff', member._id, {
        oldRole,
        newRole: role
    });

    res.json({
        success: true,
        message: 'تم تغيير الدور بنجاح',
        data: member
    });
});

/**
 * Suspend team member
 * POST /api/team/:id/suspend
 */
const suspendMember = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    // Only owner/admin can suspend
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لتعليق عضو', 403);
    }

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId
    });

    if (!member) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    if (member.role === 'owner') {
        throw CustomException('لا يمكن تعليق المالك', 400);
    }

    if (member.status === 'suspended') {
        throw CustomException('العضو معلق بالفعل', 400);
    }

    const { reason } = req.body;

    member.status = 'suspended';
    member.updatedBy = userId;
    await member.save();

    // Update User status if linked
    if (member.userId) {
        await User.findByIdAndUpdate(member.userId, { firmStatus: 'suspended' });
    }

    // Log activity
    await logActivity(firmId, userId, 'suspend', 'staff', member._id, { reason });

    res.json({
        success: true,
        message: 'تم تعليق العضو بنجاح'
    });
});

/**
 * Activate/Reactivate team member
 * POST /api/team/:id/activate
 */
const activateMember = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    // Only owner/admin can activate
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لتفعيل عضو', 403);
    }

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId
    });

    if (!member) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    if (member.status === 'active') {
        throw CustomException('العضو نشط بالفعل', 400);
    }

    // Can activate suspended, inactive, or departed members
    const previousStatus = member.status;
    member.status = 'active';
    member.updatedBy = userId;

    // Clear departure info if reactivating departed member
    if (previousStatus === 'departed') {
        member.departedAt = null;
        member.departureReason = null;
        member.departureNotes = null;
        member.departureProcessedBy = null;
        member.exitInterviewCompleted = false;
    }

    await member.save();

    // Update User status if linked
    if (member.userId) {
        await User.findByIdAndUpdate(member.userId, { firmStatus: 'active' });
    }

    // Log activity
    await logActivity(firmId, userId, 'activate', 'staff', member._id, { previousStatus });

    res.json({
        success: true,
        message: 'تم تفعيل العضو بنجاح'
    });
});

/**
 * Process member departure
 * POST /api/team/:id/depart
 */
const processDeparture = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    // Only owner/admin can process departure
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('ليس لديك صلاحية لمعالجة المغادرة', 403);
    }

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId
    });

    if (!member) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    if (member.role === 'owner') {
        throw CustomException('لا يمكن معالجة مغادرة المالك. يجب نقل الملكية أولاً', 400);
    }

    if (member.status === 'departed') {
        throw CustomException('تمت معالجة مغادرة العضو بالفعل', 400);
    }

    const { reason, notes, exitInterviewCompleted = false } = req.body;

    member.status = 'departed';
    member.departedAt = new Date();
    member.departureReason = reason || null;
    member.departureNotes = notes || null;
    member.exitInterviewCompleted = exitInterviewCompleted;
    member.departureProcessedBy = userId;
    member.updatedBy = userId;
    await member.save();

    // Update User firmRole and status if linked
    if (member.userId) {
        await User.findByIdAndUpdate(member.userId, {
            firmRole: 'departed',
            firmStatus: 'departed',
            departedAt: new Date()  // Set for data retention tracking
        });
    }

    // Update Firm members array if exists
    try {
        const firm = await Firm.findById(firmId);
        if (firm && member.userId) {
            await firm.processDeparture(member.userId, userId, reason, notes);
        }
    } catch (error) {
        console.error('Failed to update firm members:', error.message);
    }

    // Log activity
    await logActivity(firmId, userId, 'depart', 'staff', member._id, {
        reason,
        exitInterviewCompleted
    });

    res.json({
        success: true,
        message: 'تم معالجة المغادرة بنجاح'
    });
});

/**
 * Remove team member (hard delete)
 * DELETE /api/team/:id
 */
const removeTeamMember = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    // Only owner can permanently remove
    if (req.firmRole !== 'owner') {
        throw CustomException('فقط المالك يمكنه حذف أعضاء الفريق نهائياً', 403);
    }

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId
    });

    if (!member) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    if (member.role === 'owner') {
        throw CustomException('لا يمكن حذف المالك', 400);
    }

    const memberInfo = {
        email: member.email,
        name: `${member.firstName} ${member.lastName}`,
        role: member.role
    };

    await Staff.findByIdAndDelete(member._id);

    // Remove from Firm members if linked
    if (member.userId) {
        try {
            const firm = await Firm.findById(firmId);
            if (firm) {
                await firm.removeMember(member.userId);
            }
        } catch (error) {
            console.error('Failed to remove from firm:', error.message);
        }
    }

    // Log activity
    await logActivity(firmId, userId, 'delete', 'staff', member._id, memberInfo);

    res.json({
        success: true,
        message: 'تم حذف العضو بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════

/**
 * Get member's activity log
 * GET /api/team/:id/activity
 */
const getMemberActivity = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    const { page = 1, limit = 50, action, startDate, endDate } = req.query;

    const member = await Staff.findOne({
        $or: [{ _id: id }, { staffId: id }],
        firmId
    }).select('_id');

    if (!member) {
        throw CustomException('عضو الفريق غير موجود', 404);
    }

    const activityLog = await TeamActivityLog.getTargetActivity(firmId, 'staff', member._id, {
        limit: parseInt(limit) || 50,
        skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 50)
    });

    res.json({
        success: true,
        data: activityLog
    });
});

/**
 * Get team statistics
 * GET /api/team/stats
 */
const getTeamStats = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب', 403);
    }

    const [byRole, byStatus, byDepartment, total] = await Promise.all([
        Staff.aggregate([
            { $match: { firmId: new mongoose.Types.ObjectId(firmId), status: 'active' } },
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        Staff.aggregate([
            { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Staff.aggregate([
            { $match: { firmId: new mongoose.Types.ObjectId(firmId), status: 'active', department: { $exists: true, $ne: null } } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        Staff.countDocuments({ firmId })
    ]);

    const active = await Staff.countDocuments({ firmId, status: 'active' });
    const pending = await Staff.countDocuments({ firmId, invitationStatus: 'pending' });

    res.json({
        success: true,
        stats: {
            total,
            active,
            pending,
            byRole: byRole.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
            byStatus: byStatus.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
            byDepartment: byDepartment.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {})
        }
    });
});

/**
 * Get dropdown options for forms
 * GET /api/team/options
 */
const getTeamOptions = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: {
            roles: [
                { value: 'owner', label: 'مالك', labelEn: 'Owner' },
                { value: 'admin', label: 'مدير', labelEn: 'Admin' },
                { value: 'partner', label: 'شريك', labelEn: 'Partner' },
                { value: 'senior_lawyer', label: 'محامي أول', labelEn: 'Senior Lawyer' },
                { value: 'lawyer', label: 'محامي', labelEn: 'Lawyer' },
                { value: 'paralegal', label: 'مساعد قانوني', labelEn: 'Paralegal' },
                { value: 'secretary', label: 'سكرتير', labelEn: 'Secretary' },
                { value: 'accountant', label: 'محاسب', labelEn: 'Accountant' },
                { value: 'intern', label: 'متدرب', labelEn: 'Intern' }
            ],
            statuses: [
                { value: 'active', label: 'نشط', labelEn: 'Active' },
                { value: 'inactive', label: 'غير نشط', labelEn: 'Inactive' },
                { value: 'pending_approval', label: 'في انتظار الموافقة', labelEn: 'Pending Approval' },
                { value: 'suspended', label: 'معلق', labelEn: 'Suspended' },
                { value: 'departed', label: 'مغادر', labelEn: 'Departed' }
            ],
            employmentTypes: [
                { value: 'full_time', label: 'دوام كامل', labelEn: 'Full Time' },
                { value: 'part_time', label: 'دوام جزئي', labelEn: 'Part Time' },
                { value: 'contractor', label: 'متعاقد', labelEn: 'Contractor' },
                { value: 'consultant', label: 'مستشار', labelEn: 'Consultant' }
            ],
            departureReasons: [
                { value: 'resignation', label: 'استقالة', labelEn: 'Resignation' },
                { value: 'termination', label: 'إنهاء خدمة', labelEn: 'Termination' },
                { value: 'retirement', label: 'تقاعد', labelEn: 'Retirement' },
                { value: 'transfer', label: 'نقل', labelEn: 'Transfer' }
            ],
            modules: [
                { value: 'cases', label: 'القضايا', labelEn: 'Cases' },
                { value: 'clients', label: 'العملاء', labelEn: 'Clients' },
                { value: 'finance', label: 'المالية', labelEn: 'Finance' },
                { value: 'hr', label: 'الموارد البشرية', labelEn: 'HR' },
                { value: 'reports', label: 'التقارير', labelEn: 'Reports' },
                { value: 'documents', label: 'المستندات', labelEn: 'Documents' },
                { value: 'tasks', label: 'المهام', labelEn: 'Tasks' },
                { value: 'settings', label: 'الإعدادات', labelEn: 'Settings' },
                { value: 'team', label: 'الفريق', labelEn: 'Team' }
            ],
            accessLevels: [
                { value: 'none', label: 'لا يوجد', labelEn: 'None' },
                { value: 'view', label: 'عرض', labelEn: 'View' },
                { value: 'edit', label: 'تعديل', labelEn: 'Edit' },
                { value: 'full', label: 'كامل', labelEn: 'Full' }
            ],
            roleDefaults: ROLE_DEFAULTS
        }
    });
});

module.exports = {
    getTeam,
    getTeamMember,
    inviteTeamMember,
    resendInvitation,
    revokeInvitation,
    updateTeamMember,
    updatePermissions,
    changeRole,
    suspendMember,
    activateMember,
    processDeparture,
    removeTeamMember,
    getMemberActivity,
    getTeamStats,
    getTeamOptions
};
