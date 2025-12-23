const express = require('express');
const multer = require('multer');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    createReconciliation,
    getReconciliations,
    getReconciliation,
    clearTransaction,
    unclearTransaction,
    completeReconciliation,
    cancelReconciliation,
    // Import functions
    importCSV,
    importOFX,
    getCSVTemplate,
    // Matching functions
    getMatchSuggestions,
    autoMatch,
    confirmMatch,
    rejectMatch,
    createSplitMatch,
    unmatch,
    // Rule functions
    createRule,
    getRules,
    updateRule,
    deleteRule,
    // Status & reporting
    getReconciliationStatus,
    getUnmatchedTransactions,
    getMatchStatistics,
    getRuleStatistics,
    // Currency functions
    getExchangeRates,
    convertAmount,
    setManualRate,
    getSupportedCurrencies,
    updateRatesFromAPI,
    // Feed functions
    getBankFeeds,
    createBankFeed,
    updateBankFeed,
    deleteBankFeed
} = require('../controllers/bankReconciliation.controller');

const app = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Apply rate limiting
app.use(apiRateLimiter);

// ============ BANK FEEDS ROUTES ============
app.get('/feeds', userMiddleware, getBankFeeds);
app.post('/feeds', userMiddleware, createBankFeed);
app.put('/feeds/:id', userMiddleware, updateBankFeed);
app.delete('/feeds/:id', userMiddleware, deleteBankFeed);

// ============ IMPORT ROUTES ============
app.post('/import/csv', userMiddleware, upload.single('file'), importCSV);
app.post('/import/ofx', userMiddleware, upload.single('file'), importOFX);
app.get('/import/template', userMiddleware, getCSVTemplate);

// ============ MATCHING ROUTES ============
app.get('/suggestions/:accountId', userMiddleware, getMatchSuggestions);
app.post('/auto-match/:accountId', userMiddleware, autoMatch);
app.post('/match/confirm/:id', userMiddleware, confirmMatch);
app.post('/match/reject/:id', userMiddleware, rejectMatch);
app.post('/match/split', userMiddleware, createSplitMatch);
app.delete('/match/:id', userMiddleware, unmatch);

// ============ MATCH RULES ROUTES ============
app.post('/rules', userMiddleware, createRule);
app.get('/rules', userMiddleware, getRules);
app.put('/rules/:id', userMiddleware, updateRule);
app.delete('/rules/:id', userMiddleware, deleteRule);

// ============ RECONCILIATION ROUTES ============
// Collection routes
app.post('/', userMiddleware, createReconciliation);
app.get('/', userMiddleware, getReconciliations);

// Single reconciliation routes
app.get('/:id', userMiddleware, getReconciliation);

// Reconciliation actions
app.post('/:id/clear', userMiddleware, clearTransaction);
app.post('/:id/unclear', userMiddleware, unclearTransaction);
app.post('/:id/complete', userMiddleware, completeReconciliation);
app.post('/:id/cancel', userMiddleware, cancelReconciliation);

// Status & reporting
app.get('/status/:accountId', userMiddleware, getReconciliationStatus);
app.get('/unmatched/:accountId', userMiddleware, getUnmatchedTransactions);
app.get('/statistics/matches', userMiddleware, getMatchStatistics);
app.get('/statistics/rules', userMiddleware, getRuleStatistics);

// ============ CURRENCY ROUTES (moved to separate router but keeping for backwards compatibility) ============
app.get('/currency/rates', userMiddleware, getExchangeRates);
app.post('/currency/convert', userMiddleware, convertAmount);
app.post('/currency/rates', userMiddleware, setManualRate);
app.get('/currency/supported', userMiddleware, getSupportedCurrencies);
app.post('/currency/update', userMiddleware, updateRatesFromAPI);

module.exports = app;
