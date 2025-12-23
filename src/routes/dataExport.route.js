const express = require('express');
const { userMiddleware } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
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

app.use(apiRateLimiter);

// Export operations
app.post('/export', userMiddleware, auditAction('export_data', 'export_job', { severity: 'critical' }), createExportJob);
app.get('/jobs', userMiddleware, getExportJobs);
app.get('/jobs/:id', userMiddleware, getExportJobStatus);
app.get('/jobs/:id/download', userMiddleware, auditAction('download_export', 'export_job', { severity: 'high', skipGET: false }), downloadExportFile);
app.post('/jobs/:id/cancel', userMiddleware, cancelExportJob);
app.delete('/jobs/:id', userMiddleware, deleteExportJob);

// Import operations
app.post('/import', userMiddleware, auditAction('import_data', 'import_job', { severity: 'critical' }), createImportJob);
app.get('/imports', userMiddleware, getImportJobs);
app.get('/import/:id', userMiddleware, getImportJobStatus);
app.post('/import/:id/start', userMiddleware, auditAction('start_import', 'import_job', { severity: 'critical' }), startImportJob);
app.post('/import/:id/validate', userMiddleware, validateImportFile);
app.post('/import/:id/cancel', userMiddleware, cancelImportJob);

// Export templates
app.get('/templates', userMiddleware, getExportTemplates);
app.post('/templates', userMiddleware, createExportTemplate);
app.patch('/templates/:id', userMiddleware, updateExportTemplate);
app.delete('/templates/:id', userMiddleware, deleteExportTemplate);

module.exports = app;
