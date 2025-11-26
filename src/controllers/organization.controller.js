const { Organization, Client } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');

/**
 * Create organization
 * POST /api/organizations
 */
const createOrganization = asyncHandler(async (req, res) => {
    const {
        name,
        nameAr,
        type,
        registrationNumber,
        vatNumber,
        phone,
        fax,
        email,
        website,
        address,
        city,
        postalCode,
        country,
        industry,
        size,
        notes,
        linkedClients,
        linkedContacts,
        linkedCases,
        status = 'active'
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!name) {
        throw new CustomException('اسم المنظمة مطلوب', 400);
    }

    const organization = await Organization.create({
        lawyerId,
        name,
        nameAr,
        type,
        registrationNumber,
        vatNumber,
        phone,
        fax,
        email,
        website,
        address,
        city,
        postalCode,
        country,
        industry,
        size,
        notes,
        linkedClients,
        linkedContacts,
        linkedCases,
        status
    });

    res.status(201).json({
        data: organization,
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Get organizations with filters
 * GET /api/organizations
 */
const getOrganizations = asyncHandler(async (req, res) => {
    const {
        type,
        status,
        search,
        page = 1,
        limit = 10
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (type) query.type = type;
    if (status) query.status = status;

    // Search by name, email, phone
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { nameAr: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { registrationNumber: { $regex: search, $options: 'i' } }
        ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [organizations, total] = await Promise.all([
        Organization.find(query)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum),
        Organization.countDocuments(query)
    ]);

    res.status(200).json({
        data: organizations,
        total,
        page: pageNum,
        limit: limitNum
    });
});

/**
 * Get single organization
 * GET /api/organizations/:id
 */
const getOrganization = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const organization = await Organization.findById(id)
        .populate('linkedClients', 'fullName clientId status')
        .populate('linkedContacts', 'firstName lastName email phone')
        .populate('linkedCases', 'title caseNumber status');

    if (!organization) {
        throw new CustomException('المنظمة غير موجودة', 404);
    }

    if (organization.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه المنظمة', 403);
    }

    res.status(200).json({
        data: [organization],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Update organization
 * PATCH /api/organizations/:id
 */
const updateOrganization = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const organization = await Organization.findById(id);

    if (!organization) {
        throw new CustomException('المنظمة غير موجودة', 404);
    }

    if (organization.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه المنظمة', 403);
    }

    const allowedFields = [
        'name',
        'nameAr',
        'type',
        'registrationNumber',
        'vatNumber',
        'phone',
        'fax',
        'email',
        'website',
        'address',
        'city',
        'postalCode',
        'country',
        'industry',
        'size',
        'notes',
        'linkedClients',
        'linkedContacts',
        'linkedCases',
        'status'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            organization[field] = req.body[field];
        }
    });

    await organization.save();

    res.status(200).json({
        data: [organization],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Delete organization
 * DELETE /api/organizations/:id
 */
const deleteOrganization = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const organization = await Organization.findById(id);

    if (!organization) {
        throw new CustomException('المنظمة غير موجودة', 404);
    }

    if (organization.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذه المنظمة', 403);
    }

    await Organization.findByIdAndDelete(id);

    res.status(200).json({
        data: [],
        total: 0,
        page: 1,
        limit: 1
    });
});

/**
 * Bulk delete organizations
 * POST /api/organizations/bulk-delete
 */
const bulkDeleteOrganizations = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException('معرفات المنظمات مطلوبة', 400);
    }

    // Verify all organizations belong to lawyer
    const organizations = await Organization.find({
        _id: { $in: ids },
        lawyerId
    });

    if (organizations.length !== ids.length) {
        throw new CustomException('بعض المنظمات غير صالحة للحذف', 400);
    }

    await Organization.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
        data: [],
        total: organizations.length,
        page: 1,
        limit: organizations.length
    });
});

/**
 * Search organizations
 * GET /api/organizations/search
 */
const searchOrganizations = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const lawyerId = req.userID;

    if (!q || q.length < 1) {
        return res.status(200).json({
            data: [],
            total: 0,
            page: 1,
            limit: 20
        });
    }

    const organizations = await Organization.searchOrganizations(lawyerId, q, 20);

    res.status(200).json({
        data: organizations,
        total: organizations.length,
        page: 1,
        limit: 20
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
    });

    res.status(200).json({
        data: organizations,
        total: organizations.length,
        page: 1,
        limit: organizations.length
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
    getOrganizationsByClient
};
