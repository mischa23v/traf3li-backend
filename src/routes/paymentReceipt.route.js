const express = require('express');
const router = express.Router();
const {
    getPaymentReceipts,
    getPaymentReceipt,
    createPaymentReceipt,
    voidPaymentReceipt,
    downloadReceipt,
    emailReceipt,
    getReceiptStats
} = require('../controllers/paymentReceipt.controller');
const { authenticate, checkFirmPermission } = require('../middlewares');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/payment-receipts:
 *   get:
 *     summary: Get all payment receipts
 *     tags: [Payment Receipts]
 */
router.get('/', checkFirmPermission('view_payments'), getPaymentReceipts);

/**
 * @swagger
 * /api/payment-receipts/stats:
 *   get:
 *     summary: Get receipt statistics
 *     tags: [Payment Receipts]
 */
router.get('/stats', checkFirmPermission('view_payments'), getReceiptStats);

/**
 * @swagger
 * /api/payment-receipts/:id:
 *   get:
 *     summary: Get single payment receipt
 *     tags: [Payment Receipts]
 */
router.get('/:id', checkFirmPermission('view_payments'), getPaymentReceipt);

/**
 * @swagger
 * /api/payment-receipts:
 *   post:
 *     summary: Create payment receipt manually
 *     tags: [Payment Receipts]
 */
router.post('/', checkFirmPermission('manage_payments'), createPaymentReceipt);

/**
 * @swagger
 * /api/payment-receipts/:id/void:
 *   post:
 *     summary: Void a payment receipt
 *     tags: [Payment Receipts]
 */
router.post('/:id/void', checkFirmPermission('manage_payments'), voidPaymentReceipt);

/**
 * @swagger
 * /api/payment-receipts/:id/download:
 *   get:
 *     summary: Download receipt PDF
 *     tags: [Payment Receipts]
 */
router.get('/:id/download', checkFirmPermission('view_payments'), downloadReceipt);

/**
 * @swagger
 * /api/payment-receipts/:id/email:
 *   post:
 *     summary: Email receipt to client
 *     tags: [Payment Receipts]
 */
router.post('/:id/email', checkFirmPermission('manage_payments'), emailReceipt);

module.exports = router;
