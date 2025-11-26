const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createRateCard,
    getRateCards,
    getRateCard,
    updateRateCard,
    deleteRateCard,
    getRateCardForClient,
    getRateCardForCase,
    addCustomRate,
    updateCustomRate,
    removeCustomRate,
    calculateRate
} = require('../controllers/rateCard.controller');

const app = express.Router();

// Client/Case specific cards (must be before :id routes)
app.get('/client/:clientId', userMiddleware, getRateCardForClient);
app.get('/case/:caseId', userMiddleware, getRateCardForCase);

// Rate calculation
app.post('/calculate', userMiddleware, calculateRate);

// CRUD operations
app.get('/', userMiddleware, getRateCards);
app.post('/', userMiddleware, createRateCard);

app.get('/:id', userMiddleware, getRateCard);
app.patch('/:id', userMiddleware, updateRateCard);
app.delete('/:id', userMiddleware, deleteRateCard);

// Custom rate management
app.post('/:id/rates', userMiddleware, addCustomRate);
app.patch('/:id/rates/:rateId', userMiddleware, updateCustomRate);
app.delete('/:id/rates/:rateId', userMiddleware, removeCustomRate);

module.exports = app;
