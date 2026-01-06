/**
 * Firm Controller - Multi-Tenancy Management
 *
 * Handles firm creation, team management, settings, and billing configuration.
 * Also maintains backwards compatibility with marketplace functions.
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Firm, User, Client, Case, Invoice, Lead, FirmInvitation } = require('../models');
const { generateAccessToken } = require('../utils/generateToken');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const { getDefaultPermissions } = require('../config/permissions.config');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

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
            ...(city && { city: { $regex: escapeRegex(city), $options: 'i' } }),
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

    // IDOR Protection: Verify user is a member of the firm
    const firm = await Firm.findOne({
        _id: user.firmId,
        'members.userId': userId
    })
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

    // IDOR PROTECTION: Verify user is a member of this firm
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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

    // Update user's default firm and get updated user
    // Note: This is a self-update (switching own firm), no firm scoping needed
    const user = await User.findByIdAndUpdate(
        userId,
        {
            firmId: firmId,
            firmRole: member.role
        },
        { new: true }
    ).setOptions({ bypassFirmFilter: true });

    // Issue new JWT with updated firm context using proper utility
    const token = await generateAccessToken(user, { firm });

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
            // OAuth 2.0 standard format
            access_token: token,
            token_type: 'Bearer',
            expires_in: 900, // 15 minutes
            // Backwards compatibility
            token
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    })
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Use findOneAndUpdate with member check
    const updatedFirm = await Firm.findOneAndUpdate(
        { _id: id, 'members.userId': userId },
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    })
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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
        // IDOR PROTECTION: Only fetch firms where user is a member
        const firm = await Firm.findOne({
            _id: firmId,
            'members.userId': userId
        });
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

        // IDOR PROTECTION: Update lawyer profile with firm reference, verify they're being added to this firm
        await User.findOneAndUpdate(
            { _id: lawyerId },
            {
                'lawyerProfile.firmID': firmId,
                firmId: firmId,
                firmRole: 'lawyer'
            }
        );

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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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
        // IDOR PROTECTION: Only fetch firms where user is a member
        const firm = await Firm.findOne({
            _id: firmId,
            'members.userId': userId
        });
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

        // IDOR PROTECTION: Remove firm reference from lawyer profile, verify they're in this firm
        await User.findOneAndUpdate(
            { _id: lawyerId, ...req.firmQuery },
            {
                'lawyerProfile.firmID': null,
                $unset: { firmId: 1, firmRole: 1 }
            }
        );

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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    })
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    })
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

    // IDOR Protection: Verify user is a member of the firm
    const firm = await Firm.findOne({
        _id: user.firmId,
        'members.userId': userId
    }).select('members name');
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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

    // Get inviter name for response
    const inviter = await User.findById(userId).select('firstName lastName');
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : null;

    res.status(201).json({
        success: true,
        message: 'تم إرسال الدعوة بنجاح',
        data: {
            invitation: {
                id: invitation._id,
                code: invitation.code,
                email: invitation.email,
                role: invitation.role,
                status: invitation.status,
                expiresAt: invitation.expiresAt,
                invitedBy: { id: userId, name: inviterName },
                createdAt: invitation.createdAt
            },
            emailSent: true, // TODO: Integrate with actual email service
            inviteLink: `https://app.traf3li.com/join-firm?code=${code}`
        }
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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
        data: invitations.map(inv => ({
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
        }))
    });
});

/**
 * Cancel invitation
 * DELETE /api/firms/:firmId/invitations/:invitationId
 */
const cancelInvitation = asyncHandler(async (req, res) => {
    const { firmId, invitationId } = req.params;
    const userId = req.userID;

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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
        // Check if invitation exists but expired
        const expiredInvitation = await FirmInvitation.findOne({ code });
        if (expiredInvitation && expiredInvitation.expiresAt < new Date()) {
            return res.json({
                success: true,
                data: {
                    valid: false,
                    error: 'الدعوة منتهية الصلاحية',
                    code: 'INVITATION_EXPIRED'
                }
            });
        }

        return res.json({
            success: true,
            data: {
                valid: false,
                error: 'الدعوة غير صالحة',
                code: 'INVITATION_INVALID'
            }
        });
    }

    // Get inviter name
    const inviter = await User.findById(invitation.invitedBy).select('firstName lastName');
    const invitedByName = inviter ? `${inviter.firstName} ${inviter.lastName}` : null;

    res.json({
        success: true,
        data: {
            valid: true,
            invitation: {
                email: invitation.email,
                firmName: invitation.firmId?.name,
                firmNameEn: invitation.firmId?.nameEnglish,
                role: invitation.role,
                expiresAt: invitation.expiresAt,
                invitedBy: invitedByName
            }
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: id,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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

    // Extend expiration by 7 days if expired or expiring soon
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    invitation.expiresAt = newExpiresAt;

    // Update email sent tracking
    await invitation.markEmailSent();
    await invitation.save();

    // TODO: Send email (integrate with email service)

    res.json({
        success: true,
        message: 'تم إعادة إرسال الدعوة بنجاح',
        data: {
            emailSent: true,
            newExpiresAt: invitation.expiresAt
        }
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

    // IDOR PROTECTION: Verify user is admin or owner - only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Verify user is admin or owner - only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Verify user is admin or owner - only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Verify user is member of firm - only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Verify user is owner or admin - only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Verify user is owner or admin - only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
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

    // IDOR PROTECTION: Verify user is admin or owner - only fetch firms where user is a member
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': userId
    });
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لإلغاء IP مؤقت', 403);
    }

    // Revoke the temporary allowance
    const TemporaryIPAllowance = require('../models/temporaryIPAllowance.model');
    const allowance = await TemporaryIPAllowance.findOne({ _id: allowanceId, firmId });

    if (!allowance) {
        throw CustomException('السماح المؤقت غير موجود', 404);
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

// ═══════════════════════════════════════════════════════════════
// COMPANY HIERARCHY MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get company hierarchy tree
 * GET /api/firms/tree
 *
 * Returns the full hierarchy tree for the user's firm and its descendants
 */
const getHierarchyTree = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Get the user's firm
    const userFirm = await Firm.findOne({ _id: firmId }).lean();
    if (!userFirm) {
        throw CustomException('لم يتم العثور على المكتب', 404);
    }

    // Find the root of this user's hierarchy
    let rootFirmId = userFirm._id;
    if (userFirm.parentFirmId) {
        const ancestors = await Firm.getAncestors(userFirm._id);
        if (ancestors.length > 0) {
            rootFirmId = ancestors[ancestors.length - 1]._id;
        }
    }

    // Build the tree from the root
    const tree = await Firm.buildTree(rootFirmId);

    res.json({
        success: true,
        data: tree
    });
});

/**
 * Get child companies of a specific firm
 * GET /api/firms/:id/children
 */
const getChildCompanies = asyncHandler(async (req, res) => {
    const sanitizedId = sanitizeObjectId(req.params.id);
    const userId = req.userID;

    // Validate access to parent firm
    const parentFirm = await Firm.findOne({ _id: sanitizedId, 'members.userId': userId });
    if (!parentFirm) {
        // Check if user has cross-company access
        const UserCompanyAccess = require('../models/userCompanyAccess.model');
        const hasAccess = await UserCompanyAccess.hasAccess(userId, sanitizedId);
        if (!hasAccess) {
            throw CustomException('ليس لديك صلاحية للوصول إلى هذا المكتب', 403);
        }
    }

    const children = await Firm.getChildren(sanitizedId);

    res.json({
        success: true,
        data: children
    });
});

/**
 * Move company to different parent
 * PUT /api/firms/:id/move
 *
 * Body: { parentFirmId: ObjectId | null }
 */
const moveCompany = asyncHandler(async (req, res) => {
    const sanitizedId = sanitizeObjectId(req.params.id);
    const sanitizedParentId = req.body.parentFirmId ? sanitizeObjectId(req.body.parentFirmId) : null;
    const userId = req.userID;

    // Only owner/admin of the firm being moved can move it
    const firm = await Firm.findOne({ _id: sanitizedId });
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لنقل هذا المكتب', 403);
    }

    // If moving to a parent, validate access to the new parent
    if (sanitizedParentId) {
        const newParent = await Firm.findOne({ _id: sanitizedParentId });
        if (!newParent) {
            throw CustomException('المكتب الأب غير موجود', 404);
        }

        const parentMember = newParent.members.find(m => m.userId.toString() === userId);
        if (!parentMember || !['owner', 'admin'].includes(parentMember.role)) {
            throw CustomException('ليس لديك صلاحية للإضافة إلى هذا المكتب الأب', 403);
        }
    }

    try {
        const updatedFirm = await Firm.moveToParent(sanitizedId, sanitizedParentId, userId);
        res.json({
            success: true,
            message: 'تم نقل المكتب بنجاح',
            data: {
                _id: updatedFirm._id,
                name: updatedFirm.name,
                parentFirmId: updatedFirm.parentFirmId,
                level: updatedFirm.level
            }
        });
    } catch (error) {
        throw CustomException(error.message, 400);
    }
});

/**
 * Get user's accessible companies
 * GET /api/firms/user/accessible
 *
 * Returns all firms the user has access to (via membership or cross-company access)
 */
const getAccessibleCompanies = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // GOLD STANDARD: Use $elemMatch to ensure SAME member matches both userId AND status
    // Without $elemMatch, MongoDB would match if ANY member has userId AND ANY member is active
    const memberFirms = await Firm.find({
        members: {
            $elemMatch: {
                userId: userId,
                status: 'active'
            }
        },
        status: 'active'
    }).select('_id name nameArabic nameEnglish code logo level status industry parentFirmId members').lean();

    // Get the user's role in each firm
    const memberCompanies = memberFirms.map(firm => {
        const member = firm.members.find(m => m.userId.toString() === userId);
        return {
            _id: firm._id,
            name: firm.name,
            nameArabic: firm.nameArabic,
            nameEnglish: firm.nameEnglish,
            code: firm.code,
            logo: firm.logo,
            level: firm.level,
            status: firm.status,
            industry: firm.industry,
            parentFirmId: firm.parentFirmId,
            accessRole: member?.role || 'viewer',
            accessType: 'member',
            isDefault: firm._id.toString() === req.firmId?.toString()
        };
    });

    // Get cross-company access
    const UserCompanyAccess = require('../models/userCompanyAccess.model');
    const crossCompanyAccess = await UserCompanyAccess.getAccessibleCompanies(userId);

    // Filter out firms that are already in memberCompanies
    const memberFirmIds = new Set(memberCompanies.map(f => f._id.toString()));
    const additionalAccess = crossCompanyAccess
        .filter(c => !memberFirmIds.has(c._id.toString()))
        .map(c => ({
            ...c,
            accessType: 'cross-company'
        }));

    const allCompanies = [...memberCompanies, ...additionalAccess];

    res.json({
        success: true,
        data: allCompanies
    });
});

/**
 * Get active company context
 * GET /api/firms/active
 *
 * Returns the user's currently active firm context
 */
const getActiveCompany = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
        // User might be a solo lawyer without firmId
        const user = await User.findById(userId).select('firstName lastName email').lean();
        return res.json({
            success: true,
            data: {
                type: 'solo',
                user
            }
        });
    }

    const firm = await Firm.findById(firmId)
        .select('_id name nameArabic nameEnglish code logo level status industry parentFirmId hierarchySettings members')
        .lean();

    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    // Get user's role in this firm
    const member = firm.members.find(m => m.userId.toString() === userId);

    res.json({
        success: true,
        data: {
            type: 'firm',
            firm: {
                _id: firm._id,
                name: firm.name,
                nameArabic: firm.nameArabic,
                nameEnglish: firm.nameEnglish,
                code: firm.code,
                logo: firm.logo,
                level: firm.level,
                status: firm.status,
                industry: firm.industry,
                parentFirmId: firm.parentFirmId,
                hierarchySettings: firm.hierarchySettings
            },
            role: member?.role || null,
            permissions: member?.permissions || null
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// USER ACCESS CONTROL (Cross-Company Access)
// ═══════════════════════════════════════════════════════════════

/**
 * Grant user access to a company
 * POST /api/firms/:id/access
 *
 * Body: { userId, role, permissions, canAccessChildren, canAccessParent, expiresAt, notes }
 */
const grantUserAccess = asyncHandler(async (req, res) => {
    const sanitizedFirmId = sanitizeObjectId(req.params.id);
    const grantingUserId = req.userID;

    // MASS ASSIGNMENT PROTECTION
    const allowedFields = ['userId', 'role', 'permissions', 'canAccessChildren', 'canAccessParent', 'expiresAt', 'notes'];
    const safeInput = pickAllowedFields(req.body, allowedFields);
    const { userId, role, permissions, canAccessChildren, canAccessParent, expiresAt, notes } = safeInput;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 400);
    }

    // Sanitize target userId
    const sanitizedTargetUserId = sanitizeObjectId(userId);

    // Validate granting user is owner/admin of this firm
    const firm = await Firm.findOne({ _id: sanitizedFirmId, 'members.userId': grantingUserId });
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const grantingMember = firm.members.find(m => m.userId.toString() === grantingUserId);
    if (!grantingMember || !['owner', 'admin'].includes(grantingMember.role)) {
        throw CustomException('ليس لديك صلاحية لمنح الوصول', 403);
    }

    // Validate target user exists (User is in SKIP_MODELS, so findById is OK)
    const targetUser = await User.findById(sanitizedTargetUserId);
    if (!targetUser) {
        throw CustomException('المستخدم غير موجود', 404);
    }

    // Grant access
    const UserCompanyAccess = require('../models/userCompanyAccess.model');
    const access = await UserCompanyAccess.grantAccess(sanitizedTargetUserId, sanitizedFirmId, {
        role: role || 'viewer',
        permissions: permissions || [],
        canAccessChildren: canAccessChildren || false,
        canAccessParent: canAccessParent || false,
        grantedBy: grantingUserId,
        expiresAt,
        notes
    });

    res.status(201).json({
        success: true,
        message: 'تم منح الوصول بنجاح',
        data: access
    });
});

/**
 * Update user access to a company
 * PUT /api/firms/:id/access/:userId
 */
const updateUserAccess = asyncHandler(async (req, res) => {
    const sanitizedFirmId = sanitizeObjectId(req.params.id);
    const sanitizedTargetUserId = sanitizeObjectId(req.params.userId);
    const updatingUserId = req.userID;

    // MASS ASSIGNMENT PROTECTION
    const allowedFields = ['role', 'permissions', 'canAccessChildren', 'canAccessParent', 'isDefault', 'status', 'expiresAt', 'notes'];
    const safeInput = pickAllowedFields(req.body, allowedFields);

    // Validate updating user is owner/admin
    const firm = await Firm.findOne({ _id: sanitizedFirmId, 'members.userId': updatingUserId });
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const updatingMember = firm.members.find(m => m.userId.toString() === updatingUserId);
    if (!updatingMember || !['owner', 'admin'].includes(updatingMember.role)) {
        throw CustomException('ليس لديك صلاحية لتعديل الوصول', 403);
    }

    const UserCompanyAccess = require('../models/userCompanyAccess.model');
    const access = await UserCompanyAccess.updateAccess(sanitizedTargetUserId, sanitizedFirmId, safeInput);

    if (!access) {
        throw CustomException('الوصول غير موجود', 404);
    }

    res.json({
        success: true,
        message: 'تم تحديث الوصول بنجاح',
        data: access
    });
});

/**
 * Revoke user access to a company
 * DELETE /api/firms/:id/access/:userId
 */
const revokeUserAccess = asyncHandler(async (req, res) => {
    const sanitizedFirmId = sanitizeObjectId(req.params.id);
    const sanitizedTargetUserId = sanitizeObjectId(req.params.userId);
    const revokingUserId = req.userID;

    // Validate revoking user is owner/admin
    const firm = await Firm.findOne({ _id: sanitizedFirmId, 'members.userId': revokingUserId });
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    const revokingMember = firm.members.find(m => m.userId.toString() === revokingUserId);
    if (!revokingMember || !['owner', 'admin'].includes(revokingMember.role)) {
        throw CustomException('ليس لديك صلاحية لإلغاء الوصول', 403);
    }

    const UserCompanyAccess = require('../models/userCompanyAccess.model');
    const access = await UserCompanyAccess.revokeAccess(sanitizedTargetUserId, sanitizedFirmId);

    if (!access) {
        throw CustomException('الوصول غير موجود', 404);
    }

    res.json({
        success: true,
        message: 'تم إلغاء الوصول بنجاح'
    });
});

/**
 * Get company access list
 * GET /api/firms/:id/access
 *
 * Returns all users who have cross-company access to this firm
 */
const getCompanyAccessList = asyncHandler(async (req, res) => {
    const sanitizedFirmId = sanitizeObjectId(req.params.id);
    const userId = req.userID;

    // Validate user has access to view this firm's access list
    const firm = await Firm.findOne({ _id: sanitizedFirmId, 'members.userId': userId });
    if (!firm) {
        throw CustomException('المكتب غير موجود أو ليس لديك صلاحية', 404);
    }

    const member = firm.members.find(m => m.userId.toString() === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('ليس لديك صلاحية لعرض قائمة الوصول', 403);
    }

    const UserCompanyAccess = require('../models/userCompanyAccess.model');
    const accessList = await UserCompanyAccess.getCompanyAccessList(sanitizedFirmId);

    res.json({
        success: true,
        data: accessList
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE FIRM
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a firm
 * DELETE /api/firms/:id
 *
 * Only owner can delete. Requires confirmation.
 * Will fail if firm has children companies.
 */
const deleteFirm = asyncHandler(async (req, res) => {
    const sanitizedId = sanitizeObjectId(req.params.id);
    const userId = req.userID;
    const { confirmDelete } = req.body;

    // Validate user is owner (Firm is in SKIP_MODELS)
    const firm = await Firm.findOne({ _id: sanitizedId });
    if (!firm) {
        throw CustomException('المكتب غير موجود', 404);
    }

    if (firm.ownerId.toString() !== userId) {
        throw CustomException('فقط مالك المكتب يمكنه حذفه', 403);
    }

    // Check for children
    const children = await Firm.getChildren(sanitizedId);
    if (children.length > 0) {
        throw CustomException('لا يمكن حذف مكتب لديه فروع. احذف الفروع أولاً أو انقلها', 400);
    }

    // Require confirmation
    if (confirmDelete !== true && confirmDelete !== 'true') {
        throw CustomException('يجب تأكيد الحذف. أرسل confirmDelete: true', 400);
    }

    // Get counts for response (firmId filter is OK - it has firmId in query)
    const clientCount = await Client.countDocuments({ firmId: sanitizedId });
    const caseCount = await Case.countDocuments({ firmId: sanitizedId });
    const invoiceCount = await Invoice.countDocuments({ firmId: sanitizedId });

    // Soft delete - set status to inactive
    firm.status = 'inactive';
    await firm.save();

    // Remove firmId from all members (User is in SKIP_MODELS)
    const memberIds = firm.members.map(m => m.userId);
    await User.updateMany(
        { _id: { $in: memberIds } },
        { $unset: { firmId: 1, firmRole: 1 } }
    );

    // Delete cross-company access (UserCompanyAccess is in SKIP_MODELS)
    const UserCompanyAccess = require('../models/userCompanyAccess.model');
    await UserCompanyAccess.deleteMany({ firmId: sanitizedId });

    res.json({
        success: true,
        message: 'تم حذف المكتب بنجاح',
        data: {
            deletedFirmId: sanitizedId,
            affectedMembers: memberIds.length,
            clientCount,
            caseCount,
            invoiceCount,
            note: 'تم إلغاء تنشيط المكتب. البيانات محفوظة لكنها غير متاحة.'
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
    deleteFirm,

    // Team management (فريق العمل)
    getTeam,
    processDeparture,
    reinstateMember,
    getDepartedMembers,
    getMyPermissions,
    getAvailableRoles,

    // Company hierarchy
    getHierarchyTree,
    getChildCompanies,
    moveCompany,
    getAccessibleCompanies,
    getActiveCompany,

    // User access control
    grantUserAccess,
    updateUserAccess,
    revokeUserAccess,
    getCompanyAccessList,

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
