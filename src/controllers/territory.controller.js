/**
 * Territory Controller
 *
 * Handles territory CRUD operations and hierarchy management.
 */

const Territory = require('../models/territory.model');
const CrmActivity = require('../models/crmActivity.model');

// ═══════════════════════════════════════════════════════════════
// LIST TERRITORIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all territories with filters
 */
exports.getAll = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const {
            enabled,
            parentId,
            isGroup,
            search,
            page = 1,
            limit = 50
        } = req.query;

        const query = { firmId };

        if (enabled !== undefined) {
            query.enabled = enabled === 'true';
        }
        if (parentId) {
            query.parentTerritoryId = parentId === 'null' ? null : parentId;
        }
        if (isGroup !== undefined) {
            query.isGroup = isGroup === 'true';
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { nameAr: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [territories, total] = await Promise.all([
            Territory.find(query)
                .populate('managerId', 'name nameAr')
                .sort({ level: 1, name: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Territory.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                territories,
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error getting territories:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المناطق / Error fetching territories',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET TERRITORY TREE
// ═══════════════════════════════════════════════════════════════

/**
 * Get territories in hierarchical tree structure
 */
exports.getTree = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const enabledOnly = req.query.enabledOnly !== 'false';

        const tree = await Territory.getTree(firmId, enabledOnly);

        res.json({
            success: true,
            data: tree
        });
    } catch (error) {
        console.error('Error getting territory tree:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب شجرة المناطق / Error fetching territory tree',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE TERRITORY
// ═══════════════════════════════════════════════════════════════

/**
 * Get territory by ID
 */
exports.getById = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;

        const territory = await Territory.findOne({ _id: id, firmId })
            .populate('managerId', 'name nameAr userId')
            .populate('parentTerritoryId', 'name nameAr');

        if (!territory) {
            return res.status(404).json({
                success: false,
                message: 'المنطقة غير موجودة / Territory not found'
            });
        }

        res.json({
            success: true,
            data: territory
        });
    } catch (error) {
        console.error('Error getting territory:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المنطقة / Error fetching territory',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE TERRITORY
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new territory
 */
exports.create = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const userId = req.userID;

        const territoryData = {
            ...req.body,
            firmId
        };

        const territory = await Territory.create(territoryData);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'territory_created',
            entityType: 'territory',
            entityId: territory._id,
            entityName: territory.name,
            title: `Territory created: ${territory.name}`,
            performedBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المنطقة بنجاح / Territory created successfully',
            data: territory
        });
    } catch (error) {
        console.error('Error creating territory:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'المنطقة موجودة بالفعل / Territory already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء المنطقة / Error creating territory',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE TERRITORY
// ═══════════════════════════════════════════════════════════════

/**
 * Update a territory
 */
exports.update = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        const territory = await Territory.findOneAndUpdate(
            { _id: id, firmId },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!territory) {
            return res.status(404).json({
                success: false,
                message: 'المنطقة غير موجودة / Territory not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'territory_updated',
            entityType: 'territory',
            entityId: territory._id,
            entityName: territory.name,
            title: `Territory updated: ${territory.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تحديث المنطقة بنجاح / Territory updated successfully',
            data: territory
        });
    } catch (error) {
        console.error('Error updating territory:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'المنطقة موجودة بالفعل / Territory already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث المنطقة / Error updating territory',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE TERRITORY
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a territory
 */
exports.delete = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        // Check for child territories
        const hasChildren = await Territory.exists({
            firmId,
            parentTerritoryId: id
        });

        if (hasChildren) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن حذف منطقة لديها مناطق فرعية / Cannot delete territory with children'
            });
        }

        const territory = await Territory.findOneAndDelete({ _id: id, firmId });

        if (!territory) {
            return res.status(404).json({
                success: false,
                message: 'المنطقة غير موجودة / Territory not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'territory_deleted',
            entityType: 'territory',
            entityId: id,
            entityName: territory.name,
            title: `Territory deleted: ${territory.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم حذف المنطقة بنجاح / Territory deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting territory:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف المنطقة / Error deleting territory',
            error: error.message
        });
    }
};
