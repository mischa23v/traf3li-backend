const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createInvoice,
    getInvoices,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    recordPayment,
    createPaymentIntent,
    confirmPayment,
    getOverdueInvoices,
    getInvoiceSummary
} = require('../controllers/invoice.controller');

const app = express.Router();

// Summary and overdue (must be before :_id route)
app.get('/summary', userMiddleware, getInvoiceSummary);
app.get('/overdue', userMiddleware, getOverdueInvoices);

// CRUD
app.post('/', userMiddleware, createInvoice);
app.get('/', userMiddleware, getInvoices);
app.get('/:_id', userMiddleware, getInvoice);
app.patch('/:_id', userMiddleware, updateInvoice);
app.delete('/:_id', userMiddleware, deleteInvoice);

// Actions
app.post('/:_id/send', userMiddleware, sendInvoice);
app.post('/:_id/payments', userMiddleware, recordPayment);
app.post('/:_id/payment', userMiddleware, createPaymentIntent);

// Payment confirmation
app.patch('/confirm-payment', userMiddleware, confirmPayment);

module.exports = app;
