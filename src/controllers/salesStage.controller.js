/**
 * Sales Stage Controller
 *
 * Handles sales stage CRUD operations and reordering.
 */

const SalesStage = require('../models/salesStage.model');
const CrmActivity = require('../models/crmActivity.model');

// ═══════════════════════════════════════════════════════════════
// LIST SALES STAGES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all sales stages
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
        const { enabled, type } = req.query;

        const query = { firmId };

        if (enabled !== undefined) {
            query.enabled = enabled === 'true';
        }
        if (type) {
            query.type = type;
        }

        const stages = await SalesStage.find(query).sort({ order: 1 });

        res.json({
            success: true,
            data: stages
        });
    } catch (error) {
        console.error('Error getting sales stages:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مراحل المبيعات / Error fetching sales stages',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE SALES STAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Get sales stage by ID
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

        const stage = await SalesStage.findOne({ _id: id, firmId });

        if (!stage) {
            return res.status(404).json({
                success: false,
                message: 'مرحلة المبيعات غير موجودة / Sales stage not found'
            });
        }

        res.json({
            success: true,
            data: stage
        });
    } catch (error) {
        console.error('Error getting sales stage:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب مرحلة المبيعات / Error fetching sales stage',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE SALES STAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new sales stage
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

        const stageData = {
            ...req.body,
            firmId
        };

        const stage = await SalesStage.create(stageData);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'sales_stage_created',
            entityType: 'sales_stage',
            entityId: stage._id,
            entityName: stage.name,
            title: `Sales stage created: ${stage.name}`,
            performedBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء مرحلة المبيعات بنجاح / Sales stage created successfully',
            data: stage
        });
    } catch (error) {
        console.error('Error creating sales stage:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء مرحلة المبيعات / Error creating sales stage',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE SALES STAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Update a sales stage
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

        const stage = await SalesStage.findOneAndUpdate(
            { _id: id, firmId },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!stage) {
            return res.status(404).json({
                success: false,
                message: 'مرحلة المبيعات غير موجودة / Sales stage not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'sales_stage_updated',
            entityType: 'sales_stage',
            entityId: stage._id,
            entityName: stage.name,
            title: `Sales stage updated: ${stage.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تحديث مرحلة المبيعات بنجاح / Sales stage updated successfully',
            data: stage
        });
    } catch (error) {
        console.error('Error updating sales stage:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث مرحلة المبيعات / Error updating sales stage',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE SALES STAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a sales stage
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

        const stage = await SalesStage.findOneAndDelete({ _id: id, firmId });

        if (!stage) {
            return res.status(404).json({
                success: false,
                message: 'مرحلة المبيعات غير موجودة / Sales stage not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'sales_stage_deleted',
            entityType: 'sales_stage',
            entityId: id,
            entityName: stage.name,
            title: `Sales stage deleted: ${stage.name}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم حذف مرحلة المبيعات بنجاح / Sales stage deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting sales stage:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف مرحلة المبيعات / Error deleting sales stage',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// REORDER STAGES
// ═══════════════════════════════════════════════════════════════

/**
 * Reorder sales stages
 */
exports.reorder = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const userId = req.userID;
        const { stages } = req.body;

        await SalesStage.reorder(firmId, stages);

        // Get updated stages
        const updatedStages = await SalesStage.find({ firmId }).sort({ order: 1 });

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'sales_stages_reordered',
            entityType: 'sales_stage',
            title: 'Sales stages reordered',
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم إعادة ترتيب مراحل المبيعات / Sales stages reordered successfully',
            data: updatedStages
        });
    } catch (error) {
        console.error('Error reordering sales stages:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إعادة ترتيب مراحل المبيعات / Error reordering stages',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZE DEFAULTS
// ═══════════════════════════════════════════════════════════════

/**
 * Create default sales stages for a firm
 */
exports.createDefaults = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;

        // Check if stages already exist
        const existingCount = await SalesStage.countDocuments({ firmId });
        if (existingCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'مراحل المبيعات موجودة بالفعل / Sales stages already exist'
            });
        }

        await SalesStage.createDefaults(firmId);

        const stages = await SalesStage.find({ firmId }).sort({ order: 1 });

        res.json({
            success: true,
            message: 'تم إنشاء مراحل المبيعات الافتراضية / Default sales stages created',
            data: stages
        });
    } catch (error) {
        console.error('Error creating default sales stages:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء مراحل المبيعات الافتراضية / Error creating defaults',
            error: error.message
        });
    }
};
