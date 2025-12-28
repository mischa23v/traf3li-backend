/**
 * ZATCA Plugin Routes
 *
 * Endpoints for ZATCA E-Invoice submission and compliance
 */

const express = require('express');
const router = express.Router();
const zatcaController = require('../controllers/zatcaPlugin.controller');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Get ZATCA configuration
router.get('/config', zatcaController.getConfig);

// Update ZATCA configuration (admin only)
router.put('/config', zatcaController.updateConfig);

// ═══════════════════════════════════════════════════════════════
// INVOICE PREPARATION
// ═══════════════════════════════════════════════════════════════

// Validate invoice for ZATCA compliance
router.post('/validate', zatcaController.validateInvoice);

// Generate QR code for invoice
router.post('/qr', zatcaController.generateQR);

// Generate invoice hash
router.post('/hash', zatcaController.generateHash);

// Prepare invoice for submission (full preparation)
router.post('/prepare/:invoiceId', zatcaController.prepareInvoice);

// ═══════════════════════════════════════════════════════════════
// SUBMISSION
// ═══════════════════════════════════════════════════════════════

// Submit single invoice to ZATCA
router.post('/submit/:invoiceId', zatcaController.submitInvoice);

// Bulk submit invoices to ZATCA
router.post('/submit/bulk', zatcaController.bulkSubmit);

// ═══════════════════════════════════════════════════════════════
// STATUS & MONITORING
// ═══════════════════════════════════════════════════════════════

// Get invoice ZATCA status
router.get('/status/:invoiceId', zatcaController.getInvoiceStatus);

// Get ZATCA submission statistics
router.get('/stats', zatcaController.getStats);

// Get pending invoices for submission
router.get('/pending', zatcaController.getPending);

// Get failed submissions
router.get('/failed', zatcaController.getFailed);

module.exports = router;
