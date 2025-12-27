/**
 * Firm Controller - Multi-Tenancy Management
 *
 * Handles firm creation, team management, settings, and billing configuration.
 * Also maintains backwards compatibility with marketplace functions.
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Firm, User, Client, Case, Invoice, Lead, FirmInvitation } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const { getDefaultPermissions } = require('../config/permissions.config');
const { pickAllowedFields } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate Saudi Arabia VAT Registration Number
 * Saudi VAT is a 15-digit number
 * Format: NNNNNNNNNNNNNNN (15 numeric digits)
 *
 * @param {string} vatNumber - VAT registration number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateSaudiVAT = (vatNumber) => {
    if (!vatNumber) {
        return false;
    }

    // Convert to string and remove any spaces
    const vat = String(vatNumber).trim();

    // Saudi VAT must be exactly 15 digits
    const vatRegex = /^\d{15}$/;
    return vatRegex.test(vat);
};

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
    const { templateId } = req.body;

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'name',
        'nameArabic',
        'nameEnglish',
        'description',
        'crNumber',
        'licenseNumber',
        'email',
        'phone',
        'address',
        'practiceAreas',
        'vatRegistration',
        'templateId' // Allow templateId parameter
    ];
    const safeInput = pickAllowedFields(req.body, allowedFields);
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
    } = safeInput;

    // Validate required fields
    if (!name || !licenseNumber) {
        throw CustomException('الاسم ورقم الترخيص مطلوبان', 400);
    }

    // VAT VALIDATION: Validate Saudi VAT if provided
    if (vatRegistration && !validateSaudiVAT(vatRegistration)) {
        throw CustomException('رقم التسجيل الضريبي غير صحيح. يجب أن يكون 15 رقم سعودي', 400);
    }

    // Check if user already has a firm
    const user = await User.findById(userId);
    if (user.firmId) {
        throw CustomException('لديك مكتب محاماة بالفعل', 400);
    }

    // If templateId is provided, create firm from template
    if (templateId) {
        const OrganizationTemplateService = require('../services/organizationTemplate.service');

        try {
            const firm = await OrganizationTemplateService.createFirmFromTemplate(
                templateId,
                safeInput,
                userId
            );

            return res.status(201).json({
                success: true,
                message: 'تم إنشاء المكتب من القالب بنجاح',
                data: firm
            });
        } catch (error) {
            // If template creation fails, fall back to standard creation
            console.error('Template creation failed, using standard creation:', error.message);
        }
    }

    // Standard firm creation (without template or as fallback)
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
    // Note: firmId is null for new firm owners, no firm scoping needed for this self-update
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
 * Switch active firm
 * POST /api/firms/switch
 * Body: { firmId: string }
 */
const switchFirm = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const { firmId } = req.body;

    if (!firmId) {
        throw CustomException('firmId is required', 400);
    }

    // Verify user is a member of this firm
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('Firm not found', 404);
    }

    const member = firm.members.find(m =>
        m.userId.toString() === userId.toString() &&
        m.status === 'active'
    );

    if (!member) {
        throw CustomException('Access denied to this firm', 403);
    }

    // Update user's default firm
    // Note: This is a self-update (switching own firm), no firm scoping needed
    await User.findByIdAndUpdate(userId, {
        firmId: firmId,
        firmRole: member.role
    });

    // Optionally issue new JWT with updated firmId
    const token = jwt.sign(
        {
            _id: userId,
            firmId: firmId,
            firmRole: member.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
        success: true,
        data: {
            activeFirm: {
                id: firm._id,
                name: firm.name,
                nameArabic: firm.nameArabic,
                logo: firm.logo,
                role: member.role
            },
            token // New token with updated firm context
        }
    });
});

/**
 * Get firm by ID
 * GET /api/firms/:id or /:_id
 * IDOR PROTECTION: Users can only access their own firm or firms where they are members
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

    // IDOR PROTECTION: Ensure user is a member of the firm or is the owner
    const isMember = firm.members.some(m => m.userId._id.toString() === userId);
    const isOwner = firm.ownerId.toString() === userId;
    const isInLawyers = firm.lawyers?.some(l => l._id.toString() === userId);

    if (!isMember && !isOwner && !isInLawyers) {
        throw CustomException('ليس لديك إمكانية الوصول إلى هذا المكتب', 403);
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
 * MASS ASSIGNMENT PROTECTION: Only allow specific fields to be updated
 */
const updateFirm = asyncHandler(async (req, res) => {
    const id = req.params.id || req.params._id;
    const userId = req.userID;

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

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields to be updated
    const allowedFields = [
        'name',
        'nameArabic',
        'nameEnglish',
        'description',
        'email',
        'phone',
        'address',
        'practiceAreas',
        'website',
        'logo',
        'businessHours',
        'socialMedia',
        'bankDetails',
        'billingSettings',
        'enterpriseSettings',
        'vatRegistration'
    ];
    const updates = pickAllowedFields(req.body, allowedFields);

    // VAT VALIDATION: If VAT is being updated, validate it
    if (updates.vatRegistration && !validateSaudiVAT(updates.vatRegistration)) {
        throw CustomException('رقم التسجيل الضريبي غير صحيح. يجب أن يكون 15 رقم سعودي', 400);
    }

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
 * MASS ASSIGNMENT PROTECTION: Only allow specific billing fields
 */
const updateBillingSettings = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لتعديل إعدادات الفوترة', 403);
    }

    // MASS ASSIGNMENT PROTECTION: Only allow specific billing fields
    const allowedBillingFields = [
        'taxId',
        'companyName',
        'address',
        'city',
        'state',
        'zipCode',
        'country',
        'paymentTerms',
        'invoicePrefix',
        'currency',
        'tax',
        'bankName',
        'bankAccountNumber',
        'iban',
        'swift',
        'paypalEmail',
        'stripeAccountId'
    ];
    const billingSettings = pickAllowedFields(req.body, allowedBillingFields);

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
    // SECURITY: bypassFirmFilter needed - need to find users without firm to invite them
    const invitedUser = await User.findOne({ email: email.toLowerCase() })
        .setOptions({ bypassFirmFilter: true });
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
 * IDOR PROTECTION: User must be owner or admin of the firm
 */
const addLawyer = async (request, response) => {
    const { firmId, lawyerId } = request.body;
    const userId = request.userID;

    try {
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found!', 404);
        }

        // IDOR PROTECTION: Check if requesting user is owner or admin
        const requestingMember = firm.members.find(m => m.userId.toString() === userId);
        if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
            throw CustomException('You do not have permission to add lawyers to this firm', 403);
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
 * MASS ASSIGNMENT PROTECTION: Only allow specific member fields
 * IDOR PROTECTION: Only allow updating members within the requesting user's firm
 */
const updateMember = asyncHandler(async (req, res) => {
    const { id, memberId } = req.params;
    const userId = req.userID;

    const firm = await Firm.findById(id);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // IDOR PROTECTION: Check if user is owner or admin of THIS firm
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لتعديل الأعضاء', 403);
    }

    // IDOR PROTECTION: Verify the member being updated exists in THIS firm
    const memberToUpdate = firm.members.find(m => m.userId.toString() === memberId);
    if (!memberToUpdate) {
        throw CustomException('العضو غير موجود', 404);
    }

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields to be updated
    const allowedFields = ['role', 'permissions', 'title', 'department', 'status'];
    const updates = pickAllowedFields(req.body, allowedFields);

    // Cannot change owner's role
    if (memberToUpdate.role === 'owner' && updates.role && updates.role !== 'owner') {
        throw CustomException('لا يمكن تغيير دور مالك المكتب', 400);
    }

    // Only owner can promote to admin
    if (updates.role === 'admin' && requestingMember.role !== 'owner') {
        throw CustomException('فقط مالك المكتب يمكنه تعيين مسؤولين', 403);
    }

    await firm.updateMember(memberId, updates);

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
 * IDOR PROTECTION: User must be owner or admin of the firm
 */
const removeLawyer = async (request, response) => {
    const { firmId, lawyerId } = request.body;
    const userId = request.userID;

    try {
        const firm = await Firm.findById(firmId);
        if (!firm) {
            throw CustomException('Firm not found!', 404);
        }

        // IDOR PROTECTION: Check if requesting user is owner or admin
        const requestingMember = firm.members.find(m => m.userId.toString() === userId);
        if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
            throw CustomException('You do not have permission to remove lawyers from this firm', 403);
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

    // Update user's firmStatus and set departedAt for data retention tracking
    // IDOR PROTECTION: Scope by firmId to ensure user belongs to this firm
    await User.findOneAndUpdate(
        { _id: memberId, firmId: id },
        {
            firmStatus: 'departed',
            departedAt: new Date()
        }
    );

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
    // IDOR PROTECTION: Scope by firmId to ensure user belongs to this firm
    await User.findOneAndUpdate(
        { _id: memberId, firmId: id },
        { firmStatus: 'active' }
    );

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

    const user = await User.findById(userId).select('firmId firmRole firmStatus isSoloLawyer lawyerWorkMode role');

    // Handle solo lawyer - they have full permissions without needing a firm
    if (user.isSoloLawyer || (user.role === 'lawyer' && !user.firmId)) {
        const soloPermissions = getDefaultPermissions('owner');
        return res.json({
            success: true,
            data: {
                isSoloLawyer: true,
                firmId: null,
                firmName: null,
                role: null,
                status: 'active',
                isDeparted: false,
                permissions: {
                    modules: {
                        cases: 'full',
                        clients: 'full',
                        calendar: 'full',
                        tasks: 'full',
                        documents: 'full',
                        finance: 'full',
                        time_tracking: 'full',
                        investments: 'full'
                    },
                    special: {
                        canInviteMembers: false,
                        canManageBilling: true,
                        canAccessReports: true,
                        canExportData: true
                    }
                },
                // Accessible modules summary for solo lawyers (full access)
                accessibleModules: {
                    clients: 'full',
                    cases: 'full',
                    leads: 'full',
                    invoices: 'full',
                    payments: 'full',
                    expenses: 'full',
                    documents: 'full',
                    tasks: 'full',
                    events: 'full',
                    timeTracking: 'full',
                    reports: 'full',
                    team: 'none' // Solo lawyers don't have team
                },
                specialPermissions: {
                    canApproveInvoices: true,
                    canManageRetainers: true,
                    canExportData: true,
                    canDeleteRecords: true,
                    canViewFinance: true,
                    canManageTeam: false
                }
            }
        });
    }

    // No firm associated
    if (!user.firmId) {
        return res.status(404).json({
            success: false,
            message: 'لا يوجد مكتب مرتبط بحسابك',
            code: 'NO_FIRM_ASSOCIATED',
            isSoloLawyer: false
        });
    }

    const firm = await Firm.findById(user.firmId).select('members name');
    if (!firm) {
        return res.status(404).json({
            success: false,
            message: 'المكتب غير موجود',
            code: 'FIRM_NOT_FOUND'
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
            isSoloLawyer: false,
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

// ═══════════════════════════════════════════════════════════════
// INVITATION SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Create invitation
 * POST /api/firms/:firmId/invitations
 */
const createInvitation = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const userId = req.userID;
    const { email, role = 'lawyer', permissions, expiresInDays = 7, message } = req.body;

    // Validate email
    if (!email) {
        throw CustomException('البريد الإلكتروني مطلوب', 400);
    }

    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لإرسال دعوات', 403);
    }

    // Check subscription limits
    const activeMembers = firm.members.filter(m => m.status === 'active').length;
    const pendingInvitations = await FirmInvitation.countDocuments({
        firmId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
    });

    if (activeMembers + pendingInvitations >= firm.subscription.maxUsers) {
        throw CustomException('تم الوصول إلى الحد الأقصى لعدد الأعضاء في خطتك الحالية', 400);
    }

    // Check if email is already a member
    const existingMember = await User.findOne({ email: email.toLowerCase(), firmId });
    if (existingMember) {
        throw CustomException('هذا المستخدم عضو في المكتب بالفعل', 400);
    }

    // Check if there's already an active invitation
    const hasActiveInvitation = await FirmInvitation.hasActiveInvitation(firmId, email);
    if (hasActiveInvitation) {
        throw CustomException('يوجد دعوة نشطة لهذا البريد الإلكتروني بالفعل', 400);
    }

    // Create invitation
    const code = FirmInvitation.generateCode();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const invitation = await FirmInvitation.create({
        code,
        firmId,
        email: email.toLowerCase(),
        role,
        permissions: permissions || null,
        message,
        expiresAt,
        invitedBy: userId
    });

    // Get firm name for response
    const inviteLink = `https://app.traf3li.com/join-firm?code=${code}`;

    res.status(201).json({
        success: true,
        invitation: {
            id: invitation._id,
            code: invitation.code,
            firmId: invitation.firmId,
            firmName: firm.name,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
            invitedBy: userId,
            createdAt: invitation.createdAt
        },
        inviteLink,
        message: 'تم إرسال الدعوة بنجاح'
    });
});

/**
 * Get firm invitations
 * GET /api/firms/:firmId/invitations
 */
const getInvitations = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const userId = req.userID;
    const { status } = req.query;

    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لعرض الدعوات', 403);
    }

    // Build query
    const query = { firmId };
    if (status) {
        query.status = status;
    }

    const invitations = await FirmInvitation.find(query)
        .populate('invitedBy', 'firstName lastName')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        invitations: invitations.map(inv => ({
            id: inv._id,
            code: inv.code,
            email: inv.email,
            role: inv.role,
            status: inv.status,
            expiresAt: inv.expiresAt,
            invitedBy: inv.invitedBy ? {
                id: inv.invitedBy._id,
                name: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`
            } : null,
            createdAt: inv.createdAt
        })),
        total: invitations.length
    });
});

/**
 * Cancel invitation
 * DELETE /api/firms/:firmId/invitations/:invitationId
 */
const cancelInvitation = asyncHandler(async (req, res) => {
    const { firmId, invitationId } = req.params;
    const userId = req.userID;

    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لإلغاء الدعوات', 403);
    }

    const invitation = await FirmInvitation.findOne({ _id: invitationId, firmId });
    if (!invitation) {
        throw CustomException('الدعوة غير موجودة', 404);
    }

    if (invitation.status !== 'pending') {
        throw CustomException('لا يمكن إلغاء دعوة غير معلقة', 400);
    }

    await invitation.cancel(userId);

    res.json({
        success: true,
        message: 'تم إلغاء الدعوة بنجاح'
    });
});

/**
 * Validate invitation code (public)
 * GET /api/invitations/:code
 */
const validateInvitationCode = asyncHandler(async (req, res) => {
    const { code } = req.params;

    const invitation = await FirmInvitation.findValidByCode(code);

    if (!invitation) {
        return res.status(400).json({
            valid: false,
            error: 'الدعوة غير صالحة أو منتهية الصلاحية',
            code: 'INVITATION_INVALID'
        });
    }

    res.json({
        valid: true,
        invitation: {
            firmName: invitation.firmId?.name,
            firmNameEn: invitation.firmId?.nameEnglish,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
            invitedEmail: invitation.email
        }
    });
});

/**
 * Accept invitation (authenticated user)
 * POST /api/invitations/:code/accept
 */
const acceptInvitation = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const userId = req.userID;
    const { acceptTerms } = req.body;

    if (!acceptTerms) {
        throw CustomException('يجب قبول الشروط للانضمام', 400);
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
        throw CustomException('المستخدم غير موجود', 404);
    }

    // Check if user is a lawyer
    if (user.role !== 'lawyer' && !user.isSeller) {
        throw CustomException('هذه الخدمة متاحة للمحامين فقط', 403);
    }

    // Check if user already has a firm - DISABLED for testing flexibility
    // if (user.firmId) {
    //     throw CustomException('لديك مكتب مرتبط بالفعل', 409);
    // }

    // Validate invitation
    const invitation = await FirmInvitation.findValidByCode(code);
    if (!invitation) {
        throw CustomException('الدعوة غير صالحة أو منتهية الصلاحية', 400);
    }

    // Check if email matches
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        throw CustomException('كود الدعوة مخصص لبريد إلكتروني آخر', 400);
    }

    // Get firm
    const firm = await Firm.findById(invitation.firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check subscription limits
    const activeMembers = firm.members.filter(m => m.status === 'active').length;
    if (activeMembers >= firm.subscription.maxUsers) {
        throw CustomException('تم الوصول إلى الحد الأقصى لعدد الأعضاء في المكتب', 400);
    }

    // Add user to firm
    const memberPermissions = invitation.permissions && Object.values(invitation.permissions).some(v => v !== null)
        ? invitation.permissions
        : getDefaultPermissions(invitation.role);

    firm.members.push({
        userId: user._id,
        role: invitation.role,
        permissions: memberPermissions,
        status: 'active',
        joinedAt: new Date()
    });

    if (!firm.lawyers.includes(user._id)) {
        firm.lawyers.push(user._id);
    }

    await firm.save();

    // Update user
    await User.findByIdAndUpdate(user._id, {
        firmId: firm._id,
        firmRole: invitation.role,
        firmStatus: 'active',
        isSoloLawyer: false,
        lawyerWorkMode: 'firm_member',
        'lawyerProfile.firmID': firm._id
    });

    // Mark invitation as accepted
    await invitation.accept(user._id);

    res.json({
        success: true,
        firm: {
            id: firm._id,
            name: firm.name,
            role: invitation.role
        },
        message: 'تم الانضمام إلى المكتب بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// SOLO LAWYER FEATURES
// ═══════════════════════════════════════════════════════════════

/**
 * Convert solo lawyer to firm owner
 * POST /api/users/convert-to-firm
 * MASS ASSIGNMENT PROTECTION: Only allow specific firm data fields
 */
const convertSoloToFirm = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const { firmData, migrateExistingData = true } = req.body;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
        throw CustomException('المستخدم غير موجود', 404);
    }

    // Check if user is a lawyer
    if (user.role !== 'lawyer' && !user.isSeller) {
        throw CustomException('هذه الخدمة متاحة للمحامين فقط', 403);
    }

    // Check if user already has a firm - DISABLED for testing flexibility
    // if (user.firmId) {
    //     throw CustomException('لديك مكتب مرتبط بالفعل', 409);
    // }

    // MASS ASSIGNMENT PROTECTION: Only allow specific firm data fields
    const allowedFirmFields = [
        'name',
        'nameEn',
        'licenseNumber',
        'email',
        'phone',
        'region',
        'city',
        'address',
        'website',
        'description',
        'specializations',
        'vatRegistration'
    ];
    const safeFirmData = pickAllowedFields(firmData, allowedFirmFields);

    // Validate firm data
    if (!safeFirmData || !safeFirmData.name || !safeFirmData.licenseNumber) {
        throw CustomException('بيانات المكتب مطلوبة: الاسم ورقم الترخيص', 400);
    }

    // VAT VALIDATION: Validate Saudi VAT if provided
    if (safeFirmData.vatRegistration && !validateSaudiVAT(safeFirmData.vatRegistration)) {
        throw CustomException('رقم التسجيل الضريبي غير صحيح. يجب أن يكون 15 رقم سعودي', 400);
    }

    // Create the firm
    const firm = await Firm.create({
        name: safeFirmData.name,
        nameArabic: safeFirmData.name,
        nameEnglish: safeFirmData.nameEn || null,
        licenseNumber: safeFirmData.licenseNumber,
        email: safeFirmData.email || user.email,
        phone: safeFirmData.phone || user.phone,
        address: {
            region: safeFirmData.region,
            city: safeFirmData.city,
            street: safeFirmData.address
        },
        website: safeFirmData.website || null,
        description: safeFirmData.description || null,
        practiceAreas: safeFirmData.specializations || user.lawyerProfile?.specialization || [],
        vatRegistration: safeFirmData.vatRegistration || null,
        ownerId: userId,
        createdBy: userId,
        lawyers: [userId],
        members: [{
            userId,
            role: 'owner',
            permissions: getDefaultPermissions('owner'),
            status: 'active',
            joinedAt: new Date()
        }],
        subscription: {
            plan: 'free',
            status: 'trial',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            maxUsers: 3,
            maxCases: 50,
            maxClients: 100
        }
    });

    // Update user
    await User.findByIdAndUpdate(userId, {
        firmId: firm._id,
        firmRole: 'owner',
        firmStatus: 'active',
        isSoloLawyer: false,
        lawyerWorkMode: 'firm_owner',
        'lawyerProfile.firmID': firm._id
    });

    // Migrate existing data if requested
    if (migrateExistingData) {
        // Update all existing data to belong to the new firm
        await Promise.all([
            Client.updateMany({ lawyerId: userId, firmId: null }, { firmId: firm._id }),
            Case.updateMany({ lawyerId: userId, firmId: null }, { firmId: firm._id }),
            Invoice.updateMany({ lawyerId: userId, firmId: null }, { firmId: firm._id }),
            Lead.updateMany({ lawyerId: userId, firmId: null }, { firmId: firm._id })
        ]);
    }

    res.status(201).json({
        success: true,
        firm: {
            id: firm._id,
            name: firm.name,
            licenseNumber: firm.licenseNumber,
            status: firm.status
        },
        message: 'تم إنشاء المكتب ونقل بياناتك بنجاح'
    });
});

/**
 * Leave firm (for members) with option to convert to solo
 * POST /api/firms/:id/leave
 * Updated to support convertToSolo option
 */
const leaveFirmWithSolo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const { reason, convertToSolo = true } = req.body;

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

    // Remove from firm
    await firm.removeMember(userId);

    // Remove from lawyers array
    firm.lawyers = firm.lawyers.filter(l => l.toString() !== userId);
    await firm.save();

    // Update user based on convertToSolo option
    const userUpdate = {
        $unset: { firmId: 1 },
        firmRole: null,
        firmStatus: null,
        'lawyerProfile.firmID': null
    };

    if (convertToSolo) {
        userUpdate.isSoloLawyer = true;
        userUpdate.lawyerWorkMode = 'solo';
    }

    await User.findByIdAndUpdate(userId, userUpdate);

    res.json({
        success: true,
        message: convertToSolo
            ? 'تمت مغادرة المكتب بنجاح. أنت الآن محامي مستقل'
            : 'تمت مغادرة المكتب بنجاح',
        isSoloLawyer: convertToSolo
    });
});

/**
 * Resend invitation email
 * POST /api/firms/:firmId/invitations/:invitationId/resend
 */
const resendInvitation = asyncHandler(async (req, res) => {
    const { firmId, invitationId } = req.params;
    const userId = req.userID;

    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Check if user is owner or admin
    const requestingMember = firm.members.find(m => m.userId.toString() === userId);
    if (!requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
        throw CustomException('ليس لديك صلاحية لإعادة إرسال الدعوات', 403);
    }

    const invitation = await FirmInvitation.findOne({ _id: invitationId, firmId });
    if (!invitation) {
        throw CustomException('الدعوة غير موجودة', 404);
    }

    if (invitation.status !== 'pending') {
        throw CustomException('لا يمكن إعادة إرسال دعوة غير معلقة', 400);
    }

    if (invitation.expiresAt < new Date()) {
        throw CustomException('الدعوة منتهية الصلاحية', 400);
    }

    // Update email sent tracking
    await invitation.markEmailSent();

    // TODO: Send email (integrate with email service)

    res.json({
        success: true,
        message: 'تم إعادة إرسال الدعوة بنجاح',
        emailSentCount: invitation.emailSentCount
    });
});

// ═══════════════════════════════════════════════════════════════
// IP WHITELIST MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const ipRestrictionService = require('../services/ipRestriction.service');
const { getClientIP } = require('../middlewares/adminIPWhitelist.middleware');

/**
 * Get IP whitelist for a firm
 * GET /api/firms/:firmId/ip-whitelist
 */
const getIPWhitelist = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const userId = req.userID;

    // Verify user is admin or owner
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لعرض قائمة IP', 403);
    }

    const result = await ipRestrictionService.getIPWhitelist(firmId);

    res.json({
        success: true,
        message: 'تم جلب قائمة IP بنجاح',
        data: result
    });
});

/**
 * Add IP to whitelist
 * POST /api/firms/:firmId/ip-whitelist
 */
const addIPToWhitelist = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const userId = req.userID;
    const { ip, description, temporary, durationHours } = req.body;

    if (!ip) {
        throw CustomException('عنوان IP مطلوب', 400);
    }

    // Verify user is admin or owner
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لإضافة IP', 403);
    }

    // Context for audit
    const context = {
        userId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        method: req.method
    };

    let result;

    if (temporary && durationHours) {
        // Add temporary IP allowance
        const validDurations = [24, 168, 720]; // 1d, 7d, 30d
        if (!validDurations.includes(durationHours)) {
            throw CustomException('مدة غير صالحة. استخدم 24، 168، أو 720 ساعة', 400);
        }

        result = await ipRestrictionService.addTemporaryIP(
            firmId,
            ip,
            durationHours,
            description,
            userId,
            context
        );
    } else {
        // Add permanent IP to whitelist
        result = await ipRestrictionService.addAllowedIP(
            firmId,
            ip,
            description,
            context
        );
    }

    res.status(201).json({
        success: true,
        message: temporary ? 'تم إضافة IP مؤقتاً بنجاح' : 'تم إضافة IP بنجاح',
        data: result
    });
});

/**
 * Remove IP from whitelist
 * DELETE /api/firms/:firmId/ip-whitelist/:ip
 */
const removeIPFromWhitelist = asyncHandler(async (req, res) => {
    const { firmId, ip } = req.params;
    const userId = req.userID;

    // Decode IP (URL-encoded)
    const decodedIP = decodeURIComponent(ip);

    // Verify user is admin or owner
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لإزالة IP', 403);
    }

    // Context for audit
    const context = {
        userId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        method: req.method
    };

    const result = await ipRestrictionService.removeAllowedIP(
        firmId,
        decodedIP,
        context
    );

    res.json({
        success: true,
        message: 'تم إزالة IP بنجاح',
        data: result
    });
});

/**
 * Test if current IP would be allowed
 * POST /api/firms/:firmId/ip-whitelist/test
 */
const testIPAccess = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const userId = req.userID;

    // Get client IP
    const clientIP = getClientIP(req);

    if (!clientIP) {
        throw CustomException('غير قادر على تحديد عنوان IP', 400);
    }

    // Verify user is member of firm
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member) {
        throw CustomException('أنت لست عضواً في هذا المكتب', 403);
    }

    // Check if IP would be allowed
    const result = await ipRestrictionService.isIPAllowed(clientIP, firmId);

    res.json({
        success: true,
        message: 'تم اختبار عنوان IP',
        data: {
            clientIP,
            allowed: result.allowed,
            reason: result.reason,
            expiresAt: result.expiresAt,
            whitelistEnabled: firm.enterpriseSettings?.ipWhitelistEnabled || false
        }
    });
});

/**
 * Enable IP whitelisting for firm
 * POST /api/firms/:firmId/ip-whitelist/enable
 */
const enableIPWhitelist = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const userId = req.userID;
    const { autoWhitelistCurrentIP = true } = req.body;

    // Verify user is owner or admin
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لتفعيل قائمة IP', 403);
    }

    // Get client IP
    const clientIP = getClientIP(req);

    // Context for audit
    const context = {
        userId,
        ipAddress: clientIP,
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        method: req.method
    };

    const result = await ipRestrictionService.enableIPWhitelist(
        firmId,
        clientIP,
        autoWhitelistCurrentIP,
        context
    );

    res.json({
        success: true,
        message: 'تم تفعيل قائمة IP بنجاح',
        data: result
    });
});

/**
 * Disable IP whitelisting for firm
 * POST /api/firms/:firmId/ip-whitelist/disable
 */
const disableIPWhitelist = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const userId = req.userID;

    // Verify user is owner or admin
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لتعطيل قائمة IP', 403);
    }

    // Context for audit
    const context = {
        userId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        method: req.method
    };

    const result = await ipRestrictionService.disableIPWhitelist(firmId, context);

    res.json({
        success: true,
        message: 'تم تعطيل قائمة IP بنجاح',
        data: result
    });
});

/**
 * Revoke temporary IP allowance
 * DELETE /api/firms/:firmId/ip-whitelist/temporary/:allowanceId
 */
const revokeTemporaryIP = asyncHandler(async (req, res) => {
    const { firmId, allowanceId } = req.params;
    const userId = req.userID;
    const { reason } = req.body;

    // Verify user is admin or owner
    const firm = await Firm.findById(firmId);
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لإلغاء IP مؤقت', 403);
    }

    // Revoke the temporary allowance
    const TemporaryIPAllowance = require('../models/temporaryIPAllowance.model');
    const allowance = await TemporaryIPAllowance.findById(allowanceId);

    if (!allowance) {
        throw CustomException('السماح المؤقت غير موجود', 404);
    }

    if (allowance.firmId.toString() !== firmId) {
        throw CustomException('السماح المؤقت لا ينتمي لهذا المكتب', 403);
    }

    await allowance.revoke(userId, reason);

    res.json({
        success: true,
        message: 'تم إلغاء السماح المؤقت بنجاح',
        data: {
            id: allowance._id,
            revokedAt: allowance.revokedAt,
            revokedBy: userId
        }
    });
});

module.exports = {
    // Marketplace (backwards compatible)
    getFirms,

    // Multi-tenancy
    createFirm,
    getMyFirm,
    switchFirm,
    getFirm,
    updateFirm,
    updateBillingSettings,
    getMembers,
    inviteMember,
    updateMember,
    removeMember,
    leaveFirm,
    leaveFirmWithSolo,
    transferOwnership,
    getFirmStats,

    // Team management (فريق العمل)
    getTeam,
    processDeparture,
    reinstateMember,
    getDepartedMembers,
    getMyPermissions,
    getAvailableRoles,

    // Invitation system
    createInvitation,
    getInvitations,
    cancelInvitation,
    validateInvitationCode,
    acceptInvitation,
    resendInvitation,

    // Solo lawyer features
    convertSoloToFirm,

    // IP Whitelist management
    getIPWhitelist,
    addIPToWhitelist,
    removeIPFromWhitelist,
    testIPAccess,
    enableIPWhitelist,
    disableIPWhitelist,
    revokeTemporaryIP,

    // Backwards compatible
    addLawyer,
    removeLawyer
};
