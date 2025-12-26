const express = require('express');
const { userMiddleware } = require('../middlewares');
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

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Portfolio summary
router.get('/summary', userMiddleware, getPortfolioSummary);

// Refresh all prices
router.post('/refresh-all', userMiddleware, refreshAllPrices);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create investment
router.post('/', userMiddleware, createInvestment);

// Get all investments
router.get('/', userMiddleware, getInvestments);

// Get single investment
router.get('/:id', userMiddleware, getInvestment);

// Update investment
router.put('/:id', userMiddleware, updateInvestment);

// Delete investment
router.delete('/:id', userMiddleware, deleteInvestment);

// ═══════════════════════════════════════════════════════════════
// PRICE ROUTES
// ═══════════════════════════════════════════════════════════════

// Refresh price for single investment
router.post('/:id/refresh-price', userMiddleware, refreshPrice);

// ═══════════════════════════════════════════════════════════════
// TRANSACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Add transaction to investment
router.post('/:id/transactions', userMiddleware, addTransaction);

// Get transactions for investment
router.get('/:id/transactions', userMiddleware, getTransactions);

// Delete transaction
router.delete('/:id/transactions/:transactionId', userMiddleware, deleteTransaction);

module.exports = router;
