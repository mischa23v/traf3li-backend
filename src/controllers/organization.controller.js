const { Organization, Client, Contact, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

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

    const orgData = {
        ...req.body,
        lawyerId,
        firmId,
        createdBy: lawyerId
    };

    // Validate required fields - support both legalName and legacy name field
    if (!orgData.legalName && !orgData.name) {
        throw CustomException('الاسم القانوني مطلوب', 400);
    }
    if (!orgData.type) {
        throw CustomException('نوع المنظمة مطلوب', 400);
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
    const countQuery = firmId ? { firmId } : { lawyerId };
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

    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

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

    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    const organization = await Organization.findOne(accessQuery);

    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

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

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            organization[field] = req.body[field];
        }
    });

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

    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

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

    const accessQuery = firmId
        ? { _id: { $in: deleteIds }, firmId }
        : { _id: { $in: deleteIds }, lawyerId };

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

    const query = firmId
        ? { firmId, linkedClients: clientId }
        : { lawyerId, linkedClients: clientId };

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

    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    const organization = await Organization.findOne(accessQuery);
    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const clientQuery = firmId
        ? { _id: clientId, firmId }
        : { _id: clientId, lawyerId };
    const clientExists = await Client.findOne(clientQuery);
    if (!clientExists) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (!organization.linkedClients.includes(clientId)) {
        organization.linkedClients.push(clientId);
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

    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    const organization = await Organization.findOne(accessQuery);
    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const contactQuery = firmId
        ? { _id: contactId, firmId }
        : { _id: contactId, lawyerId };
    const contactExists = await Contact.findOne(contactQuery);
    if (!contactExists) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (!organization.linkedContacts.includes(contactId)) {
        organization.linkedContacts.push(contactId);
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

    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    const organization = await Organization.findOne(accessQuery);
    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const caseQuery = firmId
        ? { _id: caseId, firmId }
        : { _id: caseId, lawyerId };
    const caseExists = await Case.findOne(caseQuery);
    if (!caseExists) {
        throw CustomException('القضية غير موجودة', 404);
    }

    if (!organization.linkedCases.includes(caseId)) {
        organization.linkedCases.push(caseId);
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
