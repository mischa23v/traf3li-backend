const express = require('express');
const { userMiddleware } = require('../middlewares');
const { 
    createInvoice, 
    getInvoices, 
    getInvoice, 
    updateInvoice, 
    sendInvoice, 
    createPaymentIntent, 
    confirmPayment, 
    getOverdueInvoices 
} = require('../controllers/invoice.controller');
const app = express.Router();

// Create invoice
app.post('/', userMiddleware, createInvoice);

// Get all invoices
app.get('/', userMiddleware, getInvoices);

// Get overdue invoices
app.get('/overdue', userMiddleware, getOverdueInvoices);

// Get single invoice
app.get('/:_id', userMiddleware, getInvoice);

// Update invoice
app.patch('/:_id', userMiddleware, updateInvoice);

// Send invoice
app.post('/:_id/send', userMiddleware, sendInvoice);

// Create payment intent
app.post('/:_id/payment', userMiddleware, createPaymentIntent);

// Confirm payment
app.patch('/confirm-payment', userMiddleware, confirmPayment);

module.exports = app;
