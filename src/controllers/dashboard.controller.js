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
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper function to verify firmId ownership
const verifyFirmAccess = async (userId, firmId) => {
    if (!firmId) return true; // No firm context, user-specific access

    // Sanitize firmId to prevent injection
    const sanitizedFirmId = sanitizeObjectId(firmId);
    if (!sanitizedFirmId) {
        throw new CustomException('Invalid firm ID', 400);
    }

    // IDOR Protection: Verify user belongs to the firm with single query
    const { Firm } = require('../models');
    const userIdStr = userId.toString();

    const firm = await Firm.findOne({
        _id: sanitizedFirmId,
        $or: [
            { ownerId: userId },
            { 'members.userId': userId },
            { members: userId }
        ]
    }).lean();

    if (!firm) {
        throw new CustomException('Firm not found or access denied', 404);
    }

    return sanitizedFirmId;
};

// Helper function to validate and sanitize query parameters
const validateQueryParams = (query) => {
    const validated = {};

    // Validate limit parameter
    if (query.limit) {
        const limit = parseInt(query.limit, 10);
        if (isNaN(limit) || limit < 1 || limit > 1000) {
            throw new CustomException('Invalid limit parameter. Must be between 1 and 1000', 400);
        }
        validated.limit = limit;
    }

    // Validate days parameter
    if (query.days) {
        const days = parseInt(query.days, 10);
        if (isNaN(days) || days < 1 || days > 365) {
            throw new CustomException('Invalid days parameter. Must be between 1 and 365', 400);
        }
        validated.days = days;
    }

    // Validate period parameter
    if (query.period) {
        const validPeriods = ['week', 'month', 'quarter', 'year'];
        if (!validPeriods.includes(query.period)) {
            throw new CustomException('Invalid period parameter. Must be one of: week, month, quarter, year', 400);
        }
        validated.period = query.period;
    }

    return validated;
};

// Helper function to validate date ranges
const validateDateRange = (startDate, endDate) => {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        throw new CustomException('Invalid start date', 400);
    }

    if (endDate && (!(endDate instanceof Date) || isNaN(endDate.getTime()))) {
        throw new CustomException('Invalid end date', 400);
    }

    if (endDate && startDate > endDate) {
        throw new CustomException('Start date cannot be after end date', 400);
    }

    // Prevent unreasonably large date ranges (e.g., more than 10 years)
    const maxRangeMs = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
    if (endDate && (endDate - startDate) > maxRangeMs) {
        throw new CustomException('Date range too large. Maximum 10 years allowed', 400);
    }

    return true;
};

// Get hero stats (top-level metrics)
const getHeroStats = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId; // From firmFilter middleware

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

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
        logger.error('getHeroStats ERROR:', error);
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

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

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
        logger.error('getDashboardStats ERROR:', error);
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

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

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
        logger.error('getFinancialSummary ERROR:', error);
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

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Validate date range
        validateDateRange(today, tomorrow);

        // Build query based on firmId or userId
        const queryFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

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
        logger.error('getTodayEvents ERROR:', error);
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

        // Input validation for query parameters
        const validatedParams = validateQueryParams(request.query);
        const limit = validatedParams.limit || 10;

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
        logger.error('getRecentMessages ERROR:', error);
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

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

        // Input validation for query parameters
        const validatedParams = validateQueryParams(request.query);
        const days = validatedParams.days || 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Validate date range
        validateDateRange(startDate, new Date());

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
        logger.error('getActivityOverview ERROR:', error);
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

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Get start of current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Validate date range
        validateDateRange(startOfMonth, new Date());

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
        logger.error('getCRMStats ERROR:', error);
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

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

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

        // Validate date ranges
        validateDateRange(today, tomorrow);
        validateDateRange(startOfMonth, new Date());

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
                logger.info('Employee model query failed:', e.message);
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
                logger.info('Attendance model query failed:', e.message);
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
                logger.info('LeaveRequest model query failed:', e.message);
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
        logger.error('getHRStats ERROR:', error);
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

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

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
        logger.error('getFinanceStats ERROR:', error);
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

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

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

        // Validate date range
        validateDateRange(today, tomorrow);

        // Import models needed for this endpoint
        const { Reminder } = require('../models');

        // Execute ALL queries in parallel - this is the key optimization
        // REMOVED: Heavy conversation/messages aggregate (#3) - frontend will fetch separately
        const [
            // Case stats
            caseStatsResult,
            // Task stats
            taskStatsResult,
            // Reminder stats
            reminderStatsResult,
            // Today's events
            todayEventsResult,
            // Financial summary
            revenueData,
            expenseData,
            pendingInvoicesData,
            overdueInvoicesData
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

            // 3. Reminder stats
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

            // 4. Today's events
            Event.find({
                ...(firmId ? { firmId: new mongoose.Types.ObjectId(firmId) } : { lawyerId: new mongoose.Types.ObjectId(userId) }),
                startTime: { $gte: today, $lt: tomorrow }
            })
            .sort({ startTime: 1 })
            .limit(10)
            .select('_id title startTime endTime location type status')
            .lean(),

            // 5. Financial - Revenue (paid invoices)
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),

            // 6. Financial - Expenses
            Expense.aggregate([
                { $match: matchFilter },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),

            // 7. Financial - Pending invoices
            Invoice.aggregate([
                { $match: { ...matchFilter, status: { $in: ['pending', 'sent', 'partial'] } } },
                { $group: { _id: null, total: { $sum: '$balanceDue' } } }
            ]),

            // 8. Financial - Overdue invoices
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'overdue' } },
                { $group: { _id: null, total: { $sum: '$balanceDue' } } }
            ])
        ]);

        // Build response matching frontend expected schema
        const caseStats = caseStatsResult[0] || { total: 0, active: 0, closed: 0, pending: 0 };
        const taskStats = taskStatsResult[0] || { total: 0, todo: 0, in_progress: 0, completed: 0, cancelled: 0 };
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
                }
            }
        });
    } catch (error) {
        logger.error('getDashboardSummary ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch dashboard summary'
        });
    }
};

/**
 * GET /api/dashboard/analytics
 * Consolidated analytics endpoint - replaces 9 separate API calls
 * Returns: revenue, clients, cases, invoices data in one response
 */
const getAnalytics = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Get date ranges
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Validate date ranges
        validateDateRange(startOfMonth, now);
        validateDateRange(startOfLastMonth, endOfLastMonth);

        const [
            // Revenue data
            totalRevenueData,
            monthlyRevenueData,
            lastMonthRevenueData,
            // Client data
            totalClients,
            newClientsThisMonth,
            newClientsLastMonth,
            // Case data
            caseStats,
            // Invoice data
            invoiceStats
        ] = await Promise.all([
            // Total revenue (all time)
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            // Monthly revenue (this month)
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'paid', paidDate: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            // Last month revenue
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'paid', paidDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            // Total clients
            Client.countDocuments(matchFilter),
            // New clients this month
            Client.countDocuments({ ...matchFilter, createdAt: { $gte: startOfMonth } }),
            // New clients last month
            Client.countDocuments({ ...matchFilter, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            // Case stats
            Case.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        open: { $sum: { $cond: [{ $in: ['$status', ['active', 'in_progress', 'open', 'pending']] }, 1, 0] } },
                        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                        won: { $sum: { $cond: [{ $eq: ['$outcome', 'won'] }, 1, 0] } },
                        lost: { $sum: { $cond: [{ $eq: ['$outcome', 'lost'] }, 1, 0] } }
                    }
                }
            ]),
            // Invoice stats
            Invoice.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        pending: { $sum: { $cond: [{ $in: ['$status', ['pending', 'sent']] }, '$balanceDue', 0] } },
                        overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$balanceDue', 0] } },
                        collected: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] } }
                    }
                }
            ])
        ]);

        const totalRevenue = totalRevenueData[0]?.total || 0;
        const monthlyRevenue = monthlyRevenueData[0]?.total || 0;
        const lastMonthRevenue = lastMonthRevenueData[0]?.total || 0;
        const revenueGrowth = lastMonthRevenue > 0
            ? (((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
            : 0;

        const clientGrowth = newClientsLastMonth > 0
            ? (((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100).toFixed(1)
            : 0;

        const cases = caseStats[0] || { total: 0, open: 0, closed: 0, won: 0, lost: 0 };
        const completionRate = cases.total > 0
            ? ((cases.closed / cases.total) * 100).toFixed(1)
            : 0;

        const invoices = invoiceStats[0] || { pending: 0, overdue: 0, collected: 0 };

        return response.json({
            success: true,
            data: {
                revenue: {
                    total: totalRevenue,
                    monthly: monthlyRevenue,
                    growth: parseFloat(revenueGrowth)
                },
                clients: {
                    total: totalClients,
                    new: newClientsThisMonth,
                    growth: parseFloat(clientGrowth)
                },
                cases: {
                    total: cases.total,
                    open: cases.open,
                    closed: cases.closed,
                    completionRate: parseFloat(completionRate)
                },
                invoices: {
                    pending: invoices.pending,
                    overdue: invoices.overdue,
                    collected: invoices.collected
                }
            }
        });
    } catch (error) {
        logger.error('getAnalytics ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch analytics'
        });
    }
};

/**
 * GET /api/dashboard/reports?period=month|week|quarter|year
 * Consolidated reports endpoint - replaces 3 separate chart API calls
 * Returns: casesChart, revenueChart, tasksChart with totals
 */
const getReports = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // IDOR Protection: Verify firm access
        await verifyFirmAccess(userId, firmId);

        // Input validation for query parameters
        const validatedParams = validateQueryParams(request.query);
        const period = validatedParams.period || 'month';

        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Calculate date range based on period
        const now = new Date();
        let startDate, groupFormat, labels;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                labels = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
                    return d.toISOString().split('T')[0];
                });
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                labels = Array.from({ length: 3 }, (_, i) => {
                    const d = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1);
                    return d.toISOString().slice(0, 7);
                });
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                labels = Array.from({ length: 12 }, (_, i) => {
                    const d = new Date(now.getFullYear(), i, 1);
                    return d.toISOString().slice(0, 7);
                });
                break;
            default: // month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                labels = Array.from({ length: daysInMonth }, (_, i) => {
                    const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
                    return d.toISOString().split('T')[0];
                });
        }

        // Validate date range
        validateDateRange(startDate, now);

        const [casesData, revenueData, tasksData] = await Promise.all([
            // Cases by date
            Case.aggregate([
                { $match: { ...matchFilter, createdAt: { $gte: startDate } } },
                { $group: { _id: groupFormat, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            // Revenue by date (from paid invoices)
            Invoice.aggregate([
                { $match: { ...matchFilter, status: 'paid', paidDate: { $gte: startDate } } },
                { $group: { _id: { $dateToString: { format: period === 'week' || period === 'month' ? '%Y-%m-%d' : '%Y-%m', date: '$paidDate' } }, total: { $sum: '$totalAmount' } } },
                { $sort: { _id: 1 } }
            ]),
            // Tasks by date
            Task.aggregate([
                { $match: { ...matchFilter, createdAt: { $gte: startDate } } },
                { $group: { _id: groupFormat, count: { $sum: 1 }, completed: { $sum: { $cond: [{ $in: ['$status', ['completed', 'done']] }, 1, 0] } } } },
                { $sort: { _id: 1 } }
            ])
        ]);

        // Map data to labels
        const casesMap = Object.fromEntries(casesData.map(d => [d._id, d.count]));
        const revenueMap = Object.fromEntries(revenueData.map(d => [d._id, d.total]));
        const tasksMap = Object.fromEntries(tasksData.map(d => [d._id, { count: d.count, completed: d.completed }]));

        return response.json({
            success: true,
            data: {
                period,
                casesChart: {
                    labels,
                    data: labels.map(l => casesMap[l] || 0),
                    totals: {
                        total: casesData.reduce((sum, d) => sum + d.count, 0)
                    }
                },
                revenueChart: {
                    labels,
                    data: labels.map(l => revenueMap[l] || 0),
                    totals: {
                        total: revenueData.reduce((sum, d) => sum + d.total, 0)
                    }
                },
                tasksChart: {
                    labels,
                    data: labels.map(l => tasksMap[l]?.count || 0),
                    completed: labels.map(l => tasksMap[l]?.completed || 0),
                    totals: {
                        total: tasksData.reduce((sum, d) => sum + d.count, 0),
                        completed: tasksData.reduce((sum, d) => sum + d.completed, 0)
                    }
                }
            }
        });
    } catch (error) {
        logger.error('getReports ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch reports'
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
    getDashboardSummary,
    getAnalytics,
    getReports
};
