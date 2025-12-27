/**
 * Admin Firms Controller
 *
 * Comprehensive firm management endpoints for admin panels.
 *
 * Features:
 * - List all firms with statistics
 * - Get detailed firm information
 * - View firm usage metrics
 * - Update firm plan/subscription
 * - Suspend/unsuspend firms
 */

const { User, Firm, Case, Invoice, Payment, Subscription } = require('../models');
const logger = require('../utils/logger');
const {
    sanitizeForLog,
    sanitizePagination,
    sanitizeString,
    sanitizeObjectId
} = require('../utils/securityUtils');
const auditLogService = require('../services/auditLog.service');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * List all firms with statistics
 * GET /api/admin/firms
 */
const listFirms = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Only super admins (no firmId) can list all firms
        if (adminUser.firmId) {
            return res.status(403).json({
                error: true,
                message: 'This endpoint is only available to super administrators',
                code: 'SUPER_ADMIN_ONLY'
            });
        }

        // Pagination
        const paginationParams = sanitizePagination(req.query, {
            maxLimit: 100,
            defaultLimit: 20,
            defaultPage: 1
        });

        // Filters
        const filters = {};

        // Filter by status
        if (req.query.status && ['active', 'suspended', 'trial', 'cancelled'].includes(req.query.status)) {
            filters.status = req.query.status;
        }

        // Search by name or email
        if (req.query.search) {
            const searchTerm = sanitizeString(req.query.search);
            filters.$or = [
                { name: new RegExp(escapeRegex(searchTerm), 'i') },
                { email: new RegExp(escapeRegex(searchTerm), 'i') }
            ];
        }

        // Filter by date range
        if (req.query.createdFrom || req.query.createdTo) {
            filters.createdAt = {};
            if (req.query.createdFrom) {
                filters.createdAt.$gte = new Date(req.query.createdFrom);
            }
            if (req.query.createdTo) {
                filters.createdAt.$lte = new Date(req.query.createdTo);
            }
        }

        // Sort options
        let sortOption = { createdAt: -1 };
        if (req.query.sortBy) {
            const sortField = req.query.sortBy;
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

            const allowedSortFields = ['createdAt', 'name', 'userCount'];
            if (allowedSortFields.includes(sortField)) {
                sortOption = { [sortField]: sortOrder };
            }
        }

        // Get firms with user count
        const firms = await Firm.aggregate([
            { $match: filters },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'firmId',
                    as: 'users'
                }
            },
            {
                $addFields: {
                    userCount: { $size: '$users' }
                }
            },
            {
                $project: {
                    users: 0 // Remove users array from output
                }
            },
            { $sort: sortOption },
            { $skip: paginationParams.skip },
            { $limit: paginationParams.limit }
        ]);

        const total = await Firm.countDocuments(filters);

        // Get additional stats for each firm
        const firmIds = firms.map(f => f._id);

        const [caseStats, invoiceStats, subscriptionData] = await Promise.all([
            // Cases per firm
            Case.aggregate([
                { $match: { firmId: { $in: firmIds } } },
                {
                    $group: {
                        _id: '$firmId',
                        totalCases: { $sum: 1 },
                        activeCases: {
                            $sum: {
                                $cond: [
                                    { $in: ['$status', ['open', 'in_progress']] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),

            // Invoices per firm
            Invoice.aggregate([
                { $match: { firmId: { $in: firmIds } } },
                {
                    $group: {
                        _id: '$firmId',
                        totalInvoices: { $sum: 1 },
                        totalRevenue: { $sum: '$total' }
                    }
                }
            ]),

            // Subscriptions
            Subscription.find({ firmId: { $in: firmIds } })
                .select('firmId plan status')
                .lean()
        ]);

        // Map stats to firms
        const firmsWithStats = firms.map(firm => {
            const cases = caseStats.find(c => c._id.toString() === firm._id.toString());
            const invoices = invoiceStats.find(i => i._id.toString() === firm._id.toString());
            const subscription = subscriptionData.find(s => s.firmId.toString() === firm._id.toString());

            return {
                ...firm,
                stats: {
                    users: firm.userCount || 0,
                    cases: cases?.totalCases || 0,
                    activeCases: cases?.activeCases || 0,
                    invoices: invoices?.totalInvoices || 0,
                    revenue: invoices?.totalRevenue || 0
                },
                subscription: subscription || null
            };
        });

        // Log admin action
        await auditLogService.log(
            'admin_list_firms',
            'system',
            null,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'low',
                details: {
                    filters: sanitizeForLog(req.query),
                    resultCount: firms.length
                }
            }
        );

        return res.json({
            error: false,
            data: firmsWithStats,
            pagination: {
                total,
                limit: paginationParams.limit,
                skip: paginationParams.skip,
                page: Math.floor(paginationParams.skip / paginationParams.limit) + 1,
                pages: Math.ceil(total / paginationParams.limit)
            }
        });

    } catch (error) {
        logger.error('Admin listFirms error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch firms',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get detailed firm information
 * GET /api/admin/firms/:id
 */
const getFirmDetails = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Validate firm ID
        const firmId = sanitizeObjectId(req.params.id);
        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID',
                code: 'INVALID_INPUT'
            });
        }

        // Get firm details
        const firm = await Firm.findById(firmId).lean();

        if (!firm) {
            return res.status(404).json({
                error: true,
                message: 'Firm not found',
                code: 'NOT_FOUND'
            });
        }

        // For firm admins, only allow viewing their own firm
        if (adminUser.firmId && adminUser.firmId.toString() !== firmId) {
            return res.status(403).json({
                error: true,
                message: 'Cannot access details of different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Get comprehensive statistics
        const [
            users,
            usersByRole,
            casesCount,
            activeCases,
            invoicesCount,
            totalRevenue,
            subscription,
            revenueByMonth
        ] = await Promise.all([
            // All users
            User.find({ firmId })
                .select('firstName lastName email role status lastLogin createdAt')
                .lean(),

            // Users by role
            User.aggregate([
                { $match: { firmId } },
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Cases
            Case.countDocuments({ firmId }),

            // Active cases
            Case.countDocuments({ firmId, status: { $in: ['open', 'in_progress'] } }),

            // Invoices
            Invoice.countDocuments({ firmId }),

            // Total revenue
            Payment.aggregate([
                { $match: { firmId } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).then(result => result[0]?.total || 0),

            // Subscription
            Subscription.findOne({ firmId }).lean(),

            // Revenue by month (last 12 months)
            Payment.aggregate([
                {
                    $match: {
                        firmId,
                        createdAt: {
                            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
                        }
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
            ])
        ]);

        // Compile detailed firm info
        const firmDetails = {
            ...firm,
            stats: {
                users: users.length,
                usersByRole,
                cases: casesCount,
                activeCases,
                invoices: invoicesCount,
                totalRevenue,
                revenueByMonth
            },
            users: users.slice(0, 20), // Limit to first 20 users
            subscription
        };

        // Log admin action
        await auditLogService.log(
            'admin_view_firm_details',
            'firm',
            firmId,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'low',
                details: {
                    firmId,
                    firmName: firm.name
                }
            }
        );

        return res.json({
            error: false,
            data: firmDetails
        });

    } catch (error) {
        logger.error('Admin getFirmDetails error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch firm details',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get firm usage metrics
 * GET /api/admin/firms/:id/usage
 */
const getFirmUsage = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Validate firm ID
        const firmId = sanitizeObjectId(req.params.id);
        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID',
                code: 'INVALID_INPUT'
            });
        }

        // Check firm exists
        const firm = await Firm.findById(firmId).select('name').lean();

        if (!firm) {
            return res.status(404).json({
                error: true,
                message: 'Firm not found',
                code: 'NOT_FOUND'
            });
        }

        // For firm admins, only allow viewing their own firm
        if (adminUser.firmId && adminUser.firmId.toString() !== firmId) {
            return res.status(403).json({
                error: true,
                message: 'Cannot access usage metrics of different firm',
                code: 'FIRM_ACCESS_DENIED'
            });
        }

        // Time range (default last 30 days)
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get usage metrics
        const [
            activeUsers,
            totalUsers,
            casesCreated,
            invoicesCreated,
            paymentsProcessed,
            documentsUploaded,
            apiCalls,
            storageUsed
        ] = await Promise.all([
            // Active users (logged in during period)
            User.countDocuments({
                firmId,
                lastLogin: { $gte: startDate }
            }),

            // Total users
            User.countDocuments({ firmId }),

            // Cases created during period
            Case.countDocuments({
                firmId,
                createdAt: { $gte: startDate }
            }),

            // Invoices created
            Invoice.countDocuments({
                firmId,
                createdAt: { $gte: startDate }
            }),

            // Payments processed
            Payment.countDocuments({
                firmId,
                createdAt: { $gte: startDate }
            }),

            // Documents uploaded (if you have a Document model)
            // Placeholder - adjust based on your schema
            Promise.resolve(0),

            // API calls from audit logs
            require('../models').AuditLog.countDocuments({
                firmId,
                createdAt: { $gte: startDate }
            }),

            // Storage used (if tracked)
            // Placeholder - implement based on your storage tracking
            Promise.resolve(0)
        ]);

        // Activity by day
        const activityByDay = await require('../models').AuditLog.aggregate([
            {
                $match: {
                    firmId,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    actions: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const usage = {
            period: {
                days,
                startDate: startDate.toISOString(),
                endDate: new Date().toISOString()
            },
            users: {
                total: totalUsers,
                active: activeUsers,
                activeRate: totalUsers > 0
                    ? ((activeUsers / totalUsers) * 100).toFixed(2)
                    : 0
            },
            activity: {
                casesCreated,
                invoicesCreated,
                paymentsProcessed,
                documentsUploaded,
                apiCalls
            },
            storage: {
                used: storageUsed,
                unit: 'MB'
            },
            activityByDay
        };

        return res.json({
            error: false,
            data: usage
        });

    } catch (error) {
        logger.error('Admin getFirmUsage error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to fetch firm usage',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Update firm plan/subscription
 * PATCH /api/admin/firms/:id/plan
 */
const updateFirmPlan = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Only super admins can update plans
        if (adminUser.firmId) {
            return res.status(403).json({
                error: true,
                message: 'Only super administrators can update firm plans',
                code: 'SUPER_ADMIN_ONLY'
            });
        }

        // Validate firm ID
        const firmId = sanitizeObjectId(req.params.id);
        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID',
                code: 'INVALID_INPUT'
            });
        }

        const { plan, status, notes } = req.body;

        // Validate plan
        const validPlans = ['free', 'basic', 'professional', 'enterprise'];
        if (!plan || !validPlans.includes(plan)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid plan. Must be one of: ' + validPlans.join(', '),
                code: 'INVALID_PLAN'
            });
        }

        // Get firm
        const firm = await Firm.findById(firmId);

        if (!firm) {
            return res.status(404).json({
                error: true,
                message: 'Firm not found',
                code: 'NOT_FOUND'
            });
        }

        // Update or create subscription
        let subscription = await Subscription.findOne({ firmId });

        const oldPlan = subscription?.plan || 'free';
        const oldStatus = subscription?.status || 'active';

        if (subscription) {
            subscription.plan = plan;
            if (status) subscription.status = status;
            subscription.updatedAt = new Date();
            await subscription.save();
        } else {
            subscription = await Subscription.create({
                firmId,
                plan,
                status: status || 'active'
            });
        }

        // Log admin action
        await auditLogService.log(
            'admin_update_firm_plan',
            'firm',
            firmId,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'high',
                details: {
                    firmId,
                    firmName: firm.name,
                    oldPlan,
                    newPlan: plan,
                    oldStatus,
                    newStatus: status || oldStatus,
                    notes: sanitizeForLog(notes || 'Not provided')
                }
            }
        );

        return res.json({
            error: false,
            message: 'Firm plan updated successfully',
            data: {
                firmId,
                firmName: firm.name,
                oldPlan,
                newPlan: plan,
                subscription
            }
        });

    } catch (error) {
        logger.error('Admin updateFirmPlan error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to update firm plan',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

/**
 * Suspend or unsuspend a firm
 * PATCH /api/admin/firms/:id/suspend
 */
const suspendFirm = async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId || req.userID).select('role firmId email').lean();

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({
                error: true,
                message: 'Admin access required',
                code: 'ADMIN_ONLY'
            });
        }

        // Only super admins can suspend firms
        if (adminUser.firmId) {
            return res.status(403).json({
                error: true,
                message: 'Only super administrators can suspend firms',
                code: 'SUPER_ADMIN_ONLY'
            });
        }

        // Validate firm ID
        const firmId = sanitizeObjectId(req.params.id);
        if (!firmId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid firm ID',
                code: 'INVALID_INPUT'
            });
        }

        const { suspend, reason } = req.body;

        // Get firm
        const firm = await Firm.findById(firmId);

        if (!firm) {
            return res.status(404).json({
                error: true,
                message: 'Firm not found',
                code: 'NOT_FOUND'
            });
        }

        const oldStatus = firm.status;
        const newStatus = suspend ? 'suspended' : 'active';

        // Update firm status
        firm.status = newStatus;
        await firm.save();

        // If suspending, revoke all user tokens from this firm
        if (suspend) {
            const users = await User.find({ firmId }).select('_id').lean();
            const tokenRevocationService = require('../services/tokenRevocation.service');

            for (const user of users) {
                await tokenRevocationService.revokeAllUserTokens(
                    user._id,
                    'account_suspended',
                    {
                        revokedBy: adminUser._id || req.userId || req.userID,
                        metadata: {
                            reason: 'Firm suspended',
                            firmId
                        }
                    }
                );
            }
        }

        // Log admin action
        await auditLogService.log(
            suspend ? 'admin_suspend_firm' : 'admin_unsuspend_firm',
            'firm',
            firmId,
            'SUCCESS',
            {
                userId: adminUser._id || req.userId || req.userID,
                userEmail: adminUser.email,
                userRole: 'admin',
                ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                method: req.method,
                endpoint: req.originalUrl,
                severity: 'critical',
                details: {
                    firmId,
                    firmName: firm.name,
                    oldStatus,
                    newStatus,
                    reason: sanitizeForLog(reason || 'Not provided')
                }
            }
        );

        return res.json({
            error: false,
            message: `Firm ${suspend ? 'suspended' : 'activated'} successfully`,
            data: {
                firmId,
                firmName: firm.name,
                oldStatus,
                newStatus
            }
        });

    } catch (error) {
        logger.error('Admin suspendFirm error:', sanitizeForLog(error.message));
        return res.status(500).json({
            error: true,
            message: 'Failed to update firm status',
            messageEn: 'An error occurred while processing your request'
        });
    }
};

module.exports = {
    listFirms,
    getFirmDetails,
    getFirmUsage,
    updateFirmPlan,
    suspendFirm
};
