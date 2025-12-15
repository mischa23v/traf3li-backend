/**
 * Lost Reason Controller
 *
 * Handles lost reason CRUD operations.
 */

const LostReason = require('../models/lostReason.model');
const CrmActivity = require('../models/crmActivity.model');

// ═══════════════════════════════════════════════════════════════
// LIST LOST REASONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all lost reasons
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
        const { enabled, category } = req.query;

        const query = { firmId };

        if (enabled !== undefined) {
            query.enabled = enabled === 'true';
        }
        if (category) {
            query.category = category;
        }

        const reasons = await LostReason.find(query).sort({ category: 1, reason: 1 });

        res.json({
            success: true,
            data: reasons
        });
    } catch (error) {
        console.error('Error getting lost reasons:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب أسباب الخسارة / Error fetching lost reasons',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET CATEGORIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get valid lost reason categories
 */
exports.getCategories = async (req, res) => {
    try {
        const categories = LostReason.getCategories();

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الفئات / Error fetching categories',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE LOST REASON
// ═══════════════════════════════════════════════════════════════

/**
 * Get lost reason by ID
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

        const reason = await LostReason.findOne({ _id: id, firmId });

        if (!reason) {
            return res.status(404).json({
                success: false,
                message: 'سبب الخسارة غير موجود / Lost reason not found'
            });
        }

        res.json({
            success: true,
            data: reason
        });
    } catch (error) {
        console.error('Error getting lost reason:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب سبب الخسارة / Error fetching lost reason',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE LOST REASON
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new lost reason
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

        const reasonData = {
            ...req.body,
            firmId
        };

        const reason = await LostReason.create(reasonData);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'lost_reason_created',
            entityType: 'lost_reason',
            entityId: reason._id,
            entityName: reason.reason,
            title: `Lost reason created: ${reason.reason}`,
            performedBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء سبب الخسارة بنجاح / Lost reason created successfully',
            data: reason
        });
    } catch (error) {
        console.error('Error creating lost reason:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء سبب الخسارة / Error creating lost reason',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE LOST REASON
// ═══════════════════════════════════════════════════════════════

/**
 * Update a lost reason
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

        const reason = await LostReason.findOneAndUpdate(
            { _id: id, firmId },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!reason) {
            return res.status(404).json({
                success: false,
                message: 'سبب الخسارة غير موجود / Lost reason not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'lost_reason_updated',
            entityType: 'lost_reason',
            entityId: reason._id,
            entityName: reason.reason,
            title: `Lost reason updated: ${reason.reason}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تحديث سبب الخسارة بنجاح / Lost reason updated successfully',
            data: reason
        });
    } catch (error) {
        console.error('Error updating lost reason:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث سبب الخسارة / Error updating lost reason',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE LOST REASON
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a lost reason
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

        const reason = await LostReason.findOneAndDelete({ _id: id, firmId });

        if (!reason) {
            return res.status(404).json({
                success: false,
                message: 'سبب الخسارة غير موجود / Lost reason not found'
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'lost_reason_deleted',
            entityType: 'lost_reason',
            entityId: id,
            entityName: reason.reason,
            title: `Lost reason deleted: ${reason.reason}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم حذف سبب الخسارة بنجاح / Lost reason deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting lost reason:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف سبب الخسارة / Error deleting lost reason',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZE DEFAULTS
// ═══════════════════════════════════════════════════════════════

/**
 * Create default lost reasons for a firm
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

        await LostReason.createDefaults(firmId);

        const reasons = await LostReason.find({ firmId }).sort({ category: 1, reason: 1 });

        res.json({
            success: true,
            message: 'تم إنشاء أسباب الخسارة الافتراضية / Default lost reasons created',
            data: reasons
        });
    } catch (error) {
        console.error('Error creating default lost reasons:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء أسباب الخسارة الافتراضية / Error creating defaults',
            error: error.message
        });
    }
};
