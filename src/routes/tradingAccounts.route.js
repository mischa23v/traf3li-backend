const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    createTradingAccount,
    getTradingAccounts,
    getTradingAccount,
    getAccountBalance,
    updateTradingAccount,
    deleteTradingAccount,
    setDefaultAccount,
    addTransaction
} = require('../controllers/tradingAccounts.controller');

const router = express.Router();

// Apply rate limiting
router.use(apiRateLimiter);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create trading account
router.post('/', userMiddleware, firmFilter, createTradingAccount);

// Get all trading accounts
router.get('/', userMiddleware, firmFilter, getTradingAccounts);

// Get single trading account
router.get('/:id', userMiddleware, firmFilter, getTradingAccount);

// Update trading account
router.patch('/:id', userMiddleware, firmFilter, updateTradingAccount);

// Delete trading account
router.delete('/:id', userMiddleware, firmFilter, deleteTradingAccount);

// ═══════════════════════════════════════════════════════════════
// BALANCE & ACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Get account balance
router.get('/:id/balance', userMiddleware, firmFilter, getAccountBalance);

// Set as default account
router.post('/:id/set-default', userMiddleware, firmFilter, setDefaultAccount);

// Add deposit or withdrawal
router.post('/:id/transaction', userMiddleware, firmFilter, addTransaction);

module.exports = router;
