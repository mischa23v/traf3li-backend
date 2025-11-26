const { Contact, Case, Client } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create contact
 * POST /api/contacts
 */
const createContact = asyncHandler(async (req, res) => {
    const {
        firstName, lastName, email, phone, alternatePhone,
        title, company, type, category, address, city,
        postalCode, country, notes, tags
    } = req.body;
    const lawyerId = req.userID;

    if (!firstName || !lastName || !type) {
        throw new CustomException('الاسم الأول والأخير والنوع مطلوبون', 400);
    }

    const contact = await Contact.create({
        lawyerId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim().toLowerCase(),
        phone: phone?.trim(),
        alternatePhone: alternatePhone?.trim(),
        title: title?.trim(),
        company: company?.trim(),
        type,
        category,
        address: address?.trim(),
        city: city?.trim(),
        postalCode: postalCode?.trim(),
        country: country || 'Saudi Arabia',
        notes,
        tags: tags || []
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء جهة الاتصال بنجاح',
        data: contact
    });
});

/**
 * Get all contacts
 * GET /api/contacts
 */
const getContacts = asyncHandler(async (req, res) => {
    const {
        type, category, status, search,
        page = 1, limit = 50
    } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };

    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } }
        ];
    }

    const contacts = await Contact.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Contact.countDocuments(query);

    res.status(200).json({
        success: true,
        data: contacts,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single contact
 * GET /api/contacts/:id
 */
const getContact = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const contact = await Contact.findOne({ _id: id, lawyerId })
        .populate('linkedCases', 'title caseNumber status')
        .populate('linkedClients', 'name fullName email');

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        data: contact
    });
});

/**
 * Update contact
 * PATCH /api/contacts/:id
 */
const updateContact = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const contact = await Contact.findOne({ _id: id, lawyerId });

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    const allowedFields = [
        'firstName', 'lastName', 'email', 'phone', 'alternatePhone',
        'title', 'company', 'type', 'category', 'address', 'city',
        'postalCode', 'country', 'notes', 'tags', 'status'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            contact[field] = req.body[field];
        }
    });

    await contact.save();

    res.status(200).json({
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const contact = await Contact.findOneAndDelete({ _id: id, lawyerId });

    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف جهة الاتصال بنجاح'
    });
});

/**
 * Bulk delete contacts
 * POST /api/contacts/bulk-delete
 */
const bulkDeleteContacts = asyncHandler(async (req, res) => {
    const { contactIds } = req.body;
    const lawyerId = req.userID;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        throw new CustomException('معرفات جهات الاتصال مطلوبة', 400);
    }

    const result = await Contact.deleteMany({
        _id: { $in: contactIds },
        lawyerId
    });

    res.status(200).json({
        success: true,
        message: `تم حذف ${result.deletedCount} جهة اتصال بنجاح`,
        count: result.deletedCount
    });
});

/**
 * Search contacts
 * GET /api/contacts/search
 */
const searchContacts = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const lawyerId = req.userID;

    if (!q || q.length < 2) {
        throw new CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
    }

    const contacts = await Contact.searchContacts(lawyerId, q);

    res.status(200).json({
        success: true,
        data: contacts,
        count: contacts.length
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
    }).sort({ createdAt: -1 });

    res.status(200).json({
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

    const contacts = await Contact.find({
        lawyerId,
        linkedClients: clientId
    }).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: contacts
    });
});

/**
 * Link contact to case
 * POST /api/contacts/:id/link-case
 */
const linkToCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { caseId } = req.body;
    const lawyerId = req.userID;

    const contact = await Contact.findOne({ _id: id, lawyerId });
    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    const caseExists = await Case.findOne({ _id: caseId, lawyerId });
    if (!caseExists) {
        throw new CustomException('القضية غير موجودة', 404);
    }

    if (!contact.linkedCases.includes(caseId)) {
        contact.linkedCases.push(caseId);
        await contact.save();
    }

    res.status(200).json({
        success: true,
        message: 'تم ربط جهة الاتصال بالقضية بنجاح',
        data: contact
    });
});

/**
 * Unlink contact from case
 * POST /api/contacts/:id/unlink-case
 */
const unlinkFromCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { caseId } = req.body;
    const lawyerId = req.userID;

    const contact = await Contact.findOne({ _id: id, lawyerId });
    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    contact.linkedCases = contact.linkedCases.filter(c => c.toString() !== caseId);
    await contact.save();

    res.status(200).json({
        success: true,
        message: 'تم فك ربط جهة الاتصال من القضية بنجاح',
        data: contact
    });
});

/**
 * Link contact to client
 * POST /api/contacts/:id/link-client
 */
const linkToClient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req.body;
    const lawyerId = req.userID;

    const contact = await Contact.findOne({ _id: id, lawyerId });
    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    const clientExists = await Client.findOne({ _id: clientId, lawyerId });
    if (!clientExists) {
        throw new CustomException('العميل غير موجود', 404);
    }

    if (!contact.linkedClients.includes(clientId)) {
        contact.linkedClients.push(clientId);
        await contact.save();
    }

    res.status(200).json({
        success: true,
        message: 'تم ربط جهة الاتصال بالعميل بنجاح',
        data: contact
    });
});

/**
 * Unlink contact from client
 * POST /api/contacts/:id/unlink-client
 */
const unlinkFromClient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { clientId } = req.body;
    const lawyerId = req.userID;

    const contact = await Contact.findOne({ _id: id, lawyerId });
    if (!contact) {
        throw new CustomException('جهة الاتصال غير موجودة', 404);
    }

    contact.linkedClients = contact.linkedClients.filter(c => c.toString() !== clientId);
    await contact.save();

    res.status(200).json({
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
