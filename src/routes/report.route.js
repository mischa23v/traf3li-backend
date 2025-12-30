const express = require('express');
const { userMiddleware } = require('../middlewares');
const { sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    listReports,
    createReport,
    getReport,
    deleteReport,
    executeReport,
    exportReport,
    updateSchedule
} = require('../controllers/report.controller');

// Accounting reports
const {
    getProfitLossReport,
    getBalanceSheetReport,
    getCaseProfitabilityReport,
    getARAgingReport,
    getTrialBalanceReport,
    getBudgetVarianceReport,
    getAPAgingReport,
    getClientStatement,
    getVendorLedger,
    getGrossProfitReport,
    getCostCenterReport
} = require('../controllers/accountingReports.controller');

// Chart reports (dashboard charts)
const {
    getCasesChart,
    getRevenueChart,
    getTasksChart
} = require('../controllers/chartReports.controller');

const app = express.Router();

// Accounting/Financial reports (must be before /:id routes)
app.get('/profit-loss', sensitiveRateLimiter, userMiddleware, getProfitLossReport);
app.get('/balance-sheet', sensitiveRateLimiter, userMiddleware, getBalanceSheetReport);
app.get('/case-profitability', sensitiveRateLimiter, userMiddleware, getCaseProfitabilityReport);
app.get('/ar-aging', sensitiveRateLimiter, userMiddleware, getARAgingReport);
app.get('/trial-balance', sensitiveRateLimiter, userMiddleware, getTrialBalanceReport);
// NEW ERPNext-equivalent reports
app.get('/budget-variance', sensitiveRateLimiter, userMiddleware, getBudgetVarianceReport);
app.get('/ap-aging', sensitiveRateLimiter, userMiddleware, getAPAgingReport);
app.get('/client-statement', sensitiveRateLimiter, userMiddleware, getClientStatement);
app.get('/vendor-ledger', sensitiveRateLimiter, userMiddleware, getVendorLedger);
app.get('/gross-profit', sensitiveRateLimiter, userMiddleware, getGrossProfitReport);
app.get('/cost-center', sensitiveRateLimiter, userMiddleware, getCostCenterReport);

// Dashboard chart reports
app.get('/cases-chart', userMiddleware, getCasesChart);
app.get('/revenue-chart', userMiddleware, getRevenueChart);
app.get('/tasks-chart', userMiddleware, getTasksChart);

// Report export
app.post('/export', sensitiveRateLimiter, userMiddleware, exportReport);

// Report operations
app.post('/generate', userMiddleware, createReport);
app.get('/', userMiddleware, listReports);
app.get('/:id', userMiddleware, getReport);
app.delete('/:id', userMiddleware, deleteReport);
app.post('/:id/execute', sensitiveRateLimiter, userMiddleware, executeReport);

// Report scheduling
app.put('/:id/schedule', userMiddleware, updateSchedule);

module.exports = app;
