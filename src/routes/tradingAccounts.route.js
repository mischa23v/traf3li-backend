const express = require('express');
const { userMiddleware } = require('../middlewares');
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

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create trading account
router.post('/', userMiddleware, createTradingAccount);

// Get all trading accounts
router.get('/', userMiddleware, getTradingAccounts);

// Get single trading account
router.get('/:id', userMiddleware, getTradingAccount);

// Update trading account
router.patch('/:id', userMiddleware, updateTradingAccount);

// Delete trading account
router.delete('/:id', userMiddleware, deleteTradingAccount);

// ═══════════════════════════════════════════════════════════════
// BALANCE & ACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Get account balance
router.get('/:id/balance', userMiddleware, getAccountBalance);

// Set as default account
router.post('/:id/set-default', userMiddleware, setDefaultAccount);

// Add deposit or withdrawal
router.post('/:id/transaction', userMiddleware, addTransaction);

module.exports = router;
