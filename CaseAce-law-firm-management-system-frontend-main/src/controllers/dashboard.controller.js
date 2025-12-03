const {
    Case,
    Task,
    Invoice,
    Message,
    Event,
    Order,
    Expense,
    Payment,
    TimeEntry
} = require('../models');
const { CustomException } = require('../utils');

// Get hero stats (top-level metrics)
const getHeroStats = async (request, response) => {
    try {
        const userId = request.userID;

        const [
            totalCases,
            activeCases,
            totalTasks,
            activeTasks,
            totalInvoices,
            paidInvoices,
            totalOrders,
            completedOrders
        ] = await Promise.all([
            Case.countDocuments({ userID: userId }),
            Case.countDocuments({ userID: userId, status: { $in: ['open', 'in-progress'] } }),
            Task.countDocuments({ userID: userId }),
            Task.countDocuments({ userID: userId, status: { $in: ['pending', 'in-progress'] } }),
            Invoice.countDocuments({ userID: userId }),
            Invoice.countDocuments({ userID: userId, status: 'paid' }),
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
                tasks: {
                    total: totalTasks,
                    active: activeTasks,
                    completed: totalTasks - activeTasks
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

        // Get cases by status
        const casesByStatus = await Case.aggregate([
            { $match: { userID: userId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Get tasks by status
        const tasksByStatus = await Task.aggregate([
            { $match: { userID: userId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Get invoices by status
        const invoicesByStatus = await Invoice.aggregate([
            { $match: { userID: userId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
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

        const [
            totalRevenue,
            totalExpenses,
            pendingInvoices,
            paidInvoices
        ] = await Promise.all([
            // Total revenue from completed orders
            Order.aggregate([
                {
                    $match: {
                        sellerID: userId,
                        isCompleted: true
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$price' }
                    }
                }
            ]),
            // Total expenses
            Expense.aggregate([
                { $match: { userID: userId } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            // Pending invoices total
            Invoice.aggregate([
                {
                    $match: {
                        userID: userId,
                        status: { $in: ['pending', 'sent', 'overdue'] }
                    }
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            // Paid invoices total
            Invoice.aggregate([
                { $match: { userID: userId, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ])
        ]);

        const revenue = totalRevenue[0]?.total || 0;
        const expenses = totalExpenses[0]?.total || 0;
        const pending = pendingInvoices[0]?.total || 0;
        const paid = paidInvoices[0]?.total || 0;

        return response.json({
            error: false,
            summary: {
                revenue: revenue,
                expenses: expenses,
                profit: revenue - expenses,
                pendingInvoices: pending,
                paidInvoices: paid,
                netIncome: revenue - expenses
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const events = await Event.find({
            userID: userId,
            startDate: {
                $gte: today,
                $lt: tomorrow
            }
        })
        .sort({ startDate: 1 })
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
        const days = parseInt(request.query.days) || 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [
            recentCases,
            recentTasks,
            recentOrders,
            timeEntries
        ] = await Promise.all([
            Case.countDocuments({
                userID: userId,
                createdAt: { $gte: startDate }
            }),
            Task.countDocuments({
                userID: userId,
                createdAt: { $gte: startDate }
            }),
            Order.countDocuments({
                $or: [{ buyerID: userId }, { sellerID: userId }],
                createdAt: { $gte: startDate }
            }),
            TimeEntry.aggregate([
                {
                    $match: {
                        userID: userId,
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
                newTasks: recentTasks,
                newOrders: recentOrders,
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
