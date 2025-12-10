const mongoose = require('mongoose');
const {
    Case,
    Task,
    Invoice,
    Message,
    Event,
    Order,
    Expense,
    Payment,
    TimeEntry,
    Client
} = require('../models');
const { CustomException } = require('../utils');

// Get hero stats (top-level metrics)
const getHeroStats = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId; // From firmFilter middleware

        // Build query based on firmId or userId
        const queryFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Alternative query for models that use lawyerId
        const lawyerQuery = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        const [
            totalCases,
            activeCases,
            totalClients,
            activeClients,
            totalInvoices,
            paidInvoices,
            totalOrders,
            completedOrders
        ] = await Promise.all([
            Case.countDocuments(lawyerQuery),
            Case.countDocuments({ ...lawyerQuery, status: { $in: ['active', 'in_progress', 'open'] } }),
            Client.countDocuments(lawyerQuery),
            Client.countDocuments({ ...lawyerQuery, status: 'active' }),
            Invoice.countDocuments(lawyerQuery),
            Invoice.countDocuments({ ...lawyerQuery, status: 'paid' }),
            Order.countDocuments({ $or: [{ buyerID: userId }, { sellerID: userId }] }),
            Order.countDocuments({ $or: [{ buyerID: userId }, { sellerID: userId }], isCompleted: true })
        ]);

        return response.json({
            error: false,
            stats: {
                cases: {
                    total: totalCases,
                    active: activeCases,
                    closed: totalCases - activeCases
                },
                clients: {
                    total: totalClients,
                    active: activeClients,
                    inactive: totalClients - activeClients
                },
                invoices: {
                    total: totalInvoices,
                    paid: paidInvoices,
                    pending: totalInvoices - paidInvoices
                },
                orders: {
                    total: totalOrders,
                    completed: completedOrders,
                    active: totalOrders - completedOrders
                }
            }
        });
    } catch (error) {
        console.error('getHeroStats ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch hero stats'
        });
    }
};

// Get dashboard stats (detailed metrics)
const getDashboardStats = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Single parallel execution for all status counts
        const [casesByStatus, tasksByStatus, invoicesByStatus] = await Promise.all([
            Case.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Task.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Invoice.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        return response.json({
            error: false,
            stats: {
                cases: casesByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                tasks: tasksByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                invoices: invoicesByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('getDashboardStats ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch dashboard stats'
        });
    }
};

// Get financial summary
const getFinancialSummary = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        const [
            totalRevenue,
            totalExpenses,
            pendingInvoices,
            paidInvoices,
            totalPayments
        ] = await Promise.all([
            // Total revenue from paid invoices
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            // Total expenses
            Expense.aggregate([
                { $match: matchFilter },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            // Pending invoices total
            Invoice.aggregate([
                {
                    $match: {
                        ...matchFilter,
                        status: { $in: ['pending', 'sent', 'overdue', 'partial'] }
                    }
                },
                { $group: { _id: null, total: { $sum: '$balanceDue' } } }
            ]),
            // Paid invoices total
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            // Total payments received
            Payment.aggregate([
                { $match: { ...matchFilter, status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        const revenue = totalRevenue[0]?.total || 0;
        const expenses = totalExpenses[0]?.total || 0;
        const pending = pendingInvoices[0]?.total || 0;
        const paid = paidInvoices[0]?.total || 0;
        const payments = totalPayments[0]?.total || 0;

        return response.json({
            error: false,
            summary: {
                revenue: revenue,
                expenses: expenses,
                profit: revenue - expenses,
                pendingInvoices: pending,
                paidInvoices: paid,
                totalPayments: payments,
                netIncome: payments - expenses
            }
        });
    } catch (error) {
        console.error('getFinancialSummary ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch financial summary'
        });
    }
};

// Get today's events
const getTodayEvents = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Build query based on firmId or userId
        const queryFilter = firmId
            ? { firmId }
            : { lawyerId: userId };

        const events = await Event.find({
            ...queryFilter,
            startTime: {
                $gte: today,
                $lt: tomorrow
            }
        })
        .sort({ startTime: 1 })
        .limit(10)
        .lean();

        return response.json({
            error: false,
            events
        });
    } catch (error) {
        console.error('getTodayEvents ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch today\'s events'
        });
    }
};

// Get recent messages
const getRecentMessages = async (request, response) => {
    try {
        const userId = request.userID;
        const limit = parseInt(request.query.limit) || 10;

        // First, find all conversations where the user is involved
        const { Conversation } = require('../models');
        const conversations = await Conversation.find({
            $or: [
                { sellerID: userId },
                { buyerID: userId }
            ]
        }).lean();

        // Get conversation IDs
        const conversationIDs = conversations.map(conv => conv.conversationID);

        if (conversationIDs.length === 0) {
            return response.json({
                error: false,
                messages: []
            });
        }

        // Get recent messages from those conversations
        const messages = await Message.find({
            conversationID: { $in: conversationIDs }
        })
        .populate('userID', 'username image')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

        return response.json({
            error: false,
            messages
        });
    } catch (error) {
        console.error('getRecentMessages ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch recent messages'
        });
    }
};

// Get activity overview
const getActivityOverview = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;
        const days = parseInt(request.query.days) || 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        const [
            recentCases,
            recentClients,
            recentInvoices,
            timeEntries
        ] = await Promise.all([
            Case.countDocuments({
                ...matchFilter,
                createdAt: { $gte: startDate }
            }),
            Client.countDocuments({
                ...matchFilter,
                createdAt: { $gte: startDate }
            }),
            Invoice.countDocuments({
                ...matchFilter,
                createdAt: { $gte: startDate }
            }),
            TimeEntry.aggregate([
                {
                    $match: {
                        ...matchFilter,
                        date: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalHours: { $sum: '$hours' }
                    }
                }
            ])
        ]);

        return response.json({
            error: false,
            activity: {
                period: `Last ${days} days`,
                newCases: recentCases,
                newClients: recentClients,
                newInvoices: recentInvoices,
                hoursWorked: timeEntries[0]?.totalHours || 0
            }
        });
    } catch (error) {
        console.error('getActivityOverview ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch activity overview'
        });
    }
};

module.exports = {
    getHeroStats,
    getDashboardStats,
    getFinancialSummary,
    getTodayEvents,
    getRecentMessages,
    getActivityOverview
};
