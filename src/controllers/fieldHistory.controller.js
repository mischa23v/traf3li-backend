/**
 * Field History Controller - API Endpoints for Field-Level Change Tracking
 *
 * Provides endpoints for:
 * - Viewing field history
 * - Comparing versions
 * - Reverting changes
 * - Timeline visualization
 * - User activity tracking
 */

const fieldHistoryService = require('../services/fieldHistory.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// SECURITY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate entity type to prevent injection
 */
const validateEntityType = (entityType) => {
  const allowedEntityTypes = [
    'Invoice',
    'Client',
    'Case',
    'Employee',
    'Expense',
    'Payment',
    'Bill',
    'BankTransaction',
    'Contact',
    'Lead',
    'Opportunity',
    'Task',
    'Project',
  ];

  if (!allowedEntityTypes.includes(entityType)) {
    throw CustomException('نوع الكيان غير صالح', 400);
  }

  return entityType;
};

/**
 * Verify firm ownership for entity history access
 */
const verifyFirmOwnership = async (req) => {
  const { FirmMember } = require('../models');

  if (!req.firmId || !req.userID) {
    throw CustomException('معرف المكتب أو المستخدم غير صالح', 400);
  }

  const membership = await FirmMember.findOne({
    firmId: req.firmId,
    userId: req.userID,
    isDeparted: false,
  });

  if (!membership) {
    throw CustomException('ليس لديك صلاحية للوصول إلى هذا المكتب', 403);
  }

  return membership;
};

// ═══════════════════════════════════════════════════════════════
// FIELD HISTORY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get field history for a specific field
 * GET /api/field-history/:entityType/:entityId/field/:fieldName
 */
const getFieldHistory = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  await verifyFirmOwnership(req);

  const { entityType, entityId, fieldName } = req.params;

  // Validate entity type
  validateEntityType(entityType);

  // Sanitize entity ID
  const sanitizedEntityId = sanitizeObjectId(entityId);
  if (!sanitizedEntityId) {
    throw CustomException('معرف الكيان غير صالح', 400);
  }

  // Get query options
  const limit = parseInt(req.query.limit) || 50;
  const skip = parseInt(req.query.skip) || 0;
  const includeReverted = req.query.includeReverted === 'true';

  const history = await fieldHistoryService.getFieldHistory(
    entityType,
    sanitizedEntityId,
    fieldName,
    {
      limit,
      skip,
      includeReverted,
    }
  );

  res.json({
    success: true,
    data: history,
    meta: {
      entityType,
      entityId: sanitizedEntityId,
      fieldName,
      count: history.length,
    },
  });
});

/**
 * Get all field history for an entity
 * GET /api/field-history/:entityType/:entityId
 */
const getEntityHistory = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  await verifyFirmOwnership(req);

  const { entityType, entityId } = req.params;

  // Validate entity type
  validateEntityType(entityType);

  // Sanitize entity ID
  const sanitizedEntityId = sanitizeObjectId(entityId);
  if (!sanitizedEntityId) {
    throw CustomException('معرف الكيان غير صالح', 400);
  }

  // Get query options
  const limit = parseInt(req.query.limit) || 100;
  const skip = parseInt(req.query.skip) || 0;
  const includeReverted = req.query.includeReverted === 'true';
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
  const changedBy = req.query.changedBy ? sanitizeObjectId(req.query.changedBy) : null;
  const fieldName = req.query.fieldName || null;
  const changeType = req.query.changeType || null;

  const history = await fieldHistoryService.getEntityHistory(entityType, sanitizedEntityId, {
    limit,
    skip,
    includeReverted,
    startDate,
    endDate,
    changedBy,
    fieldName,
    changeType,
  });

  // Get statistics
  const stats = await fieldHistoryService.getEntityHistoryStats(entityType, sanitizedEntityId);

  res.json({
    success: true,
    data: history,
    stats,
    meta: {
      entityType,
      entityId: sanitizedEntityId,
      count: history.length,
    },
  });
});

/**
 * Get field timeline visualization data
 * GET /api/field-history/:entityType/:entityId/timeline/:fieldName
 */
const getFieldTimeline = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  await verifyFirmOwnership(req);

  const { entityType, entityId, fieldName } = req.params;

  // Validate entity type
  validateEntityType(entityType);

  // Sanitize entity ID
  const sanitizedEntityId = sanitizeObjectId(entityId);
  if (!sanitizedEntityId) {
    throw CustomException('معرف الكيان غير صالح', 400);
  }

  const timeline = await fieldHistoryService.getFieldTimeline(
    entityType,
    sanitizedEntityId,
    fieldName
  );

  res.json({
    success: true,
    data: timeline,
    meta: {
      entityType,
      entityId: sanitizedEntityId,
      fieldName,
      count: timeline.length,
    },
  });
});

/**
 * Compare two versions of an entity
 * GET /api/field-history/:entityType/:entityId/compare
 * Query params: version1, version2 (ISO date strings)
 */
const compareVersions = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  await verifyFirmOwnership(req);

  const { entityType, entityId } = req.params;
  const { version1, version2 } = req.query;

  if (!version1 || !version2) {
    throw CustomException('يجب تحديد تاريخين للمقارنة', 400);
  }

  // Validate entity type
  validateEntityType(entityType);

  // Sanitize entity ID
  const sanitizedEntityId = sanitizeObjectId(entityId);
  if (!sanitizedEntityId) {
    throw CustomException('معرف الكيان غير صالح', 400);
  }

  // Validate dates
  const v1Date = new Date(version1);
  const v2Date = new Date(version2);

  if (isNaN(v1Date.getTime()) || isNaN(v2Date.getTime())) {
    throw CustomException('التواريخ غير صالحة', 400);
  }

  const comparison = await fieldHistoryService.compareVersions(
    entityType,
    sanitizedEntityId,
    v1Date,
    v2Date
  );

  res.json({
    success: true,
    data: comparison,
  });
});

/**
 * Revert a field to its previous value
 * POST /api/field-history/:historyId/revert
 */
const revertField = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  await verifyFirmOwnership(req);

  // Only admins/owners can revert changes
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('ليس لديك صلاحية لإرجاع التغييرات', 403);
  }

  const { historyId } = req.params;

  // Sanitize history ID
  const sanitizedHistoryId = sanitizeObjectId(historyId);
  if (!sanitizedHistoryId) {
    throw CustomException('معرف السجل غير صالح', 400);
  }

  const userId = req.userID;

  const result = await fieldHistoryService.revertField(sanitizedHistoryId, userId);

  res.json({
    success: true,
    message: 'تم إرجاع التغيير بنجاح',
    data: result,
  });
});

/**
 * Get all changes made by a user
 * GET /api/field-history/user/:userId
 */
const getUserChanges = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  await verifyFirmOwnership(req);

  const { userId } = req.params;

  // Sanitize user ID
  const sanitizedUserId = sanitizeObjectId(userId);
  if (!sanitizedUserId) {
    throw CustomException('معرف المستخدم غير صالح', 400);
  }

  // Users can view their own changes, admins can view anyone's
  if (sanitizedUserId !== req.userID.toString() && !['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('ليس لديك صلاحية لعرض هذه البيانات', 403);
  }

  // Get query options
  const limit = parseInt(req.query.limit) || 100;
  const skip = parseInt(req.query.skip) || 0;
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
  const entityType = req.query.entityType || null;

  const changes = await fieldHistoryService.getUserChanges(
    sanitizedUserId,
    { startDate, endDate },
    {
      limit,
      skip,
      entityType,
      firmId,
    }
  );

  res.json({
    success: true,
    data: changes,
    meta: {
      userId: sanitizedUserId,
      count: changes.length,
    },
  });
});

/**
 * Get recent changes across the firm
 * GET /api/field-history/recent
 */
const getRecentChanges = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  await verifyFirmOwnership(req);

  // Only admins/owners can view firm-wide changes
  if (!['owner', 'admin'].includes(req.firmRole) && !req.hasPermission('reports', 'view')) {
    throw CustomException('ليس لديك صلاحية لعرض هذه البيانات', 403);
  }

  const limit = parseInt(req.query.limit) || 50;
  const entityType = req.query.entityType || null;
  const changeType = req.query.changeType || null;

  const changes = await fieldHistoryService.getRecentChanges(firmId, limit, {
    entityType,
    changeType,
  });

  res.json({
    success: true,
    data: changes,
    meta: {
      firmId,
      count: changes.length,
    },
  });
});

/**
 * Get entity history statistics
 * GET /api/field-history/:entityType/:entityId/stats
 */
const getEntityHistoryStats = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  await verifyFirmOwnership(req);

  const { entityType, entityId } = req.params;

  // Validate entity type
  validateEntityType(entityType);

  // Sanitize entity ID
  const sanitizedEntityId = sanitizeObjectId(entityId);
  if (!sanitizedEntityId) {
    throw CustomException('معرف الكيان غير صالح', 400);
  }

  const stats = await fieldHistoryService.getEntityHistoryStats(entityType, sanitizedEntityId);

  res.json({
    success: true,
    data: stats,
    meta: {
      entityType,
      entityId: sanitizedEntityId,
    },
  });
});

module.exports = {
  getFieldHistory,
  getEntityHistory,
  getFieldTimeline,
  compareVersions,
  revertField,
  getUserChanges,
  getRecentChanges,
  getEntityHistoryStats,
};
