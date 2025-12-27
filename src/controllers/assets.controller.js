/**
 * Assets Controller
 *
 * Comprehensive asset management including CRUD operations for:
 * - Fixed assets with depreciation tracking
 * - Asset categories and hierarchies
 * - Maintenance scheduling
 * - Asset movements (transfers, issues, receipts)
 * - Statistics and reporting
 * - Settings management
 */

const Joi = require('joi');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const assetsService = require('../services/assets.service');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const assetSchema = Joi.object({
    assetName: Joi.string().required().max(200),
    assetNameAr: Joi.string().max(200),
    description: Joi.string().max(1000),
    serialNo: Joi.string().max(100),
    image: Joi.string().uri(),
    tags: Joi.array().items(Joi.string()),
    assetCategory: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    itemId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    itemCode: Joi.string(),
    isExistingAsset: Joi.boolean(),
    location: Joi.string().max(200),
    custodian: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    custodianName: Joi.string(),
    department: Joi.string().max(200),
    company: Joi.string().max(200),
    purchaseDate: Joi.date(),
    purchaseInvoiceId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    supplierId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    supplierName: Joi.string(),
    grossPurchaseAmount: Joi.number().min(0).required(),
    purchaseReceiptAmount: Joi.number().min(0),
    currency: Joi.string().length(3).default('SAR'),
    assetQuantity: Joi.number().min(1).default(1),
    availableForUseDate: Joi.date(),
    depreciationMethod: Joi.string().valid('straight_line', 'double_declining_balance', 'written_down_value'),
    totalNumberOfDepreciations: Joi.number().min(0),
    frequencyOfDepreciation: Joi.string().valid('monthly', 'quarterly', 'half_yearly', 'yearly'),
    depreciationStartDate: Joi.date(),
    expectedValueAfterUsefulLife: Joi.number().min(0),
    openingAccumulatedDepreciation: Joi.number().min(0),
    warrantyExpiryDate: Joi.date(),
    insuranceDetails: Joi.object({
        insurer: Joi.string(),
        policyNo: Joi.string(),
        startDate: Joi.date(),
        endDate: Joi.date(),
        insuredValue: Joi.number().min(0)
    })
});

const updateAssetSchema = assetSchema.fork(['assetName', 'grossPurchaseAmount'], (schema) => schema.optional());

const categorySchema = Joi.object({
    name: Joi.string().required().max(200),
    nameAr: Joi.string().max(200),
    parentCategory: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    isGroup: Joi.boolean(),
    depreciationMethod: Joi.string().valid('straight_line', 'double_declining_balance', 'written_down_value'),
    totalNumberOfDepreciations: Joi.number().min(0),
    frequencyOfDepreciation: Joi.string().valid('monthly', 'quarterly', 'half_yearly', 'yearly'),
    enableCwip: Joi.boolean(),
    fixedAssetAccount: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    accumulatedDepreciationAccount: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    depreciationExpenseAccount: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    isActive: Joi.boolean()
});

const updateCategorySchema = categorySchema.fork(['name'], (schema) => schema.optional());

const maintenanceScheduleSchema = Joi.object({
    assetId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    assetName: Joi.string(),
    maintenanceType: Joi.string().valid('preventive', 'corrective', 'calibration').required(),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    lastMaintenanceDate: Joi.date(),
    nextMaintenanceDate: Joi.date().required(),
    assignTo: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    assignToName: Joi.string(),
    description: Joi.string().max(1000),
    certificateRequired: Joi.boolean()
});

const updateMaintenanceScheduleSchema = maintenanceScheduleSchema.fork(['assetId', 'maintenanceType', 'nextMaintenanceDate'], (schema) => schema.optional());

const movementSchema = Joi.object({
    assetId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
    assetName: Joi.string(),
    movementType: Joi.string().valid('transfer', 'issue', 'receipt').required(),
    transactionDate: Joi.date(),
    sourceLocation: Joi.string().max(200),
    targetLocation: Joi.string().max(200),
    fromCustodian: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    toCustodian: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    fromDepartment: Joi.string(),
    toDepartment: Joi.string(),
    reason: Joi.string().max(500),
    remarks: Joi.string().max(1000)
});

const settingsSchema = Joi.object({
    autoDepreciation: Joi.boolean(),
    depreciationFrequency: Joi.string().valid('monthly', 'quarterly', 'half_yearly', 'yearly'),
    enableMaintenanceAlerts: Joi.boolean(),
    maintenanceAlertDays: Joi.number().min(1).max(90),
    enableWarrantyAlerts: Joi.boolean(),
    warrantyAlertDays: Joi.number().min(1).max(365)
});

// ═══════════════════════════════════════════════════════════════
// ASSETS CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get assets
 * GET /api/assets
 */
const getAssets = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const result = await assetsService.getAssets(req.query, firmId);

    return res.json({
        success: true,
        data: result.assets,
        pagination: result.pagination
    });
});

/**
 * Get single asset
 * GET /api/assets/:id
 */
const getAsset = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    const asset = await assetsService.getAssetById(id, firmId);

    return res.json({
        success: true,
        data: asset
    });
});

/**
 * Create asset
 * POST /api/assets
 */
const createAsset = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Validate input
    const { error, value } = assetSchema.validate(req.body, { stripUnknown: true });
    if (error) {
        throw CustomException(`Validation error: ${error.details[0].message}`, 400);
    }

    const asset = await assetsService.createAsset(value, firmId, userId);

    return res.status(201).json({
        success: true,
        message: 'Asset created successfully',
        message_ar: 'تم إنشاء الأصل بنجاح',
        data: asset
    });
});

/**
 * Update asset
 * PATCH /api/assets/:id
 */
const updateAsset = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // Validate input
    const { error, value } = updateAssetSchema.validate(req.body, { stripUnknown: true });
    if (error) {
        throw CustomException(`Validation error: ${error.details[0].message}`, 400);
    }

    const asset = await assetsService.updateAsset(id, value, firmId, userId);

    return res.json({
        success: true,
        message: 'Asset updated successfully',
        message_ar: 'تم تحديث الأصل بنجاح',
        data: asset
    });
});

/**
 * Submit asset (activate and start depreciation)
 * POST /api/assets/:id/submit
 */
const submitAsset = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    const asset = await assetsService.submitAsset(id, firmId, userId);

    return res.json({
        success: true,
        message: 'Asset submitted successfully',
        message_ar: 'تم تفعيل الأصل بنجاح',
        data: asset
    });
});

/**
 * Delete asset
 * DELETE /api/assets/:id
 */
const deleteAsset = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    await assetsService.deleteAsset(id, firmId);

    return res.json({
        success: true,
        message: 'Asset deleted successfully',
        message_ar: 'تم حذف الأصل بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// CATEGORIES CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get categories
 * GET /api/assets/categories
 */
const getCategories = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const categories = await assetsService.getCategories(firmId);

    return res.json({
        success: true,
        data: categories
    });
});

/**
 * Get single category
 * GET /api/assets/categories/:id
 */
const getCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    const category = await assetsService.getCategoryById(id, firmId);

    return res.json({
        success: true,
        data: category
    });
});

/**
 * Create category
 * POST /api/assets/categories
 */
const createCategory = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Validate input
    const { error, value } = categorySchema.validate(req.body, { stripUnknown: true });
    if (error) {
        throw CustomException(`Validation error: ${error.details[0].message}`, 400);
    }

    const category = await assetsService.createCategory(value, firmId, userId);

    return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        message_ar: 'تم إنشاء الفئة بنجاح',
        data: category
    });
});

/**
 * Update category
 * PATCH /api/assets/categories/:id
 */
const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // Validate input
    const { error, value } = updateCategorySchema.validate(req.body, { stripUnknown: true });
    if (error) {
        throw CustomException(`Validation error: ${error.details[0].message}`, 400);
    }

    const category = await assetsService.updateCategory(id, value, firmId, userId);

    return res.json({
        success: true,
        message: 'Category updated successfully',
        message_ar: 'تم تحديث الفئة بنجاح',
        data: category
    });
});

/**
 * Delete category
 * DELETE /api/assets/categories/:id
 */
const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    await assetsService.deleteCategory(id, firmId);

    return res.json({
        success: true,
        message: 'Category deleted successfully',
        message_ar: 'تم حذف الفئة بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get maintenance schedules
 * GET /api/assets/maintenance
 */
const getMaintenanceSchedules = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const result = await assetsService.getMaintenanceSchedules(req.query, firmId);

    return res.json({
        success: true,
        data: result.schedules,
        pagination: result.pagination
    });
});

/**
 * Get single maintenance schedule
 * GET /api/assets/maintenance/:id
 */
const getMaintenanceSchedule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    const schedule = await assetsService.getMaintenanceScheduleById(id, firmId);

    return res.json({
        success: true,
        data: schedule
    });
});

/**
 * Create maintenance schedule
 * POST /api/assets/maintenance
 */
const createMaintenanceSchedule = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Validate input
    const { error, value } = maintenanceScheduleSchema.validate(req.body, { stripUnknown: true });
    if (error) {
        throw CustomException(`Validation error: ${error.details[0].message}`, 400);
    }

    const schedule = await assetsService.createMaintenanceSchedule(value, firmId, userId);

    return res.status(201).json({
        success: true,
        message: 'Maintenance schedule created successfully',
        message_ar: 'تم إنشاء جدول الصيانة بنجاح',
        data: schedule
    });
});

/**
 * Update maintenance schedule
 * PATCH /api/assets/maintenance/:id
 */
const updateMaintenanceSchedule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // Validate input
    const { error, value } = updateMaintenanceScheduleSchema.validate(req.body, { stripUnknown: true });
    if (error) {
        throw CustomException(`Validation error: ${error.details[0].message}`, 400);
    }

    const schedule = await assetsService.updateMaintenanceSchedule(id, value, firmId, userId);

    return res.json({
        success: true,
        message: 'Maintenance schedule updated successfully',
        message_ar: 'تم تحديث جدول الصيانة بنجاح',
        data: schedule
    });
});

/**
 * Complete maintenance schedule
 * POST /api/assets/maintenance/:id/complete
 */
const completeMaintenanceSchedule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    const schedule = await assetsService.completeMaintenanceSchedule(id, firmId, userId);

    return res.json({
        success: true,
        message: 'Maintenance completed successfully',
        message_ar: 'تم إكمال الصيانة بنجاح',
        data: schedule
    });
});

/**
 * Get upcoming maintenance
 * GET /api/assets/maintenance/upcoming
 */
const getUpcomingMaintenance = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { daysAhead = 30 } = req.query;

    const schedules = await assetsService.getUpcomingMaintenance(firmId, parseInt(daysAhead));

    return res.json({
        success: true,
        data: schedules
    });
});

// ═══════════════════════════════════════════════════════════════
// MOVEMENTS CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get movements
 * GET /api/assets/movements
 */
const getMovements = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const result = await assetsService.getMovements(req.query, firmId);

    return res.json({
        success: true,
        data: result.movements,
        pagination: result.pagination
    });
});

/**
 * Create movement
 * POST /api/assets/movements
 */
const createMovement = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Validate input
    const { error, value } = movementSchema.validate(req.body, { stripUnknown: true });
    if (error) {
        throw CustomException(`Validation error: ${error.details[0].message}`, 400);
    }

    const movement = await assetsService.createMovement(value, firmId, userId);

    return res.status(201).json({
        success: true,
        message: 'Movement created successfully',
        message_ar: 'تم إنشاء الحركة بنجاح',
        data: movement
    });
});

/**
 * Process movement (approve and complete)
 * POST /api/assets/movements/:id/process
 */
const processMovement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    const movement = await assetsService.processAssetMovement(id, firmId, userId);

    return res.json({
        success: true,
        message: 'Movement processed successfully',
        message_ar: 'تم معالجة الحركة بنجاح',
        data: movement
    });
});

// ═══════════════════════════════════════════════════════════════
// STATS & SETTINGS CONTROLLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get asset statistics
 * GET /api/assets/stats
 */
const getStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const stats = await assetsService.getStats(firmId);

    return res.json({
        success: true,
        data: stats
    });
});

/**
 * Get settings
 * GET /api/assets/settings
 */
const getSettings = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const settings = await assetsService.getSettings(firmId);

    return res.json({
        success: true,
        data: settings
    });
});

/**
 * Update settings
 * PATCH /api/assets/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const userId = req.userID;

    // Validate input
    const { error, value } = settingsSchema.validate(req.body, { stripUnknown: true });
    if (error) {
        throw CustomException(`Validation error: ${error.details[0].message}`, 400);
    }

    const settings = await assetsService.updateSettings(value, firmId, userId);

    return res.json({
        success: true,
        message: 'Settings updated successfully',
        message_ar: 'تم تحديث الإعدادات بنجاح',
        data: settings
    });
});

/**
 * Calculate depreciation for an asset
 * GET /api/assets/:id/depreciation
 */
const calculateDepreciation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    const depreciation = await assetsService.calculateDepreciation(id, firmId);

    return res.json({
        success: true,
        data: depreciation
    });
});

/**
 * Get expiring warranties
 * GET /api/assets/warranties/expiring
 */
const getExpiringWarranties = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { daysAhead = 30 } = req.query;

    const assets = await assetsService.getExpiringWarranties(firmId, parseInt(daysAhead));

    return res.json({
        success: true,
        data: assets
    });
});

// ═══════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Assets
    getAssets,
    getAsset,
    createAsset,
    updateAsset,
    submitAsset,
    deleteAsset,

    // Categories
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,

    // Maintenance
    getMaintenanceSchedules,
    getMaintenanceSchedule,
    createMaintenanceSchedule,
    updateMaintenanceSchedule,
    completeMaintenanceSchedule,
    getUpcomingMaintenance,

    // Movements
    getMovements,
    createMovement,
    processMovement,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings,
    calculateDepreciation,
    getExpiringWarranties
};
