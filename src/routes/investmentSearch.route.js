const express = require('express');
const { userMiddleware } = require('../middlewares');
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
router.get('/symbols', userMiddleware, searchInvestmentSymbols);

// Get quote for a symbol
router.get('/quote', userMiddleware, getQuote);

// Get batch quotes
router.post('/quotes', userMiddleware, getBatchQuotes);

// ═══════════════════════════════════════════════════════════════
// REFERENCE DATA ROUTES
// ═══════════════════════════════════════════════════════════════

// Get all markets
router.get('/markets', userMiddleware, getMarkets);

// Get all investment types
router.get('/types', userMiddleware, getTypes);

// Get sectors (optionally filtered by market)
router.get('/sectors', userMiddleware, getSectors);

// Get symbols by market
router.get('/market/:market', userMiddleware, getSymbolsByMarketEndpoint);

// Get symbols by type
router.get('/type/:type', userMiddleware, getSymbolsByTypeEndpoint);

// Get symbol details
router.get('/symbol/:symbol', userMiddleware, getSymbolDetails);

module.exports = router;
