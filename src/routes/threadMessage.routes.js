const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    postMessage,
    postNote,
    getMessages,
    getMyMentions,
    getStarred,
    searchMessages,
    getRecordThread,
    getMessage,
    starMessage,
    deleteMessage
} = require('../controllers/threadMessage.controller');

const app = express.Router();

// Search and special routes (must be before :id routes)
app.get('/mentions', userMiddleware, getMyMentions);
app.get('/starred', userMiddleware, getStarred);
app.get('/search', userMiddleware, searchMessages);

// Thread by record
app.get('/thread/:model/:id', userMiddleware, getRecordThread);

// CRUD operations
app.post('/', userMiddleware, postMessage);
app.post('/note', userMiddleware, postNote);
app.get('/', userMiddleware, getMessages);

// Single message operations
app.get('/:id', userMiddleware, getMessage);
app.post('/:id/star', userMiddleware, starMessage);
app.delete('/:id', userMiddleware, deleteMessage);

module.exports = app;
