/**
 * Bulk Actions Controller - Enterprise Bulk Operations API
 *
 * This controller provides REST API endpoints for executing bulk operations
 * across different entity types with comprehensive validation and security.
 *
 * All routes require authentication and firm filtering.
 * Action execution requires appropriate permissions based on entity type.
 *
 * @module controllers/bulkActions.controller
 */

const BulkActionsService = require('../services/bulkActions.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Execute bulk action
 * POST /api/bulk-actions/:entityType
 * Body: { action, ids, params }
 */
const executeBulkAction = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { entityType } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, ['action', 'ids', 'params']);
  const { action, ids, params = {} } = allowedFields;

  // Validate required fields
  if (!action) {
    throw CustomException('نوع الإجراء مطلوب', 400);
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw CustomException('يجب تحديد معرفات الكيانات كمصفوفة', 400);
  }

  // Sanitize entity IDs
  const sanitizedIds = ids
    .map(id => sanitizeObjectId(id))
    .filter(id => id !== null);

  if (sanitizedIds.length === 0) {
    throw CustomException('لا توجد معرفات صالحة', 400);
  }

  if (sanitizedIds.length !== ids.length) {
    throw CustomException(
      `${ids.length - sanitizedIds.length} معرف غير صالح تم تجاهله`,
      400
    );
  }

  // Validate entity type
  const supportedTypes = BulkActionsService.getSupportedEntityTypes();
  if (!supportedTypes.includes(entityType)) {
    throw CustomException(`نوع الكيان غير مدعوم: ${entityType}`, 400);
  }

  // Validate action for entity type
  const supportedActions = BulkActionsService.getSupportedBulkActions(entityType);
  if (!supportedActions.includes(action)) {
    throw CustomException(
      `الإجراء '${action}' غير مدعوم لنوع الكيان '${entityType}'`,
      400
    );
  }

  // Permission checks based on action type
  const requiresAdmin = ['delete', 'merge', 'void'];
  if (requiresAdmin.includes(action) && !['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('هذا الإجراء يتطلب صلاحيات المالك أو المدير', 403);
  }

  const requiresApprover = ['approve', 'reject'];
  if (
    requiresApprover.includes(action) &&
    !['owner', 'admin', 'manager'].includes(req.firmRole)
  ) {
    throw CustomException('هذا الإجراء يتطلب صلاحيات الموافقة', 403);
  }

  try {
    // Execute bulk action
    const result = await BulkActionsService.executeBulkAction(
      action,
      entityType,
      sanitizedIds,
      params,
      userId,
      firmId
    );

    // Determine response based on result type
    if (result.status === 'queued') {
      res.status(202).json({
        success: true,
        message: 'تم إضافة الإجراء الجماعي إلى قائمة الانتظار للمعالجة',
        data: {
          jobId: result.jobId,
          status: result.status,
          totalEntities: result.totalEntities,
          message: result.message
        }
      });
    } else {
      res.json({
        success: true,
        message: `تم تنفيذ الإجراء الجماعي بنجاح`,
        data: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          totalEntities: sanitizedIds.length,
          errors: result.errors,
          hasErrors: result.failureCount > 0
        }
      });
    }
  } catch (error) {
    throw CustomException(
      `فشل تنفيذ الإجراء الجماعي: ${error.message}`,
      400
    );
  }
});

/**
 * Get bulk action progress
 * GET /api/bulk-actions/:jobId/progress
 */
const getBulkActionProgress = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const { jobId } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  if (!jobId) {
    throw CustomException('معرف الوظيفة مطلوب', 400);
  }

  try {
    const progress = await BulkActionsService.getBulkActionProgress(jobId);

    if (!progress) {
      throw CustomException('الوظيفة غير موجودة', 404);
    }

    // IDOR protection - verify job belongs to firm
    if (progress.firmId && progress.firmId.toString() !== firmId.toString()) {
      throw CustomException('الوظيفة غير موجودة', 404);
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw CustomException(`فشل الحصول على تقدم الوظيفة: ${error.message}`, 400);
  }
});

/**
 * Cancel bulk action
 * POST /api/bulk-actions/:jobId/cancel
 */
const cancelBulkAction = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { jobId } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  if (!jobId) {
    throw CustomException('معرف الوظيفة مطلوب', 400);
  }

  // Only admin/owner can cancel bulk actions
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('فقط المالك أو المدير يمكنه إلغاء الإجراءات الجماعية', 403);
  }

  try {
    // Verify job belongs to firm before cancelling
    const progress = await BulkActionsService.getBulkActionProgress(jobId);

    if (!progress) {
      throw CustomException('الوظيفة غير موجودة', 404);
    }

    // IDOR protection
    if (progress.firmId && progress.firmId.toString() !== firmId.toString()) {
      throw CustomException('الوظيفة غير موجودة', 404);
    }

    const result = await BulkActionsService.cancelBulkAction(jobId);

    res.json({
      success: true,
      message: 'تم إلغاء الإجراء الجماعي بنجاح',
      data: result
    });
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw CustomException(`فشل إلغاء الوظيفة: ${error.message}`, 400);
  }
});

/**
 * Get supported bulk actions for entity type
 * GET /api/bulk-actions/supported/:entityType
 */
const getSupportedActions = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const { entityType } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  if (!entityType) {
    // Return all supported entity types and their actions
    const supportedTypes = BulkActionsService.getSupportedEntityTypes();
    const allActions = {};

    supportedTypes.forEach(type => {
      allActions[type] = BulkActionsService.getSupportedBulkActions(type);
    });

    res.json({
      success: true,
      data: {
        entityTypes: supportedTypes,
        actions: allActions
      }
    });
  } else {
    // Return supported actions for specific entity type
    const supportedTypes = BulkActionsService.getSupportedEntityTypes();

    if (!supportedTypes.includes(entityType)) {
      throw CustomException(`نوع الكيان غير مدعوم: ${entityType}`, 400);
    }

    const actions = BulkActionsService.getSupportedBulkActions(entityType);

    res.json({
      success: true,
      data: {
        entityType,
        actions
      }
    });
  }
});

/**
 * Validate bulk action before execution
 * POST /api/bulk-actions/:entityType/validate
 * Body: { action, ids }
 */
const validateBulkAction = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const { entityType } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, ['action', 'ids']);
  const { action, ids } = allowedFields;

  // Validate required fields
  if (!action) {
    throw CustomException('نوع الإجراء مطلوب', 400);
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw CustomException('يجب تحديد معرفات الكيانات كمصفوفة', 400);
  }

  // Sanitize entity IDs
  const sanitizedIds = ids
    .map(id => sanitizeObjectId(id))
    .filter(id => id !== null);

  if (sanitizedIds.length === 0) {
    throw CustomException('لا توجد معرفات صالحة', 400);
  }

  // Validate entity type
  const supportedTypes = BulkActionsService.getSupportedEntityTypes();
  if (!supportedTypes.includes(entityType)) {
    throw CustomException(`نوع الكيان غير مدعوم: ${entityType}`, 400);
  }

  // Validate action for entity type
  const supportedActions = BulkActionsService.getSupportedBulkActions(entityType);
  if (!supportedActions.includes(action)) {
    throw CustomException(
      `الإجراء '${action}' غير مدعوم لنوع الكيان '${entityType}'`,
      400
    );
  }

  try {
    const validation = await BulkActionsService.validateBulkAction(
      action,
      entityType,
      sanitizedIds,
      firmId
    );

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    throw CustomException(`فشل التحقق من الإجراء الجماعي: ${error.message}`, 400);
  }
});

module.exports = {
  executeBulkAction,
  getBulkActionProgress,
  cancelBulkAction,
  getSupportedActions,
  validateBulkAction
};
