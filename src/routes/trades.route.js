const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    createTrade,
    getTrades,
    getTrade,
    updateTrade,
    closeTrade,
    deleteTrade,
    bulkDeleteTrades,
    getTradeStats,
    getChartData,
    importFromCsv
} = require('../controllers/trades.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Statistics
router.get('/stats', userMiddleware, firmFilter, getTradeStats);

// Chart data
router.get('/stats/chart', userMiddleware, firmFilter, getChartData);

// Bulk operations
router.delete('/bulk', userMiddleware, firmFilter, bulkDeleteTrades);

// Import
router.post('/import/csv', userMiddleware, firmFilter, importFromCsv);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create trade
router.post('/', userMiddleware, firmFilter, createTrade);

// Get all trades
router.get('/', userMiddleware, firmFilter, getTrades);

// Get single trade
router.get('/:id', userMiddleware, firmFilter, getTrade);

// Update trade
router.patch('/:id', userMiddleware, firmFilter, updateTrade);

// Delete trade
router.delete('/:id', userMiddleware, firmFilter, deleteTrade);

// ═══════════════════════════════════════════════════════════════
// ACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Close trade
router.post('/:id/close', userMiddleware, firmFilter, closeTrade);

module.exports = router;
