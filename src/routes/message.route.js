const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const upload = require('../configs/multer');
const { createMessage, getMessages, markAsRead, getMessageStats } = require('../controllers/message.controller');

const app = express.Router();

app.use(apiRateLimiter);

// Create message with optional file upload
app.post('/', userMiddleware, upload.array('files', 5), upload.malwareScan, createMessage);

// Get message stats (must be before /:conversationID to avoid matching)
app.get('/stats', userMiddleware, getMessageStats);

// Get all messages of one conversation
app.get('/:conversationID', userMiddleware, getMessages);

// Mark messages as read
app.patch('/:conversationID/read', userMiddleware, markAsRead);

module.exports = app;
