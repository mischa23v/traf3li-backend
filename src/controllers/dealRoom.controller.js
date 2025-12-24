const DealRoomService = require('../services/dealRoom.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Get deal room by deal ID
 * GET /api/deals/:dealId/room
 */
const getDealRoom = asyncHandler(async (req, res) => {
  const { dealId } = req.params;
  const firmId = req.firmId;

  // Validate deal ID
  const sanitizedDealId = sanitizeObjectId(dealId);
  if (!sanitizedDealId) {
    throw CustomException('معرف الصفقة غير صالح', 400);
  }

  // Get or create deal room
  const dealRoom = await DealRoomService.getDealRoomByDeal(sanitizedDealId, firmId);

  if (!dealRoom) {
    throw CustomException('لم يتم العثور على غرفة الصفقة', 404);
  }

  res.status(200).json({
    success: true,
    data: dealRoom
  });
});

/**
 * Create deal room
 * POST /api/deals/:dealId/room
 */
const createDealRoom = asyncHandler(async (req, res) => {
  const { dealId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  // Validate deal ID
  const sanitizedDealId = sanitizeObjectId(dealId);
  if (!sanitizedDealId) {
    throw CustomException('معرف الصفقة غير صالح', 400);
  }

  // Mass assignment protection - only allow specific fields
  const allowedFields = ['name'];
  const data = pickAllowedFields(req.body, allowedFields);

  // Validate required fields
  if (!data.name) {
    throw CustomException('اسم غرفة الصفقة مطلوب', 400);
  }

  // Create deal room
  const dealRoom = await DealRoomService.createDealRoom(
    sanitizedDealId,
    data.name,
    userId,
    firmId
  );

  if (!dealRoom) {
    throw CustomException('فشل في إنشاء غرفة الصفقة', 500);
  }

  res.status(201).json({
    success: true,
    message: 'تم إنشاء غرفة الصفقة بنجاح',
    data: dealRoom
  });
});

/**
 * Add page to deal room
 * POST /api/deal-rooms/:id/pages
 */
const addPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userID;

  // Validate deal room ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف غرفة الصفقة غير صالح', 400);
  }

  // Mass assignment protection - only allow specific fields
  const allowedFields = ['title', 'content'];
  const data = pickAllowedFields(req.body, allowedFields);

  // Validate required fields
  if (!data.title) {
    throw CustomException('عنوان الصفحة مطلوب', 400);
  }

  // Add page
  const dealRoom = await DealRoomService.addPage(
    sanitizedId,
    data.title,
    data.content || { blocks: [] },
    userId
  );

  if (!dealRoom) {
    throw CustomException('فشل في إضافة الصفحة', 500);
  }

  res.status(201).json({
    success: true,
    message: 'تم إضافة الصفحة بنجاح',
    data: dealRoom
  });
});

/**
 * Update page
 * PUT /api/deal-rooms/:id/pages/:pageId
 */
const updatePage = asyncHandler(async (req, res) => {
  const { id, pageId } = req.params;
  const userId = req.userID;

  // Validate IDs
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف غرفة الصفقة غير صالح', 400);
  }

  if (!pageId) {
    throw CustomException('معرف الصفحة مطلوب', 400);
  }

  // Mass assignment protection - only allow specific fields
  const allowedFields = ['title', 'content'];
  const updates = pickAllowedFields(req.body, allowedFields);

  // Validate at least one field to update
  if (Object.keys(updates).length === 0) {
    throw CustomException('لم يتم توفير بيانات للتحديث', 400);
  }

  // Update page
  const dealRoom = await DealRoomService.updatePage(
    sanitizedId,
    pageId,
    updates,
    userId
  );

  if (!dealRoom) {
    throw CustomException('فشل في تحديث الصفحة', 500);
  }

  res.status(200).json({
    success: true,
    message: 'تم تحديث الصفحة بنجاح',
    data: dealRoom
  });
});

/**
 * Delete page
 * DELETE /api/deal-rooms/:id/pages/:pageId
 */
const deletePage = asyncHandler(async (req, res) => {
  const { id, pageId } = req.params;
  const userId = req.userID;

  // Validate IDs
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف غرفة الصفقة غير صالح', 400);
  }

  if (!pageId) {
    throw CustomException('معرف الصفحة مطلوب', 400);
  }

  // Delete page
  const dealRoom = await DealRoomService.deletePage(
    sanitizedId,
    pageId,
    userId
  );

  if (!dealRoom) {
    throw CustomException('فشل في حذف الصفحة', 500);
  }

  res.status(200).json({
    success: true,
    message: 'تم حذف الصفحة بنجاح',
    data: dealRoom
  });
});

/**
 * Upload document
 * POST /api/deal-rooms/:id/documents
 */
const uploadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userID;

  // Validate deal room ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف غرفة الصفقة غير صالح', 400);
  }

  // Mass assignment protection - only allow specific fields
  const allowedFields = ['name', 'url', 'type', 'size', 'description'];
  const documentData = pickAllowedFields(req.body, allowedFields);

  // Validate required fields
  if (!documentData.name || !documentData.url) {
    throw CustomException('اسم المستند والرابط مطلوبان', 400);
  }

  // Upload document
  const dealRoom = await DealRoomService.uploadDocument(
    sanitizedId,
    documentData,
    userId
  );

  if (!dealRoom) {
    throw CustomException('فشل في تحميل المستند', 500);
  }

  res.status(201).json({
    success: true,
    message: 'تم تحميل المستند بنجاح',
    data: dealRoom
  });
});

/**
 * Track document view
 * POST /api/deal-rooms/:id/documents/:index/view
 */
const trackDocumentView = asyncHandler(async (req, res) => {
  const { id, index } = req.params;
  const userId = req.userID;

  // Validate deal room ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف غرفة الصفقة غير صالح', 400);
  }

  // Validate document index
  const documentIndex = parseInt(index);
  if (isNaN(documentIndex) || documentIndex < 0) {
    throw CustomException('رقم المستند غير صالح', 400);
  }

  // Track view
  const dealRoom = await DealRoomService.trackDocumentView(
    sanitizedId,
    documentIndex,
    userId
  );

  if (!dealRoom) {
    throw CustomException('فشل في تتبع عرض المستند', 500);
  }

  res.status(200).json({
    success: true,
    message: 'تم تتبع عرض المستند بنجاح',
    data: dealRoom
  });
});

/**
 * Grant external access
 * POST /api/deal-rooms/:id/access
 */
const grantExternalAccess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userID;

  // Validate deal room ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف غرفة الصفقة غير صالح', 400);
  }

  // Mass assignment protection - only allow specific fields
  const allowedFields = ['email', 'name', 'company', 'permissions', 'expiresAt'];
  const accessData = pickAllowedFields(req.body, allowedFields);

  // Validate required fields
  if (!accessData.email) {
    throw CustomException('البريد الإلكتروني مطلوب', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(accessData.email)) {
    throw CustomException('تنسيق البريد الإلكتروني غير صالح', 400);
  }

  // Set default permissions if not provided
  if (!accessData.permissions || !Array.isArray(accessData.permissions)) {
    accessData.permissions = ['view'];
  }

  // Validate expiration date if provided
  if (accessData.expiresAt) {
    const expiresAt = new Date(accessData.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      throw CustomException('تاريخ الانتهاء غير صالح', 400);
    }
    if (expiresAt < new Date()) {
      throw CustomException('تاريخ الانتهاء يجب أن يكون في المستقبل', 400);
    }
    accessData.expiresAt = expiresAt;
  } else {
    // Default to 30 days from now
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
    accessData.expiresAt = defaultExpiry;
  }

  // Grant access
  const result = await DealRoomService.grantExternalAccess(
    sanitizedId,
    accessData,
    userId
  );

  if (!result) {
    throw CustomException('فشل في منح الوصول الخارجي', 500);
  }

  res.status(201).json({
    success: true,
    message: 'تم منح الوصول الخارجي بنجاح',
    data: {
      dealRoom: result.dealRoom,
      accessToken: result.accessToken,
      accessUrl: result.accessUrl
    }
  });
});

/**
 * Revoke external access
 * DELETE /api/deal-rooms/:id/access/:token
 */
const revokeExternalAccess = asyncHandler(async (req, res) => {
  const { id, token } = req.params;
  const userId = req.userID;

  // Validate deal room ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف غرفة الصفقة غير صالح', 400);
  }

  // Validate token
  if (!token) {
    throw CustomException('رمز الوصول مطلوب', 400);
  }

  // Revoke access
  const dealRoom = await DealRoomService.revokeExternalAccess(
    sanitizedId,
    token,
    userId
  );

  if (!dealRoom) {
    throw CustomException('فشل في إلغاء الوصول الخارجي', 500);
  }

  res.status(200).json({
    success: true,
    message: 'تم إلغاء الوصول الخارجي بنجاح',
    data: dealRoom
  });
});

/**
 * Verify external access (public endpoint)
 * GET /api/deal-rooms/external/:token
 */
const verifyExternalAccess = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Validate token
  if (!token) {
    throw CustomException('رمز الوصول مطلوب', 400);
  }

  // Verify access
  const result = await DealRoomService.verifyExternalAccess(token);

  if (!result || !result.valid) {
    throw CustomException('رمز الوصول غير صالح أو منتهي الصلاحية', 403);
  }

  res.status(200).json({
    success: true,
    data: {
      dealRoom: result.dealRoom,
      permissions: result.permissions
    }
  });
});

/**
 * Get activity feed
 * GET /api/deal-rooms/:id/activity
 */
const getActivityFeed = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50 } = req.query;

  // Validate deal room ID
  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('معرف غرفة الصفقة غير صالح', 400);
  }

  // Validate limit
  const parsedLimit = parseInt(limit);
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
    throw CustomException('الحد يجب أن يكون بين 1 و 200', 400);
  }

  // Get activity feed
  const activities = await DealRoomService.getActivityFeed(
    sanitizedId,
    parsedLimit
  );

  res.status(200).json({
    success: true,
    data: activities
  });
});

module.exports = {
  getDealRoom,
  createDealRoom,
  addPage,
  updatePage,
  deletePage,
  uploadDocument,
  trackDocumentView,
  grantExternalAccess,
  revokeExternalAccess,
  verifyExternalAccess,
  getActivityFeed
};
