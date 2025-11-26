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
    getContactsByCase,
    getContactsByClient,
    linkContactToCase,
    unlinkContactFromCase,
    linkContactToClient,
    unlinkContactFromClient
} = require('../controllers/contact.controller');

const app = express.Router();

// Contact CRUD
app.post('/', userMiddleware, createContact);
app.get('/', userMiddleware, getContacts);

// Special queries (before :id to avoid conflicts)
app.get('/search', userMiddleware, searchContacts);
app.get('/case/:caseId', userMiddleware, getContactsByCase);
app.get('/client/:clientId', userMiddleware, getContactsByClient);

// Bulk operations
app.post('/bulk-delete', userMiddleware, bulkDeleteContacts);

// Single contact
app.get('/:id', userMiddleware, getContact);
app.patch('/:id', userMiddleware, updateContact);
app.delete('/:id', userMiddleware, deleteContact);

// Link/Unlink operations
app.post('/:id/link-case', userMiddleware, linkContactToCase);
app.post('/:id/unlink-case', userMiddleware, unlinkContactFromCase);
app.post('/:id/link-client', userMiddleware, linkContactToClient);
app.post('/:id/unlink-client', userMiddleware, unlinkContactFromClient);

module.exports = app;
