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

router.get('/', checkFirmPermission('view_payments'), getPaymentReceipts);

router.get('/stats', checkFirmPermission('view_payments'), getReceiptStats);

router.get('/:id', checkFirmPermission('view_payments'), getPaymentReceipt);

router.post('/', checkFirmPermission('manage_payments'), createPaymentReceipt);

router.post('/:id/void', checkFirmPermission('manage_payments'), voidPaymentReceipt);

router.get('/:id/download', checkFirmPermission('view_payments'), downloadReceipt);

router.post('/:id/email', checkFirmPermission('manage_payments'), emailReceipt);

module.exports = router;
