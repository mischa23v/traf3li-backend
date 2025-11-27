const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    generateStatement,
    getStatements,
    getStatement,
    downloadStatement,
    deleteStatement,
    sendStatement
} = require('../controllers/statement.controller');

const app = express.Router();

// Statement CRUD
app.post('/', userMiddleware, generateStatement);
app.get('/', userMiddleware, getStatements);
app.get('/:id', userMiddleware, getStatement);
app.delete('/:id', userMiddleware, deleteStatement);

// Statement actions
app.get('/:id/download', userMiddleware, downloadStatement);
app.post('/:id/send', userMiddleware, sendStatement);

// Legacy route for backward compatibility
app.post('/generate', userMiddleware, generateStatement);

module.exports = app;
