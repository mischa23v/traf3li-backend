/**
 * Inventory Routes
 *
 * Comprehensive inventory management API routes including items, warehouses,
 * stock entries, stock ledger, batches, serial numbers, reconciliation,
 * master data, reports, and settings.
 *
 * Base route: /api/inventory
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    validateCreateItem,
    validateUpdateItem,
    validateCreateWarehouse,
    validateUpdateWarehouse,
    validateCreateStockEntry,
    validateCreateBatch,
    validateCreateSerialNumber,
    validateCreateReconciliation,
    validateCreateItemGroup,
    validateCreateUom,
    validateUpdateSettings
} = require('../validators/inventory.validator');
const {
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
} = require('../controllers/inventory.controller');

const router = express.Router();

// ============ STATISTICS & REPORTS ============
// These need to be before /:id routes to avoid conflicts

// Get dashboard statistics
router.get('/stats',
    userMiddleware,
    firmFilter,
    getStats
);

// Get stock balance report
router.get('/reports/stock-balance',
    userMiddleware,
    firmFilter,
    getStockBalanceReport
);

// Get low stock report
router.get('/reports/low-stock',
    userMiddleware,
    firmFilter,
    getLowStockReport
);

// Get stock movement report
router.get('/reports/stock-movement',
    userMiddleware,
    firmFilter,
    getStockMovementReport
);

// ============ MASTER DATA ============

// Item Groups
router.get('/item-groups',
    userMiddleware,
    firmFilter,
    getItemGroups
);

router.post('/item-groups',
    userMiddleware,
    firmFilter,
    validateCreateItemGroup,
    createItemGroup
);

// Units of Measure (UOM)
router.get('/uom',
    userMiddleware,
    firmFilter,
    getUoms
);

router.post('/uom',
    userMiddleware,
    firmFilter,
    validateCreateUom,
    createUom
);

// Price Lists
router.get('/price-lists',
    userMiddleware,
    firmFilter,
    getPriceLists
);

// Item Prices
router.get('/item-prices',
    userMiddleware,
    firmFilter,
    getItemPrices
);

// ============ SETTINGS ============

// Get inventory settings
router.get('/settings',
    userMiddleware,
    firmFilter,
    getSettings
);

// Update inventory settings
router.put('/settings',
    userMiddleware,
    firmFilter,
    validateUpdateSettings,
    updateSettings
);

// ============ ITEMS ============

// Get all items (with query filters)
router.get('/items',
    userMiddleware,
    firmFilter,
    getItems
);

// Create item
router.post('/items',
    userMiddleware,
    firmFilter,
    validateCreateItem,
    createItem
);

// Get item by ID
router.get('/items/:id',
    userMiddleware,
    firmFilter,
    getItemById
);

// Update item
router.put('/items/:id',
    userMiddleware,
    firmFilter,
    validateUpdateItem,
    updateItem
);

// Delete item
router.delete('/items/:id',
    userMiddleware,
    firmFilter,
    deleteItem
);

// Get item stock (by warehouse)
router.get('/items/:id/stock',
    userMiddleware,
    firmFilter,
    getItemStock
);

// ============ WAREHOUSES ============

// Get all warehouses
router.get('/warehouses',
    userMiddleware,
    firmFilter,
    getWarehouses
);

// Create warehouse
router.post('/warehouses',
    userMiddleware,
    firmFilter,
    validateCreateWarehouse,
    createWarehouse
);

// Get warehouse by ID
router.get('/warehouses/:id',
    userMiddleware,
    firmFilter,
    getWarehouseById
);

// Update warehouse
router.put('/warehouses/:id',
    userMiddleware,
    firmFilter,
    validateUpdateWarehouse,
    updateWarehouse
);

// Delete warehouse
router.delete('/warehouses/:id',
    userMiddleware,
    firmFilter,
    deleteWarehouse
);

// Get warehouse stock
router.get('/warehouses/:id/stock',
    userMiddleware,
    firmFilter,
    getWarehouseStock
);

// ============ STOCK ENTRIES ============

// Get all stock entries
router.get('/stock-entries',
    userMiddleware,
    firmFilter,
    getStockEntries
);

// Create stock entry
router.post('/stock-entries',
    userMiddleware,
    firmFilter,
    validateCreateStockEntry,
    createStockEntry
);

// Get stock entry by ID
router.get('/stock-entries/:id',
    userMiddleware,
    firmFilter,
    getStockEntryById
);

// Submit stock entry
router.post('/stock-entries/:id/submit',
    userMiddleware,
    firmFilter,
    submitStockEntry
);

// Cancel stock entry
router.post('/stock-entries/:id/cancel',
    userMiddleware,
    firmFilter,
    cancelStockEntry
);

// Delete stock entry (draft only)
router.delete('/stock-entries/:id',
    userMiddleware,
    firmFilter,
    deleteStockEntry
);

// ============ STOCK LEDGER ============

// Get stock ledger entries (read-only)
router.get('/stock-ledger',
    userMiddleware,
    firmFilter,
    getStockLedger
);

// ============ BATCHES ============

// Get batches
router.get('/batches',
    userMiddleware,
    firmFilter,
    getBatches
);

// Create batch
router.post('/batches',
    userMiddleware,
    firmFilter,
    validateCreateBatch,
    createBatch
);

// ============ SERIAL NUMBERS ============

// Get serial numbers
router.get('/serial-numbers',
    userMiddleware,
    firmFilter,
    getSerialNumbers
);

// Create serial number
router.post('/serial-numbers',
    userMiddleware,
    firmFilter,
    validateCreateSerialNumber,
    createSerialNumber
);

// ============ RECONCILIATION ============

// Get reconciliations
router.get('/reconciliations',
    userMiddleware,
    firmFilter,
    getReconciliations
);

// Create reconciliation
router.post('/reconciliations',
    userMiddleware,
    firmFilter,
    validateCreateReconciliation,
    createReconciliation
);

// Submit reconciliation
router.post('/reconciliations/:id/submit',
    userMiddleware,
    firmFilter,
    submitReconciliation
);

module.exports = router;
