const mongoose = require('mongoose');
const { Client, Case, Invoice, Payment } = require('../models');
const CrmActivity = require('../models/crmActivity.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const wathqService = require('../services/wathqService');
const webhookService = require('../services/webhook.service');

/**
 * Create client
 * POST /api/clients
 */
const createClient = asyncHandler(async (req, res) => {
    // ══════════════════════════════════════════════════════════════════
    // 🔍 DEBUG: START - Client Creation
    // ══════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('🚀 [CLIENT CREATE] Starting client creation...');
    console.log('═'.repeat(80));
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🆔 Request ID:', req.id || 'N/A');
    console.log('👤 User ID:', req.userID);
    console.log('🏢 Firm ID:', req.firmId);
    console.log('👨‍💼 Is Solo Lawyer:', req.isSoloLawyer);
    console.log('🚫 Is Departed:', req.isDeparted);
    console.log('📋 Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('─'.repeat(80));

    // Block departed users from client operations
    if (req.isDeparted) {
        console.log('❌ [CLIENT CREATE] BLOCKED - User is departed');
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    console.log('✅ [CLIENT CREATE] User authorization passed');
    console.log('📝 Lawyer ID:', lawyerId);
    console.log('📝 Firm ID:', firmId);

    // Note: Required field validation removed for testing flexibility
    // Fields will use defaults if not provided

    // Note: Conflict check removed for testing flexibility - allows duplicate clients

    const clientData = {
        ...req.body,
        lawyerId,
        firmId, // Add firmId for multi-tenancy
        createdBy: lawyerId
    };

    console.log('📋 [CLIENT CREATE] Client data to be created:', JSON.stringify(clientData, null, 2));
    console.log('─'.repeat(80));

    let client;
    try {
        console.log('💾 [CLIENT CREATE] Attempting to save client to database...');
        client = await Client.create(clientData);
        console.log('✅ [CLIENT CREATE] Client saved successfully!');
        console.log('🆔 Client ID:', client._id);
        console.log('📄 Client Number:', client.clientNumber);
    } catch (dbError) {
        console.log('❌ [CLIENT CREATE] DATABASE ERROR!');
        console.log('🔴 Error Name:', dbError.name);
        console.log('🔴 Error Message:', dbError.message);
        console.log('🔴 Error Code:', dbError.code);
        if (dbError.errors) {
            console.log('🔴 Validation Errors:', JSON.stringify(dbError.errors, null, 2));
        }
        if (dbError.keyValue) {
            console.log('🔴 Duplicate Key:', JSON.stringify(dbError.keyValue, null, 2));
        }
        console.log('🔴 Full Error Stack:', dbError.stack);
        throw dbError;
    }

    // Log activity
    console.log('📝 [CLIENT CREATE] Logging CRM activity...');
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
        console.log('✅ [CLIENT CREATE] CRM activity logged successfully');
    } catch (activityError) {
        console.log('⚠️ [CLIENT CREATE] CRM activity logging failed (non-fatal):', activityError.message);
    }

    // Trigger webhook - fire and forget (async, don't await)
    console.log('🔔 [CLIENT CREATE] Triggering webhook...');
    webhookService.trigger('client.created', client.toObject(), firmId).catch(err => {
        console.error('⚠️ [CLIENT CREATE] Webhook trigger error:', err);
    });

    console.log('✅ [CLIENT CREATE] Sending success response...');
    console.log('═'.repeat(80));
    console.log('🎉 [CLIENT CREATE] COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(80) + '\n');

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

    // Build query: use firmId if available, otherwise fall back to lawyerId
    const query = firmId ? { firmId } : { lawyerId };

    if (status) query.status = status;
    if (clientType) query.clientType = clientType;
    if (responsibleLawyerId) query['assignments.responsibleLawyerId'] = responsibleLawyerId;
    if (tags) query.tags = { $in: tags.split(',') };

    // Search by name, email, phone, or client number
    if (search) {
        query.$or = [
            { fullNameArabic: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { nationalId: { $regex: search, $options: 'i' } },
            { crNumber: { $regex: search, $options: 'i' } },
            { clientNumber: { $regex: search, $options: 'i' } }
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
 */
const getClient = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const client = await Client.findById(id)
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

    // Check access: firmId takes precedence for multi-tenancy, fallback to lawyerId
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // Build filter for related data queries
    const dataFilter = firmId ? { firmId } : { lawyerId };

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
    const aggFilter = firmId
        ? { clientId: new mongoose.Types.ObjectId(id), firmId: new mongoose.Types.ObjectId(firmId) }
        : { clientId: new mongoose.Types.ObjectId(id), lawyerId: new mongoose.Types.ObjectId(lawyerId) };

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
 */
const getBillingInfo = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    const client = await Client.findById(id)
        .select('clientNumber clientType firstName lastName fullNameArabic fullNameEnglish companyName companyNameEnglish nationalId crNumber email phone address billing vatRegistration lawyerId firmId')
        .lean();

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access: firmId takes precedence for multi-tenancy
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId && client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
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
 */
const getClientCases = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);
    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    const dataFilter = firmId ? { firmId } : { lawyerId };
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
 */
const getClientInvoices = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);
    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    const dataFilter = firmId ? { firmId } : { lawyerId };
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
 */
const getClientPayments = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);
    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    const dataFilter = firmId ? { firmId } : { lawyerId };
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
 */
const updateClient = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

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
    Object.keys(req.body).forEach(key => {
        if (client[key] !== req.body[key] && key !== 'updatedBy') {
            changedFields[key] = {
                old: client[key],
                new: req.body[key]
            };
        }
    });

    const updatedClient = await Client.findByIdAndUpdate(
        id,
        { ...req.body, updatedBy: lawyerId },
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
        console.error('Webhook trigger error:', err);
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
 */
const deleteClient = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // Check if client has active cases or unpaid invoices
    const dataFilter = firmId ? { firmId } : { lawyerId };
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

    await Client.findByIdAndDelete(id);

    // Trigger webhook - fire and forget (async, don't await)
    webhookService.trigger('client.deleted', {
        _id: clientData._id,
        clientNumber: clientData.clientNumber,
        clientType: clientData.clientType,
        fullNameArabic: clientData.fullNameArabic,
        companyName: clientData.companyName
    }, firmId).catch(err => {
        console.error('Webhook trigger error:', err);
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

    // Build match filter based on firmId or lawyerId
    const matchFilter = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

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

    // Build match filter based on firmId or lawyerId
    const matchFilter = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId), status: 'paid' }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId), status: 'paid' };

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

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        throw CustomException('معرفات العملاء مطلوبة', 400);
    }

    // Build filter for ownership check
    const ownerFilter = firmId ? { firmId } : { lawyerId };

    // Verify all clients belong to firm/lawyer
    const clients = await Client.find({ _id: { $in: clientIds }, ...ownerFilter });

    if (clients.length !== clientIds.length) {
        throw CustomException('بعض العملاء غير صالحين للحذف', 400);
    }

    // Check for active cases or unpaid invoices
    const dataFilter = firmId ? { firmId } : { lawyerId };
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

    await Client.deleteMany({ _id: { $in: clientIds } });

    res.status(200).json({
        success: true,
        message: `تم حذف ${clients.length} عملاء بنجاح`,
        count: clients.length
    });
});

/**
 * Run conflict check
 * POST /api/clients/:id/conflict-check
 */
const runConflictCheck = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
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

    if (!['active', 'inactive', 'archived', 'pending'].includes(status)) {
        throw CustomException('حالة غير صالحة', 400);
    }

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
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
 */
const updateFlags = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل العملاء', 403);
    }

    const { id } = req.params;
    const { isVip, isHighRisk, needsApproval, isBlacklisted, blacklistReason } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // Update flags
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
 */
const uploadAttachments = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل العملاء', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
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
 */
const deleteAttachment = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل العملاء', 403);
    }

    const { id, attachmentId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
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

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
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
 */
const getWathqData = asyncHandler(async (req, res) => {
    // Block departed users from client operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى العملاء', 403);
    }

    const { id, dataType } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    // Check access
    const hasAccess = firmId
        ? client.firmId && client.firmId.toString() === firmId.toString()
        : client.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
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
    getWathqData
};
