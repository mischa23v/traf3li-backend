const express = require('express');
const { userMiddleware } = require('../middlewares');
const { createFirm, getFirms, getFirm, updateFirm, addLawyer, removeLawyer } = require('../controllers/firm.controller');
const app = express.Router();

// Create firm
app.post('/', userMiddleware, createFirm);

// Get all firms
app.get('/', getFirms);

// Get single firm
app.get('/:_id', getFirm);

// Update firm
app.patch('/:_id', userMiddleware, updateFirm);

// Add lawyer to firm
app.post('/lawyer/add', userMiddleware, addLawyer);

// Remove lawyer from firm
app.post('/lawyer/remove', userMiddleware, removeLawyer);

module.exports = app;
