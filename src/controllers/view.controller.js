/**
 * View Controller
 *
 * Handles view CRUD operations and rendering.
 * Supports multiple view types: list, kanban, calendar, timeline, gantt, gallery, chart, map, workload, pivot.
 */

const View = require('../models/view.model');
const ViewService = require('../services/view.service');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// LIST VIEWS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all views for entity type
 * GET /api/views
 * Query param: entityType (required)
 */
exports.listViews = async (req, res) => {
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

        // Get user teams (if available in req, otherwise pass empty array)
        const userTeams = req.userTeams || [];

        const views = await ViewService.getViewsForEntity(
            firmId,
            entityType,
            userId,
            userTeams
        );

        res.json({
            success: true,
            data: views
        });
    } catch (error) {
        logger.error('Error listing views:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب العروض / Error fetching views',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE VIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Get view configuration
 * GET /api/views/:id
 */
exports.getView = async (req, res) => {
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

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Get view
        const view = await View.findOne({ _id: sanitizedId, firmId })
            .populate('ownerId', 'firstName lastName email')
            .populate('teamId', 'name')
            .populate('sharedWith.userId', 'firstName lastName email');

        if (!view) {
            return res.status(404).json({
                success: false,
                message: 'العرض غير موجود / View not found'
            });
        }

        // Access control: Check if user has access to this view
        const hasAccess =
            view.scope === 'global' ||
            view.ownerId._id.toString() === userId ||
            (view.scope === 'team' && view.teamId && req.userTeams?.includes(view.teamId.toString())) ||
            view.sharedWith.some(share => share.userId._id.toString() === userId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى هذا العرض / You do not have access to this view'
            });
        }

        res.json({
            success: true,
            data: view
        });
    } catch (error) {
        logger.error('Error getting view:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب العرض / Error fetching view',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE VIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new view
 * POST /api/views
 */
exports.createView = async (req, res) => {
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
        const { name, entityType, type } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'اسم العرض مطلوب / View name is required'
            });
        }

        if (!entityType) {
            return res.status(400).json({
                success: false,
                message: 'نوع الكيان مطلوب / Entity type is required'
            });
        }

        if (!type) {
            return res.status(400).json({
                success: false,
                message: 'نوع العرض مطلوب / View type is required'
            });
        }

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'entityType', 'type', 'scope', 'teamId',
            'columns', 'filters', 'sorting', 'grouping',
            'kanbanSettings', 'calendarSettings', 'timelineSettings', 'ganttSettings',
            'gallerySettings', 'chartSettings', 'mapSettings', 'workloadSettings', 'pivotSettings',
            'icon', 'color', 'isDefault', 'isFavorite',
            'defaultPageSize', 'maxRecords'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Validate view type-specific settings
        if (type === 'kanban' && (!sanitizedData.kanbanSettings || !sanitizedData.kanbanSettings.columnField)) {
            return res.status(400).json({
                success: false,
                message: 'إعدادات كانبان مطلوبة / Kanban settings are required'
            });
        }
        if (type === 'calendar' && (!sanitizedData.calendarSettings || !sanitizedData.calendarSettings.startDateField || !sanitizedData.calendarSettings.titleField)) {
            return res.status(400).json({
                success: false,
                message: 'إعدادات التقويم مطلوبة / Calendar settings are required'
            });
        }
        if (type === 'timeline' && (!sanitizedData.timelineSettings || !sanitizedData.timelineSettings.startField || !sanitizedData.timelineSettings.endField)) {
            return res.status(400).json({
                success: false,
                message: 'إعدادات الجدول الزمني مطلوبة / Timeline settings are required'
            });
        }
        if (type === 'gantt' && (!sanitizedData.ganttSettings || !sanitizedData.ganttSettings.startField || !sanitizedData.ganttSettings.endField)) {
            return res.status(400).json({
                success: false,
                message: 'إعدادات جانت مطلوبة / Gantt settings are required'
            });
        }
        if (type === 'gallery' && (!sanitizedData.gallerySettings || !sanitizedData.gallerySettings.imageField || !sanitizedData.gallerySettings.titleField)) {
            return res.status(400).json({
                success: false,
                message: 'إعدادات المعرض مطلوبة / Gallery settings are required'
            });
        }
        if (type === 'chart' && (!sanitizedData.chartSettings || !sanitizedData.chartSettings.chartType)) {
            return res.status(400).json({
                success: false,
                message: 'إعدادات الرسم البياني مطلوبة / Chart settings are required'
            });
        }
        if (type === 'map' && (!sanitizedData.mapSettings || !sanitizedData.mapSettings.locationField || !sanitizedData.mapSettings.titleField)) {
            return res.status(400).json({
                success: false,
                message: 'إعدادات الخريطة مطلوبة / Map settings are required'
            });
        }
        if (type === 'workload' && (!sanitizedData.workloadSettings || !sanitizedData.workloadSettings.assigneeField)) {
            return res.status(400).json({
                success: false,
                message: 'إعدادات عبء العمل مطلوبة / Workload settings are required'
            });
        }
        if (type === 'pivot' && (!sanitizedData.pivotSettings || !sanitizedData.pivotSettings.rows || !sanitizedData.pivotSettings.values)) {
            return res.status(400).json({
                success: false,
                message: 'إعدادات الجدول المحوري مطلوبة / Pivot settings are required'
            });
        }

        // If setting as default, unset other defaults for same entityType
        if (sanitizedData.isDefault) {
            await View.updateMany(
                { firmId, entityType, isDefault: true },
                { $set: { isDefault: false } }
            );
        }

        const viewData = {
            ...sanitizedData,
            firmId,
            ownerId: userId,
            createdBy: userId,
            lastModifiedBy: userId
        };

        // Default scope to 'personal' if not provided
        if (!viewData.scope) {
            viewData.scope = 'personal';
        }

        const view = await View.create(viewData);

        // Populate references
        const populatedView = await View.findById(view._id)
            .populate('ownerId', 'firstName lastName email')
            .populate('teamId', 'name');

        res.status(201).json({
            success: true,
            message: 'تم إنشاء العرض بنجاح / View created successfully',
            data: populatedView
        });
    } catch (error) {
        logger.error('Error creating view:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق من البيانات / Validation error',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء العرض / Error creating view',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE VIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Update a view
 * PUT /api/views/:id
 */
exports.updateView = async (req, res) => {
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

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Get existing view
        const view = await View.findOne({ _id: sanitizedId, firmId });

        if (!view) {
            return res.status(404).json({
                success: false,
                message: 'العرض غير موجود / View not found'
            });
        }

        // Check if view is locked
        if (view.isLocked) {
            return res.status(403).json({
                success: false,
                message: 'هذا العرض مقفل ولا يمكن تعديله / This view is locked and cannot be modified'
            });
        }

        // Access control: Verify ownership or edit permission
        const isOwner = view.ownerId.toString() === userId;
        const hasEditPermission = view.sharedWith.some(
            share => share.userId.toString() === userId && share.permission === 'edit'
        );

        if (!isOwner && !hasEditPermission) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتعديل هذا العرض / You do not have permission to edit this view'
            });
        }

        // Mass Assignment Protection: Only allow specific fields
        const allowedFields = [
            'name', 'nameAr', 'description', 'descriptionAr',
            'type', 'scope', 'teamId',
            'columns', 'filters', 'sorting', 'grouping',
            'kanbanSettings', 'calendarSettings', 'timelineSettings', 'ganttSettings',
            'gallerySettings', 'chartSettings', 'mapSettings', 'workloadSettings', 'pivotSettings',
            'icon', 'color', 'isDefault',
            'defaultPageSize', 'maxRecords'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // If setting as default, unset other defaults for same entityType
        if (sanitizedData.isDefault && !view.isDefault) {
            await View.updateMany(
                { firmId, entityType: view.entityType, isDefault: true, _id: { $ne: sanitizedId } },
                { $set: { isDefault: false } }
            );
        }

        // Update lastModifiedBy
        sanitizedData.lastModifiedBy = userId;

        // Update view
        const updatedView = await View.findOneAndUpdate(
            { _id: sanitizedId, firmId },
            { $set: sanitizedData },
            { new: true, runValidators: true }
        )
        .populate('ownerId', 'firstName lastName email')
        .populate('teamId', 'name')
        .populate('sharedWith.userId', 'firstName lastName email');

        res.json({
            success: true,
            message: 'تم تحديث العرض بنجاح / View updated successfully',
            data: updatedView
        });
    } catch (error) {
        logger.error('Error updating view:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق من البيانات / Validation error',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث العرض / Error updating view',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE VIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Delete a view
 * DELETE /api/views/:id
 */
exports.deleteView = async (req, res) => {
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

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Get view to check ownership and locked status
        const view = await View.findOne({ _id: sanitizedId, firmId });

        if (!view) {
            return res.status(404).json({
                success: false,
                message: 'العرض غير موجود / View not found'
            });
        }

        // Check if view is locked
        if (view.isLocked) {
            return res.status(403).json({
                success: false,
                message: 'هذا العرض مقفل ولا يمكن حذفه / This view is locked and cannot be deleted'
            });
        }

        // Access control: Only owner can delete
        if (view.ownerId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'يمكن للمالك فقط حذف العرض / Only the owner can delete the view'
            });
        }

        // Delete view
        await View.findOneAndDelete({ _id: sanitizedId, firmId: req.firmId });

        res.json({
            success: true,
            message: 'تم حذف العرض بنجاح / View deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting view:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف العرض / Error deleting view',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// RENDER VIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Render view with data
 * GET /api/views/:id/render
 */
exports.renderView = async (req, res) => {
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

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Get view to check access
        const view = await View.findOne({ _id: sanitizedId, firmId });

        if (!view) {
            return res.status(404).json({
                success: false,
                message: 'العرض غير موجود / View not found'
            });
        }

        // Access control: Check if user has access to this view
        const hasAccess =
            view.scope === 'global' ||
            view.ownerId.toString() === userId ||
            (view.scope === 'team' && view.teamId && req.userTeams?.includes(view.teamId.toString())) ||
            view.sharedWith.some(share => share.userId.toString() === userId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى هذا العرض / You do not have access to this view'
            });
        }

        // Prepare context and params
        const context = {
            firmId,
            userTeams: req.userTeams || []
        };

        // Pass all query params as filters (page, limit, sortBy, sortOrder, filters, etc.)
        const params = { ...req.query };

        // Render view using ViewService
        const renderedData = await ViewService.renderView(sanitizedId, params, userId, context);

        res.json({
            success: true,
            data: renderedData
        });
    } catch (error) {
        logger.error('Error rendering view:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في عرض البيانات / Error rendering view',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CLONE VIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Clone a view
 * POST /api/views/:id/clone
 */
exports.cloneView = async (req, res) => {
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
        const { name } = req.body;

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Get view to check access
        const view = await View.findOne({ _id: sanitizedId, firmId });

        if (!view) {
            return res.status(404).json({
                success: false,
                message: 'العرض غير موجود / View not found'
            });
        }

        // Access control: Check if user has access to this view
        const hasAccess =
            view.scope === 'global' ||
            view.ownerId.toString() === userId ||
            (view.scope === 'team' && view.teamId && req.userTeams?.includes(view.teamId.toString())) ||
            view.sharedWith.some(share => share.userId.toString() === userId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى هذا العرض / You do not have access to this view'
            });
        }

        // Generate new name if not provided
        const newName = name || `${view.name} (نسخة / Copy)`;

        // Clone using ViewService
        const clonedView = await ViewService.cloneView(sanitizedId, userId, newName, firmId);

        // Populate references
        const populatedView = await View.findById(clonedView._id)
            .populate('ownerId', 'firstName lastName email')
            .populate('teamId', 'name');

        res.status(201).json({
            success: true,
            message: 'تم نسخ العرض بنجاح / View cloned successfully',
            data: populatedView
        });
    } catch (error) {
        logger.error('Error cloning view:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في نسخ العرض / Error cloning view',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SHARE VIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Share view with users
 * POST /api/views/:id/share
 */
exports.shareView = async (req, res) => {
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
        const { userIds, permission = 'view' } = req.body;

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

        if (!['view', 'edit'].includes(permission)) {
            return res.status(400).json({
                success: false,
                message: 'صلاحية غير صالحة / Invalid permission'
            });
        }

        // Get view
        const view = await View.findOne({ _id: sanitizedId, firmId });

        if (!view) {
            return res.status(404).json({
                success: false,
                message: 'العرض غير موجود / View not found'
            });
        }

        // Access control: Only owner can share
        if (view.ownerId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'يمكن للمالك فقط مشاركة العرض / Only the owner can share the view'
            });
        }

        // Sanitize user IDs
        const sanitizedUserIds = userIds
            .map(uid => sanitizeObjectId(uid))
            .filter(Boolean);

        // Add users to sharedWith array (avoid duplicates)
        const existingUserIds = view.sharedWith.map(s => s.userId.toString());
        const newShares = sanitizedUserIds
            .filter(uid => !existingUserIds.includes(uid))
            .map(uid => ({
                userId: uid,
                permission
            }));

        if (newShares.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'جميع المستخدمين لديهم بالفعل صلاحية الوصول / All users already have access'
            });
        }

        view.sharedWith.push(...newShares);
        view.lastModifiedBy = userId;
        await view.save();

        // Populate the updated view
        const updatedView = await View.findById(sanitizedId)
            .populate('ownerId', 'firstName lastName email')
            .populate('teamId', 'name')
            .populate('sharedWith.userId', 'firstName lastName email');

        res.json({
            success: true,
            message: 'تمت مشاركة العرض بنجاح / View shared successfully',
            data: updatedView
        });
    } catch (error) {
        logger.error('Error sharing view:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في مشاركة العرض / Error sharing view',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// TOGGLE FAVORITE
// ═══════════════════════════════════════════════════════════════

/**
 * Toggle favorite status
 * POST /api/views/:id/favorite
 */
exports.toggleFavorite = async (req, res) => {
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

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Get view
        const view = await View.findOne({ _id: sanitizedId, firmId });

        if (!view) {
            return res.status(404).json({
                success: false,
                message: 'العرض غير موجود / View not found'
            });
        }

        // Access control: Check if user has access to this view
        const hasAccess =
            view.scope === 'global' ||
            view.ownerId.toString() === userId ||
            (view.scope === 'team' && view.teamId && req.userTeams?.includes(view.teamId.toString())) ||
            view.sharedWith.some(share => share.userId.toString() === userId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى هذا العرض / You do not have access to this view'
            });
        }

        // Toggle favorite (only owner can set favorite)
        if (view.ownerId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'يمكن للمالك فقط تعيين المفضلة / Only the owner can set favorite'
            });
        }

        view.isFavorite = !view.isFavorite;
        view.lastModifiedBy = userId;
        await view.save();

        res.json({
            success: true,
            message: view.isFavorite
                ? 'تمت إضافة العرض إلى المفضلة / View added to favorites'
                : 'تمت إزالة العرض من المفضلة / View removed from favorites',
            data: { isFavorite: view.isFavorite }
        });
    } catch (error) {
        logger.error('Error toggling favorite:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تبديل المفضلة / Error toggling favorite',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SET AS DEFAULT
// ═══════════════════════════════════════════════════════════════

/**
 * Set view as default for entity type
 * POST /api/views/:id/default
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
        const firmId = req.firmId;
        const userId = req.userID;

        // IDOR Protection: Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'معرف غير صالح / Invalid ID'
            });
        }

        // Get view
        const view = await View.findOne({ _id: sanitizedId, firmId });

        if (!view) {
            return res.status(404).json({
                success: false,
                message: 'العرض غير موجود / View not found'
            });
        }

        // Access control: Only owner can set as default
        if (view.ownerId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'يمكن للمالك فقط تعيين العرض الافتراضي / Only the owner can set default view'
            });
        }

        // Unset other defaults for same entityType and owner
        await View.updateMany(
            {
                firmId,
                entityType: view.entityType,
                ownerId: userId,
                isDefault: true,
                _id: { $ne: sanitizedId }
            },
            { $set: { isDefault: false } }
        );

        // Set this view as default
        view.isDefault = true;
        view.lastModifiedBy = userId;
        await view.save();

        res.json({
            success: true,
            message: 'تم تعيين العرض كافتراضي / View set as default',
            data: { isDefault: true }
        });
    } catch (error) {
        logger.error('Error setting default view:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تعيين العرض الافتراضي / Error setting default view',
            error: error.message
        });
    }
};
