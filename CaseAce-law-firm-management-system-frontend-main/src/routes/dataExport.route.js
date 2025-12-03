const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createExportJob,
    getExportJobs,
    getExportJobStatus,
    downloadExportFile,
    cancelExportJob,
    deleteExportJob,
    createImportJob,
    startImportJob,
    validateImportFile,
    getImportJobs,
    getImportJobStatus,
    cancelImportJob,
    createExportTemplate,
    getExportTemplates,
    updateExportTemplate,
    deleteExportTemplate
} = require('../controllers/dataExport.controller');

const app = express.Router();

// Export operations
app.post('/export', userMiddleware, createExportJob);
app.get('/jobs', userMiddleware, getExportJobs);
app.get('/jobs/:id', userMiddleware, getExportJobStatus);
app.get('/jobs/:id/download', userMiddleware, downloadExportFile);
app.post('/jobs/:id/cancel', userMiddleware, cancelExportJob);
app.delete('/jobs/:id', userMiddleware, deleteExportJob);

// Import operations
app.post('/import', userMiddleware, createImportJob);
app.get('/imports', userMiddleware, getImportJobs);
app.get('/import/:id', userMiddleware, getImportJobStatus);
app.post('/import/:id/start', userMiddleware, startImportJob);
app.post('/import/:id/validate', userMiddleware, validateImportFile);
app.post('/import/:id/cancel', userMiddleware, cancelImportJob);

// Export templates
app.get('/templates', userMiddleware, getExportTemplates);
app.post('/templates', userMiddleware, createExportTemplate);
app.patch('/templates/:id', userMiddleware, updateExportTemplate);
app.delete('/templates/:id', userMiddleware, deleteExportTemplate);

module.exports = app;
