/**
 * Buying Routes
 *
 * Comprehensive buying management API routes including suppliers, purchase orders,
 * purchase receipts, purchase invoices, material requests, RFQs, and settings.
 *
 * Base route: /api/buying
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const {
    validateCreateSupplier,
    validateUpdateSupplier,
    validateCreatePurchaseOrder,
    validateCreatePurchaseReceipt,
    validateCreatePurchaseInvoice,
    validateCreateMaterialRequest,
    validateCreateRFQ,
    validateUpdateRFQ,
    validateUpdateSettings
} = require('../validators/buying.validator');
const {
    // Suppliers
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierGroups,

    // Purchase Orders
    getPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    submitPurchaseOrder,
    approvePurchaseOrder,
    cancelPurchaseOrder,
    deletePurchaseOrder,

    // Purchase Receipts
    getPurchaseReceipts,
    getPurchaseReceiptById,
    createPurchaseReceipt,
    submitPurchaseReceipt,

    // Purchase Invoices
    getPurchaseInvoices,
    getPurchaseInvoiceById,
    createPurchaseInvoice,
    submitPurchaseInvoice,

    // Material Requests
    getMaterialRequests,
    getMaterialRequestById,
    createMaterialRequest,

    // RFQs
    getRFQs,
    getRFQById,
    createRFQ,
    updateRFQ,
    submitRFQ,
    deleteRFQ,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings
} = require('../controllers/buying.controller');

const router = express.Router();

// ============ STATISTICS & SETTINGS ============
// These need to be before /:id routes to avoid conflicts

// Get buying statistics
router.get('/stats',
    userMiddleware,
    firmFilter,
    getStats
);

// Get buying settings
router.get('/settings',
    userMiddleware,
    firmFilter,
    getSettings
);

// Update buying settings
router.put('/settings',
    userMiddleware,
    firmFilter,
    validateUpdateSettings,
    auditAction('update_buying_settings', 'buying', { captureChanges: true }),
    updateSettings
);

// ============ SUPPLIERS ============

// Get supplier groups
router.get('/supplier-groups',
    userMiddleware,
    firmFilter,
    getSupplierGroups
);

// Create supplier
router.post('/suppliers',
    userMiddleware,
    firmFilter,
    validateCreateSupplier,
    auditAction('create_supplier', 'supplier', { severity: 'medium' }),
    createSupplier
);

// Get all suppliers (with pagination and filters)
router.get('/suppliers',
    userMiddleware,
    firmFilter,
    getSuppliers
);

// Get single supplier
router.get('/suppliers/:id',
    userMiddleware,
    firmFilter,
    getSupplierById
);

// Update supplier
router.put('/suppliers/:id',
    userMiddleware,
    firmFilter,
    validateUpdateSupplier,
    auditAction('update_supplier', 'supplier', { captureChanges: true }),
    updateSupplier
);

// Delete supplier
router.delete('/suppliers/:id',
    userMiddleware,
    firmFilter,
    auditAction('delete_supplier', 'supplier', { severity: 'high' }),
    deleteSupplier
);

// ============ PURCHASE ORDERS ============

// Create purchase order
router.post('/purchase-orders',
    userMiddleware,
    firmFilter,
    validateCreatePurchaseOrder,
    auditAction('create_purchase_order', 'purchase_order', { severity: 'medium' }),
    createPurchaseOrder
);

// Get all purchase orders (with pagination and filters)
router.get('/purchase-orders',
    userMiddleware,
    firmFilter,
    getPurchaseOrders
);

// Get single purchase order
router.get('/purchase-orders/:id',
    userMiddleware,
    firmFilter,
    getPurchaseOrderById
);

// Submit purchase order
router.post('/purchase-orders/:id/submit',
    userMiddleware,
    firmFilter,
    auditAction('submit_purchase_order', 'purchase_order'),
    submitPurchaseOrder
);

// Approve purchase order
router.post('/purchase-orders/:id/approve',
    userMiddleware,
    firmFilter,
    auditAction('approve_purchase_order', 'purchase_order'),
    approvePurchaseOrder
);

// Cancel purchase order
router.post('/purchase-orders/:id/cancel',
    userMiddleware,
    firmFilter,
    auditAction('cancel_purchase_order', 'purchase_order'),
    cancelPurchaseOrder
);

// Delete purchase order
router.delete('/purchase-orders/:id',
    userMiddleware,
    firmFilter,
    auditAction('delete_purchase_order', 'purchase_order', { severity: 'high' }),
    deletePurchaseOrder
);

// ============ PURCHASE RECEIPTS ============

// Create purchase receipt
router.post('/purchase-receipts',
    userMiddleware,
    firmFilter,
    validateCreatePurchaseReceipt,
    auditAction('create_purchase_receipt', 'purchase_receipt', { severity: 'medium' }),
    createPurchaseReceipt
);

// Get all purchase receipts (with pagination and filters)
router.get('/purchase-receipts',
    userMiddleware,
    firmFilter,
    getPurchaseReceipts
);

// Get single purchase receipt
router.get('/purchase-receipts/:id',
    userMiddleware,
    firmFilter,
    getPurchaseReceiptById
);

// Submit purchase receipt
router.post('/purchase-receipts/:id/submit',
    userMiddleware,
    firmFilter,
    auditAction('submit_purchase_receipt', 'purchase_receipt'),
    submitPurchaseReceipt
);

// ============ PURCHASE INVOICES ============

// Create purchase invoice
router.post('/purchase-invoices',
    userMiddleware,
    firmFilter,
    validateCreatePurchaseInvoice,
    auditAction('create_purchase_invoice', 'purchase_invoice', { severity: 'medium' }),
    createPurchaseInvoice
);

// Get all purchase invoices (with pagination and filters)
router.get('/purchase-invoices',
    userMiddleware,
    firmFilter,
    getPurchaseInvoices
);

// Get single purchase invoice
router.get('/purchase-invoices/:id',
    userMiddleware,
    firmFilter,
    getPurchaseInvoiceById
);

// Submit purchase invoice
router.post('/purchase-invoices/:id/submit',
    userMiddleware,
    firmFilter,
    auditAction('submit_purchase_invoice', 'purchase_invoice'),
    submitPurchaseInvoice
);

// ============ MATERIAL REQUESTS ============

// Create material request
router.post('/material-requests',
    userMiddleware,
    firmFilter,
    validateCreateMaterialRequest,
    auditAction('create_material_request', 'material_request', { severity: 'medium' }),
    createMaterialRequest
);

// Get all material requests (with pagination and filters)
router.get('/material-requests',
    userMiddleware,
    firmFilter,
    getMaterialRequests
);

// Get single material request
router.get('/material-requests/:id',
    userMiddleware,
    firmFilter,
    getMaterialRequestById
);

// ============ RFQs (Request for Quotation) ============

// Create RFQ
router.post('/rfqs',
    userMiddleware,
    firmFilter,
    validateCreateRFQ,
    auditAction('create_rfq', 'rfq', { severity: 'medium' }),
    createRFQ
);

// Get all RFQs (with pagination and filters)
router.get('/rfqs',
    userMiddleware,
    firmFilter,
    getRFQs
);

// Get single RFQ
router.get('/rfqs/:id',
    userMiddleware,
    firmFilter,
    getRFQById
);

// Update RFQ
router.put('/rfqs/:id',
    userMiddleware,
    firmFilter,
    validateUpdateRFQ,
    auditAction('update_rfq', 'rfq', { captureChanges: true }),
    updateRFQ
);

// Submit RFQ
router.post('/rfqs/:id/submit',
    userMiddleware,
    firmFilter,
    auditAction('submit_rfq', 'rfq'),
    submitRFQ
);

// Delete RFQ
router.delete('/rfqs/:id',
    userMiddleware,
    firmFilter,
    auditAction('delete_rfq', 'rfq', { severity: 'high' }),
    deleteRFQ
);

module.exports = router;
