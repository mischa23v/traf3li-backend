const express = require('express');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { userMiddleware } = require('../middlewares');
const {
    getRecurringTransactions,
    getRecurringTransaction,
    createRecurringTransaction,
    updateRecurringTransaction,
    pauseRecurringTransaction,
    resumeRecurringTransaction,
    cancelRecurringTransaction,
    generateTransaction,
    processDueTransactions,
    getUpcomingTransactions
} = require('../controllers/recurringTransaction.controller');

const app = express.Router();

app.use(apiRateLimiter);

// List and search
app.get('/', userMiddleware, getRecurringTransactions);
app.get('/upcoming', userMiddleware, getUpcomingTransactions);
app.post('/process-due', userMiddleware, processDueTransactions);

// CRUD operations
app.get('/:id', userMiddleware, getRecurringTransaction);
app.post('/', userMiddleware, createRecurringTransaction);
app.put('/:id', userMiddleware, updateRecurringTransaction);

// Status changes
app.post('/:id/pause', userMiddleware, pauseRecurringTransaction);
app.post('/:id/resume', userMiddleware, resumeRecurringTransaction);
app.post('/:id/cancel', userMiddleware, cancelRecurringTransaction);

// Manual generation
app.post('/:id/generate', userMiddleware, generateTransaction);

module.exports = app;
