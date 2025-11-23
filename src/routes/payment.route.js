const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createPayment,
    getPayments,
    getPayment,
    updatePayment,
    deletePayment,
    completePayment,
    failPayment,
    createRefund,
    sendReceipt,
    getPaymentStats,
    bulkDeletePayments
} = require('../controllers/payment.controller');

const app = express.Router();

// Payment CRUD
app.post('/', userMiddleware, createPayment);
app.get('/', userMiddleware, getPayments);
app.get('/stats', userMiddleware, getPaymentStats);
app.get('/:id', userMiddleware, getPayment);
app.put('/:id', userMiddleware, updatePayment);
app.delete('/:id', userMiddleware, deletePayment);

// Payment actions
app.post('/:id/complete', userMiddleware, completePayment);
app.post('/:id/fail', userMiddleware, failPayment);
app.post('/:id/refund', userMiddleware, createRefund);
app.post('/:id/receipt', userMiddleware, sendReceipt);

// Bulk operations
app.delete('/bulk', userMiddleware, bulkDeletePayments);

module.exports = app;
