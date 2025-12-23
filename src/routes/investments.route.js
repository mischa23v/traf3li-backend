const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    createInvestment,
    getInvestments,
    getInvestment,
    updateInvestment,
    deleteInvestment,
    refreshPrice,
    refreshAllPrices,
    getPortfolioSummary,
    addTransaction,
    getTransactions,
    deleteTransaction
} = require('../controllers/investments.controller');

const router = express.Router();

// Apply rate limiting
router.use(apiRateLimiter);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Portfolio summary
router.get('/summary', userMiddleware, firmFilter, getPortfolioSummary);

// Refresh all prices
router.post('/refresh-all', userMiddleware, firmFilter, refreshAllPrices);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create investment
router.post('/', userMiddleware, firmFilter, createInvestment);

// Get all investments
router.get('/', userMiddleware, firmFilter, getInvestments);

// Get single investment
router.get('/:id', userMiddleware, firmFilter, getInvestment);

// Update investment
router.put('/:id', userMiddleware, firmFilter, updateInvestment);

// Delete investment
router.delete('/:id', userMiddleware, firmFilter, deleteInvestment);

// ═══════════════════════════════════════════════════════════════
// PRICE ROUTES
// ═══════════════════════════════════════════════════════════════

// Refresh price for single investment
router.post('/:id/refresh-price', userMiddleware, firmFilter, refreshPrice);

// ═══════════════════════════════════════════════════════════════
// TRANSACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Add transaction to investment
router.post('/:id/transactions', userMiddleware, firmFilter, addTransaction);

// Get transactions for investment
router.get('/:id/transactions', userMiddleware, firmFilter, getTransactions);

// Delete transaction
router.delete('/:id/transactions/:transactionId', userMiddleware, firmFilter, deleteTransaction);

module.exports = router;
