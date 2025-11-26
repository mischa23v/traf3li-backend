const { Contact, Case, Client } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');

/**
 * Create contact
 * POST /api/contacts
 */
const createContact = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        phone,
        alternatePhone,
        title,
        company,
        type,
        category,
        address,
        city,
        postalCode,
        country,
        notes,
        tags,
        linkedCases,
        linkedClients,
        status = 'active'
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!firstName || !lastName) {
        throw new CustomException('الحقول المطلوبة: الاسم الأول، الاسم الأخير', 400);
    }

    const contact = await Contact.create({
        lawyerId,
        firstName,
        lastName,
        email,
        phone,
        alternatePhone,
        title,
        company,
        type,
        category,
        address,
        city,
        postalCode,
        country,
        notes,
        tags,
        linkedCases,
        linkedClients,
        status
    });

    res.status(201).json({
        data: contact,
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Get contacts with filters
 * GET /api/contacts
 */
const getContacts = asyncHandler(async (req, res) => {
    const {
        type,
        category,
        status,
        search,
        page = 1,
        limit = 10
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    // Search by name, email, phone
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } }
        ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [contacts, total] = await Promise.all([
        Contact.find(query)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum),
        Contact.countDocuments(query)
    ]);

    res.status(200).json({
        data: contacts,
        total,
        page: pageNum,
        limit: limitNum
    });
});

/**
 * Get single contact
 * GET /api/contacts/:id
 */
const getContact = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const contact = await Contact.findById(id)
        .populate('linkedCases', 'title caseNumber status')
        .populate('linkedClients', 'fullName clientId status');

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (contact.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى جهة الاتصال هذه', 403);
    }

    res.status(200).json({
        data: [contact],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Update contact
 * PATCH /api/contacts/:id
 */
const updateContact = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const contact = await Contact.findById(id);

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (contact.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى جهة الاتصال هذه', 403);
    }

    const allowedFields = [
        'firstName',
        'lastName',
        'email',
        'phone',
        'alternatePhone',
        'title',
        'company',
        'type',
        'category',
        'address',
        'city',
        'postalCode',
        'country',
        'notes',
        'tags',
        'linkedCases',
        'linkedClients',
        'status'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            contact[field] = req.body[field];
        }
    });

    await contact.save();

    res.status(200).json({
        data: [contact],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Delete contact
 * DELETE /api/contacts/:id
 */
const deleteContact = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const contact = await Contact.findById(id);

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (contact.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى جهة الاتصال هذه', 403);
    }

    await Contact.findByIdAndDelete(id);

    res.status(200).json({
        data: [],
        total: 0,
        page: 1,
        limit: 1
    });
});

/**
 * Bulk delete contacts
 * POST /api/contacts/bulk-delete
 */
const bulkDeleteContacts = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException('معرفات جهات الاتصال مطلوبة', 400);
    }

    // Verify all contacts belong to lawyer
    const contacts = await Contact.find({
        _id: { $in: ids },
        lawyerId
    });

    if (contacts.length !== ids.length) {
        throw new CustomException('بعض جهات الاتصال غير صالحة للحذف', 400);
    }

    await Contact.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
        data: [],
        total: contacts.length,
        page: 1,
        limit: contacts.length
    });
});

/**
 * Search contacts
 * GET /api/contacts/search
 */
const searchContacts = asyncHandler(async (req, res) => {
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

    const contacts = await Contact.searchContacts(lawyerId, q, 20);

    res.status(200).json({
        data: contacts,
        total: contacts.length,
        page: 1,
        limit: 20
    });
});

/**
 * Get contacts by case
 * GET /api/contacts/case/:caseId
 */
const getContactsByCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const lawyerId = req.userID;

    const contacts = await Contact.find({
        lawyerId,
        linkedCases: caseId
    });

    res.status(200).json({
        data: contacts,
        total: contacts.length,
        page: 1,
        limit: contacts.length
    });
});

/**
 * Get contacts by client
 * GET /api/contacts/client/:clientId
 */
const getContactsByClient = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const lawyerId = req.userID;

    const contacts = await Contact.find({
        lawyerId,
        linkedClients: clientId
    });

    res.status(200).json({
        data: contacts,
        total: contacts.length,
        page: 1,
        limit: contacts.length
    });
});

/**
 * Link contact to case
 * POST /api/contacts/:id/link-case
 */
const linkContactToCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { caseId } = req.body;
    const lawyerId = req.userID;

    if (!caseId) {
        throw new CustomException('معرف القضية مطلوب', 400);
    }

    const contact = await Contact.findById(id);

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (contact.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى جهة الاتصال هذه', 403);
    }

    // Verify case exists and belongs to lawyer
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc || caseDoc.lawyerId.toString() !== lawyerId) {
        throw new CustomException('القضية غير موجودة أو لا يمكنك الوصول إليها', 404);
    }

    // Add case to linked cases if not already linked
    if (!contact.linkedCases.includes(caseId)) {
        contact.linkedCases.push(caseId);
        await contact.save();
    }

    res.status(200).json({
        data: [contact],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Unlink contact from case
 * POST /api/contacts/:id/unlink-case
 */
const unlinkContactFromCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { caseId } = req.body;
    const lawyerId = req.userID;

    if (!caseId) {
        throw new CustomException('معرف القضية مطلوب', 400);
    }

    const contact = await Contact.findById(id);

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (contact.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى جهة الاتصال هذه', 403);
    }

    contact.linkedCases = contact.linkedCases.filter(
        c => c.toString() !== caseId
    );
    await contact.save();

    res.status(200).json({
        data: [contact],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Link contact to client
 * POST /api/contacts/:id/link-client
 */
const linkContactToClient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req.body;
    const lawyerId = req.userID;

    if (!clientId) {
        throw new CustomException('معرف العميل مطلوب', 400);
    }

    const contact = await Contact.findById(id);

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (contact.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى جهة الاتصال هذه', 403);
    }

    // Verify client exists and belongs to lawyer
    const client = await Client.findById(clientId);
    if (!client || client.lawyerId.toString() !== lawyerId) {
        throw new CustomException('العميل غير موجود أو لا يمكنك الوصول إليه', 404);
    }

    // Add client to linked clients if not already linked
    if (!contact.linkedClients.includes(clientId)) {
        contact.linkedClients.push(clientId);
        await contact.save();
    }

    res.status(200).json({
        data: [contact],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Unlink contact from client
 * POST /api/contacts/:id/unlink-client
 */
const unlinkContactFromClient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req.body;
    const lawyerId = req.userID;

    if (!clientId) {
        throw new CustomException('معرف العميل مطلوب', 400);
    }

    const contact = await Contact.findById(id);

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    if (contact.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى جهة الاتصال هذه', 403);
    }

    contact.linkedClients = contact.linkedClients.filter(
        c => c.toString() !== clientId
    );
    await contact.save();

    res.status(200).json({
        data: [contact],
        total: 1,
        page: 1,
        limit: 1
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
    linkContactToCase,
    unlinkContactFromCase,
    linkContactToClient,
    unlinkContactFromClient
};
