const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    generateReport,
    getReports,
    getReport,
    deleteReport,
    getReportTemplates,
    scheduleReport,
    unscheduleReport
} = require('../controllers/report.controller');

const app = express.Router();

// Report operations
app.post('/generate', userMiddleware, generateReport);
app.get('/', userMiddleware, getReports);
app.get('/templates', userMiddleware, getReportTemplates);
app.get('/:id', userMiddleware, getReport);
app.delete('/:id', userMiddleware, deleteReport);

// Report scheduling
app.post('/:id/schedule', userMiddleware, scheduleReport);
app.delete('/:id/schedule', userMiddleware, unscheduleReport);

module.exports = app;
