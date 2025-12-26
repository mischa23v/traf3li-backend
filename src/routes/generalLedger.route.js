const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getEntries,
    getEntry,
    voidEntry,
    getAccountBalance,
    getTrialBalance,
    getEntriesByReference,
    getSummary,
    getStats,
    getProfitLoss,
    getBalanceSheet
} = require('../controllers/generalLedger.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get GL statistics
router.get('/stats', userMiddleware, getStats);

// Get GL summary by account type
router.get('/summary', userMiddleware, getSummary);

// Get trial balance
router.get('/trial-balance', userMiddleware, getTrialBalance);

// Get profit & loss statement
router.get('/profit-loss', userMiddleware, getProfitLoss);

// Get balance sheet
router.get('/balance-sheet', userMiddleware, getBalanceSheet);

// Get account balance
router.get('/account-balance/:accountId', userMiddleware, getAccountBalance);

// Get entries by reference (invoice, payment, etc.)
router.get('/reference/:model/:id', userMiddleware, getEntriesByReference);

// Get all GL entries with filters
// Query: accountId, startDate, endDate, caseId, clientId, lawyerId, status, referenceModel, page, limit, sort
router.get('/entries', userMiddleware, getEntries);

// ═══════════════════════════════════════════════════════════════
// PARAMETERIZED ROUTES
// ═══════════════════════════════════════════════════════════════

// Get single GL entry
router.get('/:id', userMiddleware, getEntry);

// Void a GL entry (creates reversing entry)
router.post('/:id/void', userMiddleware, voidEntry);

// ═══════════════════════════════════════════════════════════════
// LEGACY ROUTES (for backwards compatibility)
// ═══════════════════════════════════════════════════════════════

// Legacy: Get all entries (redirect to /entries)
router.get('/', userMiddleware, getEntries);

// Legacy: Void entry with different URL pattern
router.post('/void/:id', userMiddleware, voidEntry);

module.exports = router;
