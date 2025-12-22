const express = require('express');
const { userMiddleware, requireAdmin } = require('../middlewares');
const {
    getLockDates,
    updateLockDate,
    lockPeriod,
    reopenPeriod,
    getFiscalPeriods,
    getLockHistory,
    checkDate,
    updateFiscalYearEnd
} = require('../controllers/lockDate.controller');

const app = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Update fiscal year end (admin only)
app.patch('/fiscal-year', userMiddleware, requireAdmin, updateFiscalYearEnd);

// Get lock history
app.get('/history', userMiddleware, getLockHistory);

// Check if date is locked
app.post('/check', userMiddleware, checkDate);

// ═══════════════════════════════════════════════════════════════
// FISCAL PERIODS
// ═══════════════════════════════════════════════════════════════

// Get fiscal periods
app.get('/periods', userMiddleware, getFiscalPeriods);

// Lock fiscal period (admin only)
app.post('/periods/lock', userMiddleware, requireAdmin, lockPeriod);

// Reopen fiscal period (requires admin)
app.post('/periods/reopen', userMiddleware, requireAdmin, reopenPeriod);

// ═══════════════════════════════════════════════════════════════
// LOCK DATE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Get all lock dates
app.get('/', userMiddleware, getLockDates);

// Update lock date (admin check for 'hard' type is handled in controller)
app.patch('/:lockType', userMiddleware, updateLockDate);

module.exports = app;
