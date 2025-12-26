/**
 * Subcontracting Routes
 *
 * Comprehensive subcontracting management API routes including:
 * - Subcontracting order management (CRUD operations)
 * - Receipt management for finished goods
 * - Statistics and analytics
 * - Settings configuration
 *
 * Base route: /api/subcontracting
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const {
    validateCreateOrder,
    validateUpdateOrder,
    validateCreateReceipt,
    validateUpdateSettings
} = require('../validators/subcontracting.validator');
const {
    // Order CRUD
    getOrders,
    getOrder,
    createOrder,
    updateOrder,
    deleteOrder,

    // Order Actions
    submitOrder,
    cancelOrder,

    // Receipt CRUD
    getReceipts,
    getReceipt,
    createReceipt,

    // Receipt Actions
    submitReceipt,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings
} = require('../controllers/subcontracting.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATISTICS & REPORTS (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get subcontracting statistics
router.get('/stats',
    userMiddleware,
    getStats
);

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

// Get subcontracting settings
router.get('/settings',
    userMiddleware,
    getSettings
);

// Update subcontracting settings
router.put('/settings',
    userMiddleware,
    validateUpdateSettings,
    auditAction('update_subcontracting_settings', 'subcontracting_settings', { severity: 'medium' }),
    updateSettings
);

// ═══════════════════════════════════════════════════════════════
// ORDERS - CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Create subcontracting order
router.post('/orders',
    userMiddleware,
    validateCreateOrder,
    auditAction('create_subcontracting_order', 'subcontracting_order', { severity: 'medium' }),
    createOrder
);

// Get all subcontracting orders (with pagination and filters)
router.get('/orders',
    userMiddleware,
    getOrders
);

// Get single subcontracting order
router.get('/orders/:id',
    userMiddleware,
    getOrder
);

// Update subcontracting order
router.put('/orders/:id',
    userMiddleware,
    validateUpdateOrder,
    auditAction('update_subcontracting_order', 'subcontracting_order', { captureChanges: true }),
    updateOrder
);

// Delete subcontracting order
router.delete('/orders/:id',
    userMiddleware,
    auditAction('delete_subcontracting_order', 'subcontracting_order', { severity: 'high' }),
    deleteOrder
);

// ═══════════════════════════════════════════════════════════════
// ORDERS - ACTIONS
// ═══════════════════════════════════════════════════════════════

// Submit order (transfers raw materials to supplier)
router.post('/orders/:id/submit',
    userMiddleware,
    auditAction('submit_subcontracting_order', 'subcontracting_order', { severity: 'medium' }),
    submitOrder
);

// Cancel order
router.post('/orders/:id/cancel',
    userMiddleware,
    auditAction('cancel_subcontracting_order', 'subcontracting_order', { severity: 'medium' }),
    cancelOrder
);

// ═══════════════════════════════════════════════════════════════
// RECEIPTS - CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Create subcontracting receipt
router.post('/receipts',
    userMiddleware,
    validateCreateReceipt,
    auditAction('create_subcontracting_receipt', 'subcontracting_receipt', { severity: 'medium' }),
    createReceipt
);

// Get all subcontracting receipts (with pagination and filters)
router.get('/receipts',
    userMiddleware,
    getReceipts
);

// Get single subcontracting receipt
router.get('/receipts/:id',
    userMiddleware,
    getReceipt
);

// ═══════════════════════════════════════════════════════════════
// RECEIPTS - ACTIONS
// ═══════════════════════════════════════════════════════════════

// Submit receipt (receives finished goods into warehouse)
router.post('/receipts/:id/submit',
    userMiddleware,
    auditAction('submit_subcontracting_receipt', 'subcontracting_receipt', { severity: 'medium' }),
    submitReceipt
);

module.exports = router;
