const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createClient,
    getClients,
    getClient,
    updateClient,
    deleteClient,
    searchClients,
    getClientStats,
    getTopClientsByRevenue,
    bulkDeleteClients
} = require('../controllers/client.controller');

const app = express.Router();

// Client CRUD
app.post('/', userMiddleware, createClient);
app.get('/', userMiddleware, getClients);

// Special queries
app.get('/search', userMiddleware, searchClients);
app.get('/stats', userMiddleware, getClientStats);
app.get('/top-revenue', userMiddleware, getTopClientsByRevenue);

// Single client
app.get('/:id', userMiddleware, getClient);
app.put('/:id', userMiddleware, updateClient);
app.delete('/:id', userMiddleware, deleteClient);

// Bulk operations
app.delete('/bulk', userMiddleware, bulkDeleteClients);

module.exports = app;
