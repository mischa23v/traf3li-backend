/**
 * Audit Logs Extended Routes
 *
 * Extended audit log management with batch operations and statistics.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /stats                              - Get audit log statistics
 * - POST /batch                             - Batch create audit logs
 * - GET /resource/:resource/:resourceId     - Get logs for specific resource
 * - GET /user/:userId                       - Get logs for specific user
 * - GET /export                             - Export audit logs
 * - GET /recent                             - Get recent activity
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AuditLog = require('../models/auditLog.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for batch creation
const ALLOWED_LOG_FIELDS = [
    'action', 'resource', 'resourceId', 'description', 'metadata',
    'ipAddress', 'userAgent', 'userId', 'changes'
];

// Valid actions
const VALID_ACTIONS = ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'approve', 'reject'];

/**
 * GET /stats - Get audit log statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { dateFrom, dateTo, resource, userId } = req.query;

        const matchQuery = { ...req.firmQuery };

        if (dateFrom || dateTo) {
            matchQuery.createdAt = {};
            if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom);
            if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo);
        }
        if (resource) {
            matchQuery.resource = resource;
        }
        if (userId) {
            matchQuery.userId = sanitizeObjectId(userId, 'userId');
        }

        const [
            totalLogs,
            byAction,
            byResource,
            byUser,
            recentActivity
        ] = await Promise.all([
            AuditLog.countDocuments(matchQuery),
            AuditLog.aggregate([
                { $match: matchQuery },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            AuditLog.aggregate([
                { $match: matchQuery },
                { $group: { _id: '$resource', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            AuditLog.aggregate([
                { $match: matchQuery },
                { $group: { _id: '$userId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        count: 1,
                        userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] }
                    }
                }
            ]),
            AuditLog.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: -1 } },
                { $limit: 30 }
            ])
        ]);

        res.json({
            success: true,
            data: {
                totalLogs,
                byAction: byAction.reduce((acc, item) => {
                    acc[item._id || 'unknown'] = item.count;
                    return acc;
                }, {}),
                topResources: byResource.map(r => ({
                    resource: r._id,
                    count: r.count
                })),
                topUsers: byUser.map(u => ({
                    userId: u._id,
                    userName: u.userName || 'Unknown',
                    count: u.count
                })),
                activityByDay: recentActivity.map(a => ({
                    date: a._id,
                    count: a.count
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /batch - Batch create audit logs
 */
router.post('/batch', async (req, res, next) => {
    try {
        const { logs } = req.body;

        if (!Array.isArray(logs) || logs.length === 0) {
            throw CustomException('Logs array is required', 400);
        }

        if (logs.length > 100) {
            throw CustomException('Maximum 100 logs per request', 400);
        }

        const results = { created: 0, errors: [] };

        const logsToCreate = [];
        for (let i = 0; i < logs.length; i++) {
            try {
                const safeData = pickAllowedFields(logs[i], ALLOWED_LOG_FIELDS);

                if (!safeData.action || !safeData.resource) {
                    results.errors.push({ index: i, error: 'Action and resource are required' });
                    continue;
                }

                if (!VALID_ACTIONS.includes(safeData.action)) {
                    results.errors.push({ index: i, error: `Invalid action: ${safeData.action}` });
                    continue;
                }

                if (safeData.resourceId) {
                    safeData.resourceId = sanitizeObjectId(safeData.resourceId, 'resourceId');
                }
                if (safeData.userId) {
                    safeData.userId = sanitizeObjectId(safeData.userId, 'userId');
                }

                logsToCreate.push(req.addFirmId({
                    ...safeData,
                    userId: safeData.userId || req.userID,
                    ipAddress: safeData.ipAddress || req.ip,
                    userAgent: safeData.userAgent || req.get('user-agent')
                }));
            } catch (err) {
                results.errors.push({ index: i, error: err.message });
            }
        }

        if (logsToCreate.length > 0) {
            await AuditLog.insertMany(logsToCreate);
            results.created = logsToCreate.length;
        }

        res.status(201).json({
            success: true,
            message: `Created ${results.created} logs, ${results.errors.length} errors`,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /resource/:resource/:resourceId - Get logs for specific resource
 */
router.get('/resource/:resource/:resourceId', async (req, res, next) => {
    try {
        const { resource, resourceId } = req.params;
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { action, dateFrom, dateTo } = req.query;

        const sanitizedResourceId = sanitizeObjectId(resourceId, 'resourceId');

        const query = {
            ...req.firmQuery,
            resource,
            resourceId: sanitizedResourceId
        };

        if (action) {
            if (!VALID_ACTIONS.includes(action)) {
                throw CustomException(`Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`, 400);
            }
            query.action = action;
        }
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'firstName lastName email')
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /user/:userId - Get logs for specific user
 */
router.get('/user/:userId', async (req, res, next) => {
    try {
        const userId = sanitizeObjectId(req.params.userId, 'userId');
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { action, resource, dateFrom, dateTo } = req.query;

        const query = {
            ...req.firmQuery,
            userId
        };

        if (action) {
            query.action = action;
        }
        if (resource) {
            query.resource = resource;
        }
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /export - Export audit logs
 */
router.get('/export', async (req, res, next) => {
    try {
        const { format = 'json', action, resource, dateFrom, dateTo, userId } = req.query;

        const query = { ...req.firmQuery };

        if (action) {
            query.action = action;
        }
        if (resource) {
            query.resource = resource;
        }
        if (userId) {
            query.userId = sanitizeObjectId(userId, 'userId');
        }
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .limit(10000) // Safety limit
            .populate('userId', 'firstName lastName email')
            .lean();

        if (format === 'csv') {
            const headers = ['Timestamp', 'Action', 'Resource', 'Resource ID', 'User', 'IP Address', 'Description'];
            const csvRows = [headers.join(',')];

            for (const log of logs) {
                const row = [
                    log.createdAt ? new Date(log.createdAt).toISOString() : '',
                    log.action || '',
                    log.resource || '',
                    log.resourceId || '',
                    log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : '',
                    log.ipAddress || '',
                    `"${(log.description || '').replace(/"/g, '""')}"`
                ];
                csvRows.push(row.join(','));
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
            return res.send(csvRows.join('\n'));
        }

        res.json({
            success: true,
            data: logs,
            exportedAt: new Date(),
            count: logs.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /recent - Get recent activity across all resources
 */
router.get('/recent', async (req, res, next) => {
    try {
        const { limit = 50, action, resource } = req.query;
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);

        const query = { ...req.firmQuery };

        if (action) {
            query.action = action;
        }
        if (resource) {
            query.resource = resource;
        }

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .limit(parsedLimit)
            .populate('userId', 'firstName lastName email')
            .lean();

        // Group by time periods
        const now = new Date();
        const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
        const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const grouped = {
            lastHour: logs.filter(l => new Date(l.createdAt) >= lastHour),
            today: logs.filter(l => new Date(l.createdAt) >= lastDay && new Date(l.createdAt) < lastHour),
            thisWeek: logs.filter(l => new Date(l.createdAt) >= lastWeek && new Date(l.createdAt) < lastDay),
            older: logs.filter(l => new Date(l.createdAt) < lastWeek)
        };

        res.json({
            success: true,
            data: {
                logs,
                grouped: {
                    lastHour: grouped.lastHour.length,
                    today: grouped.today.length,
                    thisWeek: grouped.thisWeek.length,
                    older: grouped.older.length
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
