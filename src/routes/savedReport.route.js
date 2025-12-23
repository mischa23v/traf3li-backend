const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    // Saved Reports
    createReport,
    getReports,
    getReport,
    updateReport,
    deleteReport,
    runReport,
    duplicateReport,
    // Dashboard Widgets
    createWidget,
    getWidgets,
    getWidget,
    updateWidget,
    deleteWidget,
    updateLayout,
    getWidgetData,
    getDefaultWidgets
} = require('../controllers/savedReport.controller');

const app = express.Router();

app.use(apiRateLimiter);

// ==================== Saved Reports ====================
app.get('/reports', userMiddleware, getReports);
app.post('/reports', userMiddleware, createReport);

app.get('/reports/:id', userMiddleware, getReport);
app.patch('/reports/:id', userMiddleware, updateReport);
app.delete('/reports/:id', userMiddleware, deleteReport);

app.post('/reports/:id/run', userMiddleware, runReport);
app.post('/reports/:id/duplicate', userMiddleware, duplicateReport);

// ==================== Dashboard Widgets ====================
// Default widgets (must be before :id routes)
app.get('/widgets/defaults', userMiddleware, getDefaultWidgets);

// Layout update (bulk)
app.patch('/widgets/layout', userMiddleware, updateLayout);

app.get('/widgets', userMiddleware, getWidgets);
app.post('/widgets', userMiddleware, createWidget);

app.get('/widgets/:id', userMiddleware, getWidget);
app.patch('/widgets/:id', userMiddleware, updateWidget);
app.delete('/widgets/:id', userMiddleware, deleteWidget);

app.get('/widgets/:id/data', userMiddleware, getWidgetData);

module.exports = app;
