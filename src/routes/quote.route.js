const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createQuote,
    getQuotes,
    getQuote,
    updateQuote,
    deleteQuote,
    sendQuote,
    acceptQuote,
    declineQuote,
    convertToInvoice,
    getQuoteSummary
} = require('../controllers/quote.controller');

const app = express.Router();

// Summary (must be before :_id route)
app.get('/summary', userMiddleware, getQuoteSummary);

// CRUD
app.post('/', userMiddleware, createQuote);
app.get('/', userMiddleware, getQuotes);
app.get('/:_id', userMiddleware, getQuote);
app.patch('/:_id', userMiddleware, updateQuote);
app.delete('/:_id', userMiddleware, deleteQuote);

// Actions
app.post('/:_id/send', userMiddleware, sendQuote);
app.post('/:_id/accept', userMiddleware, acceptQuote);
app.post('/:_id/decline', userMiddleware, declineQuote);
app.post('/:_id/convert', userMiddleware, convertToInvoice);

module.exports = app;
