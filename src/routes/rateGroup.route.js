const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createRateGroup,
    getRateGroups,
    getRateGroup,
    updateRateGroup,
    deleteRateGroup,
    addRateToGroup,
    removeRateFromGroup,
    getDefaultRateGroup,
    duplicateRateGroup
} = require('../controllers/rateGroup.controller');

const app = express.Router();

// Default rate group (must be before :id routes)
app.get('/default', userMiddleware, getDefaultRateGroup);

// CRUD operations
app.get('/', userMiddleware, getRateGroups);
app.post('/', userMiddleware, createRateGroup);

app.get('/:id', userMiddleware, getRateGroup);
app.patch('/:id', userMiddleware, updateRateGroup);
app.delete('/:id', userMiddleware, deleteRateGroup);

// Rate management
app.post('/:id/rates', userMiddleware, addRateToGroup);
app.delete('/:id/rates/:rateId', userMiddleware, removeRateFromGroup);

// Duplicate
app.post('/:id/duplicate', userMiddleware, duplicateRateGroup);

module.exports = app;
