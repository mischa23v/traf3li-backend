const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createRetainer,
    getRetainers,
    getRetainer,
    updateRetainer,
    consumeRetainer,
    replenishRetainer,
    refundRetainer,
    getRetainerHistory,
    getRetainerStats,
    getLowBalanceRetainers
} = require('../controllers/retainer.controller');

const app = express.Router();

// Retainer CRUD
app.post('/', userMiddleware, createRetainer);
app.get('/', userMiddleware, getRetainers);
app.get('/stats', userMiddleware, getRetainerStats);
app.get('/low-balance', userMiddleware, getLowBalanceRetainers);
app.get('/:id', userMiddleware, getRetainer);
app.put('/:id', userMiddleware, updateRetainer);

// Retainer actions
app.post('/:id/consume', userMiddleware, consumeRetainer);
app.post('/:id/replenish', userMiddleware, replenishRetainer);
app.post('/:id/refund', userMiddleware, refundRetainer);

// Retainer history
app.get('/:id/history', userMiddleware, getRetainerHistory);

module.exports = app;
