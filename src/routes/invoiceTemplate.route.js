const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createTemplate,
    getTemplates,
    getTemplate,
    getDefaultTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    setAsDefault,
    previewTemplate,
    exportTemplate,
    importTemplate
} = require('../controllers/invoiceTemplate.controller');

const app = express.Router();

// Default template (must be before :id routes)
app.get('/default', userMiddleware, getDefaultTemplate);

// Import template
app.post('/import', userMiddleware, importTemplate);

// CRUD operations
app.get('/', userMiddleware, getTemplates);
app.post('/', userMiddleware, createTemplate);

app.get('/:id', userMiddleware, getTemplate);
app.patch('/:id', userMiddleware, updateTemplate);
app.delete('/:id', userMiddleware, deleteTemplate);

// Template operations
app.post('/:id/duplicate', userMiddleware, duplicateTemplate);
app.post('/:id/set-default', userMiddleware, setAsDefault);
app.get('/:id/preview', userMiddleware, previewTemplate);
app.get('/:id/export', userMiddleware, exportTemplate);

module.exports = app;
