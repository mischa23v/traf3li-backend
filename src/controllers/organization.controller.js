const { Organization, Client, Contact, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId, SENSITIVE_FIELDS } = require('../utils/securityUtils');

/**
 * Create organization
 * POST /api/organizations
 */
const createOrganization = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Define allowed fields (mass assignment protection)
    const allowedFields = [
        'legalName', 'legalNameAr', 'tradeName', 'tradeNameAr', 'name', 'nameAr',
        'type', 'status', 'industry', 'subIndustry', 'size', 'employeeCount',
        'commercialRegistration', 'crIssueDate', 'crExpiryDate', 'crIssuingCity',
        'vatNumber', 'unifiedNumber', 'municipalLicense', 'chamberMembership', 'registrationNumber',
        'phone', 'fax', 'email', 'website',
        'address', 'buildingNumber', 'district', 'city', 'province', 'postalCode', 'country', 'nationalAddress', 'poBox',
        'parentCompany', 'subsidiaries', 'foundedDate',
        'capital', 'annualRevenue', 'creditLimit', 'paymentTerms',
        'bankName', 'iban', 'accountHolderName', 'swiftCode',
        'billingType', 'preferredPaymentMethod', 'billingCycle', 'billingEmail', 'billingContact',
        'conflictCheckStatus', 'conflictNotes', 'conflictCheckDate', 'conflictCheckedBy',
        'keyContacts', 'tags', 'practiceAreas', 'notes', 'description'
    ];

    // SECURITY: Only pick allowed fields (prevents mass assignment attacks)
    const safeOrgData = pickAllowedFields(req.body, allowedFields);

    // Add system-managed fields
    const orgData = {
        ...safeOrgData,
        lawyerId,
        firmId,
        createdBy: lawyerId
    };

    // Input validation - required fields
    if (!orgData.legalName && !orgData.name) {
        throw CustomException('الاسم القانوني مطلوب', 400);
    }
    if (!orgData.type) {
        throw CustomException('نوع المنظمة مطلوب', 400);
    }

    // Input validation - type field validation
    const validTypes = ['individual', 'company', 'organization', 'government', 'other'];
    if (orgData.type && !validTypes.includes(orgData.type)) {
        throw CustomException('نوع المنظمة غير صحيح', 400);
    }

    // Sync legalName and name for backward compatibility
    if (!orgData.legalName && orgData.name) {
        orgData.legalName = orgData.name;
    }

    const organization = await Organization.create(orgData);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء المنظمة بنجاح',
        data: organization
    });
});

/**
 * Get all organizations with filters
 * GET /api/organizations
 */
const getOrganizations = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;
    const {
        type, status, industry, search, conflictCheckStatus, tags,
        page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedPage = parseInt(page) || 1;

    const filters = {
        firmId,
        type,
        status,
        industry,
        search,
        conflictCheckStatus,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        sortBy,
        sortOrder,
        limit: parsedLimit,
        skip: (parsedPage - 1) * parsedLimit
    };

    const organizations = await Organization.getOrganizations(lawyerId, filters);

    // Count query
    const isSoloLawyer = req.isSoloLawyer;
    const countQuery = {};
    if (isSoloLawyer || !firmId) {
        countQuery.lawyerId = lawyerId;
    } else {
        countQuery.firmId = firmId;
    }
    if (type) countQuery.type = type;
    if (status) countQuery.status = status;
    if (industry) countQuery.industry = industry;
    if (conflictCheckStatus) countQuery.conflictCheckStatus = conflictCheckStatus;
    const total = await Organization.countDocuments(countQuery);

    res.json({
        success: true,
        data: organizations,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single organization
 * GET /api/organizations/:id
 */
const getOrganization = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Validate ID format (IDOR protection)
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المنظمة غير صحيح', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const accessQuery = { _id: sanitizedId };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const organization = await Organization.findOne(accessQuery)
        .populate('keyContacts.contactId', 'firstName lastName email phone')
        .populate('billingContact', 'firstName lastName email phone')
        .populate('linkedClients', 'name fullName email phone')
        .populate('linkedContacts', 'firstName lastName email phone')
        .populate('linkedCases', 'title caseNumber status');

    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    res.json({
        success: true,
        data: organization
    });
});

/**
 * Update organization
 * PUT /api/organizations/:id
 */
const updateOrganization = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Validate ID format (IDOR protection)
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المنظمة غير صحيح', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const accessQuery = { _id: sanitizedId };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const organization = await Organization.findOne(accessQuery);

    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    // SECURITY: Define allowed fields for updates (mass assignment protection)
    const allowedFields = [
        'legalName', 'legalNameAr', 'tradeName', 'tradeNameAr', 'name', 'nameAr',
        'type', 'status', 'industry', 'subIndustry', 'size', 'employeeCount',
        'commercialRegistration', 'crIssueDate', 'crExpiryDate', 'crIssuingCity',
        'vatNumber', 'unifiedNumber', 'municipalLicense', 'chamberMembership', 'registrationNumber',
        'phone', 'fax', 'email', 'website',
        'address', 'buildingNumber', 'district', 'city', 'province', 'postalCode', 'country', 'nationalAddress', 'poBox',
        'parentCompany', 'subsidiaries', 'foundedDate',
        'capital', 'annualRevenue', 'creditLimit', 'paymentTerms',
        'bankName', 'iban', 'accountHolderName', 'swiftCode',
        'billingType', 'preferredPaymentMethod', 'billingCycle', 'billingEmail', 'billingContact',
        'conflictCheckStatus', 'conflictNotes', 'conflictCheckDate', 'conflictCheckedBy',
        'keyContacts', 'tags', 'practiceAreas', 'notes', 'description'
    ];

    // SECURITY: Only pick allowed fields (prevents mass assignment attacks)
    const updateData = pickAllowedFields(req.body, allowedFields);

    // Apply safe updates
    Object.assign(organization, updateData);

    // System-managed fields
    organization.updatedBy = lawyerId;
    await organization.save();

    res.json({
        success: true,
        message: 'تم تحديث المنظمة بنجاح',
        data: organization
    });
});

/**
 * Delete organization
 * DELETE /api/organizations/:id
 */
const deleteOrganization = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Validate ID format (IDOR protection)
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المنظمة غير صحيح', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const accessQuery = { _id: sanitizedId };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const organization = await Organization.findOneAndDelete(accessQuery);

    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    res.json({
        success: true,
        message: 'تم حذف المنظمة بنجاح'
    });
});

/**
 * Bulk delete organizations
 * DELETE /api/organizations/bulk
 */
const bulkDeleteOrganizations = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { ids, organizationIds } = req.body;
    const deleteIds = ids || organizationIds; // Support both formats
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!deleteIds || !Array.isArray(deleteIds) || deleteIds.length === 0) {
        throw CustomException('معرفات المنظمات مطلوبة', 400);
    }

    // SECURITY: Validate all IDs format (IDOR protection + input validation)
    const sanitizedIds = deleteIds
        .map(id => sanitizeObjectId(id))
        .filter(id => id !== null);

    if (sanitizedIds.length === 0) {
        throw CustomException('معرفات المنظمات غير صحيحة', 400);
    }

    // Warn if some IDs were invalid
    if (sanitizedIds.length < deleteIds.length) {
        throw CustomException('بعض معرفات المنظمات غير صحيحة', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const accessQuery = { _id: { $in: sanitizedIds } };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const result = await Organization.deleteMany(accessQuery);

    res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} منظمة بنجاح`,
        count: result.deletedCount
    });
});

/**
 * Search organizations (autocomplete)
 * GET /api/organizations/search
 */
const searchOrganizations = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { q, limit = 10 } = req.query;
    const lawyerId = req.userID;

    if (!q || q.length < 2) {
        throw CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
    }

    const organizations = await Organization.searchOrganizations(lawyerId, q, {
        limit: Math.min(parseInt(limit) || 10, 50)
    });

    res.json({
        success: true,
        data: organizations,
        count: organizations.length
    });
});

/**
 * Get organizations by client
 * GET /api/organizations/client/:clientId
 */
const getOrganizationsByClient = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Validate clientId format (IDOR protection)
    const sanitizedClientId = sanitizeObjectId(clientId);
    if (!sanitizedClientId) {
        throw CustomException('معرف العميل غير صحيح', 400);
    }

    // SECURITY: Verify client belongs to the user/firm (IDOR protection)
    const isSoloLawyer = req.isSoloLawyer;
    const clientQuery = { _id: sanitizedClientId };
    if (isSoloLawyer || !firmId) {
        clientQuery.lawyerId = lawyerId;
    } else {
        clientQuery.firmId = firmId;
    }

    const clientExists = await Client.findOne(clientQuery);
    if (!clientExists) {
        throw CustomException('العميل غير موجود أو ليس لديك صلاحية للوصول إليه', 404);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const query = { linkedClients: sanitizedClientId };
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    const organizations = await Organization.find(query).sort({ createdAt: -1 });

    res.json({
        success: true,
        data: organizations
    });
});

/**
 * Link organization to client
 * POST /api/organizations/:id/link-client
 */
const linkToClient = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const { clientId } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Input validation - required fields
    if (!clientId) {
        throw CustomException('معرف العميل مطلوب', 400);
    }

    // SECURITY: Validate IDs format (IDOR protection + input validation)
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المنظمة غير صحيح', 400);
    }

    const sanitizedClientId = sanitizeObjectId(clientId);
    if (!sanitizedClientId) {
        throw CustomException('معرف العميل غير صحيح', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const accessQuery = { _id: sanitizedId };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const organization = await Organization.findOne(accessQuery);
    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const isSoloLawyer2 = req.isSoloLawyer;
    const clientQuery = { _id: sanitizedClientId };
    if (isSoloLawyer2 || !firmId) {
        clientQuery.lawyerId = lawyerId;
    } else {
        clientQuery.firmId = firmId;
    }
    const clientExists = await Client.findOne(clientQuery);
    if (!clientExists) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (!organization.linkedClients.includes(sanitizedClientId)) {
        organization.linkedClients.push(sanitizedClientId);
        await organization.save();
    }

    res.json({
        success: true,
        message: 'تم ربط المنظمة بالعميل بنجاح',
        data: organization
    });
});

/**
 * Link organization to contact
 * POST /api/organizations/:id/link-contact
 */
const linkToContact = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const { contactId } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Input validation - required fields
    if (!contactId) {
        throw CustomException('معرف جهة الاتصال مطلوب', 400);
    }

    // SECURITY: Validate IDs format (IDOR protection + input validation)
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المنظمة غير صحيح', 400);
    }

    const sanitizedContactId = sanitizeObjectId(contactId);
    if (!sanitizedContactId) {
        throw CustomException('معرف جهة الاتصال غير صحيح', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const accessQuery = { _id: sanitizedId };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const organization = await Organization.findOne(accessQuery);
    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const isSoloLawyer2 = req.isSoloLawyer;
    const contactQuery = { _id: sanitizedContactId };
    if (isSoloLawyer2 || !firmId) {
        contactQuery.lawyerId = lawyerId;
    } else {
        contactQuery.firmId = firmId;
    }
    const contactExists = await Contact.findOne(contactQuery);
    if (!contactExists) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (!organization.linkedContacts.includes(sanitizedContactId)) {
        organization.linkedContacts.push(sanitizedContactId);
        await organization.save();
    }

    res.json({
        success: true,
        message: 'تم ربط المنظمة بجهة الاتصال بنجاح',
        data: organization
    });
});

/**
 * Link organization to case
 * POST /api/organizations/:id/link-case
 */
const linkToCase = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const { caseId } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Input validation - required fields
    if (!caseId) {
        throw CustomException('معرف القضية مطلوب', 400);
    }

    // SECURITY: Validate IDs format (IDOR protection + input validation)
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف المنظمة غير صحيح', 400);
    }

    const sanitizedCaseId = sanitizeObjectId(caseId);
    if (!sanitizedCaseId) {
        throw CustomException('معرف القضية غير صحيح', 400);
    }

    const isSoloLawyer = req.isSoloLawyer;
    const accessQuery = { _id: sanitizedId };
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    const organization = await Organization.findOne(accessQuery);
    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const isSoloLawyer2 = req.isSoloLawyer;
    const caseQuery = { _id: sanitizedCaseId };
    if (isSoloLawyer2 || !firmId) {
        caseQuery.lawyerId = lawyerId;
    } else {
        caseQuery.firmId = firmId;
    }
    const caseExists = await Case.findOne(caseQuery);
    if (!caseExists) {
        throw CustomException('القضية غير موجودة', 404);
    }

    if (!organization.linkedCases.includes(sanitizedCaseId)) {
        organization.linkedCases.push(sanitizedCaseId);
        await organization.save();
    }

    res.json({
        success: true,
        message: 'تم ربط المنظمة بالقضية بنجاح',
        data: organization
    });
});

module.exports = {
    createOrganization,
    getOrganizations,
    getOrganization,
    updateOrganization,
    deleteOrganization,
    bulkDeleteOrganizations,
    searchOrganizations,
    getOrganizationsByClient,
    linkToClient,
    linkToContact,
    linkToCase
};
