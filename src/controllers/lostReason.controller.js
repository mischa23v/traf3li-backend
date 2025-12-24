/**
 * Lost Reason Controller
 *
 * Handles lost reason CRUD operations.
 */

const LostReason = require('../models/lostReason.model');
const CrmActivity = require('../models/crmActivity.model');
const { pickAllowedFields, sanitizeObjectId, sanitizeString } = require('../utils/securityUtils');
const logger = require('../utils/logger');

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
        const lawyerId = req.userID;
        const { enabled, category } = req.query;

        const isSoloLawyer = req.isSoloLawyer;
        const query = {};
        if (isSoloLawyer || !firmId) {
            query.lawyerId = lawyerId;
        } else {
            query.firmId = firmId;
        }

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
        logger.error('Error getting lost reasons:', error);
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
        logger.error('Error getting categories:', error);
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

        // IDOR Protection: Sanitize ID
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // IDOR Protection: Verify firmId ownership
        const reason = await LostReason.findOne({ _id: sanitizedId, firmId });

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
        logger.error('Error getting lost reason:', error);
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

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = ['reason', 'reasonAr', 'category', 'enabled'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        // Input Validation: Ensure required fields are present
        if (!safeData.reason || !safeData.reasonAr) {
            return res.status(400).json({
                success: false,
                message: 'السبب مطلوب بكلا اللغتين / Reason required in both languages'
            });
        }

        // XSS Protection: Sanitize text fields
        safeData.reason = sanitizeString(safeData.reason);
        safeData.reasonAr = sanitizeString(safeData.reasonAr);

        // Input Validation: Check length
        if (safeData.reason.length > 200 || safeData.reasonAr.length > 200) {
            return res.status(400).json({
                success: false,
                message: 'السبب طويل جداً / Reason too long (max 200 characters)'
            });
        }

        // Input Validation: Validate category if provided
        if (safeData.category) {
            const validCategories = LostReason.getCategories();
            if (!validCategories.includes(safeData.category)) {
                return res.status(400).json({
                    success: false,
                    message: 'فئة غير صالحة / Invalid category'
                });
            }
        }

        const reasonData = {
            ...safeData,
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
        logger.error('Error creating lost reason:', error);
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

        // IDOR Protection: Sanitize ID
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = ['reason', 'reasonAr', 'category', 'enabled'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        // Input Validation: Check if there's anything to update
        if (Object.keys(safeData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'لا توجد بيانات للتحديث / No data to update'
            });
        }

        // XSS Protection: Sanitize text fields if present
        if (safeData.reason !== undefined) {
            safeData.reason = sanitizeString(safeData.reason);
            if (safeData.reason.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: 'السبب طويل جداً / Reason too long (max 200 characters)'
                });
            }
        }

        if (safeData.reasonAr !== undefined) {
            safeData.reasonAr = sanitizeString(safeData.reasonAr);
            if (safeData.reasonAr.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: 'السبب طويل جداً / Reason too long (max 200 characters)'
                });
            }
        }

        // Input Validation: Validate category if provided
        if (safeData.category) {
            const validCategories = LostReason.getCategories();
            if (!validCategories.includes(safeData.category)) {
                return res.status(400).json({
                    success: false,
                    message: 'فئة غير صالحة / Invalid category'
                });
            }
        }

        // IDOR Protection: Verify firmId ownership
        const reason = await LostReason.findOneAndUpdate(
            { _id: sanitizedId, firmId },
            { $set: safeData },
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
        logger.error('Error updating lost reason:', error);
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

        // IDOR Protection: Sanitize ID
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // IDOR Protection: Verify firmId ownership
        const reason = await LostReason.findOneAndDelete({ _id: sanitizedId, firmId });

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
            entityId: sanitizedId,
            entityName: reason.reason,
            title: `Lost reason deleted: ${reason.reason}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم حذف سبب الخسارة بنجاح / Lost reason deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting lost reason:', error);
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
        logger.error('Error creating default lost reasons:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء أسباب الخسارة الافتراضية / Error creating defaults',
            error: error.message
        });
    }
};
