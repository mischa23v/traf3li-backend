const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getFiscalPeriods,
    getFiscalPeriod,
    createFiscalYear,
    getCurrentPeriod,
    openPeriod,
    closePeriod,
    reopenPeriod,
    lockPeriod,
    calculateBalances,
    yearEndClosing,
    canPostToDate,
    getFiscalYearsSummary
} = require('../controllers/fiscalPeriod.controller');

const app = express.Router();

// List and utilities
app.get('/', userMiddleware, getFiscalPeriods);
app.get('/current', userMiddleware, getCurrentPeriod);
app.get('/can-post', userMiddleware, canPostToDate);
app.get('/years-summary', userMiddleware, getFiscalYearsSummary);

// Create fiscal year
app.post('/create-year', userMiddleware, createFiscalYear);

// Single period operations
app.get('/:id', userMiddleware, getFiscalPeriod);
app.get('/:id/balances', userMiddleware, calculateBalances);

// Status changes
app.post('/:id/open', userMiddleware, openPeriod);
app.post('/:id/close', userMiddleware, closePeriod);
app.post('/:id/reopen', userMiddleware, reopenPeriod);
app.post('/:id/lock', userMiddleware, lockPeriod);

// Year-end closing
app.post('/:id/year-end-closing', userMiddleware, yearEndClosing);

module.exports = app;
