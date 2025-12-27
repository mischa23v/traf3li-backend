const manufacturingService = require('../services/manufacturing.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const { TeamActivityLog } = require('../models');

/**
 * Manufacturing Controller
 * Handles all manufacturing-related HTTP requests
 */

// ═══════════════════════════════════════════════════════════════
// BOMs (Bill of Materials)
// ═══════════════════════════════════════════════════════════════

/**
 * Get BOMs
 * GET /api/manufacturing/boms
 */
const getBOMs = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Mass assignment protection
  const query = pickAllowedFields(req.query, [
    'itemId',
    'isActive',
    'isDefault',
    'search',
    'page',
    'limit'
  ]);

  const result = await manufacturingService.getBOMs(query, firmId);

  res.json({
    success: true,
    data: result.boms,
    pagination: result.pagination
  });
});

/**
 * Get BOM by ID
 * GET /api/manufacturing/boms/:id
 */
const getBOMById = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize and verify ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف BOM غير صالح', 400);
  }

  // IDOR protection - verify firmId
  const bom = await manufacturingService.getBOMById(sanitizedId, firmId);

  if (!bom) {
    throw CustomException('BOM غير موجود', 404);
  }

  res.json({
    success: true,
    data: bom
  });
});

/**
 * Create BOM
 * POST /api/manufacturing/boms
 */
const createBOM = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Only certain roles can create BOMs
  if (!['owner', 'admin', 'manager'].includes(req.firmRole)) {
    throw CustomException('ليس لديك صلاحية لإنشاء BOM', 403);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'itemId',
    'itemCode',
    'itemName',
    'bomType',
    'quantity',
    'uom',
    'isActive',
    'isDefault',
    'items',
    'operations',
    'routingId',
    'remarks'
  ]);

  // Validate required fields
  if (!allowedFields.itemId || !allowedFields.itemCode || !allowedFields.itemName) {
    throw CustomException('Item ID, code, and name are required', 400);
  }

  const bom = await manufacturingService.createBOM(allowedFields, firmId, userId);

  if (!bom) {
    throw CustomException('فشل في إنشاء BOM', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'create',
    targetType: 'bom',
    targetId: bom._id,
    targetName: bom.bomId,
    details: { itemName: bom.itemName },
    timestamp: new Date()
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء BOM بنجاح',
    data: bom
  });
});

/**
 * Update BOM
 * PUT /api/manufacturing/boms/:id
 */
const updateBOM = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Only certain roles can update BOMs
  if (!['owner', 'admin', 'manager'].includes(req.firmRole)) {
    throw CustomException('BOM غير موجود', 404);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف BOM غير صالح', 400);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'bomType',
    'quantity',
    'uom',
    'isActive',
    'isDefault',
    'items',
    'operations',
    'routingId',
    'remarks'
  ]);

  const bom = await manufacturingService.updateBOM(sanitizedId, allowedFields, firmId, userId);

  if (!bom) {
    throw CustomException('فشل في تحديث BOM', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'update',
    targetType: 'bom',
    targetId: bom._id,
    targetName: bom.bomId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم تحديث BOM بنجاح',
    data: bom
  });
});

/**
 * Delete BOM
 * DELETE /api/manufacturing/boms/:id
 */
const deleteBOM = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Only owner can delete BOMs
  if (req.firmRole !== 'owner') {
    throw CustomException('BOM غير موجود', 404);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف BOM غير صالح', 400);
  }

  const success = await manufacturingService.deleteBOM(sanitizedId, firmId);

  if (!success) {
    throw CustomException('فشل في حذف BOM. قد يكون مستخدماً في أوامر عمل', 400);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'delete',
    targetType: 'bom',
    targetId: sanitizedId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم حذف BOM بنجاح'
  });
});

// ═══════════════════════════════════════════════════════════════
// WORKSTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get workstations
 * GET /api/manufacturing/workstations
 */
const getWorkstations = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  const workstations = await manufacturingService.getWorkstations(firmId);

  res.json({
    success: true,
    data: workstations
  });
});

/**
 * Get workstation by ID
 * GET /api/manufacturing/workstations/:id
 */
const getWorkstationById = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف محطة العمل غير صالح', 400);
  }

  const workstation = await manufacturingService.getWorkstationById(sanitizedId, firmId);

  if (!workstation) {
    throw CustomException('محطة العمل غير موجودة', 404);
  }

  res.json({
    success: true,
    data: workstation
  });
});

/**
 * Create workstation
 * POST /api/manufacturing/workstations
 */
const createWorkstation = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Only certain roles can create workstations
  if (!['owner', 'admin', 'manager'].includes(req.firmRole)) {
    throw CustomException('ليس لديك صلاحية لإنشاء محطة عمل', 403);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'name',
    'nameAr',
    'description',
    'productionCapacity',
    'workstationType',
    'operatingCosts',
    'workingHours',
    'holidayList',
    'location',
    'isActive'
  ]);

  // Validate required fields
  if (!allowedFields.name) {
    throw CustomException('اسم محطة العمل مطلوب', 400);
  }

  const workstation = await manufacturingService.createWorkstation(allowedFields, firmId, userId);

  if (!workstation) {
    throw CustomException('فشل في إنشاء محطة العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'create',
    targetType: 'workstation',
    targetId: workstation._id,
    targetName: workstation.name,
    timestamp: new Date()
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء محطة العمل بنجاح',
    data: workstation
  });
});

/**
 * Update workstation
 * PUT /api/manufacturing/workstations/:id
 */
const updateWorkstation = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Only certain roles can update workstations
  if (!['owner', 'admin', 'manager'].includes(req.firmRole)) {
    throw CustomException('محطة العمل غير موجودة', 404);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف محطة العمل غير صالح', 400);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'name',
    'nameAr',
    'description',
    'productionCapacity',
    'workstationType',
    'operatingCosts',
    'workingHours',
    'holidayList',
    'location',
    'isActive'
  ]);

  const workstation = await manufacturingService.updateWorkstation(sanitizedId, allowedFields, firmId, userId);

  if (!workstation) {
    throw CustomException('فشل في تحديث محطة العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'update',
    targetType: 'workstation',
    targetId: workstation._id,
    targetName: workstation.name,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم تحديث محطة العمل بنجاح',
    data: workstation
  });
});

/**
 * Delete workstation
 * DELETE /api/manufacturing/workstations/:id
 */
const deleteWorkstation = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Only owner can delete workstations
  if (req.firmRole !== 'owner') {
    throw CustomException('محطة العمل غير موجودة', 404);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف محطة العمل غير صالح', 400);
  }

  const success = await manufacturingService.deleteWorkstation(sanitizedId, firmId);

  if (!success) {
    throw CustomException('فشل في حذف محطة العمل', 400);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'delete',
    targetType: 'workstation',
    targetId: sanitizedId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم حذف محطة العمل بنجاح'
  });
});

// ═══════════════════════════════════════════════════════════════
// WORK ORDERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get work orders
 * GET /api/manufacturing/work-orders
 */
const getWorkOrders = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Mass assignment protection
  const query = pickAllowedFields(req.query, [
    'status',
    'itemId',
    'bomId',
    'dateFrom',
    'dateTo',
    'search',
    'page',
    'limit'
  ]);

  const result = await manufacturingService.getWorkOrders(query, firmId);

  res.json({
    success: true,
    data: result.workOrders,
    pagination: result.pagination
  });
});

/**
 * Get work order by ID
 * GET /api/manufacturing/work-orders/:id
 */
const getWorkOrderById = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف أمر العمل غير صالح', 400);
  }

  const workOrder = await manufacturingService.getWorkOrderById(sanitizedId, firmId);

  if (!workOrder) {
    throw CustomException('أمر العمل غير موجود', 404);
  }

  res.json({
    success: true,
    data: workOrder
  });
});

/**
 * Create work order
 * POST /api/manufacturing/work-orders
 */
const createWorkOrder = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'itemId',
    'itemCode',
    'itemName',
    'bomId',
    'qty',
    'uom',
    'plannedStartDate',
    'plannedEndDate',
    'targetWarehouse',
    'workInProgressWarehouse',
    'sourceWarehouse',
    'salesOrderId',
    'materialRequestId',
    'requiredItems',
    'operations',
    'remarks'
  ]);

  // Validate required fields
  if (!allowedFields.bomId || !allowedFields.qty || !allowedFields.targetWarehouse) {
    throw CustomException('BOM, quantity, and target warehouse are required', 400);
  }

  const workOrder = await manufacturingService.createWorkOrder(allowedFields, firmId, userId);

  if (!workOrder) {
    throw CustomException('فشل في إنشاء أمر العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'create',
    targetType: 'work_order',
    targetId: workOrder._id,
    targetName: workOrder.workOrderId,
    details: { itemName: workOrder.itemName, qty: workOrder.qty },
    timestamp: new Date()
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء أمر العمل بنجاح',
    data: workOrder
  });
});

/**
 * Update work order
 * PUT /api/manufacturing/work-orders/:id
 */
const updateWorkOrder = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف أمر العمل غير صالح', 400);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'qty',
    'plannedStartDate',
    'plannedEndDate',
    'targetWarehouse',
    'workInProgressWarehouse',
    'sourceWarehouse',
    'requiredItems',
    'operations',
    'remarks'
  ]);

  const workOrder = await manufacturingService.updateWorkOrder(sanitizedId, allowedFields, firmId, userId);

  if (!workOrder) {
    throw CustomException('فشل في تحديث أمر العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'update',
    targetType: 'work_order',
    targetId: workOrder._id,
    targetName: workOrder.workOrderId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم تحديث أمر العمل بنجاح',
    data: workOrder
  });
});

/**
 * Submit work order
 * POST /api/manufacturing/work-orders/:id/submit
 */
const submitWorkOrder = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف أمر العمل غير صالح', 400);
  }

  const workOrder = await manufacturingService.submitWorkOrder(sanitizedId, firmId, userId);

  if (!workOrder) {
    throw CustomException('فشل في تقديم أمر العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'submit',
    targetType: 'work_order',
    targetId: workOrder._id,
    targetName: workOrder.workOrderId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم تقديم أمر العمل بنجاح',
    data: workOrder
  });
});

/**
 * Start work order
 * POST /api/manufacturing/work-orders/:id/start
 */
const startWorkOrder = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف أمر العمل غير صالح', 400);
  }

  const workOrder = await manufacturingService.startWorkOrder(sanitizedId, firmId, userId);

  if (!workOrder) {
    throw CustomException('فشل في بدء أمر العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'start',
    targetType: 'work_order',
    targetId: workOrder._id,
    targetName: workOrder.workOrderId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم بدء أمر العمل بنجاح',
    data: workOrder
  });
});

/**
 * Complete work order
 * POST /api/manufacturing/work-orders/:id/complete
 */
const completeWorkOrder = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف أمر العمل غير صالح', 400);
  }

  const workOrder = await manufacturingService.completeWorkOrder(sanitizedId, firmId, userId);

  if (!workOrder) {
    throw CustomException('فشل في إكمال أمر العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'complete',
    targetType: 'work_order',
    targetId: workOrder._id,
    targetName: workOrder.workOrderId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم إكمال أمر العمل بنجاح',
    data: workOrder
  });
});

/**
 * Cancel work order
 * POST /api/manufacturing/work-orders/:id/cancel
 */
const cancelWorkOrder = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Only certain roles can cancel
  if (!['owner', 'admin', 'manager'].includes(req.firmRole)) {
    throw CustomException('أمر العمل غير موجود', 404);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف أمر العمل غير صالح', 400);
  }

  const workOrder = await manufacturingService.cancelWorkOrder(sanitizedId, firmId, userId);

  if (!workOrder) {
    throw CustomException('فشل في إلغاء أمر العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'cancel',
    targetType: 'work_order',
    targetId: workOrder._id,
    targetName: workOrder.workOrderId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم إلغاء أمر العمل بنجاح',
    data: workOrder
  });
});

/**
 * Delete work order
 * DELETE /api/manufacturing/work-orders/:id
 */
const deleteWorkOrder = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Only owner can delete
  if (req.firmRole !== 'owner') {
    throw CustomException('أمر العمل غير موجود', 404);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف أمر العمل غير صالح', 400);
  }

  const success = await manufacturingService.deleteWorkOrder(sanitizedId, firmId);

  if (!success) {
    throw CustomException('فشل في حذف أمر العمل. يمكن حذف الأوامر المسودة فقط', 400);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'delete',
    targetType: 'work_order',
    targetId: sanitizedId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم حذف أمر العمل بنجاح'
  });
});

// ═══════════════════════════════════════════════════════════════
// JOB CARDS
// ═══════════════════════════════════════════════════════════════

/**
 * Get job cards
 * GET /api/manufacturing/job-cards
 */
const getJobCards = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Mass assignment protection
  const query = pickAllowedFields(req.query, [
    'workOrderId',
    'workstation',
    'employee',
    'status',
    'page',
    'limit'
  ]);

  const result = await manufacturingService.getJobCards(query, firmId);

  res.json({
    success: true,
    data: result.jobCards,
    pagination: result.pagination
  });
});

/**
 * Get job card by ID
 * GET /api/manufacturing/job-cards/:id
 */
const getJobCardById = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف بطاقة العمل غير صالح', 400);
  }

  const jobCard = await manufacturingService.getJobCardById(sanitizedId, firmId);

  if (!jobCard) {
    throw CustomException('بطاقة العمل غير موجودة', 404);
  }

  res.json({
    success: true,
    data: jobCard
  });
});

/**
 * Create job card
 * POST /api/manufacturing/job-cards
 */
const createJobCard = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'workOrderId',
    'workOrderNumber',
    'operation',
    'workstation',
    'itemId',
    'itemCode',
    'itemName',
    'forQty',
    'plannedStartTime',
    'plannedEndTime',
    'employee',
    'remarks'
  ]);

  // Validate required fields
  if (!allowedFields.workOrderId || !allowedFields.operation) {
    throw CustomException('Work order and operation are required', 400);
  }

  const jobCard = await manufacturingService.createJobCard(allowedFields, firmId, userId);

  if (!jobCard) {
    throw CustomException('فشل في إنشاء بطاقة العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'create',
    targetType: 'job_card',
    targetId: jobCard._id,
    targetName: jobCard.jobCardId,
    details: { operation: jobCard.operation },
    timestamp: new Date()
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء بطاقة العمل بنجاح',
    data: jobCard
  });
});

/**
 * Update job card
 * PUT /api/manufacturing/job-cards/:id
 */
const updateJobCard = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف بطاقة العمل غير صالح', 400);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'operation',
    'workstation',
    'forQty',
    'completedQty',
    'plannedStartTime',
    'plannedEndTime',
    'employee',
    'remarks'
  ]);

  const jobCard = await manufacturingService.updateJobCard(sanitizedId, allowedFields, firmId, userId);

  if (!jobCard) {
    throw CustomException('فشل في تحديث بطاقة العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'update',
    targetType: 'job_card',
    targetId: jobCard._id,
    targetName: jobCard.jobCardId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم تحديث بطاقة العمل بنجاح',
    data: jobCard
  });
});

/**
 * Start job card
 * POST /api/manufacturing/job-cards/:id/start
 */
const startJobCard = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف بطاقة العمل غير صالح', 400);
  }

  const jobCard = await manufacturingService.startJobCard(sanitizedId, firmId, userId);

  if (!jobCard) {
    throw CustomException('فشل في بدء بطاقة العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'start',
    targetType: 'job_card',
    targetId: jobCard._id,
    targetName: jobCard.jobCardId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم بدء بطاقة العمل بنجاح',
    data: jobCard
  });
});

/**
 * Complete job card
 * POST /api/manufacturing/job-cards/:id/complete
 */
const completeJobCard = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف بطاقة العمل غير صالح', 400);
  }

  const jobCard = await manufacturingService.completeJobCard(sanitizedId, firmId, userId);

  if (!jobCard) {
    throw CustomException('فشل في إكمال بطاقة العمل', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'complete',
    targetType: 'job_card',
    targetId: jobCard._id,
    targetName: jobCard.jobCardId,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم إكمال بطاقة العمل بنجاح',
    data: jobCard
  });
});

// ═══════════════════════════════════════════════════════════════
// STATS & SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get manufacturing stats
 * GET /api/manufacturing/stats
 */
const getStats = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  const stats = await manufacturingService.getStats(firmId);

  res.json({
    success: true,
    data: stats
  });
});

/**
 * Get manufacturing settings
 * GET /api/manufacturing/settings
 */
const getSettings = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  const settings = await manufacturingService.getSettings(firmId);

  res.json({
    success: true,
    data: settings
  });
});

/**
 * Update manufacturing settings
 * PUT /api/manufacturing/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Only owner/admin can update settings
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('فقط مالك أو مدير المكتب يمكنه تحديث الإعدادات', 403);
  }

  // Mass assignment protection
  const allowedFields = pickAllowedFields(req.body, [
    'defaultWarehouse',
    'workInProgressWarehouse',
    'autoCreateJobCards',
    'backflushRawMaterials',
    'capacityPlanningEnabled',
    'allowOverProduction',
    'overProductionPercentage',
    'allowWorkOrderWithoutBOM',
    'materialConsumptionMethod',
    'allowMaterialTransferBeforeStart',
    'updateItemCostAfterProduction',
    'valuationMethod',
    'enableQualityInspection',
    'defaultQualityTemplate',
    'defaultManufacturingLeadTime',
    'schedulingMethod',
    'notifyOnOverdue',
    'notifyOnMaterialShortage',
    'notifyOnProductionComplete',
    'customSettings'
  ]);

  const settings = await manufacturingService.updateSettings(allowedFields, firmId, userId);

  if (!settings) {
    throw CustomException('فشل في تحديث الإعدادات', 500);
  }

  // Log activity
  await TeamActivityLog.log({
    firmId,
    userId,
    action: 'update',
    targetType: 'setting',
    targetName: 'Manufacturing Settings',
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'تم تحديث إعدادات التصنيع بنجاح',
    data: settings
  });
});

// ═══════════════════════════════════════════════════════════════
// HELPER ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Create work order from BOM
 * POST /api/manufacturing/work-orders/from-bom
 */
const createWorkOrderFromBOM = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Mass assignment protection
  const { bomId, qty } = pickAllowedFields(req.body, ['bomId', 'qty']);

  // Validate
  if (!bomId || !qty) {
    throw CustomException('BOM ID and quantity are required', 400);
  }

  const sanitizedBomId = sanitizeObjectId(bomId);
  if (!sanitizedBomId) {
    throw CustomException('معرف BOM غير صالح', 400);
  }

  const workOrder = await manufacturingService.createWorkOrderFromBOM(sanitizedBomId, qty, firmId, userId);

  if (!workOrder) {
    throw CustomException('فشل في إنشاء أمر العمل من BOM', 500);
  }

  res.status(201).json({
    success: true,
    message: 'تم إنشاء أمر العمل من BOM بنجاح',
    data: workOrder
  });
});

/**
 * Create job cards for work order
 * POST /api/manufacturing/work-orders/:id/create-job-cards
 */
const createJobCardsForWorkOrder = asyncHandler(async (req, res) => {
  if (req.isDeparted) {
    throw CustomException('ليس لديك صلاحية للوصول', 403);
  }

  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
  }

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف أمر العمل غير صالح', 400);
  }

  const jobCards = await manufacturingService.createJobCardsForWorkOrder(sanitizedId, firmId, userId);

  res.json({
    success: true,
    message: `تم إنشاء ${jobCards.length} بطاقة عمل بنجاح`,
    data: jobCards
  });
});

module.exports = {
  // BOMs
  getBOMs,
  getBOMById,
  createBOM,
  updateBOM,
  deleteBOM,

  // Workstations
  getWorkstations,
  getWorkstationById,
  createWorkstation,
  updateWorkstation,
  deleteWorkstation,

  // Work Orders
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  submitWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  cancelWorkOrder,
  deleteWorkOrder,

  // Job Cards
  getJobCards,
  getJobCardById,
  createJobCard,
  updateJobCard,
  startJobCard,
  completeJobCard,

  // Stats & Settings
  getStats,
  getSettings,
  updateSettings,

  // Helpers
  createWorkOrderFromBOM,
  createJobCardsForWorkOrder
};
