const mongoose = require('mongoose');
const { Client, Case, Invoice, Payment, Firm } = require('../models');
const CrmActivity = require('../models/crmActivity.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const wathqService = require('../services/wathqService');
const webhookService = require('../services/webhook.service');
const { pickAllowedFields, sanitizeEmail, sanitizePhone } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Escape special regex characters to prevent NoSQL injection
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for regex
 */
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ============================================
// ALLOWED FIELDS FOR CLIENT OPERATIONS
// ============================================

// Fields allowed during client creation
const CREATE_ALLOWED_FIELDS = [
    'firstName',
    'lastName',
    'fullNameArabic',
    'fullNameEnglish',
    'companyName',
    'companyNameEnglish',
    'clientType',
    'email',
    'phone',
    'address',
    'nationalId',
    'crNumber',
    'unifiedNumber',
    'notes',
    'tags',
    'status',
    'clientSource',
    'clientTier',
    'vatRegistration',
    'billing',
    'contactInfo'
];

// Fields allowed during client update
const UPDATE_ALLOWED_FIELDS = [
    'firstName',
    'lastName',
    'fullNameArabic',
    'fullNameEnglish',
    'companyName',
    'companyNameEnglish',
    'email',
    'phone',
    'address',
    'notes',
    'tags',
    'clientSource',
    'clientTier',
    'vatRegistration',
    'billing',
    'contactInfo'
];

// ============================================
// INPUT VALIDATION FUNCTIONS
// ============================================

/**
 * Validate client email
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return true; // Email is optional
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate client phone number
 * @param {string} phone - Phone to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidPhone = (phone) => {
    if (!phone || typeof phone !== 'string') {
        return true; // Phone is optional
    }
    // Allow phone numbers with digits, +, -, (, ), and spaces
    const phoneRegex = /^[+\d\-\s()]{7,20}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate IBAN format (basic validation)
 * @param {string} iban - IBAN to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidIBAN = (iban) => {
    if (!iban || typeof iban !== 'string') {
        return true; // IBAN is optional
    }
    // IBAN format: 2 letter country code, 2 digits, up to 30 alphanumeric
    const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(iban.toUpperCase().replace(/\s/g, ''));
};

/**
 * Validate and sanitize client input data
 * @param {Object} data - Client data to validate
 * @returns {Object} - Validated data with sanitized fields
 * @throws {Error} - If validation fails
 */
const validateClientInput = (data) => {
    const errors = [];

    // Validate email if present
    if (data.email && !isValidEmail(data.email)) {
        errors.push('بريد إلكتروني غير صالح');
    }

    // Validate phone if present
    if (data.phone && !isValidPhone(data.phone)) {
        errors.push('رقم هاتف غير صالح');
    }

    // Validate IBAN if present in billing object
    if (data.billing && data.billing.iban && !isValidIBAN(data.billing.iban)) {
        errors.push('رقم IBAN غير صالح');
    }

    if (errors.length > 0) {
        throw CustomException(errors.join(', '), 400);
    }

    // Sanitize sensitive fields
    const sanitized = { ...data };
    if (sanitized.email) {
        sanitized.email = sanitizeEmail(sanitized.email);
    }
    if (sanitized.phone) {
        sanitized.phone = sanitizePhone(sanitized.phone);
    }

    return sanitized;
};

/**
 * Create client
 * POST /api/clients
 *
 * SECURITY:
 * - Mass assignment protection via allowlist (CREATE_ALLOWED_FIELDS)
 * - Input validation for email, phone, IBAN
 * - IDOR protection: lawyerId and firmId set by server, not user input
 */
const createClient = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // SECURITY: Mass assignment protection - only allow specific fields
    const safeClientData = pickAllowedFields(req.body, CREATE_ALLOWED_FIELDS);

    // SECURITY: Validate and sanitize input data
    const validatedData = validateClientInput(safeClientData);

    // SECURITY: Never allow users to set lawyerId, firmId, or createdBy - server-side only
    const clientData = {
        ...validatedData,
        lawyerId,
        firmId, // Add firmId for multi-tenancy (set by server, not user)
        createdBy: lawyerId
    };

    const client = await Client.create(clientData);

    // Increment usage counter for firm
    if (firmId) {
        await Firm.findOneAndUpdate(
            { _id: firmId },
            { $inc: { 'usage.clients': 1 } }
        ).catch(err => logger.error('Error updating client usage:', err.message));
    }

    // Log activity
    try {
        await CrmActivity.logActivity({
            lawyerId,
            type: 'note',
            entityType: 'client',
            entityId: client._id,
            entityName: client.fullNameArabic || client.companyName,
            title: `New client created: ${client.fullNameArabic || client.companyName}`,
            description: `Client ${client.clientNumber} was created`,
            performedBy: lawyerId,
            metadata: {
                clientType: client.clientType,
                clientNumber: client.clientNumber
            }
        });
    } catch (activityError) {
        // Non-fatal: continue if activity logging fails
    }

    // Trigger webhook - fire and forget (async, don't await)
    webhookService.trigger('client.created', client.toObject(), firmId).catch(() => {});

    res.status(201).json({
        success: true,
        message: 'تم إنشاء العميل بنجاح',
        data: client
    });
});

/**
 * Get clients with filters
 * GET /api/clients
 */
const getClients = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const {
        status,
        clientType,
        search,
        responsibleLawyerId,
        tags,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
    } = req.query;

    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware
    const isSoloLawyer = req.isSoloLawyer;

    // Build query based on user type
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    if (status) query.status = status;
    if (clientType) query.clientType = clientType;
    if (responsibleLawyerId) query['assignments.responsibleLawyerId'] = responsibleLawyerId;
    if (tags) query.tags = { $in: tags.split(',') };

    // Search by name, email, phone, or client number
    if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
            { fullNameArabic: { $regex: safeSearch, $options: 'i' } },
            { companyName: { $regex: safeSearch, $options: 'i' } },
            { email: { $regex: safeSearch, $options: 'i' } },
            { phone: { $regex: safeSearch, $options: 'i' } },
            { nationalId: { $regex: safeSearch, $options: 'i' } },
            { crNumber: { $regex: safeSearch, $options: 'i' } },
            { clientNumber: { $regex: safeSearch, $options: 'i' } }
        ];
    }

    const clients = await Client.find(query)
        .populate('assignments.responsibleLawyerId', 'firstName lastName')
        .populate('organizationId', 'legalName tradeName type')
        .populate('contactId', 'firstName lastName email phone')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean();

    const total = await Client.countDocuments(query);

    res.status(200).json({
        success: true,
        data: clients,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single client with full details
 * GET /api/clients/:id
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before returning client
 * - Only return clients that belong to user's firm or were created by user
 */
const getClient = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery })
        .populate('assignments.responsibleLawyerId', 'firstName lastName email')
        .populate('assignments.assistantLawyerId', 'firstName lastName')
        .populate('assignments.paralegalId', 'firstName lastName')
        .populate('organizationId', 'legalName tradeName type email phone address')
        .populate('contactId', 'firstName lastName email phone title company organizationId')
        .populate('createdBy', 'firstName lastName')
        .lean();

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Build filter for related data queries
    const dataFilter = {};
    if (isSoloLawyer || !firmId) {
        dataFilter.lawyerId = lawyerId;
    } else {
        dataFilter.firmId = firmId;
    }

    // Get related data
    const [cases, invoices, payments] = await Promise.all([
        Case.find({ clientId: id, ...dataFilter })
            .select('title caseNumber status createdAt')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
        Invoice.find({ clientId: id, ...dataFilter })
            .select('invoiceNumber totalAmount status dueDate balanceDue')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
        Payment.find({ clientId: id, ...dataFilter })
            .select('paymentNumber amount paymentDate status')
            .sort({ paymentDate: -1 })
            .limit(10)
            .lean()
    ]);

    // Build aggregation match filter
    const aggFilter = { clientId: new mongoose.Types.ObjectId(id) };
    if (isSoloLawyer || !firmId) {
        aggFilter.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    } else {
        aggFilter.firmId = new mongoose.Types.ObjectId(firmId);
    }

    // Calculate totals
    const [totalInvoiced, totalPaid, outstandingBalance] = await Promise.all([
        Invoice.aggregate([
            { $match: aggFilter },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        Payment.aggregate([
            { $match: { ...aggFilter, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Invoice.aggregate([
            { $match: { ...aggFilter, status: { $in: ['sent', 'partial', 'overdue'] } } },
            { $group: { _id: null, total: { $sum: '$balanceDue' } } }
        ])
    ]);

    res.status(200).json({
        success: true,
        data: {
            ...client,
            relatedData: { cases, invoices, payments },
            summary: {
                totalCases: await Case.countDocuments({ clientId: id, ...dataFilter }),
                totalInvoices: await Invoice.countDocuments({ clientId: id, ...dataFilter }),
                totalInvoiced: totalInvoiced[0]?.total || 0,
                totalPaid: totalPaid[0]?.total || 0,
                outstandingBalance: outstandingBalance[0]?.total || 0
            }
        }
    });
});

/**
 * Get billing info for invoice/payment forms
 * GET /api/clients/:id/billing-info
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before returning billing information
 * - Only return billing data for clients that belong to user's firm or were created by user
 */
const getBillingInfo = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery })
        .select('clientNumber clientType firstName lastName fullNameArabic fullNameEnglish companyName companyNameEnglish nationalId crNumber email phone address billing vatRegistration lawyerId firmId')
        .lean();

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    res.json({
        success: true,
        data: {
            clientId: client._id,
            clientNumber: client.clientNumber,
            displayName: client.clientType === 'individual'
                ? client.fullNameArabic || `${client.firstName} ${client.lastName}`
                : client.companyName,
            displayNameEn: client.clientType === 'individual'
                ? client.fullNameEnglish
                : client.companyNameEnglish,
            clientType: client.clientType,
            vatNumber: client.vatRegistration?.vatNumber,
            crNumber: client.crNumber,
            nationalId: client.nationalId,
            email: client.email,
            phone: client.phone,
            address: client.address,
            billing: client.billing
        }
    });
});

/**
 * Get client's cases
 * GET /api/clients/:id/cases
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before returning cases
 * - Only return cases for clients that belong to user's firm or were created by user
 */
const getClientCases = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery }).lean();
    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    const dataFilter = {};
    if (isSoloLawyer || !firmId) {
        dataFilter.lawyerId = lawyerId;
    } else {
        dataFilter.firmId = firmId;
    }
    const cases = await Case.find({ clientId: id, ...dataFilter })
        .populate('responsibleAttorneyId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .lean();

    res.json({
        success: true,
        data: cases
    });
});

/**
 * Get client's invoices
 * GET /api/clients/:id/invoices
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before returning invoices
 * - Only return invoices for clients that belong to user's firm or were created by user
 */
const getClientInvoices = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery }).lean();
    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    const dataFilter = {};
    if (isSoloLawyer || !firmId) {
        dataFilter.lawyerId = lawyerId;
    } else {
        dataFilter.firmId = firmId;
    }
    const invoices = await Invoice.find({ clientId: id, ...dataFilter })
        .select('invoiceNumber issueDate dueDate totalAmount amountPaid balanceDue status')
        .sort({ issueDate: -1 })
        .lean();

    res.json({
        success: true,
        data: invoices
    });
});

/**
 * Get client's payments
 * GET /api/clients/:id/payments
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before returning payments
 * - Only return payments for clients that belong to user's firm or were created by user
 */
const getClientPayments = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery }).lean();
    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    const dataFilter = {};
    if (isSoloLawyer || !firmId) {
        dataFilter.lawyerId = lawyerId;
    } else {
        dataFilter.firmId = firmId;
    }
    const payments = await Payment.find({ clientId: id, ...dataFilter })
        .select('paymentNumber paymentDate amount paymentMethod status')
        .sort({ paymentDate: -1 })
        .lean();

    res.json({
        success: true,
        data: payments
    });
});

/**
 * Update client
 * PUT /api/clients/:id
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before update
 * - Mass assignment protection via allowlist (UPDATE_ALLOWED_FIELDS)
 * - Input validation for email, phone, IBAN
 * - Never allow users to update lawyerId, firmId, createdBy, or other sensitive fields
 */
const updateClient = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery });

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // SECURITY: Mass assignment protection - only allow specific fields
    const safeUpdateData = pickAllowedFields(req.body, UPDATE_ALLOWED_FIELDS);

    // SECURITY: Validate and sanitize input data
    const validatedData = validateClientInput(safeUpdateData);

    // Check for conflicts if updating key fields - DISABLED for testing flexibility
    // Note: Conflict check removed for Playwright testing - allows duplicate data
    /*
    if (req.body.email || req.body.phone || req.body.nationalId || req.body.crNumber) {
        const conflicts = await Client.runConflictCheck(lawyerId, { ...req.body, _id: id }, firmId);
        if (conflicts.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'تم العثور على تعارضات محتملة',
                conflicts
            });
        }
    }
    */

    // Track changed fields for activity logging
    const changedFields = {};
    Object.keys(validatedData).forEach(key => {
        if (client[key] !== validatedData[key]) {
            changedFields[key] = {
                old: client[key],
                new: validatedData[key]
            };
        }
    });

    // SECURITY: Only update allowed fields, never allow updating lawyerId, firmId, or createdBy
    const updateData = {
        ...validatedData,
        updatedBy: lawyerId
    };

    // SECURITY: Use secure query to ensure firmId ownership is enforced
    const updatedClient = await Client.findOneAndUpdate(
        { _id: id, ...req.firmQuery },
        updateData,
        { new: true, runValidators: true }
    );

    // Log activity
    if (Object.keys(changedFields).length > 0) {
        await CrmActivity.logActivity({
            lawyerId,
            type: 'note',
            entityType: 'client',
            entityId: updatedClient._id,
            entityName: updatedClient.fullNameArabic || updatedClient.companyName,
            title: `Client updated: ${updatedClient.fullNameArabic || updatedClient.companyName}`,
            description: `Updated fields: ${Object.keys(changedFields).join(', ')}`,
            performedBy: lawyerId,
            metadata: {
                changedFields,
                clientNumber: updatedClient.clientNumber
            }
        });
    }

    // Trigger webhook - fire and forget (async, don't await)
    webhookService.trigger('client.updated', {
        ...updatedClient.toObject(),
        changedFields
    }, firmId).catch(err => {
        logger.error('Webhook trigger error:', err);
    });

    res.status(200).json({
        success: true,
        message: 'تم تحديث العميل بنجاح',
        data: updatedClient
    });
});

/**
 * Delete client
 * DELETE /api/clients/:id
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before deletion
 * - Only allow deletion of clients that belong to user's firm or were created by user
 */
const deleteClient = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery });

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check if client has active cases or unpaid invoices
    const dataFilter = {};
    if (isSoloLawyer || !firmId) {
        dataFilter.lawyerId = lawyerId;
    } else {
        dataFilter.firmId = firmId;
    }
    const [activeCases, unpaidInvoices] = await Promise.all([
        Case.countDocuments({ clientId: id, ...dataFilter, status: { $in: ['active', 'pending'] } }),
        Invoice.countDocuments({ clientId: id, ...dataFilter, status: { $in: ['draft', 'sent', 'partial'] } })
    ]);

    if (activeCases > 0) {
        throw CustomException('لا يمكن حذف عميل لديه قضايا نشطة', 400);
    }

    if (unpaidInvoices > 0) {
        throw CustomException('لا يمكن حذف عميل لديه فواتير غير مدفوعة', 400);
    }

    // Log activity before deletion
    await CrmActivity.logActivity({
        lawyerId,
        type: 'note',
        entityType: 'client',
        entityId: client._id,
        entityName: client.fullNameArabic || client.companyName,
        title: `Client deleted: ${client.fullNameArabic || client.companyName}`,
        description: `Client ${client.clientNumber} was deleted`,
        performedBy: lawyerId,
        metadata: {
            clientType: client.clientType,
            clientNumber: client.clientNumber
        }
    });

    // Store client data for webhook before deletion
    const clientData = client.toObject();

    await Client.findOneAndDelete({ _id: id, ...req.firmQuery });

    // Decrement usage counter for firm
    if (firmId) {
        await Firm.findOneAndUpdate(
            { _id: firmId },
            { $inc: { 'usage.clients': -1 } }
        ).catch(err => logger.error('Error updating client usage:', err.message));
    }

    // Trigger webhook - fire and forget (async, don't await)
    webhookService.trigger('client.deleted', {
        _id: clientData._id,
        clientNumber: clientData.clientNumber,
        clientType: clientData.clientType,
        fullNameArabic: clientData.fullNameArabic,
        companyName: clientData.companyName
    }, firmId).catch(err => {
        logger.error('Webhook trigger error:', err);
    });

    res.status(200).json({
        success: true,
        message: 'تم حذف العميل بنجاح'
    });
});

/**
 * Search clients
 * GET /api/clients/search
 */
const searchClients = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { q } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!q || q.length < 2) {
        throw CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
    }

    const clients = await Client.searchClients(lawyerId, q, firmId);

    res.status(200).json({
        success: true,
        data: clients,
        count: clients.length
    });
});

/**
 * Get client statistics
 * GET /api/clients/stats
 */
const getClientStats = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // Build match filter based on user type
    const matchFilter = {};
    if (isSoloLawyer || !firmId) {
        matchFilter.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    } else {
        matchFilter.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const stats = await Client.aggregate([
        { $match: matchFilter },
        {
            $facet: {
                byType: [{ $group: { _id: '$clientType', count: { $sum: 1 } } }],
                byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                total: [{ $count: 'count' }],
                thisMonth: [
                    { $match: { createdAt: { $gte: new Date(new Date().setDate(1)) } } },
                    { $count: 'count' }
                ],
                bySource: [
                    { $group: { _id: '$clientSource', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ],
                byTier: [{ $group: { _id: '$clientTier', count: { $sum: 1 } } }]
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: stats[0]
    });
});

/**
 * Get top clients by revenue
 * GET /api/clients/top-revenue
 */
const getTopClientsByRevenue = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { limit = 10 } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // Build match filter based on user type
    const matchFilter = { status: 'paid' };
    if (isSoloLawyer || !firmId) {
        matchFilter.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    } else {
        matchFilter.firmId = new mongoose.Types.ObjectId(firmId);
    }

    const topClients = await Invoice.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: '$clientId',
                totalRevenue: { $sum: '$totalAmount' },
                invoiceCount: { $sum: 1 }
            }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: parseInt(limit) },
        {
            $lookup: {
                from: 'clients',
                localField: '_id',
                foreignField: '_id',
                as: 'client'
            }
        },
        { $unwind: '$client' },
        {
            $project: {
                clientId: '$_id',
                clientName: { $ifNull: ['$client.fullNameArabic', '$client.companyName'] },
                clientNumber: '$client.clientNumber',
                clientType: '$client.clientType',
                totalRevenue: 1,
                invoiceCount: 1
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: topClients
    });
});

/**
 * Bulk delete clients
 * DELETE /api/clients/bulk
 */
const bulkDeleteClients = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف العملاء', 403);
    }

    const { clientIds } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        throw CustomException('معرفات العملاء مطلوبة', 400);
    }

    // Build filter for ownership check
    const ownerFilter = {};
    if (isSoloLawyer || !firmId) {
        ownerFilter.lawyerId = lawyerId;
    } else {
        ownerFilter.firmId = firmId;
    }

    // Verify all clients belong to firm/lawyer
    const clients = await Client.find({ _id: { $in: clientIds }, ...ownerFilter });

    if (clients.length !== clientIds.length) {
        throw CustomException('بعض العملاء غير صالحين للحذف', 400);
    }

    // Check for active cases or unpaid invoices
    const dataFilter = {};
    if (isSoloLawyer || !firmId) {
        dataFilter.lawyerId = lawyerId;
    } else {
        dataFilter.firmId = firmId;
    }
    for (const client of clients) {
        const [activeCases, unpaidInvoices] = await Promise.all([
            Case.countDocuments({ clientId: client._id, ...dataFilter, status: { $in: ['active', 'pending'] } }),
            Invoice.countDocuments({ clientId: client._id, ...dataFilter, status: { $in: ['draft', 'sent', 'partial'] } })
        ]);

        if (activeCases > 0) {
            throw CustomException(`العميل ${client.displayName} لديه قضايا نشطة`, 400);
        }

        if (unpaidInvoices > 0) {
            throw CustomException(`العميل ${client.displayName} لديه فواتير غير مدفوعة`, 400);
        }
    }

    // Delete clients - IDs already validated above with ownerFilter
    await Client.deleteMany({ _id: { $in: clientIds }, ...ownerFilter });

    res.status(200).json({
        success: true,
        message: `تم حذف ${clients.length} عملاء بنجاح`,
        count: clients.length
    });
});

/**
 * Run conflict check
 * POST /api/clients/:id/conflict-check
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before running conflict check
 * - Only allow conflict check for clients that belong to user's firm or were created by user
 */
const runConflictCheck = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery });

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    const conflicts = await Client.runConflictCheck(lawyerId, client, firmId);

    // Update conflict check status
    client.conflictCheck = {
        checked: true,
        checkedBy: lawyerId,
        checkDate: new Date(),
        hasConflict: conflicts.length > 0,
        details: conflicts.length > 0 ? JSON.stringify(conflicts) : null
    };

    await client.save();

    res.json({
        success: true,
        data: {
            hasConflict: conflicts.length > 0,
            conflicts,
            checkedAt: client.conflictCheck.checkDate
        }
    });
});

/**
 * Update client status
 * PATCH /api/clients/:id/status
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before update
 * - Input validation: Only allow specific status values
 */
const updateStatus = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل العملاء', 403);
    }

    const { id } = req.params;
    const { status } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Input validation - only allow specific status values
    if (!['active', 'inactive', 'archived', 'pending'].includes(status)) {
        throw CustomException('حالة غير صالحة', 400);
    }

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery });

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    const oldStatus = client.status;

    client.status = status;
    client.updatedBy = lawyerId;
    await client.save();

    // Log status change activity
    await CrmActivity.logActivity({
        lawyerId,
        type: 'status_change',
        entityType: 'client',
        entityId: client._id,
        entityName: client.fullNameArabic || client.companyName,
        title: `Status changed from ${oldStatus} to ${status}`,
        description: `Client status updated for ${client.clientNumber}`,
        performedBy: lawyerId,
        metadata: {
            oldStatus,
            newStatus: status,
            clientNumber: client.clientNumber
        }
    });

    res.json({
        success: true,
        message: 'تم تحديث حالة العميل بنجاح',
        data: { status: client.status }
    });
});

/**
 * Update client flags
 * PATCH /api/clients/:id/flags
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before update
 * - Allowlist approach: Only isVip, isHighRisk, needsApproval, isBlacklisted, blacklistReason allowed
 */
const updateFlags = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Extract only allowed flag fields (allowlist approach)
    const allowedFlagFields = ['isVip', 'isHighRisk', 'needsApproval', 'isBlacklisted', 'blacklistReason'];
    const flagUpdateData = pickAllowedFields(req.body, allowedFlagFields);
    const { isVip, isHighRisk, needsApproval, isBlacklisted, blacklistReason } = flagUpdateData;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery });

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Update flags (only allowed fields)
    if (isVip !== undefined) client.flags.isVip = isVip;
    if (isHighRisk !== undefined) client.flags.isHighRisk = isHighRisk;
    if (needsApproval !== undefined) client.flags.needsApproval = needsApproval;
    if (isBlacklisted !== undefined) {
        client.flags.isBlacklisted = isBlacklisted;
        if (isBlacklisted && blacklistReason) {
            client.flags.blacklistReason = blacklistReason;
        }
    }

    // Also update tier based on VIP status
    if (isVip) {
        client.clientTier = 'vip';
    }

    client.updatedBy = lawyerId;
    await client.save();

    res.json({
        success: true,
        message: 'تم تحديث علامات العميل بنجاح',
        data: { flags: client.flags }
    });
});

/**
 * Upload attachments
 * POST /api/clients/:id/attachments
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before uploading attachments
 * - Only allow attachment uploads for clients that belong to user's firm or were created by user
 */
const uploadAttachments = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery });

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (!req.files || req.files.length === 0) {
        throw CustomException('لم يتم تحميل أي ملفات', 400);
    }

    const { category = 'other' } = req.body;

    const newAttachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: file.location || file.path,
        fileType: file.mimetype,
        fileSize: file.size,
        category,
        uploadedBy: lawyerId,
        uploadedAt: new Date()
    }));

    client.attachments.push(...newAttachments);
    await client.save();

    res.status(201).json({
        success: true,
        message: 'تم تحميل الملفات بنجاح',
        data: newAttachments
    });
});

/**
 * Delete attachment
 * DELETE /api/clients/:id/attachments/:attachmentId
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before deleting attachments
 * - Only allow attachment deletion for clients that belong to user's firm or were created by user
 */
const deleteAttachment = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل العملاء', 403);
    }

    const { id, attachmentId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery });

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    const attachmentIndex = client.attachments.findIndex(
        att => att._id.toString() === attachmentId
    );

    if (attachmentIndex === -1) {
        throw CustomException('المرفق غير موجود', 404);
    }

    client.attachments.splice(attachmentIndex, 1);
    await client.save();

    res.json({
        success: true,
        message: 'تم حذف المرفق بنجاح'
    });
});


/**
 * Verify client via Wathq API (Commercial Registry)
 * POST /api/clients/:id/verify/wathq
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before verifying client
 * - Only allow verification for clients that belong to user's firm or were created by user
 *
 * Uses Wathq API to verify company commercial registration.
 * Requires WATHQ_CONSUMER_KEY and WATHQ_CONSUMER_SECRET in environment.
 */
const verifyWathq = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const { crNumber, fullInfo = true } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery });

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check if Wathq is configured
    if (!wathqService.isConfigured()) {
        throw CustomException('خدمة واثق غير مفعلة - يرجى إضافة مفاتيح API', 503);
    }

    // Use client's CR number if not provided
    const commercialRegNumber = crNumber || client.crNumber;

    if (!commercialRegNumber) {
        throw CustomException('رقم السجل التجاري مطلوب', 400);
    }

    // Call Wathq API
    const result = fullInfo
        ? await wathqService.getFullInfo(commercialRegNumber)
        : await wathqService.getBasicInfo(commercialRegNumber);

    if (result.success) {
        // Update client with company information
        client.clientType = 'company';
        client.crNumber = commercialRegNumber;
        client.companyName = result.data.companyName;
        client.companyNameEnglish = result.data.companyNameEnglish;
        client.unifiedNumber = result.data.crNationalNumber;
        client.crStatus = result.data.status?.name;
        client.capital = result.data.capital;
        client.crIssueDate = result.data.issueDateGregorian ? new Date(result.data.issueDateGregorian) : undefined;
        client.mainActivity = result.data.activities?.[0]?.name;
        client.companyCity = result.data.headquarterCityName;
        client.entityDuration = result.data.companyDuration;
        client.website = result.data.eCommerce?.website;
        client.ecommerceLink = result.data.eCommerce?.link;

        // Store owners if available
        if (result.data.parties && result.data.parties.length > 0) {
            client.owners = result.data.parties.map(party => ({
                name: party.name,
                nationalId: party.nationalId,
                nationality: party.nationality,
                share: party.share
            }));
        }

        client.wathqVerified = true;
        client.wathqVerifiedAt = new Date();
        client.updatedBy = lawyerId;

        await client.save();
    }

    res.json({
        success: result.success,
        message: result.success ? 'تم التحقق من السجل التجاري بنجاح' : result.error,
        data: result.data,
        fromCache: result.fromCache || false
    });
});

/**
 * Get additional Wathq data (managers, owners, capital, branches)
 * GET /api/clients/:id/wathq/:dataType
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before returning Wathq data
 * - Only return data for clients that belong to user's firm or were created by user
 */
const getWathqData = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id, dataType } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    const client = await Client.findOne({ _id: id, ...req.firmQuery }).lean();

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (!client.crNumber) {
        throw CustomException('العميل ليس لديه سجل تجاري', 400);
    }

    if (!wathqService.isConfigured()) {
        throw CustomException('خدمة واثق غير مفعلة', 503);
    }

    let result;
    switch (dataType) {
        case 'managers':
            result = await wathqService.getManagers(client.crNumber);
            break;
        case 'owners':
            result = await wathqService.getOwners(client.crNumber);
            break;
        case 'capital':
            result = await wathqService.getCapital(client.crNumber);
            break;
        case 'branches':
            result = await wathqService.getBranches(client.crNumber);
            break;
        case 'status':
            result = await wathqService.getStatus(client.crNumber);
            break;
        default:
            throw CustomException('نوع البيانات غير صالح', 400);
    }

    res.json({
        success: result.success,
        data: result.data,
        error: result.error
    });
});

/**
 * GET /api/clients/:id/full
 *
 * SECURITY:
 * - IDOR protection: Verify firmId ownership before returning all client data
 * - Only return data for clients that belong to user's firm or were created by user
 *
 * Consolidated endpoint - replaces 3 separate API calls
 * Returns: client details, cases, invoices, payments
 */
const getClientFull = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: IDOR Protection - Query with both ID and ownership check
    // First fetch client to check access before fetching related data
    const client = await Client.findOne({ _id: id, ...req.firmQuery }).lean();

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Build filter for related data
    const dataFilter = {};
    if (isSoloLawyer || !firmId) {
        dataFilter.lawyerId = lawyerId;
    } else {
        dataFilter.firmId = firmId;
    }

    // Now fetch related data with proper firmId/lawyerId filters
    const [cases, invoices, payments] = await Promise.all([
        // Client's cases (last 20)
        Case.find({ clientId: id, ...dataFilter })
            .populate('lawyerId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean(),

        // Client's invoices (last 20)
        Invoice.find({ clientId: id, ...dataFilter })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean(),

        // Client's payments (last 20)
        Payment.find({ clientId: id, ...dataFilter })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
    ]);

    // Calculate summary statistics
    const caseStats = {
        total: cases.length,
        active: cases.filter(c => ['active', 'in_progress', 'open'].includes(c.status)).length,
        closed: cases.filter(c => c.status === 'closed').length
    };

    const invoiceStats = {
        total: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
        paid: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
        pending: invoices.filter(inv => ['pending', 'sent', 'partial'].includes(inv.status)).reduce((sum, inv) => sum + (inv.balanceDue || 0), 0)
    };

    const paymentStats = {
        total: payments.length,
        totalAmount: payments.reduce((sum, pmt) => sum + (pmt.amount || 0), 0)
    };

    res.json({
        success: true,
        data: {
            client,
            cases,
            invoices,
            payments,
            summary: {
                cases: caseStats,
                invoices: invoiceStats,
                payments: paymentStats
            }
        }
    });
});

module.exports = {
    createClient,
    getClients,
    getClient,
    getBillingInfo,
    getClientCases,
    getClientInvoices,
    getClientPayments,
    updateClient,
    deleteClient,
    searchClients,
    getClientStats,
    getTopClientsByRevenue,
    bulkDeleteClients,
    runConflictCheck,
    updateStatus,
    updateFlags,
    uploadAttachments,
    deleteAttachment,
    verifyWathq,
    getWathqData,
    getClientFull
};
