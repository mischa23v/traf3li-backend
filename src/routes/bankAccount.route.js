const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
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

app.use(apiRateLimiter);

// Collection routes
app.post('/', userMiddleware, createBankAccount);
app.get('/', userMiddleware, getBankAccounts);

// Summary route (must come before /:id)
app.get('/summary', userMiddleware, getSummary);

// Single account routes
app.get('/:id', userMiddleware, getBankAccount);
app.put('/:id', userMiddleware, updateBankAccount);
app.delete('/:id', userMiddleware, deleteBankAccount);

// Account actions
app.post('/:id/set-default', userMiddleware, setDefault);
app.get('/:id/balance-history', userMiddleware, getBalanceHistory);
app.post('/:id/sync', userMiddleware, syncAccount);
app.post('/:id/disconnect', userMiddleware, disconnectAccount);

module.exports = app;
