const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    searchInvestmentSymbols,
    getQuote,
    getBatchQuotes,
    getSymbolsByMarketEndpoint,
    getSymbolsByTypeEndpoint,
    getMarkets,
    getTypes,
    getSectors,
    getSymbolDetails
} = require('../controllers/investmentSearch.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// SEARCH ROUTES
// ═══════════════════════════════════════════════════════════════

// Search symbols
router.get('/symbols', userMiddleware, firmFilter, searchInvestmentSymbols);

// Get quote for a symbol
router.get('/quote', userMiddleware, firmFilter, getQuote);

// Get batch quotes
router.post('/quotes', userMiddleware, firmFilter, getBatchQuotes);

// ═══════════════════════════════════════════════════════════════
// REFERENCE DATA ROUTES
// ═══════════════════════════════════════════════════════════════

// Get all markets
router.get('/markets', userMiddleware, firmFilter, getMarkets);

// Get all investment types
router.get('/types', userMiddleware, firmFilter, getTypes);

// Get sectors (optionally filtered by market)
router.get('/sectors', userMiddleware, firmFilter, getSectors);

// Get symbols by market
router.get('/market/:market', userMiddleware, firmFilter, getSymbolsByMarketEndpoint);

// Get symbols by type
router.get('/type/:type', userMiddleware, firmFilter, getSymbolsByTypeEndpoint);

// Get symbol details
router.get('/symbol/:symbol', userMiddleware, firmFilter, getSymbolDetails);

module.exports = router;
