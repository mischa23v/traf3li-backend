/**
 * Corporate Card Routes
 *
 * Routes for managing corporate cards and transactions
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares/authenticate.middleware');
const { firmFilter, firmAdminOnly, financeAccessOnly } = require('../middlewares/firmFilter.middleware');
const {
    getCorporateCards,
    getCorporateCard,
    getSummary,
    createCorporateCard,
    updateCorporateCard,
    deleteCorporateCard,
    blockCard,
    unblockCard,
    getTransactions,
    importTransactions,
    getUnmatchedTransactions,
    reconcileTransaction,
    disputeTransaction,
    getSpendingStats,
    categorizeTransaction
} = require('../controllers/corporateCard.controller');

// All routes require authentication and firm filter
router.use(userMiddleware);
router.use(firmFilter);

/**
 * @route   GET /api/corporate-cards
 * @desc    Get all corporate cards
 * @access  Private - Finance access
 */
router.get('/', financeAccessOnly, getCorporateCards);

/**
 * @route   GET /api/corporate-cards/summary
 * @desc    Get corporate cards summary/stats
 * @access  Private - Finance access
 */
router.get('/summary', financeAccessOnly, getSummary);

/**
 * @route   GET /api/corporate-cards/spending-stats
 * @desc    Get spending statistics
 * @access  Private - Finance access
 */
router.get('/spending-stats', financeAccessOnly, getSpendingStats);

/**
 * @route   GET /api/corporate-cards/:id
 * @desc    Get single corporate card
 * @access  Private - Finance access
 */
router.get('/:id', financeAccessOnly, getCorporateCard);

/**
 * @route   GET /api/corporate-cards/:id/transactions
 * @desc    Get card transactions
 * @access  Private - Finance access
 */
router.get('/:id/transactions', financeAccessOnly, getTransactions);

/**
 * @route   GET /api/corporate-cards/:id/transactions/unmatched
 * @desc    Get unmatched transactions
 * @access  Private - Finance access
 */
router.get('/:id/transactions/unmatched', financeAccessOnly, getUnmatchedTransactions);

/**
 * @route   POST /api/corporate-cards
 * @desc    Create corporate card
 * @access  Private - Admin only
 */
router.post('/', firmAdminOnly, createCorporateCard);

/**
 * @route   PUT /api/corporate-cards/:id
 * @desc    Update corporate card
 * @access  Private - Admin only
 */
router.put('/:id', firmAdminOnly, updateCorporateCard);

/**
 * @route   POST /api/corporate-cards/:id/block
 * @desc    Block corporate card
 * @access  Private - Admin only
 */
router.post('/:id/block', firmAdminOnly, blockCard);

/**
 * @route   POST /api/corporate-cards/:id/unblock
 * @desc    Unblock corporate card
 * @access  Private - Admin only
 */
router.post('/:id/unblock', firmAdminOnly, unblockCard);

/**
 * @route   POST /api/corporate-cards/:id/transactions/import
 * @desc    Import transactions from statement
 * @access  Private - Finance access
 */
router.post('/:id/transactions/import', financeAccessOnly, importTransactions);

/**
 * @route   POST /api/corporate-cards/:id/transactions/:transactionId/reconcile
 * @desc    Reconcile transaction with expense
 * @access  Private - Finance access
 */
router.post('/:id/transactions/:transactionId/reconcile', financeAccessOnly, reconcileTransaction);

/**
 * @route   POST /api/corporate-cards/:id/transactions/:transactionId/dispute
 * @desc    Dispute transaction
 * @access  Private - Finance access
 */
router.post('/:id/transactions/:transactionId/dispute', financeAccessOnly, disputeTransaction);

/**
 * @route   POST /api/corporate-cards/:id/transactions/:transactionId/categorize
 * @desc    Categorize transaction
 * @access  Private - Finance access
 */
router.post('/:id/transactions/:transactionId/categorize', financeAccessOnly, categorizeTransaction);

/**
 * @route   DELETE /api/corporate-cards/:id
 * @desc    Delete corporate card
 * @access  Private - Admin only
 */
router.delete('/:id', firmAdminOnly, deleteCorporateCard);

module.exports = router;
