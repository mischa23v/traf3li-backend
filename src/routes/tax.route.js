const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createTax,
    getTaxes,
    getTax,
    updateTax,
    deleteTax,
    setDefaultTax
} = require('../controllers/tax.controller');

const app = express.Router();

// CRUD
app.post('/', userMiddleware, createTax);
app.get('/', userMiddleware, getTaxes);
app.get('/:_id', userMiddleware, getTax);
app.patch('/:_id', userMiddleware, updateTax);
app.delete('/:_id', userMiddleware, deleteTax);

// Set default
app.post('/:_id/set-default', userMiddleware, setDefaultTax);

module.exports = app;
