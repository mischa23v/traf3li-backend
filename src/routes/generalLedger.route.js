const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
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

router.use(apiRateLimiter);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get GL statistics
router.get('/stats', userMiddleware, firmFilter, getStats);

// Get GL summary by account type
router.get('/summary', userMiddleware, firmFilter, getSummary);

// Get trial balance
router.get('/trial-balance', userMiddleware, firmFilter, getTrialBalance);

// Get profit & loss statement
router.get('/profit-loss', userMiddleware, firmFilter, getProfitLoss);

// Get balance sheet
router.get('/balance-sheet', userMiddleware, firmFilter, getBalanceSheet);

// Get account balance
router.get('/account-balance/:accountId', userMiddleware, firmFilter, getAccountBalance);

// Get entries by reference (invoice, payment, etc.)
router.get('/reference/:model/:id', userMiddleware, firmFilter, getEntriesByReference);

// Get all GL entries with filters
// Query: accountId, startDate, endDate, caseId, clientId, lawyerId, status, referenceModel, page, limit, sort
router.get('/entries', userMiddleware, firmFilter, getEntries);

// ═══════════════════════════════════════════════════════════════
// PARAMETERIZED ROUTES
// ═══════════════════════════════════════════════════════════════

// Get single GL entry
router.get('/:id', userMiddleware, firmFilter, getEntry);

// Void a GL entry (creates reversing entry)
router.post('/:id/void', userMiddleware, firmFilter, voidEntry);

// ═══════════════════════════════════════════════════════════════
// LEGACY ROUTES (for backwards compatibility)
// ═══════════════════════════════════════════════════════════════

// Legacy: Get all entries (redirect to /entries)
router.get('/', userMiddleware, firmFilter, getEntries);

// Legacy: Void entry with different URL pattern
router.post('/void/:id', userMiddleware, firmFilter, voidEntry);

module.exports = router;
