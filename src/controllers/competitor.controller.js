/**
 * Competitor Controller
 *
 * Handles competitor CRUD operations and stats.
 */

const Competitor = require('../models/competitor.model');
const CrmActivity = require('../models/crmActivity.model');

// ═══════════════════════════════════════════════════════════════
// LIST COMPETITORS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all competitors with optional stats
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
        const { enabled, withStats, search } = req.query;

        if (withStats === 'true') {
            const competitors = await Competitor.getWithStats(firmId);
            return res.json({
                success: true,
                data: competitors
            });
        }

        const query = { firmId };

        if (enabled !== undefined) {
            query.enabled = enabled === 'true';
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { nameAr: { $regex: search, $options: 'i' } }
            ];
        }

        const competitors = await Competitor.find(query).sort({ name: 1 });

        res.json({
            success: true,
            data: competitors
        });
    } catch (error) {
        console.error('Error getting competitors:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المنافسين / Error fetching competitors',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE COMPETITOR
// ═══════════════════════════════════════════════════════════════

/**
 * Get competitor by ID
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

        const competitor = await Competitor.findOne({ _id: id, firmId });

        if (!competitor) {
            return res.status(404).json({
                success: false,
                message: 'المنافس غير موجود / Competitor not found'
            });
        }

        res.json({
            success: true,
            data: competitor
        });
    } catch (error) {
        console.error('Error getting competitor:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المنافس / Error fetching competitor',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE COMPETITOR
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new competitor
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

        const competitorData = {
            ...req.body,
            firmId
        };

        const competitor = await Competitor.create(competitorData);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'competitor_created',
            entityType: 'competitor',
            entityId: competitor._id,
            entityName: competitor.name,
            title: `Competitor created: ${competitor.name}`,
            performedBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المنافس بنجاح / Competitor created successfully',
            data: competitor
        });
    } catch (error) {
        console.error('Error creating competitor:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'المنافس موجود بالفعل / Competitor already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء المنافس / Error creating competitor',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE COMPETITOR
// ═══════════════════════════════════════════════════════════════

/**
 * Update a competitor
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

        const competitor = await Competitor.findOneAndUpdate(
            { _id: id, firmId },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!competitor) {
            return res.status(404).json({
                success: false,
                message: 'المنافس غير موجود / Competitor not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'competitor_updated',
            entityType: 'competitor',
            entityId: competitor._id,
            entityName: competitor.name,
            title: `Competitor updated: ${competitor.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تحديث المنافس بنجاح / Competitor updated successfully',
            data: competitor
        });
    } catch (error) {
        console.error('Error updating competitor:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'المنافس موجود بالفعل / Competitor already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث المنافس / Error updating competitor',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE COMPETITOR
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a competitor
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

        const competitor = await Competitor.findOneAndDelete({ _id: id, firmId });

        if (!competitor) {
            return res.status(404).json({
                success: false,
                message: 'المنافس غير موجود / Competitor not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'competitor_deleted',
            entityType: 'competitor',
            entityId: id,
            entityName: competitor.name,
            title: `Competitor deleted: ${competitor.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم حذف المنافس بنجاح / Competitor deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting competitor:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف المنافس / Error deleting competitor',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET TOP COMPETITORS BY LOSSES
// ═══════════════════════════════════════════════════════════════

/**
 * Get top competitors by cases lost to them
 */
exports.getTopByLosses = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const { limit = 5 } = req.query;

        const competitors = await Competitor.getTopByLosses(firmId, parseInt(limit));

        res.json({
            success: true,
            data: competitors
        });
    } catch (error) {
        console.error('Error getting top competitors:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب أهم المنافسين / Error fetching top competitors',
            error: error.message
        });
    }
};
