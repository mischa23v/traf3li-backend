const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getExchangeRates,
    convertAmount,
    setManualRate,
    getSupportedCurrencies,
    updateRatesFromAPI,
    getCurrencySettings
} = require('../controllers/bankReconciliation.controller');

const app = express.Router();

// Get currency settings
app.get('/settings', userMiddleware, getCurrencySettings);

// Get current exchange rates
app.get('/rates', userMiddleware, getExchangeRates);

// Convert amount between currencies
app.post('/convert', userMiddleware, convertAmount);

// Set manual exchange rate
app.post('/rates', userMiddleware, setManualRate);

// Get supported currencies
app.get('/supported', userMiddleware, getSupportedCurrencies);

// Update rates from external API
app.post('/update', userMiddleware, updateRatesFromAPI);

module.exports = app;
