const express = require('express');
const { userMiddleware } = require('../middlewares');
const { requiredIdempotency } = require('../middlewares/idempotency');
const { paymentRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    createTransfer,
    getTransfers,
    getTransfer,
    cancelTransfer
} = require('../controllers/bankTransfer.controller');

const app = express.Router();

// Apply rate limiting to all bank transfer routes
app.use(paymentRateLimiter);

// Collection routes
app.post('/', userMiddleware, requiredIdempotency, createTransfer);
app.get('/', userMiddleware, getTransfers);

// Single transfer routes
app.get('/:id', userMiddleware, getTransfer);

// Transfer actions
app.post('/:id/cancel', userMiddleware, requiredIdempotency, cancelTransfer);

module.exports = app;
