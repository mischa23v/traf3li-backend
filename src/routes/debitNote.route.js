/**
 * Debit Note Routes
 *
 * Routes for managing debit notes
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares');
const { firmFilter, checkFirmPermission, financeAccessOnly } = require('../middlewares/firmFilter.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    getDebitNotes,
    getDebitNote,
    getDebitNotesForBill,
    createDebitNote,
    updateDebitNote,
    submitDebitNote,
    approveDebitNote,
    rejectDebitNote,
    applyDebitNote,
    cancelDebitNote,
    deleteDebitNote,
    getPendingApprovals
} = require('../controllers/debitNote.controller');

// All routes require authentication and firm filter
router.use(userMiddleware);
router.use(firmFilter);
router.use(apiRateLimiter);

/**
 * @route   GET /api/debit-notes
 * @desc    Get all debit notes
 * @access  Private - Finance access
 */
router.get('/', financeAccessOnly, getDebitNotes);

/**
 * @route   GET /api/debit-notes/pending-approvals
 * @desc    Get pending debit notes for approval
 * @access  Private - Finance access
 */
router.get('/pending-approvals', financeAccessOnly, getPendingApprovals);

/**
 * @route   GET /api/debit-notes/bill/:billId
 * @desc    Get debit notes for specific bill
 * @access  Private - Finance access
 */
router.get('/bill/:billId', financeAccessOnly, getDebitNotesForBill);

/**
 * @route   GET /api/debit-notes/:id
 * @desc    Get single debit note
 * @access  Private - Finance access
 */
router.get('/:id', financeAccessOnly, getDebitNote);

/**
 * @route   POST /api/debit-notes
 * @desc    Create debit note
 * @access  Private - Finance edit
 */
router.post('/', checkFirmPermission('expenses', 'edit'), createDebitNote);

/**
 * @route   PUT /api/debit-notes/:id
 * @desc    Update debit note (draft only)
 * @access  Private - Finance edit
 */
router.put('/:id', checkFirmPermission('expenses', 'edit'), updateDebitNote);

/**
 * @route   POST /api/debit-notes/:id/submit
 * @desc    Submit debit note for approval
 * @access  Private - Finance edit
 */
router.post('/:id/submit', checkFirmPermission('expenses', 'edit'), submitDebitNote);

/**
 * @route   POST /api/debit-notes/:id/approve
 * @desc    Approve debit note
 * @access  Private - Finance full
 */
router.post('/:id/approve', checkFirmPermission('expenses', 'full'), approveDebitNote);

/**
 * @route   POST /api/debit-notes/:id/reject
 * @desc    Reject debit note
 * @access  Private - Finance full
 */
router.post('/:id/reject', checkFirmPermission('expenses', 'full'), rejectDebitNote);

/**
 * @route   POST /api/debit-notes/:id/apply
 * @desc    Apply debit note to bill
 * @access  Private - Finance full
 */
router.post('/:id/apply', checkFirmPermission('expenses', 'full'), applyDebitNote);

/**
 * @route   POST /api/debit-notes/:id/cancel
 * @desc    Cancel debit note
 * @access  Private - Finance full
 */
router.post('/:id/cancel', checkFirmPermission('expenses', 'full'), cancelDebitNote);

/**
 * @route   DELETE /api/debit-notes/:id
 * @desc    Delete draft debit note
 * @access  Private - Finance full
 */
router.delete('/:id', checkFirmPermission('expenses', 'full'), deleteDebitNote);

module.exports = router;
