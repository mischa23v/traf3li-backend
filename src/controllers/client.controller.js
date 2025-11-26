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
        notes,
        preferredContactMethod,
        status = 'active'
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!fullName || !phone) {
        throw new CustomException('الحقول المطلوبة: الاسم الكامل، رقم الهاتف', 400);
    }

    // Check if client already exists by email
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
        notes,
        preferredContactMethod,
        status
    });

    res.status(201).json({
        data: client,
        total: 1,
        page: 1,
        limit: 1
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
        page = 1,
        limit = 10
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (status) query.status = status;

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

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [clients, total] = await Promise.all([
        Client.find(query)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum),
        Client.countDocuments(query)
    ]);

    res.status(200).json({
        data: clients,
        total,
        page: pageNum,
        limit: limitNum
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

    res.status(200).json({
        data: [client],
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Update client
 * PATCH /api/clients/:id
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
        'notes',
        'preferredContactMethod',
        'status'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            client[field] = req.body[field];
        }
    });

    await client.save();

    res.status(200).json({
        data: [client],
        total: 1,
        page: 1,
        limit: 1
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

    await Client.findByIdAndDelete(id);

    res.status(200).json({
        data: [],
        total: 0,
        page: 1,
        limit: 1
    });
});

/**
 * Search clients
 * GET /api/clients/search
 */
const searchClients = asyncHandler(async (req, res) => {
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

    const clients = await Client.searchClients(lawyerId, q, 20);

    res.status(200).json({
        data: clients,
        total: clients.length,
        page: 1,
        limit: 20
    });
});

/**
 * Get client statistics
 * GET /api/clients/stats
 */
const getClientStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const mongoose = require('mongoose');
    const lawyerObjectId = new mongoose.Types.ObjectId(lawyerId);

    const [totalClients, byStatus, byCity] = await Promise.all([
        Client.countDocuments({ lawyerId }),
        Client.aggregate([
            { $match: { lawyerId: lawyerObjectId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]),
        Client.aggregate([
            { $match: { lawyerId: lawyerObjectId } },
            {
                $group: {
                    _id: '$city',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ])
    ]);

    res.status(200).json({
        data: {
            totalClients,
            byStatus,
            byCity
        },
        total: 1,
        page: 1,
        limit: 1
    });
});

/**
 * Get top clients by revenue
 * GET /api/clients/top-revenue
 */
const getTopClientsByRevenue = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const lawyerId = req.userID;
    const mongoose = require('mongoose');
    const lawyerObjectId = new mongoose.Types.ObjectId(lawyerId);

    const topClients = await Invoice.aggregate([
        { $match: { lawyerId: lawyerObjectId, status: 'paid' } },
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
        { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
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
        data: topClients,
        total: topClients.length,
        page: 1,
        limit: parseInt(limit)
    });
});

/**
 * Bulk delete clients
 * POST /api/clients/bulk-delete
 */
const bulkDeleteClients = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const lawyerId = req.userID;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new CustomException('معرفات العملاء مطلوبة', 400);
    }

    // Verify all clients belong to lawyer
    const clients = await Client.find({
        _id: { $in: ids },
        lawyerId
    });

    if (clients.length !== ids.length) {
        throw new CustomException('بعض العملاء غير صالحين للحذف', 400);
    }

    await Client.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
        data: [],
        total: clients.length,
        page: 1,
        limit: clients.length
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
