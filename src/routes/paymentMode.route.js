const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createPaymentMode,
    getPaymentModes,
    getPaymentMode,
    updatePaymentMode,
    deletePaymentMode,
    setDefaultPaymentMode
} = require('../controllers/paymentMode.controller');

const app = express.Router();

// CRUD
app.post('/', userMiddleware, createPaymentMode);
app.get('/', userMiddleware, getPaymentModes);
app.get('/:_id', userMiddleware, getPaymentMode);
app.patch('/:_id', userMiddleware, updatePaymentMode);
app.delete('/:_id', userMiddleware, deletePaymentMode);

// Set default
app.post('/:_id/set-default', userMiddleware, setDefaultPaymentMode);

module.exports = app;
