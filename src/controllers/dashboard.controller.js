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
    Attendance,
    Document
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

// Get upcoming hearings/court dates
const getUpcomingHearings = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;
        const days = parseInt(request.query.days) || 7;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Calculate date range
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        // Get cases with upcoming hearings
        const casesWithHearings = await Case.aggregate([
            { $match: matchFilter },
            { $unwind: '$hearings' },
            {
                $match: {
                    'hearings.date': { $gte: now, $lte: futureDate },
                    'hearings.status': { $ne: 'cancelled' }
                }
            },
            {
                $project: {
                    _id: '$hearings._id',
                    caseId: '$_id',
                    caseName: '$title',
                    caseNumber: '$caseNumber',
                    court: '$hearings.location',
                    courtRoom: '$hearings.courtRoom',
                    date: '$hearings.date',
                    type: '$hearings.type',
                    notes: '$hearings.notes',
                    status: '$hearings.status'
                }
            },
            { $sort: { date: 1 } },
            { $limit: 20 }
        ]);

        // Also get court-related events
        const courtEvents = await Event.find({
            ...matchFilter,
            eventType: { $in: ['court_hearing', 'hearing', 'court_date', 'trial'] },
            startTime: { $gte: now, $lte: futureDate },
            status: { $ne: 'cancelled' }
        })
        .populate('caseId', 'title caseNumber')
        .sort({ startTime: 1 })
        .limit(20)
        .lean();

        // Combine and format
        const hearings = [
            ...casesWithHearings.map(h => ({
                ...h,
                source: 'case'
            })),
            ...courtEvents.map(e => ({
                _id: e._id,
                caseId: e.caseId?._id,
                caseName: e.caseId?.title || e.title,
                caseNumber: e.caseId?.caseNumber,
                court: e.location,
                courtRoom: e.courtRoom,
                date: e.startTime,
                type: e.eventType,
                notes: e.description,
                status: e.status,
                source: 'event'
            }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        return response.json({
            error: false,
            hearings: hearings.slice(0, 20),
            total: hearings.length
        });
    } catch (error) {
        console.error('getUpcomingHearings ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch upcoming hearings'
        });
    }
};

// Get upcoming case deadlines
const getUpcomingDeadlines = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;
        const days = parseInt(request.query.days) || 14;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Calculate date range
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        // Get deadline-type tasks
        const deadlineTasks = await Task.find({
            ...matchFilter,
            taskType: { $in: ['filing_deadline', 'appeal_deadline', 'discovery', 'deposition', 'response'] },
            dueDate: { $gte: now, $lte: futureDate },
            status: { $nin: ['done', 'canceled'] }
        })
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 })
        .limit(30)
        .lean();

        // Get all tasks with upcoming due dates that are high priority
        const urgentTasks = await Task.find({
            ...matchFilter,
            priority: { $in: ['high', 'urgent'] },
            dueDate: { $gte: now, $lte: futureDate },
            status: { $nin: ['done', 'canceled'] },
            taskType: { $nin: ['filing_deadline', 'appeal_deadline', 'discovery', 'deposition', 'response'] }
        })
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 })
        .limit(20)
        .lean();

        // Combine and format
        const allDeadlines = [...deadlineTasks, ...urgentTasks];

        const deadlines = allDeadlines.map(task => {
            const daysRemaining = Math.ceil((new Date(task.dueDate) - now) / (1000 * 60 * 60 * 24));
            return {
                _id: task._id,
                caseId: task.caseId?._id,
                caseName: task.caseId?.title || 'غير محدد',
                caseNumber: task.caseId?.caseNumber,
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                type: task.taskType || 'general',
                priority: task.priority || 'medium',
                daysRemaining,
                status: task.status
            };
        }).sort((a, b) => a.daysRemaining - b.daysRemaining);

        return response.json({
            error: false,
            deadlines,
            total: deadlines.length
        });
    } catch (error) {
        console.error('getUpcomingDeadlines ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch upcoming deadlines'
        });
    }
};

// Get billable hours summary
const getBillableHoursSummary = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        // Date calculations
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        // Week start (Sunday)
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        // Month start
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Execute all queries in parallel
        const [todayStats, weekStats, monthStats, unbilledStats, rateStats] = await Promise.all([
            // Today's entries
            TimeEntry.aggregate([
                {
                    $match: {
                        ...matchFilter,
                        date: { $gte: todayStart, $lt: todayEnd }
                    }
                },
                {
                    $group: {
                        _id: null,
                        hours: { $sum: { $divide: ['$duration', 60] } },
                        amount: { $sum: '$finalAmount' }
                    }
                }
            ]),
            // This week's entries
            TimeEntry.aggregate([
                {
                    $match: {
                        ...matchFilter,
                        date: { $gte: weekStart }
                    }
                },
                {
                    $group: {
                        _id: null,
                        hours: { $sum: { $divide: ['$duration', 60] } },
                        amount: { $sum: '$finalAmount' }
                    }
                }
            ]),
            // This month's entries
            TimeEntry.aggregate([
                {
                    $match: {
                        ...matchFilter,
                        date: { $gte: monthStart }
                    }
                },
                {
                    $group: {
                        _id: null,
                        hours: { $sum: { $divide: ['$duration', 60] } },
                        amount: { $sum: '$finalAmount' }
                    }
                }
            ]),
            // Unbilled entries
            TimeEntry.aggregate([
                {
                    $match: {
                        ...matchFilter,
                        billStatus: { $in: ['unbilled', 'pending'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        hours: { $sum: { $divide: ['$duration', 60] } },
                        amount: { $sum: '$finalAmount' }
                    }
                }
            ]),
            // Average hourly rate
            TimeEntry.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        avgRate: { $avg: '$hourlyRate' }
                    }
                }
            ])
        ]);

        return response.json({
            error: false,
            summary: {
                today: {
                    hours: parseFloat((todayStats[0]?.hours || 0).toFixed(2)),
                    amount: Math.round(todayStats[0]?.amount || 0)
                },
                thisWeek: {
                    hours: parseFloat((weekStats[0]?.hours || 0).toFixed(2)),
                    amount: Math.round(weekStats[0]?.amount || 0)
                },
                thisMonth: {
                    hours: parseFloat((monthStats[0]?.hours || 0).toFixed(2)),
                    amount: Math.round(monthStats[0]?.amount || 0)
                },
                unbilled: {
                    hours: parseFloat((unbilledStats[0]?.hours || 0).toFixed(2)),
                    amount: Math.round(unbilledStats[0]?.amount || 0)
                },
                hourlyRate: Math.round(rateStats[0]?.avgRate || 0)
            }
        });
    } catch (error) {
        console.error('getBillableHoursSummary ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch billable hours summary'
        });
    }
};

// Get documents pending action
const getPendingDocuments = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;

        // Build match filter
        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        const now = new Date();

        // Get documents needing review (recently uploaded, no access)
        const recentDocs = await Document.find({
            ...matchFilter,
            createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
            accessCount: 0 // Never accessed/reviewed
        })
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

        // Get shared documents awaiting client response
        const sharedDocs = await Document.find({
            ...matchFilter,
            shareToken: { $exists: true, $ne: null },
            shareExpiresAt: { $gt: now }
        })
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

        // Get contract documents (likely needing signatures)
        const contractDocs = await Document.find({
            ...matchFilter,
            category: 'contract',
            createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) }
        })
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

        // Format documents
        const formatDoc = (doc, status) => ({
            _id: doc._id,
            name: doc.originalName || doc.fileName,
            caseId: doc.caseId?._id,
            caseName: doc.caseId?.title,
            clientName: doc.clientId ? `${doc.clientId.firstName} ${doc.clientId.lastName}` : null,
            category: doc.category,
            status,
            createdAt: doc.createdAt,
            daysWaiting: Math.ceil((now - new Date(doc.createdAt)) / (1000 * 60 * 60 * 24))
        });

        const documents = [
            ...recentDocs.map(d => formatDoc(d, 'awaiting_review')),
            ...sharedDocs.map(d => formatDoc(d, 'awaiting_client')),
            ...contractDocs.filter(d => !recentDocs.find(r => r._id.equals(d._id)))
                .map(d => formatDoc(d, 'awaiting_signature'))
        ];

        // Remove duplicates
        const uniqueDocs = documents.filter((doc, index, self) =>
            index === self.findIndex(d => d._id.toString() === doc._id.toString())
        );

        // Count by status
        const counts = {
            awaitingSignature: uniqueDocs.filter(d => d.status === 'awaiting_signature').length,
            awaitingReview: uniqueDocs.filter(d => d.status === 'awaiting_review').length,
            awaitingClient: uniqueDocs.filter(d => d.status === 'awaiting_client').length
        };

        return response.json({
            error: false,
            documents: uniqueDocs.slice(0, 20),
            counts,
            total: uniqueDocs.length
        });
    } catch (error) {
        console.error('getPendingDocuments ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch pending documents'
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
    getUpcomingHearings,
    getUpcomingDeadlines,
    getBillableHoursSummary,
    getPendingDocuments
};
