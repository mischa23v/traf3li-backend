const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createPayment,
    getPayments,
    getPayment,
    getNewPaymentDefaults,
    updatePayment,
    deletePayment,
    completePayment,
    failPayment,
    createRefund,
    sendReceipt,
    getPaymentStats,
    getPaymentsSummary,
    bulkDeletePayments
} = require('../controllers/payment.controller');

const app = express.Router();

// Static routes (must be before parameterized routes)
app.get('/stats', userMiddleware, getPaymentStats);
app.get('/summary', userMiddleware, getPaymentsSummary);
app.get('/new', userMiddleware, getNewPaymentDefaults);
app.delete('/bulk', userMiddleware, bulkDeletePayments);

// Payment CRUD
app.post('/', userMiddleware, createPayment);
app.get('/', userMiddleware, getPayments);
app.get('/:id', userMiddleware, getPayment);
app.put('/:id', userMiddleware, updatePayment);
app.delete('/:id', userMiddleware, deletePayment);

// Payment actions
app.post('/:id/complete', userMiddleware, completePayment);
app.post('/:id/fail', userMiddleware, failPayment);
app.post('/:id/refund', userMiddleware, createRefund);
app.post('/:id/receipt', userMiddleware, sendReceipt);

module.exports = app;
