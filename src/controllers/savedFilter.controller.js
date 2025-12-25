/**
 * SavedFilter Controller
 *
 * Handles HTTP requests for saved filter operations.
 * Provides endpoints for filter CRUD, sharing, usage tracking, and popular filters.
 */

const SavedFilterService = require('../services/savedFilter.service');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// LIST FILTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all saved filters for entity type
 * GET /api/saved-filters?entityType=invoices
 */
exports.listFilters = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const userId = req.userID;
        const { entityType } = req.query;

        if (!entityType) {
            return res.status(400).json({
                success: false,
                message: 'نوع الكيان مطلوب / Entity type is required'
            });
        }

        const filters = await SavedFilterService.getSavedFilters(userId, firmId, entityType);

        res.json({
            success: true,
            data: filters
        });
    } catch (error) {
        logger.error('Error listing saved filters:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الفلاتر المحفوظة / Error fetching saved filters',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE FILTER
// ═══════════════════════════════════════════════════════════════

/**
 * Get saved filter by ID
 * GET /api/saved-filters/:id
 */
exports.getFilter = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const userId = req.userID;

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        const filter = await SavedFilterService.getSavedFilterById(sanitizedId, userId);

        res.json({
            success: true,
            data: filter
        });
    } catch (error) {
        logger.error('Error getting saved filter:', error);

        if (error.message === 'Filter not found') {
            return res.status(404).json({
                success: false,
                message: 'الفلتر غير موجود / Filter not found'
            });
        }

        if (error.message === 'Access denied') {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الفلتر / Error fetching filter',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE FILTER
// ═══════════════════════════════════════════════════════════════

/**
 * Create new saved filter
 * POST /api/saved-filters
 */
exports.createFilter = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const userId = req.userID;

        // Input Validation: Check required fields
        const { name, entityType } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'اسم الفلتر مطلوب / Filter name is required'
            });
        }

        if (!entityType) {
            return res.status(400).json({
                success: false,
                message: 'نوع الكيان مطلوب / Entity type is required'
            });
        }

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = [
            'name',
            'entityType',
            'filters',
            'sort',
            'columns',
            'isDefault'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        const filter = await SavedFilterService.createSavedFilter(sanitizedData, userId, firmId);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الفلتر بنجاح / Filter created successfully',
            data: filter
        });
    } catch (error) {
        logger.error('Error creating saved filter:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق من البيانات / Validation error',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء الفلتر / Error creating filter',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE FILTER
// ═══════════════════════════════════════════════════════════════

/**
 * Update saved filter
 * PUT /api/saved-filters/:id
 */
exports.updateFilter = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const userId = req.userID;

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = [
            'name',
            'filters',
            'sort',
            'columns',
            'isDefault'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        const filter = await SavedFilterService.updateSavedFilter(sanitizedId, sanitizedData, userId);

        res.json({
            success: true,
            message: 'تم تحديث الفلتر بنجاح / Filter updated successfully',
            data: filter
        });
    } catch (error) {
        logger.error('Error updating saved filter:', error);

        if (error.message === 'Filter not found') {
            return res.status(404).json({
                success: false,
                message: 'الفلتر غير موجود / Filter not found'
            });
        }

        if (error.message === 'Only the owner can update the filter') {
            return res.status(403).json({
                success: false,
                message: 'يمكن للمالك فقط تعديل الفلتر / Only the owner can update the filter'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق من البيانات / Validation error',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث الفلتر / Error updating filter',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE FILTER
// ═══════════════════════════════════════════════════════════════

/**
 * Delete saved filter
 * DELETE /api/saved-filters/:id
 */
exports.deleteFilter = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const userId = req.userID;

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        await SavedFilterService.deleteSavedFilter(sanitizedId, userId);

        res.json({
            success: true,
            message: 'تم حذف الفلتر بنجاح / Filter deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting saved filter:', error);

        if (error.message === 'Filter not found') {
            return res.status(404).json({
                success: false,
                message: 'الفلتر غير موجود / Filter not found'
            });
        }

        if (error.message === 'Only the owner can delete the filter') {
            return res.status(403).json({
                success: false,
                message: 'يمكن للمالك فقط حذف الفلتر / Only the owner can delete the filter'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في حذف الفلتر / Error deleting filter',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SET AS DEFAULT
// ═══════════════════════════════════════════════════════════════

/**
 * Set filter as default for entity type
 * POST /api/saved-filters/:id/set-default
 */
exports.setAsDefault = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const userId = req.userID;

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        const filter = await SavedFilterService.setAsDefault(sanitizedId, userId);

        res.json({
            success: true,
            message: 'تم تعيين الفلتر كافتراضي / Filter set as default',
            data: filter
        });
    } catch (error) {
        logger.error('Error setting default filter:', error);

        if (error.message === 'Filter not found') {
            return res.status(404).json({
                success: false,
                message: 'الفلتر غير موجود / Filter not found'
            });
        }

        if (error.message === 'Only the owner can set default filter') {
            return res.status(403).json({
                success: false,
                message: 'يمكن للمالك فقط تعيين الفلتر الافتراضي / Only the owner can set default filter'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في تعيين الفلتر الافتراضي / Error setting default filter',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SHARE FILTER
// ═══════════════════════════════════════════════════════════════

/**
 * Share filter with users
 * POST /api/saved-filters/:id/share
 */
exports.shareFilter = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const userId = req.userID;
        const { userIds } = req.body;

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Validate input
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'معرفات المستخدمين مطلوبة / User IDs are required'
            });
        }

        // Sanitize user IDs
        const sanitizedUserIds = userIds
            .map(uid => sanitizeObjectId(uid))
            .filter(Boolean);

        if (sanitizedUserIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'معرفات مستخدمين صالحة مطلوبة / Valid user IDs are required'
            });
        }

        const filter = await SavedFilterService.shareFilter(sanitizedId, sanitizedUserIds, userId);

        res.json({
            success: true,
            message: 'تمت مشاركة الفلتر بنجاح / Filter shared successfully',
            data: filter
        });
    } catch (error) {
        logger.error('Error sharing filter:', error);

        if (error.message === 'Filter not found') {
            return res.status(404).json({
                success: false,
                message: 'الفلتر غير موجود / Filter not found'
            });
        }

        if (error.message === 'Only the owner can share the filter') {
            return res.status(403).json({
                success: false,
                message: 'يمكن للمالك فقط مشاركة الفلتر / Only the owner can share the filter'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في مشاركة الفلتر / Error sharing filter',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UNSHARE FILTER (Remove user from shared)
// ═══════════════════════════════════════════════════════════════

/**
 * Unshare filter from specific user
 * DELETE /api/saved-filters/:id/share/:userId
 */
exports.unshareFilter = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id, userId: targetUserId } = req.params;
        const userId = req.userID;

        // IDOR Protection: Sanitize and validate ObjectIds
        const sanitizedId = sanitizeObjectId(id);
        const sanitizedTargetUserId = sanitizeObjectId(targetUserId);

        if (!sanitizedId || !sanitizedTargetUserId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        const filter = await SavedFilterService.unshareFilter(sanitizedId, sanitizedTargetUserId, userId);

        res.json({
            success: true,
            message: 'تمت إزالة المشاركة بنجاح / Unshared successfully',
            data: filter
        });
    } catch (error) {
        logger.error('Error unsharing filter:', error);

        if (error.message === 'Filter not found') {
            return res.status(404).json({
                success: false,
                message: 'الفلتر غير موجود / Filter not found'
            });
        }

        if (error.message === 'Only the owner can unshare the filter') {
            return res.status(403).json({
                success: false,
                message: 'يمكن للمالك فقط إزالة المشاركة / Only the owner can unshare the filter'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في إزالة المشاركة / Error unsharing filter',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DUPLICATE FILTER
// ═══════════════════════════════════════════════════════════════

/**
 * Duplicate a filter
 * POST /api/saved-filters/:id/duplicate
 */
exports.duplicateFilter = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const userId = req.userID;

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        const filter = await SavedFilterService.duplicateFilter(sanitizedId, userId);

        res.status(201).json({
            success: true,
            message: 'تم نسخ الفلتر بنجاح / Filter duplicated successfully',
            data: filter
        });
    } catch (error) {
        logger.error('Error duplicating filter:', error);

        if (error.message === 'Filter not found') {
            return res.status(404).json({
                success: false,
                message: 'الفلتر غير موجود / Filter not found'
            });
        }

        if (error.message === 'Access denied') {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في نسخ الفلتر / Error duplicating filter',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET POPULAR FILTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get popular filters for entity type
 * GET /api/saved-filters/popular/:entityType
 */
exports.getPopularFilters = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = req.firmId;
        const { entityType } = req.params;
        const { limit = 10 } = req.query;

        if (!entityType) {
            return res.status(400).json({
                success: false,
                message: 'نوع الكيان مطلوب / Entity type is required'
            });
        }

        const filters = await SavedFilterService.getPopularFilters(
            entityType,
            firmId,
            parseInt(limit, 10)
        );

        res.json({
            success: true,
            data: filters
        });
    } catch (error) {
        logger.error('Error getting popular filters:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الفلاتر الشائعة / Error fetching popular filters',
            error: error.message
        });
    }
};
