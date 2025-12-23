/**
 * Payment Terms Routes
 *
 * Routes for managing payment terms templates
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares');
const { firmFilter, checkFirmPermission, firmAdminOnly, financeAccessOnly } = require('../middlewares/firmFilter.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    getPaymentTerms,
    getPaymentTerm,
    getDefaultTerm,
    createPaymentTerm,
    updatePaymentTerm,
    deletePaymentTerm,
    setAsDefault,
    initializeTemplates,
    calculateDueDate,
    calculateInstallments
} = require('../controllers/paymentTerms.controller');

// All routes require authentication and firm filter
router.use(userMiddleware);
router.use(firmFilter);
router.use(apiRateLimiter);

/**
 * @route   GET /api/payment-terms
 * @desc    Get all payment terms
 * @access  Private
 */
router.get('/', getPaymentTerms);

/**
 * @route   GET /api/payment-terms/default
 * @desc    Get default payment term
 * @access  Private
 */
router.get('/default', getDefaultTerm);

/**
 * @route   POST /api/payment-terms/initialize
 * @desc    Initialize default payment terms templates
 * @access  Private - Admin only
 */
router.post('/initialize', firmAdminOnly, initializeTemplates);

/**
 * @route   GET /api/payment-terms/:id
 * @desc    Get single payment term
 * @access  Private
 */
router.get('/:id', getPaymentTerm);

/**
 * @route   POST /api/payment-terms/:id/calculate-due-date
 * @desc    Calculate due date using payment term
 * @access  Private
 */
router.post('/:id/calculate-due-date', calculateDueDate);

/**
 * @route   POST /api/payment-terms/:id/calculate-installments
 * @desc    Calculate installment schedule
 * @access  Private
 */
router.post('/:id/calculate-installments', calculateInstallments);

/**
 * @route   POST /api/payment-terms
 * @desc    Create payment term
 * @access  Private - Admin only
 */
router.post('/', firmAdminOnly, createPaymentTerm);

/**
 * @route   PUT /api/payment-terms/:id
 * @desc    Update payment term
 * @access  Private - Admin only
 */
router.put('/:id', firmAdminOnly, updatePaymentTerm);

/**
 * @route   POST /api/payment-terms/:id/set-default
 * @desc    Set payment term as default
 * @access  Private - Admin only
 */
router.post('/:id/set-default', firmAdminOnly, setAsDefault);

/**
 * @route   DELETE /api/payment-terms/:id
 * @desc    Delete payment term
 * @access  Private - Admin only
 */
router.delete('/:id', firmAdminOnly, deletePaymentTerm);

module.exports = router;
