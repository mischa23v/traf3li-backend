const { Client, Case, Invoice, Payment } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create client
 * POST /api/clients
 */
const createClient = asyncHandler(async (req, res) => {
    const {
        fullName,
        email,
        phone,
        alternatePhone,
        nationalId,
        companyName,
        companyRegistration,
        address,
        city,
        country = 'Saudi Arabia',
        notes,
        preferredContactMethod = 'email',
        language = 'ar',
        status = 'active'
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!fullName || !phone) {
        throw new CustomException('الحقول المطلوبة: الاسم الكامل، رقم الهاتف', 400);
    }

    // Check if client already exists by email or phone
    if (email) {
        const existingClient = await Client.findOne({ lawyerId, email });
        if (existingClient) {
            throw new CustomException('يوجد عميل بهذا البريد الإلكتروني بالفعل', 400);
        }
    }

    const client = await Client.create({
        lawyerId,
        fullName,
        email,
        phone,
        alternatePhone,
        nationalId,
        companyName,
        companyRegistration,
        address,
        city,
        country,
        notes,
        preferredContactMethod,
        language,
        status
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء العميل بنجاح',
        client
    });
});

/**
 * Get clients with filters
 * GET /api/clients
 */
const getClients = asyncHandler(async (req, res) => {
    const {
        status,
        search,
        city,
        country,
        page = 1,
        limit = 50
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (status) query.status = status;
    if (city) query.city = city;
    if (country) query.country = country;

    // Search by name, email, phone, or client ID
    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { clientId: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } }
        ];
    }

    const clients = await Client.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

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
 * Get single client
 * GET /api/clients/:id
 */
const getClient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw new CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // Get related data
    const cases = await Case.find({ clientId: id, lawyerId })
        .select('title caseNumber status createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

    const invoices = await Invoice.find({ clientId: id, lawyerId })
        .select('invoiceNumber totalAmount status dueDate')
        .sort({ createdAt: -1 })
        .limit(10);

    const payments = await Payment.find({ clientId: id, lawyerId })
        .select('paymentNumber amount paymentDate status')
        .sort({ paymentDate: -1 })
        .limit(10);

    // Calculate totals
    const totalInvoiced = await Invoice.aggregate([
        { $match: { clientId: client._id, lawyerId: client.lawyerId } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const totalPaid = await Payment.aggregate([
        { $match: { clientId: client._id, lawyerId: client.lawyerId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const outstandingBalance = await Invoice.aggregate([
        { $match: { clientId: client._id, lawyerId: client.lawyerId, status: { $in: ['sent', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$balanceDue' } } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            client,
            relatedData: {
                cases,
                invoices,
                payments
            },
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
 * Update client
 * PUT /api/clients/:id
 */
const updateClient = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const client = await Client.findById(id);

    if (!client) {
        throw new CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // Check if email is being changed and already exists
    if (req.body.email && req.body.email !== client.email) {
        const existingClient = await Client.findOne({
            lawyerId,
            email: req.body.email,
            _id: { $ne: id }
        });
        if (existingClient) {
            throw new CustomException('يوجد عميل بهذا البريد الإلكتروني بالفعل', 400);
        }
    }

    const allowedFields = [
        'fullName',
        'email',
        'phone',
        'alternatePhone',
        'nationalId',
        'companyName',
        'companyRegistration',
        'address',
        'city',
        'country',
        'notes',
        'preferredContactMethod',
        'language',
        'status'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            client[field] = req.body[field];
        }
    });

    await client.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث العميل بنجاح',
        client
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
        throw new CustomException('العميل غير موجود', 404);
    }

    if (client.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا العميل', 403);
    }

    // Check if client has active cases or unpaid invoices
    const activeCases = await Case.countDocuments({
        clientId: id,
        lawyerId,
        status: { $in: ['active', 'pending'] }
    });

    if (activeCases > 0) {
        throw new CustomException('لا يمكن حذف عميل لديه قضايا نشطة', 400);
    }

    const unpaidInvoices = await Invoice.countDocuments({
        clientId: id,
        lawyerId,
        status: { $in: ['draft', 'sent', 'partial'] }
    });

    if (unpaidInvoices > 0) {
        throw new CustomException('لا يمكن حذف عميل لديه فواتير غير مدفوعة', 400);
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
        throw new CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
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

    const totalClients = await Client.countDocuments({ lawyerId });

    const byStatus = await Client.aggregate([
        { $match: { lawyerId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const byCity = await Client.aggregate([
        { $match: { lawyerId } },
        {
            $group: {
                _id: '$city',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    const byCountry = await Client.aggregate([
        { $match: { lawyerId } },
        {
            $group: {
                _id: '$country',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalClients,
            byStatus,
            byCity,
            byCountry
        }
    });
});

/**
 * Get top clients by revenue
 * GET /api/clients/top-revenue
 */
const getTopClientsByRevenue = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const lawyerId = req.userID;

    const topClients = await Invoice.aggregate([
        { $match: { lawyerId, status: 'paid' } },
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
                clientName: '$client.fullName',
                clientEmail: '$client.email',
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
        throw new CustomException('معرفات العملاء مطلوبة', 400);
    }

    // Verify all clients belong to lawyer and have no active cases/unpaid invoices
    const clients = await Client.find({
        _id: { $in: clientIds },
        lawyerId
    });

    if (clients.length !== clientIds.length) {
        throw new CustomException('بعض العملاء غير صالحين للحذف', 400);
    }

    // Check for active cases
    for (const client of clients) {
        const activeCases = await Case.countDocuments({
            clientId: client._id,
            lawyerId,
            status: { $in: ['active', 'pending'] }
        });

        if (activeCases > 0) {
            throw new CustomException(`العميل ${client.fullName} لديه قضايا نشطة`, 400);
        }

        const unpaidInvoices = await Invoice.countDocuments({
            clientId: client._id,
            lawyerId,
            status: { $in: ['draft', 'sent', 'partial'] }
        });

        if (unpaidInvoices > 0) {
            throw new CustomException(`العميل ${client.fullName} لديه فواتير غير مدفوعة`, 400);
        }
    }

    await Client.deleteMany({ _id: { $in: clientIds } });

    res.status(200).json({
        success: true,
        message: `تم حذف ${clients.length} عملاء بنجاح`,
        count: clients.length
    });
});

module.exports = {
    createClient,
    getClients,
    getClient,
    updateClient,
    deleteClient,
    searchClients,
    getClientStats,
    getTopClientsByRevenue,
    bulkDeleteClients
};
