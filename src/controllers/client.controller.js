const mongoose = require('mongoose');
const { Client, Case, Invoice, Payment } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mojPortalService = require('../services/mojPortalService');

/**
 * Create client
 * POST /api/clients
 */
const createClient = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    // Validate required fields
    if (!req.body.phone) {
        throw CustomException('رقم الهاتف مطلوب', 400);
    }

    // Check for conflicts before creating
    const conflicts = await Client.runConflictCheck(lawyerId, req.body);
    if (conflicts.length > 0) {
        return res.status(409).json({
            success: false,
            message: 'تم العثور على تعارضات محتملة',
            conflicts
        });
    }

    const clientData = {
        ...req.body,
        lawyerId,
        createdBy: lawyerId
    };

    const client = await Client.create(clientData);

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
    const query = { lawyerId };

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
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id)
        .populate('assignments.responsibleLawyerId', 'firstName lastName email')
        .populate('assignments.assistantLawyerId', 'firstName lastName')
        .populate('assignments.paralegalId', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .lean();

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // Get related data
    const [cases, invoices, payments] = await Promise.all([
        Case.find({ clientId: id, lawyerId })
            .select('title caseNumber status createdAt')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
        Invoice.find({ clientId: id, lawyerId })
            .select('invoiceNumber totalAmount status dueDate balanceDue')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
        Payment.find({ clientId: id, lawyerId })
            .select('paymentNumber amount paymentDate status')
            .sort({ paymentDate: -1 })
            .limit(10)
            .lean()
    ]);

    // Calculate totals
    const [totalInvoiced, totalPaid, outstandingBalance] = await Promise.all([
        Invoice.aggregate([
            { $match: { clientId: new mongoose.Types.ObjectId(id), lawyerId: new mongoose.Types.ObjectId(lawyerId) } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        Payment.aggregate([
            { $match: { clientId: new mongoose.Types.ObjectId(id), lawyerId: new mongoose.Types.ObjectId(lawyerId), status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Invoice.aggregate([
            { $match: { clientId: new mongoose.Types.ObjectId(id), lawyerId: new mongoose.Types.ObjectId(lawyerId), status: { $in: ['sent', 'partial', 'overdue'] } } },
            { $group: { _id: null, total: { $sum: '$balanceDue' } } }
        ])
    ]);

    res.status(200).json({
        success: true,
        data: {
            ...client,
            relatedData: { cases, invoices, payments },
            summary: {
                totalCases: await Case.countDocuments({ clientId: id, lawyerId }),
                totalInvoices: await Invoice.countDocuments({ clientId: id, lawyerId }),
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id)
        .select('clientNumber clientType firstName lastName fullNameArabic fullNameEnglish companyName companyNameEnglish nationalId crNumber email phone address billing vatRegistration')
        .lean();

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId && client.lawyerId.toString() !== lawyerId) {
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);
    if (!client || client.lawyerId.toString() !== lawyerId) {
        throw CustomException('العميل غير موجود', 404);
    }

    const cases = await Case.find({ clientId: id, lawyerId })
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);
    if (!client || client.lawyerId.toString() !== lawyerId) {
        throw CustomException('العميل غير موجود', 404);
    }

    const invoices = await Invoice.find({ clientId: id, lawyerId })
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);
    if (!client || client.lawyerId.toString() !== lawyerId) {
        throw CustomException('العميل غير موجود', 404);
    }

    const payments = await Payment.find({ clientId: id, lawyerId })
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // Check for conflicts if updating key fields
    if (req.body.email || req.body.phone || req.body.nationalId || req.body.crNumber) {
        const conflicts = await Client.runConflictCheck(lawyerId, { ...req.body, _id: id });
        if (conflicts.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'تم العثور على تعارضات محتملة',
                conflicts
            });
        }
    }

    const updatedClient = await Client.findByIdAndUpdate(
        id,
        { ...req.body, updatedBy: lawyerId },
        { new: true, runValidators: true }
    );

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
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // Check if client has active cases or unpaid invoices
    const [activeCases, unpaidInvoices] = await Promise.all([
        Case.countDocuments({ clientId: id, lawyerId, status: { $in: ['active', 'pending'] } }),
        Invoice.countDocuments({ clientId: id, lawyerId, status: { $in: ['draft', 'sent', 'partial'] } })
    ]);

    if (activeCases > 0) {
        throw CustomException('لا يمكن حذف عميل لديه قضايا نشطة', 400);
    }

    if (unpaidInvoices > 0) {
        throw CustomException('لا يمكن حذف عميل لديه فواتير غير مدفوعة', 400);
    }

    await Client.findByIdAndDelete(id);

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
    const { q } = req.query;
    const lawyerId = req.userID;

    if (!q || q.length < 2) {
        throw CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
    }

    const clients = await Client.searchClients(lawyerId, q);

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
    const lawyerId = req.userID;
    const lawyerIdObj = new mongoose.Types.ObjectId(lawyerId);

    const stats = await Client.aggregate([
        { $match: { lawyerId: lawyerIdObj } },
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
    const { limit = 10 } = req.query;
    const lawyerId = req.userID;
    const lawyerIdObj = new mongoose.Types.ObjectId(lawyerId);

    const topClients = await Invoice.aggregate([
        { $match: { lawyerId: lawyerIdObj, status: 'paid' } },
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
    const { clientIds } = req.body;
    const lawyerId = req.userID;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        throw CustomException('معرفات العملاء مطلوبة', 400);
    }

    // Verify all clients belong to lawyer
    const clients = await Client.find({ _id: { $in: clientIds }, lawyerId });

    if (clients.length !== clientIds.length) {
        throw CustomException('بعض العملاء غير صالحين للحذف', 400);
    }

    // Check for active cases or unpaid invoices
    for (const client of clients) {
        const [activeCases, unpaidInvoices] = await Promise.all([
            Case.countDocuments({ clientId: client._id, lawyerId, status: { $in: ['active', 'pending'] } }),
            Invoice.countDocuments({ clientId: client._id, lawyerId, status: { $in: ['draft', 'sent', 'partial'] } })
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    const conflicts = await Client.runConflictCheck(lawyerId, client);

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
    const { id } = req.params;
    const { status } = req.body;
    const lawyerId = req.userID;

    if (!['active', 'inactive', 'archived', 'pending'].includes(status)) {
        throw CustomException('حالة غير صالحة', 400);
    }

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    client.status = status;
    client.updatedBy = lawyerId;
    await client.save();

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
    const { id } = req.params;
    const { isVip, isHighRisk, needsApproval, isBlacklisted, blacklistReason } = req.body;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
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
    const { id, attachmentId } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
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
 * Verify client via Yakeen API (National ID)
 * POST /api/clients/:id/verify/yakeen
 */
const verifyYakeen = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nationalId, dateOfBirth } = req.body;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // TODO: Implement actual Yakeen API call when credentials are available
    // For now, return a placeholder response
    res.json({
        success: true,
        message: 'Yakeen API integration pending - requires API credentials',
        data: {
            verified: false,
            note: 'يتطلب اعتماد API من يقين'
        }
    });
});

/**
 * Verify client via Wathq API (Commercial Registry)
 * POST /api/clients/:id/verify/wathq
 */
const verifyWathq = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { crNumber } = req.body;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // TODO: Implement actual Wathq API call when credentials are available
    // For now, return a placeholder response
    res.json({
        success: true,
        message: 'Wathq API integration pending - requires API credentials',
        data: {
            verified: false,
            note: 'يتطلب اعتماد API من واثق'
        }
    });
});

/**
 * Verify Power of Attorney via MOJ Public Portal
 * POST /api/clients/:id/verify/moj
 *
 * Uses the free public MOJ portal at attorneysportal.moj.gov.sa
 */
const verifyMOJ = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { poaNumber, idNumber } = req.body;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    if (!poaNumber) {
        throw CustomException('رقم الوكالة مطلوب', 400);
    }

    // Use client's national ID if not provided
    const nationalId = idNumber || client.nationalId;

    if (!nationalId) {
        throw CustomException('رقم الهوية مطلوب', 400);
    }

    // Call MOJ portal service
    const result = await mojPortalService.validatePOA(poaNumber, nationalId);

    if (result.success) {
        // Update client with POA information
        client.powerOfAttorney = {
            hasPOA: true,
            poaNumber: result.data.poaNumber,
            attorneyId: result.data.attorney?.idNumber,
            attorneyName: result.data.attorney?.name,
            attorneyType: result.data.attorney?.type,
            source: 'notary',
            notaryNumber: result.data.notaryNumber,
            issueDate: result.data.issueDate ? new Date(result.data.issueDate) : undefined,
            expiryDate: result.data.expiryDate ? new Date(result.data.expiryDate) : undefined,
            powers: result.data.powers,
            limitations: result.data.limitations,
            mojVerified: true,
            mojVerifiedAt: new Date()
        };
        client.updatedBy = lawyerId;
        await client.save();
    }

    res.json({
        success: result.success,
        message: result.success ? 'تم التحقق من الوكالة بنجاح' : result.error,
        data: result.data,
        fromCache: result.fromCache || false
    });
});

/**
 * Verify Attorney license via MOJ Public Portal
 * POST /api/clients/:id/verify/attorney
 */
const verifyAttorney = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { attorneyId } = req.body;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    if (!attorneyId) {
        throw CustomException('رقم هوية المحامي مطلوب', 400);
    }

    // Call MOJ portal service to validate attorney
    const result = await mojPortalService.validateAttorney(attorneyId);

    res.json({
        success: result.success,
        message: result.success ? 'تم التحقق من المحامي بنجاح' : result.error,
        data: result.data,
        fromCache: result.fromCache || false
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
    verifyYakeen,
    verifyWathq,
    verifyMOJ,
    verifyAttorney
};
