const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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
app.get('/stats', userMiddleware, firmFilter, getPaymentStats);
app.get('/summary', userMiddleware, firmFilter, getPaymentsSummary);
app.get('/new', userMiddleware, firmFilter, getNewPaymentDefaults);
app.delete('/bulk', userMiddleware, firmFilter, bulkDeletePayments);

// Payment CRUD
app.post('/', userMiddleware, firmFilter, createPayment);
app.get('/', userMiddleware, firmFilter, getPayments);
app.get('/:id', userMiddleware, firmFilter, getPayment);
app.put('/:id', userMiddleware, firmFilter, updatePayment);
app.delete('/:id', userMiddleware, firmFilter, deletePayment);

// Payment actions
app.post('/:id/complete', userMiddleware, firmFilter, completePayment);
app.post('/:id/fail', userMiddleware, firmFilter, failPayment);
app.post('/:id/refund', userMiddleware, firmFilter, createRefund);
app.post('/:id/receipt', userMiddleware, firmFilter, sendReceipt);

module.exports = app;
