const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createRate,
    getRates,
    getRate,
    updateRate,
    deleteRate,
    getApplicableRate,
    setStandardRate,
    getRateStats
} = require('../controllers/billingRate.controller');

const app = express.Router();

// Billing Rate CRUD
app.post('/', userMiddleware, createRate);
app.get('/', userMiddleware, getRates);
app.get('/stats', userMiddleware, getRateStats);
app.get('/applicable', userMiddleware, getApplicableRate);
app.get('/:id', userMiddleware, getRate);
app.put('/:id', userMiddleware, updateRate);
app.delete('/:id', userMiddleware, deleteRate);

// Quick setup
app.post('/standard', userMiddleware, setStandardRate);

module.exports = app;
