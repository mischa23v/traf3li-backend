const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    generateReport,
    getReports,
    getReport,
    deleteReport,
    getReportTemplates,
    scheduleReport,
    unscheduleReport,
    // Direct report endpoints
    getAccountsAgingReport,
    getRevenueByClientReport,
    getOutstandingInvoicesReport,
    getTimeEntriesReport,
    exportReport
} = require('../controllers/report.controller');

const app = express.Router();

// Direct report endpoints (must be before /:id routes)
app.get('/accounts-aging', userMiddleware, getAccountsAgingReport);
app.get('/revenue-by-client', userMiddleware, getRevenueByClientReport);
app.get('/outstanding-invoices', userMiddleware, getOutstandingInvoicesReport);
app.get('/time-entries', userMiddleware, getTimeEntriesReport);
app.post('/export', userMiddleware, exportReport);

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
