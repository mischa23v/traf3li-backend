const express = require('express');
const { userMiddleware } = require('../middlewares');
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
router.get('/stats', userMiddleware, getTradeStats);

// Chart data
router.get('/stats/chart', userMiddleware, getChartData);

// Bulk operations
router.delete('/bulk', userMiddleware, bulkDeleteTrades);

// Import
router.post('/import/csv', userMiddleware, importFromCsv);

// ═══════════════════════════════════════════════════════════════
// CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create trade
router.post('/', userMiddleware, createTrade);

// Get all trades
router.get('/', userMiddleware, getTrades);

// Get single trade
router.get('/:id', userMiddleware, getTrade);

// Update trade
router.patch('/:id', userMiddleware, updateTrade);

// Delete trade
router.delete('/:id', userMiddleware, deleteTrade);

// ═══════════════════════════════════════════════════════════════
// ACTION ROUTES
// ═══════════════════════════════════════════════════════════════

// Close trade
router.post('/:id/close', userMiddleware, closeTrade);

module.exports = router;
