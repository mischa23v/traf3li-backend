/**
 * Playbook Controller - Incident Response Playbook Management
 *
 * This controller provides endpoints for managing incident response playbooks
 * and their executions. Supports CRUD operations, execution management,
 * and analytics.
 *
 * All routes require authentication and firm membership.
 */

const PlaybookService = require('../services/playbook.service');
const { TeamActivityLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// PLAYBOOK MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * List playbooks
 * GET /api/playbooks
 */
const listPlaybooks = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Mass assignment protection
  const { category, severity, isActive } = pickAllowedFields(req.query, [
    'category',
    'severity',
    'isActive'
  ]);

  // Build filters
  const filters = { firmId };

  if (category) {
    filters.category = category;
  }

  if (severity) {
    filters.severity = severity;
  }

  if (isActive !== undefined) {
    filters.isActive = isActive === 'true' || isActive === true;
  }

  // Fetch playbooks
  const playbooks = await PlaybookService.getPlaybooks(filters);

  res.json({
    success: true,
    data: playbooks
  });
});

/**
 * Create playbook
 * POST /api/playbooks
 */
const createPlaybook = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Only owner/admin can create playbooks
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'name',
    'description',
    'category',
    'severity',
    'triggerConditions',
    'steps',
    'escalationPath',
    'isActive'
  ]);

  // Validate required fields
  if (!allowedFields.name || !allowedFields.category || !allowedFields.severity || !allowedFields.steps) {
    throw CustomException('الاسم والفئة والخطورة والخطوات مطلوبة', 400);
  }

  // Add firmId
  allowedFields.firmId = firmId;

  // Create playbook
  const playbook = await PlaybookService.createPlaybook(allowedFields, userId);

  if (!playbook) {
    throw CustomException('فشل في إنشاء الدليل الإرشادي', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'create',
    targetType: 'playbook',
    targetId: playbook._id,
    targetName: playbook.name,
    details: { category: playbook.category, severity: playbook.severity },
    timestamp: new Date()
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء الدليل الإرشادي بنجاح',
    data: playbook
  });
});

/**
 * Get playbook by ID
 * GET /api/playbooks/:id
 */
const getPlaybook = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Sanitize and verify playbook ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف الدليل غير صالح', 400);
  }

  // Fetch playbooks with firmId filter for IDOR protection
  const playbooks = await PlaybookService.getPlaybooks({ firmId });
  const playbook = playbooks.find(p => p._id.toString() === sanitizedId);

  if (!playbook) {
    throw CustomException('الدليل الإرشادي غير موجود', 404);
  }

  res.json({
    success: true,
    data: playbook
  });
});

/**
 * Update playbook
 * PUT /api/playbooks/:id
 */
const updatePlaybook = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Only owner/admin can update playbooks
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Sanitize and verify playbook ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف الدليل غير صالح', 400);
  }

  // Verify playbook belongs to firm (IDOR protection)
  const playbooks = await PlaybookService.getPlaybooks({ firmId });
  const existingPlaybook = playbooks.find(p => p._id.toString() === sanitizedId);

  if (!existingPlaybook) {
    throw CustomException('الدليل الإرشادي غير موجود', 404);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'name',
    'description',
    'category',
    'severity',
    'triggerConditions',
    'steps',
    'escalationPath',
    'isActive'
  ]);

  // Update playbook
  const playbook = await PlaybookService.updatePlaybook(sanitizedId, allowedFields, userId);

  if (!playbook) {
    throw CustomException('فشل في تحديث الدليل الإرشادي', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'update',
    targetType: 'playbook',
    targetId: playbook._id,
    targetName: playbook.name,
    details: { category: playbook.category, severity: playbook.severity },
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم تحديث الدليل الإرشادي بنجاح',
    data: playbook
  });
});

/**
 * Delete playbook
 * DELETE /api/playbooks/:id
 */
const deletePlaybook = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Only owner can delete playbooks
  if (req.firmRole !== 'owner') {
    throw CustomException('المورد غير موجود', 404);
  }

  // Sanitize and verify playbook ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف الدليل غير صالح', 400);
  }

  // Verify playbook belongs to firm (IDOR protection)
  const playbooks = await PlaybookService.getPlaybooks({ firmId });
  const existingPlaybook = playbooks.find(p => p._id.toString() === sanitizedId);

  if (!existingPlaybook) {
    throw CustomException('الدليل الإرشادي غير موجود', 404);
  }

  // Delete playbook
  const deleted = await PlaybookService.deletePlaybook(sanitizedId);

  if (!deleted) {
    throw CustomException('فشل في حذف الدليل الإرشادي. قد يكون لديه عمليات تنفيذ نشطة', 400);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'delete',
    targetType: 'playbook',
    targetId: sanitizedId,
    targetName: existingPlaybook.name,
    details: { category: existingPlaybook.category, severity: existingPlaybook.severity },
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم حذف الدليل الإرشادي بنجاح'
  });
});

// ═══════════════════════════════════════════════════════════════
// EXECUTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Start playbook execution
 * POST /api/playbooks/execute
 */
const startExecution = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Mass assignment protection
  const { incidentId, playbookId } = pickAllowedFields(req.body, [
    'incidentId',
    'playbookId'
  ]);

  // Validate required fields
  if (!incidentId || !playbookId) {
    throw CustomException('معرف الحادثة والدليل مطلوبان', 400);
  }

  // Sanitize IDs
  const sanitizedIncidentId = sanitizeObjectId(incidentId);
  const sanitizedPlaybookId = sanitizeObjectId(playbookId);

  if (!sanitizedIncidentId || !sanitizedPlaybookId) {
    throw CustomException('المعرفات المقدمة غير صالحة', 400);
  }

  // Start execution
  const execution = await PlaybookService.startExecution(
    sanitizedIncidentId,
    sanitizedPlaybookId,
    userId
  );

  if (!execution) {
    throw CustomException('فشل في بدء تنفيذ الدليل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'execute',
    targetType: 'playbook',
    targetId: sanitizedPlaybookId,
    targetName: execution.playbookId?.name || 'Playbook',
    details: { incidentId: sanitizedIncidentId, executionId: execution._id },
    timestamp: new Date()
  });

  res.status(201).json({
    success: true,
    message: 'تم بدء تنفيذ الدليل بنجاح',
    data: execution
  });
});

/**
 * Advance to next step
 * POST /api/playbooks/executions/:id/advance
 */
const advanceStep = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Sanitize execution ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف التنفيذ غير صالح', 400);
  }

  // Mass assignment protection
  const { success, data, error, notes } = pickAllowedFields(req.body, [
    'success',
    'data',
    'error',
    'notes'
  ]);

  // Advance step
  const execution = await PlaybookService.advanceStep(sanitizedId, {
    success,
    data,
    error,
    notes,
    userId
  });

  if (!execution) {
    throw CustomException('فشل في التقدم إلى الخطوة التالية', 500);
  }

  res.json({
    success: true,
    message: 'تم التقدم إلى الخطوة التالية بنجاح',
    data: execution
  });
});

/**
 * Skip step
 * POST /api/playbooks/executions/:id/skip
 */
const skipStep = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Sanitize execution ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف التنفيذ غير صالح', 400);
  }

  // Mass assignment protection
  const { reason } = pickAllowedFields(req.body, ['reason']);

  if (!reason) {
    throw CustomException('سبب التخطي مطلوب', 400);
  }

  // Skip step
  const execution = await PlaybookService.skipStep(sanitizedId, reason);

  if (!execution) {
    throw CustomException('فشل في تخطي الخطوة', 500);
  }

  res.json({
    success: true,
    message: 'تم تخطي الخطوة بنجاح',
    data: execution
  });
});

/**
 * Abort execution
 * POST /api/playbooks/executions/:id/abort
 */
const abortExecution = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Sanitize execution ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف التنفيذ غير صالح', 400);
  }

  // Mass assignment protection
  const { reason } = pickAllowedFields(req.body, ['reason']);

  if (!reason) {
    throw CustomException('سبب الإلغاء مطلوب', 400);
  }

  // Abort execution
  const execution = await PlaybookService.abortExecution(sanitizedId, userId, reason);

  if (!execution) {
    throw CustomException('فشل في إلغاء التنفيذ', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'abort',
    targetType: 'playbook_execution',
    targetId: sanitizedId,
    details: { reason },
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم إلغاء التنفيذ بنجاح',
    data: execution
  });
});

/**
 * Retry failed step
 * POST /api/playbooks/executions/:id/retry/:stepIndex
 */
const retryStep = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const { id, stepIndex } = req.params;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Sanitize execution ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف التنفيذ غير صالح', 400);
  }

  // Validate step index
  const stepIndexNum = parseInt(stepIndex);
  if (isNaN(stepIndexNum) || stepIndexNum < 1) {
    throw CustomException('رقم الخطوة غير صالح', 400);
  }

  // Retry step
  const execution = await PlaybookService.retryStep(sanitizedId, stepIndexNum);

  if (!execution) {
    throw CustomException('فشل في إعادة محاولة الخطوة', 500);
  }

  res.json({
    success: true,
    message: 'تم بدء إعادة محاولة الخطوة بنجاح',
    data: execution
  });
});

/**
 * Get execution status
 * GET /api/playbooks/executions/:id
 */
const getExecutionStatus = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Sanitize execution ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف التنفيذ غير صالح', 400);
  }

  // Get execution status
  const execution = await PlaybookService.getExecutionStatus(sanitizedId);

  if (!execution) {
    throw CustomException('التنفيذ غير موجود', 404);
  }

  // Verify belongs to firm (IDOR protection)
  if (execution.firmId && execution.firmId.toString() !== firmId.toString()) {
    throw CustomException('التنفيذ غير موجود', 404);
  }

  res.json({
    success: true,
    data: execution
  });
});

/**
 * Get execution history for incident
 * GET /api/playbooks/executions/incident/:incidentId
 */
const getExecutionHistory = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;
  const { incidentId } = req.params;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Sanitize incident ID
  const sanitizedId = sanitizeObjectId(incidentId);
  if (!sanitizedId) {
    throw CustomException('معرف الحادثة غير صالح', 400);
  }

  // Get execution history
  const executions = await PlaybookService.getExecutionHistory(sanitizedId);

  res.json({
    success: true,
    data: executions
  });
});

/**
 * Match playbook for incident
 * POST /api/playbooks/match
 */
const matchPlaybook = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Mass assignment protection
  const { incidentType, severity } = pickAllowedFields(req.body, [
    'incidentType',
    'severity'
  ]);

  // Validate required fields
  if (!incidentType || !severity) {
    throw CustomException('نوع الحادثة والخطورة مطلوبان', 400);
  }

  // Match playbook
  const playbook = await PlaybookService.matchPlaybook(incidentType, severity, firmId);

  if (!playbook) {
    res.json({
      success: true,
      message: 'لم يتم العثور على دليل إرشادي مطابق',
      data: null
    });
    return;
  }

  res.json({
    success: true,
    data: playbook
  });
});

// ═══════════════════════════════════════════════════════════════
// STATISTICS & ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get playbook statistics
 * GET /api/playbooks/stats
 */
const getPlaybookStats = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  const stats = await PlaybookService.getPlaybookStats(firmId);

  res.json({
    success: true,
    data: stats
  });
});

/**
 * Get execution statistics
 * GET /api/playbooks/executions/stats
 */
const getExecutionStats = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('المورد غير موجود', 404);
  }

  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('المورد غير موجود', 404);
  }

  // Mass assignment protection
  const { startDate, endDate } = pickAllowedFields(req.query, [
    'startDate',
    'endDate'
  ]);

  const dateRange = {};
  if (startDate) dateRange.startDate = startDate;
  if (endDate) dateRange.endDate = endDate;

  const stats = await PlaybookService.getExecutionStats(firmId, dateRange);

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  // Playbook management
  listPlaybooks,
  createPlaybook,
  getPlaybook,
  updatePlaybook,
  deletePlaybook,

  // Execution management
  startExecution,
  advanceStep,
  skipStep,
  abortExecution,
  retryStep,
  getExecutionStatus,
  getExecutionHistory,
  matchPlaybook,

  // Statistics
  getPlaybookStats,
  getExecutionStats
};
