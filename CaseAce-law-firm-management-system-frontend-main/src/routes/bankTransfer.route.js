const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createTransfer,
    getTransfers,
    getTransfer,
    cancelTransfer
} = require('../controllers/bankTransfer.controller');

const app = express.Router();

// Collection routes
app.post('/', userMiddleware, createTransfer);
app.get('/', userMiddleware, getTransfers);

// Single transfer routes
app.get('/:id', userMiddleware, getTransfer);

// Transfer actions
app.post('/:id/cancel', userMiddleware, cancelTransfer);

module.exports = app;
