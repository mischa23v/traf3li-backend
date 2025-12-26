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
const { userMiddleware } = require('../middlewares');
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
    getStats
);

// Get stock balance report
router.get('/reports/stock-balance',
    userMiddleware,
    getStockBalanceReport
);

// Get low stock report
router.get('/reports/low-stock',
    userMiddleware,
    getLowStockReport
);

// Get stock movement report
router.get('/reports/stock-movement',
    userMiddleware,
    getStockMovementReport
);

// ============ MASTER DATA ============

// Item Groups
router.get('/item-groups',
    userMiddleware,
    getItemGroups
);

router.post('/item-groups',
    userMiddleware,
    validateCreateItemGroup,
    createItemGroup
);

// Units of Measure (UOM)
router.get('/uom',
    userMiddleware,
    getUoms
);

router.post('/uom',
    userMiddleware,
    validateCreateUom,
    createUom
);

// Price Lists
router.get('/price-lists',
    userMiddleware,
    getPriceLists
);

// Item Prices
router.get('/item-prices',
    userMiddleware,
    getItemPrices
);

// ============ SETTINGS ============

// Get inventory settings
router.get('/settings',
    userMiddleware,
    getSettings
);

// Update inventory settings
router.put('/settings',
    userMiddleware,
    validateUpdateSettings,
    updateSettings
);

// ============ ITEMS ============

// Get all items (with query filters)
router.get('/items',
    userMiddleware,
    getItems
);

// Create item
router.post('/items',
    userMiddleware,
    validateCreateItem,
    createItem
);

// Get item by ID
router.get('/items/:id',
    userMiddleware,
    getItemById
);

// Update item
router.put('/items/:id',
    userMiddleware,
    validateUpdateItem,
    updateItem
);

// Delete item
router.delete('/items/:id',
    userMiddleware,
    deleteItem
);

// Get item stock (by warehouse)
router.get('/items/:id/stock',
    userMiddleware,
    getItemStock
);

// ============ WAREHOUSES ============

// Get all warehouses
router.get('/warehouses',
    userMiddleware,
    getWarehouses
);

// Create warehouse
router.post('/warehouses',
    userMiddleware,
    validateCreateWarehouse,
    createWarehouse
);

// Get warehouse by ID
router.get('/warehouses/:id',
    userMiddleware,
    getWarehouseById
);

// Update warehouse
router.put('/warehouses/:id',
    userMiddleware,
    validateUpdateWarehouse,
    updateWarehouse
);

// Delete warehouse
router.delete('/warehouses/:id',
    userMiddleware,
    deleteWarehouse
);

// Get warehouse stock
router.get('/warehouses/:id/stock',
    userMiddleware,
    getWarehouseStock
);

// ============ STOCK ENTRIES ============

// Get all stock entries
router.get('/stock-entries',
    userMiddleware,
    getStockEntries
);

// Create stock entry
router.post('/stock-entries',
    userMiddleware,
    validateCreateStockEntry,
    createStockEntry
);

// Get stock entry by ID
router.get('/stock-entries/:id',
    userMiddleware,
    getStockEntryById
);

// Submit stock entry
router.post('/stock-entries/:id/submit',
    userMiddleware,
    submitStockEntry
);

// Cancel stock entry
router.post('/stock-entries/:id/cancel',
    userMiddleware,
    cancelStockEntry
);

// Delete stock entry (draft only)
router.delete('/stock-entries/:id',
    userMiddleware,
    deleteStockEntry
);

// ============ STOCK LEDGER ============

// Get stock ledger entries (read-only)
router.get('/stock-ledger',
    userMiddleware,
    getStockLedger
);

// ============ BATCHES ============

// Get batches
router.get('/batches',
    userMiddleware,
    getBatches
);

// Create batch
router.post('/batches',
    userMiddleware,
    validateCreateBatch,
    createBatch
);

// ============ SERIAL NUMBERS ============

// Get serial numbers
router.get('/serial-numbers',
    userMiddleware,
    getSerialNumbers
);

// Create serial number
router.post('/serial-numbers',
    userMiddleware,
    validateCreateSerialNumber,
    createSerialNumber
);

// ============ RECONCILIATION ============

// Get reconciliations
router.get('/reconciliations',
    userMiddleware,
    getReconciliations
);

// Create reconciliation
router.post('/reconciliations',
    userMiddleware,
    validateCreateReconciliation,
    createReconciliation
);

// Submit reconciliation
router.post('/reconciliations/:id/submit',
    userMiddleware,
    submitReconciliation
);

module.exports = router;
