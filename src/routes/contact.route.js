const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createContact,
    getContacts,
    getContact,
    updateContact,
    deleteContact,
    bulkDeleteContacts,
    searchContacts,
    linkToCase,
    unlinkFromCase,
    linkToClient,
    unlinkFromClient
} = require('../controllers/contact.controller');

const app = express.Router();

// Search (must be before :id routes)
app.get('/search', userMiddleware, searchContacts);

// Bulk operations
app.post('/bulk-delete', userMiddleware, bulkDeleteContacts);

// CRUD operations
app.get('/', userMiddleware, getContacts);
app.post('/', userMiddleware, createContact);

app.get('/:id', userMiddleware, getContact);
app.patch('/:id', userMiddleware, updateContact);
app.delete('/:id', userMiddleware, deleteContact);

// Linking operations
app.post('/:id/link-case', userMiddleware, linkToCase);
app.post('/:id/unlink-case', userMiddleware, unlinkFromCase);
app.post('/:id/link-client', userMiddleware, linkToClient);
app.post('/:id/unlink-client', userMiddleware, unlinkFromClient);

module.exports = app;
