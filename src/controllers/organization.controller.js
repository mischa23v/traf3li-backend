const { Organization, Client, Contact, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create organization
 * POST /api/organizations
 */
const createOrganization = asyncHandler(async (req, res) => {
    const {
        name, nameAr, type, registrationNumber, vatNumber,
        phone, fax, email, website, address, city,
        postalCode, country, industry, size, notes
    } = req.body;
    const lawyerId = req.userID;

    if (!name || !type) {
        throw CustomException('اسم المنظمة ونوعها مطلوبان', 400);
    }

    const organization = await Organization.create({
        lawyerId,
        name: name.trim(),
        nameAr: nameAr?.trim(),
        type,
        registrationNumber: registrationNumber?.trim(),
        vatNumber: vatNumber?.trim(),
        phone: phone?.trim(),
        fax: fax?.trim(),
        email: email?.trim().toLowerCase(),
        website: website?.trim(),
        address: address?.trim(),
        city: city?.trim(),
        postalCode: postalCode?.trim(),
        country: country || 'Saudi Arabia',
        industry: industry?.trim(),
        size,
        notes
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء المنظمة بنجاح',
        data: organization
    });
});

/**
 * Get all organizations
 * GET /api/organizations
 */
const getOrganizations = asyncHandler(async (req, res) => {
    const {
        type, status, search, city,
        page = 1, limit = 50
    } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };

    if (type) query.type = type;
    if (status) query.status = status;
    if (city) query.city = city;

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { nameAr: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { registrationNumber: { $regex: search, $options: 'i' } }
        ];
    }

    const organizations = await Organization.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Organization.countDocuments(query);

    res.status(200).json({
        success: true,
        data: organizations,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single organization
 * GET /api/organizations/:id
 */
const getOrganization = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const organization = await Organization.findOne({ _id: id, lawyerId })
        .populate('linkedClients', 'name fullName email phone')
        .populate('linkedContacts', 'firstName lastName email phone')
        .populate('linkedCases', 'title caseNumber status');

    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        data: organization
    });
});

/**
 * Update organization
 * PATCH /api/organizations/:id
 */
const updateOrganization = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const organization = await Organization.findOne({ _id: id, lawyerId });

    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const allowedFields = [
        'name', 'nameAr', 'type', 'registrationNumber', 'vatNumber',
        'phone', 'fax', 'email', 'website', 'address', 'city',
        'postalCode', 'country', 'industry', 'size', 'notes', 'status'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            organization[field] = req.body[field];
        }
    });

    await organization.save();

    res.status(200).json({
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const organization = await Organization.findOneAndDelete({ _id: id, lawyerId });

    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف المنظمة بنجاح'
    });
});

/**
 * Bulk delete organizations
 * POST /api/organizations/bulk-delete
 */
const bulkDeleteOrganizations = asyncHandler(async (req, res) => {
    const { organizationIds } = req.body;
    const lawyerId = req.userID;

    if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
        throw CustomException('معرفات المنظمات مطلوبة', 400);
    }

    const result = await Organization.deleteMany({
        _id: { $in: organizationIds },
        lawyerId
    });

    res.status(200).json({
        success: true,
        message: `تم حذف ${result.deletedCount} منظمة بنجاح`,
        count: result.deletedCount
    });
});

/**
 * Search organizations
 * GET /api/organizations/search
 */
const searchOrganizations = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const lawyerId = req.userID;

    if (!q || q.length < 2) {
        throw CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
    }

    const organizations = await Organization.searchOrganizations(lawyerId, q);

    res.status(200).json({
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

    const organizations = await Organization.find({
        lawyerId,
        linkedClients: clientId
    }).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: organizations
    });
});

/**
 * Link organization to client
 * POST /api/organizations/:id/link-client
 */
const linkToClient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req.body;
    const lawyerId = req.userID;

    const organization = await Organization.findOne({ _id: id, lawyerId });
    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const clientExists = await Client.findOne({ _id: clientId, lawyerId });
    if (!clientExists) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (!organization.linkedClients.includes(clientId)) {
        organization.linkedClients.push(clientId);
        await organization.save();
    }

    res.status(200).json({
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
    const { id } = req.params;
    const { contactId } = req.body;
    const lawyerId = req.userID;

    const organization = await Organization.findOne({ _id: id, lawyerId });
    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const contactExists = await Contact.findOne({ _id: contactId, lawyerId });
    if (!contactExists) {
        throw CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (!organization.linkedContacts.includes(contactId)) {
        organization.linkedContacts.push(contactId);
        await organization.save();
    }

    res.status(200).json({
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
    const { id } = req.params;
    const { caseId } = req.body;
    const lawyerId = req.userID;

    const organization = await Organization.findOne({ _id: id, lawyerId });
    if (!organization) {
        throw CustomException('المنظمة غير موجودة', 404);
    }

    const caseExists = await Case.findOne({ _id: caseId, lawyerId });
    if (!caseExists) {
        throw CustomException('القضية غير موجودة', 404);
    }

    if (!organization.linkedCases.includes(caseId)) {
        organization.linkedCases.push(caseId);
        await organization.save();
    }

    res.status(200).json({
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
