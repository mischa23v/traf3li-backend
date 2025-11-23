const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    generateStatement,
    getStatements,
    getStatement,
    deleteStatement,
    sendStatement
} = require('../controllers/statement.controller');

const app = express.Router();

// Statement operations
app.post('/generate', userMiddleware, generateStatement);
app.get('/', userMiddleware, getStatements);
app.get('/:id', userMiddleware, getStatement);
app.delete('/:id', userMiddleware, deleteStatement);
app.post('/:id/send', userMiddleware, sendStatement);

module.exports = app;
