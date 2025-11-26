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

// Special queries (before :id to avoid conflicts)
app.get('/search', userMiddleware, searchClients);
app.get('/stats', userMiddleware, getClientStats);
app.get('/top-revenue', userMiddleware, getTopClientsByRevenue);

// Bulk operations
app.post('/bulk-delete', userMiddleware, bulkDeleteClients);

// Single client
app.get('/:id', userMiddleware, getClient);
app.patch('/:id', userMiddleware, updateClient);
app.delete('/:id', userMiddleware, deleteClient);

module.exports = app;
