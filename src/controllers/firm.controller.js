/**
 * Firm Controller - Multi-Tenancy Management
 *
 * Handles firm creation, team management, settings, and billing configuration.
 * Also maintains backwards compatibility with marketplace functions.
 */

const mongoose = require('mongoose');
const { Firm, User, Client, Case, Invoice, Lead } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');

// ═══════════════════════════════════════════════════════════════
// MARKETPLACE FUNCTIONS (Backwards Compatible)
// ═══════════════════════════════════════════════════════════════

/**
 * Get all firms (marketplace)
 * GET /api/firms
 */
const getFirms = async (request, response) => {
    const { search, city, practiceArea } = request.query;
    try {
        const filters = {
            ...(search && { $text: { $search: search } }),
            ...(city && { city: { $regex: city, $options: 'i' } }),
            ...(practiceArea && { practiceAreas: practiceArea })
        };

        const firms = await Firm.find(filters)
            .populate('lawyers', 'username image lawyerProfile.specialization lawyerProfile.rating')
            .populate('ownerId', 'firstName lastName')
            .sort({ verified: -1, createdAt: -1 });

        return response.send({
            error: false,
            firms
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// MULTI-TENANCY FIRM MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new firm (multi-tenancy)
 * POST /api/firms
 */
const createFirm = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const {
        name,
        nameArabic,
        nameEnglish,
        description,
        crNumber,
        licenseNumber,
        email,
        phone,
        address,
        practiceAreas,
        vatRegistration
    } = req.body;

    // Check if user already has a firm
    const user = await User.findById(userId);
    if (user.firmId) {
        throw CustomException('لديك مكتب محاماة بالفعل', 400);
    }

    // Create the firm
    const firm = await Firm.create({
        name,
        nameArabic,
        nameEnglish,
        description,
        crNumber,
        licenseNumber,
        email,
        phone,
        address,
        practiceAreas,
        vatRegistration,
        ownerId: userId,
        createdBy: userId,
        lawyers: [userId], // Backwards compatibility
        members: [{
            userId,
            role: 'owner',
            permissions: {
                clients: 'full',
                cases: 'full',
                invoices: 'full',
                payments: 'full',
                documents: 'full',
                reports: 'full',
                settings: 'full',
                team: 'full',
                hr: 'full',
                canApproveInvoices: true,
                canManageRetainers: true,
                canExportData: true,
                canDeleteRecords: true
            },
            status: 'active',
            joinedAt: new Date()
        }],
        subscription: {
            plan: 'free',
            status: 'trial',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
            maxUsers: 3,
            maxCases: 50,
            maxClients: 100
        }
    });

    // Update user with firmId
    await User.findByIdAndUpdate(userId, {
        firmId: firm._id,
        firmRole: 'owner',
        'lawyerProfile.firmID': firm._id
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء المكتب بنجاح',
        data: firm
    });
});

/**
 * Get current user's firm
 * GET /api/firms/my
 */
const getMyFirm = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const user = await User.findById(userId).select('firmId firmRole');
    if (!user?.firmId) {
        return res.status(404).json({
            success: false,
            message: 'لا يوجد مكتب مرتبط بحسابك',
            code: 'NO_FIRM'
        });
    }

    const firm = await Firm.findById(user.firmId)
        .populate('ownerId', 'firstName lastName email')
        .populate('members.userId', 'firstName lastName email image');

    if (!firm) {
        return res.status(404).json({
            success: false,
            message: 'المكتب غير موجود'
        });
    }

    res.json({
        success: true,
        data: {
            ...firm.toObject(),
            myRole: user.firmRole
        }
    });
});

/**
 * Get firm by ID
 * GET /api/firms/:id or /:_id
 */
const getFirm = asyncHandler(async (req, res) => {
    const id = req.params.id || req.params._id;
    const userId = req.userID;

    const firm = await Firm.findById(id)
        .populate('ownerId', 'firstName lastName email')
        .populate('lawyers', 'username image email lawyerProfile')
        .populate('members.userId', 'firstName lastName email image');

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    res.json({
        success: true,
        error: false,
        data: firm,
        firm // Backwards compatibility
    });
});

/**
 * Update firm settings
 * PUT /api/firms/:id
 */
const updateFirm = asyncHandler(async (req, res) => {
    const id = req.params.id || req.params._id;
    const userId = req.userID;
    const updates = req.body;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner, admin, or part of lawyers array
    const member = firm.members.find(m => m.userId.toString() === userId);
    const isInLawyers = firm.lawyers?.some(l => l.toString() === userId);

    if (!member && !isInLawyers) {
        throw CustomException('ليس لديك صلاحية لتعديل إعدادات المكتب', 403);
    }

    if (member && !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لتعديل إعدادات المكتب', 403);
    }

    // Prevent changing ownerId
    delete updates.ownerId;
    delete updates.members;
    delete updates.subscription;

    const updatedFirm = await Firm.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
    );

    res.status(202).json({
        success: true,
        error: false,
        message: 'تم تحديث بيانات المكتب بنجاح',
        data: updatedFirm,
        firm: updatedFirm // Backwards compatibility
    });
});

/**
 * Update billing settings
 * PATCH /api/firms/:id/billing
 */
const updateBillingSettings = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const billingSettings = req.body;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لتعديل إعدادات الفوترة', 403);
    }

    firm.billingSettings = {
        ...firm.billingSettings,
        ...billingSettings
    };
    await firm.save();

    res.json({
        success: true,
        message: 'تم تحديث إعدادات الفوترة',
        data: firm.billingSettings
    });
});

/**
 * Get team members
 * GET /api/firms/:id/members
 */
const getMembers = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const firm = await Firm.findById(id)
        .populate('members.userId', 'firstName lastName email phone image lawyerProfile');

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is a member
    const isMember = firm.members.some(m => m.userId._id.toString() === userId);
    if (!isMember) {
        throw CustomException('لا يمكنك الوصول إلى قائمة الأعضاء', 403);
    }

    res.json({
        success: true,
        data: firm.members
    });
});

/**
 * Invite a team member
 * POST /api/firms/:id/members/invite
 */
const inviteMember = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const { email, role = 'lawyer', permissions } = req.body;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لدعوة أعضاء جدد', 403);
    }

    // Check subscription limits
    const activeMembers = firm.members.filter(m => m.status === 'active').length;
    if (activeMembers >= firm.subscription.maxUsers) {
        throw CustomException('تم الوصول إلى الحد الأقصى لعدد الأعضاء في خطتك الحالية', 400);
    }

    // Find user by email
    const invitedUser = await User.findOne({ email: email.toLowerCase() });
    if (!invitedUser) {
        throw CustomException('المستخدم غير موجود. يجب أن يكون لديه حساب أولاً', 404);
    }

    // Check if already a member
    if (invitedUser.firmId) {
        throw CustomException('المستخدم عضو في مكتب آخر بالفعل', 400);
    }

    const existingMember = firm.members.find(m => m.userId.toString() === invitedUser._id.toString());
    if (existingMember) {
        throw CustomException('المستخدم عضو بالفعل في هذا المكتب', 400);
    }

    // Add member
    await firm.addMember(invitedUser._id, role, permissions);

    // Also add to lawyers array for backwards compatibility
    if (!firm.lawyers.includes(invitedUser._id)) {
        firm.lawyers.push(invitedUser._id);
        await firm.save();
    }

    res.status(201).json({
        success: true,
        message: 'تمت إضافة العضو بنجاح',
        data: {
            userId: invitedUser._id,
            email: invitedUser.email,
            name: `${invitedUser.firstName} ${invitedUser.lastName}`,
            role
        }
    });
});

/**
 * Add lawyer to firm (backwards compatible)
 * POST /api/firms/add-lawyer
 */
const addLawyer = async (request, response) => {
    const { firmId, lawyerId } = request.body;
    try {
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found!', 404);
        }

        // Add to lawyers array
        if (!firm.lawyers.includes(lawyerId)) {
            firm.lawyers.push(lawyerId);
        }

        // Also add to members array if not exists
        const existingMember = firm.members.find(m => m.userId.toString() === lawyerId);
        if (!existingMember) {
            firm.members.push({
                userId: lawyerId,
                role: 'lawyer',
                status: 'active',
                joinedAt: new Date()
            });
        }

        await firm.save();

        // Update lawyer profile with firm reference
        await User.findByIdAndUpdate(lawyerId, {
            'lawyerProfile.firmID': firmId,
            firmId: firmId,
            firmRole: 'lawyer'
        });

        return response.status(202).send({
            error: false,
            success: true,
            message: 'Lawyer added to firm!',
            firm
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Update member role/permissions
 * PUT /api/firms/:id/members/:memberId
 */
const updateMember = asyncHandler(async (req, res) => {
    const { id, memberId } = req.params;
    const userId = req.userID;
    const { role, permissions, title, department, status } = req.body;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لتعديل الأعضاء', 403);
    }

    // Find the member to update
    const memberToUpdate = firm.members.find(m => m.userId.toString() === memberId);
    if (!memberToUpdate) {
        throw CustomException('العضو غير موجود', 404);
    }

    // Cannot change owner's role
    if (memberToUpdate.role === 'owner' && role !== 'owner') {
        throw CustomException('لا يمكن تغيير دور مالك المكتب', 400);
    }

    // Only owner can promote to admin
    if (role === 'admin' && requestingMember.role !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعيين مسؤولين', 403);
    }

    await firm.updateMember(memberId, { role, permissions, title, department, status });

    res.json({
        success: true,
        message: 'تم تحديث بيانات العضو بنجاح'
    });
});

/**
 * Remove a team member
 * DELETE /api/firms/:id/members/:memberId
 */
const removeMember = asyncHandler(async (req, res) => {
    const { id, memberId } = req.params;
    const userId = req.userID;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لإزالة الأعضاء', 403);
    }

    // Find the member to remove
    const memberToRemove = firm.members.find(m => m.userId.toString() === memberId);
    if (!memberToRemove) {
        throw CustomException('العضو غير موجود', 404);
    }

    // Cannot remove owner
    if (memberToRemove.role === 'owner') {
        throw CustomException('لا يمكن إزالة مالك المكتب', 400);
    }

    // Admin cannot remove other admins (only owner can)
    if (memberToRemove.role === 'admin' && requestingMember.role !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه إزالة المسؤولين', 403);
    }

    await firm.removeMember(memberId);

    // Also remove from lawyers array
    firm.lawyers = firm.lawyers.filter(l => l.toString() !== memberId);
    await firm.save();

    res.json({
        success: true,
        message: 'تم إزالة العضو من المكتب'
    });
});

/**
 * Remove lawyer from firm (backwards compatible)
 * POST /api/firms/remove-lawyer
 */
const removeLawyer = async (request, response) => {
    const { firmId, lawyerId } = request.body;
    try {
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found!', 404);
        }

        // Remove from lawyers array
        firm.lawyers = firm.lawyers.filter(l => l.toString() !== lawyerId);

        // Remove from members array
        const memberIndex = firm.members.findIndex(m => m.userId.toString() === lawyerId);
        if (memberIndex !== -1) {
            // Don't remove owner
            if (firm.members[memberIndex].role === 'owner') {
                throw CustomException('Cannot remove firm owner', 400);
            }
            firm.members.splice(memberIndex, 1);
        }

        await firm.save();

        // Remove firm reference from lawyer profile
        await User.findByIdAndUpdate(lawyerId, {
            'lawyerProfile.firmID': null,
            $unset: { firmId: 1, firmRole: 1 }
        });

        return response.status(202).send({
            error: false,
            success: true,
            message: 'Lawyer removed from firm!',
            firm
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * Leave firm (for members)
 * POST /api/firms/:id/leave
 */
const leaveFirm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member) {
        throw CustomException('أنت لست عضواً في هذا المكتب', 400);
    }

    if (member.role === 'owner') {
        throw CustomException('لا يمكن لمالك المكتب المغادرة. قم بتحويل الملكية أولاً', 400);
    }

    await firm.removeMember(userId);

    // Remove from lawyers array
    firm.lawyers = firm.lawyers.filter(l => l.toString() !== userId);
    await firm.save();

    res.json({
        success: true,
        message: 'تمت مغادرة المكتب بنجاح'
    });
});

/**
 * Transfer ownership
 * POST /api/firms/:id/transfer-ownership
 */
const transferOwnership = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const { newOwnerId } = req.body;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Only current owner can transfer
    if (firm.ownerId.toString() !== userId) {
        throw CustomException('فقط مالك المكتب يمكنه تحويل الملكية', 403);
    }

    // Check if new owner is a member
    const newOwnerMember = firm.members.find(m => m.userId.toString() === newOwnerId);
    if (!newOwnerMember) {
        throw CustomException('المستخدم الجديد يجب أن يكون عضواً في المكتب', 400);
    }

    // Update current owner to admin
    await firm.updateMember(userId, { role: 'admin' });

    // Update new owner
    await firm.updateMember(newOwnerId, { role: 'owner' });

    // Update firm's ownerId
    firm.ownerId = newOwnerId;
    await firm.save();

    res.json({
        success: true,
        message: 'تم تحويل ملكية المكتب بنجاح'
    });
});

/**
 * Get firm statistics
 * GET /api/firms/:id/stats
 */
const getFirmStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = new mongoose.Types.ObjectId(id);

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check membership
    const isMember = firm.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
        throw CustomException('لا يمكنك الوصول إلى إحصائيات هذا المكتب', 403);
    }

    const [
        totalClients,
        activeClients,
        totalCases,
        activeCases,
        totalInvoices,
        paidInvoices,
        totalLeads,
        activeLeads
    ] = await Promise.all([
        Client.countDocuments({ firmId }),
        Client.countDocuments({ firmId, status: 'active' }),
        Case.countDocuments({ firmId }),
        Case.countDocuments({ firmId, status: { $in: ['active', 'pending'] } }),
        Invoice.countDocuments({ firmId }),
        Invoice.countDocuments({ firmId, status: 'paid' }),
        Lead.countDocuments({ firmId }),
        Lead.countDocuments({ firmId, status: { $in: ['new', 'contacted', 'qualified'] } })
    ]);

    // Calculate revenue
    const revenueData = await Invoice.aggregate([
        { $match: { firmId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const totalRevenue = revenueData[0]?.total || 0;

    res.json({
        success: true,
        data: {
            members: {
                total: firm.members.length,
                active: firm.members.filter(m => m.status === 'active').length
            },
            clients: { total: totalClients, active: activeClients },
            cases: { total: totalCases, active: activeCases },
            invoices: { total: totalInvoices, paid: paidInvoices },
            leads: { total: totalLeads, active: activeLeads },
            revenue: { total: totalRevenue },
            subscription: {
                plan: firm.subscription.plan,
                status: firm.subscription.status,
                usage: {
                    users: { used: firm.members.length, max: firm.subscription.maxUsers },
                    cases: { used: totalCases, max: firm.subscription.maxCases },
                    clients: { used: totalClients, max: firm.subscription.maxClients }
                }
            }
        }
    });
});

/**
 * Get team members (فريق العمل)
 * Only shows ACTIVE members by default
 * GET /api/firms/:id/team
 */
const getTeam = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const { includeAll = false } = req.query;

    const firm = await Firm.findById(id)
        .populate('members.userId', 'firstName lastName email phone image lawyerProfile');

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is a member
    const requestingMember = firm.members.find(m => m.userId._id.toString() === userId);
    if (!requestingMember) {
        throw CustomException('لا يمكنك الوصول إلى قائمة فريق العمل', 403);
    }

    // Departed users can only see active team members
    const isDeparted = requestingMember.status === 'departed' || requestingMember.role === 'departed';

    let teamMembers;
    if (isDeparted || !includeAll) {
        // Show only active members
        teamMembers = firm.members.filter(m => m.status === 'active');
    } else {
        // Admins/owners can see all including departed
        if (['owner', 'admin'].includes(requestingMember.role)) {
            teamMembers = firm.members;
        } else {
            teamMembers = firm.members.filter(m => m.status === 'active');
        }
    }

    res.json({
        success: true,
        data: teamMembers,
        meta: {
            total: teamMembers.length,
            activeCount: firm.members.filter(m => m.status === 'active').length,
            departedCount: firm.members.filter(m => m.status === 'departed').length
        }
    });
});

/**
 * Process member departure (مغادرة الموظف)
 * POST /api/firms/:id/members/:memberId/depart
 */
const processDeparture = asyncHandler(async (req, res) => {
    const { id, memberId } = req.params;
    const userId = req.userID;
    const { reason, notes } = req.body;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لمعالجة مغادرة الموظفين', 403);
    }

    // Find the member to process
    const memberToDepart = firm.members.find(m => m.userId.toString() === memberId);
    if (!memberToDepart) {
        throw CustomException('العضو غير موجود', 404);
    }

    // Cannot process owner's departure
    if (memberToDepart.role === 'owner') {
        throw CustomException('لا يمكن معالجة مغادرة مالك المكتب. يجب تحويل الملكية أولاً', 400);
    }

    // Admin cannot process another admin's departure (only owner can)
    if (memberToDepart.role === 'admin' && requestingMember.role !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه معالجة مغادرة المسؤولين', 403);
    }

    // Process the departure
    await firm.processDeparture(memberId, userId, reason, notes);

    // Update user's firmStatus
    await User.findByIdAndUpdate(memberId, { firmStatus: 'departed' });

    res.json({
        success: true,
        message: 'تم معالجة مغادرة العضو بنجاح. سيحتفظ بإمكانية الاطلاع على القضايا التي عمل عليها',
        data: {
            userId: memberId,
            status: 'departed',
            departedAt: new Date()
        }
    });
});

/**
 * Reinstate departed member (إعادة تفعيل عضو مغادر)
 * POST /api/firms/:id/members/:memberId/reinstate
 */
const reinstateMember = asyncHandler(async (req, res) => {
    const { id, memberId } = req.params;
    const userId = req.userID;
    const { role } = req.body;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لإعادة تفعيل الأعضاء', 403);
    }

    // Check subscription limits
    const activeMembers = firm.members.filter(m => m.status === 'active').length;
    if (activeMembers >= firm.subscription.maxUsers) {
        throw CustomException('تم الوصول إلى الحد الأقصى لعدد الأعضاء في خطتك الحالية', 400);
    }

    // Only owner can reinstate as admin
    if (role === 'admin' && requestingMember.role !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعيين مسؤولين', 403);
    }

    // Reinstate the member
    await firm.reinstateMember(memberId, role);

    // Update user's firmStatus
    await User.findByIdAndUpdate(memberId, { firmStatus: 'active' });

    res.json({
        success: true,
        message: 'تم إعادة تفعيل العضو بنجاح',
        data: {
            userId: memberId,
            status: 'active',
            role: role || 'lawyer'
        }
    });
});

/**
 * Get departed members list (قائمة الموظفين المغادرين)
 * GET /api/firms/:id/departed
 */
const getDepartedMembers = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const firm = await Firm.findById(id)
        .populate('members.userId', 'firstName lastName email phone image')
        .populate('members.departureProcessedBy', 'firstName lastName');

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId._id.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية للوصول إلى قائمة الموظفين المغادرين', 403);
    }

    const departedMembers = firm.members.filter(m => m.status === 'departed');

    res.json({
        success: true,
        data: departedMembers,
        count: departedMembers.length
    });
});

/**
 * Get my permissions (صلاحياتي)
 * GET /api/firms/my/permissions
 */
const getMyPermissions = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const user = await User.findById(userId).select('firmId firmRole firmStatus');
    if (!user?.firmId) {
        return res.status(404).json({
            success: false,
            message: 'لا يوجد مكتب مرتبط بحسابك',
            code: 'NO_FIRM'
        });
    }

    const firm = await Firm.findById(user.firmId).select('members name');
    if (!firm) {
        return res.status(404).json({
            success: false,
            message: 'المكتب غير موجود'
        });
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member) {
        return res.status(404).json({
            success: false,
            message: 'لست عضواً في هذا المكتب'
        });
    }

    const isDeparted = member.status === 'departed' || member.role === 'departed';

    res.json({
        success: true,
        data: {
            firmId: user.firmId,
            firmName: firm.name,
            role: member.role,
            previousRole: member.previousRole,
            status: member.status,
            isDeparted,
            permissions: member.permissions,
            title: member.title,
            department: member.department,
            joinedAt: member.joinedAt,
            departedAt: member.departedAt,
            // Accessible modules summary
            accessibleModules: {
                clients: member.permissions?.clients || 'none',
                cases: member.permissions?.cases || 'none',
                leads: member.permissions?.leads || 'none',
                invoices: member.permissions?.invoices || 'none',
                payments: member.permissions?.payments || 'none',
                expenses: member.permissions?.expenses || 'none',
                documents: member.permissions?.documents || 'none',
                tasks: member.permissions?.tasks || 'none',
                events: member.permissions?.events || 'none',
                timeTracking: member.permissions?.timeTracking || 'none',
                reports: member.permissions?.reports || 'none',
                team: member.permissions?.team || 'none'
            },
            specialPermissions: {
                canApproveInvoices: member.permissions?.canApproveInvoices || false,
                canManageRetainers: member.permissions?.canManageRetainers || false,
                canExportData: member.permissions?.canExportData || false,
                canDeleteRecords: member.permissions?.canDeleteRecords || false,
                canViewFinance: member.permissions?.canViewFinance || false,
                canManageTeam: member.permissions?.canManageTeam || false
            },
            // For departed, list of cases they can still access
            assignedCases: isDeparted ? member.assignedCases : undefined
        }
    });
});

/**
 * Get available roles and their permissions (for UI)
 * GET /api/firms/roles
 */
const getAvailableRoles = asyncHandler(async (req, res) => {
    const { getDefaultPermissions } = require('../config/permissions.config');

    const roles = [
        { id: 'admin', name: 'مسؤول', nameEn: 'Admin', description: 'صلاحيات كاملة تقريباً' },
        { id: 'partner', name: 'شريك', nameEn: 'Partner', description: 'محامي أقدم مع صلاحيات موسعة' },
        { id: 'lawyer', name: 'محامي', nameEn: 'Lawyer', description: 'صلاحيات العمل القانوني الأساسية' },
        { id: 'paralegal', name: 'مساعد قانوني', nameEn: 'Paralegal', description: 'دعم للعمل القانوني' },
        { id: 'secretary', name: 'سكرتير', nameEn: 'Secretary', description: 'صلاحيات إدارية أساسية' },
        { id: 'accountant', name: 'محاسب', nameEn: 'Accountant', description: 'التركيز على الجوانب المالية' }
    ];

    const rolesWithPermissions = roles.map(role => ({
        ...role,
        defaultPermissions: getDefaultPermissions(role.id)
    }));

    res.json({
        success: true,
        data: rolesWithPermissions
    });
});

module.exports = {
    // Marketplace (backwards compatible)
    getFirms,

    // Multi-tenancy
    createFirm,
    getMyFirm,
    getFirm,
    updateFirm,
    updateBillingSettings,
    getMembers,
    inviteMember,
    updateMember,
    removeMember,
    leaveFirm,
    transferOwnership,
    getFirmStats,

    // Team management (فريق العمل)
    getTeam,
    processDeparture,
    reinstateMember,
    getDepartedMembers,
    getMyPermissions,
    getAvailableRoles,

    // Backwards compatible
    addLawyer,
    removeLawyer
};
