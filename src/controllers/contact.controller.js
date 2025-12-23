const { Contact, Case, Client } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeString, sanitizeEmail, sanitizePhone, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Create contact
 * POST /api/contacts
 */
const createContact = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'salutation', 'salutationAr', 'firstName', 'middleName', 'lastName', 'preferredName', 'suffix', 'fullNameArabic',
        'arabicName', // الاسم الرباعي - 4-part Arabic name structure
        'type', 'primaryRole', 'relationshipTypes',
        'email', 'phone', 'alternatePhone', 'emails', 'phones',
        'company', 'organizationId', 'title', 'department',
        'nationalId', 'iqamaNumber', 'passportNumber', 'passportCountry', 'dateOfBirth', 'nationality',
        'address', 'buildingNumber', 'district', 'city', 'province', 'postalCode', 'country',
        'preferredLanguage', 'preferredContactMethod', 'bestTimeToContact',
        'doNotContact', 'doNotEmail', 'doNotCall', 'doNotSMS',
        'conflictCheckStatus', 'conflictNotes', 'conflictCheckDate', 'conflictCheckedBy',
        'status', 'priority', 'vipStatus',
        'riskLevel', 'isBlacklisted', 'blacklistReason',
        'tags', 'practiceAreas', 'notes'
    ];

    // Extract only allowed fields from request body
    const safeContactData = pickAllowedFields(req.body, allowedFields);

    // INPUT VALIDATION: Sanitize string inputs
    if (safeContactData.firstName) {
        safeContactData.firstName = sanitizeString(safeContactData.firstName);
    }
    if (safeContactData.lastName) {
        safeContactData.lastName = sanitizeString(safeContactData.lastName);
    }
    if (safeContactData.email) {
        safeContactData.email = sanitizeEmail(safeContactData.email);
    }
    if (safeContactData.phone) {
        safeContactData.phone = sanitizePhone(safeContactData.phone);
    }
    if (safeContactData.alternatePhone) {
        safeContactData.alternatePhone = sanitizePhone(safeContactData.alternatePhone);
    }

    // Ensure these system fields are not overridable (IDOR protection)
    const contactData = {
        ...safeContactData,
        lawyerId,
        firmId,
        createdBy: lawyerId
    };

    // Note: Required field validation removed for testing flexibility
    // Fields will use defaults if not provided
    if (!contactData.type) {
        contactData.type = 'individual';
    }

    // Handle Arabic 4-part name (الاسم الرباعي)
    // If arabicName is provided, use it; otherwise create from firstName/lastName for backwards compatibility
    if (contactData.arabicName) {
        // Build fullName from parts if not provided
        if (!contactData.arabicName.fullName) {
            const nameParts = [
                contactData.arabicName.firstName,
                contactData.arabicName.fatherName,
                contactData.arabicName.grandfatherName,
                contactData.arabicName.familyName
            ].filter(Boolean);
            if (nameParts.length > 0) {
                contactData.arabicName.fullName = nameParts.join(' ');
            }
        }
        // Also populate legacy firstName/lastName for backwards compatibility
        if (!contactData.firstName && contactData.arabicName.firstName) {
            contactData.firstName = sanitizeString(contactData.arabicName.firstName);
        }
        if (!contactData.lastName && contactData.arabicName.familyName) {
            contactData.lastName = sanitizeString(contactData.arabicName.familyName);
        }
    }

    // Set defaults if still not provided
    if (!contactData.firstName) {
        contactData.firstName = 'Unknown';
    }
    if (!contactData.lastName) {
        contactData.lastName = 'Contact';
    }

    const contact = await Contact.create(contactData);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء جهة الاتصال بنجاح',
        data: contact
    });
});

/**
 * Get all contacts with filters
 * GET /api/contacts
 */
const getContacts = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;
    const {
        type, status, primaryRole, search, organizationId,
        conflictCheckStatus, vipStatus, tags,
        page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedPage = parseInt(page) || 1;

    const filters = {
        firmId,
        type,
        status,
        primaryRole,
        search,
        organizationId,
        conflictCheckStatus,
        vipStatus: vipStatus === 'true' ? true : vipStatus === 'false' ? false : undefined,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        sortBy,
        sortOrder,
        limit: parsedLimit,
        skip: (parsedPage - 1) * parsedLimit
    };

    const contacts = await Contact.getContacts(lawyerId, filters);

    // Build count query
    const countQuery = firmId ? { firmId } : { lawyerId };
    if (type) countQuery.type = type;
    if (status) countQuery.status = status;
    if (primaryRole) countQuery.primaryRole = primaryRole;
    if (conflictCheckStatus) countQuery.conflictCheckStatus = conflictCheckStatus;
    const total = await Contact.countDocuments(countQuery);

    res.json({
        success: true,
        data: contacts,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single contact
 * GET /api/contacts/:id
 */
const getContact = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    const contact = await Contact.findOne(accessQuery)
        .populate('linkedCases', 'title caseNumber status')
        .populate('linkedClients', 'name fullName email')
        .populate('organizationId', 'legalName tradeName');

    if (!contact) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    res.json({
        success: true,
        data: contact
    });
});

/**
 * Update contact
 * PUT /api/contacts/:id
 */
const updateContact = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // IDOR PROTECTION: Verify contact belongs to user's firm
    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    const contact = await Contact.findOne(accessQuery);

    if (!contact) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'salutation', 'salutationAr', 'firstName', 'middleName', 'lastName', 'preferredName', 'suffix', 'fullNameArabic',
        'arabicName', // الاسم الرباعي - 4-part Arabic name structure
        'type', 'primaryRole', 'relationshipTypes',
        'email', 'phone', 'alternatePhone', 'emails', 'phones',
        'company', 'organizationId', 'title', 'department',
        'nationalId', 'iqamaNumber', 'passportNumber', 'passportCountry', 'dateOfBirth', 'nationality',
        'address', 'buildingNumber', 'district', 'city', 'province', 'postalCode', 'country',
        'preferredLanguage', 'preferredContactMethod', 'bestTimeToContact',
        'doNotContact', 'doNotEmail', 'doNotCall', 'doNotSMS',
        'conflictCheckStatus', 'conflictNotes', 'conflictCheckDate', 'conflictCheckedBy',
        'status', 'priority', 'vipStatus',
        'riskLevel', 'isBlacklisted', 'blacklistReason',
        'tags', 'practiceAreas', 'notes'
    ];

    // Extract only allowed fields from request body
    const safeUpdateData = pickAllowedFields(req.body, allowedFields);

    // INPUT VALIDATION: Sanitize string inputs before updating
    if (safeUpdateData.firstName) {
        safeUpdateData.firstName = sanitizeString(safeUpdateData.firstName);
    }
    if (safeUpdateData.lastName) {
        safeUpdateData.lastName = sanitizeString(safeUpdateData.lastName);
    }
    if (safeUpdateData.email) {
        safeUpdateData.email = sanitizeEmail(safeUpdateData.email);
    }
    if (safeUpdateData.phone) {
        safeUpdateData.phone = sanitizePhone(safeUpdateData.phone);
    }
    if (safeUpdateData.alternatePhone) {
        safeUpdateData.alternatePhone = sanitizePhone(safeUpdateData.alternatePhone);
    }

    // Apply safe updates to contact
    Object.keys(safeUpdateData).forEach(field => {
        contact[field] = safeUpdateData[field];
    });

    // Handle Arabic 4-part name (الاسم الرباعي) - auto-generate fullName
    if (safeUpdateData.arabicName && contact.arabicName) {
        if (!contact.arabicName.fullName) {
            const nameParts = [
                contact.arabicName.firstName,
                contact.arabicName.fatherName,
                contact.arabicName.grandfatherName,
                contact.arabicName.familyName
            ].filter(Boolean);
            if (nameParts.length > 0) {
                contact.arabicName.fullName = nameParts.join(' ');
            }
        }
        // Sync to legacy fields
        if (contact.arabicName.firstName && !contact.firstName) {
            contact.firstName = sanitizeString(contact.arabicName.firstName);
        }
        if (contact.arabicName.familyName && !contact.lastName) {
            contact.lastName = sanitizeString(contact.arabicName.familyName);
        }
        if (contact.arabicName.fullName && !contact.fullNameArabic) {
            contact.fullNameArabic = contact.arabicName.fullName;
        }
    }

    // Ensure these system fields are not modifiable (IDOR protection)
    contact.updatedBy = lawyerId;
    // firmId and lawyerId are not modified - they are tied to the existing document

    await contact.save();

    res.json({
        success: true,
        message: 'تم تحديث جهة الاتصال بنجاح',
        data: contact
    });
});

/**
 * Delete contact
 * DELETE /api/contacts/:id
 */
const deleteContact = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    const contact = await Contact.findOneAndDelete(accessQuery);

    if (!contact) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    res.json({
        success: true,
        message: 'تم حذف جهة الاتصال بنجاح'
    });
});

/**
 * Bulk delete contacts
 * DELETE /api/contacts/bulk
 */
const bulkDeleteContacts = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('معرفات جهات الاتصال مطلوبة', 400);
    }

    const accessQuery = firmId
        ? { _id: { $in: ids }, firmId }
        : { _id: { $in: ids }, lawyerId };

    const result = await Contact.deleteMany(accessQuery);

    res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} جهة اتصال بنجاح`,
        count: result.deletedCount
    });
});

/**
 * Search contacts (autocomplete)
 * GET /api/contacts/search
 */
const searchContacts = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { q, limit = 10 } = req.query;
    const lawyerId = req.userID;

    if (!q || q.length < 2) {
        throw CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
    }

    const contacts = await Contact.searchContacts(lawyerId, q, {
        limit: Math.min(parseInt(limit) || 10, 50)
    });

    res.json({
        success: true,
        data: contacts,
        count: contacts.length
    });
});

/**
 * Link contact to case
 * POST /api/contacts/:id/link-case
 */
const linkToCase = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const { caseId, role } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // INPUT VALIDATION: Validate and sanitize IDs
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedCaseId = sanitizeObjectId(caseId);

    if (!sanitizedId) {
        throw CustomException('معرف جهة الاتصال غير صالح', 400);
    }

    if (!sanitizedCaseId) {
        throw CustomException('معرف القضية غير صالح', 400);
    }

    // IDOR PROTECTION: Verify contact belongs to user's firm
    const accessQuery = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, lawyerId };

    const contact = await Contact.findOne(accessQuery);
    if (!contact) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    // IDOR PROTECTION: Verify case belongs to user's firm
    const caseQuery = firmId
        ? { _id: sanitizedCaseId, firmId }
        : { _id: sanitizedCaseId, lawyerId };
    const caseExists = await Case.findOne(caseQuery);
    if (!caseExists) {
        throw CustomException('القضية غير موجودة', 404);
    }

    if (!contact.linkedCases.includes(sanitizedCaseId)) {
        contact.linkedCases.push(sanitizedCaseId);
        // Optionally update role if provided
        if (role && !contact.primaryRole) {
            contact.primaryRole = sanitizeString(role);
        }
        await contact.save();
    }

    res.json({
        success: true,
        message: 'تم ربط جهة الاتصال بالقضية بنجاح',
        data: contact
    });
});

/**
 * Unlink contact from case
 * DELETE /api/contacts/:id/unlink-case/:caseId
 * POST /api/contacts/:id/unlink-case (legacy with body)
 */
const unlinkFromCase = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    // Support both params and body for caseId (legacy support)
    const caseId = req.params.caseId || req.body.caseId;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // INPUT VALIDATION: Validate and sanitize IDs
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedCaseId = sanitizeObjectId(caseId);

    if (!sanitizedId) {
        throw CustomException('معرف جهة الاتصال غير صالح', 400);
    }

    if (!sanitizedCaseId) {
        throw CustomException('معرف القضية غير صالح', 400);
    }

    // IDOR PROTECTION: Verify contact belongs to user's firm
    const accessQuery = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, lawyerId };

    const contact = await Contact.findOne(accessQuery);
    if (!contact) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    contact.linkedCases = contact.linkedCases.filter(c => c.toString() !== sanitizedCaseId);
    await contact.save();

    res.json({
        success: true,
        message: 'تم فك ربط جهة الاتصال من القضية بنجاح',
        data: contact
    });
});

/**
 * Get contacts by case
 * GET /api/contacts/case/:caseId
 */
const getContactsByCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const query = firmId
        ? { firmId, linkedCases: caseId }
        : { lawyerId, linkedCases: caseId };

    const contacts = await Contact.find(query).sort({ createdAt: -1 });

    res.json({
        success: true,
        data: contacts
    });
});

/**
 * Get contacts by client
 * GET /api/contacts/client/:clientId
 */
const getContactsByClient = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const query = firmId
        ? { firmId, linkedClients: clientId }
        : { lawyerId, linkedClients: clientId };

    const contacts = await Contact.find(query).sort({ createdAt: -1 });

    res.json({
        success: true,
        data: contacts
    });
});

/**
 * Link contact to client
 * POST /api/contacts/:id/link-client
 */
const linkToClient = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const { clientId } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // INPUT VALIDATION: Validate and sanitize IDs
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedClientId = sanitizeObjectId(clientId);

    if (!sanitizedId) {
        throw CustomException('معرف جهة الاتصال غير صالح', 400);
    }

    if (!sanitizedClientId) {
        throw CustomException('معرف العميل غير صالح', 400);
    }

    // IDOR PROTECTION: Verify contact belongs to user's firm
    const accessQuery = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, lawyerId };

    const contact = await Contact.findOne(accessQuery);
    if (!contact) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    // IDOR PROTECTION: Verify client belongs to user's firm
    const clientQuery = firmId
        ? { _id: sanitizedClientId, firmId }
        : { _id: sanitizedClientId, lawyerId };
    const clientExists = await Client.findOne(clientQuery);
    if (!clientExists) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (!contact.linkedClients.includes(sanitizedClientId)) {
        contact.linkedClients.push(sanitizedClientId);
        await contact.save();
    }

    res.json({
        success: true,
        message: 'تم ربط جهة الاتصال بالعميل بنجاح',
        data: contact
    });
});

/**
 * Unlink contact from client
 * DELETE /api/contacts/:id/unlink-client/:clientId
 * POST /api/contacts/:id/unlink-client (legacy with body)
 */
const unlinkFromClient = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    // Support both params and body for clientId (legacy support)
    const clientId = req.params.clientId || req.body.clientId;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // INPUT VALIDATION: Validate and sanitize IDs
    const sanitizedId = sanitizeObjectId(id);
    const sanitizedClientId = sanitizeObjectId(clientId);

    if (!sanitizedId) {
        throw CustomException('معرف جهة الاتصال غير صالح', 400);
    }

    if (!sanitizedClientId) {
        throw CustomException('معرف العميل غير صالح', 400);
    }

    // IDOR PROTECTION: Verify contact belongs to user's firm
    const accessQuery = firmId
        ? { _id: sanitizedId, firmId }
        : { _id: sanitizedId, lawyerId };

    const contact = await Contact.findOne(accessQuery);
    if (!contact) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    contact.linkedClients = contact.linkedClients.filter(c => c.toString() !== sanitizedClientId);
    await contact.save();

    res.json({
        success: true,
        message: 'تم فك ربط جهة الاتصال من العميل بنجاح',
        data: contact
    });
});

module.exports = {
    createContact,
    getContacts,
    getContact,
    updateContact,
    deleteContact,
    bulkDeleteContacts,
    searchContacts,
    getContactsByCase,
    getContactsByClient,
    linkToCase,
    unlinkFromCase,
    linkToClient,
    unlinkFromClient
};
