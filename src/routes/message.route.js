const express = require('express');
const { userMiddleware } = require('../middlewares');
const upload = require('../configs/multer');
const { createMessage, getMessages, markAsRead } = require('../controllers/message.controller');

const app = express.Router();

// Create message with optional file upload
app.post('/', userMiddleware, upload.array('files', 5), createMessage);

// Get all messages of one conversation
app.get('/:conversationID', userMiddleware, getMessages);

// Mark messages as read
app.patch('/:conversationID/read', userMiddleware, markAsRead);

module.exports = app;
