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
    Client,
    Lead,
    Employee,
    LeaveRequest,
    Attendance
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

// Get CRM stats for dashboard
const getCRMStats = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Get start of current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [
            totalClients,
            newClientsThisMonth,
            activeClients,
            clientsByStatus,
            leadStats,
            leadsByStatus
        ] = await Promise.all([
            // Total clients
            Client.countDocuments(matchFilter),
            // New clients this month
            Client.countDocuments({
                ...matchFilter,
                createdAt: { $gte: startOfMonth }
            }),
            // Active clients
            Client.countDocuments({ ...matchFilter, status: 'active' }),
            // Clients by status
            Client.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            // Lead stats (if Lead model exists)
            Lead ? Lead.countDocuments(matchFilter).catch(() => 0) : Promise.resolve(0),
            // Leads by status
            Lead ? Lead.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).catch(() => []) : Promise.resolve([])
        ]);

        // Calculate conversion rate (leads converted to clients this month)
        const convertedLeads = leadsByStatus.find(s => s._id === 'converted')?.count || 0;
        const totalLeads = leadStats || 0;
        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

        // Count active leads (not converted, not lost)
        const activeLeads = leadsByStatus
            .filter(s => !['converted', 'lost', 'closed'].includes(s._id))
            .reduce((sum, s) => sum + s.count, 0);

        return response.json({
            error: false,
            stats: {
                totalClients,
                newClientsThisMonth,
                activeLeads,
                conversionRate: parseFloat(conversionRate),
                clientsByStatus: clientsByStatus.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {}),
                leadsByStatus: leadsByStatus.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('getCRMStats ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch CRM stats'
        });
    }
};

// Get HR stats for dashboard
const getHRStats = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get start of current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        let totalEmployees = 0;
        let activeEmployees = 0;
        let attendanceToday = 0;
        let pendingLeaves = 0;
        let openPositions = 0;

        // Try to get employee stats (if Employee model exists)
        if (Employee) {
            try {
                const employeeStats = await Employee.aggregate([
                    { $match: matchFilter },
                    {
                        $facet: {
                            total: [{ $count: 'count' }],
                            active: [
                                { $match: { status: { $in: ['active', 'Active'] } } },
                                { $count: 'count' }
                            ],
                            openPositions: [
                                { $match: { status: { $in: ['open', 'vacant', 'hiring'] } } },
                                { $count: 'count' }
                            ]
                        }
                    }
                ]);

                totalEmployees = employeeStats[0]?.total[0]?.count || 0;
                activeEmployees = employeeStats[0]?.active[0]?.count || 0;
            } catch (e) {
                console.log('Employee model query failed:', e.message);
            }
        }

        // Try to get attendance stats (if Attendance model exists)
        if (Attendance) {
            try {
                attendanceToday = await Attendance.countDocuments({
                    ...matchFilter,
                    date: { $gte: today, $lt: tomorrow },
                    status: { $in: ['present', 'Present', 'checked_in'] }
                });
            } catch (e) {
                console.log('Attendance model query failed:', e.message);
            }
        }

        // Try to get leave request stats (if LeaveRequest model exists)
        if (LeaveRequest) {
            try {
                pendingLeaves = await LeaveRequest.countDocuments({
                    ...matchFilter,
                    status: { $in: ['pending', 'Pending', 'submitted'] }
                });
            } catch (e) {
                console.log('LeaveRequest model query failed:', e.message);
            }
        }

        // Calculate attendance rate
        const attendanceRate = activeEmployees > 0
            ? ((attendanceToday / activeEmployees) * 100).toFixed(1)
            : 0;

        return response.json({
            error: false,
            stats: {
                totalEmployees,
                attendanceRate: parseFloat(attendanceRate),
                pendingLeaves,
                openPositions,
                activeEmployees,
                presentToday: attendanceToday
            }
        });
    } catch (error) {
        console.error('getHRStats ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch HR stats'
        });
    }
};

// Get Finance stats for dashboard (formatted for frontend cards)
const getFinanceStats = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        const [
            revenueData,
            expenseData,
            pendingInvoicesData,
            paidInvoicesCount
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
            // Pending invoices total and count
            Invoice.aggregate([
                {
                    $match: {
                        ...matchFilter,
                        status: { $in: ['pending', 'sent', 'overdue', 'partial'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$balanceDue' },
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Paid invoices count
            Invoice.countDocuments({ ...matchFilter, status: 'paid' })
        ]);

        const totalRevenue = revenueData[0]?.total || 0;
        const totalExpenses = expenseData[0]?.total || 0;
        const pendingInvoices = pendingInvoicesData[0]?.total || 0;
        const pendingInvoicesCount = pendingInvoicesData[0]?.count || 0;

        // Calculate profit margin
        const profitMargin = totalRevenue > 0
            ? (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1)
            : 0;

        return response.json({
            error: false,
            stats: {
                totalRevenue,
                expenses: totalExpenses,
                profitMargin: parseFloat(profitMargin),
                pendingInvoices,
                pendingInvoicesCount,
                paidInvoicesCount,
                netProfit: totalRevenue - totalExpenses
            }
        });
    } catch (error) {
        console.error('getFinanceStats ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch finance stats'
        });
    }
};

/**
 * Get combined dashboard summary - GOLD STANDARD single API call
 * Replaces 7 separate API calls with one parallel-executed query
 * Target response time: < 200ms
 */
const getDashboardSummary = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // User-specific filter for reminders and messages
        const userFilter = { userId: new mongoose.Types.ObjectId(userId) };

        // Today's date range for events
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Import models needed for this endpoint
        const { Conversation, Reminder } = require('../models');

        // Execute ALL queries in parallel - this is the key optimization
        const [
            // Case stats
            caseStatsResult,
            // Task stats
            taskStatsResult,
            // Message stats (unread count)
            conversationsData,
            // Reminder stats
            reminderStatsResult,
            // Today's events
            todayEventsResult,
            // Financial summary
            revenueData,
            expenseData,
            pendingInvoicesData,
            overdueInvoicesData,
            // Recent messages
            recentMessagesData
        ] = await Promise.all([
            // 1. Case stats - aggregate by status
            Case.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: [{ $in: ['$status', ['active', 'in_progress', 'open']] }, 1, 0] } },
                        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
                    }
                }
            ]),

            // 2. Task stats - aggregate by status
            Task.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        todo: { $sum: { $cond: [{ $in: ['$status', ['todo', 'pending', 'not_started']] }, 1, 0] } },
                        in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                        completed: { $sum: { $cond: [{ $in: ['$status', ['completed', 'done']] }, 1, 0] } },
                        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
                    }
                }
            ]),

            // 3. Conversations with unread messages
            Conversation.aggregate([
                {
                    $match: {
                        $or: [
                            { sellerID: new mongoose.Types.ObjectId(userId) },
                            { buyerID: new mongoose.Types.ObjectId(userId) }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'messages',
                        localField: 'conversationID',
                        foreignField: 'conversationID',
                        as: 'messages'
                    }
                },
                {
                    $project: {
                        conversationID: 1,
                        totalMessages: { $size: '$messages' },
                        unreadMessages: {
                            $size: {
                                $filter: {
                                    input: '$messages',
                                    as: 'msg',
                                    cond: {
                                        $and: [
                                            { $ne: ['$$msg.userID', new mongoose.Types.ObjectId(userId)] },
                                            { $ne: ['$$msg.read', true] }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalConversations: { $sum: 1 },
                        totalMessages: { $sum: '$totalMessages' },
                        unreadMessages: { $sum: '$unreadMessages' },
                        unreadConversations: { $sum: { $cond: [{ $gt: ['$unreadMessages', 0] }, 1, 0] } }
                    }
                }
            ]),

            // 4. Reminder stats using static method logic
            Reminder.aggregate([
                { $match: userFilter },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                        snoozed: { $sum: { $cond: [{ $eq: ['$status', 'snoozed'] }, 1, 0] } }
                    }
                }
            ]),

            // 5. Today's events
            Event.find({
                ...(firmId ? { firmId } : { lawyerId: userId }),
                startTime: { $gte: today, $lt: tomorrow }
            })
            .sort({ startTime: 1 })
            .limit(10)
            .select('_id title startTime endTime location type status')
            .lean(),

            // 6. Financial - Revenue (paid invoices)
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),

            // 7. Financial - Expenses
            Expense.aggregate([
                { $match: matchFilter },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),

            // 8. Financial - Pending invoices
            Invoice.aggregate([
                { $match: { ...matchFilter, status: { $in: ['pending', 'sent', 'partial'] } } },
                { $group: { _id: null, total: { $sum: '$balanceDue' } } }
            ]),

            // 9. Financial - Overdue invoices
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'overdue' } },
                { $group: { _id: null, total: { $sum: '$balanceDue' } } }
            ]),

            // 10. Recent messages (reusing existing logic)
            (async () => {
                const conversations = await Conversation.find({
                    $or: [
                        { sellerID: userId },
                        { buyerID: userId }
                    ]
                }).lean();

                const conversationIDs = conversations.map(conv => conv.conversationID);

                if (conversationIDs.length === 0) {
                    return [];
                }

                return await Message.find({
                    conversationID: { $in: conversationIDs }
                })
                .populate('userID', 'username image')
                .sort({ createdAt: -1 })
                .limit(3)
                .lean();
            })()
        ]);

        // Build response matching frontend expected schema
        const caseStats = caseStatsResult[0] || { total: 0, active: 0, closed: 0, pending: 0 };
        const taskStats = taskStatsResult[0] || { total: 0, todo: 0, in_progress: 0, completed: 0, cancelled: 0 };
        const messageData = conversationsData[0] || { unreadMessages: 0, unreadConversations: 0, totalConversations: 0, totalMessages: 0 };
        const reminderStats = reminderStatsResult[0] || { total: 0, pending: 0, completed: 0, snoozed: 0 };

        const totalRevenue = revenueData[0]?.total || 0;
        const totalExpenses = expenseData[0]?.total || 0;
        const pendingAmount = pendingInvoicesData[0]?.total || 0;
        const overdueAmount = overdueInvoicesData[0]?.total || 0;

        return response.json({
            success: true,
            data: {
                caseStats: {
                    total: caseStats.total,
                    active: caseStats.active,
                    pending: caseStats.pending,
                    closed: caseStats.closed
                },
                taskStats: {
                    total: taskStats.total,
                    byStatus: {
                        todo: taskStats.todo,
                        in_progress: taskStats.in_progress,
                        completed: taskStats.completed,
                        cancelled: taskStats.cancelled
                    }
                },
                messageStats: {
                    unreadMessages: messageData.unreadMessages,
                    unreadConversations: messageData.unreadConversations,
                    totalConversations: messageData.totalConversations,
                    totalMessages: messageData.totalMessages
                },
                reminderStats: {
                    total: reminderStats.total,
                    byStatus: {
                        pending: reminderStats.pending,
                        completed: reminderStats.completed,
                        snoozed: reminderStats.snoozed
                    }
                },
                todayEvents: todayEventsResult.map(event => ({
                    _id: event._id,
                    title: event.title,
                    startDate: event.startTime,
                    endDate: event.endTime,
                    location: event.location,
                    type: event.type,
                    status: event.status
                })),
                financialSummary: {
                    totalRevenue,
                    totalExpenses,
                    pendingAmount,
                    overdueAmount
                },
                recentMessages: recentMessagesData.map(msg => ({
                    _id: msg._id,
                    text: msg.text,
                    conversationID: msg.conversationID,
                    userID: msg.userID,
                    createdAt: msg.createdAt
                }))
            }
        });
    } catch (error) {
        console.error('getDashboardSummary ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch dashboard summary'
        });
    }
};

module.exports = {
    getHeroStats,
    getDashboardStats,
    getFinancialSummary,
    getTodayEvents,
    getRecentMessages,
    getActivityOverview,
    getCRMStats,
    getHRStats,
    getFinanceStats,
    getDashboardSummary
};
