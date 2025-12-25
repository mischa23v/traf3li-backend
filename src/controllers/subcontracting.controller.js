/**
 * Subcontracting Controller
 *
 * Handles HTTP requests for subcontracting operations including:
 * - Subcontracting order management
 * - Receipt management
 * - Statistics and analytics
 * - Settings configuration
 *
 * Features security controls:
 * - Mass assignment protection
 * - IDOR prevention with firmId verification
 * - Input sanitization and validation
 * - Proper error handling
 */

const SubcontractingService = require('../services/subcontracting.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// ORDER HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all orders with filters
 * GET /api/subcontracting/orders
 */
const getOrders = asyncHandler(async (req, res) => {
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
        'supplierId',
        'dateFrom',
        'dateTo',
        'page',
        'limit'
    ]);

    // Sanitize ObjectIds
    if (query.supplierId) {
        const sanitized = sanitizeObjectId(query.supplierId);
        if (!sanitized) {
            throw CustomException('معرف المورد غير صالح', 400);
        }
        query.supplierId = sanitized;
    }

    const orders = await SubcontractingService.getOrders(query, firmId);

    if (!orders) {
        throw CustomException('فشل في جلب الطلبات', 500);
    }

    res.json({
        success: true,
        data: orders
    });
});

/**
 * Get order by ID
 * GET /api/subcontracting/orders/:id
 */
const getOrder = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify order ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    // IDOR protection - getOrderById includes firmId check
    const order = await SubcontractingService.getOrderById(sanitizedId, firmId);

    if (!order) {
        throw CustomException('الطلب غير موجود', 404);
    }

    res.json({
        success: true,
        data: order
    });
});

/**
 * Create new order
 * POST /api/subcontracting/orders
 */
const createOrder = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const allowedData = pickAllowedFields(req.body, [
        'supplierId',
        'supplierName',
        'orderNumber',
        'orderDate',
        'requiredDate',
        'serviceItems',
        'rawMaterials',
        'finishedGoods',
        'supplierWarehouse',
        'rawMaterialWarehouse',
        'finishedGoodsWarehouse',
        'purchaseOrderId',
        'remarks',
        'currency'
    ]);

    // Validate required fields
    if (!allowedData.supplierId) {
        throw CustomException('معرف المورد مطلوب', 400);
    }

    if (!allowedData.supplierName) {
        throw CustomException('اسم المورد مطلوب', 400);
    }

    // Sanitize ObjectIds
    const sanitizedSupplierId = sanitizeObjectId(allowedData.supplierId);
    if (!sanitizedSupplierId) {
        throw CustomException('معرف المورد غير صالح', 400);
    }
    allowedData.supplierId = sanitizedSupplierId;

    if (allowedData.supplierWarehouse) {
        const sanitized = sanitizeObjectId(allowedData.supplierWarehouse);
        if (!sanitized) {
            throw CustomException('معرف مستودع المورد غير صالح', 400);
        }
        allowedData.supplierWarehouse = sanitized;
    }

    if (allowedData.rawMaterialWarehouse) {
        const sanitized = sanitizeObjectId(allowedData.rawMaterialWarehouse);
        if (!sanitized) {
            throw CustomException('معرف مستودع المواد الخام غير صالح', 400);
        }
        allowedData.rawMaterialWarehouse = sanitized;
    }

    if (allowedData.finishedGoodsWarehouse) {
        const sanitized = sanitizeObjectId(allowedData.finishedGoodsWarehouse);
        if (!sanitized) {
            throw CustomException('معرف مستودع البضائع المصنعة غير صالح', 400);
        }
        allowedData.finishedGoodsWarehouse = sanitized;
    }

    const order = await SubcontractingService.createOrder(allowedData, firmId, userId);

    if (!order) {
        throw CustomException('فشل في إنشاء الطلب', 500);
    }

    res.status(201).json({
        success: true,
        message: 'تم إنشاء طلب المقاولة الباطنية بنجاح',
        data: order
    });
});

/**
 * Update order
 * PUT /api/subcontracting/orders/:id
 */
const updateOrder = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify order ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    // Mass assignment protection
    const allowedData = pickAllowedFields(req.body, [
        'supplierName',
        'orderDate',
        'requiredDate',
        'serviceItems',
        'rawMaterials',
        'finishedGoods',
        'supplierWarehouse',
        'rawMaterialWarehouse',
        'finishedGoodsWarehouse',
        'remarks',
        'currency'
    ]);

    // Sanitize warehouse ObjectIds if provided
    if (allowedData.supplierWarehouse) {
        const sanitized = sanitizeObjectId(allowedData.supplierWarehouse);
        if (!sanitized) {
            throw CustomException('معرف مستودع المورد غير صالح', 400);
        }
        allowedData.supplierWarehouse = sanitized;
    }

    if (allowedData.rawMaterialWarehouse) {
        const sanitized = sanitizeObjectId(allowedData.rawMaterialWarehouse);
        if (!sanitized) {
            throw CustomException('معرف مستودع المواد الخام غير صالح', 400);
        }
        allowedData.rawMaterialWarehouse = sanitized;
    }

    if (allowedData.finishedGoodsWarehouse) {
        const sanitized = sanitizeObjectId(allowedData.finishedGoodsWarehouse);
        if (!sanitized) {
            throw CustomException('معرف مستودع البضائع المصنعة غير صالح', 400);
        }
        allowedData.finishedGoodsWarehouse = sanitized;
    }

    const order = await SubcontractingService.updateOrder(sanitizedId, allowedData, firmId, userId);

    if (!order) {
        throw CustomException('فشل في تحديث الطلب', 500);
    }

    res.json({
        success: true,
        message: 'تم تحديث الطلب بنجاح',
        data: order
    });
});

/**
 * Submit order
 * POST /api/subcontracting/orders/:id/submit
 */
const submitOrder = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify order ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    const order = await SubcontractingService.submitOrder(sanitizedId, firmId, userId);

    if (!order) {
        throw CustomException('فشل في تقديم الطلب', 500);
    }

    res.json({
        success: true,
        message: 'تم تقديم الطلب بنجاح وتم نقل المواد الخام',
        data: order
    });
});

/**
 * Cancel order
 * POST /api/subcontracting/orders/:id/cancel
 */
const cancelOrder = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify order ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    const order = await SubcontractingService.cancelOrder(sanitizedId, firmId, userId);

    if (!order) {
        throw CustomException('فشل في إلغاء الطلب', 500);
    }

    res.json({
        success: true,
        message: 'تم إلغاء الطلب بنجاح',
        data: order
    });
});

/**
 * Delete order
 * DELETE /api/subcontracting/orders/:id
 */
const deleteOrder = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Only owner/admin can delete
    if (!['owner', 'admin'].includes(req.firmRole)) {
        throw CustomException('فقط مالك أو مدير المكتب يمكنه حذف الطلبات', 403);
    }

    // Sanitize and verify order ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }

    const deleted = await SubcontractingService.deleteOrder(sanitizedId, firmId);

    if (!deleted) {
        throw CustomException('فشل في حذف الطلب', 500);
    }

    res.json({
        success: true,
        message: 'تم حذف الطلب بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// RECEIPT HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all receipts with filters
 * GET /api/subcontracting/receipts
 */
const getReceipts = asyncHandler(async (req, res) => {
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
        'supplierId',
        'subcontractingOrderId',
        'dateFrom',
        'dateTo',
        'page',
        'limit'
    ]);

    // Sanitize ObjectIds
    if (query.supplierId) {
        const sanitized = sanitizeObjectId(query.supplierId);
        if (!sanitized) {
            throw CustomException('معرف المورد غير صالح', 400);
        }
        query.supplierId = sanitized;
    }

    if (query.subcontractingOrderId) {
        const sanitized = sanitizeObjectId(query.subcontractingOrderId);
        if (!sanitized) {
            throw CustomException('معرف الطلب غير صالح', 400);
        }
        query.subcontractingOrderId = sanitized;
    }

    const receipts = await SubcontractingService.getReceipts(query, firmId);

    if (!receipts) {
        throw CustomException('فشل في جلب الإيصالات', 500);
    }

    res.json({
        success: true,
        data: receipts
    });
});

/**
 * Get receipt by ID
 * GET /api/subcontracting/receipts/:id
 */
const getReceipt = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify receipt ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الإيصال غير صالح', 400);
    }

    // IDOR protection - getReceiptById includes firmId check
    const receipt = await SubcontractingService.getReceiptById(sanitizedId, firmId);

    if (!receipt) {
        throw CustomException('الإيصال غير موجود', 404);
    }

    res.json({
        success: true,
        data: receipt
    });
});

/**
 * Create new receipt
 * POST /api/subcontracting/receipts
 */
const createReceipt = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Mass assignment protection
    const allowedData = pickAllowedFields(req.body, [
        'subcontractingOrderId',
        'receiptNumber',
        'postingDate',
        'postingTime',
        'finishedGoods',
        'returnedMaterials',
        'consumedMaterials',
        'remarks'
    ]);

    // Validate required fields
    if (!allowedData.subcontractingOrderId) {
        throw CustomException('معرف طلب المقاولة الباطنية مطلوب', 400);
    }

    // Sanitize ObjectIds
    const sanitizedOrderId = sanitizeObjectId(allowedData.subcontractingOrderId);
    if (!sanitizedOrderId) {
        throw CustomException('معرف الطلب غير صالح', 400);
    }
    allowedData.subcontractingOrderId = sanitizedOrderId;

    const receipt = await SubcontractingService.createReceipt(allowedData, firmId, userId);

    if (!receipt) {
        throw CustomException('فشل في إنشاء الإيصال', 500);
    }

    res.status(201).json({
        success: true,
        message: 'تم إنشاء إيصال الاستلام بنجاح',
        data: receipt
    });
});

/**
 * Submit receipt
 * POST /api/subcontracting/receipts/:id/submit
 */
const submitReceipt = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const userId = req.userID;
    const { id } = req.params;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    // Sanitize and verify receipt ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف الإيصال غير صالح', 400);
    }

    const receipt = await SubcontractingService.submitReceipt(sanitizedId, firmId, userId);

    if (!receipt) {
        throw CustomException('فشل في تقديم الإيصال', 500);
    }

    res.json({
        success: true,
        message: 'تم تقديم الإيصال بنجاح واستلام البضائع المصنعة',
        data: receipt
    });
});

// ═══════════════════════════════════════════════════════════════
// STATS & SETTINGS HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get statistics
 * GET /api/subcontracting/stats
 */
const getStats = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    const stats = await SubcontractingService.getStats(firmId);

    if (!stats) {
        throw CustomException('فشل في جلب الإحصائيات', 500);
    }

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Get settings
 * GET /api/subcontracting/settings
 */
const getSettings = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    if (!firmId) {
        throw CustomException('يجب أن تكون عضواً في مكتب للوصول', 403);
    }

    const settings = await SubcontractingService.getSettings(firmId);

    if (!settings) {
        throw CustomException('فشل في جلب الإعدادات', 500);
    }

    res.json({
        success: true,
        data: settings
    });
});

/**
 * Update settings
 * PUT /api/subcontracting/settings
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
    const allowedData = pickAllowedFields(req.body, [
        'defaultSupplierWarehouse',
        'defaultRawMaterialWarehouse',
        'defaultFinishedGoodsWarehouse',
        'autoCreateReceipt',
        'trackReturnedMaterials',
        'requireQualityInspection'
    ]);

    // Sanitize warehouse ObjectIds if provided
    if (allowedData.defaultSupplierWarehouse) {
        const sanitized = sanitizeObjectId(allowedData.defaultSupplierWarehouse);
        if (!sanitized) {
            throw CustomException('معرف مستودع المورد الافتراضي غير صالح', 400);
        }
        allowedData.defaultSupplierWarehouse = sanitized;
    }

    if (allowedData.defaultRawMaterialWarehouse) {
        const sanitized = sanitizeObjectId(allowedData.defaultRawMaterialWarehouse);
        if (!sanitized) {
            throw CustomException('معرف مستودع المواد الخام الافتراضي غير صالح', 400);
        }
        allowedData.defaultRawMaterialWarehouse = sanitized;
    }

    if (allowedData.defaultFinishedGoodsWarehouse) {
        const sanitized = sanitizeObjectId(allowedData.defaultFinishedGoodsWarehouse);
        if (!sanitized) {
            throw CustomException('معرف مستودع البضائع المصنعة الافتراضي غير صالح', 400);
        }
        allowedData.defaultFinishedGoodsWarehouse = sanitized;
    }

    const settings = await SubcontractingService.updateSettings(allowedData, firmId, userId);

    if (!settings) {
        throw CustomException('فشل في تحديث الإعدادات', 500);
    }

    res.json({
        success: true,
        message: 'تم تحديث الإعدادات بنجاح',
        data: settings
    });
});

module.exports = {
    // Orders
    getOrders,
    getOrder,
    createOrder,
    updateOrder,
    submitOrder,
    cancelOrder,
    deleteOrder,

    // Receipts
    getReceipts,
    getReceipt,
    createReceipt,
    submitReceipt,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings
};
