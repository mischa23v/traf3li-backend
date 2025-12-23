const express = require('express');
const { userMiddleware } = require('../middlewares');
const { paymentRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    createPayment,
    getPayments,
    getPayment,
    cancelPayment
} = require('../controllers/billPayment.controller');

const app = express.Router();

// Collection routes
app.post('/', paymentRateLimiter, userMiddleware, createPayment);
app.get('/', userMiddleware, getPayments);

// Single payment routes
app.get('/:id', userMiddleware, getPayment);

// Payment actions
app.post('/:id/cancel', paymentRateLimiter, userMiddleware, cancelPayment);

module.exports = app;
