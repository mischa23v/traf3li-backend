/**
 * Recurring Invoice Routes
 *
 * Routes for managing recurring invoice templates
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares/authenticate.middleware');
const { firmFilter, checkFirmPermission, financeAccessOnly } = require('../middlewares/firmFilter.middleware');
const {
    getRecurringInvoices,
    getStats,
    getRecurringInvoice,
    getGeneratedHistory,
    previewNextInvoice,
    createRecurringInvoice,
    updateRecurringInvoice,
    pauseRecurringInvoice,
    resumeRecurringInvoice,
    cancelRecurringInvoice,
    generateNow,
    duplicateRecurringInvoice,
    deleteRecurringInvoice
} = require('../controllers/recurringInvoice.controller');

// All routes require authentication and firm filter
router.use(userMiddleware);
router.use(firmFilter);

/**
 * @route   GET /api/recurring-invoices
 * @desc    Get all recurring invoices
 * @access  Private - Finance access
 */
router.get('/', financeAccessOnly, getRecurringInvoices);

/**
 * @route   GET /api/recurring-invoices/stats
 * @desc    Get recurring invoice statistics
 * @access  Private - Finance access
 */
router.get('/stats', financeAccessOnly, getStats);

/**
 * @route   GET /api/recurring-invoices/:id
 * @desc    Get single recurring invoice
 * @access  Private - Finance access
 */
router.get('/:id', financeAccessOnly, getRecurringInvoice);

/**
 * @route   GET /api/recurring-invoices/:id/history
 * @desc    Get history of generated invoices
 * @access  Private - Finance access
 */
router.get('/:id/history', financeAccessOnly, getGeneratedHistory);

/**
 * @route   GET /api/recurring-invoices/:id/preview
 * @desc    Preview next invoice that will be generated
 * @access  Private - Finance access
 */
router.get('/:id/preview', financeAccessOnly, previewNextInvoice);

/**
 * @route   POST /api/recurring-invoices
 * @desc    Create recurring invoice
 * @access  Private - Finance edit
 */
router.post('/', checkFirmPermission('invoices', 'edit'), createRecurringInvoice);

/**
 * @route   PUT /api/recurring-invoices/:id
 * @desc    Update recurring invoice
 * @access  Private - Finance edit
 */
router.put('/:id', checkFirmPermission('invoices', 'edit'), updateRecurringInvoice);

/**
 * @route   POST /api/recurring-invoices/:id/pause
 * @desc    Pause recurring invoice
 * @access  Private - Finance edit
 */
router.post('/:id/pause', checkFirmPermission('invoices', 'edit'), pauseRecurringInvoice);

/**
 * @route   POST /api/recurring-invoices/:id/resume
 * @desc    Resume recurring invoice
 * @access  Private - Finance edit
 */
router.post('/:id/resume', checkFirmPermission('invoices', 'edit'), resumeRecurringInvoice);

/**
 * @route   POST /api/recurring-invoices/:id/cancel
 * @desc    Cancel recurring invoice
 * @access  Private - Finance full
 */
router.post('/:id/cancel', checkFirmPermission('invoices', 'full'), cancelRecurringInvoice);

/**
 * @route   POST /api/recurring-invoices/:id/generate
 * @desc    Generate invoice immediately
 * @access  Private - Finance edit
 */
router.post('/:id/generate', checkFirmPermission('invoices', 'edit'), generateNow);

/**
 * @route   POST /api/recurring-invoices/:id/duplicate
 * @desc    Duplicate recurring invoice
 * @access  Private - Finance edit
 */
router.post('/:id/duplicate', checkFirmPermission('invoices', 'edit'), duplicateRecurringInvoice);

/**
 * @route   DELETE /api/recurring-invoices/:id
 * @desc    Delete recurring invoice (no generated invoices)
 * @access  Private - Finance full
 */
router.delete('/:id', checkFirmPermission('invoices', 'full'), deleteRecurringInvoice);

module.exports = router;
