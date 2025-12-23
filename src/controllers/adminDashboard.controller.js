/**
 * Admin Dashboard Controller
 *
 * Provides comprehensive dashboard metrics and analytics for admin panels
 * like Appsmith and Budibase.
 *
 * Features:
 * - Dashboard summary with key metrics
 * - Revenue and financial metrics
 * - Active user statistics
 * - System health monitoring
 * - Pending approvals overview
 * - Recent activity feed
 */

const { User, Firm, Case, Invoice, Payment, Subscription, AuditLog, ApprovalRequest } = require('../models');
const logger = require('../utils/logger');
const { sanitizeForLog, sanitizePagination } = require('../utils/securityUtils');

/**
 * Get dashboard summary with overview statistics
 * GET /api/admin/dashboard/summary
 */
const getDashboardSummary = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};

        // Calculate date ranges
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Parallel queries for better performance
        const [
            totalUsers,
            activeUsersToday,
            activeUsersThisMonth,
            newUsersThisMonth,
            totalFirms,
            activeFirms,
            totalCases,
            activeCases,
            totalInvoices,
            paidInvoices,
            totalRevenue,
            revenueThisMonth,
            pendingApprovals,
            activeSubscriptions
        ] = await Promise.all([
            // User metrics
            User.countDocuments(firmFilter),
            User.countDocuments({
                ...firmFilter,
                lastLogin: { $gte: startOfToday }
            }),
            User.countDocuments({
                ...firmFilter,
                lastLogin: { $gte: startOfMonth }
            }),
            User.countDocuments({
                ...firmFilter,
                createdAt: { $gte: startOfMonth }
            }),

            // Firm metrics (only for super admin)
            adminUser.firmId ? 1 : Firm.countDocuments({}),
            adminUser.firmId ? 1 : Firm.countDocuments({ status: 'active' }),

            // Case metrics
            Case.countDocuments(firmFilter),
            Case.countDocuments({ ...firmFilter, status: { $in: ['open', 'in_progress'] } }),

            // Invoice metrics
            Invoice.countDocuments(firmFilter),
            Invoice.countDocuments({ ...firmFilter, status: 'paid' }),

            // Revenue metrics
            Payment.aggregate([
                { $match: firmFilter },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).then(result => result[0]?.total || 0),
            Payment.aggregate([
                { $match: { ...firmFilter, createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).then(result => result[0]?.total || 0),

            // Pending approvals
            ApprovalRequest.countDocuments({
                ...firmFilter,
                status: 'pending'
            }),

            // Subscription metrics
            Subscription.countDocuments({
                ...firmFilter,
                status: 'active'
            })
        ]);

        // Calculate growth rates
        const usersLastMonth = await User.countDocuments({
            ...firmFilter,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        const userGrowthRate = usersLastMonth > 0
            ? ((newUsersThisMonth - usersLastMonth) / usersLastMonth * 100).toFixed(2)
            : 100;

        // Calculate revenue last month for comparison
        const revenueLastMonth = await Payment.aggregate([
            {
                $match: {
                    ...firmFilter,
                    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(result => result[0]?.total || 0);

        const revenueGrowthRate = revenueLastMonth > 0
            ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(2)
            : 100;

        const summary = {
            users: {
                total: totalUsers,
                activeToday: activeUsersToday,
                activeThisMonth: activeUsersThisMonth,
                newThisMonth: newUsersThisMonth,
                growthRate: parseFloat(userGrowthRate)
            },
            firms: {
                total: totalFirms,
                active: activeFirms
            },
            cases: {
                total: totalCases,
                active: activeCases,
                closed: totalCases - activeCases
            },
            invoices: {
                total: totalInvoices,
                paid: paidInvoices,
                pending: totalInvoices - paidInvoices,
                paymentRate: totalInvoices > 0
                    ? ((paidInvoices / totalInvoices) * 100).toFixed(2)
                    : 0
            },
            revenue: {
                total: totalRevenue,
                thisMonth: revenueThisMonth,
                lastMonth: revenueLastMonth,
                growthRate: parseFloat(revenueGrowthRate)
            },
            approvals: {
                pending: pendingApprovals
            },
            subscriptions: {
                active: activeSubscriptions
            },
            generatedAt: new Date().toISOString()
        };

        return res.json({
            error: false,
            data: summary
        });

    } catch (error) {
        logger.error('Admin getDashboardSummary error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch dashboard summary',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get revenue metrics and financial analytics
 * GET /api/admin/dashboard/revenue
 */
const getRevenueMetrics = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};

        // Date range from query params or default to last 12 months
        const months = parseInt(req.query.months) || 12;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        // Revenue by month
        const revenueByMonth = await Payment.aggregate([
            {
                $match: {
                    ...firmFilter,
                    createdAt: { $gte: startDate },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Revenue by payment method
        const revenueByMethod = await Payment.aggregate([
            {
                $match: {
                    ...firmFilter,
                    createdAt: { $gte: startDate },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    revenue: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Top paying clients
        const topClients = await Payment.aggregate([
            {
                $match: {
                    ...firmFilter,
                    createdAt: { $gte: startDate },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalPaid: { $sum: '$amount' },
                    paymentCount: { $sum: 1 }
                }
            },
            { $sort: { totalPaid: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    email: '$user.email',
                    totalPaid: 1,
                    paymentCount: 1
                }
            }
        ]);

        // Revenue statistics
        const totalRevenue = revenueByMonth.reduce((sum, item) => sum + item.revenue, 0);
        const avgMonthlyRevenue = revenueByMonth.length > 0
            ? totalRevenue / revenueByMonth.length
            : 0;

        return res.json({
            error: false,
            data: {
                summary: {
                    totalRevenue,
                    avgMonthlyRevenue: parseFloat(avgMonthlyRevenue.toFixed(2)),
                    periodMonths: months
                },
                byMonth: revenueByMonth,
                byPaymentMethod: revenueByMethod,
                topClients
            }
        });

    } catch (error) {
        logger.error('Admin getRevenueMetrics error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch revenue metrics',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get active users and activity metrics
 * GET /api/admin/dashboard/active-users
 */
const getActiveUsers = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};

        // Time ranges
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Active users by time period
        const [
            activeLast24h,
            activeLast7d,
            activeLast30d
        ] = await Promise.all([
            User.countDocuments({ ...firmFilter, lastLogin: { $gte: last24Hours } }),
            User.countDocuments({ ...firmFilter, lastLogin: { $gte: last7Days } }),
            User.countDocuments({ ...firmFilter, lastLogin: { $gte: last30Days } })
        ]);

        // Users by role
        const usersByRole = await User.aggregate([
            { $match: firmFilter },
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [
                                { $gte: ['$lastLogin', last7Days] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Recently active users
        const recentlyActive = await User.find({
            ...firmFilter,
            lastLogin: { $gte: last24Hours }
        })
        .select('firstName lastName email role lastLogin')
        .sort({ lastLogin: -1 })
        .limit(20)
        .lean();

        // User activity by day (last 30 days)
        const activityByDay = await User.aggregate([
            {
                $match: {
                    ...firmFilter,
                    lastLogin: { $gte: last30Days }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$lastLogin'
                        }
                    },
                    activeUsers: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return res.json({
            error: false,
            data: {
                activeUsers: {
                    last24Hours: activeLast24h,
                    last7Days: activeLast7d,
                    last30Days: activeLast30d
                },
                byRole: usersByRole,
                recentlyActive,
                activityByDay
            }
        });

    } catch (error) {
        logger.error('Admin getActiveUsers error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch active users',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get system health and performance metrics
 * GET /api/admin/dashboard/system-health
 */
const getSystemHealth = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Database health
        const mongoose = require('mongoose');
        const dbState = mongoose.connection.readyState;
        const dbStates = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        // Database statistics
        const dbStats = await mongoose.connection.db.stats();

        // Recent errors from audit logs (last 24 hours)
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentErrors = await AuditLog.countDocuments({
            status: 'FAILED',
            createdAt: { $gte: last24Hours }
        });

        // Security incidents (last 7 days)
        const SecurityIncident = require('../models/securityIncident.model');
        const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentIncidents = await SecurityIncident.countDocuments({
            createdAt: { $gte: last7Days }
        });

        // System uptime
        const uptime = process.uptime();
        const uptimeHours = (uptime / 3600).toFixed(2);

        // Memory usage
        const memUsage = process.memoryUsage();
        const memoryMB = {
            rss: (memUsage.rss / 1024 / 1024).toFixed(2),
            heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
            heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
            external: (memUsage.external / 1024 / 1024).toFixed(2)
        };

        return res.json({
            error: false,
            data: {
                database: {
                    status: dbStates[dbState],
                    healthy: dbState === 1,
                    collections: dbStats.collections || 0,
                    dataSize: `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`,
                    storageSize: `${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`,
                    indexes: dbStats.indexes || 0
                },
                server: {
                    uptime: `${uptimeHours} hours`,
                    uptimeSeconds: uptime,
                    nodeVersion: process.version,
                    platform: process.platform,
                    memory: memoryMB
                },
                errors: {
                    last24Hours: recentErrors
                },
                security: {
                    incidentsLast7Days: recentIncidents
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Admin getSystemHealth error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch system health',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get pending approvals and items requiring attention
 * GET /api/admin/dashboard/pending-approvals
 */
const getPendingApprovals = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};

        // Pagination
        const paginationParams = sanitizePagination(req.query, {
            maxLimit: 100,
            defaultLimit: 20,
            defaultPage: 1
        });

        // Get pending approval requests
        const pendingApprovals = await ApprovalRequest.find({
            ...firmFilter,
            status: 'pending'
        })
        .populate('requestedBy', 'firstName lastName email')
        .populate('approvers', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(paginationParams.limit)
        .skip(paginationParams.skip)
        .lean();

        const totalPending = await ApprovalRequest.countDocuments({
            ...firmFilter,
            status: 'pending'
        });

        // Get pending invoices (unpaid, overdue)
        const now = new Date();
        const overdueInvoices = await Invoice.countDocuments({
            ...firmFilter,
            status: { $in: ['sent', 'overdue'] },
            dueDate: { $lt: now }
        });

        // Get unverified users (if applicable)
        const unverifiedUsers = await User.countDocuments({
            ...firmFilter,
            role: 'lawyer',
            isVerified: false
        });

        return res.json({
            error: false,
            data: {
                approvals: {
                    items: pendingApprovals,
                    total: totalPending
                },
                invoices: {
                    overdue: overdueInvoices
                },
                users: {
                    unverified: unverifiedUsers
                }
            },
            pagination: {
                limit: paginationParams.limit,
                skip: paginationParams.skip,
                total: totalPending
            }
        });

    } catch (error) {
        logger.error('Admin getPendingApprovals error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch pending approvals',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get recent activity feed
 * GET /api/admin/dashboard/recent-activity
 */
const getRecentActivity = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Build filter for multi-tenancy
        const firmFilter = adminUser.firmId ? { firmId: adminUser.firmId } : {};

        // Pagination
        const paginationParams = sanitizePagination(req.query, {
            maxLimit: 100,
            defaultLimit: 50,
            defaultPage: 1
        });

        // Get recent audit logs
        const recentActivity = await AuditLog.find(firmFilter)
            .sort({ createdAt: -1 })
            .limit(paginationParams.limit)
            .skip(paginationParams.skip)
            .select('action resourceType resourceId status userId userEmail createdAt details severity')
            .lean();

        const totalActivity = await AuditLog.countDocuments(firmFilter);

        // Activity statistics
        const activityStats = await AuditLog.aggregate([
            { $match: firmFilter },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        return res.json({
            error: false,
            data: {
                activities: recentActivity,
                stats: activityStats
            },
            pagination: {
                limit: paginationParams.limit,
                skip: paginationParams.skip,
                total: totalActivity
            }
        });

    } catch (error) {
        logger.error('Admin getRecentActivity error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch recent activity',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

module.exports = {
    getDashboardSummary,
    getRevenueMetrics,
    getActiveUsers,
    getSystemHealth,
    getPendingApprovals,
    getRecentActivity
};
