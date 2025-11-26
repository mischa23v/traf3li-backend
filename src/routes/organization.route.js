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
    getOrganizationsByClient
} = require('../controllers/organization.controller');

const app = express.Router();

// Organization CRUD
app.post('/', userMiddleware, createOrganization);
app.get('/', userMiddleware, getOrganizations);

// Special queries (before :id to avoid conflicts)
app.get('/search', userMiddleware, searchOrganizations);
app.get('/client/:clientId', userMiddleware, getOrganizationsByClient);

// Bulk operations
app.post('/bulk-delete', userMiddleware, bulkDeleteOrganizations);

// Single organization
app.get('/:id', userMiddleware, getOrganization);
app.patch('/:id', userMiddleware, updateOrganization);
app.delete('/:id', userMiddleware, deleteOrganization);

module.exports = app;
