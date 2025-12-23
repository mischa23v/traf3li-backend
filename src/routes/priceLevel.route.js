const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    getPriceLevels,
    getPriceLevel,
    createPriceLevel,
    updatePriceLevel,
    deletePriceLevel,
    getClientRate,
    setDefault
} = require('../controllers/priceLevel.controller');

const app = express.Router();

app.use(apiRateLimiter);

// List and utilities
app.get('/', userMiddleware, getPriceLevels);
app.get('/client-rate', userMiddleware, getClientRate);

// CRUD operations
app.get('/:id', userMiddleware, getPriceLevel);
app.post('/', userMiddleware, createPriceLevel);
app.put('/:id', userMiddleware, updatePriceLevel);
app.delete('/:id', userMiddleware, deletePriceLevel);

// Set default
app.post('/:id/set-default', userMiddleware, setDefault);

module.exports = app;
