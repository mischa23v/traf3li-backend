const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createReconciliation,
    getReconciliations,
    getReconciliation,
    clearTransaction,
    unclearTransaction,
    completeReconciliation,
    cancelReconciliation
} = require('../controllers/bankReconciliation.controller');

const app = express.Router();

// Collection routes
app.post('/', userMiddleware, createReconciliation);
app.get('/', userMiddleware, getReconciliations);

// Single reconciliation routes
app.get('/:id', userMiddleware, getReconciliation);

// Reconciliation actions
app.post('/:id/clear', userMiddleware, clearTransaction);
app.post('/:id/unclear', userMiddleware, unclearTransaction);
app.post('/:id/complete', userMiddleware, completeReconciliation);
app.post('/:id/cancel', userMiddleware, cancelReconciliation);

module.exports = app;
