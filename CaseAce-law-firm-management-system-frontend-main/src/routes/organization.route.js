const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createOrganization,
    getOrganizations,
    getOrganization,
    updateOrganization,
    deleteOrganization,
    bulkDeleteOrganizations,
    searchOrganizations,
    getOrganizationsByClient,
    linkToClient,
    linkToContact,
    linkToCase
} = require('../controllers/organization.controller');

const app = express.Router();

// Search (must be before :id routes)
app.get('/search', userMiddleware, searchOrganizations);

// By client
app.get('/client/:clientId', userMiddleware, getOrganizationsByClient);

// Bulk operations
app.post('/bulk-delete', userMiddleware, bulkDeleteOrganizations);

// CRUD operations
app.get('/', userMiddleware, getOrganizations);
app.post('/', userMiddleware, createOrganization);

app.get('/:id', userMiddleware, getOrganization);
app.patch('/:id', userMiddleware, updateOrganization);
app.delete('/:id', userMiddleware, deleteOrganization);

// Linking operations
app.post('/:id/link-case', userMiddleware, linkToCase);
app.post('/:id/link-client', userMiddleware, linkToClient);
app.post('/:id/link-contact', userMiddleware, linkToContact);

module.exports = app;
