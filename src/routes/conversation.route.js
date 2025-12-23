const express = require('express');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { userMiddleware } = require('../middlewares');
const { getConversations, createConversation, getSingleConversation, updateConversation } = require('../controllers/conversation.controller');

const app = express.Router();

app.use(apiRateLimiter);

// Get all
app.get('/', userMiddleware, getConversations);

// Create
app.post('/', userMiddleware, createConversation);

// Get single
app.get('/single/:sellerID/:buyerID', userMiddleware, getSingleConversation);

// Update
app.patch('/:conversationID', userMiddleware, updateConversation);

module.exports = app;