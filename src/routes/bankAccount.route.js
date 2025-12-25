const express = require('express');
const { userMiddleware } = require('../middlewares');
const { sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    createBankAccount,
    getBankAccounts,
    getBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefault,
    getBalanceHistory,
    getSummary,
    syncAccount,
    disconnectAccount
} = require('../controllers/bankAccount.controller');

const app = express.Router();

// Collection routes
app.post('/', sensitiveRateLimiter, userMiddleware, createBankAccount);
app.get('/', userMiddleware, getBankAccounts);

// Summary route (must come before /:id)
app.get('/summary', userMiddleware, getSummary);

// Single account routes
app.get('/:id', userMiddleware, getBankAccount);
app.put('/:id', sensitiveRateLimiter, userMiddleware, updateBankAccount);
app.delete('/:id', sensitiveRateLimiter, userMiddleware, deleteBankAccount);

// Account actions
app.post('/:id/set-default', sensitiveRateLimiter, userMiddleware, setDefault);
app.get('/:id/balance-history', userMiddleware, getBalanceHistory);
app.post('/:id/sync', sensitiveRateLimiter, userMiddleware, syncAccount);
app.post('/:id/disconnect', sensitiveRateLimiter, userMiddleware, disconnectAccount);

module.exports = app;
