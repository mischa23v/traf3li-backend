/**
 * Territory Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Handles territory CRUD operations and hierarchy management.
 */

const Territory = require('../models/territory.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Allowed fields for territory creation/update
const ALLOWED_CREATE_FIELDS = [
    'name',
    'nameAr',
    'code',
    'type',
    'saudiRegion',
    'countries',
    'cities',
    'postalCodes',
    'parentTerritoryId',
    'managerId',
    'salesTeamId',
    'assignedUsers',
    'targets',
    'isActive'
];

const ALLOWED_UPDATE_FIELDS = [
    'name',
    'nameAr',
    'code',
    'type',
    'saudiRegion',
    'countries',
    'cities',
    'postalCodes',
    'managerId',
    'salesTeamId',
    'assignedUsers',
    'targets',
    'isActive'
];

// ═══════════════════════════════════════════════════════════════
// CREATE TERRITORY
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new territory
 * @route POST /api/territories
 */
exports.createTerritory = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;

        // Validate required fields
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw CustomException('Territory name is required', 400);
        }

        // Sanitize IDs if provided
        if (req.body.parentTerritoryId) {
            const sanitizedParentId = sanitizeObjectId(req.body.parentTerritoryId);
            if (!sanitizedParentId) {
                throw CustomException('Invalid parent territory ID', 400);
            }
            req.body.parentTerritoryId = sanitizedParentId;
        }

        if (req.body.managerId) {
            const sanitizedManagerId = sanitizeObjectId(req.body.managerId);
            if (sanitizedManagerId) {
                req.body.managerId = sanitizedManagerId;
            } else {
                delete req.body.managerId;
            }
        }

        if (req.body.salesTeamId) {
            const sanitizedTeamId = sanitizeObjectId(req.body.salesTeamId);
            if (sanitizedTeamId) {
                req.body.salesTeamId = sanitizedTeamId;
            } else {
                delete req.body.salesTeamId;
            }
        }

        // Sanitize assignedUsers array
        if (req.body.assignedUsers && Array.isArray(req.body.assignedUsers)) {
            req.body.assignedUsers = req.body.assignedUsers
                .map(id => sanitizeObjectId(id))
                .filter(id => id !== null);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);

        // Create with firm context
        const territory = new Territory({
            ...allowedFields,
            firmId,
            createdBy: userId
        });

        await territory.save();

        // Populate for response
        await territory.populate([
            { path: 'managerId', select: 'firstName lastName avatar email' },
            { path: 'salesTeamId', select: 'name nameAr' },
            { path: 'assignedUsers', select: 'firstName lastName avatar' },
            { path: 'parentTerritoryId', select: 'name nameAr territoryId' }
        ]);

        return res.status(201).json({
            error: false,
            message: 'Territory created successfully',
            data: territory
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET TERRITORIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all territories with filters
 * @route GET /api/territories
 */
exports.getTerritories = async (req, res) => {
    try {
        const {
            search,
            type,
            saudiRegion,
            isActive,
            managerId,
            parentTerritoryId,
            page = 1,
            limit = 50
        } = req.query;

        // Build query with firm isolation
        const query = { ...req.firmQuery };

        // Safe search with escaped regex
        if (search) {
            query.$or = [
                { name: { $regex: escapeRegex(search), $options: 'i' } },
                { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
                { code: { $regex: escapeRegex(search), $options: 'i' } },
                { territoryId: { $regex: escapeRegex(search), $options: 'i' } }
            ];
        }

        // Validate type against allowlist
        const VALID_TYPES = ['country', 'region', 'city', 'district', 'custom'];
        if (type && VALID_TYPES.includes(type)) {
            query.type = type;
        }

        // Validate Saudi region against allowlist
        const VALID_REGIONS = ['riyadh', 'makkah', 'madinah', 'eastern', 'asir', 'tabuk', 'hail', 'northern_borders', 'jazan', 'najran', 'bahah', 'jawf', 'qassim'];
        if (saudiRegion && VALID_REGIONS.includes(saudiRegion)) {
            query.saudiRegion = saudiRegion;
        }

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        if (managerId) {
            const sanitizedManagerId = sanitizeObjectId(managerId);
            if (sanitizedManagerId) {
                query.managerId = sanitizedManagerId;
            }
        }

        if (parentTerritoryId) {
            if (parentTerritoryId === 'null' || parentTerritoryId === 'none') {
                query.parentTerritoryId = null;
            } else {
                const sanitizedParentId = sanitizeObjectId(parentTerritoryId);
                if (sanitizedParentId) {
                    query.parentTerritoryId = sanitizedParentId;
                }
            }
        }

        const skip = (parseInt(page) - 1) * Math.min(parseInt(limit), 100);
        const limitValue = Math.min(parseInt(limit), 100);

        const [territories, total] = await Promise.all([
            Territory.find(query)
                .populate('managerId', 'firstName lastName avatar email')
                .populate('salesTeamId', 'name nameAr')
                .populate('assignedUsers', 'firstName lastName avatar')
                .populate('parentTerritoryId', 'name nameAr territoryId')
                .sort({ level: 1, name: 1 })
                .skip(skip)
                .limit(limitValue),
            Territory.countDocuments(query)
        ]);

        return res.json({
            error: false,
            data: territories,
            pagination: {
                page: parseInt(page),
                limit: limitValue,
                total,
                pages: Math.ceil(total / limitValue)
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE TERRITORY
// ═══════════════════════════════════════════════════════════════

/**
 * Get territory by ID
 * @route GET /api/territories/:id
 */
exports.getTerritoryById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid territory ID', 400);
        }

        // IDOR Protection: Query includes firmQuery
        const territory = await Territory.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
            .populate('managerId', 'firstName lastName avatar email')
            .populate('salesTeamId', 'name nameAr')
            .populate('assignedUsers', 'firstName lastName avatar email')
            .populate('parentTerritoryId', 'name nameAr territoryId level')
            .populate('createdBy', 'firstName lastName')
            .populate('updatedBy', 'firstName lastName');

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        return res.json({ error: false, data: territory });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE TERRITORY
// ═══════════════════════════════════════════════════════════════

/**
 * Update territory
 * @route PUT /api/territories/:id
 */
exports.updateTerritory = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid territory ID', 400);
        }

        const userId = req.userID;

        // Sanitize IDs if provided
        if (req.body.managerId) {
            const sanitizedManagerId = sanitizeObjectId(req.body.managerId);
            if (sanitizedManagerId) {
                req.body.managerId = sanitizedManagerId;
            } else {
                delete req.body.managerId;
            }
        }

        if (req.body.salesTeamId) {
            const sanitizedTeamId = sanitizeObjectId(req.body.salesTeamId);
            if (sanitizedTeamId) {
                req.body.salesTeamId = sanitizedTeamId;
            } else {
                delete req.body.salesTeamId;
            }
        }

        // Sanitize assignedUsers array
        if (req.body.assignedUsers && Array.isArray(req.body.assignedUsers)) {
            req.body.assignedUsers = req.body.assignedUsers
                .map(id => sanitizeObjectId(id))
                .filter(id => id !== null);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        // IDOR Protection: Query-level ownership check
        const territory = await Territory.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    ...allowedFields,
                    updatedBy: userId,
                    updatedAt: new Date()
                }
            },
            { new: true, runValidators: true }
        ).populate([
            { path: 'managerId', select: 'firstName lastName avatar email' },
            { path: 'salesTeamId', select: 'name nameAr' },
            { path: 'assignedUsers', select: 'firstName lastName avatar' },
            { path: 'parentTerritoryId', select: 'name nameAr territoryId' }
        ]);

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        return res.json({
            error: false,
            message: 'Territory updated successfully',
            data: territory
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE TERRITORY
// ═══════════════════════════════════════════════════════════════

/**
 * Delete territory
 * @route DELETE /api/territories/:id
 */
exports.deleteTerritory = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid territory ID', 400);
        }

        // Check for child territories
        const hasChildren = await Territory.exists({
            parentTerritoryId: sanitizedId,
            ...req.firmQuery
        });

        if (hasChildren) {
            throw CustomException('Cannot delete territory with children', 400);
        }

        // IDOR Protection: Query-level ownership check
        const territory = await Territory.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        return res.json({
            error: false,
            message: 'Territory deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET TERRITORY TREE
// ═══════════════════════════════════════════════════════════════

/**
 * Get full territory hierarchy tree
 * @route GET /api/territories/:id/tree
 */
exports.getTree = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid territory ID', 400);
        }

        const firmId = req.firmId;

        // Verify territory exists and belongs to firm
        const territory = await Territory.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        // Get full tree starting from this territory
        const descendants = await territory.getDescendants();
        const ancestors = await territory.getAncestors();

        return res.json({
            error: false,
            data: {
                territory,
                ancestors,
                descendants
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET TERRITORY CHILDREN
// ═══════════════════════════════════════════════════════════════

/**
 * Get direct children of a territory
 * @route GET /api/territories/:id/children
 */
exports.getChildren = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid territory ID', 400);
        }

        const firmId = req.firmId;

        // Verify parent territory exists and belongs to firm
        const territory = await Territory.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        // Get children using static method
        const children = await Territory.getChildren(sanitizedId, firmId);

        return res.json({
            error: false,
            data: children
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET TERRITORY STATS
// ═══════════════════════════════════════════════════════════════

/**
 * Get territory statistics
 * @route GET /api/territories/:id/stats
 */
exports.getTerritoryStats = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid territory ID', 400);
        }

        // IDOR Protection: Query includes firmQuery
        const territory = await Territory.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        // Get basic stats from territory
        const stats = {
            territoryId: territory.territoryId,
            name: territory.name,
            nameAr: territory.nameAr,
            type: territory.type,
            level: territory.level,
            isGroup: territory.isGroup,
            stats: territory.stats,
            targets: territory.targets
        };

        // Calculate additional statistics
        const childCount = await Territory.countDocuments({
            parentTerritoryId: sanitizedId,
            ...req.firmQuery
        });

        stats.childCount = childCount;

        // Get descendants count (all levels)
        const descendants = await territory.getDescendants();
        stats.descendantCount = descendants.length;

        return res.json({
            error: false,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

// ═══════════════════════════════════════════════════════════════
// MOVE TERRITORY
// ═══════════════════════════════════════════════════════════════

/**
 * Move territory to a new parent
 * @route PUT /api/territories/:id/move
 */
exports.moveTerritory = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid territory ID', 400);
        }

        const { newParentId } = req.body;
        const userId = req.userID;

        // Sanitize new parent ID
        let sanitizedNewParentId = null;
        if (newParentId && newParentId !== 'null' && newParentId !== 'none') {
            sanitizedNewParentId = sanitizeObjectId(newParentId);
            if (!sanitizedNewParentId) {
                throw CustomException('Invalid new parent territory ID', 400);
            }
        }

        // Verify territory exists and belongs to firm
        const territory = await Territory.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!territory) {
            throw CustomException('Territory not found', 404);
        }

        // If new parent is specified, verify it exists and belongs to firm
        if (sanitizedNewParentId) {
            const newParent = await Territory.findOne({
                _id: sanitizedNewParentId,
                ...req.firmQuery
            });

            if (!newParent) {
                throw CustomException('New parent territory not found', 404);
            }

            // Prevent circular reference
            if (sanitizedNewParentId === sanitizedId) {
                throw CustomException('Territory cannot be its own parent', 400);
            }

            // Check if new parent is a descendant of current territory
            const descendants = await territory.getDescendants();
            const isDescendant = descendants.some(
                desc => desc._id.toString() === sanitizedNewParentId
            );

            if (isDescendant) {
                throw CustomException('Cannot move territory to its own descendant', 400);
            }
        }

        // Update parent
        territory.parentTerritoryId = sanitizedNewParentId;
        territory.updatedBy = userId;
        await territory.save();

        // Reload with populated fields
        await territory.populate([
            { path: 'managerId', select: 'firstName lastName avatar email' },
            { path: 'salesTeamId', select: 'name nameAr' },
            { path: 'parentTerritoryId', select: 'name nameAr territoryId level' }
        ]);

        return res.json({
            error: false,
            message: 'Territory moved successfully',
            data: territory
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

module.exports = {
    createTerritory,
    getTerritories,
    getTerritoryById,
    updateTerritory,
    deleteTerritory,
    getTree,
    getChildren,
    getTerritoryStats,
    moveTerritory
};
