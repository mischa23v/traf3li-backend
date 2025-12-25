const asyncHandler = require('../utils/asyncHandler');
const inventoryService = require('../services/inventory.service');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get firmId from request (prioritize req.firmId from middleware)
 */
const getFirmId = (req) => {
    return req.firmId || req.user?.firmId;
};

/**
 * Get userId from request
 */
const getUserId = (req) => {
    return req.userID || req.user?._id;
};

// ═══════════════════════════════════════════════════════════════
// ITEMS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inventory/items
 * List items with filters
 */
const getItems = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        return res.status(400).json({
            success: false,
            message: 'Firm ID is required'
        });
    }

    const result = await inventoryService.getItems(req.query, firmId);

    res.json({
        success: true,
        message: 'Items retrieved successfully',
        data: result
    });
});

/**
 * GET /api/inventory/items/:id
 * Get item by ID
 */
const getItemById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid item ID'
        });
    }

    const item = await inventoryService.getItemById(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'Item retrieved successfully',
        data: { item }
    });
});

/**
 * POST /api/inventory/items
 * Create new item
 */
const createItem = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const allowedFields = [
        'itemCode',
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'itemType',
        'itemGroup',
        'brand',
        'manufacturer',
        'sku',
        'barcode',
        'hsnCode',
        'stockUom',
        'purchaseUom',
        'salesUom',
        'uomConversions',
        'standardRate',
        'valuationRate',
        'lastPurchaseRate',
        'currency',
        'taxRate',
        'taxTemplateId',
        'isZeroRated',
        'isExempt',
        'isStockItem',
        'hasVariants',
        'hasBatchNo',
        'hasSerialNo',
        'hasExpiryDate',
        'shelfLifeInDays',
        'warrantyPeriod',
        'safetyStock',
        'reorderLevel',
        'reorderQty',
        'leadTimeDays',
        'valuationMethod',
        'status',
        'image',
        'images',
        'weightPerUnit',
        'weightUom',
        'defaultSupplier',
        'supplierItems',
        'tags',
        'customFields'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const item = await inventoryService.createItem(data, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'Item created successfully',
        data: { item }
    });
});

/**
 * PUT /api/inventory/items/:id
 * Update item
 */
const updateItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid item ID'
        });
    }

    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'itemGroup',
        'brand',
        'manufacturer',
        'sku',
        'barcode',
        'hsnCode',
        'purchaseUom',
        'salesUom',
        'uomConversions',
        'standardRate',
        'valuationRate',
        'currency',
        'taxRate',
        'taxTemplateId',
        'isZeroRated',
        'isExempt',
        'hasVariants',
        'hasBatchNo',
        'hasSerialNo',
        'hasExpiryDate',
        'shelfLifeInDays',
        'warrantyPeriod',
        'safetyStock',
        'reorderLevel',
        'reorderQty',
        'leadTimeDays',
        'valuationMethod',
        'status',
        'disabled',
        'image',
        'images',
        'weightPerUnit',
        'weightUom',
        'defaultSupplier',
        'supplierItems',
        'tags',
        'customFields'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const item = await inventoryService.updateItem(sanitizedId, data, firmId, userId);

    res.json({
        success: true,
        message: 'Item updated successfully',
        data: { item }
    });
});

/**
 * DELETE /api/inventory/items/:id
 * Delete item
 */
const deleteItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid item ID'
        });
    }

    await inventoryService.deleteItem(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'Item deleted successfully'
    });
});

/**
 * GET /api/inventory/items/:id/stock
 * Get item stock by warehouse
 */
const getItemStock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid item ID'
        });
    }

    const stock = await inventoryService.getItemStock(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'Item stock retrieved successfully',
        data: stock
    });
});

// ═══════════════════════════════════════════════════════════════
// WAREHOUSES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inventory/warehouses
 * List warehouses with filters
 */
const getWarehouses = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        return res.status(400).json({
            success: false,
            message: 'Firm ID is required'
        });
    }

    const result = await inventoryService.getWarehouses(req.query, firmId);

    res.json({
        success: true,
        message: 'Warehouses retrieved successfully',
        data: result
    });
});

/**
 * GET /api/inventory/warehouses/:id
 * Get warehouse by ID
 */
const getWarehouseById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid warehouse ID'
        });
    }

    const warehouse = await inventoryService.getWarehouseById(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'Warehouse retrieved successfully',
        data: { warehouse }
    });
});

/**
 * POST /api/inventory/warehouses
 * Create new warehouse
 */
const createWarehouse = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const allowedFields = [
        'name',
        'nameAr',
        'warehouseType',
        'parentWarehouse',
        'isGroup',
        'company',
        'address',
        'city',
        'region',
        'country',
        'postalCode',
        'latitude',
        'longitude',
        'contactPerson',
        'phone',
        'email',
        'isDefault',
        'accountId'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const warehouse = await inventoryService.createWarehouse(data, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'Warehouse created successfully',
        data: { warehouse }
    });
});

/**
 * PUT /api/inventory/warehouses/:id
 * Update warehouse
 */
const updateWarehouse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid warehouse ID'
        });
    }

    const allowedFields = [
        'name',
        'nameAr',
        'warehouseType',
        'parentWarehouse',
        'isGroup',
        'company',
        'address',
        'city',
        'region',
        'country',
        'postalCode',
        'latitude',
        'longitude',
        'contactPerson',
        'phone',
        'email',
        'isDefault',
        'disabled',
        'accountId'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const warehouse = await inventoryService.updateWarehouse(sanitizedId, data, firmId, userId);

    res.json({
        success: true,
        message: 'Warehouse updated successfully',
        data: { warehouse }
    });
});

/**
 * DELETE /api/inventory/warehouses/:id
 * Delete warehouse
 */
const deleteWarehouse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid warehouse ID'
        });
    }

    await inventoryService.deleteWarehouse(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'Warehouse deleted successfully'
    });
});

/**
 * GET /api/inventory/warehouses/:id/stock
 * Get warehouse stock
 */
const getWarehouseStock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid warehouse ID'
        });
    }

    const stock = await inventoryService.getWarehouseStock(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'Warehouse stock retrieved successfully',
        data: stock
    });
});

// ═══════════════════════════════════════════════════════════════
// STOCK ENTRIES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inventory/stock-entries
 * List stock entries with filters
 */
const getStockEntries = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        return res.status(400).json({
            success: false,
            message: 'Firm ID is required'
        });
    }

    const result = await inventoryService.getStockEntries(req.query, firmId);

    res.json({
        success: true,
        message: 'Stock entries retrieved successfully',
        data: result
    });
});

/**
 * GET /api/inventory/stock-entries/:id
 * Get stock entry by ID
 */
const getStockEntryById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid stock entry ID'
        });
    }

    const stockEntry = await inventoryService.getStockEntryById(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'Stock entry retrieved successfully',
        data: { stockEntry }
    });
});

/**
 * POST /api/inventory/stock-entries
 * Create new stock entry
 */
const createStockEntry = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const allowedFields = [
        'entryType',
        'postingDate',
        'postingTime',
        'fromWarehouse',
        'toWarehouse',
        'items',
        'referenceType',
        'referenceId',
        'purchaseOrderId',
        'salesOrderId',
        'remarks',
        'company'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const stockEntry = await inventoryService.createStockEntry(data, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'Stock entry created successfully',
        data: { stockEntry }
    });
});

/**
 * POST /api/inventory/stock-entries/:id/submit
 * Submit stock entry (draft -> submitted)
 */
const submitStockEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid stock entry ID'
        });
    }

    const stockEntry = await inventoryService.submitStockEntry(sanitizedId, firmId, userId);

    res.json({
        success: true,
        message: 'Stock entry submitted successfully',
        data: { stockEntry }
    });
});

/**
 * POST /api/inventory/stock-entries/:id/cancel
 * Cancel stock entry
 */
const cancelStockEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid stock entry ID'
        });
    }

    const stockEntry = await inventoryService.cancelStockEntry(sanitizedId, firmId, userId);

    res.json({
        success: true,
        message: 'Stock entry cancelled successfully',
        data: { stockEntry }
    });
});

/**
 * DELETE /api/inventory/stock-entries/:id
 * Delete stock entry (draft only)
 */
const deleteStockEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid stock entry ID'
        });
    }

    await inventoryService.deleteStockEntry(sanitizedId, firmId);

    res.json({
        success: true,
        message: 'Stock entry deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// STOCK LEDGER (read-only)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inventory/stock-ledger
 * Get stock ledger entries
 */
const getStockLedger = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        return res.status(400).json({
            success: false,
            message: 'Firm ID is required'
        });
    }

    const result = await inventoryService.getStockLedger(req.query, firmId);

    res.json({
        success: true,
        message: 'Stock ledger retrieved successfully',
        data: result
    });
});

// ═══════════════════════════════════════════════════════════════
// BATCHES & SERIAL NUMBERS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inventory/batches
 * Get batches
 */
const getBatches = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const result = await inventoryService.getBatches(req.query, firmId);

    res.json({
        success: true,
        message: 'Batches retrieved successfully',
        data: result
    });
});

/**
 * POST /api/inventory/batches
 * Create batch
 */
const createBatch = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const allowedFields = [
        'batchNo',
        'itemId',
        'warehouseId',
        'qty',
        'manufacturingDate',
        'expiryDate',
        'supplierBatchNo',
        'notes'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const batch = await inventoryService.createBatch(data, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'Batch created successfully',
        data: { batch }
    });
});

/**
 * GET /api/inventory/serial-numbers
 * Get serial numbers
 */
const getSerialNumbers = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const result = await inventoryService.getSerialNumbers(req.query, firmId);

    res.json({
        success: true,
        message: 'Serial numbers retrieved successfully',
        data: result
    });
});

/**
 * POST /api/inventory/serial-numbers
 * Create serial number
 */
const createSerialNumber = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const allowedFields = [
        'serialNo',
        'itemId',
        'warehouseId',
        'status',
        'purchaseDate',
        'warrantyExpiryDate',
        'notes'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const serialNumber = await inventoryService.createSerialNumber(data, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'Serial number created successfully',
        data: { serialNumber }
    });
});

// ═══════════════════════════════════════════════════════════════
// RECONCILIATION
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inventory/reconciliations
 * Get reconciliations
 */
const getReconciliations = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const result = await inventoryService.getReconciliations(req.query, firmId);

    res.json({
        success: true,
        message: 'Reconciliations retrieved successfully',
        data: result
    });
});

/**
 * POST /api/inventory/reconciliations
 * Create reconciliation
 */
const createReconciliation = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const allowedFields = [
        'warehouseId',
        'reconciliationDate',
        'items',
        'remarks'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const reconciliation = await inventoryService.createReconciliation(data, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'Reconciliation created successfully',
        data: { reconciliation }
    });
});

/**
 * POST /api/inventory/reconciliations/:id/submit
 * Submit reconciliation
 */
const submitReconciliation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid reconciliation ID'
        });
    }

    const reconciliation = await inventoryService.submitReconciliation(sanitizedId, firmId, userId);

    res.json({
        success: true,
        message: 'Reconciliation submitted successfully',
        data: { reconciliation }
    });
});

// ═══════════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inventory/item-groups
 * Get item groups
 */
const getItemGroups = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const itemGroups = await inventoryService.getItemGroups(firmId);

    res.json({
        success: true,
        message: 'Item groups retrieved successfully',
        data: { itemGroups }
    });
});

/**
 * POST /api/inventory/item-groups
 * Create item group
 */
const createItemGroup = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const allowedFields = ['name', 'nameAr', 'parentGroup', 'description'];
    const data = pickAllowedFields(req.body, allowedFields);

    const itemGroup = await inventoryService.createItemGroup(data, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'Item group created successfully',
        data: { itemGroup }
    });
});

/**
 * GET /api/inventory/uoms
 * Get UOMs
 */
const getUoms = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const uoms = await inventoryService.getUoms(firmId);

    res.json({
        success: true,
        message: 'UOMs retrieved successfully',
        data: { uoms }
    });
});

/**
 * POST /api/inventory/uoms
 * Create UOM
 */
const createUom = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const allowedFields = ['name', 'symbol', 'description'];
    const data = pickAllowedFields(req.body, allowedFields);

    const uom = await inventoryService.createUom(data, firmId, userId);

    res.status(201).json({
        success: true,
        message: 'UOM created successfully',
        data: { uom }
    });
});

/**
 * GET /api/inventory/price-lists
 * Get price lists
 */
const getPriceLists = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const priceLists = await inventoryService.getPriceLists(firmId);

    res.json({
        success: true,
        message: 'Price lists retrieved successfully',
        data: { priceLists }
    });
});

/**
 * GET /api/inventory/item-prices
 * Get item prices
 */
const getItemPrices = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const result = await inventoryService.getItemPrices(req.query, firmId);

    res.json({
        success: true,
        message: 'Item prices retrieved successfully',
        data: result
    });
});

// ═══════════════════════════════════════════════════════════════
// REPORTS & STATS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inventory/stats
 * Get dashboard stats
 */
const getStats = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        return res.status(400).json({
            success: false,
            message: 'Firm ID is required'
        });
    }

    const stats = await inventoryService.getStats(firmId);

    res.json({
        success: true,
        message: 'Stats retrieved successfully',
        data: { stats }
    });
});

/**
 * GET /api/inventory/reports/stock-balance
 * Get stock balance report
 */
const getStockBalanceReport = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const report = await inventoryService.getStockBalanceReport(req.query, firmId);

    res.json({
        success: true,
        message: 'Stock balance report retrieved successfully',
        data: { report }
    });
});

/**
 * GET /api/inventory/reports/low-stock
 * Get low stock report
 */
const getLowStockReport = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const report = await inventoryService.getLowStockReport(firmId);

    res.json({
        success: true,
        message: 'Low stock report retrieved successfully',
        data: { report }
    });
});

/**
 * GET /api/inventory/reports/stock-movement
 * Get stock movement report
 */
const getStockMovementReport = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    const report = await inventoryService.getStockMovementReport(req.query, firmId);

    res.json({
        success: true,
        message: 'Stock movement report retrieved successfully',
        data: { report }
    });
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inventory/settings
 * Get inventory settings
 */
const getSettings = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);

    if (!firmId) {
        return res.status(400).json({
            success: false,
            message: 'Firm ID is required'
        });
    }

    const settings = await inventoryService.getSettings(firmId);

    res.json({
        success: true,
        message: 'Settings retrieved successfully',
        data: { settings }
    });
});

/**
 * PUT /api/inventory/settings
 * Update inventory settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = getUserId(req);

    const allowedFields = [
        'defaultValuationMethod',
        'autoGenerateItemCode',
        'itemCodePrefix',
        'allowNegativeStock',
        'enableBatchTracking',
        'enableSerialTracking',
        'enableExpiryTracking',
        'defaultWarehouse',
        'lowStockThreshold',
        'autoReorderEnabled'
    ];

    const data = pickAllowedFields(req.body, allowedFields);

    const settings = await inventoryService.updateSettings(data, firmId, userId);

    res.json({
        success: true,
        message: 'Settings updated successfully',
        data: { settings }
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Items
    getItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    getItemStock,

    // Warehouses
    getWarehouses,
    getWarehouseById,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    getWarehouseStock,

    // Stock Entries
    getStockEntries,
    getStockEntryById,
    createStockEntry,
    submitStockEntry,
    cancelStockEntry,
    deleteStockEntry,

    // Stock Ledger
    getStockLedger,

    // Batches & Serial Numbers
    getBatches,
    createBatch,
    getSerialNumbers,
    createSerialNumber,

    // Reconciliation
    getReconciliations,
    createReconciliation,
    submitReconciliation,

    // Master Data
    getItemGroups,
    createItemGroup,
    getUoms,
    createUom,
    getPriceLists,
    getItemPrices,

    // Reports & Stats
    getStats,
    getStockBalanceReport,
    getLowStockReport,
    getStockMovementReport,

    // Settings
    getSettings,
    updateSettings
};
