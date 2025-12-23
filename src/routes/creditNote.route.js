/**
 * Credit Note Routes
 *
 * Routes for managing credit notes
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { firmFilter, checkFirmPermission, financeAccessOnly } = require('../middlewares/firmFilter.middleware');
const {
    getCreditNotes,
    getCreditNote,
    getCreditNotesForInvoice,
    createCreditNote,
    updateCreditNote,
    issueCreditNote,
    applyCreditNote,
    voidCreditNote,
    deleteCreditNote,
    getCreditNoteStats
} = require('../controllers/creditNote.controller');

// All routes require authentication and firm filter
router.use(userMiddleware);
router.use(firmFilter);
router.use(apiRateLimiter);

/**
 * @route   GET /api/credit-notes
 * @desc    Get all credit notes
 * @access  Private - Finance access
 */
router.get('/', financeAccessOnly, getCreditNotes);

/**
 * @route   GET /api/credit-notes/stats
 * @desc    Get credit notes statistics
 * @access  Private - Finance access
 */
router.get('/stats', financeAccessOnly, getCreditNoteStats);

/**
 * @route   GET /api/credit-notes/invoice/:invoiceId
 * @desc    Get credit notes for specific invoice
 * @access  Private - Finance access
 */
router.get('/invoice/:invoiceId', financeAccessOnly, getCreditNotesForInvoice);

/**
 * @route   GET /api/credit-notes/:id
 * @desc    Get single credit note
 * @access  Private - Finance access
 */
router.get('/:id', financeAccessOnly, getCreditNote);

/**
 * @route   POST /api/credit-notes
 * @desc    Create credit note
 * @access  Private - Finance edit
 */
router.post('/', checkFirmPermission('invoices', 'edit'), createCreditNote);

/**
 * @route   PUT /api/credit-notes/:id
 * @desc    Update credit note (draft only)
 * @access  Private - Finance edit
 */
router.put('/:id', checkFirmPermission('invoices', 'edit'), updateCreditNote);

/**
 * @route   POST /api/credit-notes/:id/issue
 * @desc    Issue credit note
 * @access  Private - Finance edit
 */
router.post('/:id/issue', checkFirmPermission('invoices', 'edit'), issueCreditNote);

/**
 * @route   POST /api/credit-notes/:id/apply
 * @desc    Apply credit note to invoice
 * @access  Private - Finance full
 */
router.post('/:id/apply', checkFirmPermission('invoices', 'full'), applyCreditNote);

/**
 * @route   POST /api/credit-notes/:id/void
 * @desc    Void credit note
 * @access  Private - Finance full
 */
router.post('/:id/void', checkFirmPermission('invoices', 'full'), voidCreditNote);

/**
 * @route   DELETE /api/credit-notes/:id
 * @desc    Delete draft credit note
 * @access  Private - Finance full
 */
router.delete('/:id', checkFirmPermission('invoices', 'full'), deleteCreditNote);

module.exports = router;
