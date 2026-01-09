/**
 * Territories Routes
 *
 * Sales territory management - CRUD and user assignments.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                        - List all territories
 * - POST /                       - Create territory
 * - GET /:id                     - Get territory by ID
 * - PUT /:id                     - Update territory
 * - DELETE /:id                  - Delete territory
 * - POST /:id/users              - Assign users to territory
 * - DELETE /:id/users/:userId    - Remove user from territory
 * - GET /:id/stats               - Get territory statistics
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const User = require('../models/user.model');
const Client = require('../models/client.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Allowed fields for create/update
const ALLOWED_FIELDS = [
    'name', 'description', 'region', 'country', 'states', 'cities',
    'postalCodes', 'manager', 'isActive', 'color', 'priority', 'quota'
];

/**
 * GET / - List all territories
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit } = sanitizePagination(req.query);
        const { isActive, region, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('crm.territories').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let territories = firm.crm?.territories || [];

        // Apply filters
        if (isActive !== undefined) {
            const active = isActive === 'true';
            territories = territories.filter(t => t.isActive === active);
        }

        if (region) {
            territories = territories.filter(t =>
                t.region?.toLowerCase().includes(region.toLowerCase())
            );
        }

        if (search) {
            const searchLower = search.toLowerCase();
            territories = territories.filter(t =>
                t.name?.toLowerCase().includes(searchLower) ||
                t.description?.toLowerCase().includes(searchLower)
            );
        }

        const total = territories.length;
        territories = territories.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            data: territories,
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
 * POST / - Create territory
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_FIELDS);

        if (!safeData.name) {
            throw CustomException('Territory name is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('crm.territories');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.crm) firm.crm = {};
        if (!firm.crm.territories) firm.crm.territories = [];

        // Check for duplicate name
        const existing = firm.crm.territories.find(
            t => t.name?.toLowerCase() === safeData.name.toLowerCase()
        );
        if (existing) {
            throw CustomException('A territory with this name already exists', 400);
        }

        // Validate manager if provided
        if (safeData.manager) {
            safeData.manager = sanitizeObjectId(safeData.manager, 'manager');
        }

        const territory = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            users: [],
            isActive: safeData.isActive !== false,
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.crm.territories.push(territory);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Territory created',
            data: territory
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id - Get territory by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const territoryId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('crm.territories').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const territory = (firm.crm?.territories || []).find(
            t => t._id?.toString() === territoryId.toString()
        );

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        // Get user details
        const userIds = territory.users || [];
        let users = [];
        if (userIds.length > 0) {
            users = await User.find({ _id: { $in: userIds } })
                .select('firstName lastName email avatar role')
                .lean();
        }

        // Get manager details
        let manager = null;
        if (territory.manager) {
            manager = await User.findById(territory.manager)
                .select('firstName lastName email avatar')
                .lean();
        }

        res.json({
            success: true,
            data: {
                ...territory,
                users,
                manager,
                userCount: users.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:id - Update territory
 */
router.put('/:id', async (req, res, next) => {
    try {
        const territoryId = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_FIELDS);

        const firm = await Firm.findOne(req.firmQuery).select('crm.territories');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const territory = (firm.crm?.territories || []).find(
            t => t._id?.toString() === territoryId.toString()
        );

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        // Check for duplicate name
        if (safeData.name) {
            const existing = firm.crm.territories.find(
                t => t._id?.toString() !== territoryId.toString() &&
                     t.name?.toLowerCase() === safeData.name.toLowerCase()
            );
            if (existing) {
                throw CustomException('A territory with this name already exists', 400);
            }
        }

        // Validate manager if provided
        if (safeData.manager) {
            safeData.manager = sanitizeObjectId(safeData.manager, 'manager');
        }

        // Apply updates
        Object.assign(territory, safeData);
        territory.updatedBy = req.userID;
        territory.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Territory updated',
            data: territory
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete territory
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const territoryId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('crm.territories');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const territoryIndex = (firm.crm?.territories || []).findIndex(
            t => t._id?.toString() === territoryId.toString()
        );

        if (territoryIndex === -1) {
            throw CustomException('Territory not found', 404);
        }

        firm.crm.territories.splice(territoryIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Territory deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/users - Assign users to territory
 */
router.post('/:id/users', async (req, res, next) => {
    try {
        const territoryId = sanitizeObjectId(req.params.id, 'id');
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            throw CustomException('User IDs array is required', 400);
        }

        if (userIds.length > 50) {
            throw CustomException('Maximum 50 users per assignment', 400);
        }

        const safeUserIds = userIds.map(id => sanitizeObjectId(id, 'userId'));

        const firm = await Firm.findOne(req.firmQuery).select('crm.territories');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const territory = (firm.crm?.territories || []).find(
            t => t._id?.toString() === territoryId.toString()
        );

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        if (!territory.users) territory.users = [];

        // Add only new users
        let addedCount = 0;
        safeUserIds.forEach(userId => {
            if (!territory.users.some(u => u.toString() === userId.toString())) {
                territory.users.push(userId);
                addedCount++;
            }
        });

        territory.updatedAt = new Date();
        await firm.save();

        res.status(201).json({
            success: true,
            message: `${addedCount} user(s) added to territory`,
            data: {
                territoryId,
                usersAdded: addedCount,
                totalUsers: territory.users.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id/users/:userId - Remove user from territory
 */
router.delete('/:id/users/:userId', async (req, res, next) => {
    try {
        const territoryId = sanitizeObjectId(req.params.id, 'id');
        const userId = sanitizeObjectId(req.params.userId, 'userId');

        const firm = await Firm.findOne(req.firmQuery).select('crm.territories');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const territory = (firm.crm?.territories || []).find(
            t => t._id?.toString() === territoryId.toString()
        );

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        if (!territory.users) territory.users = [];

        const userIndex = territory.users.findIndex(u => u.toString() === userId.toString());
        if (userIndex === -1) {
            throw CustomException('User is not assigned to this territory', 404);
        }

        territory.users.splice(userIndex, 1);
        territory.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'User removed from territory',
            data: {
                territoryId,
                userId,
                totalUsers: territory.users.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/stats - Get territory statistics
 */
router.get('/:id/stats', async (req, res, next) => {
    try {
        const territoryId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery)
            .select('crm.territories crm.deals crm.leads')
            .lean();

        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const territory = (firm.crm?.territories || []).find(
            t => t._id?.toString() === territoryId.toString()
        );

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        const userIds = new Set((territory.users || []).map(u => u.toString()));

        // Get clients in territory
        const clients = await Client.countDocuments({
            ...req.firmQuery,
            territoryId
        });

        // Count deals by territory users
        const deals = (firm.crm?.deals || []).filter(d => {
            const ownerId = d.ownerId?.toString() || d.assignedTo?.toString();
            return userIds.has(ownerId) || d.territoryId?.toString() === territoryId.toString();
        });

        const wonDeals = deals.filter(d => d.status === 'won' || d.stage === 'won');
        const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || d.amount || 0), 0);

        // Count leads
        const leads = (firm.crm?.leads || []).filter(l => {
            const ownerId = l.ownerId?.toString() || l.assignedTo?.toString();
            return userIds.has(ownerId) || l.territoryId?.toString() === territoryId.toString();
        });

        const convertedLeads = leads.filter(l => l.status === 'converted');

        res.json({
            success: true,
            data: {
                territoryId,
                territoryName: territory.name,
                stats: {
                    users: userIds.size,
                    clients,
                    deals: {
                        total: deals.length,
                        won: wonDeals.length,
                        winRate: deals.length > 0
                            ? Math.round((wonDeals.length / deals.length) * 100)
                            : 0
                    },
                    leads: {
                        total: leads.length,
                        converted: convertedLeads.length,
                        conversionRate: leads.length > 0
                            ? Math.round((convertedLeads.length / leads.length) * 100)
                            : 0
                    },
                    revenue: {
                        total: totalRevenue,
                        avgDealSize: wonDeals.length > 0
                            ? Math.round(totalRevenue / wonDeals.length)
                            : 0
                    },
                    quota: {
                        target: territory.quota || null,
                        progress: territory.quota && territory.quota > 0
                            ? Math.round((totalRevenue / territory.quota) * 100)
                            : null
                    }
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
